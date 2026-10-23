/**
 * ============================================================================
 * XCELERATE PULSE — MASTER EXECUTION PIPELINE AGGREGATOR
 * Automatically Pulls Multiple Employee Sheets Into Your 'Flow' Sheet By Sheet ID
 * ============================================================================
 * 
 * HOW THIS WORKS:
 * 1. Install this script ONLY in this Master Sheet ("Execution Pipeline").
 * 2. You NEVER need to touch or add code to your employees' sheets.
 * 3. Just list your employees' Sheet IDs in the '⚙️ Employee Sheets' tab
 *    (e.g., Payal: 17kvysvuctOSTh_1FTEsa_vlsdVELs8rSdqR-R_gJZqI).
 * 4. Click '⚡ Xcelerate Pulse > 📥 Pull All Employee Data Into Flow Sheet':
 *    - Opens each employee sheet in the background.
 *    - Maps every column into your exact 'Flow' headers.
 *    - UPDATES existing creators (views, statuses, live links) without duplicates.
 *    - APPENDS new creators at the bottom of your 'Flow' sheet.
 *    - PUSHES all live data to the Xcelerate Pulse Brand Portal!
 * 5. You can also turn on '⏰ Enable Auto-Pull (Every 15/30 Mins)' to run 24/7!
 * ============================================================================
 */

// Live endpoint of your Xcelerate Pulse Platform (Production on Vercel)
var WEBHOOK_URL = "https://xcelerate-pulse.vercel.app/api/sync/sheets"; 


/**
 * Returns dynamic webhook URL if provided or saved in ScriptProperties, fallback to WEBHOOK_URL
 */
function getEffectiveWebhookUrl(overrideUrl) {
  if (overrideUrl && String(overrideUrl).indexOf("http") === 0) {
    return String(overrideUrl).trim();
  }
  try {
    var stored = PropertiesService.getScriptProperties().getProperty("WEBHOOK_URL");
    if (stored && stored.indexOf("http") === 0) {
      return stored.trim();
    }
  } catch (e) {}
  return WEBHOOK_URL;
}

// Security Key matching SYNC_API_KEY
var API_KEY = "xcelerate-pulse-sync-secret"; 

// Target tab in this Master Spreadsheet where all consolidated data lives
var TARGET_FLOW_TAB = "Flow";

// Google Drive Folder ID for creator proof screenshots (Paste your folder ID here, or leave empty)
var DEFAULT_PROOF_FOLDER_ID = ""; 

// Google Drive Root Folder ID for Execution Pipeline ("Xcelerate Media Execution")
// Contains execution owner folders: Sakshi Singh Execution, Payal Jha Execution, etc.
var EXECUTION_ROOT_FOLDER_ID = "1pO8KjlqgCVgiPMC2yW2LhwEPHIBU_jyf"; 


// Default employee sheets list (used if '⚙️ Employee Sheets' tab is not yet filled)
var DEFAULT_EMPLOYEE_SHEETS = [
  {
    employee: "Payal",
    sheetId: "17kvysvuctOSTh_1FTEsa_vlsdVELs8rSdqR-R_gJZqI",
    tabName: "ExecutionSheet"
  },
  {
    employee: "Sonu",
    sheetId: "1KmH0x63YeN0i-CVO-o_37OcQz3Cj6JKE0mi15qKijP8",
    tabName: "ExecutionSheet"
  }
];

/**
 * Creates custom toolbar menu - streamlined and focused on essential actions
 */
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  var menu = ui.createMenu("⚡ Xcelerate Pulse")
    .addItem("📥 Pull Employee Data into Flow", "pullAllEmployeeSheetsIntoFlow")
    .addItem("🚀 Sync Flow Sheet to Database", "syncFlowSheetToPlatform")
    .addSeparator()
    .addItem("📁 Create Drive Folders for Selected Row(s)", "menuCreateDriveAssetsForSelectedRows")
    .addItem("⚡ Auto-Create Drive Folders (Next Batch)", "menuAutoCreateDriveAssetsForFlow")
    .addItem("📤 Push Drive Links to Employee Sheets", "menuPushDriveLinksToEmployeeSheets")
    .addItem("🧹 Move Stray Files From My Drive into Creator Folders", "menuCleanupStrayDriveFiles")
    .addSeparator()
    .addItem("🔧 Fix Duplicate Deliverable IDs", "fixDuplicateFlowSheetIds")
    .addItem("🔍 Audit Sheet Rows (Find 4 Skipped Rows)", "auditFlowSheetRows")
    .addItem("🧹 Clear 'Brand/Agency Name' (For Manual Input)", "clearAutoFilledBrandNamesInFlow")
    .addItem("📋 Employee Sheets Registry", "setupEmployeeSheetsRegistryTab");

  var moreMenu = ui.createMenu("⚙️ More Options")
    .addItem("🎯 Pull Single Employee Sheet...", "pullSingleEmployeeSheetIntoFlow")
    .addItem("📅 Sync By Campaign Month...", "syncFlowSheetByMonth")
    .addItem("🏢 Sync By Campaign...", "syncFlowSheetByCampaign")
    .addSeparator()
    .addItem("⚡ Enable Real-Time Sync on Edit", "installRealtimeSyncTrigger")
    .addItem("⏰ Enable 30-Min Auto-Pull", "installAutoPullTrigger")
    .addItem("⏹️ Disable Background Triggers", "removeAllAutomationTriggers")
    .addItem("🔍 Test Connection", "testPlatformConnection");

  menu.addSeparator()
    .addSubMenu(moreMenu)
    .addToUi();
}

/**
 * Batch write lock: prevents onEdit triggers from firing during pullEmployeeListIntoFlow
 * so that data written from employee sheets into Flow does NOT get auto-pushed to Turso.
 */
var BATCH_WRITE_LOCK_KEY = "XCELERATE_BATCH_WRITE_LOCK";

function isBatchWriteInProgress() {
  try {
    var lock = PropertiesService.getScriptProperties().getProperty(BATCH_WRITE_LOCK_KEY);
    if (!lock) return false;
    // Lock expires after 10 minutes to prevent permanent deadlock
    var lockTime = parseInt(lock, 10);
    if (isNaN(lockTime)) return false;
    return (new Date().getTime() - lockTime) < 600000;
  } catch (e) {
    return false;
  }
}

function setBatchWriteLock(active) {
  try {
    if (active) {
      PropertiesService.getScriptProperties().setProperty(BATCH_WRITE_LOCK_KEY, String(new Date().getTime()));
    } else {
      PropertiesService.getScriptProperties().deleteProperty(BATCH_WRITE_LOCK_KEY);
    }
  } catch (e) {
    Logger.log("Lock error: " + e.toString());
  }
}

/**
 * Installable Trigger: Runs with full user auth so UrlFetchApp can send HTTP requests in real-time.
 * GUARDED: Skips if a batch-write is in progress (employee pull into Flow).
 */
function handleInstalledOnEdit(e) {
  try {
    if (!e || !e.range) return;
    // CRITICAL: Skip if employee data is being batch-written into Flow
    if (isBatchWriteInProgress()) return;
    var sheet = e.range.getSheet();
    if (sheet.getName() !== TARGET_FLOW_TAB) return;
    var row = e.range.getRow();
    if (row <= 1) return;

    // Real-time push of edited row directly to Turso DB via Pulse webhook
    syncFlowRowByIndex(sheet, row);
  } catch (err) {
    Logger.log("handleInstalledOnEdit Error: " + err.toString());
  }
}

/**
 * Fallback simple trigger (Catches manual cell edits in Flow).
 * GUARDED: Skips if a batch-write is in progress (employee pull into Flow).
 */
function onEdit(e) {
  try {
    if (!e || !e.range) return;
    // CRITICAL: Skip if employee data is being batch-written into Flow
    if (isBatchWriteInProgress()) return;
    var sheet = e.range.getSheet();
    if (sheet.getName() !== TARGET_FLOW_TAB) return;
    var row = e.range.getRow();
    if (row <= 1) return;

    syncFlowRowByIndex(sheet, row);
  } catch (err) {
    Logger.log("onEdit Error: " + err.toString());
  }
}

/**
 * Sets up the '⚙️ Employee Sheets' tab where you just paste Sheet IDs or URLs
 */
function setupEmployeeSheetsRegistryTab() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var configSheet = ss.getSheetByName("⚙️ Employee Sheets");

  if (!configSheet) {
    configSheet = ss.insertSheet("⚙️ Employee Sheets");
  }

  var headers = [
    ["Employee Name", "Google Sheet ID or Full URL", "Tab Name (Default: ExecutionSheet)", "Status (Active/Paused)", "Last Pulled At", "Rows Ingested"]
  ];

  configSheet.getRange(1, 1, 1, 6).setValues(headers);
  configSheet.getRange(1, 1, 1, 6)
    .setBackground("#0052FF")
    .setFontColor("#FFFFFF")
    .setFontWeight("bold");

  if (configSheet.getLastRow() < 2) {
    var sampleRows = [
      ["Payal", "17kvysvuctOSTh_1FTEsa_vlsdVELs8rSdqR-R_gJZqI", "ExecutionSheet", "Active", "Never", 0],
      ["Sonu", "1KmH0x63YeN0i-CVO-o_37OcQz3Cj6JKE0mi15qKijP8", "ExecutionSheet", "Active", "Never", 0],
      ["Tej", "PASTE_TEJ_SHEET_ID_OR_URL_HERE", "ExecutionSheet", "Active", "Never", 0]
    ];
    configSheet.getRange(2, 1, sampleRows.length, 6).setValues(sampleRows);
  }

  configSheet.autoResizeColumns(1, 6);
  Logger.log("Employee Sheets tab initialized.");
}

/**
 * Utility: Clears the 'Brand/Agency Name' column in Flow so it can be filled manually after asking the POC
 */
function clearAutoFilledBrandNamesInFlow(silent) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var flowSheet = ss.getSheetByName(TARGET_FLOW_TAB);
  if (!flowSheet) return { success: false, error: "Flow sheet not found" };

  var lastRow = flowSheet.getLastRow();
  var lastCol = flowSheet.getLastColumn();
  if (lastRow < 2 || lastCol < 1) return { success: true, cleared: 0 };

  var headers = flowSheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var brandCol = null;
  for (var c = 0; c < headers.length; c++) {
    var h = String(headers[c] || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
    if (h === "brandagencyname" || h === "brandname" || h === "brand") {
      brandCol = c + 1;
      break;
    }
  }

  if (!brandCol) {
    if (!silent) {
      Logger.log("Brand/Agency Name column not found in Flow.");
    }
    return { success: false, error: "Brand/Agency Name column not found in Flow." };
  }

  var range = flowSheet.getRange(2, brandCol, lastRow - 1, 1);
  range.clearContent();
  if (!silent) {
    Logger.log("Brand/Agency Name column cleared across " + (lastRow - 1) + " rows.");
  }
  return { success: true, cleared: lastRow - 1 };
}

function extractSheetId(input) {
  if (!input) return "";
  var s = String(input).trim();
  var match = s.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) return match[1];
  return s;
}

function getEmployeeSheetsList() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var configSheet = ss.getSheetByName("⚙️ Employee Sheets") || 
                    ss.getSheetByName("Employee Sheets") ||
                    (function() {
                      var sheets = ss.getSheets();
                      for (var s = 0; s < sheets.length; s++) {
                        if (sheets[s].getName().toLowerCase().indexOf("employee") !== -1) return sheets[s];
                      }
                      return null;
                    })();

  if (!configSheet || configSheet.getLastRow() < 2) {
    return DEFAULT_EMPLOYEE_SHEETS;
  }

  var data = configSheet.getRange(2, 1, configSheet.getLastRow() - 1, 6).getValues();
  var list = [];

  for (var i = 0; i < data.length; i++) {
    var empName = String(data[i][0] || "").trim();
    var rawId = String(data[i][1] || "").trim();
    var tabName = String(data[i][2] || "").trim() || "ExecutionSheet";
    var status = String(data[i][3] || "").trim().toLowerCase();

    var cleanId = extractSheetId(rawId);
    if (cleanId && cleanId.indexOf("PASTE_") === -1 && status !== "paused") {
      list.push({
        employee: empName || ("Employee " + (i + 1)),
        sheetId: cleanId,
        tabName: tabName,
        configRow: i + 2
      });
    }
  }

  return list.length > 0 ? list : DEFAULT_EMPLOYEE_SHEETS;
}

function extractBrandFromBrief(brief) {
  if (!brief) return "";
  var clean = String(brief).trim();
  if (clean.indexOf("-") !== -1) {
    var p = clean.split("-")[0].trim();
    if (p.length > 0) return p;
  }
  if (clean.indexOf("_") !== -1) {
    var p = clean.split("_")[0].trim();
    if (p.length > 0) return p;
  }
  var tokens = clean.split(/\s+/);
  if (tokens.length === 1) return tokens[0];
  var stopWords = /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|january|february|march|april|june|july|august|september|october|november|december|202\d|hm|term|nano|micro|macro|mega|q[1-4]|campaign|reel|reels|launch|execution|influencer)$/i;
  var brandWords = [];
  for (var i = 0; i < tokens.length; i++) {
    if (stopWords.test(tokens[i])) break;
    brandWords.push(tokens[i]);
  }
  return brandWords.length > 0 ? brandWords.join(" ") : tokens[0];
}

function resolveHyperlink(val, richText, formula) {
  if (richText) {
    if (typeof richText.getLinkUrl === "function" && richText.getLinkUrl()) {
      return richText.getLinkUrl();
    }
    if (typeof richText.getRuns === "function") {
      var runs = richText.getRuns();
      for (var i = 0; i < runs.length; i++) {
        var url = runs[i].getLinkUrl();
        if (url) return url;
      }
    }
  }
  if (formula && typeof formula === "string" && formula.toUpperCase().indexOf("=HYPERLINK") !== -1) {
    var match = formula.match(/=HYPERLINK\(\s*"([^"]+)"/i);
    if (match && match[1]) return match[1];
  }
  return val;
}

/**
 * Intelligently extracts clean social handle or path from any raw URL, handle, or query string
 * e.g., "https://www.instagram.com/taxsnap_11/reels/" -> "taxsnap_11"
 *       "tpovgirl ?utm_source=ig_web_button_share"    -> "tpovgirl"
 *       "arttfinance?utm_source=ig_web_button_sha"    -> "arttfinance"
 */
function extractCleanHandleOrUrl(rawUrl) {
  if (!rawUrl) return "";
  var s = String(rawUrl).trim().toLowerCase();
  if (s.indexOf("http") !== -1) {
    var m = s.match(/(?:https?:\/\/)?(?:www\.)?(?:instagram\.com\/|youtube\.com\/@?|tiktok\.com\/@?)([a-z0-9._]+)/i);
    if (m && m[1]) return m[1].replace(/[^a-z0-9._]/g, "");
  }
  var qIdx = s.indexOf("?");
  if (qIdx !== -1) s = s.substring(0, qIdx);
  s = s.trim().replace(/^[@/]+/, "").replace(/\/+$/, "");
  if (s.indexOf("/") !== -1) {
    var parts = s.split("/");
    s = parts[parts.length - 1] || "";
  }
  return s.replace(/[^a-z0-9._]/g, "");
}

/**
 * Safely writes a 2D array of rows to a sheet range.
 * If Google Sheets throws a Data Validation error (e.g. strict dropdown rule on cell),
 * it clears validation on the target range and performs the batch write in under 100ms.
 */
function safeSetRange(range, values2D) {
  if (!values2D || values2D.length === 0) return;
  var targetCols = range.getNumColumns();

  // Sanitize all values: replace undefined/null with empty string and guarantee row width
  var clean2D = [];
  for (var r = 0; r < values2D.length; r++) {
    var row = [];
    for (var c = 0; c < targetCols; c++) {
      var val = (values2D[r] && values2D[r][c] !== undefined && values2D[r][c] !== null) ? values2D[r][c] : "";
      row.push(val);
    }
    clean2D.push(row);
  }

  try {
    range.setValues(clean2D);
  } catch (err) {
    Logger.log("SafeSetRange: Batch write encountered error (" + err.toString() + "). Clearing validations & applying batch write...");
    try {
      range.clearDataValidations();
      range.setValues(clean2D);
    } catch (batchErr) {
      Logger.log("Critical: Batch write failed even after clearing validation: " + batchErr.toString());
      var sheet = range.getSheet();
      var startRow = range.getRow();
      for (var r = 0; r < clean2D.length; r++) {
        try {
          sheet.getRange(startRow + r, 1, 1, targetCols).setValues([clean2D[r]]);
        } catch (rErr) {
          try {
            sheet.getRange(startRow + r, 1, 1, targetCols).clearDataValidations();
            sheet.getRange(startRow + r, 1, 1, targetCols).setValues([clean2D[r]]);
          } catch (_) {}
        }
      }
    }
  }
}

/**
 * Robust matcher for employee column indices against Flow column keys
 */
