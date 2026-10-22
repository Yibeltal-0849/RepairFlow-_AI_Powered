import crypto from "node:crypto";
import { query } from "../config/db.js";

export async function createTelegramLink(req, res, next) {
  try {
    const customerId = Number(req.params.id);

    if (!Number.isInteger(customerId) || customerId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid customer ID."
      });
    }

    // Check customer exists
    const customers = await query(
      `SELECT customer_id, full_name, telegram_chat_id
       FROM customers
       WHERE customer_id = ?
       LIMIT 1`,
      [customerId]
    );

    if (!customers.length) {
      return res.status(404).json({
        success: false,
        message: "Customer not found."
      });
    }

    const customer = customers[0];

    // Bot username from .env
    const botUsername = process.env.TELEGRAM_BOT_USERNAME
      ?.trim()
      .replace(/^@/, "");

    if (!botUsername) {
      return res.status(500).json({
        success: false,
        message: "TELEGRAM_BOT_USERNAME is not configured."
      });
    }

    /*
     * Generate a cryptographically secure token.
     *
     * randomBytes(24) = 48 hexadecimal characters.
     */
    const token = crypto.randomBytes(24).toString("hex");

    const tokenHash = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    /*
     * Invalidate previous unused tokens for this customer.
     */
    await query(
      `UPDATE telegram_link_tokens
       SET used_at = NOW()
       WHERE customer_id = ?
         AND used_at IS NULL`,
      [customerId]
    );

    /*
     * Store ONLY the hash in the database.
     * The actual token is sent to Telegram.
     */
    await query(
      `INSERT INTO telegram_link_tokens
       (
         customer_id,
         token_hash,
         expires_at,
         created_at
       )
       VALUES (
         ?,
         ?,
         DATE_ADD(NOW(), INTERVAL 15 MINUTE),
         NOW()
       )`,
      [customerId, tokenHash]
    );

    /*
     * Telegram deep-link.
     *
     * Telegram will send:
     *
     * /start <token>
     *
     * to your webhook when the customer presses Start.
     */
    const telegramLink =
      `https://t.me/${botUsername}?start=${token}`;

    console.log(
      `Telegram link created for customer ${customerId}: ${customer.full_name}`
    );

    return res.status(200).json({
      success: true,
      message:
        `Telegram connection started for ${customer.full_name}. Ask the customer to press Start in Telegram.`,
      data: {
        customer_id: customer.customer_id,
        customer_name: customer.full_name,
        telegram_link: telegramLink,
        expires_in_minutes: 15
      }
    });
  } catch (error) {
    console.error(
      "Create Telegram link error:",
      error
    );

    next(error);
  }
}