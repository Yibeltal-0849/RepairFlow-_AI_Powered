export async function runShopManager({
  question,
  shopData
}) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error(
      "GEMINI_API_KEY is not configured."
    );
  }

  const models = [
    process.env.GEMINI_MODEL || "gemini-3.8-flash",
    process.env.GEMINI_FALLBACK_MODEL || "gemini-3.6-flash",
    process.env.GEMINI_LITE_MODEL || "gemini-3.5-flash-lite"
  ];

  const prompt = `
You are REPAIRFLOW AI Shop Manager.

You are an AI operations manager for a device repair shop.

The shop manager asked:

"${question}"

CURRENT SHOP DATA:

${JSON.stringify(shopData, null, 2)}

Analyze the shop data and help the manager make
operational decisions.

RULES:

1. Only use information contained in the shop data.
2. Never invent repairs, customers, prices, tasks, or metrics.
3. Prioritize urgent tasks first.
4. Identify overdue repairs.
5. Identify important workflow tasks.
6. Identify pending or failed notifications.
7. Give practical recommendations.
8. If information is unavailable, clearly say so.
9. Do not mention SQL or database implementation.
10. Answer as a professional repair-shop manager.
11. Return ONLY valid JSON.

Return exactly:

{
  "answer": "Direct answer to the manager's question.",
  "summary": "Short summary of the current shop situation.",
  "priorities": [
    {
      "priority": "urgent",
      "title": "What needs attention",
      "repair_id": null,
      "workflow_task_id": null,
      "reason": "Why this should be prioritized."
    }
  ],
  "insights": [
    "Important business insight."
  ],
  "recommendations": [
    "Recommended action."
  ],
  "warnings": [
    "Important warning."
  ]
}
`;

  let lastError = null;

  for (const model of models) {

    console.log(
      `REPAIRFLOW AI Shop Manager trying model: ${model}`
    );

    for (let attempt = 1; attempt <= 2; attempt++) {

      try {

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
          {
            method: "POST",

            headers: {
              "Content-Type": "application/json"
            },

            body: JSON.stringify({
              contents: [
                {
                  role: "user",
                  parts: [
                    {
                      text: prompt
                    }
                  ]
                }
              ],

              generationConfig: {
                responseMimeType: "application/json"
              }
            })
          }
        );

        const responseText =
          await response.text();

        /*
        |--------------------------------------------------------------------------
        | Successful response
        |--------------------------------------------------------------------------
        */

        if (response.ok) {

          let data;

          try {
            data = JSON.parse(responseText);
          } catch {
            throw new Error(
              "Gemini returned invalid API JSON."
            );
          }

          const text =
            data?.candidates?.[0]
              ?.content?.parts?.[0]?.text;

          if (!text) {
            console.error(
              "Gemini response:",
              JSON.stringify(data, null, 2)
            );

            throw new Error(
              "Gemini returned an empty response."
            );
          }

          try {

            return JSON.parse(text);

          } catch {

            console.error(
              "Invalid Shop Manager JSON:",
              text
            );

            throw new Error(
              "Gemini Shop Manager returned invalid JSON."
            );
          }
        }

        /*
        |--------------------------------------------------------------------------
        | Gemini request failed
        |--------------------------------------------------------------------------
        */

        console.error(
          `Gemini ${model} returned ${response.status}:`,
          responseText
        );

        lastError = new Error(
          `Gemini ${model} failed with status ${response.status}.`
        );

        /*
        |--------------------------------------------------------------------------
        | Temporary errors
        |--------------------------------------------------------------------------
        */

        const temporaryError =
          response.status === 429 ||
          response.status === 500 ||
          response.status === 502 ||
          response.status === 503 ||
          response.status === 504;

        /*
        |--------------------------------------------------------------------------
        | Try same model again
        |--------------------------------------------------------------------------
        */

        if (
          temporaryError &&
          attempt < 2
        ) {

          console.log(
            `Retrying ${model} in 3 seconds...`
          );

          await new Promise(
            resolve => setTimeout(resolve, 3000)
          );

          continue;
        }

        /*
        |--------------------------------------------------------------------------
        | Move to next model
        |--------------------------------------------------------------------------
        */

        break;

      } catch (error) {

        lastError = error;

        console.error(
          `Shop Manager ${model} attempt failed:`,
          error.message
        );

        if (attempt < 2) {

          console.log(
            `Retrying ${model} in 3 seconds...`
          );

          await new Promise(
            resolve => setTimeout(resolve, 3000)
          );

          continue;
        }

        break;
      }
    }

    console.log(
      `Model ${model} unavailable. Trying next model...`
    );
  }

  throw lastError ||
    new Error(
      "All Gemini Shop Manager models failed."
    );
}