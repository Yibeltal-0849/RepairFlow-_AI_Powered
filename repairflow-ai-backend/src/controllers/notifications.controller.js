
// import { query } from "../config/db.js";

// // GET /api/notifications
// // Retrieve notifications with pagination and optional filters.
// export async function listNotifications(req, res, next) {
//   try {
//     // Get the requested page. Default is page 1.
//     const page = Math.max(
//       1,
//       Number.parseInt(req.query.page || "1", 10) || 1
//     );

//     // Limit results to between 1 and 100.
//     const limit = Math.min(
//       100,
//       Math.max(
//         1,
//         Number.parseInt(req.query.limit || "20", 10) || 20
//       )
//     );

//     // Calculate how many rows to skip.
//     const offset = (page - 1) * limit;

//     // SQL filter values are passed separately for safety.
//     const params = [];

//     let where = " WHERE 1 = 1 ";

//     // Filter by notification status.
//     if (req.query.status) {
//       where += " AND n.status = ?";
//       params.push(req.query.status);
//     }

//     // Filter by delivery channel.
//     if (req.query.channel) {
//       where += " AND n.channel = ?";
//       params.push(req.query.channel);
//     }

//     // Filter by the ticket number entered by the user.
//     if (req.query.ticket_number) {
//       const ticketNumber = req.query.ticket_number.trim();

//       if (ticketNumber) {
//         where += " AND r.ticket_number = ?";
//         params.push(ticketNumber);
//       }
//     }

//     // Retrieve notifications and their associated ticket numbers.
//     const rows = await query(
//       `SELECT
//          n.notification_id,
//          r.ticket_number,
//          n.channel,
//          n.recipient,
//          n.message,
//          n.status,
//          n.error_message,
//          n.attempts,
//          n.sent_at,
//          n.created_at
//        FROM notifications n
//        LEFT JOIN repairs r
//          ON r.repair_id = n.repair_id
//        ${where}
//        ORDER BY n.created_at DESC
//        LIMIT ${limit} OFFSET ${offset}`,
//       params
//     );

//     // Return notifications and pagination information.
//     res.json({
//       success: true,
//       data: rows,
//       pagination: {
//         page,
//         limit,
//         returned: rows.length
//       }
//     });
//   } catch (e) {
//     next(e);
//   }
// }


// // POST /api/notifications
// // Create a notification using a ticket number instead of a repair ID.
// export async function createNotification(req, res, next) {
//   try {
//     const {
//       ticket_number,
//       channel,
//       recipient,
//       message
//     } = req.body || {};

//     // Only these notification channels are allowed.
//     const allowedChannels = [
//       "telegram",
//       "email",
//       "sms",
//       "other"
//     ];

//     if (!allowedChannels.includes(channel)) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid notification channel."
//       });
//     }

//     // Validate the recipient and message.
//     if (
//       typeof recipient !== "string" ||
//       !recipient.trim() ||
//       typeof message !== "string" ||
//       !message.trim()
//     ) {
//       return res.status(400).json({
//         success: false,
//         message: "recipient and message are required."
//       });
//     }

//     // A notification may optionally be linked to a repair.
//     let repairId = null;
//     let resolvedTicketNumber = null;

//     // If supplied, ticket_number must be a non-empty string.
//     if (
//       ticket_number !== undefined &&
//       ticket_number !== null &&
//       (
//         typeof ticket_number !== "string" ||
//         !ticket_number.trim()
//       )
//     ) {
//       return res.status(400).json({
//         success: false,
//         message: "Ticket number must be a non-empty string."
//       });
//     }

//     // Find the repair using the ticket number.
//     if (ticket_number) {
//       const repairs = await query(
//         `SELECT repair_id, ticket_number
//          FROM repairs
//          WHERE ticket_number = ?
//          LIMIT 1`,
//         [ticket_number.trim()]
//       );

//       // Reject unknown ticket numbers.
//       if (!repairs.length) {
//         return res.status(404).json({
//           success: false,
//           message: "Repair ticket not found."
//         });
//       }

//       // Keep the internal ID for the database relationship.
//       repairId = repairs[0].repair_id;
//       resolvedTicketNumber = repairs[0].ticket_number;
//     }

//     // Save the notification.
//     // The database still stores repair_id internally.
//     const result = await query(
//       `INSERT INTO notifications
//        (
//          repair_id,
//          channel,
//          recipient,
//          message,
//          status,
//          attempts
//        )
//        VALUES (?, ?, ?, ?, 'pending', 0)`,
//       [
//         repairId,
//         channel,
//         recipient.trim(),
//         message.trim()
//       ]
//     );

//     // Return the public ticket number, not the internal repair ID.
//     res.status(201).json({
//       success: true,
//       data: {
//         notification_id: result.insertId,
//         ticket_number: resolvedTicketNumber,
//         channel,
//         recipient: recipient.trim(),
//         status: "pending"
//       }
//     });
//   } catch (e) {
//     next(e);
//   }
// }


