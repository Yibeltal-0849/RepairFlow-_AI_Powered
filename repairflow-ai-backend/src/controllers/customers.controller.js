import { query } from "../config/db.js";
import { audit } from "../utils/audit.js";

export async function listCustomers(req, res, next) {
  try {
    const search = `%${String(req.query.search || "").trim()}%`;
    const rows = await query(
      `SELECT customer_id, full_name, phone, email, telegram_chat_id, notification_consent, created_at, updated_at
       FROM customers WHERE full_name LIKE ? OR phone LIKE ? OR email LIKE ?
       ORDER BY created_at DESC LIMIT 200`,
      [search, search, search]
    );
    res.json({ success: true, data: rows });
  } catch (e) { next(e); }
}

export async function createCustomer(req, res, next) {
  try {
    const { full_name, phone = null, email = null, telegram_chat_id = null, notification_consent = false } = req.body || {};
    if (typeof full_name !== "string" || full_name.trim().length < 2) {
      return res.status(400).json({ success: false, message: "full_name must contain at least 2 characters." });
    }
    if (typeof notification_consent !== "boolean") {
      return res.status(400).json({ success: false, message: "notification_consent must be a boolean." });
    }
    const result = await query(
      "INSERT INTO customers (full_name, phone, email, telegram_chat_id, notification_consent) VALUES (?, ?, ?, ?, ?)",
      [full_name.trim(), phone, email, telegram_chat_id, notification_consent]
    );
    await audit(req.user.user_id, "customer", result.insertId, "customer.created");
    res.status(201).json({ success: true, data: { customer_id: result.insertId } });
  } catch (e) { next(e); }
}

export async function getCustomer(req, res, next) {
  try {
    const rows = await query(
      `SELECT customer_id, full_name, phone, email, telegram_chat_id, notification_consent, created_at, updated_at
       FROM customers WHERE customer_id = ? LIMIT 1`, [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ success: false, message: "Customer not found." });
    res.json({ success: true, data: rows[0] });
  } catch (e) { next(e); }
}

export async function updateCustomer(req, res, next) {
  try {
    const { full_name, phone = null, email = null, telegram_chat_id = null, notification_consent = false } = req.body || {};
    if (typeof full_name !== "string" || full_name.trim().length < 2 || typeof notification_consent !== "boolean") {
      return res.status(400).json({ success: false, message: "A valid full_name and boolean notification_consent are required." });
    }
    const result = await query(
      `UPDATE customers SET full_name=?, phone=?, email=?, telegram_chat_id=?, notification_consent=? WHERE customer_id=?`,
      [full_name.trim(), phone, email, telegram_chat_id, notification_consent, req.params.id]
    );
    if (!result.affectedRows) return res.status(404).json({ success: false, message: "Customer not found." });
    await audit(req.user.user_id, "customer", req.params.id, "customer.updated");
    res.json({ success: true, message: "Customer updated." });
  } catch (e) { next(e); }
}
