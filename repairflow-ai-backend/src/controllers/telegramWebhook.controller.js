import crypto from "node:crypto";
import { query } from "../config/db.js";

export async function telegramWebhook(req, res) {
  try {
    /*
    |--------------------------------------------------------------------------
    | 1. Verify Telegram webhook secret
    |--------------------------------------------------------------------------
    */

    const expectedSecret =
      process.env.TELEGRAM_WEBHOOK_SECRET;

    const receivedSecret = req.get(
      "x-telegram-bot-api-secret-token"
    );

    if (!expectedSecret) {
      console.error(
        "TELEGRAM_WEBHOOK_SECRET is not configured."
      );

      return res.sendStatus(500);
    }

    if (
      !receivedSecret ||
      receivedSecret.length !== expectedSecret.length
    ) {
      console.error(
        "Telegram webhook rejected: invalid secret."
      );

      return res.sendStatus(401);
    }

    if (
      !crypto.timingSafeEqual(
        Buffer.from(receivedSecret),
        Buffer.from(expectedSecret)
      )
    ) {
      console.error(
        "Telegram webhook rejected: invalid secret."
      );

      return res.sendStatus(401);
    }

    /*
    |--------------------------------------------------------------------------
    | 2. Read Telegram update
    |--------------------------------------------------------------------------
    */

    const message = req.body?.message;

    if (!message) {
      return res.sendStatus(200);
    }

    console.log(
      "Telegram webhook update:",
      JSON.stringify(req.body, null, 2)
    );

    /*
    |--------------------------------------------------------------------------
    | 3. Only process private chats
    |--------------------------------------------------------------------------
    */

    if (message.chat?.type !== "private") {
      return res.sendStatus(200);
    }

    const text = String(message.text || "").trim();

    /*
    |--------------------------------------------------------------------------
    | 4. We only need /start <token>
    |--------------------------------------------------------------------------
    */

    if (!text.startsWith("/start")) {
      return res.sendStatus(200);
    }

    /*
    |--------------------------------------------------------------------------
    | Telegram can send:
    |
    | /start
    | /start TOKEN
    |
    |--------------------------------------------------------------------------
    */

    const parts = text.split(/\s+/);

    if (parts.length < 2) {
      console.log(
        "Telegram /start received without a connection token."
      );

      return res.sendStatus(200);
    }

    const token = parts[1].trim();

    /*
    |--------------------------------------------------------------------------
    | 5. Validate token format
    |--------------------------------------------------------------------------
    |
    | Your telegram-link endpoint must generate:
    |
    | crypto.randomBytes(24).toString("hex")
    |
    | 24 bytes = 48 hexadecimal characters.
    |
    */

    if (!/^[a-f0-9]{48}$/.test(token)) {
      console.log(
        "Invalid Telegram connection token:",
        token
      );

      return res.sendStatus(200);
    }

    /*
    |--------------------------------------------------------------------------
    | 6. Hash token
    |--------------------------------------------------------------------------
    */

    const tokenHash = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    /*
    |--------------------------------------------------------------------------
    | 7. Find unused, non-expired token
    |--------------------------------------------------------------------------
    */

    const rows = await query(
      `SELECT
         id,
         customer_id
       FROM telegram_link_tokens
       WHERE token_hash = ?
         AND used_at IS NULL
         AND expires_at > NOW()
       LIMIT 1`,
      [tokenHash]
    );

    if (!rows.length) {
      console.log(
        "Telegram connection token not found, expired, or already used."
      );

      return res.sendStatus(200);
    }

    const link = rows[0];

    /*
    |--------------------------------------------------------------------------
    | 8. Get Telegram chat ID
    |--------------------------------------------------------------------------
    */

    const chatId = String(message.chat.id);

    console.log(
      `Telegram connection received for customer ${link.customer_id}.`
    );

    console.log(
      `Telegram chat ID: ${chatId}`
    );

    /*
    |--------------------------------------------------------------------------
    | 9. Claim token
    |--------------------------------------------------------------------------
    |
    | Prevent the same token from being used twice.
    |
    */

    const claimed = await query(
      `UPDATE telegram_link_tokens
       SET used_at = NOW()
       WHERE id = ?
         AND used_at IS NULL
         AND expires_at > NOW()`,
      [link.id]
    );

    if (!claimed.affectedRows) {
      console.log(
        "Telegram connection token was already claimed."
      );

      return res.sendStatus(200);
    }

    /*
    |--------------------------------------------------------------------------
    | 10. Save Telegram chat ID to customer
    |--------------------------------------------------------------------------
    */

    const updated = await query(
      `UPDATE customers
       SET
         telegram_chat_id = ?,
         notification_consent = 1
       WHERE customer_id = ?`,
      [
        chatId,
        link.customer_id
      ]
    );

    if (!updated.affectedRows) {
      console.error(
        `Customer ${link.customer_id} was not updated.`
      );

      return res.sendStatus(500);
    }

    /*
    |--------------------------------------------------------------------------
    | 11. Confirm connection in server logs
    |--------------------------------------------------------------------------
    */

    console.log(
      `Telegram successfully connected to customer ${link.customer_id}.`
    );

    console.log(
      `Customer Telegram chat ID saved: ${chatId}`
    );

    return res.sendStatus(200);

  } catch (error) {
    console.error(
      "Telegram webhook error:",
      error
    );

    return res.sendStatus(500);
  }
}