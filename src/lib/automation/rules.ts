import { CategoryTier, ScriptStatus, DraftStatus, FinalVideoStatus, ExecutionStatus, CreatorDeliverableInternal } from "@/lib/types";

/**
 * 1. AUTOMATIC CATEGORY DETERMINATION BY FOLLOWER COUNT
 * - < 10K: Nano
 * - 10K to 100K: Micro
 * - 100K to 1M: Macro
 * - 1M+: Mega
 */
export function deriveCategoryFromFollowers(followersCount: number, existingCategory?: string): CategoryTier {
  if (followersCount >= 1_000_000) return "Mega";
  if (followersCount >= 100_000) return "Macro";
  if (followersCount >= 10_000) return "Micro";
  if (followersCount > 0) return "Nano";
  
  // If explicitly provided category from sheet, respect it
  if (existingCategory && ["Nano", "Micro", "Macro", "Mega"].includes(existingCategory)) {
    return existingCategory as CategoryTier;
  }
  return "Unspecified";
}

/**
 * Helper to get today's date formatted as YYYY-MM-DD
 */
export function getTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * 2. AUTOMATIC STATUS CASCADING & DEPENDENT COLUMN POPULATION
 * Intelligently propagates progress forwards and backwards across workflow stages.
 */
export function applySmartStatusCascades(record: Partial<CreatorDeliverableInternal>): {
  updated: Partial<CreatorDeliverableInternal>;
  automationsApplied: string[];
} {
  const automationsApplied: string[] = [];
  const res = { ...record };
  const today = getTodayDateString();

  // Rule A: Drop Cascade & Protection
  const isDropped = 
    res.execution_status === "Drop" ||
    res.confirmation_mail_status === "Drop" ||
    res.script_status === "Drop" ||
    res.first_draft_status === "Drop" ||
    res.final_video_status === "Drop";

  if (isDropped) {
    if (res.execution_status !== "Drop") {
      res.execution_status = "Drop";
      automationsApplied.push("Auto-Cascaded: Execution Status set to 'Drop' (creator dropped/withdrawn)");
    }
    // Early exit: do not cascade completion or approval rules for a dropped creator
    return { updated: res, automationsApplied };
  }

  // Rule B: Live Link Cascade (Content is Published)
  if (res.live_link && res.live_link.trim() !== "") {
    if (!res.live_date || res.live_date.trim() === "") {
      res.live_date = today;
      automationsApplied.push("Auto-Filled: Live Date set to today");
    }
    if (res.final_video_status !== "Approved") {
      res.final_video_status = "Approved";
      automationsApplied.push("Auto-Cascaded: Final Video marked 'Approved' (Live post active)");
    }
    if (!res.video_approval_date || res.video_approval_date.trim() === "") {
      res.video_approval_date = res.live_date || today;
    }
    if (res.first_draft_status !== "Approved" && !res.first_draft_status?.includes("Revision")) {
      res.first_draft_status = "Approved";
      automationsApplied.push("Auto-Cascaded: 1st Draft marked 'Approved'");
    }
    if (res.script_status !== "Approved") {
      res.script_status = "Approved";
      if (!res.script_approval_date) res.script_approval_date = res.video_approval_date || today;
    }
    if (res.execution_status !== "Completed" && res.execution_status !== "Drop") {
      res.execution_status = "Completed";
      automationsApplied.push("Auto-Cascaded: Execution Status set to 'Completed'");
    }
  }

  // Rule C: Final Video Approved
  if (res.final_video_status === "Approved") {
    if (!res.video_approval_date || res.video_approval_date.trim() === "") {
      res.video_approval_date = today;
      automationsApplied.push("Auto-Filled: Video Approval Date set to today");
    }
    if (res.first_draft_status !== "Approved" && !res.first_draft_status?.includes("Revision Done")) {
      res.first_draft_status = "Approved";
      automationsApplied.push("Auto-Cascaded: 1st Draft marked 'Approved'");
    }
    if (!res.first_draft_date || res.first_draft_date.trim() === "") {
      res.first_draft_date = res.video_approval_date || today;
    }
    if (res.script_status !== "Approved") {
      res.script_status = "Approved";
    }
  }

  // Rule D: Video 1st Draft Approved
  if (res.first_draft_status === "Approved") {
    if (!res.first_draft_date || res.first_draft_date.trim() === "") {
      res.first_draft_date = today;
      automationsApplied.push("Auto-Filled: 1st Draft Date set to today");
    }
    if (res.script_status !== "Approved") {
      res.script_status = "Approved";
      automationsApplied.push("Auto-Cascaded: Script marked 'Approved'");
    }
    // Advance final video to Approval Pending if still pending draft
    if (!res.final_video_status || res.final_video_status === "Drop") {
      res.final_video_status = "Approval Pending";
    }
  }

  // Rule E: Script Approved
  if (res.script_status === "Approved") {
    if (!res.script_approval_date || res.script_approval_date.trim() === "") {
      res.script_approval_date = today;
      automationsApplied.push("Auto-Filled: Script Approval Date set to today");
    }
    if (res.confirmation_mail_status !== "Mail Sent") {
      res.confirmation_mail_status = "Mail Sent";
    }
  }

  // Rule F: Revision Reshoot Done
  if (res.first_draft_status === "Revision/Reshoot Done") {
    if (!res.first_draft_date || res.first_draft_date.trim() === "") {
      res.first_draft_date = today;
    }
    if (res.final_video_status !== "Approved") {
      res.final_video_status = "Approval Pending";
      automationsApplied.push("Auto-Cascaded: Final Video set to 'Approval Pending' following revision submission");
    }
  }

  return { updated: res, automationsApplied };
}