function findEmpColumnIndex(fKey, empColMap) {
  if (empColMap[fKey] !== undefined) return empColMap[fKey];

  if (fKey === "campaignname" || fKey.indexOf("campaignname") !== -1 || fKey === "campaign") {
    if (empColMap["briefname"] !== undefined) return empColMap["briefname"];
    if (empColMap["brief"] !== undefined) return empColMap["brief"];
    if (empColMap["campaignbrief"] !== undefined) return empColMap["campaignbrief"];
    if (empColMap["campaignname"] !== undefined) return empColMap["campaignname"];
    for (var bk in empColMap) {
      if (bk.indexOf("brief") !== -1) return empColMap[bk];
    }
  }

  if (fKey.indexOf("confirmation") !== -1) {
    if (empColMap["confirmationmailsent"] !== undefined) return empColMap["confirmationmailsent"];
    if (empColMap["confirmationmailstatus"] !== undefined) return empColMap["confirmationmailstatus"];
    if (empColMap["confirmation"] !== undefined) return empColMap["confirmation"];
  }

  // BRAND / AGENCY POC (100% dynamic header matching regardless of column position or header wording)
  if ((fKey.indexOf("brand") !== -1 && fKey.indexOf("poc") !== -1) || 
      (fKey.indexOf("agency") !== -1 && fKey.indexOf("poc") !== -1) || 
      fKey === "brandagencypoc" || fKey === "brandpoc" || fKey === "agencypoc" || fKey === "clientpoc" || fKey === "poc") {
    if (empColMap["brandagencypoc"] !== undefined) return empColMap["brandagencypoc"];
    if (empColMap["brandpoc"] !== undefined) return empColMap["brandpoc"];
    if (empColMap["agencypoc"] !== undefined) return empColMap["agencypoc"];
    if (empColMap["clientpoc"] !== undefined) return empColMap["clientpoc"];
    if (empColMap["brandagencymanager"] !== undefined) return empColMap["brandagencymanager"];
    if (empColMap["brandmanager"] !== undefined) return empColMap["brandmanager"];
    if (empColMap["agencymanager"] !== undefined) return empColMap["agencymanager"];
    if (empColMap["clientmanager"] !== undefined) return empColMap["clientmanager"];
    if (empColMap["brandagencycontact"] !== undefined) return empColMap["brandagencycontact"];
    if (empColMap["brandcontact"] !== undefined) return empColMap["brandcontact"];
    if (empColMap["agencycontact"] !== undefined) return empColMap["agencycontact"];
    // Dynamic scan: check all employee column headers for any containing ("brand" or "agency" or "client") and ("poc" or "manager")
    for (var ek in empColMap) {
      if (ek.indexOf("xcelerate") === -1 && ek.indexOf("execution") === -1) {
        if ((ek.indexOf("brand") !== -1 || ek.indexOf("agency") !== -1 || ek.indexOf("client") !== -1) && (ek.indexOf("poc") !== -1 || ek.indexOf("manager") !== -1)) {
          return empColMap[ek];
        }
      }
    }
  }

  // SCRIPT LINK
  if (fKey.indexOf("scriptlink") !== -1 || fKey.indexOf("scripturl") !== -1 || fKey === "scriptlink") {
    if (empColMap["scriptlink"] !== undefined) return empColMap["scriptlink"];
    if (empColMap["scripturl"] !== undefined) return empColMap["scripturl"];
    if (empColMap["scriptdoclink"] !== undefined) return empColMap["scriptdoclink"];
    if (empColMap["scriptgoogledoclink"] !== undefined) return empColMap["scriptgoogledoclink"];
    if (empColMap["scriptdrivelink"] !== undefined) return empColMap["scriptdrivelink"];
    if (empColMap["script"] !== undefined) return empColMap["script"];
  }

  // SCRIPT STATUS
  if (fKey.indexOf("scriptstatus") !== -1) {
    if (empColMap["scriptstatus"] !== undefined) return empColMap["scriptstatus"];
  }

  // SCRIPT RECEIVED DATE
  if (fKey.indexOf("scriptreceived") !== -1 || fKey.indexOf("scriptreceive") !== -1 || fKey === "scriptreceiveddate") {
    if (empColMap["scriptreceiveddate"] !== undefined) return empColMap["scriptreceiveddate"];
    if (empColMap["scriptreceived"] !== undefined) return empColMap["scriptreceived"];
    if (empColMap["scriptreceivedate"] !== undefined) return empColMap["scriptreceivedate"];
    if (empColMap["scriptrecdate"] !== undefined) return empColMap["scriptrecdate"];
    if (empColMap["scriptdate"] !== undefined && empColMap["scriptapprovaldate"] !== undefined) {
      return empColMap["scriptdate"];
    }
    for (var ek in empColMap) {
      if (ek.indexOf("script") !== -1 && (ek.indexOf("rec") !== -1 || ek.indexOf("rcvd") !== -1 || ek.indexOf("receive") !== -1)) {
        return empColMap[ek];
      }
    }
  }

  // SCRIPT APPROVAL DATE
  if (fKey.indexOf("scriptapproval") !== -1 || fKey === "scriptapprovaldate") {
    if (empColMap["scriptapprovaldate"] !== undefined) return empColMap["scriptapprovaldate"];
    if (empColMap["scriptapproveddate"] !== undefined) return empColMap["scriptapproveddate"];
    for (var ek in empColMap) {
      if (ek.indexOf("script") !== -1 && (ek.indexOf("appr") !== -1 || ek.indexOf("approval") !== -1)) {
        return empColMap[ek];
      }
    }
    if (empColMap["scriptdate"] !== undefined && empColMap["scriptreceiveddate"] === undefined) {
      return empColMap["scriptdate"];
    }
  }

  // 1ST DRAFT STATUS (Flow: "videos1stdraftstatus", Employee: "1stdraftstatus")
  if (fKey.indexOf("draftstatus") !== -1 || fKey.indexOf("1stdraft") !== -1 || fKey.indexOf("firstdraft") !== -1) {
    if (empColMap["1stdraftstatus"] !== undefined) return empColMap["1stdraftstatus"];
    if (empColMap["videos1stdraftstatus"] !== undefined) return empColMap["videos1stdraftstatus"];
    if (empColMap["video1stdraftstatus"] !== undefined) return empColMap["video1stdraftstatus"];
    if (empColMap["firstdraftstatus"] !== undefined) return empColMap["firstdraftstatus"];
    if (empColMap["draftstatus"] !== undefined) return empColMap["draftstatus"];
  }

  // 1ST DRAFT DATE
  if (fKey.indexOf("draftdate") !== -1 || fKey.indexOf("1stdraftdate") !== -1 || fKey.indexOf("firstdraftdate") !== -1) {
    if (empColMap["1stdraftdate"] !== undefined) return empColMap["1stdraftdate"];
    if (empColMap["firstdraftdate"] !== undefined) return empColMap["firstdraftdate"];
    if (empColMap["videos1stdraftdate"] !== undefined) return empColMap["videos1stdraftdate"];
    if (empColMap["video1stdraftdate"] !== undefined) return empColMap["video1stdraftdate"];
    if (empColMap["draftdate"] !== undefined) return empColMap["draftdate"];
  }

  // REVISION / RESHOOT DRIVE LINK
  if (fKey.indexOf("revision") !== -1 || fKey.indexOf("reshoot") !== -1) {
    if (empColMap["revisionreshootfreqdrivelink"] !== undefined) return empColMap["revisionreshootfreqdrivelink"];
    if (empColMap["revisionreshootdrivelink"] !== undefined) return empColMap["revisionreshootdrivelink"];
    if (empColMap["revisiondrivelink"] !== undefined) return empColMap["revisiondrivelink"];
    if (empColMap["revisionlink"] !== undefined) return empColMap["revisionlink"];
    if (empColMap["reshootdrivelink"] !== undefined) return empColMap["reshootdrivelink"];
    if (empColMap["freqdrivelink"] !== undefined) return empColMap["freqdrivelink"];
    if (empColMap["drivelink"] !== undefined) return empColMap["drivelink"];
  }

  // FINAL VIDEO STATUS (Flow: "finalvideostatus", Employee: "videostatus")
  if (fKey.indexOf("videostatus") !== -1 || fKey.indexOf("finalvideo") !== -1) {
    if (empColMap["videostatus"] !== undefined) return empColMap["videostatus"];
    if (empColMap["finalvideostatus"] !== undefined) return empColMap["finalvideostatus"];
    if (empColMap["videoapprovalstatus"] !== undefined) return empColMap["videoapprovalstatus"];
  }

  // VIDEO APPROVAL DATE
  if (fKey.indexOf("videoapproval") !== -1 || fKey === "videoapprovaldate" || fKey === "finalvideoapprovaldate") {
    if (empColMap["videoapprovaldate"] !== undefined) return empColMap["videoapprovaldate"];
    if (empColMap["videoapproveddate"] !== undefined) return empColMap["videoapproveddate"];
    if (empColMap["finalvideoapprovaldate"] !== undefined) return empColMap["finalvideoapprovaldate"];
  }

  // PRODUCT STATUS
  if (fKey.indexOf("productstatus") !== -1 || fKey === "product") {
    if (empColMap["productstatus"] !== undefined) return empColMap["productstatus"];
    if (empColMap["producttrackingstatus"] !== undefined) return empColMap["producttrackingstatus"];
    if (empColMap["product"] !== undefined) return empColMap["product"];
  }

  if (fKey.indexOf("creatorcost") !== -1) {
    if (empColMap["negotiatedcost"] !== undefined) return empColMap["negotiatedcost"];
    if (empColMap["creatorcost"] !== undefined) return empColMap["creatorcost"];
  }

  if (fKey.indexOf("grossmargin") !== -1) {
    if (empColMap["grossmargin"] !== undefined) return empColMap["grossmargin"];
  }

  if (fKey.indexOf("phonenumber") !== -1) {
    if (empColMap["phonenumber"] !== undefined) return empColMap["phonenumber"];
  }

  if (fKey === "creatorname" || fKey === "creator") {
    if (empColMap["creatorname"] !== undefined) return empColMap["creatorname"];
    if (empColMap["creator"] !== undefined) return empColMap["creator"];
    if (empColMap["creatorsname"] !== undefined) return empColMap["creatorsname"];
    if (empColMap["influencer"] !== undefined) return empColMap["influencer"];
    if (empColMap["influencername"] !== undefined) return empColMap["influencername"];
  }

  if (fKey.indexOf("profileurl") !== -1 || fKey === "url") {
    if (empColMap["url"] !== undefined) return empColMap["url"];
    if (empColMap["profileurl"] !== undefined) return empColMap["profileurl"];
  }

  if (fKey.indexOf("livelink") !== -1) {
    if (empColMap["livelink"] !== undefined) return empColMap["livelink"];
    if (empColMap["postlink"] !== undefined) return empColMap["postlink"];
    if (empColMap["reellink"] !== undefined) return empColMap["reellink"];
  }

  if (fKey.indexOf("livedate") !== -1) {
    if (empColMap["videolivedate"] !== undefined) return empColMap["videolivedate"];
    if (empColMap["livedate"] !== undefined) return empColMap["livedate"];
  }

  if (fKey.indexOf("category") !== -1) {
    if (empColMap["category"] !== undefined) return empColMap["category"];
  }

  if (fKey.indexOf("executionstatus") !== -1) {
    if (empColMap["executionstatus"] !== undefined) return empColMap["executionstatus"];
  }

  if (fKey.indexOf("brandpayment") !== -1) {
    if (empColMap["brandpayment"] !== undefined) return empColMap["brandpayment"];
    if (empColMap["brandreceivepaymentcycle"] !== undefined) return empColMap["brandreceivepaymentcycle"];
  }

  if (fKey.indexOf("address") !== -1) {
    if (empColMap["addressifavl"] !== undefined) return empColMap["addressifavl"];
    if (empColMap["address"] !== undefined) return empColMap["address"];
  }

  return undefined;
}

/**
 * Normalizes colloquial employee input into Flow's strict dropdown validation values
 */
function normalizeFlowValue(flowKey, rawVal, followersCount) {
  if (rawVal === null || rawVal === undefined) return "";
  var s = String(rawVal).trim();
  if (!s) return "";

  // 1. Confirmation Mail Dropdown: [Pending, Drop, Mail Sent]
  if (flowKey.indexOf("confirmation") !== -1) {
    var lower = s.toLowerCase();
    if (lower === "yes" || lower === "sent" || lower === "mail sent" || lower === "done" || lower === "true" || lower === "y") {
      return "Mail Sent";
    }
    if (lower === "drop" || lower === "dropped") {
      return "Drop";
    }
    return "Pending";
  }

  // 2. Script Status Dropdown: [Approval Pending, Drop, Script Pending, Approved]
  if (flowKey.indexOf("scriptstatus") !== -1) {
    var lower = s.toLowerCase();
    if (lower === "yes" || lower === "approved" || lower === "done" || lower === "ok" || lower === "true") {
      return "Approved";
    }
    if (lower === "drop" || lower === "dropped" || lower === "rejected") {
      return "Drop";
    }
    if (lower === "approval pending" || lower === "sent for approval" || lower === "review") {
      return "Approval Pending";
    }
    if (lower === "script pending" || lower === "pending" || lower === "no" || lower === "draft pending") {
      return "Script Pending";
    }
    return "Script Pending";
  }

  // 3. Video's 1st Draft Status Dropdown: [Approval Pending, Draft Pending, Sent For Revision/Reshoot, Feedback Pending, Revision/Reshoot Done, Approved, Drop]
  if (flowKey.indexOf("draftstatus") !== -1 || flowKey.indexOf("1stdraft") !== -1 || flowKey.indexOf("firstdraft") !== -1) {
    var lower = s.toLowerCase();
    if (lower === "approved" || lower === "yes" || lower === "done" || lower === "ok" || lower === "true") {
      return "Approved";
    }
    if (lower === "drop" || lower === "dropped" || lower === "rejected") {
      return "Drop";
    }
    if (lower === "revision/reshoot done" || lower === "revision done" || lower === "reshoot done") {
      return "Revision/Reshoot Done";
    }
    if (lower === "sent for revision/reshoot" || lower === "in revision" || lower === "revision" || lower === "reshoot" || lower === "sent for revision") {
      return "Sent For Revision/Reshoot";
    }
    if (lower === "feedback pending" || lower === "feedback needed") {
      return "Feedback Pending";
    }
    if (lower === "approval pending" || lower === "sent for approval" || lower === "review" || lower === "review pending") {
      return "Approval Pending";
    }
    if (lower === "draft pending" || lower === "pending" || lower === "no") {
      return "Draft Pending";
    }
    return "Draft Pending";
  }

  // 4. Final Video Status Dropdown: [Approval Pending, Drop, Approved]
  if (flowKey.indexOf("videostatus") !== -1 || flowKey.indexOf("finalvideo") !== -1) {
    var lower = s.toLowerCase();
    if (lower === "yes" || lower === "approved" || lower === "done" || lower === "live" || lower === "completed" || lower === "true") {
      return "Approved";
    }
    if (lower === "drop" || lower === "dropped" || lower === "rejected") {
      return "Drop";
    }
    if (lower === "approval pending" || lower === "pending" || lower === "ugc" || lower === "review") {
      return "Approval Pending";
    }
    return "Approval Pending";
  }

  // 5. Execution Status Dropdown: [On Going, Drop, Completed, Hold]
  if (flowKey.indexOf("executionstatus") !== -1) {
    var lower = s.toLowerCase();
    if (lower === "completed" || lower === "live" || lower === "done") {
      return "Completed";
    }
    if (lower === "drop" || lower === "dropped" || lower === "cancelled") {
      return "Drop";
    }
    if (lower === "hold" || lower === "on hold") {
      return "Hold";
    }
    return "On Going";
  }

  // 6. Dates: Clean YYYY-MM-DD formatting so no time offset or invalid format occurs
  if (flowKey.indexOf("date") !== -1) {
    return formatDateOnlyForSync(rawVal);
  }

  // 7. Category: Derive or normalize to [Nano, Micro, Macro, Mega]
  if (flowKey.indexOf("category") !== -1) {
    if (followersCount) {
      var num = Number(String(followersCount).replace(/[^0-9]/g, ""));
      if (num > 0) {
        if (num < 10000) return "Nano";
        if (num < 100000) return "Micro";
        if (num < 1000000) return "Macro";
        return "Mega";
      }
    }
    var lower = s.toLowerCase();
    if (lower === "nano") return "Nano";
    if (lower === "micro") return "Micro";
    if (lower === "macro") return "Macro";
    if (lower === "mega") return "Mega";
  }

  // 8. Gender: [Male, Female, Other]
  if (flowKey === "gender") {
    var lower = s.toLowerCase();
    if (lower === "male" || lower === "m") return "Male";
    if (lower === "female" || lower === "f") return "Female";
    if (lower === "other") return "Other";
  }

  // 9. Profile URL / Instagram Link: auto-format handles without protocol to full clickable URL
  if (flowKey.indexOf("profileurl") !== -1 || flowKey === "url") {
    if (s && !/^https?:\/\//i.test(s)) {
      var h = extractCleanHandleOrUrl(s);
      if (h) return "https://www.instagram.com/" + h;
    }
  }

  return rawVal;
}

/**
 * Pulls all active employee sheets configured in '⚙️ Employee Sheets' tab
 */
function pullAllEmployeeSheetsIntoFlow() {
  var employeeList = getEmployeeSheetsList();
  if (employeeList.length === 0) {
    Logger.log("No valid employee sheet IDs found. Please check '⚙️ Employee Sheets' tab.");
    return { success: false, error: "No valid employee sheet IDs found in registry." };
  }
  return pullEmployeeListIntoFlow(employeeList, "All Employees (" + employeeList.length + ")");
}

/**
 * Lets user select and pull ONLY a single employee's sheet
 */
function pullSingleEmployeeSheetIntoFlow() {
  var ui = SpreadsheetApp.getUi();
  var employeeList = getEmployeeSheetsList();

  if (employeeList.length === 0) {
    Logger.log("No valid employee sheet IDs found in '⚙️ Employee Sheets' tab.");
    return;
  }

  var promptText = "Choose an Employee to pull into 'Flow':\n\n";
  for (var i = 0; i < employeeList.length; i++) {
    promptText += (i + 1) + ". " + employeeList[i].employee + "\n";
  }
  promptText += "\nEnter the Employee Name or Number:";

  var response = ui.prompt("🎯 Pull Single Employee Sheet", promptText, ui.ButtonSet.OK_CANCEL);
  if (response.getSelectedButton() !== ui.Button.OK) return;

  var input = response.getResponseText().trim();
  if (!input) return;

  var selectedEmp = null;
  var num = parseInt(input, 10);
  if (!isNaN(num) && num >= 1 && num <= employeeList.length) {
    selectedEmp = employeeList[num - 1];
  } else {
    for (var j = 0; j < employeeList.length; j++) {
      if (employeeList[j].employee.toLowerCase() === input.toLowerCase()) {
        selectedEmp = employeeList[j];
        break;
      }
    }
  }

  if (!selectedEmp) {
    Logger.log("Employee '" + input + "' not found in registry.");
    return;
  }

  pullEmployeeListIntoFlow([selectedEmp], selectedEmp.employee);
}

/**
 * Finds the first truly empty row in Flow (where Deliverable ID, Campaign ID, and Creator Name are blank).
 * This ensures data writes into empty placeholder rows (like rows 2-16) instead of jumping down to row 100.
 */
function getFirstTrulyEmptyFlowRow(flowSheet, flowColMap) {
  var lastRow = flowSheet.getLastRow();
  if (lastRow < 2) return 2;

  var idCol = flowColMap["deliverableid"] || flowColMap["id"] || 1;
  var campCol = flowColMap["campaignid"] || 2;
  var crCol = flowColMap["creatorname"] || 9;
  var lastCol = flowSheet.getLastColumn();

  var data = flowSheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
  for (var i = 0; i < data.length; i++) {
    var idV = String(data[i][idCol - 1] || "").trim();
    var campV = String(data[i][campCol - 1] || "").trim();
    var crV = String(data[i][crCol - 1] || "").trim();
    if (!idV && !campV && !crV) {
      return i + 2; // Found empty row starting at row 2!
    }
  }
  return lastRow + 1;
}

/**
 * CORE FUNCTION:
 * Pulls given list of employee sheet IDs, maps into 'Flow', updates existing rows, and appends new ones.
 */
