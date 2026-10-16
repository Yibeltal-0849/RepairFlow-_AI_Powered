import { query, withTransaction } from "../config/db.js";

export async function listDiagnoses(req, res, next) {
  try {
    const params = [];
    let where = " WHERE 1=1 ";

    if (req.query.repair_id) {
      where += " AND d.repair_id = ?";
      params.push(req.query.repair_id);
    }

    const rows = await query(
      `SELECT
         d.diagnosis_session_id,
         d.repair_id,
         r.ticket_number,
         d.provider,
         d.model_name,
         d.input_summary,
         d.structured_suggestions,
         d.uncertainty_notes,
         d.status,
         d.reviewed_by,
         d.reviewed_at,
         d.created_at
       FROM diagnosis_sessions d
       JOIN repairs r
         ON r.repair_id = d.repair_id
       ${where}
       ORDER BY d.created_at DESC
       LIMIT 200`,
      params
    );

    res.json({
      success: true,
      data: rows
    });
  } catch (e) {
    next(e);
  }
}


export async function reviewDiagnosis(req, res, next) {
  try {
    const { id } = req.params;

    const {
      status,
      structured_suggestions,
      uncertainty_notes = ""
    } = req.body || {};

    const allowedStatuses = [
      "approved",
      "rejected",
      "edited"
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid diagnosis review status."
      });
    }

    const sessions = await query(
      `SELECT
         diagnosis_session_id,
         repair_id,
         structured_suggestions,
         status
       FROM diagnosis_sessions
       WHERE diagnosis_session_id = ?
       LIMIT 1`,
      [id]
    );

    if (!sessions.length) {
      return res.status(404).json({
        success: false,
        message: "Diagnosis session not found."
      });
    }

    const diagnosis = sessions[0];

    const finalSuggestions =
      structured_suggestions ??
      diagnosis.structured_suggestions;

    await withTransaction(async (conn) => {
      await conn.execute(
        `UPDATE diagnosis_sessions
         SET
           structured_suggestions = ?,
           uncertainty_notes = ?,
           status = ?,
           reviewed_by = ?,
           reviewed_at = NOW()
         WHERE diagnosis_session_id = ?`,
        [
          typeof finalSuggestions === "string"
            ? finalSuggestions
            : JSON.stringify(finalSuggestions),
          uncertainty_notes,
          status,
          req.user.user_id,
          id
        ]
      );

      await conn.execute(
        `INSERT INTO audit_events
         (
           actor_id,
           entity_type,
           entity_id,
           action,
           metadata
         )
         VALUES (?, 'diagnosis', ?, ?, ?)`,
        [
          req.user.user_id,
          id,
          `diagnosis.${status}`,
          JSON.stringify({
            repair_id: diagnosis.repair_id,
            diagnosis_session_id: id
          })
        ]
      );

      if (status === "approved" || status === "edited") {
        await conn.execute(
          `UPDATE repairs
           SET diagnosis_summary = ?
           WHERE repair_id = ?`,
          [
            typeof finalSuggestions === "string"
              ? finalSuggestions
              : JSON.stringify(finalSuggestions),
            diagnosis.repair_id
          ]
        );
      }
    });

    res.json({
      success: true,
      data: {
        diagnosis_session_id: Number(id),
        repair_id: diagnosis.repair_id,
        status,
        reviewed_by: req.user.user_id
      }
    });
  } catch (e) {
    next(e);
  }
}