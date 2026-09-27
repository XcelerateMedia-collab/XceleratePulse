"use client";

import React, { useState, useMemo } from "react";
import { 
  BarChart3, 
  TrendingUp, 
  Eye, 
  Share2, 
  Bookmark, 
  MessageCircle, 
  Heart, 
  Image as ImageIcon,
  Download,
  Award,
  Sparkles,
  ExternalLink,
  Search,
  Filter,
  Users,
  Compass,
  CheckCircle2,
  Calendar,
  Camera,
  ChevronLeft,
  ChevronRight,
  Pencil,
  FileImage,
  X,
  Plus,
  AlertCircle,
  Clock,
  Zap,
  Rocket,
  ArrowRight
} from "lucide-react";
import { CreatorDeliverableBrandView, CreatorDeliverableInternal, Role } from "@/lib/types";
import { PerformanceMetricsEditor } from "./PerformanceMetricsEditor";
import { calculateCreatorMilestones, formatDateDisplay } from "@/lib/milestones";
import { ScreenshotLightboxModal, ScreenshotLightboxState } from "./ScreenshotLightboxModal";
import { getCreatorProofScreenshots, parseScreenshotUrls, formatScreenshotUrl } from "@/lib/screenshot-utils";

interface PerformanceAnalyticsViewProps {
  deliverables: (CreatorDeliverableBrandView | CreatorDeliverableInternal)[];
  campaignName: string;
  role?: Role;
  isInternal?: boolean;
  onDeliverableUpdated?: () => void;
}

