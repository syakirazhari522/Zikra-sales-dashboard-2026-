const SYNC_HANDLER = "syncSales";
const EDIT_HANDLER = "handleSheetEdit";
const SALES_SHEET_ID = 780618427;
const SALES_COLUMN_COUNT = 13;

function syncSales() {
  const properties = PropertiesService.getScriptProperties();
  const syncUrl = properties.getProperty("SYNC_URL");
  const syncSecret = properties.getProperty("SYNC_SECRET");
  if (!syncUrl || !syncSecret) {
    throw new Error("Tetapkan SYNC_URL dan SYNC_SECRET dalam Script Properties dahulu.");
  }

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetById(SALES_SHEET_ID);
  if (!sheet) throw new Error("Tab Jualan Zikra 2026 tidak ditemui.");

  const rows = sheet.getDataRange().getValues().slice(1).flatMap(toPayload);

  pushRows(rows);
}

function handleSheetEdit(event) {
  if (!event || event.range.getSheet().getSheetId() !== SALES_SHEET_ID || event.range.getRow() === 1) return;

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return;
  try {
    const sheet = event.range.getSheet();
    const startRow = event.range.getRow();
    const rowCount = event.range.getNumRows();
    const rows = sheet.getRange(startRow, 1, rowCount, SALES_COLUMN_COUNT).getValues().flatMap(toPayload);
    if (rows.length) pushRows(rows);
  } finally {
    lock.releaseLock();
  }
}

function pushRows(rows) {
  if (!rows.length) return;
  const properties = PropertiesService.getScriptProperties();
  const syncUrl = properties.getProperty("SYNC_URL");
  const syncSecret = properties.getProperty("SYNC_SECRET");
  if (!syncUrl || !syncSecret) throw new Error("Tetapkan SYNC_URL dan SYNC_SECRET dahulu.");

  const response = UrlFetchApp.fetch(syncUrl, {
    method: "post",
    contentType: "application/json",
    headers: { Authorization: `Bearer ${syncSecret}` },
    payload: JSON.stringify({ rows }),
    muteHttpExceptions: true,
  });

  if (response.getResponseCode() < 200 || response.getResponseCode() >= 300) {
    throw new Error(`Sync gagal (${response.getResponseCode()}): ${response.getContentText()}`);
  }

  console.log(response.getContentText());
}

function setupFiveMinuteTrigger() {
  ScriptApp.getProjectTriggers()
    .filter((trigger) => [SYNC_HANDLER, EDIT_HANDLER].includes(trigger.getHandlerFunction()))
    .forEach((trigger) => ScriptApp.deleteTrigger(trigger));

  ScriptApp.newTrigger(EDIT_HANDLER)
    .forSpreadsheet(SpreadsheetApp.getActiveSpreadsheet())
    .onEdit()
    .create();

  ScriptApp.newTrigger(SYNC_HANDLER)
    .timeBased()
    .everyMinutes(5)
    .create();

  syncSales();
}

function setupInstantEditTrigger() {
  ScriptApp.getProjectTriggers()
    .filter((trigger) => [SYNC_HANDLER, EDIT_HANDLER].includes(trigger.getHandlerFunction()))
    .forEach((trigger) => ScriptApp.deleteTrigger(trigger));

  ScriptApp.newTrigger(EDIT_HANDLER)
    .forSpreadsheet(SpreadsheetApp.getActiveSpreadsheet())
    .onEdit()
    .create();
  syncSales();
}

function toPayload(row) {
  const sourceId = Number(row[0]);
  const invoiceId = Number(row[3]);
  const id = Number.isSafeInteger(invoiceId) && invoiceId > 0 && Number.isSafeInteger(sourceId) && sourceId > 0
    ? (invoiceId * 100000) + sourceId
    : sourceId;
  const confirmedAt = toIsoString(row[11]);
  if (!Number.isSafeInteger(id) || id <= 0 || !confirmedAt) return [];

  return [{
    id,
    form_code: String(row[1] || ""),
    class_title: normalizeClassName(row[12] || row[2]),
    product: String(row[7] || ""),
    quantity: toNumber(row[8]),
    list_price: toNumber(row[9]),
    revenue: toNumber(row[10]),
    submitted_at: null,
    confirmed_at: confirmedAt,
  }];
}

function normalizeClassName(value) {
  const name = String(value || "Tanpa kategori").trim().replace(/\s+/g, " ");
  const aliases = {
    "e-zine": "E-zine",
    "Pakej Setahun Zikra": "Pakej Setahun",
    "Kelas Asmaul Husna": "Asmaul Husna",
  };
  return aliases[name] || name;
}

function toNumber(value) {
  if (typeof value === "number") return value;
  const parsed = Number(String(value || "0").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function toIsoString(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString();
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}