import { query } from "../config/db.js";
import { sendCustomerTelegram } from "../services/telegram.service.js";

/*
|--------------------------------------------------------------------------
| GET /api/notifications
|--------------------------------------------------------------------------
| Retrieve notifications with pagination and optional filters.
*/
export async function listNotifications(req, res, next) {
  try {
    // Get requested page. Default = 1.
    const page = Math.max(
      1,
      Number.parseInt(req.query.page || "1", 10) || 1
    );

    // Limit results between 1 and 100.
    const limit = Math.min(
      100,
      Math.max(
        1,
        Number.parseInt(req.query.limit || "20", 10) || 20
      )
    );

    // Calculate offset.
    const offset = (page - 1) * limit;

    const params = [];

    let where = " WHERE 1 = 1 ";

    /*
    |--------------------------------------------------------------------------
    | Filter by status
    |--------------------------------------------------------------------------
    */
    if (req.query.status) {
      where += " AND n.status = ?";
      params.push(req.query.status);
    }

    /*
    |--------------------------------------------------------------------------
    | Filter by channel
    |--------------------------------------------------------------------------
    */
    if (req.query.channel) {
      where += " AND n.channel = ?";
      params.push(req.query.channel);
    }

    /*
    |--------------------------------------------------------------------------
    | Filter by ticket number
    |--------------------------------------------------------------------------
    */
    if (req.query.ticket_number) {
      const ticketNumber = req.query.ticket_number.trim();

      if (ticketNumber) {
        where += " AND r.ticket_number = ?";
        params.push(ticketNumber);
      }
    }

    /*
    |--------------------------------------------------------------------------
    | Retrieve notifications
    |--------------------------------------------------------------------------
    */
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

    /*
    |--------------------------------------------------------------------------
    | Response
    |--------------------------------------------------------------------------
    */
    return res.json({
      success: true,
      data: rows,
      pagination: {
        page,
        limit,
        returned: rows.length
      }
    });
  } catch (error) {
    next(error);
  }
}