function pullEmployeeListIntoFlow(employeeList, scopeLabel) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var flowSheet = ss.getSheetByName(TARGET_FLOW_TAB);

  if (!flowSheet) {
    Logger.log("Could not find tab named '" + TARGET_FLOW_TAB + "' in this spreadsheet.");
    return { success: false, error: "Tab '" + TARGET_FLOW_TAB + "' not found." };
  }

  // 1. Read Flow Headers & Existing Rows
  var flowLastRow = flowSheet.getLastRow();
  var flowLastCol = flowSheet.getLastColumn();
  if (flowLastCol < 1) {
    Logger.log("Flow sheet has no headers in row 1.");
    return { success: false, error: "Flow sheet has no headers in row 1." };
  }

  var flowHeaders = flowSheet.getRange(1, 1, 1, flowLastCol).getValues()[0];
  var flowColMap = {};
  for (var c = 0; c < flowHeaders.length; c++) {
    var hName = String(flowHeaders[c] || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
    if (hName) flowColMap[hName] = c + 1;
  }

  // Build rich multi-key candidate queues of existing rows in Flow to guarantee ZERO duplicate overwrites
  var idCol = flowColMap["deliverableid"] || flowColMap["id"] || 1;
  var campCol = flowColMap["campaignid"];
  var creatorCol = flowColMap["creatorname"];
  var urlCol = flowColMap["url"] || flowColMap["profileurl"] || flowColMap["creatorurl"];
  var briefCol = flowColMap["campaignname"] || flowColMap["campaign"] || flowColMap["briefname"] || flowColMap["brief"];
  var pocCol = flowColMap["xceleratepoc"] || flowColMap["poc"];

  var flowData = [];
  var usedFlowRowIndices = {};

  var flowById = {};          // id -> [r]
  var flowByFullKey = {};     // empPoc + "_" + cId + "_" + crName + "_" + cleanUrl -> [r, ...]
  var flowByCampCrUrl = {};   // cId + "_" + crName + "_" + cleanUrl -> [r, ...]
  var flowByCampCrBrief = {}; // cId + "_" + crName + "_" + cleanBrief -> [r, ...]
  var flowByPocCampCr = {};   // empPoc + "_" + cId + "_" + crName -> [r, ...]
  var flowByCampCr = {};      // cId + "_" + crName -> [r, ...]

  if (flowLastRow >= 2) {
    flowData = flowSheet.getRange(2, 1, flowLastRow - 1, flowLastCol).getValues();
    for (var r = 0; r < flowData.length; r++) {
      var dId = idCol ? String(flowData[r][idCol - 1] || "").trim() : "";
      var cId = campCol ? String(flowData[r][campCol - 1] || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "") : "";
      var crName = creatorCol ? String(flowData[r][creatorCol - 1] || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "") : "";
      var fUrl = urlCol ? extractCleanHandleOrUrl(flowData[r][urlCol - 1]) : "";
      var fBrief = briefCol ? String(flowData[r][briefCol - 1] || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 30) : "";
      var fPoc = pocCol ? String(flowData[r][pocCol - 1] || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "") : "";

      if (dId) {
        if (!flowById[dId]) flowById[dId] = [];
        flowById[dId].push(r);
      }
      if (cId && crName) {
        if (fUrl) {
          if (fPoc) {
            var k1 = fPoc + "_" + cId + "_" + crName + "_" + fUrl;
            if (!flowByFullKey[k1]) flowByFullKey[k1] = [];
            flowByFullKey[k1].push(r);
          }
          var k2 = cId + "_" + crName + "_" + fUrl;
          if (!flowByCampCrUrl[k2]) flowByCampCrUrl[k2] = [];
          flowByCampCrUrl[k2].push(r);
        }
        if (fBrief) {
          var k3 = cId + "_" + crName + "_" + fBrief;
          if (!flowByCampCrBrief[k3]) flowByCampCrBrief[k3] = [];
          flowByCampCrBrief[k3].push(r);
        }
        if (fPoc) {
          var k4 = fPoc + "_" + cId + "_" + crName;
          if (!flowByPocCampCr[k4]) flowByPocCampCr[k4] = [];
          flowByPocCampCr[k4].push(r);
        }
        var k5 = cId + "_" + crName;
        if (!flowByCampCr[k5]) flowByCampCr[k5] = [];
        flowByCampCr[k5].push(r);
      }
    }
  }

  var totalUpdated = 0;
  var totalAppended = 0;
  var newCreatorsList = [];
  var updatedCreatorsList = [];
  var newCreatorsMap = {};
  var updatedCreatorsMap = {};
  var pullErrors = [];
  var usedNewDeliverableIds = {};
  var configSheet = ss.getSheetByName("⚙️ Employee Sheets");
  var nowStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || "Asia/Kolkata", "yyyy-MM-dd HH:mm:ss");

  try { ss.toast("Step 1/4: Analyzing Flow sheet... (15%)", "⚡ Xcelerate Pulse", 3); } catch (_) {}

  // 2. Iterate through each employee sheet
  for (var k = 0; k < employeeList.length; k++) {
    var emp = employeeList[k];
    try {
      ss.toast("Step 2/4: Reading " + emp.employee + " records (" + (k + 1) + "/" + employeeList.length + ")... (45%)", "⚡ Xcelerate Pulse", 4);
    } catch (_) {}
    try {
      var empSS = SpreadsheetApp.openById(emp.sheetId);
      var empSheet = empSS.getSheetByName(emp.tabName);
      if (!empSheet) {
        var allSheets = empSS.getSheets();
        // Priority 1: Match execution / flow / tracker
        for (var s = 0; s < allSheets.length; s++) {
          var sName = allSheets[s].getName().toLowerCase();
          if ((sName.indexOf("execution") !== -1 || sName.indexOf("flow") !== -1 || sName.indexOf("tracker") !== -1) && sName.indexOf("sop") === -1) {
            empSheet = allSheets[s];
            break;
          }
        }
        // Priority 2: Check by inspecting header row of each tab
        if (!empSheet) {
          for (var s = 0; s < allSheets.length; s++) {
            var sh = allSheets[s];
            if (sh.getLastRow() >= 2 && sh.getLastColumn() >= 3) {
              var hRow = sh.getRange(1, 1, 1, Math.min(sh.getLastColumn(), 15)).getValues()[0].join(" ").toLowerCase();
              if (hRow.indexOf("creator") !== -1 || hRow.indexOf("campaign") !== -1 || hRow.indexOf("reel") !== -1) {
                empSheet = sh;
                break;
              }
            }
          }
        }
        if (!empSheet) empSheet = allSheets[0];
      }

      var empLastRow = empSheet.getLastRow();
      var empLastCol = empSheet.getLastColumn();
      if (empLastRow < 2 || empLastCol < 1) {
        pullErrors.push(emp.employee + ": Sheet tab has no data rows (LastRow: " + empLastRow + ").");
        continue;
      }

      var empRange = empSheet.getRange(1, 1, empLastRow, empLastCol);
      var empValues = empRange.getValues();
      var empFormulas = [];
      try { empFormulas = empRange.getFormulas(); } catch (_) {}
      var empRichText = null;
      try { empRichText = empRange.getRichTextValues(); } catch (_) {}
      var empHeaders = empValues[0];

      var empColMap = {};
      var empLinkCols = {};
      for (var ec = 0; ec < empHeaders.length; ec++) {
        var eh = String(empHeaders[ec] || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
        if (eh) empColMap[eh] = ec;
        var rawEh = String(empHeaders[ec] || "").toLowerCase();
        if (rawEh.indexOf("link") !== -1 || rawEh.indexOf("url") !== -1 || rawEh.indexOf("drive") !== -1 || rawEh.indexOf("doc") !== -1) empLinkCols[ec] = true;
      }

      var empImportCount = 0;

      for (var er = 1; er < empValues.length; er++) {
        var rowVals = empValues[er];
        var rowCampId = empColMap["campaignid"] !== undefined ? String(rowVals[empColMap["campaignid"]] || "").trim() : "";
        var creatorIdx = findEmpColumnIndex("creatorname", empColMap);
        var rowCreator = (creatorIdx !== undefined) ? String(rowVals[creatorIdx] || "").trim() : (empColMap["creatorname"] !== undefined ? String(rowVals[empColMap["creatorname"]] || "").trim() : "");
        var rowUniqueId = empColMap["deliverableid"] !== undefined 
          ? String(rowVals[empColMap["deliverableid"]] || "").trim() 
          : (empColMap["uniqueid"] !== undefined ? String(rowVals[empColMap["uniqueid"]] || "").trim() : (empColMap["id"] !== undefined ? String(rowVals[empColMap["id"]] || "").trim() : ""));

        var empUrlIdx = empColMap["url"] !== undefined ? empColMap["url"] : (empColMap["profileurl"] !== undefined ? empColMap["profileurl"] : undefined);
        var rawEmpUrl = (empUrlIdx !== undefined) ? String(rowVals[empUrlIdx] || "").trim() : "";
        var cleanEmpUrl = extractCleanHandleOrUrl(rawEmpUrl);

        if (!rowCreator) {
          if (cleanEmpUrl) {
            rowCreator = cleanEmpUrl;
          } else if (rowUniqueId) {
            rowCreator = "Creator (" + rowUniqueId.slice(0, 8) + ")";
          }
        }

        // Extract raw "Brief Name" from employee sheet exactly as written
        var rowBrief = "";
        if (empColMap["briefname"] !== undefined) {
          rowBrief = String(rowVals[empColMap["briefname"]] || "").trim();
        } else if (empColMap["brief"] !== undefined) {
          rowBrief = String(rowVals[empColMap["brief"]] || "").trim();
        } else if (empColMap["campaignbrief"] !== undefined) {
          rowBrief = String(rowVals[empColMap["campaignbrief"]] || "").trim();
        } else if (empColMap["campaignname"] !== undefined) {
          rowBrief = String(rowVals[empColMap["campaignname"]] || "").trim();
        } else {
          for (var bk in empColMap) {
            if (bk.indexOf("brief") !== -1) {
              rowBrief = String(rowVals[empColMap[bk]] || "").trim();
              break;
            }
          }
        }

        // Skip completely empty rows
        if (!rowCampId && !rowCreator && !rowBrief && !cleanEmpUrl) continue;

        if (!rowCreator) {
          rowCreator = "Creator (Row " + (er + 1) + ")";
        }

        var rowOwner = empColMap["executionowner"] !== undefined ? String(rowVals[empColMap["executionowner"]] || "").trim() : "";
        var cleanCamp = rowCampId.toLowerCase().replace(/[^a-z0-9]/g, "");
        var cleanCr = rowCreator.toLowerCase().replace(/[^a-z0-9]/g, "");
        var cleanBrief = rowBrief.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 30);
        var cleanEmp = (rowOwner || emp.employee).toLowerCase().replace(/[^a-z0-9]/g, "");

        var existingRowIdx = undefined;

        function pickAvailableRow(arr) {
          if (!arr || arr.length === 0) return undefined;
          for (var a = 0; a < arr.length; a++) {
            var cand = arr[a];
            if (!usedFlowRowIndices[cand]) return cand;
          }
          return undefined;
        }

        // Priority 1: Match by explicit Deliverable ID / Unique ID
        if (rowUniqueId && flowById[rowUniqueId]) {
          existingRowIdx = pickAvailableRow(flowById[rowUniqueId]);
        }

        // Priority 2: Match by Employee + Campaign + Creator + Clean URL
        if (existingRowIdx === undefined && cleanEmp && cleanCamp && cleanCr && cleanEmpUrl) {
          existingRowIdx = pickAvailableRow(flowByFullKey[cleanEmp + "_" + cleanCamp + "_" + cleanCr + "_" + cleanEmpUrl]);
        }

        // Priority 3: Match by Campaign + Creator + Clean URL
        if (existingRowIdx === undefined && cleanCamp && cleanCr && cleanEmpUrl) {
          existingRowIdx = pickAvailableRow(flowByCampCrUrl[cleanCamp + "_" + cleanCr + "_" + cleanEmpUrl]);
        }

        // Priority 4: Match by Campaign + Creator + Brief
        if (existingRowIdx === undefined && cleanCamp && cleanCr && cleanBrief) {
          existingRowIdx = pickAvailableRow(flowByCampCrBrief[cleanCamp + "_" + cleanCr + "_" + cleanBrief]);
        }

        // Priority 5: Match by Employee + Campaign + Creator
        if (existingRowIdx === undefined && cleanEmp && cleanCamp && cleanCr) {
          existingRowIdx = pickAvailableRow(flowByPocCampCr[cleanEmp + "_" + cleanCamp + "_" + cleanCr]);
        }

        // Priority 6: Match by Campaign + Creator (first unused occurrence)
        if (existingRowIdx === undefined && cleanCamp && cleanCr) {
          existingRowIdx = pickAvailableRow(flowByCampCr[cleanCamp + "_" + cleanCr]);
        }

        // Mark consumed immediately so NO OTHER ROW can match this Flow row!
        if (existingRowIdx !== undefined) {
          usedFlowRowIndices[existingRowIdx] = true;
        }

        // Preserve existing Deliverable ID in Flow, or generate unique UUID
        var deliverableId = "";
        if (existingRowIdx !== undefined && idCol && flowData[existingRowIdx][idCol - 1]) {
          deliverableId = String(flowData[existingRowIdx][idCol - 1]).trim();
        } else if (rowUniqueId && rowUniqueId !== "#ERROR!" && (!flowById[rowUniqueId] || flowById[rowUniqueId].length === 0) && !usedNewDeliverableIds[rowUniqueId]) {
          deliverableId = rowUniqueId;
          usedNewDeliverableIds[rowUniqueId] = true;
        } else {
          deliverableId = Utilities.getUuid();
          usedNewDeliverableIds[deliverableId] = true;
        }

        // If existing row, preserve existing row values first so columns like Views, Likes, manual Brand/Agency Name aren't erased
        var targetRowArray;
        if (existingRowIdx !== undefined) {
          targetRowArray = flowData[existingRowIdx].slice();
        } else {
          targetRowArray = new Array(flowLastCol).fill("");
        }

        // Populate Deliverable ID
        if (idCol) targetRowArray[idCol - 1] = deliverableId;

        // NOTE: "Brand/Agency Name" (Column E in Flow) is NOT populated by system.
        // It is left blank for manual input after asking the POC.
        // If this is an existing row where the user previously filled Brand/Agency Name,
        // it is preserved as-is from currentRowData.

        // Put "Brief Name" from employee sheet directly into Flow's "Campaign Name" column (as-is, exact text)
        var campaignNameCol = flowColMap["campaignname"] || flowColMap["campaign"];
        if (campaignNameCol && rowBrief) {
          targetRowArray[campaignNameCol - 1] = rowBrief;
        }

        // Map Execution Owner to Xcelerate POC
        var pocCol = flowColMap["xceleratepoc"];
        if (pocCol) {
          var ownerVal = empColMap["executionowner"] !== undefined ? rowVals[empColMap["executionowner"]] : "";
          targetRowArray[pocCol - 1] = ownerVal || emp.employee;
        }

        // Map Brand/Agency POC dynamically (searches Flow headers and Employee headers by name, zero column position dependency)
        var brandPocCol = flowColMap["brandagencypoc"] || flowColMap["brandpoc"] || flowColMap["agencypoc"] || flowColMap["clientpoc"];
        if (!brandPocCol) {
          for (var fk in flowColMap) {
            if (fk.indexOf("xcelerate") === -1 && (fk.indexOf("brand") !== -1 || fk.indexOf("agency") !== -1 || fk.indexOf("client") !== -1) && fk.indexOf("poc") !== -1) {
              brandPocCol = flowColMap[fk];
              break;
            }
          }
        }
        if (brandPocCol) {
          var empBrandPocIdx = findEmpColumnIndex("brandagencypoc", empColMap);
          if (empBrandPocIdx !== undefined) {
            var brandPocVal = String(rowVals[empBrandPocIdx] || "").trim();
            if (existingRowIdx === undefined || brandPocVal !== "") {
              targetRowArray[brandPocCol - 1] = brandPocVal;
            }
          }
        }

        // Get followers count for category derivation
        var followersColIdx = empColMap["followerscount"];
        var followersVal = followersColIdx !== undefined ? rowVals[followersColIdx] : "";

        // Map all other matching headers with intelligent normalization
        for (var fKey in flowColMap) {
          if (fKey === "deliverableid" || fKey === "id" || fKey === "brandagencyname" || fKey === "brandname" || fKey === "brand" || fKey === "campaignname" || fKey === "campaign" || fKey === "xceleratepoc" || fKey === "brandagencypoc") continue;

          var fColIdx = flowColMap[fKey];
          var eIdx = findEmpColumnIndex(fKey, empColMap);

          if (eIdx !== undefined) {
            var val = rowVals[eIdx];
            if (empLinkCols[eIdx]) {
              val = resolveHyperlink(val, empRichText[er][eIdx], empFormulas[er][eIdx]);
            }
            // Normalize dropdown/validation fields so they never trigger Google Sheets Data Validation errors
            val = normalizeFlowValue(fKey, val, followersVal);

            // Only update if employee sheet provided a value, or if this is a new row
            if (existingRowIdx === undefined || (val !== "" && val !== null && val !== undefined)) {
              targetRowArray[fColIdx - 1] = val;
            }
          }
        }

        // Compute Gross Margin if Brand Cost and Creator Cost exist, but Gross Margin is empty
        var bcIdx = flowColMap["brandcost"];
        var ccIdx = flowColMap["creatorcost"] || flowColMap["creatorcosthidefrombrandagency"];
        var gmIdx = flowColMap["grossmargin"] || flowColMap["grossmarginhidefrombrandagency"];
        if (bcIdx && ccIdx && gmIdx) {
          var bCostNum = Number(String(targetRowArray[bcIdx - 1] || "").replace(/[^0-9.-]/g, "")) || 0;
          var cCostNum = Number(String(targetRowArray[ccIdx - 1] || "").replace(/[^0-9.-]/g, "")) || 0;
          var gmCurrent = targetRowArray[gmIdx - 1];
          if (bCostNum > 0 && cCostNum > 0 && (!gmCurrent || gmCurrent === 0 || gmCurrent === "")) {
            targetRowArray[gmIdx - 1] = bCostNum - cCostNum;
          }
        }

        if (existingRowIdx !== undefined) {
          // Instant in-memory update! (Zero network roundtrip)
          flowData[existingRowIdx] = targetRowArray;
          totalUpdated++;
          if (rowCreator && !updatedCreatorsMap[rowCreator.toLowerCase()]) {
            updatedCreatorsMap[rowCreator.toLowerCase()] = true;
            updatedCreatorsList.push(rowCreator);
          }
        } else {
          // Instant in-memory append of new creator deliverable! (Zero network roundtrip)
          var newIdx = flowData.length;
          flowData.push(targetRowArray);
          usedFlowRowIndices[newIdx] = true; // Mark newly added row as consumed
          totalAppended++;
          if (rowCreator && !newCreatorsMap[rowCreator.toLowerCase()]) {
            newCreatorsMap[rowCreator.toLowerCase()] = true;
            newCreatorsList.push(rowCreator);
          }
        }

        empImportCount++;
      }

      // Update registry log
      if (configSheet && emp.configRow) {
        configSheet.getRange(emp.configRow, 5).setValue(nowStr);
        configSheet.getRange(emp.configRow, 6).setValue(empImportCount);
      }

    } catch (err) {
      var errDetail = emp.employee + " (" + emp.sheetId + "): " + err.toString();
      Logger.log("Error pulling from " + errDetail);
      pullErrors.push(errDetail);
    }
  }

  // 3. Auto-Create Drive Folders & Script Docs for newly added creators ONLY
  var driveAssetsCreated = 0;
  if (totalAppended > 0) {
    try {
      ss.toast("Step 3/4: Creating Drive folders for " + totalAppended + " new creator(s)...", "⚡ Xcelerate Pulse", 4);
      var appendedStartIndex = flowData.length - totalAppended;
      var appendedIndices = [];
      for (var a = appendedStartIndex; a < flowData.length; a++) {
        appendedIndices.push(a);
      }
      var driveRes = autoCreateDriveAssetsForRows(flowSheet, flowColMap, flowData, {
        maxRows: 15,
        maxDurationMs: 45000,
        writeDirectlyToSheet: false, // will be written in step 4 batch write!
        onlyIndices: appendedIndices
      });
      if (driveRes && driveRes.createdCount > 0) {
        driveAssetsCreated = driveRes.createdCount;
      }
    } catch (driveErr) {
      Logger.log("Notice: Drive assets generation skipped or error: " + driveErr.toString());
    }
  }

  // 4. Write ALL updated & appended rows to Flow in ONE single batch write!
  // CRITICAL: Acquire batch write lock BEFORE writing so onEdit triggers are suppressed
  setBatchWriteLock(true);
  try {
    if (flowData.length > 0) {
      var requiredMaxRows = flowData.length + 1; // +1 for header row
      var currentMaxRows = flowSheet.getMaxRows();
      if (requiredMaxRows > currentMaxRows) {
        flowSheet.insertRowsAfter(currentMaxRows, (requiredMaxRows - currentMaxRows) + 30);
      }

      try { ss.toast("Step 4/4: Batch-writing " + flowData.length + " rows to Flow tab...", "⚡ Xcelerate Pulse", 3); } catch (_) {}
      safeSetRange(flowSheet.getRange(2, 1, flowData.length, flowLastCol), flowData);
    }

    SpreadsheetApp.flush();
  } finally {
    // ALWAYS release batch write lock, even if write fails
    setBatchWriteLock(false);
  }

  // 5. Automatically push any newly created Drive links back to employee sheets
  if (driveAssetsCreated > 0) {
    try {
      syncDriveLinksToEmployeeSheets({ isSilent: true });
    } catch (pushErr) {
      Logger.log("Notice: Auto-pushing drive links to employee sheets skipped: " + pushErr.toString());
    }
  }

  // NOTE: We intentionally do NOT auto-push to database here.
  // The database sync is handled separately by the platform when triggered by the admin.
  // This prevents the triple-write problem (pull → auto-sync → webhook) that was causing:
  //   1. Extremely slow sync times (3+ minutes for 423 records)
  //   2. Wrong "0 new creators" count (because re-syncing ALL rows overwrote the stats)
  //   3. Unwanted Turso writes during employee data fetch

  if (pullErrors.length > 0) {
    Logger.log("Notice While Pulling Employee Sheets: " + pullErrors.join("; "));
  }

  var newCreatorsSummary = "";
  if (newCreatorsList.length > 0) {
    var displayList = newCreatorsList.slice(0, 10);
    newCreatorsSummary = "\n✨ " + newCreatorsList.length + " New Creator(s) Added:\n• " + displayList.join("\n• ");
    if (newCreatorsList.length > 10) {
      newCreatorsSummary += "\n• ...and " + (newCreatorsList.length - 10) + " more";
    }
  } else {
    newCreatorsSummary = "\n✓ All " + totalUpdated + " records updated in-place (No new creators added).";
  }

  var summaryMsg = "✅ Flow Sheet Updated!\n\n" +
    "• Rows Updated: " + totalUpdated + "\n" +
    "• New Rows / Creators Added: " + totalAppended + "\n" +
    (driveAssetsCreated > 0 ? ("• Drive Folders & Script Docs Created: " + driveAssetsCreated + "\n") : "") +
    "• Total Deliverables Processed: " + (totalUpdated + totalAppended) + "\n" +
    newCreatorsSummary;

  Logger.log(summaryMsg);

  return {
    success: true,
    totalUpdated: totalUpdated,
    totalAppended: totalAppended,
    totalProcessed: totalUpdated + totalAppended,
    newCreators: newCreatorsList,
    updatedCreators: updatedCreatorsList,
    errors: pullErrors
  };
}

/**
 * Pushes entire 'Flow' sheet to Xcelerate Pulse Brand Portal
 */
function syncFlowSheetToPlatform(isSilent) {
  return syncFlowSheetWithFilter(null, "Entire Flow Sheet", isSilent);
}

/**
 * Pushes only creators matching a specific campaign month (e.g. 'Sep 2026')
 */
function syncFlowSheetByMonth() {
  var ui = SpreadsheetApp.getUi();
  var response = ui.prompt(
    "📅 Sync By Campaign Month", 
    "Enter the Campaign Month to sync (e.g. 'Sep 2026', 'Apr 2026'):", 
    ui.ButtonSet.OK_CANCEL
  );
  if (response.getSelectedButton() !== ui.Button.OK) return;

  var targetMonth = response.getResponseText().trim().toLowerCase();
  if (!targetMonth) return;

  syncFlowSheetWithFilter(function(rowObj) {
    var monthVal = String(rowObj["Campaign Month"] || rowObj["campaign_month"] || "").trim().toLowerCase();
    return monthVal.indexOf(targetMonth) !== -1;
  }, "Month: " + response.getResponseText().trim(), false);
}

/**
 * Pushes only creators matching a specific Campaign ID or Name (e.g. 'XM09019')
 */
