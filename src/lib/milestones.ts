import { CreatorDeliverableBrandView, CreatorDeliverableInternal } from "@/lib/types";

export interface MilestoneScheduleItem {
  milestone: "7d" | "15d" | "30d";
  title: string;
  label: string;
  shortLabel: string;
  tag: string;
  subtitle: string;
  targetDays: number;
  targetDate: Date | null;
  targetDateFormatted: string;
  formattedTargetDate: string;
  isLogged: boolean;
  isDue: boolean;
  isOverdue: boolean;
  daysRemaining: number; // >0: upcoming, 0: due today, <0: overdue
  status: "COMPLETED" | "DUE_TODAY" | "OVERDUE" | "UPCOMING" | "AWAITING_LIVE";
  badgeLabel: string;
  badgeClass: string;
}

export interface CreatorMilestoneSummary {
  creatorId: string;
  creatorName: string;
  liveDate: Date | null;
  liveDateFormatted: string;
  daysSinceLive: number | null;
  milestones: {
    day7: MilestoneScheduleItem;
    day15: MilestoneScheduleItem;
    day30: MilestoneScheduleItem;
  };
  activeMilestone: "7d" | "15d" | "30d" | null;
  nextActionMilestone: MilestoneScheduleItem | null;
  hasActionRequired: boolean;
  allMilestonesCompleted: boolean;
  overallStatusBadge: {
    label: string;
    sublabel: string;
    badgeClass: string;
    urgency: "none" | "low" | "medium" | "high";
  };
}

/**
 * Safely parse date strings from Google Sheets, DB, or ISO formats
 */
export function parseDateSafe(val?: string | null): Date | null {
  if (!val) return null;
  const s = String(val).trim();
  if (!s || s === "-" || s.toLowerCase() === "n/a" || s.toLowerCase() === "pending") return null;

  // 1. Strip time portion if present (e.g. 2026-09-21T00:00:00.000Z or 2026-09-21 00:00:00)
  const dateOnly = s.includes("T") ? s.split("T")[0].trim() : s.split(/\s+/)[0].trim();

  // 2. YYYY-MM-DD
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(dateOnly)) {
    const [y, m, d] = dateOnly.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    if (!isNaN(date.getTime())) return date;
  }

  // 3. DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = dateOnly.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmyMatch) {
    const d = Number(dmyMatch[1]);
    const m = Number(dmyMatch[2]);
    const y = Number(dmyMatch[3]);
    const date = new Date(y, m - 1, d);
    if (!isNaN(date.getTime())) return date;
  }

  // 4. Native fallback
  const parsed = new Date(s);
  return isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Formats a Date object into human-friendly string: e.g. "21 Sep 2026"
 */
