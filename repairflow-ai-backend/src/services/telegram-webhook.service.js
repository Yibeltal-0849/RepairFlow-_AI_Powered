async function telegramApiRequest(method, payload = {}) {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    throw new Error(
      "TELEGRAM_BOT_TOKEN is not configured."
    );
  }

  const response = await fetch(
    `https://api.telegram.org/bot${token}/${method}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    }
  );

  const data = await response.json();

  if (!response.ok || !data.ok) {
    throw new Error(
      data?.description ||
      `Telegram API error: HTTP ${response.status}`
    );
  }

  return data;
}


/*
|--------------------------------------------------------------------------
| Register Telegram webhook
|--------------------------------------------------------------------------
*/

export async function setTelegramWebhook() {
  const publicApiUrl =
    process.env.PUBLIC_API_URL;

  const secret =
    process.env.TELEGRAM_WEBHOOK_SECRET;

  if (!publicApiUrl) {
    throw new Error(
      "PUBLIC_API_URL is not configured."
    );
  }

  if (!secret) {
    throw new Error(
      "TELEGRAM_WEBHOOK_SECRET is not configured."
    );
  }

  const webhookUrl =
    `${publicApiUrl.replace(/\/$/, "")}` +
    `/api/integrations/telegram/webhook`;

  const result = await telegramApiRequest(
    "setWebhook",
    {
      url: webhookUrl,
      secret_token: secret,
      allowed_updates: ["message"],
      drop_pending_updates: false
    }
  );

  console.log(
    "Telegram webhook registered:",
    webhookUrl
  );

  return result;
}


/*
|--------------------------------------------------------------------------
| Check Telegram webhook
|--------------------------------------------------------------------------
*/

export async function getTelegramWebhookInfo() {
  return telegramApiRequest(
    "getWebhookInfo"
  );
}