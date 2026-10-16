import { query } from "../config/db.js";

export async function listNotifications(req, res, next) {
  try {
    const page = Math.max(
      1,
      Number.parseInt(req.query.page || "1", 10) || 1
    );

    const limit = Math.min(
      100,
      Math.max(
        1,
        Number.parseInt(req.query.limit || "20", 10) || 20
      )
    );

    const offset = (page - 1) * limit;

    const params = [];
    let where = " WHERE 1=1 ";

    if (req.query.status) {
      where += " AND n.status = ?";
      params.push(req.query.status);
    }

    if (req.query.channel) {
      where += " AND n.channel = ?";
      params.push(req.query.channel);
    }

    if (req.query.repair_id) {
      where += " AND n.repair_id = ?";
      params.push(req.query.repair_id);
    }

    const rows = await query(
      `SELECT
         n.notification_id,
         n.repair_id,
         r.ticket_number,
         n.channel,
         n.recipient,
         n.message,
         n.status,
         n.error_message,
         n.attempts,
         n.sent_at,
         n.created_at
       FROM notifications n
       LEFT JOIN repairs r
         ON r.repair_id = n.repair_id
       ${where}
       ORDER BY n.created_at DESC
       LIMIT ${limit} OFFSET ${offset}`,
      params
    );

    res.json({
      success: true,
      data: rows,
      pagination: {
        page,
        limit,
        returned: rows.length
      }
    });
  } catch (e) {
    next(e);
  }
}


export async function createNotification(req, res, next) {
  try {
    const {
      repair_id = null,
      channel,
      recipient,
      message
    } = req.body || {};

    const allowedChannels = [
      "telegram",
      "email",
      "sms",
      "other"
    ];

    if (!allowedChannels.includes(channel)) {
      return res.status(400).json({
        success: false,
        message: "Invalid notification channel."
      });
    }

    if (!recipient || !message) {
      return res.status(400).json({
        success: false,
        message: "recipient and message are required."
      });
    }

    if (repair_id) {
      const repairs = await query(
        `SELECT repair_id
         FROM repairs
         WHERE repair_id = ?
         LIMIT 1`,
        [repair_id]
      );

      if (!repairs.length) {
        return res.status(404).json({
          success: false,
          message: "Repair not found."
        });
      }
    }

    const result = await query(
      `INSERT INTO notifications
       (
         repair_id,
         channel,
         recipient,
         message,
         status,
         attempts
       )
       VALUES (?, ?, ?, ?, 'pending', 0)`,
      [
        repair_id,
        channel,
        recipient,
        message.trim()
      ]
    );

    res.status(201).json({
      success: true,
      data: {
        notification_id: result.insertId,
        repair_id,
        channel,
        recipient,
        status: "pending"
      }
    });
  } catch (e) {
    next(e);
  }
}