function syncFlowSheetByCampaign() {
  var ui = SpreadsheetApp.getUi();
  var response = ui.prompt(
    "🏢 Sync By Campaign", 
    "Enter Campaign ID or Campaign Name to sync (e.g. 'XM09019', 'PLA Bioyug', 'Adani'):", 
    ui.ButtonSet.OK_CANCEL
  );
  if (response.getSelectedButton() !== ui.Button.OK) return;

  var targetQuery = response.getResponseText().trim().toLowerCase();
  if (!targetQuery) return;

  syncFlowSheetWithFilter(function(rowObj) {
    var cId = String(rowObj["Campaign ID"] || rowObj["campaign_id"] || "").trim().toLowerCase();
    var cName = String(rowObj["Campaign Name"] || rowObj["campaign_name"] || rowObj["Brief Name"] || "").trim().toLowerCase();
    return cId.indexOf(targetQuery) !== -1 || cName.indexOf(targetQuery) !== -1;
  }, "Campaign: " + response.getResponseText().trim(), false);
}

/**
 * Core filtered push to platform
 */
function syncFlowSheetWithFilter(filterFn, scopeLabel, isSilent, skipWebhook) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var flowSheet = ss.getSheetByName(TARGET_FLOW_TAB);
  if (!flowSheet) return;

  var lastRow = flowSheet.getLastRow();
  var lastCol = flowSheet.getLastColumn();
  if (lastRow < 2) return;

  var range = flowSheet.getRange(1, 1, lastRow, lastCol);
  var values = range.getValues();
  var headers = values[0];

  var linkCols = {};
  for (var c = 0; c < headers.length; c++) {
    var h = String(headers[c] || "").toLowerCase();
    if (h.indexOf("link") !== -1 || h.indexOf("url") !== -1 || h.indexOf("drive") !== -1 || h.indexOf("doc") !== -1) linkCols[c] = true;
  }

  var rows = [];
  var skippedDetails = [];
  var seenDelivIds = {};
  for (var r = 1; r < values.length; r++) {
    var rowObj = {};
    var hasContent = false;
    var cName = "";
    var cmpId = "";
    var delivId = "";
    var creatorUrl = "";

    for (var c = 0; c < headers.length; c++) {
      var hName = String(headers[c] || "").trim();
      var cellVal = values[r][c];
      var cleanH = hName.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (cleanH === "deliverableid" || cleanH === "id" || cleanH === "uniqueid" || cleanH === "uid") {
        delivId = String(cellVal || "").trim();
      }
      if (cleanH === "creatorname" || cleanH === "creator" || cleanH === "influencername" || cleanH === "handle") {
        cName = String(cellVal || "").trim();
      }
      if (cleanH === "campaignid") {
        cmpId = String(cellVal || "").trim();
      }
      if (cleanH === "url" || cleanH === "profileurl") {
        creatorUrl = String(cellVal || "").trim();
      }

      if (linkCols[c]) {
        cellVal = String(cellVal || "").trim();
      } else {
        cellVal = formatDateOnlyForSync(cellVal);
      }
      if (cellVal !== "" && cellVal !== null && cellVal !== undefined) {
        hasContent = true;
      }
      rowObj[hName] = cellVal;
    }

    var sheetRowNum = r + 1;
    // Skip ONLY if the entire row has literally no data and no Deliverable ID
    if (!hasContent && !delivId) {
      skippedDetails.push("Row " + sheetRowNum + ": Blank/Empty row");
      continue;
    }

    // Auto-rescue missing Creator Name using Instagram/YouTube handle or Deliverable ID (guarantees zero data loss)
    if (!cName) {
      var extractedHandle = "";
      if (creatorUrl) {
        var match = creatorUrl.match(/(?:instagram\.com\/|youtube\.com\/@?|tiktok\.com\/@?)([a-zA-Z0-9._]+)/);
        if (match && match[1]) {
          extractedHandle = match[1].replace(/[^a-zA-Z0-9._]/g, "");
        }
      }
      cName = extractedHandle || (delivId ? ("Creator (" + delivId.slice(0, 8) + ")") : ("Creator Row " + sheetRowNum));
      rowObj["Creator Name"] = cName;
    }

    // Auto-rescue missing Campaign ID
    if (!cmpId) {
      var campName = String(rowObj["Campaign Name"] || rowObj["Brief Name"] || "").trim();
      cmpId = campName ? ("CAMP-" + campName.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10)) : "CAMP-GENERAL";
      rowObj["Campaign ID"] = cmpId;
    }

    // Ensure Deliverable ID is attached
    if (!delivId) {
      delivId = cmpId + "_" + cName.toLowerCase().replace(/[^a-z0-9]/g, "") + "_d" + sheetRowNum;
      rowObj["Deliverable ID"] = delivId;
    } else if (seenDelivIds[delivId]) {
      // Disambiguate duplicate ID in sheet
      delivId = delivId + "_r" + sheetRowNum;
      rowObj["Deliverable ID"] = delivId;
    } else {
      seenDelivIds[delivId] = true;
    }

    if (filterFn && !filterFn(rowObj)) {
      continue;
    }
    rowObj["_sheet_row"] = sheetRowNum;
    rowObj["_sheet_name"] = flowSheet.getName();
    rowObj["_spreadsheet_title"] = ss.getName();
    rows.push(rowObj);
  }

  if (rows.length === 0) {
    if (!isSilent) {
      Logger.log("No rows matched filter: " + (scopeLabel || "All"));
    }
    return { success: true, totalProcessed: 0, rowsCount: 0, rows: [], skippedDetails: skippedDetails };
  }

  // If read-only mode, return extracted rows directly WITHOUT sending HTTP webhook or modifying Turso
  if (skipWebhook) {
    return {
      success: true,
      totalProcessed: rows.length,
      rowsCount: rows.length,
      rows: rows,
      webhookDelivered: false,
      skippedDetails: skippedDetails
    };
  }

  var chunkSize = 500;
  var webhookSuccessCount = 0;
  var webhookErrors = [];
  for (var i = 0; i < rows.length; i += chunkSize) {
    var pushRes = postToXceleratePulse(rows.slice(i, i + chunkSize));
    if (pushRes && pushRes.success) {
      webhookSuccessCount += rows.slice(i, i + chunkSize).length;
    } else {
      var errDetail = pushRes ? (pushRes.error || "Unknown HTTP error") : "Network unreachable";
      webhookErrors.push(errDetail);
      Logger.log("Webhook error for chunk " + i + ": " + errDetail);
    }
  }

  if (!isSilent) {
    var ui = SpreadsheetApp.getUi();
    if (webhookErrors.length > 0) {
      ui.alert(
        "⚠️ Sync Webhook Notice",
        "Extracted " + rows.length + " creator rows from Flow sheet, but pushing to platform webhook encountered an error:\n\n" +
        webhookErrors.slice(0, 2).join("\n") +
        "\n\nIf testing locally, ensure your Cloudflare Tunnel is running and WEBHOOK_URL is updated.",
        ui.ButtonSet.OK
      );
    } else {
      var alertText = "Successfully synchronized " + rows.length + " creator deliverables to Database!";
      if (skippedDetails.length > 0) {
        alertText += "\n\nℹ️ Notice: " + skippedDetails.length + " rows in sheet were skipped:\n" +
          skippedDetails.slice(0, 6).join("\n");
        if (skippedDetails.length > 6) {
          alertText += "\n...and " + (skippedDetails.length - 6) + " more.";
        }
      }
      ui.alert("✅ Sync Completed", alertText, ui.ButtonSet.OK);
    }
  }

  return {
    success: true,
    totalProcessed: rows.length,
    rowsCount: rows.length,
    rows: rows,
    skippedDetails: skippedDetails,
    webhookDelivered: webhookErrors.length === 0,
    webhookErrors: webhookErrors
  };
}

function syncFlowRowByIndex(sheet, rowIndex) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var lastCol = sheet.getLastColumn();
  if (lastCol < 1) return;

  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var range = sheet.getRange(rowIndex, 1, 1, lastCol);
  var vals = range.getValues()[0];
  var richText = range.getRichTextValues()[0];
  var formulas = range.getFormulas()[0];

  var rowObj = {};
  for (var c = 0; c < headers.length; c++) {
    var hName = String(headers[c] || "").trim();
    var val = vals[c];
    var h = hName.toLowerCase();
    if (h.indexOf("link") !== -1 || h.indexOf("url") !== -1 || h.indexOf("drive") !== -1 || h.indexOf("doc") !== -1) {
      val = resolveHyperlink(val, richText[c], formulas[c]);
    } else {
      val = formatDateOnlyForSync(val);
    }
    rowObj[hName] = val;
  }
  rowObj["_sheet_row"] = rowIndex;
  rowObj["_sheet_name"] = sheet.getName();
  rowObj["_spreadsheet_title"] = ss.getName();

  postToXceleratePulse([rowObj]);
}

/**
 * Strips all time components from dates, ensuring only YYYY-MM-DD is sent to the platform.
 * NEVER alters or truncates URLs of any kind (Docs, PDFs, Drive links, Instagram, YouTube).
 */
function formatDateOnlyForSync(val) {
  if (val === null || val === undefined) return "";
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return "";
    var yyyy = val.getFullYear();
    var mm = ("0" + (val.getMonth() + 1)).slice(-2);
    var dd = ("0" + val.getDate()).slice(-2);
    return yyyy + "-" + mm + "-" + dd;
  }
  var s = String(val).trim();
  if (!s) return "";
  // Never touch URLs
  if (/^(https?:\/\/|www\.|\/\/|drive\.google\.com|docs\.google\.com)/i.test(s) || (s.indexOf("/") !== -1 && s.indexOf(".") !== -1 && s.indexOf("http") !== -1)) {
    return s;
  }
  // Strictly match true ISO-8601 timestamps like "2026-09-26T18:30:00"
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s)) {
    return s.split("T")[0].trim();
  }
  // Standard SQL/space timestamp like "2026-09-26 18:30:00"
  if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}/.test(s)) {
    return s.split(/\s+/)[0].trim();
  }
  return val;
}

function postToXceleratePulse(payload, overrideUrl) {
  var targetUrl = getEffectiveWebhookUrl(overrideUrl);
  try {
    var options = {
      method: "post",
      contentType: "application/json",
      headers: {
        "x-api-key": API_KEY,
        "bypass-tunnel-reminder": "true"
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };
    var res = UrlFetchApp.fetch(targetUrl, options);
    var code = res.getResponseCode();
    var responseText = res.getContentText();
    return (code >= 200 && code < 300)
      ? { success: true, data: responseText, statusCode: code }
      : { success: false, error: "HTTP " + code + ": " + responseText, statusCode: code };
  } catch (err) {
    return { success: false, error: err.toString() };
  }
}

function testPlatformConnection(silent, overrideUrl) {
  var targetUrl = getEffectiveWebhookUrl(overrideUrl);
  try {
    var res = UrlFetchApp.fetch(targetUrl, {
      method: "get",
      headers: { 
        "bypass-tunnel-reminder": "true",
        "User-Agent": "Google-Apps-Script"
      },
      muteHttpExceptions: true
    });
    var code = res.getResponseCode();
    var ok = (code === 200 || code === 408);
    if (!silent) {
      Logger.log("Platform connection status: HTTP " + code);
    }
    return { success: ok, statusCode: code, message: "Platform webhook HTTP " + code, url: targetUrl };
  } catch (err) {
    if (!silent) {
      Logger.log("Connection Failed: " + err.toString());
    }
    return { success: false, error: err.toString(), url: targetUrl };
  }
}

function installRealtimeSyncTrigger(silent) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === "handleInstalledOnEdit") {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }

  ScriptApp.newTrigger("handleInstalledOnEdit")
    .forSpreadsheet(ss)
    .onEdit()
    .create();

  if (!silent) {
    Logger.log("Instant Real-Time Sync on Edit trigger activated.");
  }
}

function installAutoPullTrigger(silent) {
  removeAutoPullTrigger(true);
  ScriptApp.newTrigger("pullAllEmployeeSheetsIntoFlow")
    .timeBased()
    .everyMinutes(30)
    .create();

  if (!silent) {
    Logger.log("Auto-Pull (30 Mins) scheduled successfully.");
  }
}

function removeAutoPullTrigger(silent) {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === "pullAllEmployeeSheetsIntoFlow") {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  if (!silent) {
    Logger.log("Auto-Pull Deactivated.");
  }
}

function removeAllAutomationTriggers(silent) {
  var triggers = ScriptApp.getProjectTriggers();
  var count = 0;
  for (var i = 0; i < triggers.length; i++) {
    var fn = triggers[i].getHandlerFunction();
    if (fn === "pullAllEmployeeSheetsIntoFlow" || fn === "handleInstalledOnEdit") {
      ScriptApp.deleteTrigger(triggers[i]);
      count++;
    }
  }
  if (!silent) {
    Logger.log("Background Automation Cleared (" + count + " triggers removed).");
  }
  return count;
}

/**
 * ============================================================================
 * WEB APP API ENDPOINTS (For Remote Admin Control From Website)
 * Deploy as Web App ("Execute as Me", "Who has access: Anyone")
 * Allows Xcelerate Pulse Admin Website to trigger granular pulls & syncs directly!
 * ============================================================================
 */
function doGet(e) {
  return handleRemoteApiRequest(e);
}

function doPost(e) {
  return handleRemoteApiRequest(e);
}

