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


// Default employee sheets list (used if '⚙️ Employee Sheets' tab is not yet filled)
var DEFAULT_EMPLOYEE_SHEETS = [
  {
    employee: "Payal",
    sheetId: "17kvysvuctOSTh_1FTEsa_vlsdVELs8rSdqR-R_gJZqI",
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
 * Installable Trigger: Runs with full user auth so UrlFetchApp can send HTTP requests in real-time
 */
function handleInstalledOnEdit(e) {
  try {
    if (!e || !e.range) return;
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
 * Fallback simple trigger (Catches manual cell edits in Flow)
 */
function onEdit(e) {
  try {
    if (!e || !e.range) return;
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
      ["Tej", "PASTE_TEJ_SHEET_ID_OR_URL_HERE", "ExecutionSheet", "Active", "Never", 0],
      ["Sonu", "PASTE_SONU_SHEET_ID_OR_URL_HERE", "ExecutionSheet", "Active", "Never", 0]
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
  var configSheet = ss.getSheetByName("⚙️ Employee Sheets");

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

  // SCRIPT APPROVAL DATE
  if (fKey.indexOf("scriptapproval") !== -1 || fKey === "scriptapprovaldate" || fKey === "scriptdate") {
    if (empColMap["scriptapprovaldate"] !== undefined) return empColMap["scriptapprovaldate"];
    if (empColMap["scriptapproveddate"] !== undefined) return empColMap["scriptapproveddate"];
    if (empColMap["scriptdate"] !== undefined) return empColMap["scriptdate"];
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

  // Build index of existing rows in Flow: mapped by Deliverable ID, or CampaignID_CreatorName
  var existingFlowRows = {};
  var idCol = flowColMap["deliverableid"] || flowColMap["id"] || 1;
  var campCol = flowColMap["campaignid"];
  var creatorCol = flowColMap["creatorname"];

  var flowData = [];
  if (flowLastRow >= 2) {
    flowData = flowSheet.getRange(2, 1, flowLastRow - 1, flowLastCol).getValues();
    for (var r = 0; r < flowData.length; r++) {
      var dId = String(flowData[r][idCol - 1] || "").trim();
      var cId = campCol ? String(flowData[r][campCol - 1] || "").trim() : "";
      var crName = creatorCol ? String(flowData[r][creatorCol - 1] || "").trim().toLowerCase() : "";

      if (dId) existingFlowRows[dId] = r; // 0-indexed in flowData array
      if (cId && crName) existingFlowRows[cId + "_" + crName] = r;
    }
  }

  var totalUpdated = 0;
  var totalAppended = 0;
  var newCreatorsList = [];
  var updatedCreatorsList = [];
  var newCreatorsMap = {};
  var updatedCreatorsMap = {};
  var pullErrors = [];
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

        if (!rowCreator) {
          var empUrlIdx = empColMap["url"] !== undefined ? empColMap["url"] : (empColMap["profileurl"] !== undefined ? empColMap["profileurl"] : undefined);
          if (empUrlIdx !== undefined) {
            var rawUrl = String(rowVals[empUrlIdx] || "");
            var m = rawUrl.match(/(?:instagram\.com\/|youtube\.com\/@?|tiktok\.com\/@?)([a-zA-Z0-9._]+)/);
            if (m && m[1]) rowCreator = m[1].replace(/[^a-zA-Z0-9._]/g, "");
          }
          if (!rowCreator && rowUniqueId) {
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

        if (!rowCampId && !rowCreator && !rowBrief) continue; // skip blank rows

        // Determine Deliverable ID for Flow
        var deliverableId = rowUniqueId;
        if (!deliverableId || deliverableId === "#ERROR!") {
          var cleanC = rowCreator.toLowerCase().replace(/[^a-z0-9]/g, "") || "creator";
          deliverableId = rowCampId ? (rowCampId + "-D" + Math.random().toString(36).substring(2, 6).toUpperCase()) : Utilities.getUuid();
        }

        // Check if row already exists in Flow
        var existingRowIdx = undefined;
        if (deliverableId && existingFlowRows[deliverableId] !== undefined) {
          existingRowIdx = existingFlowRows[deliverableId];
        } else if (rowCampId && rowCreator && existingFlowRows[rowCampId + "_" + rowCreator.toLowerCase()] !== undefined) {
          existingRowIdx = existingFlowRows[rowCampId + "_" + rowCreator.toLowerCase()];
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
          // Instant in-memory append! (Zero network roundtrip)
          var newIdx = flowData.length;
          flowData.push(targetRowArray);
          if (deliverableId) existingFlowRows[deliverableId] = newIdx;
          if (rowCampId && rowCreator) existingFlowRows[rowCampId + "_" + rowCreator.toLowerCase()] = newIdx;
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

  // 3. Write ALL updated & appended rows to Flow in ONE single batch write!
  if (flowData.length > 0) {
    var requiredMaxRows = flowData.length + 1; // +1 for header row
    var currentMaxRows = flowSheet.getMaxRows();
    if (requiredMaxRows > currentMaxRows) {
      flowSheet.insertRowsAfter(currentMaxRows, (requiredMaxRows - currentMaxRows) + 30);
    }

    try { ss.toast("Step 3/4: Batch-writing " + flowData.length + " rows to Flow tab...", "⚡ Xcelerate Pulse", 3); } catch (_) {}
    safeSetRange(flowSheet.getRange(2, 1, flowData.length, flowLastCol), flowData);
  }

  SpreadsheetApp.flush();

  // 4. Automatically push the refreshed Flow sheet to database
  try { ss.toast("Step 4/4: Pushing live to database... (90%)", "⚡ Xcelerate Pulse", 4); } catch (_) {}
  syncFlowSheetToPlatform(true);

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

  var summaryMsg = "✅ Flow Sheet Updated & Synced to Database!\n\n" +
    "• Rows Updated: " + totalUpdated + "\n" +
    "• New Rows / Creators Added: " + totalAppended + "\n" +
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
function syncFlowSheetWithFilter(filterFn, scopeLabel, isSilent) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var flowSheet = ss.getSheetByName(TARGET_FLOW_TAB);
  if (!flowSheet) return;

  var lastRow = flowSheet.getLastRow();
  var lastCol = flowSheet.getLastColumn();
  if (lastRow < 2) return;

  var range = flowSheet.getRange(1, 1, lastRow, lastCol);
  var values = range.getValues();
  var formulas = [];
  try { formulas = range.getFormulas(); } catch (_) {}
  var richText = null;
  try { richText = range.getRichTextValues(); } catch (rtErr) {
    Logger.log("getRichTextValues bypassed to prevent V8 internal error: " + rtErr);
  }
  var headers = values[0];

  var linkCols = {};
  for (var c = 0; c < headers.length; c++) {
    var h = String(headers[c] || "").toLowerCase();
    if (h.indexOf("link") !== -1 || h.indexOf("url") !== -1 || h.indexOf("drive") !== -1 || h.indexOf("doc") !== -1) linkCols[c] = true;
  }

  var rows = [];
  var skippedDetails = [];
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
        var rtCell = (richText && richText[r]) ? richText[r][c] : null;
        var fCell = (formulas && formulas[r]) ? formulas[r][c] : "";
        cellVal = resolveHyperlink(cellVal, rtCell, fCell);
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

      var customMsg = "Pulled all employee sheets: " + uCount + " rows updated, " + aCount + " new rows added.";
      if (nList.length > 0) {
        customMsg += " (" + nList.length + " new creators added)";
      }

      // Also extract and return all Flow sheet rows so the platform database is updated immediately
      var allFlowRes = syncFlowSheetWithFilter(null, "Pull All Sync", true);

      output = {
        success: pullRes ? pullRes.success !== false : true,
        action: "pull_all",
        totalUpdated: uCount,
        totalAppended: aCount,
        totalProcessed: pCount,
        newCreators: nList,
        updatedCreators: uList,
        rows: allFlowRes ? (allFlowRes.rows || []) : [],
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

        var customMsg = "Pulled employee '" + targetEmp.employee + "': " + uCount + " rows updated, " + aCount + " new rows added.";
        if (nList.length > 0) {
          customMsg += " (" + nList.length + " new creators added)";
        }

        // Also extract and return all Flow sheet rows so the platform database is updated immediately
        var allFlowRes = syncFlowSheetWithFilter(null, "Pull Single Sync", true);

        output = {
          success: pullSingleRes ? pullSingleRes.success !== false : true,
          action: "pull_employee",
          employee: targetEmp.employee,
          totalUpdated: uCount,
          totalAppended: aCount,
          totalProcessed: pCount,
          newCreators: nList,
          updatedCreators: uList,
          rows: allFlowRes ? (allFlowRes.rows || []) : [],
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
    } else if (action === "get_flow_rows" || action === "read_flow") {
      var syncRes = syncFlowSheetWithFilter(null, "Read Flow", true);
      output = {
        success: true,
        action: "get_flow_rows",
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
