import { query } from "../config/db.js";

import {
  exportRepairsToSheets,
  testSheetsConnection
} from "../services/sheets.service.js";

/*
|--------------------------------------------------------------------------
| Telegram Test
|--------------------------------------------------------------------------
*/
export async function testTelegram(req, res, next) {
  try {
    const {
      message = "RepairFlow AI Telegram integration test."
    } = req.body || {};

    if (!process.env.TELEGRAM_BOT_TOKEN) {
      return res.status(503).json({
        success: false,
        message: "Telegram bot is not configured."
      });
    }

    if (!process.env.TELEGRAM_SHOP_CHAT_ID) {
      return res.status(503).json({
        success: false,
        message: "Telegram chat is not configured."
      });
    }

    const url =
      `https://api.telegram.org/bot` +
      `${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`;

    const response = await fetch(url, {
      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify({
        chat_id: process.env.TELEGRAM_SHOP_CHAT_ID,
        text: message
      })
    });

    const result = await response.json();

    /*
    |--------------------------------------------------------------------------
    | Telegram failed
    |--------------------------------------------------------------------------
    */
    if (!response.ok || !result.ok) {
      await query(
        `INSERT INTO integration_sync_logs
         (
           integration_name,
           event_type,
           entity_type,
           entity_id,
           status,
           attempts,
           last_error
         )
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          "telegram",
          "telegram.test",
          "integration",
          null,
          "failed",
          1,
          result.description || "Telegram request failed"
        ]
      );

      return res.status(502).json({
        success: false,
        message: "Telegram message failed.",
        error:
          result.description ||
          "Telegram API error"
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Telegram succeeded
    |--------------------------------------------------------------------------
    */
    await query(
      `INSERT INTO integration_sync_logs
       (
         integration_name,
         event_type,
         entity_type,
         entity_id,
         status,
         attempts
       )
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        "telegram",
        "telegram.test",
        "integration",
        null,
        "success",
        1
      ]
    );

    return res.json({
      success: true,
      message: "Telegram test message sent successfully."
    });

  } catch (e) {
    next(e);
  }
}


/*
|--------------------------------------------------------------------------
| Test Google Sheets Connection
|--------------------------------------------------------------------------
*/
export async function testSheets(req, res, next) {
  try {
    if (!process.env.GOOGLE_SHEET_ID) {
      return res.status(503).json({
        success: false,
        message: "Google Sheets is not configured."
      });
    }

    if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      return res.status(503).json({
        success: false,
        message:
          "Google Sheets credentials are not configured."
      });
    }

    const result = await testSheetsConnection();

    return res.json({
      success: true,
      message:
        "Google Sheets connection successful.",
      data: result
    });

  } catch (e) {
    next(e);
  }
}


/*
|--------------------------------------------------------------------------
| Sync Repairs To Google Sheets
|--------------------------------------------------------------------------
*/
export async function syncSheets(req, res, next) {
  let logId = null;

  try {
    /*
    |--------------------------------------------------------------------------
    | Check configuration
    |--------------------------------------------------------------------------
    */
    if (!process.env.GOOGLE_SHEET_ID) {
      return res.status(503).json({
        success: false,
        message: "Google Sheets is not configured."
      });
    }

    if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      return res.status(503).json({
        success: false,
        message:
          "Google Sheets credentials are not configured."
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Create pending integration log
    |--------------------------------------------------------------------------
    */
    const logResult = await query(
      `INSERT INTO integration_sync_logs
       (
         integration_name,
         event_type,
         entity_type,
         entity_id,
         status,
         attempts
       )
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        "google_sheets",
        "sheets.sync",
        "repairs",
        null,
        "pending",
        0
      ]
    );

    logId = logResult.insertId;

    /*
    |--------------------------------------------------------------------------
    | Export repairs
    |--------------------------------------------------------------------------
    |
    | This function:
    | - Gets repairs from MySQL
    | - Connects to Google Sheets
    | - Clears the Repairs range
    | - Writes the repairs
    |
    */
    const result = await exportRepairsToSheets();

    /*
    |--------------------------------------------------------------------------
    | Update integration log as successful
    |--------------------------------------------------------------------------
    */
    await query(
      `UPDATE integration_sync_logs
       SET
         status = ?,
         attempts = ?,
         updated_at = NOW()
       WHERE integration_sync_log_id = ?`,
      [
        "success",
        1,
        logId
      ]
    );

    /*
    |--------------------------------------------------------------------------
    | Response
    |--------------------------------------------------------------------------
    */
    return res.json({
      success: true,
      message:
        "Repairs synchronized to Google Sheets successfully.",
      data: {
        integration_sync_log_id: logId,
        spreadsheet_id: result.spreadsheetId,
        range: result.range,
        records: result.rows,
        status: "success"
      }
    });

  } catch (e) {

    /*
    |--------------------------------------------------------------------------
    | Update integration log as failed
    |--------------------------------------------------------------------------
    */
    if (logId) {
      try {
        await query(
          `UPDATE integration_sync_logs
           SET
             status = ?,
             attempts = ?,
             last_error = ?,
             next_retry_at =
               DATE_ADD(NOW(), INTERVAL 5 MINUTE),
             updated_at = NOW()
           WHERE integration_sync_log_id = ?`,
          [
            "failed",
            1,
            e.message,
            logId
          ]
        );
      } catch (logError) {
        console.error(
          "Failed to update Google Sheets integration log:",
          logError
        );
      }
    }

    next(e);
  }
}


/*
|--------------------------------------------------------------------------
| List Integration Logs
|--------------------------------------------------------------------------
*/
export async function listIntegrationLogs(
  req,
  res,
  next
) {
  try {
    const rows = await query(
      `SELECT
         integration_sync_log_id,
         integration_name,
         event_type,
         entity_type,
         entity_id,
         status,
         attempts,
         last_error,
         next_retry_at,
         created_at,
         updated_at
       FROM integration_sync_logs
       ORDER BY created_at DESC
       LIMIT 200`
    );

    return res.json({
      success: true,
      data: rows
    });

  } catch (e) {
    next(e);
  }
}