/**
 * 3. AUTOMATIC COMMERCIAL & MARGIN COMPUTATION
 * - Gross Margin = Brand Cost - Creator Cost
 * - Gross Margin % = (Gross Margin / Brand Cost) * 100
 */
export function computeCommercialAutomations(
  brandCost: number,
  creatorCost: number,
  inputMargin?: number
): {
  grossMargin: number;
  marginPercentage: number;
  isMarginHealthy: boolean;
  warnings: string[];
} {
  const warnings: string[] = [];
  const grossMargin = (inputMargin !== undefined && inputMargin !== 0) 
    ? inputMargin 
    : (brandCost - creatorCost);

  const marginPercentage = brandCost > 0 
    ? Number(((grossMargin / brandCost) * 100).toFixed(1)) 
    : 0;

  if (grossMargin < 0) {
    warnings.push("⚠️ Negative Margin Alert: Creator cost exceeds Brand billing cost!");
  } else if (brandCost > 0 && marginPercentage < 15) {
    warnings.push("⚠️ Low Margin Warning: Agency margin is below 15%");
  }

  return {
    grossMargin,
    marginPercentage,
    isMarginHealthy: marginPercentage >= 20 && grossMargin >= 0,
    warnings,
  };
}

/**
 * 4. AUTOMATIC ENGAGEMENT RATE & METRIC COMPUTATION
 * - Total Engagements = Likes + Comments + Saves + Shares
 * - ER % = (Total Engagements / Views) * 100
 * - CPV = Brand Cost / Total Views
 * - CPE = Brand Cost / Total Engagements
 */
export function computeEngagementAutomations(
  views: number,
  likes: number,
  comments: number,
  saves: number,
  shares: number,
  reach: number,
  brandCost: number = 0,
  inputEr: number = 0
): {
  totalEngagements: number;
  computedEr: number;
  cpv: number;
  cpe: number;
} {
  const totalEngagements = likes + comments + saves + shares;
  let computedEr = inputEr;

  if (views > 0) {
    computedEr = Number(((totalEngagements / views) * 100).toFixed(2));
  } else if (reach > 0 && totalEngagements > 0) {
    computedEr = Number(((totalEngagements / reach) * 100).toFixed(2));
  }

  const cpv = views > 0 ? Number((brandCost / views).toFixed(2)) : 0;
  const cpe = totalEngagements > 0 ? Number((brandCost / totalEngagements).toFixed(2)) : 0;

  return {
    totalEngagements,
    computedEr,
    cpv,
    cpe,
  };
}