export const PerformanceAnalyticsView: React.FC<PerformanceAnalyticsViewProps> = React.memo(({
  deliverables,
  campaignName,
  role = "BRAND_CLIENT",
  isInternal = false,
  onDeliverableUpdated,
}) => {
  const [activeMilestone, setActiveMilestone] = useState<"overall" | "7d" | "15d" | "30d">("overall");
  const [selectedScreenshot, setSelectedScreenshot] = useState<{
    urls: string[];
    currentIndex: number;
    title: string;
    tag: string;
  } | null>(null);

  // Keyboard navigation for screenshot lightbox
  React.useEffect(() => {
    if (!selectedScreenshot) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedScreenshot(null);
      } else if (e.key === "ArrowLeft") {
        setSelectedScreenshot(prev => (prev && prev.currentIndex > 0 ? { ...prev, currentIndex: prev.currentIndex - 1 } : prev));
      } else if (e.key === "ArrowRight") {
        setSelectedScreenshot(prev => (prev && prev.currentIndex < prev.urls.length - 1 ? { ...prev, currentIndex: prev.currentIndex + 1 } : prev));
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedScreenshot]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<"views" | "er" | "reach" | "interactions">("views");
  const [metricsStatusFilter, setMetricsStatusFilter] = useState<"ALL" | "LOGGED" | "MISSING" | "DUE_NOW">("ALL");
  
  // Pre-calculate creator milestones & summaries once per deliverables update for O(1) instant lookups
  const { milestonesMap, milestonesDueSummary } = useMemo(() => {
    const map = new Map<string, ReturnType<typeof calculateCreatorMilestones>>();
    let due7d = 0;
    let due15d = 0;
    let due30d = 0;
    let upcomingCount = 0;
    let allCompletedCount = 0;

    for (let i = 0; i < deliverables.length; i++) {
      const d = deliverables[i];
      const ms = calculateCreatorMilestones(d);
      map.set(d.id, ms);

      if (ms.allMilestonesCompleted) {
        allCompletedCount++;
        continue;
      }
      if (ms.hasActionRequired) {
        if (ms.milestones.day7.isDue || ms.milestones.day7.isOverdue) due7d++;
        else if (ms.milestones.day15.isDue || ms.milestones.day15.isOverdue) due15d++;
        else if (ms.milestones.day30.isDue || ms.milestones.day30.isOverdue) due30d++;
      } else if (ms.nextActionMilestone && ms.nextActionMilestone.daysRemaining <= 7) {
        upcomingCount++;
      }
    }

    return {
      milestonesMap: map,
      milestonesDueSummary: {
        totalDue: due7d + due15d + due30d,
        due7d,
        due15d,
        due30d,
        upcomingCount,
        allCompletedCount,
      },
    };
  }, [deliverables]);

  // Pre-index proof screenshots per creator for zero-latency clicks and table renders
  const proofsMap = useMemo(() => {
    const map = new Map<string, ReturnType<typeof getCreatorProofScreenshots>>();
    for (let i = 0; i < deliverables.length; i++) {
      map.set(deliverables[i].id, getCreatorProofScreenshots(deliverables[i]));
    }
    return map;
  }, [deliverables]);
  
  // Pagination State for Leaderboard Table (Fixes website stretching)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(15);

  // Creator selected for inline logging modal
  const [editingCreator, setEditingCreator] = useState<CreatorDeliverableInternal | null>(null);
  const [editingInitialTab, setEditingInitialTab] = useState<"overall" | "7d" | "15d" | "30d" | "all">("overall");
  const scrollToLeaderboard = () => {
    const el = document.getElementById("creator-reel-performance-leaderboard");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const canEditMetrics = role === "SUPER_ADMIN" || role === "INTERNAL_OPS" || role === "EMPLOYEE" || role === "PERFORMANCE_ANALYST";

  // Memoized Aggregated Overall & Milestone Totals for optimal render performance
  const {
    totalViews,
    totalLikes,
    totalComments,
    totalSaves,
    totalShares,
    totalReach,
    totalInteractions,
    day7TotalViews,
    day15TotalViews,
    day30TotalViews,
    day7LoggedCount,
    day15LoggedCount,
    day30LoggedCount,
    day7ScreenshotCount,
    day15ScreenshotCount,
    day30ScreenshotCount,
    day7AvgEr,
    day15AvgEr,
    day30AvgEr,
    liveCreatorsCount,
    overallAvgEr,
  } = useMemo(() => {
    let tViews = 0;
    let tLikes = 0;
    let tComments = 0;
    let tSaves = 0;
    let tShares = 0;
    let tReach = 0;

    let d7Views = 0;
    let d15Views = 0;
    let d30Views = 0;

    let d7Logged = 0;
    let d15Logged = 0;
    let d30Logged = 0;

    let d7Screenshots = 0;
    let d15Screenshots = 0;
    let d30Screenshots = 0;

    let d7ErSum = 0;
    let d15ErSum = 0;
    let d30ErSum = 0;

    let liveCount = 0;
    let erSum = 0;

    for (let i = 0; i < deliverables.length; i++) {
      const d = deliverables[i];
      const int = d as CreatorDeliverableInternal;

      tViews += d.total_views || 0;
      tLikes += d.likes || 0;
      tComments += d.comments || 0;
      tSaves += d.saves || 0;
      tShares += d.shares || 0;
      tReach += d.account_reach || 0;

      if ((d.total_views || 0) > 0 || d.live_link) {
        liveCount++;
        erSum += d.engagement_rate || 0;
      }

      if ((int.day7_views || 0) > 0 || int.day7_screenshot) {
        d7Logged++;
        d7ErSum += int.day7_er || 0;
      }
      d7Views += int.day7_views || 0;
      d7Screenshots += parseScreenshotUrls(int.day7_screenshot).length;

      if ((int.day15_views || 0) > 0 || int.day15_screenshot) {
        d15Logged++;
        d15ErSum += int.day15_er || 0;
      }
      d15Views += int.day15_views || 0;
      d15Screenshots += parseScreenshotUrls(int.day15_screenshot).length;

      if ((int.day30_views || 0) > 0 || int.day30_screenshot) {
        d30Logged++;
        d30ErSum += int.day30_er || 0;
      }
      d30Views += int.day30_views || 0;
      d30Screenshots += parseScreenshotUrls(int.day30_screenshot).length;
    }

    return {
      totalViews: tViews,
      totalLikes: tLikes,
      totalComments: tComments,
      totalSaves: tSaves,
      totalShares: tShares,
      totalReach: tReach,
      totalInteractions: tLikes + tComments + tSaves + tShares,
      day7TotalViews: d7Views,
      day15TotalViews: d15Views,
      day30TotalViews: d30Views,
      day7LoggedCount: d7Logged,
      day15LoggedCount: d15Logged,
      day30LoggedCount: d30Logged,
      day7ScreenshotCount: d7Screenshots,
      day15ScreenshotCount: d15Screenshots,
      day30ScreenshotCount: d30Screenshots,
      day7AvgEr: d7Logged > 0 ? (d7ErSum / d7Logged).toFixed(2) : "0.00",
      day15AvgEr: d15Logged > 0 ? (d15ErSum / d15Logged).toFixed(2) : "0.00",
      day30AvgEr: d30Logged > 0 ? (d30ErSum / d30Logged).toFixed(2) : "0.00",
      liveCreatorsCount: liveCount,
      overallAvgEr: liveCount > 0 ? (erSum / liveCount).toFixed(2) : "0.00",
    };
  }, [deliverables]);



  const formatNumber = (num: number) => {
    if (!num) return "0";
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(2) + "M";
    if (num >= 1_000) return (num / 1_000).toFixed(1) + "K";
    return num.toLocaleString();
  };

  // Helper to determine if a creator has verified metrics logged for the selected milestone window
  const hasMetricsLogged = (d: CreatorDeliverableBrandView | CreatorDeliverableInternal, milestone: "overall" | "7d" | "15d" | "30d") => {
    const internal = d as CreatorDeliverableInternal;
    if (milestone === "7d") {
      return (internal.day7_views || 0) > 0 || (internal.day7_er || 0) > 0 || Boolean(internal.day7_screenshot && internal.day7_screenshot !== "[]");
    }
    if (milestone === "15d") {
      return (internal.day15_views || 0) > 0 || (internal.day15_er || 0) > 0 || Boolean(internal.day15_screenshot && internal.day15_screenshot !== "[]");
    }
    if (milestone === "30d") {
      return (internal.day30_views || 0) > 0 || (internal.day30_er || 0) > 0 || Boolean(internal.day30_screenshot && internal.day30_screenshot !== "[]");
    }
    // Overall: any views, reach, reactions, ER, or screenshots
    return (
      (d.total_views || 0) > 0 ||
      (d.likes || 0) > 0 ||
      (d.comments || 0) > 0 ||
      (d.saves || 0) > 0 ||
      (d.shares || 0) > 0 ||
      (d.account_reach || 0) > 0 ||
      (d.engagement_rate || 0) > 0 ||
      Boolean(d.screenshots && d.screenshots !== "[]")
    );
  };

  // Real-time metric logging tallies for the current milestone
  const loggedMetricsCount = useMemo(() => {
    return deliverables.filter((d) => hasMetricsLogged(d, activeMilestone)).length;
  }, [deliverables, activeMilestone]);

  const missingMetricsCount = Math.max(0, deliverables.length - loggedMetricsCount);

  // Filter & Sort Leaderboard
  const filteredLeaderboard = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return deliverables
      .filter((d) => {
        const hasData = hasMetricsLogged(d, activeMilestone);
        if (metricsStatusFilter === "LOGGED") return hasData;
        if (metricsStatusFilter === "MISSING") return !hasData;
        if (metricsStatusFilter === "DUE_NOW") {
          const ms = milestonesMap.get(d.id);
          return ms ? ms.hasActionRequired : false;
        }
        return true;
      })
      .filter((d) => {
        const matchesSearch =
          !q ||
          d.creator_name.toLowerCase().includes(q) ||
          d.niche.toLowerCase().includes(q) ||
          d.category.toLowerCase().includes(q);

        const cat = (d.category || "").trim().toLowerCase();
        const matchesCategory =
          categoryFilter === "ALL" ||
          cat === categoryFilter.toLowerCase() ||
          (categoryFilter.toLowerCase() === "mega" && d.followers_count >= 1_000_000) ||
          (categoryFilter.toLowerCase() === "macro" && d.followers_count >= 100_000 && d.followers_count < 1_000_000) ||
          (categoryFilter.toLowerCase() === "micro" && d.followers_count >= 10_000 && d.followers_count < 100_000) ||
          (categoryFilter.toLowerCase() === "nano" && d.followers_count < 10_000);

        return matchesSearch && matchesCategory;
      })
      .sort((a, b) => {
        if (metricsStatusFilter === "DUE_NOW") {
          const msA = milestonesMap.get(a.id);
          const msB = milestonesMap.get(b.id);
          const urgencyA = msA?.nextActionMilestone?.isOverdue ? 2 : msA?.nextActionMilestone?.isDue ? 1 : 0;
          const urgencyB = msB?.nextActionMilestone?.isOverdue ? 2 : msB?.nextActionMilestone?.isDue ? 1 : 0;
          if (urgencyB !== urgencyA) return urgencyB - urgencyA;
        }

        const hasA = hasMetricsLogged(a, activeMilestone);
        const hasB = hasMetricsLogged(b, activeMilestone);
        if (hasA && !hasB) return -1;
        if (!hasA && hasB) return 1;

        const intA = a as CreatorDeliverableInternal;
        const intB = b as CreatorDeliverableInternal;

        if (activeMilestone === "7d") {
          if (sortBy === "er") return (intB.day7_er || 0) - (intA.day7_er || 0);
          return (intB.day7_views || 0) - (intA.day7_views || 0);
        }
        if (activeMilestone === "15d") {
          if (sortBy === "er") return (intB.day15_er || 0) - (intA.day15_er || 0);
          return (intB.day15_views || 0) - (intA.day15_views || 0);
        }
        if (activeMilestone === "30d") {
          if (sortBy === "er") return (intB.day30_er || 0) - (intA.day30_er || 0);
          return (intB.day30_views || 0) - (intA.day30_views || 0);
        }

        // Overall sorting
        if (sortBy === "er") return (b.engagement_rate || 0) - (a.engagement_rate || 0);
        if (sortBy === "reach") return (b.account_reach || 0) - (a.account_reach || 0);
        if (sortBy === "interactions") {
          const sumB = (b.likes || 0) + (b.comments || 0) + (b.saves || 0) + (b.shares || 0);
          const sumA = (a.likes || 0) + (a.comments || 0) + (a.saves || 0) + (a.shares || 0);
          return sumB - sumA;
        }
        return (b.total_views || 0) - (a.total_views || 0);
      });
  }, [deliverables, searchQuery, categoryFilter, sortBy, activeMilestone, metricsStatusFilter, milestonesMap]);

  // Pagination Calculations
  const totalPages = Math.ceil(filteredLeaderboard.length / pageSize) || 1;
  const safeCurrentPage = Math.min(Math.max(currentPage, 1), totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredLeaderboard.length);
  const paginatedCreators = filteredLeaderboard.slice(startIndex, endIndex);

  const exportCsv = () => {
    const headers = [
      "Creator Name", "Category", "Niche", "Deliverables",
      "Day 7 Views", "Day 7 ER %", "Day 7 Screenshot",
      "Day 15 Views", "Day 15 ER %", "Day 15 Screenshot",
      "Day 30 Views", "Day 30 ER %", "Day 30 Screenshot",
      "Total Views", "Likes", "Comments", "Saves", "Shares", "Avg Watch Time", "Overall ER %", "Account Reach", "Live Link"
    ];

    const rows = deliverables.map(d => {
      const int = d as CreatorDeliverableInternal;
      return [
        `"${d.creator_name}"`,
        `"${d.category}"`,
        `"${d.niche}"`,
        `"${d.deliverables}"`,
        int.day7_views || 0,
        int.day7_er || 0,
        `"${int.day7_screenshot || ""}"`,
        int.day15_views || 0,
        int.day15_er || 0,
        `"${int.day15_screenshot || ""}"`,
        int.day30_views || 0,
        int.day30_er || 0,
        `"${int.day30_screenshot || ""}"`,
        d.total_views || 0,
        d.likes || 0,
        d.comments || 0,
        d.saves || 0,
        d.shares || 0,
        `"${d.avg_watch_time || "-"}"`,
        d.engagement_rate || 0,
        d.account_reach || 0,
        `"${d.live_link || ""}"`
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${campaignName.replace(/[^a-z0-9]/gi, "_")}_Performance_MultiMilestone_Report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      
      {/* ── Top Header & Milestone Selector ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
        <div>
          <h3 className="text-base font-extrabold text-slate-900 flex items-center space-x-2">
            <BarChart3 className="w-5 h-5 text-[#0052FF]" />
            <span>Multi-Day Performance &amp; Milestone Tracking</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">
            Track and log reel performance at 7 Days, 15 Days, 30 Days, and Overall Mature reach directly on the platform.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Milestone Tabs */}
          <div className="flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold shadow-2xs">
            <button
              onClick={() => { setActiveMilestone("overall"); setCurrentPage(1); }}
              className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeMilestone === "overall" ? "bg-white text-[#0052FF] shadow-xs font-extrabold" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              📊 Overall Mature
            </button>
            <button
              onClick={() => { setActiveMilestone("7d"); setCurrentPage(1); }}
              className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeMilestone === "7d" ? "bg-white text-[#0052FF] shadow-xs font-extrabold" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              ⚡ 7 Days
            </button>
            <button
              onClick={() => { setActiveMilestone("15d"); setCurrentPage(1); }}
              className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeMilestone === "15d" ? "bg-white text-[#0052FF] shadow-xs font-extrabold" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              🚀 15 Days
            </button>
            <button
              onClick={() => { setActiveMilestone("30d"); setCurrentPage(1); }}
              className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeMilestone === "30d" ? "bg-white text-[#0052FF] shadow-xs font-extrabold" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              🏆 30 Days
            </button>
          </div>

          {/* Export Report */}
          <button
            onClick={exportCsv}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-bold text-white shadow-xs transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* ── Dynamic KPI Summary Cards Based on Selected Milestone ── */}
      {activeMilestone === "overall" ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Views */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-blue-200 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Reel Views</span>
                <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-[#0052FF]">
                  <Eye className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-black text-slate-900 mt-2 tracking-tight">
                {formatNumber(totalViews)}
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 font-medium">
                <span>Across {liveCreatorsCount} active reel(s)</span>
                <span className="font-bold text-[#0052FF]">Mature Total</span>
              </div>
            </div>

            {/* Account Reach */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-cyan-200 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Unique Account Reach</span>
                <div className="w-8 h-8 rounded-xl bg-cyan-50 flex items-center justify-center text-cyan-600">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-black text-slate-900 mt-2 tracking-tight">
                {formatNumber(totalReach)}
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 font-medium">
                <span>Instagram viewer impressions</span>
                <span className="font-bold text-cyan-600">Audience</span>
              </div>
            </div>

            {/* Overall Avg ER */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-emerald-200 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Avg Engagement Rate</span>
                <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-black text-emerald-600 mt-2 tracking-tight">
                {overallAvgEr}%
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 font-medium">
                <span>Interactions per view ratio</span>
                <span className="font-bold text-emerald-600">High Impact</span>
              </div>
            </div>

            {/* Total Interactions */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-indigo-200 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Interactions</span>
                <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <Compass className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-black text-slate-900 mt-2 tracking-tight">
                {formatNumber(totalInteractions)}
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 font-medium">
                <span>Likes, comments, saves &amp; shares</span>
                <span className="font-bold text-indigo-600">Reactions</span>
              </div>
            </div>
          </div>

          {/* Reactions Breakdown */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
              <div className="flex items-center space-x-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <Heart className="w-4 h-4 text-pink-500" />
                <span>Likes</span>
              </div>
              <div className="text-2xl font-black text-slate-900 mt-1.5">{formatNumber(totalLikes)}</div>
              <div className="text-[11px] text-slate-500 mt-0.5 font-medium">Organic appreciation</div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
              <div className="flex items-center space-x-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <MessageCircle className="w-4 h-4 text-cyan-600" />
                <span>Comments</span>
              </div>
              <div className="text-2xl font-black text-slate-900 mt-1.5">{formatNumber(totalComments)}</div>
              <div className="text-[11px] text-slate-500 mt-0.5 font-medium">Direct conversations</div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
              <div className="flex items-center space-x-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <Bookmark className="w-4 h-4 text-amber-600" />
                <span>Saves</span>
              </div>
              <div className="text-2xl font-black text-slate-900 mt-1.5">{formatNumber(totalSaves)}</div>
              <div className="text-[11px] text-amber-700 mt-0.5 font-bold">Purchase &amp; intent signal</div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
              <div className="flex items-center space-x-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <Share2 className="w-4 h-4 text-[#0052FF]" />
                <span>Shares</span>
              </div>
              <div className="text-2xl font-black text-slate-900 mt-1.5">{formatNumber(totalShares)}</div>
              <div className="text-[11px] text-[#0052FF] mt-0.5 font-bold">Viral propagation</div>
            </div>
          </div>
        </div>
      ) : activeMilestone === "7d" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-50/60 to-white border border-blue-200/90 shadow-xs">
            <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">Day 7 Total Views</span>
            <div className="text-3xl font-black text-slate-900 mt-2 tracking-tight">
              {formatNumber(day7TotalViews)}
            </div>
            <div className="text-[11px] text-slate-500 mt-2 font-medium">Launch week organic velocity</div>
          </div>

          <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-50/60 to-white border border-emerald-200/90 shadow-xs">
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Day 7 Avg ER (%)</span>
            <div className="text-3xl font-black text-emerald-600 mt-2 tracking-tight">
              {day7AvgEr}%
            </div>
            <div className="text-[11px] text-slate-500 mt-2 font-medium">Initial audience engagement response</div>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Logged Creators</span>
            <div className="text-3xl font-black text-slate-900 mt-2 tracking-tight">
              {day7LoggedCount} <span className="text-sm font-semibold text-slate-400">/ {deliverables.length}</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-2 font-medium">Creators with Day 7 data filled</div>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Verified Screenshots</span>
            <div className="text-3xl font-black text-[#0052FF] mt-2 tracking-tight">
              {day7ScreenshotCount}
            </div>
            <div className="text-[11px] text-slate-500 mt-2 font-medium">Day 7 Insight proofs on record</div>
          </div>
        </div>
      ) : activeMilestone === "15d" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-gradient-to-br from-cyan-50/60 to-white border border-cyan-200/90 shadow-xs">
            <span className="text-xs font-bold text-cyan-700 uppercase tracking-wider">Day 15 Total Views</span>
            <div className="text-3xl font-black text-slate-900 mt-2 tracking-tight">
              {formatNumber(day15TotalViews)}
            </div>
            <div className="text-[11px] text-slate-500 mt-2 font-medium">Algorithm expansion mid-flight total</div>
          </div>

          <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-50/60 to-white border border-emerald-200/90 shadow-xs">
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Day 15 Avg ER (%)</span>
            <div className="text-3xl font-black text-emerald-600 mt-2 tracking-tight">
              {day15AvgEr}%
            </div>
            <div className="text-[11px] text-slate-500 mt-2 font-medium">Sustained mid-flight engagement</div>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Logged Creators</span>
            <div className="text-3xl font-black text-slate-900 mt-2 tracking-tight">
              {day15LoggedCount} <span className="text-sm font-semibold text-slate-400">/ {deliverables.length}</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-2 font-medium">Creators with Day 15 data filled</div>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Verified Screenshots</span>
            <div className="text-3xl font-black text-[#00A3FF] mt-2 tracking-tight">
              {day15ScreenshotCount}
            </div>
            <div className="text-[11px] text-slate-500 mt-2 font-medium">Day 15 Insight proofs on record</div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-50/60 to-white border border-emerald-200/90 shadow-xs">
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Day 30 Total Views</span>
            <div className="text-3xl font-black text-slate-900 mt-2 tracking-tight">
              {formatNumber(day30TotalViews || totalViews)}
            </div>
            <div className="text-[11px] text-slate-500 mt-2 font-medium">Evergreen mature campaign wrap</div>
          </div>

          <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-50/60 to-white border border-emerald-200/90 shadow-xs">
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Day 30 Avg ER (%)</span>
            <div className="text-3xl font-black text-emerald-600 mt-2 tracking-tight">
              {day30AvgEr || overallAvgEr}%
            </div>
            <div className="text-[11px] text-slate-500 mt-2 font-medium">Mature engagement benchmark</div>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Logged Creators</span>
            <div className="text-3xl font-black text-slate-900 mt-2 tracking-tight">
              {day30LoggedCount} <span className="text-sm font-semibold text-slate-400">/ {deliverables.length}</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-2 font-medium">Creators with Day 30 data filled</div>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Verified Screenshots</span>
            <div className="text-3xl font-black text-emerald-600 mt-2 tracking-tight">
              {day30ScreenshotCount}
            </div>
            <div className="text-[11px] text-slate-500 mt-2 font-medium">Day 30 Insight proofs on record</div>
          </div>
        </div>
      )}



      {/* ── Creator Reel Performance Leaderboard (WITH CONTAINED SCROLL & PAGINATION) ── */}
      <div id="creator-reel-performance-leaderboard" className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
        
        {/* Leaderboard Controls Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <Award className="w-5 h-5 text-amber-500" />
            <div>
              <h4 className="text-sm font-black text-slate-900">
                Creator Reel Performance Leaderboard
              </h4>
              <p className="text-[11px] text-slate-500 font-medium">
                {activeMilestone === "overall" ? "Overall Real-Time Metrics" : `${activeMilestone.toUpperCase()} Milestone Performance Window`}
              </p>
            </div>
          </div>

          {/* Quick Metrics Status Filter: All / Due Now / With Metrics / No Metrics */}
          <div className="flex items-center p-1 rounded-xl bg-slate-100/90 border border-slate-200 text-xs font-bold gap-1">
            <button
              type="button"
              onClick={() => { setMetricsStatusFilter("ALL"); setCurrentPage(1); }}
              className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center space-x-1.5 ${
                metricsStatusFilter === "ALL"
                  ? "bg-white text-slate-900 shadow-xs font-black ring-1 ring-slate-200/60"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
              }`}
            >
              <span>All Creators</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                metricsStatusFilter === "ALL" ? "bg-slate-100 text-slate-900 font-black" : "bg-slate-200/70 text-slate-600 font-bold"
              }`}>
                {deliverables.length}
              </span>
            </button>

            {milestonesDueSummary.totalDue > 0 && (
              <button
                type="button"
                onClick={() => { setMetricsStatusFilter("DUE_NOW"); setCurrentPage(1); }}
                className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center space-x-1.5 ${
                  metricsStatusFilter === "DUE_NOW"
                    ? "bg-amber-500 text-white shadow-xs font-black"
                    : "text-amber-700 hover:text-amber-900 hover:bg-amber-100/60"
                }`}
              >
                <Zap className={`w-3.5 h-3.5 shrink-0 ${metricsStatusFilter === "DUE_NOW" ? "text-white fill-white" : "text-amber-500 fill-amber-500"}`} />
                <span>Due Now</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  metricsStatusFilter === "DUE_NOW" ? "bg-white text-amber-700" : "bg-amber-200 text-amber-900 animate-pulse"
                }`}>
                  {milestonesDueSummary.totalDue}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={() => { setMetricsStatusFilter("LOGGED"); setCurrentPage(1); }}
              className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center space-x-1.5 ${
                metricsStatusFilter === "LOGGED"
                  ? "bg-white text-emerald-700 shadow-xs font-black ring-1 ring-slate-200/60"
                  : "text-slate-600 hover:text-emerald-700 hover:bg-slate-200/50"
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>With Metrics</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                metricsStatusFilter === "LOGGED" ? "bg-emerald-100 text-emerald-800 font-black" : "bg-slate-200/70 text-slate-600 font-bold"
              }`}>
                {loggedMetricsCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => { setMetricsStatusFilter("MISSING"); setCurrentPage(1); }}
              className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center space-x-1.5 ${
                metricsStatusFilter === "MISSING"
                  ? "bg-white text-amber-800 shadow-xs font-black ring-1 ring-amber-300"
                  : "text-slate-600 hover:text-amber-800 hover:bg-amber-100/50"
              }`}
            >
              <AlertCircle className={`w-3.5 h-3.5 shrink-0 ${missingMetricsCount > 0 ? "text-amber-500" : "text-slate-400"}`} />
              <span>No Metrics</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                missingMetricsCount > 0
                  ? metricsStatusFilter === "MISSING"
                    ? "bg-amber-100 text-amber-900 font-black border border-amber-300"
                    : "bg-amber-100 text-amber-800 font-bold"
                  : "bg-slate-200/70 text-slate-500 font-bold"
              }`}>
                {missingMetricsCount}
              </span>
            </button>
          </div>
          
          <div className="flex flex-wrap items-center gap-2.5 text-xs">
            {/* Search Input */}
            <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200">
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search creator, niche..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                className="bg-transparent border-none text-xs text-slate-900 placeholder-slate-400 focus:outline-none w-36 font-medium"
              />
            </div>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
              className="px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Categories</option>
              <option value="Mega">Mega (1M+)</option>
              <option value="Macro">Macro (100K-1M)</option>
              <option value="Micro">Micro (10K-100K)</option>
              <option value="Nano">Nano (&lt;10K)</option>
            </select>

            {/* Sort Filter */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="views">Sort by Views</option>
              <option value="er">Sort by ER (%)</option>
              <option value="reach">Sort by Reach</option>
              <option value="interactions">Sort by Reactions</option>
            </select>

            {(searchQuery || categoryFilter !== "ALL" || metricsStatusFilter !== "ALL") && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setCategoryFilter("ALL");
                  setMetricsStatusFilter("ALL");
                  setCurrentPage(1);
                }}
                className="px-2 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#0052FF] text-[11px] font-bold transition-all border border-blue-200 cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* ── CONTAINED SCROLL CONTAINER WITH STICKY HEADER ── */}
        <div className="max-h-[580px] overflow-y-auto overflow-x-auto rounded-xl border border-slate-200/90 custom-scrollbar overscroll-contain shadow-2xs">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 bg-slate-50 z-20 border-b border-slate-200 shadow-xs">
              <tr className="text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-3.5 bg-slate-50">Rank &amp; Creator</th>
                <th className="py-3 px-3 bg-slate-50">Milestone Schedule</th>
                {activeMilestone === "overall" ? (
                  <>
                    <th className="py-3 px-3 bg-slate-50">Total Views</th>
                    <th className="py-3 px-3 bg-slate-50">Likes</th>
                    <th className="py-3 px-3 bg-slate-50">Comments</th>
                    <th className="py-3 px-3 bg-slate-50">Saves</th>
                    <th className="py-3 px-3 bg-slate-50">Shares</th>
                    <th className="py-3 px-3 bg-slate-50">Avg Watch Time</th>
                    <th className="py-3 px-3 bg-slate-50">ER (%)</th>
                    <th className="py-3 px-3 bg-slate-50">Account Reach</th>
                  </>
                ) : activeMilestone === "7d" ? (
                  <>
                    <th className="py-3 px-3 bg-slate-50">Day 7 Views</th>
                    <th className="py-3 px-3 bg-slate-50">Day 7 ER (%)</th>
                    <th className="py-3 px-3 bg-slate-50">Day 7 Proof</th>
                    <th className="py-3 px-3 bg-slate-50">Total Mature Views</th>
                  </>
                ) : activeMilestone === "15d" ? (
                  <>
                    <th className="py-3 px-3 bg-slate-50">Day 15 Views</th>
                    <th className="py-3 px-3 bg-slate-50">Day 15 ER (%)</th>
                    <th className="py-3 px-3 bg-slate-50">Day 15 Proof</th>
                    <th className="py-3 px-3 bg-slate-50">Total Mature Views</th>
                  </>
                ) : (
                  <>
                    <th className="py-3 px-3 bg-slate-50">Day 30 Views</th>
                    <th className="py-3 px-3 bg-slate-50">Day 30 ER (%)</th>
                    <th className="py-3 px-3 bg-slate-50">Day 30 Proof</th>
                    <th className="py-3 px-3 bg-slate-50">Total Mature Views</th>
                  </>
                )}
                <th className="py-3 px-3.5 text-right bg-slate-50">Proof / Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {paginatedCreators.map((d, localIdx) => {
                const globalIndex = startIndex + localIdx;
                const int = d as CreatorDeliverableInternal;
                const isLogged = hasMetricsLogged(d, activeMilestone);
                const ms = milestonesMap.get(d.id) || calculateCreatorMilestones(d);
                const creatorProofs = proofsMap.get(d.id) || [];

                return (
                  <tr key={d.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="py-3 px-3.5 align-middle">
                      <div 
                        className={`flex items-center space-x-2.5 ${creatorProofs.length > 0 ? "cursor-pointer group/creator" : ""}`}
                        onClick={() => {
                          if (creatorProofs.length > 0) {
                            setSelectedScreenshot({
                              urls: creatorProofs.map(p => p.url),
                              currentIndex: 0,
                              title: `${d.creator_name} - Verified Proofs`,
                              tag: `📊 ${creatorProofs.length} Proof${creatorProofs.length > 1 ? "s" : ""}`
                            });
                          } else if (canEditMetrics) {
                            setEditingInitialTab(activeMilestone);
                            setEditingCreator(int);
                          }
                        }}
                        title={creatorProofs.length > 0 ? `Click to view ${creatorProofs.length} proof screenshot(s)` : undefined}
                      >
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                          !isLogged ? "bg-slate-100 text-slate-400 border border-slate-200" :
                          globalIndex === 0 ? "bg-amber-100 text-amber-800 border border-amber-300" :
                          globalIndex === 1 ? "bg-slate-200 text-slate-800 border border-slate-300" :
                          globalIndex === 2 ? "bg-amber-50 text-amber-900 border border-amber-200" :
                          "bg-slate-100 text-slate-600"
                        }`}>
                          {isLogged ? globalIndex + 1 : "—"}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center space-x-1.5">
                            <span className={`font-bold text-slate-900 truncate block max-w-[140px] sm:max-w-[180px] ${creatorProofs.length > 0 ? "group-hover/creator:text-[#0052FF]" : ""}`}>
                              {d.creator_name}
                            </span>
                            {creatorProofs.length > 0 && (
                              <span 
                                className="inline-flex items-center space-x-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-blue-50 text-[#0052FF] border border-blue-200 shrink-0"
                                title={`${creatorProofs.length} proof screenshot(s) available`}
                              >
                                <Camera className="w-2.5 h-2.5" />
                                <span>{creatorProofs.length}</span>
                              </span>
                            )}
                            {!isLogged && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-black bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                                No Metrics
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-500 block truncate max-w-[140px]">
                            {d.category} • {d.niche}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Milestone Schedule Column */}
                    <td className="py-3 px-3 align-middle whitespace-nowrap">
                      {ms.allMilestonesCompleted ? (
                        <div className="flex flex-col">
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-800 border border-emerald-200 w-fit">
                            <span>🏆 All Done</span>
                          </span>
                          <span className="text-[9px] text-slate-400 mt-0.5 font-medium">
                            Day {ms.daysSinceLive} mature
                          </span>
                        </div>
                      ) : !ms.liveDate ? (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                          <Clock className="w-2.5 h-2.5" />
                          <span>No Live Date</span>
                        </span>
                      ) : ms.hasActionRequired && ms.nextActionMilestone ? (
                        <div className="flex flex-col">
                          <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold border w-fit ${
                            ms.nextActionMilestone.isOverdue 
                              ? "bg-rose-50 text-rose-700 border-rose-200" 
                              : "bg-amber-50 text-amber-900 border-amber-200"
                          }`}>
                            <Zap className="w-2.5 h-2.5" />
                            <span>
                              {ms.nextActionMilestone.shortLabel} {ms.nextActionMilestone.isOverdue ? `${Math.abs(ms.nextActionMilestone.daysRemaining)}d Overdue` : "Due Today"}
                            </span>
                          </span>
                          <span className="text-[9px] text-slate-500 mt-0.5 font-medium">
                            Target: {ms.nextActionMilestone.formattedTargetDate} • Day {ms.daysSinceLive}
                          </span>
                        </div>
                      ) : ms.nextActionMilestone ? (
                        <div className="flex flex-col">
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 w-fit">
                            <Clock className="w-2.5 h-2.5" />
                            <span>{ms.nextActionMilestone.shortLabel} in {ms.nextActionMilestone.daysRemaining}d</span>
                          </span>
                          <span className="text-[9px] text-slate-500 mt-0.5 font-medium">
                            Target: {ms.nextActionMilestone.formattedTargetDate}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[10px]">—</span>
                      )}
                    </td>

                    {activeMilestone === "overall" ? (
                      <>
                        <td className="py-3 px-3 font-black text-slate-900 text-sm align-middle whitespace-nowrap">
                          {isLogged ? formatNumber(d.total_views || 0) : <span className="text-slate-400 font-medium">—</span>}
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-700 align-middle whitespace-nowrap">
                          {isLogged ? formatNumber(d.likes || 0) : <span className="text-slate-400 font-medium">—</span>}
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-700 align-middle whitespace-nowrap">
                          {isLogged ? formatNumber(d.comments || 0) : <span className="text-slate-400 font-medium">—</span>}
                        </td>
                        <td className="py-3 px-3 font-semibold text-amber-700 align-middle whitespace-nowrap">
                          {isLogged ? formatNumber(d.saves || 0) : <span className="text-slate-400 font-medium">—</span>}
                        </td>
                        <td className="py-3 px-3 font-semibold text-[#0052FF] align-middle whitespace-nowrap">
                          {isLogged ? formatNumber(d.shares || 0) : <span className="text-slate-400 font-medium">—</span>}
                        </td>
                        <td className="py-3 px-3 text-slate-600 font-medium font-mono text-[11px] align-middle whitespace-nowrap">
                          {isLogged && d.avg_watch_time ? d.avg_watch_time : <span className="text-slate-400 font-medium">—</span>}
                        </td>
                        <td className="py-3 px-3 align-middle whitespace-nowrap">
                          {isLogged ? (
                            <span className="px-2 py-0.5 rounded-full font-extrabold text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-200">
                              {d.engagement_rate || 0}%
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full font-semibold text-[10px] bg-slate-100 text-slate-500 border border-slate-200">
                              Pending
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-700 align-middle whitespace-nowrap">
                          {isLogged ? formatNumber(d.account_reach || 0) : <span className="text-slate-400 font-medium">—</span>}
                        </td>
                      </>
                    ) : activeMilestone === "7d" ? (
                      <>
                        <td className="py-3 px-3 font-black text-blue-900 text-sm align-middle whitespace-nowrap">
                          {(int.day7_views || 0) > 0 ? formatNumber(int.day7_views || 0) : <span className="text-slate-400 font-medium">—</span>}
                        </td>
                        <td className="py-3 px-3 align-middle whitespace-nowrap">
                          {(int.day7_er || 0) > 0 ? (
                            <span className="px-2 py-0.5 rounded-full font-extrabold text-[11px] bg-blue-50 text-blue-700 border border-blue-200">
                              {int.day7_er || 0}%
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full font-semibold text-[10px] bg-slate-100 text-slate-500 border border-slate-200">
                              Pending
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 align-middle whitespace-nowrap">
                          {(() => {
                            const urls = parseScreenshotUrls(int.day7_screenshot);
                            if (urls.length > 0) {
                              return (
                                <div className="flex items-center space-x-1.5">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedScreenshot({
                                      urls: urls.map(formatScreenshotUrl),
                                      currentIndex: 0,
                                      title: `${d.creator_name} - Day 7 Screenshot`,
                                      tag: "⚡ 7-Day Proof"
                                    })}
                                    className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-blue-50 text-[#0052FF] hover:bg-blue-100 text-[10px] font-bold border border-blue-200 cursor-pointer shadow-2xs transition-all"
                                  >
                                    <Eye className="w-3 h-3 text-[#0052FF]" />
                                    <span>Proof {urls.length > 1 ? `(${urls.length})` : ""}</span>
                                  </button>
                                  {canEditMetrics && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingInitialTab("7d");
                                        setEditingCreator(int);
                                      }}
                                      className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
                                      title="Edit / Add Day 7 Proofs"
                                    >
                                      <Camera className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              );
                            }
                            if (canEditMetrics) {
                              return (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingInitialTab("7d");
                                    setEditingCreator(int);
                                  }}
                                  className="inline-flex items-center space-x-1 px-2 py-1 rounded-lg bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-[#0052FF] text-[10px] font-bold border border-dashed border-slate-300 hover:border-blue-300 transition-colors cursor-pointer"
                                >
                                  <Camera className="w-3 h-3 text-[#0052FF]" />
                                  <span>+ Upload</span>
                                </button>
                              );
                            }
                            return <span className="text-slate-400 text-[11px]">—</span>;
                          })()}
                        </td>
                        <td className="py-3 px-3 font-medium text-slate-500 align-middle whitespace-nowrap">
                          {(d.total_views || 0) > 0 ? formatNumber(d.total_views || 0) : <span className="text-slate-400 font-medium">—</span>}
                        </td>
                      </>
                    ) : activeMilestone === "15d" ? (
                      <>
                        <td className="py-3 px-3 font-black text-cyan-900 text-sm align-middle whitespace-nowrap">
                          {(int.day15_views || 0) > 0 ? formatNumber(int.day15_views || 0) : <span className="text-slate-400 font-medium">—</span>}
                        </td>
                        <td className="py-3 px-3 align-middle whitespace-nowrap">
                          {(int.day15_er || 0) > 0 ? (
                            <span className="px-2 py-0.5 rounded-full font-extrabold text-[11px] bg-cyan-50 text-cyan-700 border border-cyan-200">
                              {int.day15_er || 0}%
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full font-semibold text-[10px] bg-slate-100 text-slate-500 border border-slate-200">
                              Pending
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 align-middle whitespace-nowrap">
                          {(() => {
                            const urls = parseScreenshotUrls(int.day15_screenshot);
                            if (urls.length > 0) {
                              return (
                                <div className="flex items-center space-x-1.5">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedScreenshot({
                                      urls: urls.map(formatScreenshotUrl),
                                      currentIndex: 0,
                                      title: `${d.creator_name} - Day 15 Screenshot`,
                                      tag: "🚀 15-Day Proof"
                                    })}
                                    className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-cyan-50 text-cyan-700 hover:bg-cyan-100 text-[10px] font-bold border border-cyan-200 cursor-pointer shadow-2xs transition-all"
                                  >
                                    <Eye className="w-3 h-3 text-cyan-600" />
                                    <span>Proof {urls.length > 1 ? `(${urls.length})` : ""}</span>
                                  </button>
                                  {canEditMetrics && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingInitialTab("15d");
                                        setEditingCreator(int);
                                      }}
                                      className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
                                      title="Edit / Add Day 15 Proofs"
                                    >
                                      <Camera className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              );
                            }
                            if (canEditMetrics) {
                              return (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingInitialTab("15d");
                                    setEditingCreator(int);
                                  }}
                                  className="inline-flex items-center space-x-1 px-2 py-1 rounded-lg bg-slate-50 hover:bg-cyan-50 text-slate-600 hover:text-cyan-700 text-[10px] font-bold border border-dashed border-slate-300 hover:border-cyan-300 transition-colors cursor-pointer"
                                >
                                  <Camera className="w-3 h-3 text-cyan-600" />
                                  <span>+ Upload</span>
                                </button>
                              );
                            }
                            return <span className="text-slate-400 text-[11px]">—</span>;
                          })()}
                        </td>
                        <td className="py-3 px-3 font-medium text-slate-500 align-middle whitespace-nowrap">
                          {(d.total_views || 0) > 0 ? formatNumber(d.total_views || 0) : <span className="text-slate-400 font-medium">—</span>}
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="py-3 px-3 font-black text-emerald-900 text-sm align-middle whitespace-nowrap">
                          {(int.day30_views || 0) > 0 ? formatNumber(int.day30_views || 0) : <span className="text-slate-400 font-medium">—</span>}
                        </td>
                        <td className="py-3 px-3 align-middle whitespace-nowrap">
                          {(int.day30_er || 0) > 0 ? (
                            <span className="px-2 py-0.5 rounded-full font-extrabold text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-200">
                              {int.day30_er || 0}%
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full font-semibold text-[10px] bg-slate-100 text-slate-500 border border-slate-200">
                              Pending
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 align-middle whitespace-nowrap">
                          {(() => {
                            const urls = parseScreenshotUrls(int.day30_screenshot);
                            if (urls.length > 0) {
                              return (
                                <div className="flex items-center space-x-1.5">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedScreenshot({
                                      urls: urls.map(formatScreenshotUrl),
                                      currentIndex: 0,
                                      title: `${d.creator_name} - Day 30 Screenshot`,
                                      tag: "🏆 30-Day Proof"
                                    })}
                                    className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-[10px] font-bold border border-emerald-200 cursor-pointer shadow-2xs transition-all"
                                  >
                                    <Eye className="w-3 h-3 text-emerald-600" />
                                    <span>Proof {urls.length > 1 ? `(${urls.length})` : ""}</span>
                                  </button>
                                  {canEditMetrics && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingInitialTab("30d");
                                        setEditingCreator(int);
                                      }}
                                      className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
                                      title="Edit / Add Day 30 Proofs"
                                    >
                                      <Camera className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              );
                            }
                            if (canEditMetrics) {
                              return (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingInitialTab("30d");
                                    setEditingCreator(int);
                                  }}
                                  className="inline-flex items-center space-x-1 px-2 py-1 rounded-lg bg-slate-50 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 text-[10px] font-bold border border-dashed border-slate-300 hover:border-emerald-300 transition-colors cursor-pointer"
                                >
                                  <Camera className="w-3 h-3 text-emerald-600" />
                                  <span>+ Upload</span>
                                </button>
                              );
                            }
                            return <span className="text-slate-400 text-[11px]">—</span>;
                          })()}
                        </td>
                        <td className="py-3 px-3 font-medium text-slate-500 align-middle whitespace-nowrap">
                          {(d.total_views || 0) > 0 ? formatNumber(d.total_views || 0) : <span className="text-slate-400 font-medium">—</span>}
                        </td>
                      </>
                    )}

                    {/* Proof / Actions */}
                    <td className="py-3 px-3.5 text-right align-middle whitespace-nowrap">
                      <div className="flex items-center justify-end space-x-1.5">
                        {/* Overall Proof button: show if viewing Overall Milestone and ANY proofs exist */}
                        {activeMilestone === "overall" && (() => {
                          if (creatorProofs.length === 0) return null;
                          return (
                            <button
                              type="button"
                              onClick={() => setSelectedScreenshot({
                                urls: creatorProofs.map(p => p.url),
                                currentIndex: 0,
                                title: `${d.creator_name} - Verified Proofs`,
                                tag: `📊 ${creatorProofs.length} Proof${creatorProofs.length > 1 ? "s" : ""}`
                              })}
                              className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-blue-50 text-[#0052FF] hover:bg-blue-100 text-[10px] font-bold border border-blue-200 cursor-pointer shadow-2xs transition-all"
                              title="View verified screenshot proofs"
                            >
                              <Camera className="w-3 h-3 text-[#0052FF]" />
                              <span>Proof ({creatorProofs.length})</span>
                            </button>
                          );
                        })()}

                        {canEditMetrics ? (
                          <button
                            type="button"
                            onClick={() => {
                              // If this creator has an action due, directly open that milestone tab!
                              if (ms.hasActionRequired && ms.nextActionMilestone) {
                                setEditingInitialTab(ms.nextActionMilestone.milestone);
                              } else {
                                setEditingInitialTab(activeMilestone);
                              }
                              setEditingCreator(int);
                            }}
                            className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-xl text-[10px] font-bold transition-all cursor-pointer shadow-2xs ${
                              ms.hasActionRequired && ms.nextActionMilestone
                                ? ms.nextActionMilestone.isOverdue
                                  ? "bg-rose-500 hover:bg-rose-600 text-white animate-pulse"
                                  : "bg-amber-500 hover:bg-amber-600 text-white"
                                : !isLogged
                                ? "bg-amber-500 hover:bg-amber-600 text-white"
                                : "bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800"
                            }`}
                            title={
                              ms.hasActionRequired && ms.nextActionMilestone
                                ? `${ms.nextActionMilestone.label} is due! Click to log now.`
                                : !isLogged
                                ? "Log metrics for this creator"
                                : "Edit performance metrics & proof screenshots"
                            }
                          >
                            {ms.hasActionRequired && ms.nextActionMilestone ? (
                              <>
                                <Zap className="w-3 h-3" />
                                <span>+ Log {ms.nextActionMilestone.milestone.toUpperCase()} Due</span>
                              </>
                            ) : !isLogged ? (
                              <>
                                <Plus className="w-3 h-3" />
                                <span>+ Log Metrics</span>
                              </>
                            ) : (
                              <>
                                <Camera className="w-3 h-3 text-emerald-600" />
                                <span>{activeMilestone === "overall" ? "Edit All 8 Metrics" : `Log ${activeMilestone.toUpperCase()} Data`}</span>
                              </>
                            )}
                          </button>
                        ) : !isLogged && (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold">
                            <Clock className="w-3 h-3 text-amber-500" />
                            <span>Awaiting Insights</span>
                          </span>
                        )}

                        {d.live_link ? (
                          <a
                            href={d.live_link}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-blue-50 text-[#0052FF] hover:bg-blue-100 text-[10px] font-bold border border-blue-200"
                          >
                            <span>Reel</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        ) : (
                          <span className="text-slate-400 text-[11px]">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {paginatedCreators.length === 0 && (
                <tr>
                  <td colSpan={activeMilestone === "overall" ? 11 : 7} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Filter className="w-6 h-6 text-slate-300" />
                      <p className="text-xs font-semibold text-slate-700">
                        {metricsStatusFilter === "DUE_NOW"
                          ? "🎉 All caught up! No creator milestones are due or overdue for performance logging."
                          : metricsStatusFilter === "MISSING"
                          ? "🎉 Excellent! All creators in this campaign have performance metrics logged."
                          : metricsStatusFilter === "LOGGED"
                          ? "No creators have logged metrics yet for this window. Switch to 'All Creators' or 'No Metrics' to log performance."
                          : "No creators match the current filters."}
                      </p>
                      {(searchQuery || categoryFilter !== "ALL" || metricsStatusFilter !== "ALL") && (
                        <button
                          onClick={() => {
                            setSearchQuery("");
                            setCategoryFilter("ALL");
                            setMetricsStatusFilter("ALL");
                            setCurrentPage(1);
                          }}
                          className="text-xs text-[#0052FF] font-bold hover:underline cursor-pointer"
                        >
                          Reset filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ── PAGINATION BAR ── */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs text-slate-500 font-medium">
          <div className="flex items-center space-x-2">
            <span>
              Showing <span className="font-bold text-slate-900">{filteredLeaderboard.length === 0 ? 0 : startIndex + 1}</span> to{" "}
              <span className="font-bold text-slate-900">{endIndex}</span> of{" "}
              <span className="font-bold text-slate-900">{filteredLeaderboard.length}</span> creators
            </span>

            <span className="text-slate-300">•</span>

            <div className="flex items-center space-x-1.5">
              <span>Per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center space-x-1">
              <button
                type="button"
                onClick={() => {
                  setCurrentPage(p => Math.max(p - 1, 1));
                  scrollToLeaderboard();
                }}
                disabled={safeCurrentPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                title="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center space-x-1 px-1">
                {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (safeCurrentPage <= 3) {
                    pageNum = i + 1;
                  } else if (safeCurrentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = safeCurrentPage - 2 + i;
                  }

                  const isCurrent = pageNum === safeCurrentPage;
                  return (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => {
                        setCurrentPage(pageNum);
                        scrollToLeaderboard();
                      }}
                      className={`w-7 h-7 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        isCurrent
                          ? "bg-[#0052FF] text-white shadow-xs"
                          : "bg-white hover:bg-slate-50 text-slate-700 border border-slate-200"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => {
                  setCurrentPage(p => Math.min(p + 1, totalPages));
                  scrollToLeaderboard();
                }}
                disabled={safeCurrentPage === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                title="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

      </div>

      {/* ── Lightbox Modal for Screenshots ── */}
      <ScreenshotLightboxModal 
        state={selectedScreenshot} 
        onClose={() => setSelectedScreenshot(null)} 
      />

      {/* ── Log 7d/15d/30d Metrics Modal ── */}
      {editingCreator && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75"
          onClick={() => setEditingCreator(null)}
        >
          <div 
            className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white shadow-2xl p-1"
            onClick={(e) => e.stopPropagation()}
          >
            <PerformanceMetricsEditor
              creator={editingCreator}
              initialTab={editingInitialTab}
              onSaved={(updated) => {
                setEditingCreator(null);
                if (onDeliverableUpdated) {
                  onDeliverableUpdated();
                }
              }}
              onClose={() => setEditingCreator(null)}
              isReadOnly={!canEditMetrics}
            />
          </div>
        </div>
      )}

    </div>
  );
});
