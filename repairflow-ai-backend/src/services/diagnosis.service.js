import { query, withTransaction } from "../config/db.js";
import { generateDiagnosis } from "./gemini.service.js";


export async function runDiagnosis({
  repairId,
  symptoms = "",
  previousAttempts = "",
  measurements = "",
  additionalContext = ""
}) {
  const repairs = await query(
    `SELECT
       repair_id,
       ticket_number,
       device_brand,
       device_model,
       reported_issue,
       diagnosis_summary,
       status
     FROM repairs
     WHERE repair_id = ?
     LIMIT 1`,
    [repairId]
  );

  if (!repairs.length) {
    throw new Error("Repair not found.");
  }

  const repair = repairs[0];

  const diagnosticTests = await query(
    `SELECT
       diagnostic_test_id,
       test_name,
       measurement,
       result,
       technician_id,
       created_at
     FROM diagnostic_tests
     WHERE repair_id = ?
     ORDER BY created_at DESC
     LIMIT 50`,
    [repairId]
  );

  const inputSummary = {
    symptoms: symptoms || repair.reported_issue,
    previous_attempts: previousAttempts,
    measurements,
    additional_context: additionalContext,
    diagnostic_tests: diagnosticTests
  };

  let suggestions;

  try {
    suggestions = await generateDiagnosis({
      repair,
      symptoms,
      previousAttempts,
      measurements,
      additionalContext,
      diagnosticTests
    });
  } catch (error) {
    await query(
      `INSERT INTO diagnosis_sessions
       (
         repair_id,
         provider,
         model_name,
         input_summary,
         structured_suggestions,
         uncertainty_notes,
         status
       )
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        repairId,
        "Gemini",
        process.env.GEMINI_MODEL || null,
        JSON.stringify(inputSummary),
        JSON.stringify({
          summary: "",
          possible_causes: [],
          recommended_tests: [],
          required_tools: [],
          potentially_relevant_parts: [],
          safety_notes: [],
          missing_information: [],
          limitations: [
            "AI diagnosis failed and requires manual diagnosis."
          ]
        }),
        error.message,
        "failed"
      ]
    );

    throw error;
  }

  const diagnosisSessionId =
    await withTransaction(async conn => {
      const [result] = await conn.execute(
        `INSERT INTO diagnosis_sessions
         (
           repair_id,
           provider,
           model_name,
           input_summary,
           structured_suggestions,
           uncertainty_notes,
           status
         )
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          repairId,
          "Gemini",
          process.env.GEMINI_MODEL || null,
          JSON.stringify(inputSummary),
          JSON.stringify(suggestions),
          suggestions.missing_information?.length
            ? "Additional evidence is required."
            : "AI output is advisory and requires technician review.",
          "pending_review"
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
         VALUES (?, 'diagnosis', ?, 'diagnosis.generated', ?)`,
        [
          null,
          result.insertId,
          JSON.stringify({
            repair_id: repairId,
            provider: "Gemini"
          })
        ]
      );

      return result.insertId;
    });

  return {
    diagnosis_session_id: diagnosisSessionId,
    repair_id: repairId,
    status: "pending_review",
    suggestions
  };
}


export async function approveDiagnosis({
  diagnosisSessionId,
  reviewerId,
  status,
  structuredSuggestions,
  uncertaintyNotes = ""
}) {
  const allowedStatuses = [
    "approved",
    "rejected",
    "edited"
  ];

  if (!allowedStatuses.includes(status)) {
    throw new Error(
      "Diagnosis status must be approved, rejected, or edited."
    );
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
    [diagnosisSessionId]
  );

  if (!sessions.length) {
    throw new Error(
      "Diagnosis session not found."
    );
  }

  const session = sessions[0];

  let finalSuggestions =
    structuredSuggestions ??
    session.structured_suggestions;

  if (
    typeof finalSuggestions !== "string"
  ) {
    finalSuggestions =
      JSON.stringify(finalSuggestions);
  }

  return withTransaction(async conn => {
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
        finalSuggestions,
        uncertaintyNotes,
        status,
        reviewerId,
        diagnosisSessionId
      ]
    );

    if (
      status === "approved" ||
      status === "edited"
    ) {
      await conn.execute(
        `UPDATE repairs
         SET diagnosis_summary = ?
         WHERE repair_id = ?`,
        [
          finalSuggestions,
          session.repair_id
        ]
      );
    }

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
        reviewerId,
        diagnosisSessionId,
        `diagnosis.${status}`,
        JSON.stringify({
          repair_id: session.repair_id
        })
      ]
    );

    return {
      diagnosis_session_id:
        Number(diagnosisSessionId),
      repair_id: session.repair_id,
      status,
      reviewed_by: reviewerId
    };
  });
}


export async function recordDiagnosticTest({
  repairId,
  diagnosisSessionId = null,
  testName,
  measurement = null,
  result = null,
  technicianId
}) {
  if (!repairId) {
    throw new Error("repairId is required.");
  }

  if (!testName || !String(testName).trim()) {
    throw new Error("testName is required.");
  }

  const repairs = await query(
    `SELECT repair_id
     FROM repairs
     WHERE repair_id = ?
     LIMIT 1`,
    [repairId]
  );

  if (!repairs.length) {
    throw new Error("Repair not found.");
  }

  if (diagnosisSessionId) {
    const sessions = await query(
      `SELECT diagnosis_session_id
       FROM diagnosis_sessions
       WHERE diagnosis_session_id = ?
         AND repair_id = ?
       LIMIT 1`,
      [
        diagnosisSessionId,
        repairId
      ]
    );

    if (!sessions.length) {
      throw new Error(
        "Diagnosis session does not belong to this repair."
      );
    }
  }

  const resultInsert = await query(
    `INSERT INTO diagnostic_tests
     (
       repair_id,
       diagnosis_session_id,
       test_name,
       measurement,
       result,
       technician_id
     )
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      repairId,
      diagnosisSessionId,
      testName.trim(),
      measurement,
      result,
      technicianId
    ]
  );

  return {
    diagnostic_test_id:
      resultInsert.insertId,
    repair_id: repairId,
    diagnosis_session_id:
      diagnosisSessionId,
    test_name: testName.trim(),
    measurement,
    result,
    technician_id: technicianId
  };
}