import { google } from "googleapis";
import { query } from "../config/db.js";


const SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets"
];


function getSheetConfig() {
  const spreadsheetId =
    process.env.GOOGLE_SHEET_ID;

  const keyFile =
    process.env.GOOGLE_APPLICATION_CREDENTIALS;

  const range =
    process.env.GOOGLE_SHEET_RANGE ||
    "Repairs!A1";

  if (!spreadsheetId) {
    throw new Error(
      "GOOGLE_SHEET_ID is not configured."
    );
  }

  if (!keyFile) {
    throw new Error(
      "GOOGLE_APPLICATION_CREDENTIALS is not configured."
    );
  }

  return {
    spreadsheetId,
    keyFile,
    range
  };
}


async function getSheetsClient() {
  const config = getSheetConfig();

  const auth = new google.auth.GoogleAuth({
    keyFile: config.keyFile,
    scopes: SCOPES
  });

  const client = await auth.getClient();

  return google.sheets({
    version: "v4",
    auth: client
  });
}


function normalizeCell(value) {
  if (value === null || value === undefined) {
    return "";
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return String(value);
}


function repairRowsToSheet(repairs) {
  const header = [
    "repair_id",
    "ticket_number",
    "customer_id",
    "device_brand",
    "device_model",
    "status",
    "estimated_cost",
    "final_cost",
    "promised_at",
    "created_at",
    "updated_at"
  ];

  const rows = repairs.map(repair => [
    normalizeCell(repair.repair_id),
    normalizeCell(repair.ticket_number),
    normalizeCell(repair.customer_id),
    normalizeCell(repair.device_brand),
    normalizeCell(repair.device_model),
    normalizeCell(repair.status),
    normalizeCell(repair.estimated_cost),
    normalizeCell(repair.final_cost),
    normalizeCell(repair.promised_at),
    normalizeCell(repair.created_at),
    normalizeCell(repair.updated_at)
  ]);

  return [
    header,
    ...rows
  ];
}


export async function exportRepairsToSheets() {
  const config = getSheetConfig();

  const repairs = await query(
    `SELECT
       repair_id,
       ticket_number,
       customer_id,
       device_brand,
       device_model,
       status,
       estimated_cost,
       final_cost,
       promised_at,
       created_at,
       updated_at
     FROM repairs
     ORDER BY created_at DESC
     LIMIT 5000`
  );

  const values = repairRowsToSheet(repairs);

  const sheets = await getSheetsClient();

  await sheets.spreadsheets.values.clear({
    spreadsheetId: config.spreadsheetId,
    range: config.range
  });

  const response =
    await sheets.spreadsheets.values.update({
      spreadsheetId: config.spreadsheetId,
      range: config.range,
      valueInputOption: "RAW",
      requestBody: {
        values
      }
    });

  return {
    success: true,
    spreadsheetId: config.spreadsheetId,
    range: response.data.updatedRange,
    rows: repairs.length
  };
}


export async function appendIntegrationLogToSheets({
  integration,
  eventType,
  status,
  attempts,
  error = ""
}) {
  const config = getSheetConfig();

  const sheets = await getSheetsClient();

  const range =
    process.env.GOOGLE_INTEGRATION_LOG_RANGE ||
    "Integration Logs!A1";

  await sheets.spreadsheets.values.append({
    spreadsheetId: config.spreadsheetId,
    range,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [
        [
          new Date().toISOString(),
          integration,
          eventType,
          status,
          attempts,
          error
        ]
      ]
    }
  });

  return {
    success: true
  };
}


export async function testSheetsConnection() {
  const config = getSheetConfig();

  const sheets = await getSheetsClient();

  const response =
    await sheets.spreadsheets.get({
      spreadsheetId: config.spreadsheetId,
      fields: "spreadsheetId,properties.title"
    });

  return {
    success: true,
    spreadsheetId:
      response.data.spreadsheetId,
    title:
      response.data.properties?.title || null
  };
}