/*
|--------------------------------------------------------------------------
| POST /api/notifications
|--------------------------------------------------------------------------
| Create and deliver a notification.
|
| Telegram notifications are sent immediately through telegram.service.js.
|
| Email/SMS/other are currently stored as pending because there is no
| email/SMS provider service connected yet.
|--------------------------------------------------------------------------
*/
export async function createNotification(req, res, next) {
  try {
    const {
      ticket_number,
      channel,
      recipient,
      message
    } = req.body || {};

    /*
    |--------------------------------------------------------------------------
    | Validate channel
    |--------------------------------------------------------------------------
    */
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

    /*
    |--------------------------------------------------------------------------
    | Validate message
    |--------------------------------------------------------------------------
    */
    if (
      typeof message !== "string" ||
      !message.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "message is required."
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Validate ticket number
    |--------------------------------------------------------------------------
    */
    if (
      ticket_number !== undefined &&
      ticket_number !== null &&
      (
        typeof ticket_number !== "string" ||
        !ticket_number.trim()
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Ticket number must be a non-empty string."
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Telegram requires a repair/customer
    |--------------------------------------------------------------------------
    |
    | For Telegram we intentionally do NOT trust a manually entered
    | recipient/chat ID.
    |
    | Instead:
    |
    | ticket_number
    |      ↓
    | repair
    |      ↓
    | customer_id
    |      ↓
    | customer's telegram_chat_id
    |
    |--------------------------------------------------------------------------
    */
    if (channel === "telegram" && !ticket_number) {
      return res.status(400).json({
        success: false,
        message:
          "Ticket number is required for customer Telegram notifications."
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Variables
    |--------------------------------------------------------------------------
    */
    let repairId = null;
    let customerId = null;
    let resolvedTicketNumber = null;
    let telegramChatId = null;

    /*
    |--------------------------------------------------------------------------
    | Find repair and customer
    |--------------------------------------------------------------------------
    */
    if (ticket_number) {
      const repairs = await query(
        `SELECT
           r.repair_id,
           r.ticket_number,
           r.customer_id,
           c.full_name,
           c.telegram_chat_id,
           c.notification_consent
         FROM repairs r
         INNER JOIN customers c
           ON c.customer_id = r.customer_id
         WHERE r.ticket_number = ?
         LIMIT 1`,
        [ticket_number.trim()]
      );

      /*
      |--------------------------------------------------------------------------
      | Repair not found
      |--------------------------------------------------------------------------
      */
      if (!repairs.length) {
        return res.status(404).json({
          success: false,
          message: "Repair ticket not found."
        });
      }

      const repair = repairs[0];

      repairId = repair.repair_id;
      customerId = repair.customer_id;
      resolvedTicketNumber = repair.ticket_number;
      telegramChatId = repair.telegram_chat_id;

      /*
      |--------------------------------------------------------------------------
      | Telegram-specific validation
      |--------------------------------------------------------------------------
      */
      if (channel === "telegram") {
        if (!repair.notification_consent) {
          return res.status(400).json({
            success: false,
            message:
              "Customer has not given notification consent."
          });
        }

        if (!repair.telegram_chat_id) {
          return res.status(400).json({
            success: false,
            message:
              "Customer does not have a Telegram chat ID. The customer must connect Telegram first."
          });
        }
      }
    }

    /*
    |--------------------------------------------------------------------------
    | Validate recipient for non-Telegram channels
    |--------------------------------------------------------------------------
    |
    | Telegram uses the customer's database chat ID.
    | Email/SMS/other still use the recipient supplied by the frontend.
    |--------------------------------------------------------------------------
    */
    let resolvedRecipient = "";

    if (channel === "telegram") {
      resolvedRecipient = String(telegramChatId);
    } else {
      if (
        typeof recipient !== "string" ||
        !recipient.trim()
      ) {
        return res.status(400).json({
          success: false,
          message:
            "recipient is required for email, SMS, and other notifications."
        });
      }

      resolvedRecipient = recipient.trim();
    }

    /*
    |--------------------------------------------------------------------------
    | Create notification record
    |--------------------------------------------------------------------------
    |
    | Initially create it as pending.
    |
    | This gives us a database record even if Telegram fails.
    |--------------------------------------------------------------------------
    */
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
        repairId,
        channel,
        resolvedRecipient,
        message.trim()
      ]
    );

    const notificationId = result.insertId;

    /*
    |--------------------------------------------------------------------------
    | TELEGRAM DELIVERY
    |--------------------------------------------------------------------------
    */
    if (channel === "telegram") {
      /*
      |--------------------------------------------------------------------------
      | Increment attempt count
      |--------------------------------------------------------------------------
      */
      await query(
        `UPDATE notifications
         SET attempts = attempts + 1
         WHERE notification_id = ?`,
        [notificationId]
      );

      try {
        /*
        |--------------------------------------------------------------------------
        | Send actual Telegram message
        |--------------------------------------------------------------------------
        */
        const telegramResult = await sendCustomerTelegram({
          customerId,
          repairId,
          message: message.trim()
        });

        /*
        |--------------------------------------------------------------------------
        | Mark notification as sent
        |--------------------------------------------------------------------------
        */
        await query(
          `UPDATE notifications
           SET
             status = 'sent',
             sent_at = NOW(),
             error_message = NULL
           WHERE notification_id = ?`,
          [notificationId]
        );

        /*
        |--------------------------------------------------------------------------
        | Return successful delivery response
        |--------------------------------------------------------------------------
        */
        return res.status(201).json({
          success: true,
          message: "Telegram notification sent successfully.",
          data: {
            notification_id: notificationId,
            ticket_number: resolvedTicketNumber,
            customer_id: customerId,
            channel: "telegram",
            recipient: resolvedRecipient,
            status: "sent",
            message_id:
              telegramResult?.messageId || null
          }
        });
      } catch (telegramError) {
        /*
        |--------------------------------------------------------------------------
        | Telegram delivery failed
        |--------------------------------------------------------------------------
        */
        const errorMessage =
          telegramError?.message ||
          "Failed to send Telegram notification.";

        await query(
          `UPDATE notifications
           SET
             status = 'failed',
             error_message = ?
           WHERE notification_id = ?`,
          [
            errorMessage,
            notificationId
          ]
        );

        /*
        |--------------------------------------------------------------------------
        | Return failure response
        |--------------------------------------------------------------------------
        */
        return res.status(502).json({
          success: false,
          message: "Telegram notification failed.",
          data: {
            notification_id: notificationId,
            ticket_number: resolvedTicketNumber,
            customer_id: customerId,
            channel: "telegram",
            recipient: resolvedRecipient,
            status: "failed",
            attempts: 1,
            error_message: errorMessage
          }
        });
      }
    }

    /*
    |--------------------------------------------------------------------------
    | EMAIL / SMS / OTHER
    |--------------------------------------------------------------------------
    |
    | These channels are stored but NOT falsely marked as sent.
    |
    | When you add an email/SMS provider later, this section can call
    | the corresponding service and update the status to sent/failed.
    |--------------------------------------------------------------------------
    */
    return res.status(201).json({
      success: true,
      message:
        "Notification created and queued for delivery.",
      data: {
        notification_id: notificationId,
        ticket_number: resolvedTicketNumber,
        customer_id: customerId,
        channel,
        recipient: resolvedRecipient,
        status: "pending"
      }
    });
  } catch (error) {
    next(error);
  }
}
