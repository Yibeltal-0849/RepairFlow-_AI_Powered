import { query } from "../config/db.js";


function getTelegramUrl() {
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    throw new Error(
      "TELEGRAM_BOT_TOKEN is not configured."
    );
  }

  return (
    `https://api.telegram.org/bot` +
    `${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`
  );
}


async function telegramRequest(payload) {
  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, 15000);

  try {
    const response = await fetch(
      getTelegramUrl(),
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify(payload),

        signal: controller.signal
      }
    );

    const data = await response.json();

    if (!response.ok || !data.ok) {
      throw new Error(
        data?.description ||
        `Telegram API returned HTTP ${response.status}.`
      );
    }

    return data;
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("Telegram request timed out.");
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}


export async function sendTelegramMessage({
  chatId,
  message,
  repairId = null,
  eventType = "notification.sent"
}) {
  if (!chatId) {
    throw new Error("Telegram chat ID is required.");
  }

  if (!message || !String(message).trim()) {
    throw new Error("Telegram message is required.");
  }

  let attempt = 1;

  try {
    const result = await telegramRequest({
      chat_id: chatId,
      text: String(message).trim()
    });

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
        eventType,
        repairId ? "repair" : "notification",
        repairId,
        "success",
        attempt
      ]
    );

    return {
      success: true,
      messageId: result?.result?.message_id || null
    };
  } catch (error) {
    await query(
      `INSERT INTO integration_sync_logs
       (
         integration_name,
         event_type,
         entity_type,
         entity_id,
         status,
         attempts,
         last_error,
         next_retry_at
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 5 MINUTE))`,
      [
        "telegram",
        eventType,
        repairId ? "repair" : "notification",
        repairId,
        "failed",
        attempt,
        error.message
      ]
    );

    throw error;
  }
}


export async function sendShopTestMessage(message) {
  const chatId = process.env.TELEGRAM_SHOP_CHAT_ID;

  if (!chatId) {
    throw new Error(
      "TELEGRAM_SHOP_CHAT_ID is not configured."
    );
  }

  return sendTelegramMessage({
    chatId,
    message:
      message ||
      "REPAIRFLOW AI Telegram integration test.",
    eventType: "telegram.test"
  });
}


export async function sendCustomerTelegram({
  customerId,
  repairId,
  message
}) {
  const customers = await query(
    `SELECT
       customer_id,
       telegram_chat_id,
       notification_consent
     FROM customers
     WHERE customer_id = ?
     LIMIT 1`,
    [customerId]
  );

  if (!customers.length) {
    throw new Error("Customer not found.");
  }

  const customer = customers[0];

  if (!customer.notification_consent) {
    throw new Error(
      "Customer has not given notification consent."
    );
  }

  if (!customer.telegram_chat_id) {
    throw new Error(
      "Customer does not have a Telegram chat ID."
    );
  }

  return sendTelegramMessage({
    chatId: customer.telegram_chat_id,
    message,
    repairId,
    eventType: "customer.notification"
  });
}