function handleRemoteApiRequest(e) {
  var output = { success: false };
  try {
    var p = (e && e.parameter) ? e.parameter : {};
    var body = {};
    if (e && e.postData && e.postData.contents) {
      try {
        body = JSON.parse(e.postData.contents);
      } catch (parseErr) {}
    }
    var action = (body.action || p.action || "test").toLowerCase();

    // Handle dynamic webhook URL registration
    var reqWebhookUrl = p.webhookUrl || p.webhook_url || body.webhookUrl || body.webhook_url;
    if (reqWebhookUrl && String(reqWebhookUrl).indexOf("http") === 0) {
      try {
        PropertiesService.getScriptProperties().setProperty("WEBHOOK_URL", String(reqWebhookUrl).trim());
      } catch (propErr) {}
    }

    if (action === "test") {
      output = {
        status: "online",
        message: "Xcelerate Pulse Google Apps Script Web App Online",
        spreadsheetName: SpreadsheetApp.getActiveSpreadsheet().getName(),
        webhookUrl: getEffectiveWebhookUrl(),
        timestamp: new Date().toISOString()
      };
    } else if (action === "upload_screenshot" || action === "upload_proof") {
      var folderId = (body.folderId || p.folderId || DEFAULT_PROOF_FOLDER_ID || "").trim();
      var base64Data = body.base64Data || p.base64Data;
      var filename = body.filename || p.filename || ("screenshot_" + new Date().getTime() + ".png");
      var mimeType = body.mimeType || p.mimeType || "image/png";

      if (!base64Data) {
        output = { success: false, error: "Missing base64Data in upload request." };
      } else {
        var folder;
        if (folderId) {
          try {
            folder = DriveApp.getFolderById(folderId);
          } catch (fErr) {
            folder = DriveApp.getRootFolder();
          }
        } else {
          folder = DriveApp.getRootFolder();
        }

        var decoded = Utilities.base64Decode(base64Data);
        var blob = Utilities.newBlob(decoded, mimeType, filename);
        var file = folder.createFile(blob);

        // Make file viewable by anyone with the link
        try {
          file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        } catch (shareErr) {}

        var fileId = file.getId();
        var driveUrl = file.getUrl();
        var thumbnailUrl = "https://drive.google.com/thumbnail?id=" + fileId + "&sz=w1600";

        output = {
          success: true,
          fileId: fileId,
          url: driveUrl,
          thumbnailUrl: thumbnailUrl,
          filename: filename,
          folderName: folder.getName(),
          message: "Screenshot successfully saved into Google Drive!"
        };
      }
    } else if (action === "pull_all") {
      var pullRes = pullAllEmployeeSheetsIntoFlow();
      var uCount = pullRes ? (pullRes.totalUpdated || 0) : 0;
      var aCount = pullRes ? (pullRes.totalAppended || 0) : 0;
      var pCount = pullRes ? (pullRes.totalProcessed || (uCount + aCount)) : (uCount + aCount);
      var nList = (pullRes && pullRes.newCreators) ? pullRes.newCreators : [];
      var uList = (pullRes && pullRes.updatedCreators) ? pullRes.updatedCreators : [];

      var customMsg = "Pulled all employee sheets into Flow: " + uCount + " rows updated, " + aCount + " new rows added.";
      if (nList.length > 0) {
        customMsg += " (" + nList.length + " new creators: " + nList.slice(0, 5).join(", ") + (nList.length > 5 ? "..." : "") + ")";
      }

      // DO NOT re-sync entire Flow sheet to DB here! That was the root cause of:
      //  1. Slow sync (triple write: pull → sync flow → webhook)
      //  2. Wrong "0 new creators" (all IDs already existed from auto-sync)
      // The admin can separately trigger "Sync to Database" when ready.

      output = {
        success: pullRes ? pullRes.success !== false : true,
        action: "pull_all",
        totalUpdated: uCount,
        totalAppended: aCount,
        totalProcessed: pCount,
        newCreators: nList,
        updatedCreators: uList,
        message: customMsg
      };
    } else if (action === "pull_employee") {
      var empName = String(p.employee || "").trim();
      var empList = getEmployeeSheetsList();
      var targetEmp = null;
      for (var i = 0; i < empList.length; i++) {
        if (empList[i].employee.toLowerCase() === empName.toLowerCase()) {
          targetEmp = empList[i];
          break;
        }
      }
      if (!targetEmp) {
        output = { success: false, error: "Employee '" + empName + "' not found in registry." };
      } else {
        var pullSingleRes = pullEmployeeListIntoFlow([targetEmp], targetEmp.employee);
        var uCount = pullSingleRes ? (pullSingleRes.totalUpdated || 0) : 0;
        var aCount = pullSingleRes ? (pullSingleRes.totalAppended || 0) : 0;
        var pCount = pullSingleRes ? (pullSingleRes.totalProcessed || (uCount + aCount)) : (uCount + aCount);
        var nList = (pullSingleRes && pullSingleRes.newCreators) ? pullSingleRes.newCreators : [];
        var uList = (pullSingleRes && pullSingleRes.updatedCreators) ? pullSingleRes.updatedCreators : [];

        var customMsg = "Pulled employee '" + targetEmp.employee + "' into Flow: " + uCount + " rows updated, " + aCount + " new rows added.";
        if (nList.length > 0) {
          customMsg += " (" + nList.length + " new creators: " + nList.slice(0, 5).join(", ") + (nList.length > 5 ? "..." : "") + ")";
        }

        // DO NOT re-sync entire Flow sheet to DB here!
        // Only pull into Flow sheet. Database sync is a separate explicit action.

        output = {
          success: pullSingleRes ? pullSingleRes.success !== false : true,
          action: "pull_employee",
          employee: targetEmp.employee,
          totalUpdated: uCount,
          totalAppended: aCount,
          totalProcessed: pCount,
          newCreators: nList,
          updatedCreators: uList,
          message: customMsg
        };
      }
    } else if (action === "sync_all") {
      var syncRes = syncFlowSheetToPlatform(true);
      var recCount = syncRes ? (syncRes.totalProcessed || 0) : 0;
      output = {
        success: true,
        action: "sync_all",
        totalProcessed: recCount,
        totalUpdated: recCount,
        totalAppended: 0,
        rows: syncRes ? (syncRes.rows || []) : [],
        webhookDelivered: syncRes ? syncRes.webhookDelivered : false,
        message: "Extracted and synchronized " + recCount + " deliverables from Flow sheet."
      };
    } else if (action === "create_drive_assets" || action === "generate_drive_folders") {
      var autoPush = (body.autoPushToEmployees !== false && p.autoPushToEmployees !== "false");
      var batchRes = menuAutoCreateDriveAssetsForFlow(true);
      var cCount = batchRes ? (batchRes.createdCount || 0) : 0;
      var rCount = batchRes ? (batchRes.remainingCount || 0) : 0;
      var empPushResult = null;
      if (cCount > 0 && autoPush) {
        try {
          empPushResult = syncDriveLinksToEmployeeSheets({ isSilent: true });
        } catch (_) {}
      }
      output = {
        success: true,
        action: "create_drive_assets",
        createdCount: cCount,
        remainingCount: rCount,
        totalProcessed: cCount,
        empSync: empPushResult,
        message: "Created & verified Drive assets for " + cCount + " creator(s)!" + 
                 (empPushResult && empPushResult.totalCellsUpdated > 0 ? " Also populated " + empPushResult.totalCellsUpdated + " link(s) into Employee Execution Sheet(s)!" : "") +
                 (rCount > 0 ? " (" + rCount + " creators still pending links)." : " (All creators in Flow are now fully linked!)")
      };
    } else if (action === "push_drive_links" || action === "sync_drive_links" || action === "push_links_to_employees") {
      var targetEmp = String(body.employee || p.employee || "").trim();
      var pushRes = syncDriveLinksToEmployeeSheets({
        isSilent: true,
        targetEmployeeNames: (targetEmp && targetEmp !== "ALL") ? [targetEmp] : null
      });
      output = {
        success: pushRes.success !== false,
        action: "push_drive_links",
        employee: targetEmp || "ALL",
        totalRowsUpdated: pushRes.totalRowsUpdated || 0,
        totalCellsUpdated: pushRes.totalCellsUpdated || 0,
        sheetsUpdatedCount: pushRes.sheetsUpdatedCount || 0,
        summaryDetails: pushRes.summaryDetails || [],
        totalProcessed: pushRes.totalRowsUpdated || 0,
        message: "Successfully populated " + (pushRes.totalCellsUpdated || 0) + " Drive links across " + (pushRes.sheetsUpdatedCount || 0) + " employee sheet(s)."
      };
    } else if (action === "full_drive_pipeline" || action === "run_drive_pipeline") {
      // 1. Ingest employee sheets into Flow
      var pullRes = pullAllEmployeeSheetsIntoFlow();
      var uCount = pullRes ? (pullRes.totalUpdated || 0) : 0;
      var aCount = pullRes ? (pullRes.totalAppended || 0) : 0;
      // 2. Auto-create missing Drive folders & Script Docs
      var driveRes = menuAutoCreateDriveAssetsForFlow(true);
      var driveCount = driveRes ? (driveRes.createdCount || 0) : 0;
      // 3. Push all Drive links back into employee sheets
      var pushRes = syncDriveLinksToEmployeeSheets({ isSilent: true });
      var pushedCells = pushRes ? (pushRes.totalCellsUpdated || 0) : 0;
      var pushedSheets = pushRes ? (pushRes.sheetsUpdatedCount || 0) : 0;
      // 4. Sync Flow to Database
      var syncRes = syncFlowSheetToPlatform(true);
      var dbCount = syncRes ? (syncRes.totalProcessed || 0) : 0;
      output = {
        success: true,
        action: "full_drive_pipeline",
        totalUpdated: uCount,
        totalAppended: aCount,
        driveAssetsCreated: driveCount,
        driveLinksPushed: pushedCells,
        sheetsUpdatedCount: pushedSheets,
        totalProcessed: dbCount,
        rows: syncRes ? (syncRes.rows || []) : [],
        message: "Full Pipeline Executed: " + (uCount + aCount) + " sheet rows merged, " + driveCount + " Drive folders created, " + pushedCells + " links populated in employee sheets, " + dbCount + " deliverables synced to platform."
      };
    } else if (action === "get_drive_status" || action === "inspect_drive") {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var flowSheet = ss.getSheetByName(TARGET_FLOW_TAB);
      if (!flowSheet) {
        output = { success: false, error: "Flow sheet not found" };
      } else {
        var lastR = flowSheet.getLastRow();
        var lastC = flowSheet.getLastColumn();
        var fHeaders = flowSheet.getRange(1, 1, 1, lastC).getValues()[0];
        var colMap = {};
        for (var c = 0; c < fHeaders.length; c++) {
          var h = String(fHeaders[c] || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
          if (h) colMap[h] = c + 1;
        }
        var sCol = findScriptColIndex(colMap);
        var dCol = findFlowColIndexByKeys(colMap, ["revisionreshootfreqdrivelink", "revisionreshootdrivelink", "revisiondrivelink", "revisionlink", "reshootdrivelink", "videodraftlink", "drivelink"]);
        var crCol = findFlowColIndexByKeys(colMap, ["creatorname", "creator", "creatorsname"]);
        var totalCr = 0;
        var withScript = 0;
        var withDraft = 0;
        var fullyLinked = 0;
        var missingLinks = 0;
        if (lastR >= 2) {
          var fData = flowSheet.getRange(2, 1, lastR - 1, lastC).getValues();
          for (var r = 0; r < fData.length; r++) {
            var crName = crCol ? String(fData[r][crCol - 1] || "").trim() : "";
            if (!crName) continue;
            totalCr++;
            var hasS = sCol && String(fData[r][sCol - 1] || "").indexOf("http") !== -1;
            var hasD = dCol && String(fData[r][dCol - 1] || "").indexOf("http") !== -1;
            if (hasS) withScript++;
            if (hasD) withDraft++;
            if (hasS && hasD) fullyLinked++;
            else missingLinks++;
          }
        }
        output = {
          success: true,
          action: "get_drive_status",
          totalCreators: totalCr,
          withScriptDoc: withScript,
          withVideoDraft: withDraft,
          fullyLinked: fullyLinked,
          missingLinks: missingLinks,
          rootFolderId: EXECUTION_ROOT_FOLDER_ID,
          rootFolderName: "Xcelerate Media Execution",
          rootFolderUrl: "https://drive.google.com/drive/folders/" + EXECUTION_ROOT_FOLDER_ID
        };
      }
    } else if (action === "fix_duplicate_ids" || action === "deduplicate_ids") {
      output = fixDuplicateFlowSheetIds();
    } else if (action === "get_flow_rows" || action === "read_flow" || action === "compare_flow") {
      var syncRes = syncFlowSheetWithFilter(null, "Read Flow", true, true);
      output = {
        success: true,
        action: action,
        totalProcessed: syncRes ? syncRes.totalProcessed : 0,
        rows: syncRes ? (syncRes.rows || []) : []
      };
    } else if (action === "sync_month") {
      var month = String(p.month || "").trim();
      var syncRes = syncFlowSheetWithFilter(function(row) {
        var m = String(row["Campaign Month"] || row["campaign_month"] || "").toLowerCase();
        return m.indexOf(month.toLowerCase()) !== -1;
      }, "Month: " + month, true);
      var recCount = syncRes ? (syncRes.totalProcessed || 0) : 0;
      output = {
        success: true,
        action: "sync_month",
        month: month,
        totalProcessed: recCount,
        totalUpdated: recCount,
        totalAppended: 0,
        rows: syncRes ? (syncRes.rows || []) : [],
        webhookDelivered: syncRes ? syncRes.webhookDelivered : false,
        message: "Synced month '" + month + "' (" + recCount + " deliverables) to Database."
      };
    } else if (action === "sync_campaign") {
      var camp = String(p.campaign || "").trim();
      var syncRes = syncFlowSheetWithFilter(function(row) {
        var cId = String(row["Campaign ID"] || row["campaign_id"] || "").toLowerCase();
        var cName = String(row["Campaign Name"] || row["campaign_name"] || row["Brief Name"] || "").toLowerCase();
        return cId.indexOf(camp.toLowerCase()) !== -1 || cName.indexOf(camp.toLowerCase()) !== -1;
      }, "Campaign: " + camp, true);
      var recCount = syncRes ? (syncRes.totalProcessed || 0) : 0;
      output = {
        success: true,
        action: "sync_campaign",
        campaign: camp,
        totalProcessed: recCount,
        totalUpdated: recCount,
        totalAppended: 0,
        rows: syncRes ? (syncRes.rows || []) : [],
        webhookDelivered: syncRes ? syncRes.webhookDelivered : false,
        message: "Synced campaign '" + camp + "' (" + recCount + " deliverables) to Database."
      };
    } else if (action === "get_registry") {
      var registry = getEmployeeSheetsList();
      output = {
        success: true,
        registry: registry
      };
    } else if (action === "inspect_employee" || action === "inspect_employee_sheet") {
      var empName = String(body.employee || p.employee || "Tej").trim();
      var empList = getEmployeeSheetsList();
      var targetEmp = null;
      for (var i = 0; i < empList.length; i++) {
        if (empList[i].employee.toLowerCase() === empName.toLowerCase()) {
          targetEmp = empList[i];
          break;
        }
      }
      if (!targetEmp) {
        output = { success: false, error: "Employee '" + empName + "' not found in registry." };
      } else {
        try {
          var empSS = SpreadsheetApp.openById(targetEmp.sheetId);
          var empSheet = empSS.getSheetByName(targetEmp.tabName) || empSS.getSheets()[0];
          var lastR = empSheet.getLastRow();
          var lastC = empSheet.getLastColumn();
          var vals = empSheet.getRange(1, 1, lastR, lastC).getValues();
          var headers = vals[0];
          var dataRows = vals.slice(1);
          output = {
            success: true,
            employee: targetEmp.employee,
            sheetId: targetEmp.sheetId,
            tabName: empSheet.getName(),
            lastRow: lastR,
            totalDataRows: dataRows.length,
            headers: headers
          };
        } catch (inspectErr) {
          output = { success: false, error: inspectErr.toString() };
        }
      }
    } else if (action === "add_employee" || action === "save_employee") {
      var empName = String(body.employee || p.employee || "").trim();
      var rawId = String(body.sheetId || p.sheetId || body.sheet_id || p.sheet_id || "").trim();
      var tabName = String(body.tabName || p.tabName || body.tab_name || p.tab_name || "ExecutionSheet").trim();
      var status = String(body.status || p.status || "Active").trim();

      var cleanId = extractSheetId(rawId);
      if (!cleanId) {
        output = { success: false, error: "Invalid Google Sheet ID or URL provided." };
      } else if (!empName) {
        output = { success: false, error: "Employee Name is required." };
      } else {
        var ss = SpreadsheetApp.getActiveSpreadsheet();
        var configSheet = ss.getSheetByName("⚙️ Employee Sheets") || ss.getSheetByName("Employee Sheets");
        if (!configSheet) {
          configSheet = ss.insertSheet("⚙️ Employee Sheets");
          configSheet.getRange(1, 1, 1, 6).setValues([[
            "Employee Name", "Google Sheet ID or Full URL", "Tab Name (Default: ExecutionSheet)", "Status (Active/Paused)", "Last Pulled At", "Rows Ingested"
          ]]);
        }
        var lastRow = configSheet.getLastRow();
        var existingRow = -1;
        if (lastRow >= 2) {
          var existingData = configSheet.getRange(2, 1, lastRow - 1, 1).getValues();
          for (var r = 0; r < existingData.length; r++) {
            if (String(existingData[r][0] || "").trim().toLowerCase() === empName.toLowerCase()) {
              existingRow = r + 2;
              break;
            }
          }
        }
        if (existingRow > 0) {
          configSheet.getRange(existingRow, 1, 1, 4).setValues([[empName, cleanId, tabName, status]]);
        } else {
          configSheet.appendRow([empName, cleanId, tabName, status, "", 0]);
        }
        output = {
          success: true,
          message: "Employee sheet '" + empName + "' registered in Google Sheet.",
          employee: { employee: empName, sheetId: cleanId, tabName: tabName, status: status }
        };
      }
    } else if (action === "delete_employee") {
      var empName = String(body.employee || p.employee || "").trim();
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var configSheet = ss.getSheetByName("⚙️ Employee Sheets") || ss.getSheetByName("Employee Sheets");
      if (configSheet && configSheet.getLastRow() >= 2) {
        var existingData = configSheet.getRange(2, 1, configSheet.getLastRow() - 1, 1).getValues();
        for (var r = 0; r < existingData.length; r++) {
          if (String(existingData[r][0] || "").trim().toLowerCase() === empName.toLowerCase()) {
            configSheet.deleteRow(r + 2);
            break;
          }
        }
      }
      output = { success: true, message: "Employee sheet '" + empName + "' removed from Google Sheet." };
    } else if (action === "enable_realtime") {
      installRealtimeSyncTrigger(true);
      output = {
        success: true,
        action: "enable_realtime",
        message: "Instant Real-Time Sync on Edit trigger activated successfully."
      };
    } else if (action === "enable_autopull") {
      installAutoPullTrigger(true);
      output = {
        success: true,
        action: "enable_autopull",
        message: "Auto-Pull From Employee Sheets (Every 30 Mins) scheduled successfully."
      };
    } else if (action === "disable_triggers") {
      var removed = removeAllAutomationTriggers(true);
      output = {
        success: true,
        action: "disable_triggers",
        message: "All background automation triggers disabled (" + removed + " triggers removed)."
      };
    } else if (action === "clear_brand_names") {
      var res = clearAutoFilledBrandNamesInFlow(true);
      output = {
        success: res.success !== false,
        action: "clear_brand_names",
        message: "Brand/Agency Name column cleared across " + (res.cleared || 0) + " rows for manual input."
      };
    } else if (action === "test_connection") {
      var conn = testPlatformConnection(true);
      output = conn;
    } else {
      output = { error: "Unknown action: " + action };
    }
  } catch (err) {
    output = { success: false, error: err.toString() };
  }

  return ContentService.createTextOutput(JSON.stringify(output))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Diagnostic tool: Audits every row in the Flow tab and identifies skipped/blank rows
 */
function auditFlowSheetRows() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var flowSheet = ss.getSheetByName(TARGET_FLOW_TAB);
  var ui = SpreadsheetApp.getUi();
  if (!flowSheet) {
    ui.alert("Error", "Tab '" + TARGET_FLOW_TAB + "' not found.", ui.ButtonSet.OK);
    return;
  }

  var lastRow = flowSheet.getLastRow();
  var lastCol = flowSheet.getLastColumn();
  if (lastRow < 2) {
    ui.alert("Notice", "Flow sheet has no data rows.", ui.ButtonSet.OK);
    return;
  }

  var range = flowSheet.getRange(1, 1, lastRow, lastCol);
  var values = range.getValues();
  var headers = values[0];

  var creatorCol = -1;
  var campCol = -1;
  var idCol = -1;

  for (var c = 0; c < headers.length; c++) {
    var h = String(headers[c] || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
    if (h === "creatorname") creatorCol = c;
    if (h === "campaignid") campCol = c;
    if (h === "deliverableid" || h === "id" || h === "uniqueid") idCol = c;
  }

  var validCount = 0;
  var skipped = [];

  for (var r = 1; r < values.length; r++) {
    var sheetRowNum = r + 1;
    var rowVals = values[r];
    var hasAnyVal = false;
    for (var c = 0; c < rowVals.length; c++) {
      if (rowVals[c] !== "" && rowVals[c] !== null && rowVals[c] !== undefined) {
        hasAnyVal = true;
        break;
      }
    }

    var cr = creatorCol >= 0 ? String(rowVals[creatorCol] || "").trim() : "";
    var camp = campCol >= 0 ? String(rowVals[campCol] || "").trim() : "";
    var dId = idCol >= 0 ? String(rowVals[idCol] || "").trim() : "";

    if (!hasAnyVal && !dId) {
      skipped.push("Row " + sheetRowNum + ": Completely empty / blank row");
    } else {
      validCount++;
    }
  }

  var msg = "📊 Flow Sheet Row Audit Results:\n\n" +
    "• Total Rows Scanned (Row 2 to " + lastRow + "): " + (lastRow - 1) + " rows\n" +
    "• Valid Creator Deliverables Synced: " + validCount + " rows\n" +
    "• Skipped / Non-Deliverable Rows: " + skipped.length + " rows\n\n";

  if (skipped.length > 0) {
    msg += "Skipped Rows Breakdown:\n" + skipped.slice(0, 10).join("\n");
    if (skipped.length > 10) {
      msg += "\n...and " + (skipped.length - 10) + " more.";
    }
  } else {
    msg += "✅ All rows are 100% valid creator deliverables!";
  }

  ui.alert("Audit Results", msg, ui.ButtonSet.OK);
}

/**
 * Scans Flow tab Column A (Deliverable ID) and replaces duplicate UUIDs with fresh unique UUIDs.
 * Ensures every single creator deliverable row has a strictly unique primary key.
 */
function fixDuplicateFlowSheetIds() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var flowSheet = ss.getSheetByName(TARGET_FLOW_TAB);
  if (!flowSheet) return { success: false, error: "Tab '" + TARGET_FLOW_TAB + "' not found." };

  var lastRow = flowSheet.getLastRow();
  var lastCol = flowSheet.getLastColumn();
  if (lastRow < 2) return { success: true, fixedCount: 0, message: "Flow sheet has no data rows." };

  var headers = flowSheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var idCol = -1;
  for (var c = 0; c < headers.length; c++) {
    var h = String(headers[c] || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
    if (h === "deliverableid" || h === "id" || h === "uniqueid") {
      idCol = c + 1;
      break;
    }
  }
  if (idCol === -1) idCol = 1;

  var idRange = flowSheet.getRange(2, idCol, lastRow - 1, 1);
  var idValues = idRange.getValues();
  var seenIds = {};
  var fixedRows = [];

  for (var r = 0; r < idValues.length; r++) {
    var curId = String(idValues[r][0] || "").trim();
    var sheetRowNum = r + 2;
    if (curId) {
      if (seenIds[curId]) {
        var newUuid = Utilities.getUuid();
        idValues[r][0] = newUuid;
        fixedRows.push({
          row: sheetRowNum,
          oldId: curId,
          newId: newUuid,
          previousRow: seenIds[curId]
        });
      } else {
        seenIds[curId] = sheetRowNum;
      }
    }
  }

  if (fixedRows.length > 0) {
    idRange.setValues(idValues);
    Logger.log("✅ Fixed " + fixedRows.length + " duplicate Deliverable IDs in Flow sheet.");
  }

  var msg = "Fixed " + fixedRows.length + " duplicate Deliverable IDs in Flow sheet.";
  try {
    var ui = SpreadsheetApp.getUi();
    if (ui) {
      if (fixedRows.length > 0) {
        var details = fixedRows.map(function(f) {
          return "Row " + f.row + " (duplicated Row " + f.previousRow + ") -> " + f.newId;
        }).join("\n");
        ui.alert("🔧 Duplicate IDs Repaired", msg + "\n\n" + details, ui.ButtonSet.OK);
      } else {
        ui.alert("✅ All IDs Unique", "No duplicate Deliverable IDs found in Flow sheet!", ui.ButtonSet.OK);
      }
    }
  } catch (_) {}

  return {
    success: true,
    fixedCount: fixedRows.length,
    fixedRows: fixedRows,
    message: msg
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// AUTOMATED GOOGLE DRIVE FOLDER & SCRIPT DOC ENGINE
// Creates: Execution Owner Folder ➔ Campaign Month ➔ Brand Name ➔ Campaign Name ➔ Creator Folder ➔ (Screenshot, Video Draft, Editable Script Doc)
// High Performance: In-memory folder indexing, incremental cell updates, time guards & selected rows support.
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Returns effective root folder for Execution Pipeline ("Xcelerate Media Execution")
 */
/**
 * Returns effective root folder for Execution Pipeline ("Xcelerate Media Execution")
 * Strictly resolves inside "Xcelerate Media Pipeline" > "Xcelerate Media Execution"
 * to ensure owner folders are NEVER created in bare My Drive!
 */
function getEffectiveExecutionRootFolder() {
  var targetFolderName = "Xcelerate Media Execution";
  var parentFolderName = "Xcelerate Media Pipeline";

  // 1. Try direct Folder ID first
  var folderId = "1pO8KjlqgCVgiPMC2yW2LhwEPHIBU_jyf";
  try {
    var stored = PropertiesService.getScriptProperties().getProperty("EXECUTION_ROOT_FOLDER_ID");
    if (stored && stored.trim()) folderId = stored.trim();
  } catch (_) {}

  if (folderId) {
    try {
      var f = DriveApp.getFolderById(folderId);
      if (f && f.getName() && f.getName().toLowerCase().indexOf("execution") !== -1) {
        return f;
      }
    } catch (e) {
      Logger.log("DriveApp.getFolderById(" + folderId + ") warning: " + e.toString());
    }
  }

  // 2. Find "Xcelerate Media Pipeline" in My Drive
  var pipelineFolder = null;
  try {
    var pfIter = DriveApp.getFoldersByName(parentFolderName);
    if (pfIter.hasNext()) {
      pipelineFolder = pfIter.next();
    } else {
      var mySubs = DriveApp.getRootFolder().getFolders();
      while (mySubs.hasNext()) {
        var sub = mySubs.next();
        if (sub.getName().toLowerCase().indexOf("pipeline") !== -1) {
          pipelineFolder = sub;
          break;
        }
      }
    }
  } catch (e) {
    Logger.log("Pipeline search error: " + e.toString());
  }

  // If pipeline folder doesn't exist, create it in My Drive
  if (!pipelineFolder) {
    try {
      pipelineFolder = DriveApp.getRootFolder().createFolder(parentFolderName);
    } catch (_) {
      pipelineFolder = DriveApp.getRootFolder();
    }
  }

  // 3. Find or create "Xcelerate Media Execution" inside "Xcelerate Media Pipeline"
  try {
    var efIter = pipelineFolder.getFoldersByName(targetFolderName);
    if (efIter.hasNext()) {
      var execFolder = efIter.next();
      try { PropertiesService.getScriptProperties().setProperty("EXECUTION_ROOT_FOLDER_ID", execFolder.getId()); } catch (_) {}
      return execFolder;
    }

    var pSubs = pipelineFolder.getFolders();
    while (pSubs.hasNext()) {
      var pfSub = pSubs.next();
      if (pfSub.getName().toLowerCase().indexOf("execution") !== -1) {
        try { PropertiesService.getScriptProperties().setProperty("EXECUTION_ROOT_FOLDER_ID", pfSub.getId()); } catch (_) {}
        return pfSub;
      }
    }

    var newExecFolder = pipelineFolder.createFolder(targetFolderName);
    try { PropertiesService.getScriptProperties().setProperty("EXECUTION_ROOT_FOLDER_ID", newExecFolder.getId()); } catch (_) {}
    return newExecFolder;
  } catch (err) {
    Logger.log("Error resolving execution folder inside pipeline: " + err.toString());
  }

  return pipelineFolder;
}

/**
 * Resolves a column index from flowColMap by an array of pattern keys.
 * Prioritizes exact matches, then substring matches in pattern order.
 */
function findFlowColIndexByKeys(flowColMap, keyPatterns) {
  if (!flowColMap) return undefined;
  // 1. Exact match first
  for (var i = 0; i < keyPatterns.length; i++) {
    var p = keyPatterns[i];
    if (flowColMap[p] !== undefined) return flowColMap[p];
  }
  // 2. Substring match, ordered by pattern priority
  for (var i = 0; i < keyPatterns.length; i++) {
    var p = keyPatterns[i];
    for (var k in flowColMap) {
      if (k.indexOf(p) !== -1) {
        // Special safety check for script column matching: never match status, date, or approval columns
        if (p.indexOf("script") !== -1 && (k.indexOf("status") !== -1 || k.indexOf("date") !== -1 || k.indexOf("rec") !== -1 || k.indexOf("appr") !== -1)) {
          continue;
        }
        return flowColMap[k];
      }
    }
  }
  return undefined;
}

/**
 * Accurately finds the Script Link column index (e.g. Column Z "Script link").
 * Strictly avoids false-positive matches with "Script Received Date", "Script Status", or "Script Approval Date".
 */
function findScriptColIndex(colMap) {
  if (!colMap) return undefined;
  var exactKeys = [
    "scriptlink", "scripturl", "scriptdoclink", "scriptgoogledoclink",
    "scriptdrivelink", "scriptdocurl", "scriptdoc", "scriptfilelink", "scriptfile",
    "scripttxt", "scriptfileurl", "creatorscript", "creatorscriptlink", "creatorscripturl", "script"
  ];
  for (var i = 0; i < exactKeys.length; i++) {
    if (colMap[exactKeys[i]] !== undefined) return colMap[exactKeys[i]];
  }
  // Substring search strictly excluding status, date, receive, approval
  for (var k in colMap) {
    if (k.indexOf("script") !== -1) {
      if (k.indexOf("status") === -1 && k.indexOf("date") === -1 && k.indexOf("rec") === -1 && k.indexOf("appr") === -1) {
        if (k.indexOf("link") !== -1 || k.indexOf("url") !== -1 || k.indexOf("doc") !== -1 || k.indexOf("drive") !== -1 || k === "script") {
          return colMap[k];
        }
      }
    }
  }
  return undefined;
}

/**
 * Pre-indexes all Execution Owner subfolders inside the root folder in a SINGLE query.
 * Matches: "Sakshi Singh Execution", "Payal Jha Execution", "Sonu Jha Execution", "Tej Prakash Execution", etc.
 */
function buildRootFolderIndex(rootFolder) {
  var cache = {};
  if (!rootFolder) return cache;
  try {
    var subFolders = rootFolder.getFolders();
    while (subFolders.hasNext()) {
      var f = subFolders.next();
      var fName = f.getName();
      var fLower = fName.toLowerCase();
      cache[fLower] = f;
      // Map without "execution" suffix, e.g. "sakshi singh" -> folder
      var withoutSuffix = fLower.replace(/\s*execution\s*/g, "").trim();
      if (withoutSuffix) cache[withoutSuffix] = f;
      // Map first word, e.g. "sakshi" -> folder, "payal" -> folder, "sonu" -> folder, "tej" -> folder
      var firstWord = withoutSuffix.split(/\s+/)[0];
      if (firstWord && firstWord.length >= 3 && !cache[firstWord]) {
        cache[firstWord] = f;
      }
    }
  } catch (err) {
    Logger.log("buildRootFolderIndex error: " + err.toString());
  }
  return cache;
}

/**
 * Gets or creates the Execution Owner's folder inside "Xcelerate Media Execution"
 * Uses fast in-memory index to avoid redundant Drive API roundtrips.
 */
function getExecutionOwnerFolder(rootFolder, ownerName, ownerIndex) {
  if (!rootFolder) return null;
  var cleanOwner = String(ownerName || "").trim();
  if (!cleanOwner) cleanOwner = "Team Execution";
  var lowerOwner = cleanOwner.toLowerCase();
  var firstWord = lowerOwner.split(/\s+/)[0];

  // 1. Fast in-memory index lookup (0 ms)
  if (ownerIndex) {
    if (ownerIndex[lowerOwner]) return ownerIndex[lowerOwner];
    if (firstWord && firstWord.length >= 3 && ownerIndex[firstWord]) return ownerIndex[firstWord];
  }

  // 2. Direct name match
  var targetName = lowerOwner.indexOf("execution") !== -1 ? cleanOwner : cleanOwner + " Execution";
  var exactFolders = rootFolder.getFoldersByName(targetName);
  if (exactFolders.hasNext()) {
    var f = exactFolders.next();
    if (ownerIndex) {
      ownerIndex[lowerOwner] = f;
      if (firstWord) ownerIndex[firstWord] = f;
    }
    return f;
  }

  // 3. Create folder if not found
  try {
    var newFolder = rootFolder.createFolder(targetName);
    if (ownerIndex) {
      ownerIndex[lowerOwner] = newFolder;
      if (firstWord) ownerIndex[firstWord] = newFolder;
    }
    return newFolder;
  } catch (err) {
    Logger.log("Error creating owner folder " + targetName + ": " + err.toString());
    return rootFolder;
  }
}

/**
 * Gets or creates a sanitized subfolder inside a parent folder
 */
function getOrCreateSubFolder(parentFolder, name) {
  if (!parentFolder) return null;
  var cleanName = String(name || "").replace(/[\/\\:*?"<>|]/g, " ").trim();
  if (!cleanName) cleanName = "Untitled";

  try {
    var folders = parentFolder.getFoldersByName(cleanName);
    if (folders.hasNext()) {
      return folders.next();
    }
    return parentFolder.createFolder(cleanName);
  } catch (err) {
    Logger.log("Error in getOrCreateSubFolder (" + cleanName + "): " + err.toString());
    return null;
  }
}

/**
 * Normalizes and formats campaign month (e.g. 'Jan 2026', 'Apr 2026', 'May 2026').
 * Handles raw strings, Date objects, and ISO date strings.
 */
function formatCleanCampaignMonth(val) {
  if (!val) {
    return Utilities.formatDate(new Date(), Session.getScriptTimeZone() || "Asia/Kolkata", "MMM yyyy");
  }
  if (Object.prototype.toString.call(val) === "[object Date]" || val instanceof Date) {
    return Utilities.formatDate(val, Session.getScriptTimeZone() || "Asia/Kolkata", "MMM yyyy");
  }
  var s = String(val).trim();
  if (!s) {
    return Utilities.formatDate(new Date(), Session.getScriptTimeZone() || "Asia/Kolkata", "MMM yyyy");
  }
  if (s.indexOf("T") !== -1 || /^\d{4}-\d{2}/.test(s)) {
    var d = new Date(s);
    if (!isNaN(d.getTime())) {
      return Utilities.formatDate(d, Session.getScriptTimeZone() || "Asia/Kolkata", "MMM yyyy");
    }
  }
  return s;
}
/**
 * Reliably guarantees that a file is placed inside targetFolder.
 * Uses a robust relocation ladder (moveTo -> addFile -> makeCopy fallback)
 * to work smoothly across both personal My Drive and organization/shared drive hierarchies.
 */
function ensureFileInsideFolder(file, targetFolder, fileName) {
  if (!file || !targetFolder) return file;
  
  // 1. Verify if file is already inside targetFolder
  try {
    var parents = file.getParents();
    while (parents.hasNext()) {
      if (parents.next().getId() === targetFolder.getId()) {
        return file;
      }
    }
  } catch (_) {}

  // 2. Strategy A: Try native moveTo
  var moved = false;
  try {
    file.moveTo(targetFolder);
    moved = true;
  } catch (e1) {
    Logger.log("moveTo strategy failed: " + e1.toString());
  }

  // 3. Strategy B: Try targetFolder.addFile
  if (!moved) {
    try {
      targetFolder.addFile(file);
      moved = true;
    } catch (e2) {
      Logger.log("addFile strategy failed: " + e2.toString());
    }
  }

  // 4. Strategy C: Try makeCopy directly into targetFolder & trash original
  if (!moved) {
    try {
      var copy = file.makeCopy(fileName || file.getName(), targetFolder);
      if (copy) {
        try { file.setTrashed(true); } catch (_) {}
        return copy;
      }
    } catch (e3) {
      Logger.log("makeCopy strategy failed: " + e3.toString());
    }
  }

  // 5. Clean up from root My Drive if file now exists in targetFolder
  try {
    DriveApp.getRootFolder().removeFile(file);
  } catch (_) {}

  return file;
}

/**
 * Ultra-fast single-pass creator asset generator:
 * Inspects creatorFolder with minimal in-memory iterators.
 * Guarantees inside creatorFolder:
 * 1. "Screenshot" (folder)
 * 2. "Video Draft" (folder)
 * 3. "[Creator Name] - Script" (editable Google Doc)
 * Returns { scriptUrl, draftFolderUrl, screenshotFolderUrl, creatorFolderUrl }
 */
function ensureCreatorAssets(creatorFolder, creatorName, campaignName, ownerName, brandName, campaignMonth) {
  if (!creatorFolder) {
    return { scriptUrl: "", draftFolderUrl: "", screenshotFolderUrl: "", creatorFolderUrl: "" };
  }

  var cleanName = String(creatorName || "").replace(/[\/\\:*?"<>|]/g, " ").trim();
  if (!cleanName) cleanName = "Creator";

  var safeBrand = String(brandName || "").trim() || "General Brand";
  var safeCamp = String(campaignName || "").trim() || "General Campaign";
  var safeOwner = String(ownerName || "").trim() || "Team Xcelerate";
  var safeMonth = formatCleanCampaignMonth(campaignMonth);
  var nowFormatted = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || "Asia/Kolkata", "dd MMM yyyy");

  var scriptUrl = "";
  var draftFolderUrl = "";
  var screenshotFolderUrl = "";
  var creatorFolderUrl = "";

  try {
    creatorFolderUrl = creatorFolder.getUrl();
  } catch (_) {}

  // 1. Single-pass inspection of subfolders inside creatorFolder
  try {
    var subFolders = creatorFolder.getFolders();
    while (subFolders.hasNext()) {
      var sf = subFolders.next();
      var sfNameLower = sf.getName().toLowerCase().replace(/[^a-z0-9]/g, "");
      if (!draftFolderUrl && (sfNameLower.indexOf("videodraft") !== -1 || sfNameLower.indexOf("draft") !== -1 || sfNameLower.indexOf("revision") !== -1 || sfNameLower.indexOf("reshoot") !== -1)) {
        draftFolderUrl = sf.getUrl();
      }
      if (!screenshotFolderUrl && (sfNameLower.indexOf("screenshot") !== -1 || sfNameLower.indexOf("proof") !== -1)) {
        screenshotFolderUrl = sf.getUrl();
      }
    }
  } catch (err) {
    Logger.log("Subfolder scan error in " + cleanName + ": " + err.toString());
  }

  // Create Video Draft folder ONLY if missing
  if (!draftFolderUrl) {
    try {
      draftFolderUrl = creatorFolder.createFolder("Video Draft").getUrl();
    } catch (err) {
      Logger.log("Error creating Video Draft folder: " + err.toString());
    }
  }

  // Create Screenshot folder ONLY if missing
  if (!screenshotFolderUrl) {
    try {
      screenshotFolderUrl = creatorFolder.createFolder("Screenshot").getUrl();
    } catch (err) {
      Logger.log("Error creating Screenshot folder: " + err.toString());
    }
  }

  // 2. Single-pass inspection of files inside creatorFolder
  var existingScriptDoc = null;
  var existingTxtFile = null;
  try {
    var files = creatorFolder.getFiles();
    while (files.hasNext()) {
      var f = files.next();
      var fName = f.getName().toLowerCase();
      var mime = f.getMimeType();
      if (mime === MimeType.GOOGLE_DOCS && (fName.indexOf("script") !== -1 || fName.indexOf(cleanName.toLowerCase()) !== -1)) {
        existingScriptDoc = f;
        scriptUrl = f.getUrl();
        break;
      } else if (fName === "script.txt" || fName.indexOf("script") !== -1) {
        existingTxtFile = f;
      }
    }
  } catch (err) {
    Logger.log("Files scan error in " + cleanName + ": " + err.toString());
  }

  // Create native editable Google Doc ONLY if missing (directly inside creatorFolder, NEVER in My Drive!)
  if (!scriptUrl) {
    try {
      var docTitle = cleanName + " - Script";
      var newDoc = DocumentApp.create(docTitle);
      var docId = newDoc.getId();
      var body = newDoc.getBody();
      body.clear();

      var pTitle = body.appendParagraph("CREATOR SCRIPT: " + cleanName);
      try {
        if (DocumentApp.ParagraphHeading && DocumentApp.ParagraphHeading.HEADING1) {
          pTitle.setHeading(DocumentApp.ParagraphHeading.HEADING1);
        }
      } catch (_) {}
      pTitle.setBold(true);

      body.appendParagraph("═══════════════════════════════════════════════════════════════════════");
      body.appendParagraph("• Brand / Agency : " + safeBrand);
      body.appendParagraph("• Campaign       : " + safeCamp);
      body.appendParagraph("• Campaign Month : " + safeMonth);
      body.appendParagraph("• Creator        : " + cleanName);
      body.appendParagraph("• Execution Owner: " + safeOwner);
      body.appendParagraph("• Date Generated : " + nowFormatted);
      body.appendParagraph("• Status         : Script Pending");
      body.appendParagraph("═══════════════════════════════════════════════════════════════════════\n");

      var p1 = body.appendParagraph("1. CONCEPT & HOOK (Opening 3 Seconds):");
      try {
        if (DocumentApp.ParagraphHeading && DocumentApp.ParagraphHeading.HEADING2) {
          p1.setHeading(DocumentApp.ParagraphHeading.HEADING2);
        }
      } catch (_) {}
      p1.setBold(true);
      body.appendParagraph("[Insert visual hook, opening line, and on-screen dialogue/caption here]\n");

      var p2 = body.appendParagraph("2. SCENE-BY-SCENE FLOW / SCRIPT:");
      try {
        if (DocumentApp.ParagraphHeading && DocumentApp.ParagraphHeading.HEADING2) {
          p2.setHeading(DocumentApp.ParagraphHeading.HEADING2);
        }
      } catch (_) {}
      p2.setBold(true);
      body.appendParagraph("Scene 1 (0:00 - 0:05): [Visual / Dialogue / Key Angle]");
      body.appendParagraph("Scene 2 (0:05 - 0:15): [Core problem / Product introduction]");
      body.appendParagraph("Scene 3 (0:15 - 0:30): [Product demonstration / Benefits]");
      body.appendParagraph("Scene 4 (0:30 - 0:45): [Results / Final thoughts]\n");

      var p3 = body.appendParagraph("3. CALL TO ACTION (CTA) & CAPTION:");
      try {
        if (DocumentApp.ParagraphHeading && DocumentApp.ParagraphHeading.HEADING2) {
          p3.setHeading(DocumentApp.ParagraphHeading.HEADING2);
        }
      } catch (_) {}
      p3.setBold(true);
      body.appendParagraph("[Insert brand offer, discount codes, website/app link, tags, hashtags]");

      newDoc.saveAndClose();

      var docFile = DriveApp.getFileById(docId);
      // Reliably moves the Google Doc from My Drive into creatorFolder
      ensureFileInsideFolder(docFile, creatorFolder, docTitle);

      // Make doc editable by anyone with link
      try {
        docFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.EDIT);
      } catch (shareErr) {
        Logger.log("Permission sharing error: " + shareErr.toString());
      }

      scriptUrl = docFile.getUrl();

      // If an old Script.txt was present, trash it so only the editable Doc remains
      if (existingTxtFile) {
        try { existingTxtFile.setTrashed(true); } catch (_) {}
      }
    } catch (err) {
      Logger.log("Error creating Google Doc for " + cleanName + ": " + err.toString());
      if (existingTxtFile) {
        scriptUrl = existingTxtFile.getUrl();
      } else {
        try {
          var fallbackScript = creatorFolder.createFile(cleanName + " - Script.txt", "CREATOR SCRIPT: " + cleanName + "\nBrand: " + safeBrand + "\nCampaign: " + safeCamp + "\nMonth: " + safeMonth, MimeType.PLAIN_TEXT);
          try { fallbackScript.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.EDIT); } catch (_) {}
          scriptUrl = fallbackScript.getUrl();
        } catch (_) {}
      }
    }
  }

  return {
    scriptUrl: scriptUrl,
    draftFolderUrl: draftFolderUrl,
    screenshotFolderUrl: screenshotFolderUrl,
    creatorFolderUrl: creatorFolderUrl
  };
}

/**
 * Creates or retrieves the script file inside creator's folder.
 * Guaranteed backward-compatible wrapper around ensureCreatorAssets.
 */
function getOrCreateScriptFile(creatorFolder, creatorName, campaignName, ownerName, brandName, campaignMonth) {
  var assets = ensureCreatorAssets(creatorFolder, creatorName, campaignName, ownerName, brandName, campaignMonth);
  return assets.scriptUrl || "";
}
var getOrCreateScriptDoc = getOrCreateScriptFile;

/**
 * Creates or retrieves the "Video Draft" folder inside creator's folder.
 * Guaranteed backward-compatible wrapper around ensureCreatorAssets.
 */
function getOrCreateVideoRevisedFolder(creatorFolder, creatorName) {
  var assets = ensureCreatorAssets(creatorFolder, creatorName);
  return assets.draftFolderUrl || "";
}
var getOrCreateVideoDraftFolder = getOrCreateVideoRevisedFolder;
var getOrCreateVideoDraftsFolder = getOrCreateVideoRevisedFolder;

/**
 * Creates or retrieves the "Screenshot" folder inside creator's folder.
 * Guaranteed backward-compatible wrapper around ensureCreatorAssets.
 */
function getOrCreateScreenshotsFolder(creatorFolder, creatorName) {
  var assets = ensureCreatorAssets(creatorFolder, creatorName);
  return assets.screenshotFolderUrl || "";
}

/**
 * Automatically cleans up any stray script files sitting in root My Drive
 * with safety limit & time guard to prevent timeouts.
 */
function cleanupStrayScriptDocsFromMyDrive() {
  var rootFolder = getEffectiveExecutionRootFolder();
  if (!rootFolder) return { movedCount: 0 };

  var myDriveFiles = DriveApp.getRootFolder().getFiles();
  var movedCount = 0;
  var scanned = 0;
  var startTime = new Date().getTime();

  while (myDriveFiles.hasNext() && scanned < 30 && (new Date().getTime() - startTime) < 10000) {
    var file = myDriveFiles.next();
    scanned++;
    var fName = file.getName();

    if (fName.indexOf(" - Script") !== -1 || fName === "Script.txt") {
      var creatorPart = fName.split(" - Script")[0].trim();
      if (creatorPart && creatorPart !== "Script") {
        try {
          var matchedFolders = rootFolder.searchFolders('title = "' + creatorPart + '" and trashed = false');
          if (matchedFolders.hasNext()) {
            var targetCrFolder = matchedFolders.next();
            try {
              file.moveTo(targetCrFolder);
              movedCount++;
            } catch (moveErr) {
              try {
                file.makeCopy("Script.txt", targetCrFolder);
                file.setTrashed(true);
                movedCount++;
              } catch (_) {}
            }
          }
        } catch (_) {}
      }
    }
  }

  return { movedCount: movedCount };
}

/**
 * Menu action to manually trigger cleaning stray files from My Drive into creator folders.
 */
function menuCleanupStrayDriveFiles() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  try {
    ss.toast("Scanning root My Drive for stray script files...", "⚡ Xcelerate Pulse", 5);
  } catch (_) {}

  var res = cleanupStrayScriptDocsFromMyDrive();
  SpreadsheetApp.getUi().alert(
    "🧹 Drive Cleanup Finished",
    "Successfully relocated " + res.movedCount + " stray script file(s) from root My Drive into their creator folders!\n\nAll creator folders now contain:\n• Screenshot (Folder)\n• Video Draft (Folder)\n• Script Doc (Editable Google Doc)",
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

/**
 * Core Batch Engine: Iterates rows, checks if Script link or Revision Drive link is missing,
 * creates Drive hierarchy: Execution Owner ➔ Campaign Month ➔ Brand Name ➔ Campaign Name ➔ Creator ➔ (Screenshot, Video Draft, Editable Script Doc)
 * 
 * Options:
 * - maxRows: Maximum rows to process in this run (prevents timeout, defaults to 25)
 * - maxDurationMs: Maximum execution time before returning (defaults to 150000 ms / 2.5 mins)
 * - writeDirectlyToSheet: If true, updates cells in sheet in a single fast batch write
 * - startRowOffset: 1-based sheet row for flowDataRows[0] (defaults to 2)
 * - onlyIndices: Specific array of row indices to process (e.g. for selected rows or newly appended rows)
 * - isForced: If true, forces generation of any missing folder/doc inside creator folder and overwrites sheet cells
 */
function autoCreateDriveAssetsForRows(flowSheet, flowColMap, flowDataRows, options) {
  options = options || {};
  var maxRows = options.maxRows !== undefined ? options.maxRows : 25;
  var maxDurationMs = options.maxDurationMs || 150000;
  var writeDirectly = options.writeDirectlyToSheet === true;
  var startRowOffset = options.startRowOffset || 2;
  var onlyIndices = options.onlyIndices || null;
  var isForced = options.isForced === true;

  var startTime = new Date().getTime();

  var creatorCol = findFlowColIndexByKeys(flowColMap, [
    "creatorname", "creator", "creatorsname", "influencername", "creatornameinfluencername"
  ]);
  var monthCol = findFlowColIndexByKeys(flowColMap, [
    "campaignmonth", "month", "campaignmonths", "monthyear", "campmonth", "campaignmonthy"
  ]);
  var brandCol = findFlowColIndexByKeys(flowColMap, [
    "brandagencyname", "brandname", "agencyname", "brand", "agency", "brandagency"
  ]);
  var campCol = findFlowColIndexByKeys(flowColMap, [
    "campaignname", "briefname", "brief", "campaignbrief", "campaign"
  ]);
  var ownerCol = findFlowColIndexByKeys(flowColMap, [
    "xceleratepoc", "executionowner", "poc", "owner", "executionpoc"
  ]);
  var scriptCol = findScriptColIndex(flowColMap);
  if (!scriptCol) {
    scriptCol = findFlowColIndexByKeys(flowColMap, [
      "scriptlink", "scripturl", "scriptdoclink", "scriptgoogledoclink", "scriptdrivelink", "scriptdoc"
    ]);
  }
  var draftCol = findFlowColIndexByKeys(flowColMap, [
    "revisionreshootfreqdrivelink", "revisionreshootdrivelink", "revisiondrivelink", "revisionlink",
    "reshootdrivelink", "reshootlink", "videodraftlink", "videodraft", "draftlink", "drivelink",
    "draftdrivelink", "videorevisedlink", "videorevised", "1stdraftlink", "firstdraftlink",
    "videos1stdraftdrivelink", "video1stdraftdrivelink", "1stdraftdrivelink"
  ]);
  var screenshotCol = findFlowColIndexByKeys(flowColMap, [
    "screenshots", "screenshot", "proof", "reelscreenshot", "insightsscreenshot", "performancescreenshot",
    "prooflink", "livescreenshot", "screenshotlink", "screenshotslink", "screenshotsfolder"
  ]);
  var creatorFolderCol = findFlowColIndexByKeys(flowColMap, [
    "creatorfolderlink", "creatordrivelink", "creatorfolder", "creatordrive",
    "folderlink", "drivefolderlink", "drivefolder", "creatorlink", "folderurl",
    "profiledrivelink"
  ]);

  if (!creatorCol) {
    Logger.log("Creator column not found in sheet.");
    return { createdCount: 0, skippedCount: 0, stoppedEarly: false, totalToProcess: 0, remainingCount: 0 };
  }

  var rootFolder = getEffectiveExecutionRootFolder();
  if (!rootFolder) {
    Logger.log("Execution root folder could not be found or opened.");
    return { createdCount: 0, skippedCount: 0, stoppedEarly: false, totalToProcess: 0, remainingCount: 0 };
  }

  // Pre-index existing owner folders in root in ONE query!
  var ownerIndex = buildRootFolderIndex(rootFolder);
  var monthCache = {};
  var brandCache = {};
  var campCache = {};
  var creatorCache = {};

  var createdCount = 0;
  var skippedCount = 0;
  var stoppedEarly = false;
  var totalToProcess = 0;
  var anyRowModified = false;

  var indicesToIterate = [];
  if (onlyIndices && onlyIndices.length > 0) {
    indicesToIterate = onlyIndices;
  } else {
    for (var i = 0; i < flowDataRows.length; i++) {
      indicesToIterate.push(i);
    }
  }

  // Count creators to process
  for (var k = 0; k < indicesToIterate.length; k++) {
    var idx = indicesToIterate[k];
    var rData = flowDataRows[idx];
    if (!rData) continue;
    var cName = creatorCol ? String(rData[creatorCol - 1] || "").trim() : "";
    if (!cName) continue;
    totalToProcess++;
  }

  for (var k = 0; k < indicesToIterate.length; k++) {
    var r = indicesToIterate[k];
    var row = flowDataRows[r];
    if (!row) continue;

    var creatorName = creatorCol ? String(row[creatorCol - 1] || "").trim() : "";
    if (!creatorName) continue;

    var scriptLink = scriptCol ? String(row[scriptCol - 1] || "").trim() : "";
    var draftLink = draftCol ? String(row[draftCol - 1] || "").trim() : "";
    var screenshotLink = screenshotCol ? String(row[screenshotCol - 1] || "").trim() : "";

    var hasScript = scriptLink && scriptLink.indexOf("http") !== -1;
    var hasDraft = draftLink && draftLink.indexOf("http") !== -1;
    var hasScreenshot = !screenshotCol || (screenshotLink && screenshotLink.indexOf("http") !== -1);

    // If NOT forced run, and row ALREADY has all links pointing to drive/docs, skip
    if (!isForced && hasScript && hasDraft && hasScreenshot) {
      skippedCount++;
      continue;
    }

    // Check batch limit & time guard
    var elapsed = new Date().getTime() - startTime;
    if (createdCount >= maxRows || elapsed >= maxDurationMs) {
      stoppedEarly = true;
      break;
    }

    var ownerName = ownerCol ? String(row[ownerCol - 1] || "").trim() : "";
    if (!ownerName) ownerName = "Team Execution";

    var rawMonth = monthCol ? row[monthCol - 1] : "";
    var campaignMonth = formatCleanCampaignMonth(rawMonth);

    var campName = campCol ? String(row[campCol - 1] || "").trim() : "";
    if (!campName) campName = "General Campaign";

    var brandName = brandCol ? String(row[brandCol - 1] || "").trim() : "";
    if (!brandName) {
      brandName = campName ? (campName.split(/\s+|-|_/)[0] || "General Brand") : "General Brand";
    }

    var cleanMonthKey = campaignMonth.toLowerCase().replace(/[^a-z0-9]/g, "");
    var cleanBrandKey = brandName.toLowerCase().replace(/[^a-z0-9]/g, "");
    var cleanCampKey = campName.toLowerCase().replace(/[^a-z0-9]/g, "");
    var cleanCrKey = creatorName.toLowerCase().replace(/[^a-z0-9]/g, "");

    // 1. Get or create Execution Owner Folder
    var ownerFolder = getExecutionOwnerFolder(rootFolder, ownerName, ownerIndex);
    if (!ownerFolder) continue;

    // 2. Get or create Campaign Month Folder inside Owner Folder (e.g. "Jan 2026", "Apr 2026", "May 2026")
    var monthKey = ownerFolder.getId() + "_" + cleanMonthKey;
    var monthFolder = monthCache[monthKey];
    if (!monthFolder) {
      monthFolder = getOrCreateSubFolder(ownerFolder, campaignMonth);
      if (monthFolder) monthCache[monthKey] = monthFolder;
    }
    if (!monthFolder) continue;

    // 3. Get or create Brand/Agency Folder inside Month Folder (e.g. "Barcode", "HiveMinds", "Dominos")
    var brandKey = monthFolder.getId() + "_" + cleanBrandKey;
    var brandFolder = brandCache[brandKey];
    if (!brandFolder) {
      brandFolder = getOrCreateSubFolder(monthFolder, brandName);
      if (brandFolder) brandCache[brandKey] = brandFolder;
    }
    if (!brandFolder) continue;

    // 4. Get or create Campaign Name Folder inside Brand Folder (e.g. "Livon-Barcode Jan", "Dominos-May2026")
    var campKey = brandFolder.getId() + "_" + cleanCampKey;
    var campFolder = campCache[campKey];
    if (!campFolder) {
      campFolder = getOrCreateSubFolder(brandFolder, campName);
      if (campFolder) campCache[campKey] = campFolder;
    }
    if (!campFolder) continue;

    // 5. Get or create Creator Folder inside Campaign Folder (e.g. "Charvi", "Devna")
    var crKey = campFolder.getId() + "_" + cleanCrKey;
    var crFolder = creatorCache[crKey];
    if (!crFolder) {
      crFolder = getOrCreateSubFolder(campFolder, creatorName);
      if (crFolder) creatorCache[crKey] = crFolder;
    }
    if (!crFolder) continue;

    // 6. Ultra-fast creation/verification of Screenshot (folder), Video Draft (folder) & editable Script Google Doc
    var assets = ensureCreatorAssets(crFolder, creatorName, campName, ownerName, brandName, campaignMonth);
    var rowModified = false;

    if (assets.scriptUrl && scriptCol) {
      var currentScript = String(row[scriptCol - 1] || "").trim();
      if (!currentScript || currentScript !== assets.scriptUrl || isForced) {
        row[scriptCol - 1] = assets.scriptUrl;
        rowModified = true;
      }
    }

    if (assets.draftFolderUrl && draftCol) {
      var currentDraft = String(row[draftCol - 1] || "").trim();
      if (!currentDraft || currentDraft !== assets.draftFolderUrl || isForced) {
        row[draftCol - 1] = assets.draftFolderUrl;
        rowModified = true;
      }
    }

    if (assets.screenshotFolderUrl && screenshotCol) {
      var currentScreenshot = String(row[screenshotCol - 1] || "").trim();
      if (!currentScreenshot || currentScreenshot !== assets.screenshotFolderUrl || isForced) {
        row[screenshotCol - 1] = assets.screenshotFolderUrl;
        rowModified = true;
      }
    }

    if (assets.creatorFolderUrl && creatorFolderCol) {
      var currentFolder = String(row[creatorFolderCol - 1] || "").trim();
      if (!currentFolder || currentFolder !== assets.creatorFolderUrl || isForced) {
        row[creatorFolderCol - 1] = assets.creatorFolderUrl;
        rowModified = true;
      }
    }

    createdCount++;
    if (rowModified) anyRowModified = true;
  }

  // Fast bulk write back to sheet in a single call (no cell-by-cell flushing!)
  if (writeDirectly && anyRowModified && flowSheet) {
    try {
      flowSheet.getRange(startRowOffset, 1, flowDataRows.length, flowDataRows[0].length).setValues(flowDataRows);
      SpreadsheetApp.flush();
    } catch (batchErr) {
      Logger.log("Batch write fallback: " + batchErr.toString());
      try { SpreadsheetApp.flush(); } catch (_) {}
    }
  }

  var remainingCount = Math.max(0, totalToProcess - createdCount);
  return {
    createdCount: createdCount,
    skippedCount: skippedCount,
    stoppedEarly: stoppedEarly,
    totalToProcess: totalToProcess,
    remainingCount: remainingCount
  };
}

/**
 * Toolbar Action: Creates Drive assets ONLY for currently selected rows in the active sheet.
 * Super fast (sub-second per row), single batch write, zero timeout risk!
 * Works on BOTH the 'Flow' tab and any Employee tab!
 */
function menuCreateDriveAssetsForSelectedRows() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getActiveSheet();
  var range = sheet.getActiveRange();
  if (!range) {
    SpreadsheetApp.getUi().alert("Please highlight the row(s) you want to create folders for.");
    return;
  }

  var startRow = range.getRow();
  var numRows = range.getNumRows();
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();

  if (startRow <= 1 && numRows === 1) {
    SpreadsheetApp.getUi().alert("Row 1 is the header row. Please select one or more creator rows below header.");
    return;
  }

  var actualStartRow = Math.max(2, startRow);
  var actualEndRow = Math.min(lastRow, startRow + numRows - 1);
  var actualCount = actualEndRow - actualStartRow + 1;

  if (actualCount <= 0) {
    SpreadsheetApp.getUi().alert("No valid creator rows selected.");
    return;
  }

  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var colMap = {};
  for (var c = 0; c < headers.length; c++) {
    var h = String(headers[c] || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
    if (h) colMap[h] = c + 1;
  }

  var creatorCol = findFlowColIndexByKeys(colMap, [
    "creatorname", "creator", "creatorsname", "influencername", "creatornameinfluencername"
  ]);
  if (!creatorCol) {
    SpreadsheetApp.getUi().alert("Could not find 'Creator Name' column in this sheet ('" + sheet.getName() + "').");
    return;
  }

  var rowsData = sheet.getRange(actualStartRow, 1, actualCount, lastCol).getValues();

  try {
    ss.toast("Ensuring Screenshot, Video Draft & Script Doc for " + actualCount + " selected row(s)...", "⚡ Xcelerate Pulse", 3);
  } catch (_) {}

  var res = autoCreateDriveAssetsForRows(sheet, colMap, rowsData, {
    maxRows: 50,
    maxDurationMs: 60000,
    writeDirectlyToSheet: false, // We write the entire block in one batch right below!
    startRowOffset: actualStartRow,
    isForced: true
  });

  if (res.createdCount > 0) {
    // 1. Instant single-range write back to the active sheet
    sheet.getRange(actualStartRow, 1, actualCount, lastCol).setValues(rowsData);
    SpreadsheetApp.flush();

    var empNote = "";
    if (sheet.getName() !== TARGET_FLOW_TAB) {
      try {
        var flowTab = ss.getSheetByName(TARGET_FLOW_TAB);
        if (flowTab) {
          syncUpdatedLinksFromSheetToFlow(flowTab, rowsData, colMap);
          empNote = "\n• Also populated link(s) directly into Master Flow tab ('" + TARGET_FLOW_TAB + "')!";
        }
      } catch (flowSyncErr) {
        Logger.log("flowSyncErr: " + flowSyncErr.toString());
      }
    } else {
      // Collect selected creator names for targeted employee sync (only touches relevant sheets in 1-2s!)
      var selectedCreators = [];
      for (var sr = 0; sr < rowsData.length; sr++) {
        var scName = creatorCol ? String(rowsData[sr][creatorCol - 1] || "").trim() : "";
        if (scName) selectedCreators.push(scName);
      }

      var empSyncRes = null;
      try {
        empSyncRes = syncDriveLinksToEmployeeSheets({ isSilent: true, targetCreators: selectedCreators });
      } catch (_) {}
      if (empSyncRes && empSyncRes.totalCellsUpdated > 0) {
        empNote = "\n• Also populated " + empSyncRes.totalCellsUpdated + " link(s) directly into Employee Execution Sheet(s)!";
      }
    }

    SpreadsheetApp.getUi().alert(
      "📁 Drive Creation Complete!",
      "Successfully created & verified Drive assets for " + res.createdCount + " creator(s)!\n\n" +
      "• Hierarchy: Xcelerate Media Pipeline > Xcelerate Media Execution > [Owner] > [Campaign Month] > [Brand/Agency] > [Campaign Name] > [Creator]\n" +
      "• 3 Items inside Creator Folder:\n" +
      "  1. Screenshot (Folder)\n" +
      "  2. Video Draft (Folder)\n" +
      "  3. Script Doc (Editable Google Doc)\n\n" +
      "Links have been saved directly into your sheet cells!" + empNote,
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  } else {
    SpreadsheetApp.getUi().alert(
      "📁 Drive Status",
      "No creator rows were processed. Please check your selection and try again.",
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  }
}

/**
 * When Drive links are generated on an Employee sheet, syncs those links into the Master Flow sheet in a single batch write.
 */
function syncUpdatedLinksFromSheetToFlow(flowTab, rowsData, sourceColMap) {
  if (!flowTab || !rowsData || rowsData.length === 0) return;
  var flowLastRow = flowTab.getLastRow();
  var flowLastCol = flowTab.getLastColumn();
  if (flowLastRow < 2 || flowLastCol < 1) return;

  var flowHeaders = flowTab.getRange(1, 1, 1, flowLastCol).getValues()[0];
  var flowColMap = {};
  for (var c = 0; c < flowHeaders.length; c++) {
    var h = String(flowHeaders[c] || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
    if (h) flowColMap[h] = c + 1;
  }

  var flowCrCol = findFlowColIndexByKeys(flowColMap, ["creatorname", "creator", "creatorsname", "influencername"]);
  var flowScriptCol = findScriptColIndex(flowColMap);
  var flowDraftCol = findFlowColIndexByKeys(flowColMap, [
    "revisionreshootfreqdrivelink", "revisionreshootdrivelink", "revisiondrivelink", "revisionlink",
    "reshootdrivelink", "videodraftlink", "videodraft", "draftlink", "drivelink"
  ]);
  var flowScreenshotCol = findFlowColIndexByKeys(flowColMap, ["screenshots", "screenshot", "proof", "prooflink"]);
  var flowFolderCol = findFlowColIndexByKeys(flowColMap, ["creatorfolderlink", "creatordrivelink", "creatorfolder", "folderlink"]);
  var flowCampIdCol = findFlowColIndexByKeys(flowColMap, ["campaignid", "campid", "cid"]);
  var flowBriefCol = findFlowColIndexByKeys(flowColMap, ["briefname", "brief", "campaignname", "campaign"]);

  if (!flowCrCol) return;

  var srcCrCol = findFlowColIndexByKeys(sourceColMap, ["creatorname", "creator", "creatorsname", "influencername"]);
  var srcScriptCol = findScriptColIndex(sourceColMap);
  var srcDraftCol = findFlowColIndexByKeys(sourceColMap, [
    "revisionreshootfreqdrivelink", "revisionreshootdrivelink", "revisiondrivelink", "revisionlink",
    "reshootdrivelink", "videodraftlink", "videodraft", "draftlink", "drivelink"
  ]);
  var srcScreenshotCol = findFlowColIndexByKeys(sourceColMap, ["screenshots", "screenshot", "proof"]);
  var srcFolderCol = findFlowColIndexByKeys(sourceColMap, ["creatorfolderlink", "creatordrivelink", "creatorfolder", "folderlink"]);
  var srcCampIdCol = findFlowColIndexByKeys(sourceColMap, ["campaignid", "campid", "cid"]);
  var srcBriefCol = findFlowColIndexByKeys(sourceColMap, ["briefname", "brief", "campaignname", "campaign"]);

  if (!srcCrCol) return;

  var flowRows = flowTab.getRange(2, 1, flowLastRow - 1, flowLastCol).getValues();
  var modified = false;

  for (var i = 0; i < rowsData.length; i++) {
    var sRow = rowsData[i];
    var sCr = String(sRow[srcCrCol - 1] || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
    if (!sCr) continue;

    var sScript = srcScriptCol ? String(sRow[srcScriptCol - 1] || "").trim() : "";
    var sDraft = srcDraftCol ? String(sRow[srcDraftCol - 1] || "").trim() : "";
    var sScreenshot = srcScreenshotCol ? String(sRow[srcScreenshotCol - 1] || "").trim() : "";
    var sFolder = srcFolderCol ? String(sRow[srcFolderCol - 1] || "").trim() : "";
    var sCampId = srcCampIdCol ? String(sRow[srcCampIdCol - 1] || "").trim().toLowerCase() : "";
    var sBrief = srcBriefCol ? String(sRow[srcBriefCol - 1] || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "") : "";

    for (var r = 0; r < flowRows.length; r++) {
      var fCr = String(flowRows[r][flowCrCol - 1] || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
      if (fCr !== sCr) continue;

      if (sCampId && flowCampIdCol) {
        var fCampId = String(flowRows[r][flowCampIdCol - 1] || "").trim().toLowerCase();
        if (fCampId && fCampId !== sCampId) continue;
      }
      if (sBrief && flowBriefCol) {
        var fBrief = String(flowRows[r][flowBriefCol - 1] || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
        if (fBrief && fBrief !== sBrief) continue;
      }

      if (flowScriptCol && sScript && String(flowRows[r][flowScriptCol - 1] || "").trim() !== sScript) {
        flowRows[r][flowScriptCol - 1] = sScript;
        modified = true;
      }
      if (flowDraftCol && sDraft && String(flowRows[r][flowDraftCol - 1] || "").trim() !== sDraft) {
        flowRows[r][flowDraftCol - 1] = sDraft;
        modified = true;
      }
      if (flowScreenshotCol && sScreenshot && String(flowRows[r][flowScreenshotCol - 1] || "").trim() !== sScreenshot) {
        flowRows[r][flowScreenshotCol - 1] = sScreenshot;
        modified = true;
      }
      if (flowFolderCol && sFolder && String(flowRows[r][flowFolderCol - 1] || "").trim() !== sFolder) {
        flowRows[r][flowFolderCol - 1] = sFolder;
        modified = true;
      }
    }
  }

  // Single batch write back into Flow sheet
  if (modified) {
    flowTab.getRange(2, 1, flowLastRow - 1, flowLastCol).setValues(flowRows);
    SpreadsheetApp.flush();
  }
}

/**
 * Toolbar Action: Batch auto-creates Drive assets for Flow tab with safe batch limit & time guard.
 */
function menuAutoCreateDriveAssetsForFlow(isSilent) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var flowSheet = ss.getSheetByName(TARGET_FLOW_TAB);
  if (!flowSheet) {
    if (!isSilent) SpreadsheetApp.getUi().alert("Could not find '" + TARGET_FLOW_TAB + "' sheet.");
    return { success: false, error: "Tab '" + TARGET_FLOW_TAB + "' not found." };
  }

  var lastRow = flowSheet.getLastRow();
  var lastCol = flowSheet.getLastColumn();
  if (lastRow < 2 || lastCol < 1) {
    if (!isSilent) SpreadsheetApp.getUi().alert("No data rows found in '" + TARGET_FLOW_TAB + "'.");
    return { success: false, error: "No data rows in Flow." };
  }

  var flowHeaders = flowSheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var flowColMap = {};
  for (var c = 0; c < flowHeaders.length; c++) {
    var hName = String(flowHeaders[c] || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
    if (hName) flowColMap[hName] = c + 1;
  }

  if (!isSilent) {
    try { ss.toast("Scanning Flow tab for creators missing Drive assets...", "⚡ Xcelerate Pulse", 3); } catch (_) {}
  }

  var flowData = flowSheet.getRange(2, 1, lastRow - 1, lastCol).getValues();

  var res = autoCreateDriveAssetsForRows(flowSheet, flowColMap, flowData, {
    maxRows: 25,
    maxDurationMs: 60000,
    writeDirectlyToSheet: true,
    startRowOffset: 2,
    isForced: false
  });

  if (res.createdCount > 0) {
    // Automatically push newly created links into Employee Sheets!
    var empSyncRes = null;
    try {
      empSyncRes = syncDriveLinksToEmployeeSheets({ isSilent: true });
    } catch (_) {}

    if (!isSilent) {
      var msg = "Successfully verified & created Drive assets for " + res.createdCount + " creator(s)!\n\n" +
                "• Path: Xcelerate Media Pipeline > Xcelerate Media Execution > [Owner] > [Campaign Month] > [Brand/Agency] > [Campaign Name] > [Creator]\n" +
                "• 3 Items inside Creator: Screenshot (Folder), Video Draft (Folder), Script Doc (Editable Google Doc)\n" +
                "• All links saved directly to your Flow sheet.\n";
      if (empSyncRes && empSyncRes.totalCellsUpdated > 0) {
        msg += "• Populated " + empSyncRes.totalCellsUpdated + " link(s) directly into Employee Execution Sheet(s)!\n";
      }
      if (res.remainingCount > 0) {
        msg += "• Remaining creators missing links: " + res.remainingCount + ".\n\n" +
               "👉 Click 'Auto-Create Drive Folders (Next Batch)' to process the next batch of 25, or highlight rows and use 'Create Drive Folders for Selected Row(s)'!";
      } else {
        msg += "🎉 All creators in Flow are now fully linked!";
      }

      SpreadsheetApp.getUi().alert(
        "📁 Drive Automation Complete!",
        msg,
        SpreadsheetApp.getUi().ButtonSet.OK
      );
    }
    return { success: true, createdCount: res.createdCount, remainingCount: res.remainingCount };
  } else {
    if (!isSilent) {
      SpreadsheetApp.getUi().alert(
        "📁 Drive Automation",
        "All creators in Flow already have Script docs and Drive links attached! (No missing links found).",
        SpreadsheetApp.getUi().ButtonSet.OK
      );
    }
    return { success: true, createdCount: 0, remainingCount: 0 };
  }
}

/**
 * Pushes Script Doc Links & Video Draft (Revision/Reshoot) Folder Links
 * from the Master Flow sheet into all active Employee Sheets!
 * Reads each sheet once in bulk and applies updates in a single batch write (finishes in seconds).
 * 
 * Options:
 * - targetEmployeeNames: array of employee names to sync (or null for all)
 * - targetCreators: array of specific creator names to sync (or null for all)
 * - isSilent: boolean, suppresses UI alert popups
 */
function syncDriveLinksToEmployeeSheets(options) {
  options = options || {};
  var isSilent = options.isSilent === true;
  var targetCreators = options.targetCreators || null;

  var targetCreatorMap = null;
  if (targetCreators && targetCreators.length > 0) {
    targetCreatorMap = {};
    for (var tc = 0; tc < targetCreators.length; tc++) {
      var cleanTc = String(targetCreators[tc] || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
      if (cleanTc) targetCreatorMap[cleanTc] = true;
    }
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var flowSheet = ss.getSheetByName(TARGET_FLOW_TAB);
  if (!flowSheet) {
    if (!isSilent) SpreadsheetApp.getUi().alert("Could not find '" + TARGET_FLOW_TAB + "' sheet.");
    return { success: false, error: "Flow sheet not found" };
  }

  var flowLastRow = flowSheet.getLastRow();
  var flowLastCol = flowSheet.getLastColumn();
  if (flowLastRow < 2 || flowLastCol < 1) {
    return { success: true, totalRowsUpdated: 0, totalCellsUpdated: 0, sheetsUpdatedCount: 0, summaryDetails: [] };
  }

  var flowHeaders = flowSheet.getRange(1, 1, 1, flowLastCol).getValues()[0];
  var flowColMap = {};
  for (var c = 0; c < flowHeaders.length; c++) {
    var h = String(flowHeaders[c] || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
    if (h) flowColMap[h] = c + 1;
  }

  var flowCreatorCol = findFlowColIndexByKeys(flowColMap, [
    "creatorname", "creator", "creatorsname", "influencername", "creatornameinfluencername"
  ]);
  var flowScriptCol = findScriptColIndex(flowColMap);
  if (!flowScriptCol) {
    flowScriptCol = findFlowColIndexByKeys(flowColMap, [
      "scriptlink", "scripturl", "scriptdoclink", "scriptgoogledoclink", "scriptdrivelink", "scriptdoc",
      "scriptfilelink", "scriptfile", "scripttxt", "scriptfileurl", "creatorscript", "creatorscriptlink", "creatorscripturl", "script"
    ]);
  }
  var flowDraftCol = findFlowColIndexByKeys(flowColMap, [
    "revisionreshootfreqdrivelink", "revisionreshootdrivelink", "revisiondrivelink", "revisionlink",
    "reshootdrivelink", "reshootlink", "videodraftlink", "videodraft", "draftlink", "drivelink",
    "draftdrivelink", "videorevisedlink", "videorevised", "1stdraftlink", "firstdraftlink",
    "videos1stdraftdrivelink", "video1stdraftdrivelink", "1stdraftdrivelink"
  ]);
  var flowScreenshotCol = findFlowColIndexByKeys(flowColMap, [
    "screenshots", "screenshot", "proof", "reelscreenshot", "insightsscreenshot", "performancescreenshot",
    "prooflink", "livescreenshot", "screenshotlink", "screenshotslink", "screenshotsfolder"
  ]);
  var flowCreatorFolderCol = findFlowColIndexByKeys(flowColMap, [
    "creatorfolderlink", "creatordrivelink", "creatorfolder", "creatordrive",
    "folderlink", "drivefolderlink", "drivefolder", "creatorlink", "folderurl",
    "profiledrivelink"
  ]);
  var flowCampIdCol = findFlowColIndexByKeys(flowColMap, ["campaignid", "campid", "cid"]);
  var flowCampNameCol = findFlowColIndexByKeys(flowColMap, ["campaignname", "briefname", "brief", "campaign"]);
  var flowIdCol = findFlowColIndexByKeys(flowColMap, ["deliverableid", "id", "uuid"]);

  if (!flowCreatorCol || (!flowScriptCol && !flowDraftCol && !flowScreenshotCol && !flowCreatorFolderCol)) {
    Logger.log("Flow sheet missing Creator or link columns.");
    return { success: false, error: "Required columns missing in Flow sheet" };
  }

  var flowData = flowSheet.getRange(2, 1, flowLastRow - 1, flowLastCol).getValues();

  var flowLinksById = {};
  var flowLinksByCampIdCr = {};
  var flowLinksByBriefCr = {};
  var flowLinksByCr = {};
  var totalFlowWithLinks = 0;

  for (var i = 0; i < flowData.length; i++) {
    var fRow = flowData[i];
    var cName = flowCreatorCol ? String(fRow[flowCreatorCol - 1] || "").trim() : "";
    if (!cName) continue;

    var sLink = flowScriptCol ? String(fRow[flowScriptCol - 1] || "").trim() : "";
    var dLink = flowDraftCol ? String(fRow[flowDraftCol - 1] || "").trim() : "";
    var scrLink = flowScreenshotCol ? String(fRow[flowScreenshotCol - 1] || "").trim() : "";
    var crfLink = flowCreatorFolderCol ? String(fRow[flowCreatorFolderCol - 1] || "").trim() : "";

    var hasValidScript = sLink.indexOf("http") !== -1;
    var hasValidDraft = dLink.indexOf("http") !== -1;
    var hasValidScreenshot = scrLink.indexOf("http") !== -1;
    var hasValidFolder = crfLink.indexOf("http") !== -1;
    if (!hasValidScript && !hasValidDraft && !hasValidScreenshot && !hasValidFolder) continue;

    totalFlowWithLinks++;

    var linkObj = {
      scriptLink: hasValidScript ? sLink : "",
      draftLink: hasValidDraft ? dLink : "",
      screenshotLink: hasValidScreenshot ? scrLink : "",
      creatorFolderLink: hasValidFolder ? crfLink : "",
      creator: cName
    };

    var cleanCr = cName.toLowerCase().replace(/[^a-z0-9]/g, "");

    var dId = flowIdCol ? String(fRow[flowIdCol - 1] || "").trim() : "";
    if (dId) flowLinksById[dId] = linkObj;

    var campId = flowCampIdCol ? String(fRow[flowCampIdCol - 1] || "").trim().toLowerCase() : "";
    if (campId && cleanCr) {
      flowLinksByCampIdCr[campId + "_" + cleanCr] = linkObj;
    }

    var brief = flowCampNameCol ? String(fRow[flowCampNameCol - 1] || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "") : "";
    if (brief && cleanCr) {
      flowLinksByBriefCr[brief + "_" + cleanCr] = linkObj;
    }

    if (cleanCr && !flowLinksByCr[cleanCr]) {
      flowLinksByCr[cleanCr] = linkObj;
    }
  }

  if (totalFlowWithLinks === 0) {
    if (!isSilent) {
      SpreadsheetApp.getUi().alert("No script or drive links found in Flow sheet to push.");
    }
    return { success: true, totalRowsUpdated: 0, totalCellsUpdated: 0, sheetsUpdatedCount: 0, summaryDetails: [] };
  }

  var empList = getEmployeeSheetsList();
  if (!empList || empList.length === 0) {
    if (!isSilent) {
      SpreadsheetApp.getUi().alert("No active employee sheets found in '⚙️ Employee Sheets' registry.");
    }
    return { success: false, error: "No employee sheets found." };
  }

  var totalCellsUpdated = 0;
  var totalRowsUpdated = 0;
  var sheetsUpdatedCount = 0;
  var summaryDetails = [];

  for (var e = 0; e < empList.length; e++) {
    var emp = empList[e];
    if (options.targetEmployeeNames && options.targetEmployeeNames.length > 0) {
      var matchEmp = false;
      for (var t = 0; t < options.targetEmployeeNames.length; t++) {
        if (emp.employee.toLowerCase().indexOf(options.targetEmployeeNames[t].toLowerCase()) !== -1) {
          matchEmp = true;
          break;
        }
      }
      if (!matchEmp) continue;
    }

    try {
      var empSs = SpreadsheetApp.openById(emp.sheetId);
      var empSheet = empSs.getSheetByName(emp.tabName || "ExecutionSheet");
      if (!empSheet) {
        empSheet = empSs.getSheets()[0];
      }
      if (!empSheet) continue;

      var empLastRow = empSheet.getLastRow();
      var empLastCol = empSheet.getLastColumn();
      if (empLastRow < 2 || empLastCol < 1) continue;

      // SINGLE fast range read of the entire employee sheet
      var empAllData = empSheet.getRange(1, 1, empLastRow, empLastCol).getValues();
      var empHeaders = empAllData[0];
      var empColMap = {};
      for (var c = 0; c < empHeaders.length; c++) {
        var eh = String(empHeaders[c] || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
        if (eh) empColMap[eh] = c + 1;
      }

      var empCrCol = findFlowColIndexByKeys(empColMap, [
        "creatorname", "creator", "creatorsname", "influencername", "creatornameinfluencername"
      ]);
      var empScriptCol = findScriptColIndex(empColMap);
      if (!empScriptCol) {
        empScriptCol = findFlowColIndexByKeys(empColMap, [
          "scriptlink", "scripturl", "scriptdoclink", "scriptgoogledoclink", "scriptdrivelink", "scriptdoc",
          "scriptfilelink", "scriptfile", "scripttxt", "scriptfileurl", "creatorscript", "creatorscriptlink", "creatorscripturl", "script"
        ]);
      }
      var empDraftCol = findFlowColIndexByKeys(empColMap, [
        "revisionreshootfreqdrivelink", "revisionreshootdrivelink", "revisiondrivelink", "revisionlink",
        "reshootdrivelink", "reshootlink", "videodraftlink", "videodraft", "draftlink", "drivelink",
        "draftdrivelink", "videorevisedlink", "videorevised", "1stdraftlink", "firstdraftlink",
        "videos1stdraftdrivelink", "video1stdraftdrivelink", "1stdraftdrivelink"
      ]);
      var empScreenshotCol = findFlowColIndexByKeys(empColMap, [
        "screenshots", "screenshot", "proof", "reelscreenshot", "insightsscreenshot", "performancescreenshot",
        "prooflink", "livescreenshot", "screenshotlink", "screenshotslink", "screenshotsfolder"
      ]);
      var empCreatorFolderCol = findFlowColIndexByKeys(empColMap, [
        "creatorfolderlink", "creatordrivelink", "creatorfolder", "creatordrive",
        "folderlink", "drivefolderlink", "drivefolder", "creatorlink", "folderurl",
        "profiledrivelink"
      ]);
      var empCampIdCol = findFlowColIndexByKeys(empColMap, ["campaignid", "campid", "cid"]);
      var empBriefCol = findFlowColIndexByKeys(empColMap, ["briefname", "brief", "campaignname", "campaign"]);
      var empIdCol = findFlowColIndexByKeys(empColMap, ["deliverableid", "id", "uuid"]);

      if (!empCrCol || (!empScriptCol && !empDraftCol && !empScreenshotCol && !empCreatorFolderCol)) {
        continue;
      }

      var sheetRowsModified = 0;
      var sheetCellsModified = 0;

      for (var r = 1; r < empAllData.length; r++) {
        var eCreator = String(empAllData[r][empCrCol - 1] || "").trim();
        if (!eCreator) continue;

        var cleanECr = eCreator.toLowerCase().replace(/[^a-z0-9]/g, "");

        // Targeted creators check (skip creators not in selection)
        if (targetCreatorMap && !targetCreatorMap[cleanECr]) {
          continue;
        }

        var matched = null;
        var eId = empIdCol ? String(empAllData[r][empIdCol - 1] || "").trim() : "";
        if (eId && flowLinksById[eId]) {
          matched = flowLinksById[eId];
        }

        if (!matched && empCampIdCol) {
          var eCampId = String(empAllData[r][empCampIdCol - 1] || "").trim().toLowerCase();
          if (eCampId && flowLinksByCampIdCr[eCampId + "_" + cleanECr]) {
            matched = flowLinksByCampIdCr[eCampId + "_" + cleanECr];
          }
        }

        if (!matched && empBriefCol) {
          var eBrief = String(empAllData[r][empBriefCol - 1] || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
          if (eBrief && flowLinksByBriefCr[eBrief + "_" + cleanECr]) {
            matched = flowLinksByBriefCr[eBrief + "_" + cleanECr];
          }
        }

        if (!matched && flowLinksByCr[cleanECr]) {
          matched = flowLinksByCr[cleanECr];
        }

        if (!matched) continue;

        var rowChanged = false;

        if (empScriptCol && matched.scriptLink) {
          var curScript = String(empAllData[r][empScriptCol - 1] || "").trim();
          if (!curScript || curScript !== matched.scriptLink) {
            empAllData[r][empScriptCol - 1] = matched.scriptLink;
            rowChanged = true;
            sheetCellsModified++;
          }
        }

        if (empDraftCol && matched.draftLink) {
          var curDraft = String(empAllData[r][empDraftCol - 1] || "").trim();
          if (!curDraft || curDraft !== matched.draftLink) {
            empAllData[r][empDraftCol - 1] = matched.draftLink;
            rowChanged = true;
            sheetCellsModified++;
          }
        }

        if (empScreenshotCol && matched.screenshotLink) {
          var curScreenshot = String(empAllData[r][empScreenshotCol - 1] || "").trim();
          if (!curScreenshot || curScreenshot !== matched.screenshotLink) {
            empAllData[r][empScreenshotCol - 1] = matched.screenshotLink;
            rowChanged = true;
            sheetCellsModified++;
          }
        }

        if (empCreatorFolderCol && matched.creatorFolderLink) {
          var curFolder = String(empAllData[r][empCreatorFolderCol - 1] || "").trim();
          if (!curFolder || curFolder !== matched.creatorFolderLink) {
            empAllData[r][empCreatorFolderCol - 1] = matched.creatorFolderLink;
            rowChanged = true;
            sheetCellsModified++;
          }
        }

        if (rowChanged) {
          sheetRowsModified++;
        }
      }

      // Single atomic batch write back to employee spreadsheet
      if (sheetRowsModified > 0) {
        empSheet.getRange(1, 1, empLastRow, empLastCol).setValues(empAllData);
        totalRowsUpdated += sheetRowsModified;
        totalCellsUpdated += sheetCellsModified;
        sheetsUpdatedCount++;
        summaryDetails.push("• " + emp.employee + " (" + empSheet.getName() + "): " + sheetRowsModified + " rows (" + sheetCellsModified + " links updated)");
      }
    } catch (empErr) {
      Logger.log("Error syncing links to " + emp.employee + " (" + emp.sheetId + "): " + empErr.toString());
    }
  }

  // Single flush at the end of all employee sheets
  if (sheetsUpdatedCount > 0) {
    try { SpreadsheetApp.flush(); } catch (_) {}
  }

  return {
    success: true,
    totalRowsUpdated: totalRowsUpdated,
    totalCellsUpdated: totalCellsUpdated,
    sheetsUpdatedCount: sheetsUpdatedCount,
    summaryDetails: summaryDetails
  };
}

/**
 * Toolbar Action: Pushes all Script doc links and Video Draft links from Flow
 * into each respective Employee Sheet.
 */
function menuPushDriveLinksToEmployeeSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  try {
    ss.toast("Pushing Drive links from Flow to Employee Sheets...", "⚡ Xcelerate Pulse", 5);
  } catch (_) {}

  var res = syncDriveLinksToEmployeeSheets({ isSilent: false });
  if (res.success) {
    var details = res.summaryDetails && res.summaryDetails.length > 0
      ? "\n\nBreakdown:\n" + res.summaryDetails.join("\n")
      : "";
    SpreadsheetApp.getUi().alert(
      "📤 Drive Links Pushed to Employee Sheets!",
      "Successfully updated " + res.totalRowsUpdated + " rows (" + res.totalCellsUpdated + " link cells) across " + res.sheetsUpdatedCount + " employee sheet(s)!" + details + "\n\nEmployees can now open their personal execution sheets and click the Script doc & Video Draft links directly!",
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  }
}




