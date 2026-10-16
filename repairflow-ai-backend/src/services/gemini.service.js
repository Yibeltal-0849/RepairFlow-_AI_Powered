const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models";

const DEFAULT_MODEL =
  process.env.GEMINI_MODEL || "gemini-3.8-flash";


const diagnosisSchema = {
  type: "object",
  properties: {
    summary: {
      type: "string"
    },

    possible_causes: {
      type: "array",
      items: {
        type: "object",
        properties: {
          cause: {
            type: "string"
          },
          rationale: {
            type: "string"
          },
          uncertainty: {
            type: "string"
          },
          evidence: {
            type: "array",
            items: {
              type: "string"
            }
          }
        },
        required: [
          "cause",
          "rationale",
          "uncertainty",
          "evidence"
        ]
      }
    },

    recommended_tests: {
      type: "array",
      items: {
        type: "string"
      }
    },

    required_tools: {
      type: "array",
      items: {
        type: "string"
      }
    },

    potentially_relevant_parts: {
      type: "array",
      items: {
        type: "string"
      }
    },

    safety_notes: {
      type: "array",
      items: {
        type: "string"
      }
    },

    missing_information: {
      type: "array",
      items: {
        type: "string"
      }
    },

    limitations: {
      type: "array",
      items: {
        type: "string"
      }
    }
  },

  required: [
    "summary",
    "possible_causes",
    "recommended_tests",
    "required_tools",
    "potentially_relevant_parts",
    "safety_notes",
    "missing_information",
    "limitations"
  ]
};


function assertString(value, field) {
  if (typeof value !== "string") {
    throw new Error(`Gemini response field "${field}" must be a string.`);
  }
}


function assertStringArray(value, field) {
  if (!Array.isArray(value)) {
    throw new Error(`Gemini response field "${field}" must be an array.`);
  }

  for (const item of value) {
    if (typeof item !== "string") {
      throw new Error(
        `Gemini response field "${field}" must contain only strings.`
      );
    }
  }
}


function validateDiagnosisResult(data) {
  if (!data || typeof data !== "object") {
    throw new Error("Gemini returned an invalid diagnosis object.");
  }

  assertString(data.summary, "summary");

  if (!Array.isArray(data.possible_causes)) {
    throw new Error(
      "Gemini response field possible_causes must be an array."
    );
  }

  for (const cause of data.possible_causes) {
    if (!cause || typeof cause !== "object") {
      throw new Error("Each possible cause must be an object.");
    }

    assertString(cause.cause, "possible_causes.cause");
    assertString(cause.rationale, "possible_causes.rationale");
    assertString(cause.uncertainty, "possible_causes.uncertainty");
    assertStringArray(
      cause.evidence,
      "possible_causes.evidence"
    );
  }

  assertStringArray(
    data.recommended_tests,
    "recommended_tests"
  );

  assertStringArray(
    data.required_tools,
    "required_tools"
  );

  assertStringArray(
    data.potentially_relevant_parts,
    "potentially_relevant_parts"
  );

  assertStringArray(
    data.safety_notes,
    "safety_notes"
  );

  assertStringArray(
    data.missing_information,
    "missing_information"
  );

  assertStringArray(
    data.limitations,
    "limitations"
  );

  return data;
}


function extractGeminiText(response) {
  const candidates = response?.candidates;

  if (!Array.isArray(candidates) || !candidates.length) {
    throw new Error("Gemini returned no candidates.");
  }

  const parts = candidates[0]?.content?.parts;

  if (!Array.isArray(parts)) {
    throw new Error("Gemini returned no content parts.");
  }

  const text = parts
    .filter(part => typeof part.text === "string")
    .map(part => part.text)
    .join("");

  if (!text.trim()) {
    throw new Error("Gemini returned an empty response.");
  }

  return text;
}


export async function generateDiagnosis({
  repair,
  symptoms,
  previousAttempts = "",
  measurements = "",
  additionalContext = "",
  diagnosticTests = []
}) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  if (!repair) {
    throw new Error("Repair information is required.");
  }

  const prompt = `
You are an AI diagnostic assistant for a repair shop.

Your role is advisory only.

Do NOT claim that a component is definitely faulty unless the supplied
evidence supports that conclusion.

Distinguish clearly between:
- reported symptoms
- technician measurements
- verified test results
- possible causes
- uncertainty

Recommend low-risk diagnostic checks before invasive repairs where appropriate.

If information is missing, put it in missing_information.

Always include limitations.

REPAIR INFORMATION

Device brand:
${repair.device_brand}

Device model:
${repair.device_model}

Reported issue:
${repair.reported_issue}

Additional symptoms:
${symptoms || "None provided"}

Previous repair attempts:
${previousAttempts || "None provided"}

Measurements:
${measurements || "None provided"}

Additional context:
${additionalContext || "None provided"}

Existing diagnostic tests:
${JSON.stringify(diagnosticTests)}

Return ONLY the structured JSON requested by the schema.
`;

  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, 30000);

  try {
    const response = await fetch(
      `${GEMINI_API_URL}/${encodeURIComponent(DEFAULT_MODEL)}:generateContent?key=${encodeURIComponent(process.env.GEMINI_API_KEY)}`,
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
            temperature: 0.2,
            responseMimeType: "application/json",
            responseSchema: diagnosisSchema
          }
        }),

        signal: controller.signal
      }
    );

    const responseText = await response.text();

    let data;

    try {
      data = JSON.parse(responseText);
    } catch {
      throw new Error(
        `Gemini returned invalid HTTP JSON. Status: ${response.status}`
      );
    }

    if (!response.ok) {
      throw new Error(
        data?.error?.message ||
        `Gemini API request failed with status ${response.status}.`
      );
    }

    const text = extractGeminiText(data);

    let parsed;

    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error(
        "Gemini returned malformed diagnosis JSON."
      );
    }

    return validateDiagnosisResult(parsed);
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("Gemini request timed out.");
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}


export function getDiagnosisSchema() {
  return diagnosisSchema;
}