export function formatDateDisplay(date: Date | null): string {
  if (!date || isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Compact date format: e.g. "Sep 21"
 */
export function formatShortDate(date: Date | null): string {
  if (!date || isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

/**
 * Calculates complete milestone status, countdowns, and alert levels for a creator
 */
export function calculateCreatorMilestones(
  deliverable: CreatorDeliverableBrandView | CreatorDeliverableInternal,
  currentReferenceDate?: Date
): CreatorMilestoneSummary {
  const internal = deliverable as CreatorDeliverableInternal;
  const liveDate = parseDateSafe(deliverable.live_date);

  const today = currentReferenceDate ? new Date(currentReferenceDate) : new Date();
  today.setHours(0, 0, 0, 0);

  // Check which milestones have verified metrics logged
  const day7Logged = (internal.day7_views || 0) > 0 || (internal.day7_er || 0) > 0 || Boolean(internal.day7_screenshot && internal.day7_screenshot !== "[]");
  const day15Logged = (internal.day15_views || 0) > 0 || (internal.day15_er || 0) > 0 || Boolean(internal.day15_screenshot && internal.day15_screenshot !== "[]");
  const day30Logged = (internal.day30_views || 0) > 0 || (internal.day30_er || 0) > 0 || Boolean(internal.day30_screenshot && internal.day30_screenshot !== "[]");

  if (!liveDate) {
    const awaitingItem = (
      milestone: "7d" | "15d" | "30d",
      title: string,
      shortLabel: string,
      tag: string,
      subtitle: string,
      targetDays: number,
      isLogged: boolean
    ): MilestoneScheduleItem => ({
      milestone,
      title,
      label: title,
      shortLabel,
      tag,
      subtitle,
      targetDays,
      targetDate: null,
      targetDateFormatted: "Awaiting Live Date",
      formattedTargetDate: "Awaiting Live Date",
      isLogged,
      isDue: false,
      isOverdue: false,
      daysRemaining: 999,
      status: isLogged ? "COMPLETED" : "AWAITING_LIVE",
      badgeLabel: isLogged ? "Logged ✓" : "Pending Live",
      badgeClass: isLogged ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-500 border-slate-200",
    });

    return {
      creatorId: String(deliverable.id),
      creatorName: deliverable.creator_name,
      liveDate: null,
      liveDateFormatted: "Not Live Yet",
      daysSinceLive: null,
      milestones: {
        day7: awaitingItem("7d", "7-Day Velocity", "Day 7", "7D", "Launch Velocity", 7, day7Logged),
        day15: awaitingItem("15d", "15-Day Mid-Flight", "Day 15", "15D", "Mid-Flight Scale", 15, day15Logged),
        day30: awaitingItem("30d", "30-Day Wrap", "Day 30", "30D", "Mature Wrap", 30, day30Logged),
      },
      activeMilestone: null,
      nextActionMilestone: null,
      hasActionRequired: false,
      allMilestonesCompleted: day7Logged && day15Logged && day30Logged,
      overallStatusBadge: {
        label: deliverable.live_link ? "Live Link Added (Date Pending)" : "Awaiting Live Date",
        sublabel: "Milestone clock starts once live date is recorded",
        badgeClass: "bg-slate-100 text-slate-600 border border-slate-200",
        urgency: "none",
      },
    };
  }

  // Live date is known: normalize to midnight for exact day diff
  const liveMidnight = new Date(liveDate);
  liveMidnight.setHours(0, 0, 0, 0);

  const diffMs = today.getTime() - liveMidnight.getTime();
  const daysSinceLive = Math.max(0, Math.floor(diffMs / 86400000));

  // Build Milestone items
  const buildItem = (
    milestone: "7d" | "15d" | "30d",
    title: string,
    shortLabel: string,
    tag: string,
    subtitle: string,
    targetDays: number,
    isLogged: boolean
  ): MilestoneScheduleItem => {
    const targetDate = new Date(liveMidnight.getTime() + targetDays * 86400000);
    const daysRemaining = targetDays - daysSinceLive;

    let status: MilestoneScheduleItem["status"] = "UPCOMING";
    let badgeLabel = "";
    let badgeClass = "";
    let isDue = false;
    let isOverdue = false;

    if (isLogged) {
      status = "COMPLETED";
      badgeLabel = "Logged ✓";
      badgeClass = "bg-emerald-50 text-emerald-800 border-emerald-200 font-extrabold";
    } else if (daysRemaining === 0) {
      status = "DUE_TODAY";
      isDue = true;
      badgeLabel = "Due Today";
      badgeClass = "bg-amber-100 text-amber-900 border-amber-300 font-black animate-pulse";
    } else if (daysRemaining < 0) {
      status = "OVERDUE";
      isDue = true;
      isOverdue = true;
      const daysAgo = Math.abs(daysRemaining);
      badgeLabel = `${daysAgo}d Overdue`;
      badgeClass = "bg-rose-100 text-rose-800 border-rose-300 font-black";
    } else {
      status = "UPCOMING";
      badgeLabel = `In ${daysRemaining}d`;
      badgeClass = "bg-blue-50 text-[#0052FF] border-blue-200 font-bold";
    }

    return {
      milestone,
      title,
      label: title,
      shortLabel,
      tag,
      subtitle,
      targetDays,
      targetDate,
      targetDateFormatted: formatDateDisplay(targetDate),
      formattedTargetDate: formatDateDisplay(targetDate),
      isLogged,
      isDue,
      isOverdue,
      daysRemaining,
      status,
      badgeLabel,
      badgeClass,
    };
  };

  const day7Item = buildItem("7d", "7-Day Velocity", "Day 7", "7D", "Launch Velocity", 7, day7Logged);
  const day15Item = buildItem("15d", "15-Day Mid-Flight", "Day 15", "15D", "Mid-Flight Scale", 15, day15Logged);
  const day30Item = buildItem("30d", "30-Day Wrap", "Day 30", "30D", "Mature Wrap", 30, day30Logged);

  // Determine what is the immediate active next action
  let activeMilestone: "7d" | "15d" | "30d" | null = null;
  let nextActionMilestone: MilestoneScheduleItem | null = null;

  if (!day7Logged) {
    activeMilestone = "7d";
    nextActionMilestone = day7Item;
  } else if (!day15Logged) {
    activeMilestone = "15d";
    nextActionMilestone = day15Item;
  } else if (!day30Logged) {
    activeMilestone = "30d";
    nextActionMilestone = day30Item;
  }

  const hasActionRequired = Boolean(
    (!day7Logged && (day7Item.isDue || day7Item.isOverdue)) ||
    (!day15Logged && (day15Item.isDue || day15Item.isOverdue)) ||
    (!day30Logged && (day30Item.isDue || day30Item.isOverdue))
  );

  const allMilestonesCompleted = day7Logged && day15Logged && day30Logged;

  // Synthesize overall badge
  let overallBadge: CreatorMilestoneSummary["overallStatusBadge"];

  if (allMilestonesCompleted) {
    overallBadge = {
      label: "All Milestones Completed 🏆",
      sublabel: "Day 7, 15, and 30 mature insights verified",
      badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-200",
      urgency: "none",
    };
  } else if (hasActionRequired && nextActionMilestone) {
    const isOverdue = nextActionMilestone.isOverdue;
    overallBadge = {
      label: isOverdue ? `${nextActionMilestone.title} Overdue!` : `${nextActionMilestone.title} Due Today!`,
      sublabel: `Target was ${nextActionMilestone.targetDateFormatted}`,
      badgeClass: isOverdue ? "bg-rose-50 text-rose-800 border-rose-300 ring-1 ring-rose-200" : "bg-amber-50 text-amber-800 border-amber-300",
      urgency: isOverdue ? "high" : "medium",
    };
  } else if (nextActionMilestone) {
    overallBadge = {
      label: `${nextActionMilestone.title} in ${nextActionMilestone.daysRemaining}d`,
      sublabel: `Target: ${nextActionMilestone.targetDateFormatted}`,
      badgeClass: "bg-blue-50 text-blue-800 border-blue-200",
      urgency: "low",
    };
  } else {
    overallBadge = {
      label: "Active Reel",
      sublabel: `Live ${daysSinceLive} days`,
      badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
      urgency: "none",
    };
  }

  return {
    creatorId: String(deliverable.id),
    creatorName: deliverable.creator_name,
    liveDate,
    liveDateFormatted: formatDateDisplay(liveDate),
    daysSinceLive,
    milestones: {
      day7: day7Item,
      day15: day15Item,
      day30: day30Item,
    },
    activeMilestone,
    nextActionMilestone,
    hasActionRequired,
    allMilestonesCompleted,
    overallStatusBadge: overallBadge,
  };
}
