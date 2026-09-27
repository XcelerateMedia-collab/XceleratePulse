import { CreatorDeliverableBrandView, CreatorDeliverableInternal } from "./types";

export interface CreatorProofItem {
  url: string;
  originalUrl: string;
  milestone: "7d" | "15d" | "30d" | "overall";
  badge: string;
  milestoneLabel: string;
  title: string;
}

/**
 * Safely parse screenshot JSON string or single URL string into an array of URLs
 */
export function parseScreenshotUrls(str?: string): string[] {
  if (!str || !str.trim() || str === "[]") return [];
  const trimmed = str.trim();
  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.filter((u): u is string => typeof u === "string" && u.trim().length > 0);
      }
    } catch {
      return [];
    }
  }
  return [trimmed];
}

/**
 * Format Google Drive URLs into fast, reliable high-res thumbnails for <img> tags
 */
export function formatScreenshotUrl(url: string): string {
  if (!url) return "";
  const s = url.trim();
  const fileMatch = s.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileMatch && fileMatch[1]) {
    return `https://drive.google.com/thumbnail?id=${fileMatch[1]}&sz=w1600`;
  }
  const idMatch = s.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idMatch && idMatch[1] && s.includes("drive.google.com")) {
    return `https://drive.google.com/thumbnail?id=${idMatch[1]}&sz=w1600`;
  }
  return s;
}

/**
 * Extract all proof screenshots attached to a specific creator across all milestone windows
 */
export function getCreatorProofScreenshots(
  creator: CreatorDeliverableBrandView | CreatorDeliverableInternal
): CreatorProofItem[] {
  const int = creator as CreatorDeliverableInternal;
  const list: CreatorProofItem[] = [];

  // Day 7 Proofs
  const day7Urls = parseScreenshotUrls(int.day7_screenshot);
  day7Urls.forEach((u, i) => {
    list.push({
      url: formatScreenshotUrl(u),
      originalUrl: u,
      milestone: "7d",
      badge: day7Urls.length > 1 ? `⚡ 7D Proof #${i + 1}` : "⚡ 7-Day Proof",
      milestoneLabel: "Day 7 Velocity",
      title: `${creator.creator_name} - Day 7 Insights`
    });
  });

  // Day 15 Proofs
  const day15Urls = parseScreenshotUrls(int.day15_screenshot);
  day15Urls.forEach((u, i) => {
    list.push({
      url: formatScreenshotUrl(u),
      originalUrl: u,
      milestone: "15d",
      badge: day15Urls.length > 1 ? `🚀 15D Proof #${i + 1}` : "🚀 15-Day Proof",
      milestoneLabel: "Day 15 Mid-Flight",
      title: `${creator.creator_name} - Day 15 Insights`
    });
  });

  // Day 30 Proofs
  const day30Urls = parseScreenshotUrls(int.day30_screenshot);
  day30Urls.forEach((u, i) => {
    list.push({
      url: formatScreenshotUrl(u),
      originalUrl: u,
      milestone: "30d",
      badge: day30Urls.length > 1 ? `🏆 30D Proof #${i + 1}` : "🏆 30-Day Proof",
      milestoneLabel: "Day 30 Wrap",
      title: `${creator.creator_name} - Day 30 Insights`
    });
  });

  // Overall Reel Proofs
  const overallUrls = parseScreenshotUrls(creator.screenshots);
  overallUrls.forEach((u, i) => {
    list.push({
      url: formatScreenshotUrl(u),
      originalUrl: u,
      milestone: "overall",
      badge: overallUrls.length > 1 ? `📊 Reel Proof #${i + 1}` : "📊 Reel Proof",
      milestoneLabel: "Overall Reel",
      title: `${creator.creator_name} - Reel Insights`
    });
  });

  return list;
}
