import { query, withTransaction } from "../config/db.js";
import { audit } from "../utils/audit.js";

const STATUSES = ["Received", "Diagnosing", "Waiting for Part", "Waiting for Customer", "In Repair", "Ready for Pickup", "Completed", "Cancelled"];

export async function listRepairs(req, res, next) {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page || "1", 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit || "20", 10) || 20));
    const offset = (page - 1) * limit;
    const params = [];
    let where = " WHERE 1=1 ";
    if (req.query.status) {
      if (!STATUSES.includes(req.query.status)) return res.status(400).json({ success: false, message: "Invalid repair status." });
      where += " AND r.status = ?"; params.push(req.query.status);
    }
    if (req.query.search) {
      const term = `%${String(req.query.search).trim()}%`;
      where += " AND (r.ticket_number LIKE ? OR r.device_brand LIKE ? OR r.device_model LIKE ? OR c.full_name LIKE ?)";
      params.push(term, term, term, term);
    }
    const rows = await query(
      `SELECT r.repair_id, r.ticket_number, r.customer_id, c.full_name AS customer_name,
              r.device_brand, r.device_model, r.reported_issue, r.diagnosis_summary, r.status,
              r.estimated_cost, r.final_cost, r.promised_at, r.assigned_to, r.created_by, r.created_at, r.updated_at
       FROM repairs r JOIN customers c ON c.customer_id = r.customer_id
       ${where} ORDER BY r.created_at DESC LIMIT ${limit} OFFSET ${offset}`,
      params
    );
    res.json({ success: true, data: rows, pagination: { page, limit, returned: rows.length } });
  } catch (e) { next(e); }
}

export async function createRepair(req, res, next) {
  try {
    const { customer_id, device_brand, device_model, reported_issue, estimated_cost = null, promised_at = null, assigned_to = null } = req.body || {};
    if (!customer_id || ![device_brand, device_model, reported_issue].every(v => typeof v === "string" && v.trim())) {
      return res.status(400).json({ success: false, message: "customer_id, device_brand, device_model, and reported_issue are required." });
    }
    const ticket_number = `RF-${Date.now()}-${Math.floor(Math.random() * 9000 + 1000)}`;
    const repairId = await withTransaction(async (conn) => {
      const [result] = await conn.execute(
        `INSERT INTO repairs (ticket_number, customer_id, device_brand, device_model, reported_issue, estimated_cost, promised_at, assigned_to, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [ticket_number, customer_id, device_brand.trim(), device_model.trim(), reported_issue.trim(), estimated_cost, promised_at, assigned_to, req.user.user_id]
      );
      await conn.execute(
        "INSERT INTO repair_status_history (repair_id, old_status, new_status, changed_by, note) VALUES (?, NULL, 'Received', ?, 'Repair ticket created')",
        [result.insertId, req.user.user_id]
      );
      await conn.execute(
        "INSERT INTO audit_events (actor_id, entity_type, entity_id, action, metadata) VALUES (?, 'repair', ?, 'repair.created', ?)",
        [req.user.user_id, result.insertId, JSON.stringify({ ticket_number })]
      );
      return result.insertId;
    });
    res.status(201).json({ success: true, data: { repair_id: repairId, ticket_number, status: "Received" } });
  } catch (e) { next(e); }
}

export async function getRepair(req, res, next) {
  try {
    const rows = await query(
      `SELECT r.*, c.full_name AS customer_name, c.phone AS customer_phone, c.email AS customer_email
       FROM repairs r JOIN customers c ON c.customer_id=r.customer_id WHERE r.repair_id=? LIMIT 1`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ success: false, message: "Repair not found." });
    const history = await query(
      `SELECT history_id, old_status, new_status, changed_by, note, created_at
       FROM repair_status_history WHERE repair_id=? ORDER BY created_at ASC`, [req.params.id]
    );
    res.json({ success: true, data: { ...rows[0], status_history: history } });
  } catch (e) { next(e); }
}

export async function updateRepair(req, res, next) {
  try {
    const { device_brand, device_model, reported_issue, diagnosis_summary = null, estimated_cost = null, final_cost = null, promised_at = null, assigned_to = null } = req.body || {};
    if (![device_brand, device_model, reported_issue].every(v => typeof v === "string" && v.trim())) {
      return res.status(400).json({ success: false, message: "device_brand, device_model, and reported_issue are required." });
    }
    const result = await query(
      `UPDATE repairs SET device_brand=?, device_model=?, reported_issue=?, diagnosis_summary=?, estimated_cost=?, final_cost=?, promised_at=?, assigned_to=?
       WHERE repair_id=?`,
      [device_brand.trim(), device_model.trim(), reported_issue.trim(), diagnosis_summary, estimated_cost, final_cost, promised_at, assigned_to, req.params.id]
    );
    if (!result.affectedRows) return res.status(404).json({ success: false, message: "Repair not found." });
    await audit(req.user.user_id, "repair", req.params.id, "repair.updated");
    res.json({ success: true, message: "Repair updated." });
  } catch (e) { next(e); }
}

export async function changeRepairStatus(req, res, next) {
  try {
    const { status, note = null } = req.body || {};
    if (!STATUSES.includes(status)) return res.status(400).json({ success: false, message: "Invalid repair status." });
    const result = await withTransaction(async (conn) => {
      const [rows] = await conn.execute("SELECT status FROM repairs WHERE repair_id=? FOR UPDATE", [req.params.id]);
      if (!rows[0]) {
        const err = new Error("Repair not found."); err.statusCode = 404; throw err;
      }
      const oldStatus = rows[0].status;
      if (oldStatus === status) return { unchanged: true, oldStatus };
      await conn.execute("UPDATE repairs SET status=? WHERE repair_id=?", [status, req.params.id]);
      await conn.execute(
        "INSERT INTO repair_status_history (repair_id, old_status, new_status, changed_by, note) VALUES (?, ?, ?, ?, ?)",
        [req.params.id, oldStatus, status, req.user.user_id, note]
      );
      await conn.execute(
        "INSERT INTO audit_events (actor_id, entity_type, entity_id, action, metadata) VALUES (?, 'repair', ?, 'repair.status_changed', ?)",
        [req.user.user_id, req.params.id, JSON.stringify({ old_status: oldStatus, new_status: status })]
      );
      return { oldStatus, status };
    });
    res.json({ success: true, data: result });
  } catch (e) { next(e); }
}
