"use client";

import React, { useState, useEffect, useCallback } from "react";
import { 
  CheckCircle2, 
  Calendar, 
  Eye, 
  Heart, 
  MessageCircle, 
  Bookmark, 
  Share2, 
  Users, 
  Clock, 
  X, 
  BarChart3, 
  Zap, 
  Rocket, 
  Award, 
  Sparkles, 
  Check, 
  RefreshCw,
  Copy,
  ArrowRight
} from "lucide-react";
import { CreatorDeliverableInternal, CreatorDeliverableBrandView } from "@/lib/types";
import { updateDeliverableWithAutomation } from "@/lib/db/actions";
import { calculateCreatorMilestones, formatDateDisplay } from "@/lib/milestones";
import { ScreenshotUploader } from "./ScreenshotUploader";

export interface PerformanceMetricsEditorProps {
  creator: CreatorDeliverableInternal | CreatorDeliverableBrandView;
  onSaved: (updated: CreatorDeliverableInternal) => void;
  onClose?: () => void;
  isReadOnly?: boolean;
  initialTab?: "7d" | "15d" | "30d" | "overall" | "all";
}

export const PerformanceMetricsEditor: React.FC<PerformanceMetricsEditorProps> = ({
  creator,
  onSaved,
  onClose,
  isReadOnly = false,
  initialTab = "7d",
}) => {
  // Normalize initialTab: if "all", map to "7d" or "overall"
  const normalizedInitialTab = initialTab === "all" ? "7d" : initialTab;
  const [activeTab, setActiveTab] = useState<"7d" | "15d" | "30d" | "overall">(normalizedInitialTab);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [autoReflect, setAutoReflect] = useState(true);

  const internalCreator = creator as CreatorDeliverableInternal;

  const [metrics, setMetrics] = useState({
    live_date: internalCreator.live_date || "",
    // 7-day milestone
    day7_views: internalCreator.day7_views || 0,
    day7_er: internalCreator.day7_er || 0,
    day7_reach: internalCreator.day7_reach || 0,
    day7_likes: internalCreator.day7_likes || 0,
    day7_comments: internalCreator.day7_comments || 0,
    day7_saves: internalCreator.day7_saves || 0,
    day7_shares: internalCreator.day7_shares || 0,
    day7_avg_watch_time: internalCreator.day7_avg_watch_time || "",
    day7_screenshot: internalCreator.day7_screenshot || "",
    // 15-day milestone
    day15_views: internalCreator.day15_views || 0,
    day15_er: internalCreator.day15_er || 0,
    day15_reach: internalCreator.day15_reach || 0,
    day15_likes: internalCreator.day15_likes || 0,
    day15_comments: internalCreator.day15_comments || 0,
    day15_saves: internalCreator.day15_saves || 0,
    day15_shares: internalCreator.day15_shares || 0,
    day15_avg_watch_time: internalCreator.day15_avg_watch_time || "",
    day15_screenshot: internalCreator.day15_screenshot || "",
    // 30-day milestone
    day30_views: internalCreator.day30_views || 0,
    day30_er: internalCreator.day30_er || 0,
    day30_reach: internalCreator.day30_reach || 0,
    day30_likes: internalCreator.day30_likes || 0,
    day30_comments: internalCreator.day30_comments || 0,
    day30_saves: internalCreator.day30_saves || 0,
    day30_shares: internalCreator.day30_shares || 0,
    day30_avg_watch_time: internalCreator.day30_avg_watch_time || "",
    day30_screenshot: internalCreator.day30_screenshot || "",
    // Overall performance
    total_views: internalCreator.total_views || 0,
    likes: internalCreator.likes || 0,
    comments: internalCreator.comments || 0,
    saves: internalCreator.saves || 0,
    shares: internalCreator.shares || 0,
    avg_watch_time: internalCreator.avg_watch_time || "",
    engagement_rate: internalCreator.engagement_rate || 0,
    account_reach: internalCreator.account_reach || 0,
    screenshots: internalCreator.screenshots || "[]",
  });

  // Calculate live milestones & countdowns dynamically based on current values
  const milestoneSummary = calculateCreatorMilestones({ ...(creator as any), ...metrics });

  // Reset form when creator changes
  useEffect(() => {
    const c = creator as CreatorDeliverableInternal;
    setMetrics({
      live_date: c.live_date || "",
      day7_views: c.day7_views || 0,
      day7_er: c.day7_er || 0,
      day7_reach: c.day7_reach || 0,
      day7_likes: c.day7_likes || 0,
      day7_comments: c.day7_comments || 0,
      day7_saves: c.day7_saves || 0,
      day7_shares: c.day7_shares || 0,
      day7_avg_watch_time: c.day7_avg_watch_time || "",
      day7_screenshot: c.day7_screenshot || "",
      day15_views: c.day15_views || 0,
      day15_er: c.day15_er || 0,
      day15_reach: c.day15_reach || 0,
      day15_likes: c.day15_likes || 0,
      day15_comments: c.day15_comments || 0,
      day15_saves: c.day15_saves || 0,
      day15_shares: c.day15_shares || 0,
      day15_avg_watch_time: c.day15_avg_watch_time || "",
      day15_screenshot: c.day15_screenshot || "",
      day30_views: c.day30_views || 0,
      day30_er: c.day30_er || 0,
      day30_reach: c.day30_reach || 0,
      day30_likes: c.day30_likes || 0,
      day30_comments: c.day30_comments || 0,
      day30_saves: c.day30_saves || 0,
      day30_shares: c.day30_shares || 0,
      day30_avg_watch_time: c.day30_avg_watch_time || "",
      day30_screenshot: c.day30_screenshot || "",
      total_views: c.total_views || 0,
      likes: c.likes || 0,
      comments: c.comments || 0,
      saves: c.saves || 0,
      shares: c.shares || 0,
      avg_watch_time: c.avg_watch_time || "",
      engagement_rate: c.engagement_rate || 0,
      account_reach: c.account_reach || 0,
      screenshots: c.screenshots || "[]",
    });
    setSaveSuccess(false);
    if (initialTab) {
      setActiveTab(initialTab === "all" ? "7d" : initialTab);
    }
  }, [creator.id, initialTab]);

  const updateField = (field: string, value: string | number) => {
    setMetrics((prev) => {
      const next = { ...prev, [field]: value };

      // Auto-reflect to overall performance when editing milestones
      if (autoReflect) {
        if (field.startsWith("day7_") && activeTab === "7d") {
          const coreKey = field.replace("day7_", "");
          if (coreKey === "views") next.total_views = Number(value) || 0;
          else if (coreKey === "reach") next.account_reach = Number(value) || 0;
          else if (coreKey === "er") next.engagement_rate = Number(value) || 0;
          else if (coreKey === "screenshot" && value) next.screenshots = JSON.stringify([String(value)]);
          else if (["likes", "comments", "saves", "shares", "avg_watch_time"].includes(coreKey)) {
            (next as any)[coreKey] = value;
          }
        } else if (field.startsWith("day15_") && activeTab === "15d") {
          const coreKey = field.replace("day15_", "");
          if (coreKey === "views") next.total_views = Number(value) || 0;
          else if (coreKey === "reach") next.account_reach = Number(value) || 0;
          else if (coreKey === "er") next.engagement_rate = Number(value) || 0;
          else if (coreKey === "screenshot" && value) next.screenshots = JSON.stringify([String(value)]);
          else if (["likes", "comments", "saves", "shares", "avg_watch_time"].includes(coreKey)) {
            (next as any)[coreKey] = value;
          }
        } else if (field.startsWith("day30_") && activeTab === "30d") {
          const coreKey = field.replace("day30_", "");
          if (coreKey === "views") next.total_views = Number(value) || 0;
          else if (coreKey === "reach") next.account_reach = Number(value) || 0;
          else if (coreKey === "er") next.engagement_rate = Number(value) || 0;
          else if (coreKey === "screenshot" && value) next.screenshots = JSON.stringify([String(value)]);
          else if (["likes", "comments", "saves", "shares", "avg_watch_time"].includes(coreKey)) {
            (next as any)[coreKey] = value;
          }
        }
      }

      return next;
    });
    setSaveSuccess(false);
  };

  // Helper to copy milestone metrics directly to overall
  const applyMilestoneToOverall = (milestone: "7d" | "15d" | "30d") => {
    setMetrics((prev) => {
      const prefix = milestone === "7d" ? "day7_" : milestone === "15d" ? "day15_" : "day30_";
      const v = Number((prev as any)[`${prefix}views`]) || 0;
      const reach = Number((prev as any)[`${prefix}reach`]) || 0;
      const likes = Number((prev as any)[`${prefix}likes`]) || 0;
      const comments = Number((prev as any)[`${prefix}comments`]) || 0;
      const saves = Number((prev as any)[`${prefix}saves`]) || 0;
      const shares = Number((prev as any)[`${prefix}shares`]) || 0;
      const watchTime = String((prev as any)[`${prefix}avg_watch_time`] || "");
      const er = Number((prev as any)[`${prefix}er`]) || 0;
      const sc = String((prev as any)[`${prefix}screenshot`] || "");

      return {
        ...prev,
        total_views: v,
        account_reach: reach,
        likes,
        comments,
        saves,
        shares,
        avg_watch_time: watchTime,
        engagement_rate: er,
        screenshots: sc ? JSON.stringify([sc]) : prev.screenshots,
      };
    });
  };

  // Helper to auto-calculate ER for any milestone or overall
  const autoCalculateEr = (tab: "7d" | "15d" | "30d" | "overall") => {
    let v = 0;
    let interactions = 0;
    let erKey = "engagement_rate";

    if (tab === "7d") {
      v = Number(metrics.day7_views) || 0;
      interactions = (Number(metrics.day7_likes) || 0) + (Number(metrics.day7_comments) || 0) + (Number(metrics.day7_saves) || 0) + (Number(metrics.day7_shares) || 0);
      erKey = "day7_er";
    } else if (tab === "15d") {
      v = Number(metrics.day15_views) || 0;
      interactions = (Number(metrics.day15_likes) || 0) + (Number(metrics.day15_comments) || 0) + (Number(metrics.day15_saves) || 0) + (Number(metrics.day15_shares) || 0);
      erKey = "day15_er";
    } else if (tab === "30d") {
      v = Number(metrics.day30_views) || 0;
      interactions = (Number(metrics.day30_likes) || 0) + (Number(metrics.day30_comments) || 0) + (Number(metrics.day30_saves) || 0) + (Number(metrics.day30_shares) || 0);
      erKey = "day30_er";
    } else {
      v = Number(metrics.total_views) || 0;
      interactions = (Number(metrics.likes) || 0) + (Number(metrics.comments) || 0) + (Number(metrics.saves) || 0) + (Number(metrics.shares) || 0);
      erKey = "engagement_rate";
    }

    if (v > 0) {
      const computed = Number(((interactions / v) * 100).toFixed(2));
      updateField(erKey, computed);
    }
  };

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      const res = await updateDeliverableWithAutomation(creator.id, {
        live_date: metrics.live_date ? String(metrics.live_date) : undefined,
        // Day 7
        day7_views: Number(metrics.day7_views) || 0,
        day7_er: Number(metrics.day7_er) || 0,
        day7_reach: Number(metrics.day7_reach) || 0,
        day7_likes: Number(metrics.day7_likes) || 0,
        day7_comments: Number(metrics.day7_comments) || 0,
        day7_saves: Number(metrics.day7_saves) || 0,
        day7_shares: Number(metrics.day7_shares) || 0,
        day7_avg_watch_time: String(metrics.day7_avg_watch_time || ""),
        day7_screenshot: String(metrics.day7_screenshot || ""),
        // Day 15
        day15_views: Number(metrics.day15_views) || 0,
        day15_er: Number(metrics.day15_er) || 0,
        day15_reach: Number(metrics.day15_reach) || 0,
        day15_likes: Number(metrics.day15_likes) || 0,
        day15_comments: Number(metrics.day15_comments) || 0,
        day15_saves: Number(metrics.day15_saves) || 0,
        day15_shares: Number(metrics.day15_shares) || 0,
        day15_avg_watch_time: String(metrics.day15_avg_watch_time || ""),
        day15_screenshot: String(metrics.day15_screenshot || ""),
        // Day 30
        day30_views: Number(metrics.day30_views) || 0,
        day30_er: Number(metrics.day30_er) || 0,
        day30_reach: Number(metrics.day30_reach) || 0,
        day30_likes: Number(metrics.day30_likes) || 0,
        day30_comments: Number(metrics.day30_comments) || 0,
        day30_saves: Number(metrics.day30_saves) || 0,
        day30_shares: Number(metrics.day30_shares) || 0,
        day30_avg_watch_time: String(metrics.day30_avg_watch_time || ""),
        day30_screenshot: String(metrics.day30_screenshot || ""),
        // Overall performance
        total_views: Number(metrics.total_views) || 0,
        likes: Number(metrics.likes) || 0,
        comments: Number(metrics.comments) || 0,
        saves: Number(metrics.saves) || 0,
        shares: Number(metrics.shares) || 0,
        avg_watch_time: String(metrics.avg_watch_time || ""),
        engagement_rate: Number(metrics.engagement_rate) || 0,
        account_reach: Number(metrics.account_reach) || 0,
        screenshots: metrics.screenshots,
      });

      if (res.success && res.deliverable) {
        onSaved(res.deliverable);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err) {
      console.error("Failed to save performance metrics:", err);
    } finally {
      setIsSaving(false);
    }
  }, [creator.id, metrics, onSaved]);

  // Support Ctrl+S / Cmd+S for fast power saving
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (!isReadOnly && !isSaving) {
          handleSave();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleSave, isReadOnly, isSaving]);

  const inputClass =
    "w-full bg-slate-50 focus:bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-[#0052FF] focus:ring-2 focus:ring-[#0052FF]/20 transition-all font-mono";

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-4">
      {/* ── Top Header: Creator Info & Live Date ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2.5">
        <div className="flex items-center space-x-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#0052FF] to-[#00C2FF] flex items-center justify-center text-white font-black text-sm shrink-0 shadow-xs">
            {creator.creator_name ? creator.creator_name.charAt(0).toUpperCase() : "C"}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h4 className="text-sm font-black text-slate-950 truncate">
                {creator.creator_name}
              </h4>
              {creator.category && creator.category !== "Unspecified" && (
                <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-purple-50 text-purple-700 border border-purple-200 uppercase">
                  {creator.category}
                </span>
              )}
              {creator.followers_count > 0 && (
                <span className="text-[11px] font-bold text-slate-500">
                  {(creator.followers_count >= 1000 ? `${(creator.followers_count / 1000).toFixed(0)}k` : creator.followers_count)} Followers
                </span>
              )}
            </div>
            <div className="flex items-center space-x-2 text-[11px] text-slate-500 mt-0.5">
              <span>{creator.org_name || "Client"}</span>
              <span>•</span>
              <span className="truncate max-w-[140px] sm:max-w-xs">{creator.campaign_name || "Campaign"}</span>
            </div>
          </div>
        </div>

        {/* Live Date Picker & Modal Close */}
        <div className="flex items-center space-x-2 shrink-0 self-start sm:self-auto">
          <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200/80 rounded-xl px-2.5 py-1">
            <Calendar className="w-3.5 h-3.5 text-[#0052FF] shrink-0" />
            <span className="text-[11px] font-bold text-slate-600">Live:</span>
            <input
              type="date"
              value={metrics.live_date ? metrics.live_date.split("T")[0] : ""}
              onChange={(e) => updateField("live_date", e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-900 focus:outline-none cursor-pointer"
              readOnly={isReadOnly}
            />
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* ── Interactive Milestone Progression Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {/* 1. Live Date Card */}
        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
            <span>1. Live Date</span>
            <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-100 text-[#0052FF]">Origin</span>
          </div>
          <div className="text-xs font-black text-slate-900 mt-1 truncate">
            {milestoneSummary.liveDateFormatted || "Not Set"}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {milestoneSummary.liveDateFormatted ? `${milestoneSummary.daysSinceLive}d live` : "Awaiting Go-Live"}
          </div>
        </div>

        {/* 2. Day 7 Milestone Card */}
        <div 
          onClick={() => setActiveTab("7d")}
          className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
            activeTab === "7d"
              ? "bg-amber-50/70 border-amber-300 shadow-2xs ring-1 ring-amber-400/30"
              : "bg-slate-50 border-slate-200/80 hover:bg-slate-100/70"
          }`}
        >
          <div className="flex items-center justify-between text-[11px] font-bold text-amber-900">
            <span className="flex items-center space-x-1">
              <Zap className="w-3 h-3 text-amber-500" />
              <span>2. Day 7</span>
            </span>
            <span className={`text-[9px] px-1.5 py-0.2 rounded font-black ${
              milestoneSummary.milestones.day7.isLogged
                ? "bg-emerald-100 text-emerald-700"
                : milestoneSummary.milestones.day7.isOverdue
                ? "bg-rose-100 text-rose-700"
                : milestoneSummary.milestones.day7.isDue
                ? "bg-amber-100 text-amber-700 animate-pulse"
                : "bg-blue-100 text-[#0052FF]"
            }`}>
              {milestoneSummary.milestones.day7.badgeLabel}
            </span>
          </div>
          <div className="text-xs font-black text-slate-900 mt-1 truncate">
            {milestoneSummary.milestones.day7.targetDateFormatted}
          </div>
          <div className="text-[10px] font-bold flex items-center justify-between mt-0.5">
            <span className="text-slate-500 truncate">
              {Number(metrics.day7_views) > 0 ? `${Number(metrics.day7_views).toLocaleString()} views` : "Pending"}
            </span>
            <span className={activeTab === "7d" ? "text-amber-700" : "text-[#0052FF]"}>
              {activeTab === "7d" ? "Active" : "Fill →"}
            </span>
          </div>
        </div>

        {/* 3. Day 15 Milestone Card */}
        <div 
          onClick={() => setActiveTab("15d")}
          className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
            activeTab === "15d"
              ? "bg-cyan-50/70 border-cyan-300 shadow-2xs ring-1 ring-cyan-400/30"
              : "bg-slate-50 border-slate-200/80 hover:bg-slate-100/70"
          }`}
        >
          <div className="flex items-center justify-between text-[11px] font-bold text-cyan-900">
            <span className="flex items-center space-x-1">
              <Rocket className="w-3 h-3 text-cyan-600" />
              <span>3. Day 15</span>
            </span>
            <span className={`text-[9px] px-1.5 py-0.2 rounded font-black ${
              milestoneSummary.milestones.day15.isLogged
                ? "bg-emerald-100 text-emerald-700"
                : milestoneSummary.milestones.day15.isOverdue
                ? "bg-rose-100 text-rose-700"
                : milestoneSummary.milestones.day15.isDue
                ? "bg-amber-100 text-amber-700 animate-pulse"
                : "bg-blue-100 text-[#0052FF]"
            }`}>
              {milestoneSummary.milestones.day15.badgeLabel}
            </span>
          </div>
          <div className="text-xs font-black text-slate-900 mt-1 truncate">
            {milestoneSummary.milestones.day15.targetDateFormatted}
          </div>
          <div className="text-[10px] font-bold flex items-center justify-between mt-0.5">
            <span className="text-slate-500 truncate">
              {Number(metrics.day15_views) > 0 ? `${Number(metrics.day15_views).toLocaleString()} views` : "Pending"}
            </span>
            <span className={activeTab === "15d" ? "text-cyan-700" : "text-cyan-600"}>
              {activeTab === "15d" ? "Active" : "Fill →"}
            </span>
          </div>
        </div>

        {/* 4. Day 30 Milestone Card */}
        <div 
          onClick={() => setActiveTab("30d")}
          className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
            activeTab === "30d"
              ? "bg-emerald-50/70 border-emerald-300 shadow-2xs ring-1 ring-emerald-400/30"
              : "bg-slate-50 border-slate-200/80 hover:bg-slate-100/70"
          }`}
        >
          <div className="flex items-center justify-between text-[11px] font-bold text-emerald-900">
            <span className="flex items-center space-x-1">
              <Award className="w-3 h-3 text-emerald-600" />
              <span>4. Day 30</span>
            </span>
            <span className={`text-[9px] px-1.5 py-0.2 rounded font-black ${
              milestoneSummary.milestones.day30.isLogged
                ? "bg-emerald-100 text-emerald-700"
                : milestoneSummary.milestones.day30.isOverdue
                ? "bg-rose-100 text-rose-700"
                : milestoneSummary.milestones.day30.isDue
                ? "bg-amber-100 text-amber-700 animate-pulse"
                : "bg-blue-100 text-[#0052FF]"
            }`}>
              {milestoneSummary.milestones.day30.badgeLabel}
            </span>
          </div>
          <div className="text-xs font-black text-slate-900 mt-1 truncate">
            {milestoneSummary.milestones.day30.targetDateFormatted}
          </div>
          <div className="text-[10px] font-bold flex items-center justify-between mt-0.5">
            <span className="text-slate-500 truncate">
              {Number(metrics.day30_views) > 0 ? `${Number(metrics.day30_views).toLocaleString()} views` : "Pending"}
            </span>
            <span className={activeTab === "30d" ? "text-emerald-700" : "text-emerald-600"}>
              {activeTab === "30d" ? "Active" : "Fill →"}
            </span>
          </div>
        </div>
      </div>

      {/* ── Tab Switcher: 4 Clean Tabs (No Redundancy) ── */}
      <div className="grid grid-cols-4 p-1 rounded-xl bg-slate-100 border border-slate-200/90 text-xs font-bold gap-1">
        <button
          type="button"
          onClick={() => setActiveTab("7d")}
          className={`py-2 px-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center space-x-1 text-center ${
            activeTab === "7d"
              ? "bg-white text-amber-700 shadow-xs font-black"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Zap className="w-3.5 h-3.5 shrink-0 text-amber-500" />
          <span>7 Days</span>
          {Number(metrics.day7_views) > 0 && (
            <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("15d")}
          className={`py-2 px-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center space-x-1 text-center ${
            activeTab === "15d"
              ? "bg-white text-cyan-700 shadow-xs font-black"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Rocket className="w-3.5 h-3.5 shrink-0 text-cyan-600" />
          <span>15 Days</span>
          {Number(metrics.day15_views) > 0 && (
            <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("30d")}
          className={`py-2 px-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center space-x-1 text-center ${
            activeTab === "30d"
              ? "bg-white text-emerald-700 shadow-xs font-black"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Award className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
          <span>30 Days</span>
          {Number(metrics.day30_views) > 0 && (
            <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("overall")}
          className={`py-2 px-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center space-x-1 text-center ${
            activeTab === "overall"
              ? "bg-white text-[#0052FF] shadow-xs font-black"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5 shrink-0 text-[#0052FF]" />
          <span className="truncate">Overall Reel</span>
        </button>
      </div>

      {/* ────────────────── Tab: Day 7 Milestone ────────────────── */}
      {activeTab === "7d" && (
        <div className="space-y-3.5 animate-in fade-in duration-150">
          <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200/80 flex items-center justify-between text-xs flex-wrap gap-2">
            <div className="flex items-center space-x-2">
              <Zap className="w-4 h-4 text-amber-500 shrink-0" />
              <span className="font-bold text-amber-950">Day 7 Window:</span>
              <span className="text-slate-600">{milestoneSummary.milestones.day7.targetDateFormatted}</span>
            </div>
            <button
              type="button"
              onClick={() => applyMilestoneToOverall("7d")}
              className="text-[10px] font-bold text-amber-900 bg-white px-2.5 py-1 rounded-lg border border-amber-200 hover:bg-amber-100/60 cursor-pointer shadow-2xs flex items-center space-x-1"
            >
              <Copy className="w-3 h-3 text-amber-600" />
              <span>Apply to Overall Reel</span>
            </button>
          </div>

          {/* Row 1: Primary Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1">
                <Eye className="w-3 h-3 text-[#0052FF]" />
                <span>Day 7 Views</span>
              </label>
              <input
                type="number"
                value={metrics.day7_views || ""}
                onChange={(e) => updateField("day7_views", Number(e.target.value))}
                onFocus={(e) => e.target.select()}
                placeholder="0"
                className={inputClass}
                readOnly={isReadOnly}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1">
                <Users className="w-3 h-3 text-indigo-600" />
                <span>Day 7 Reach</span>
              </label>
              <input
                type="number"
                value={metrics.day7_reach || ""}
                onChange={(e) => updateField("day7_reach", Number(e.target.value))}
                onFocus={(e) => e.target.select()}
                placeholder="0"
                className={inputClass}
                readOnly={isReadOnly}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1">
                <Heart className="w-3 h-3 text-rose-500" />
                <span>Likes</span>
              </label>
              <input
                type="number"
                value={metrics.day7_likes || ""}
                onChange={(e) => updateField("day7_likes", Number(e.target.value))}
                onFocus={(e) => e.target.select()}
                placeholder="0"
                className={inputClass}
                readOnly={isReadOnly}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1">
                <MessageCircle className="w-3 h-3 text-teal-600" />
                <span>Comments</span>
              </label>
              <input
                type="number"
                value={metrics.day7_comments || ""}
                onChange={(e) => updateField("day7_comments", Number(e.target.value))}
                onFocus={(e) => e.target.select()}
                placeholder="0"
                className={inputClass}
                readOnly={isReadOnly}
              />
            </div>
          </div>

          {/* Row 2: Secondary Interactions, Watch Time & ER */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1">
                <Bookmark className="w-3 h-3 text-amber-500" />
                <span>Saves</span>
              </label>
              <input
                type="number"
                value={metrics.day7_saves || ""}
                onChange={(e) => updateField("day7_saves", Number(e.target.value))}
                onFocus={(e) => e.target.select()}
                placeholder="0"
                className={inputClass}
                readOnly={isReadOnly}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1">
                <Share2 className="w-3 h-3 text-[#00A3FF]" />
                <span>Shares</span>
              </label>
              <input
                type="number"
                value={metrics.day7_shares || ""}
                onChange={(e) => updateField("day7_shares", Number(e.target.value))}
                onFocus={(e) => e.target.select()}
                placeholder="0"
                className={inputClass}
                readOnly={isReadOnly}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1">
                <Clock className="w-3 h-3 text-indigo-500" />
                <span>Watch Time</span>
              </label>
              <input
                type="text"
                value={metrics.day7_avg_watch_time || ""}
                onChange={(e) => updateField("day7_avg_watch_time", e.target.value)}
                onFocus={(e) => e.target.select()}
                placeholder="e.g. 14s"
                className={inputClass}
                readOnly={isReadOnly}
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1">
                  <Sparkles className="w-3 h-3 text-emerald-600" />
                  <span>Day 7 ER (%)</span>
                </label>
                <button
                  type="button"
                  onClick={() => autoCalculateEr("7d")}
                  className="text-[9px] font-extrabold text-[#0052FF] hover:underline cursor-pointer flex items-center space-x-0.5"
                  title="Auto calculate from views & reactions"
                >
                  <Sparkles className="w-2.5 h-2.5" />
                  <span>Auto Calc</span>
                </button>
              </div>
              <input
                type="number"
                step="0.01"
                value={metrics.day7_er || ""}
                onChange={(e) => updateField("day7_er", Number(e.target.value))}
                onFocus={(e) => e.target.select()}
                placeholder="0.00"
                className={inputClass}
                readOnly={isReadOnly}
              />
            </div>
          </div>

          {/* Screenshot Proof */}
          <div className="pt-2 border-t border-slate-100">
            <ScreenshotUploader
              value={metrics.day7_screenshot || ""}
              onChange={(url) => updateField("day7_screenshot", url)}
              creatorId={String(creator.id)}
              milestone="7d"
              label="Day 7 Proof Screenshots"
              description="Drop screenshots here or paste with Ctrl+V"
              maxFiles={5}
              isReadOnly={isReadOnly}
            />
          </div>
        </div>
      )}

      {/* ────────────────── Tab: Day 15 Milestone ────────────────── */}
      {activeTab === "15d" && (
        <div className="space-y-3.5 animate-in fade-in duration-150">
          <div className="p-3 rounded-xl bg-cyan-50/60 border border-cyan-200/80 flex items-center justify-between text-xs flex-wrap gap-2">
            <div className="flex items-center space-x-2">
              <Rocket className="w-4 h-4 text-cyan-600 shrink-0" />
              <span className="font-bold text-cyan-950">Day 15 Window:</span>
              <span className="text-slate-600">{milestoneSummary.milestones.day15.targetDateFormatted}</span>
            </div>
            <button
              type="button"
              onClick={() => applyMilestoneToOverall("15d")}
              className="text-[10px] font-bold text-cyan-900 bg-white px-2.5 py-1 rounded-lg border border-cyan-200 hover:bg-cyan-100/60 cursor-pointer shadow-2xs flex items-center space-x-1"
            >
              <Copy className="w-3 h-3 text-cyan-600" />
              <span>Apply to Overall Reel</span>
            </button>
          </div>

          {/* Row 1: Primary Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1">
                <Eye className="w-3 h-3 text-cyan-600" />
                <span>Day 15 Views</span>
              </label>
              <input
                type="number"
                value={metrics.day15_views || ""}
                onChange={(e) => updateField("day15_views", Number(e.target.value))}
                onFocus={(e) => e.target.select()}
                placeholder="0"
                className={inputClass}
                readOnly={isReadOnly}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1">
                <Users className="w-3 h-3 text-indigo-600" />
                <span>Day 15 Reach</span>
              </label>
              <input
                type="number"
                value={metrics.day15_reach || ""}
                onChange={(e) => updateField("day15_reach", Number(e.target.value))}
                onFocus={(e) => e.target.select()}
                placeholder="0"
                className={inputClass}
                readOnly={isReadOnly}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1">
                <Heart className="w-3 h-3 text-rose-500" />
                <span>Likes</span>
              </label>
              <input
                type="number"
                value={metrics.day15_likes || ""}
                onChange={(e) => updateField("day15_likes", Number(e.target.value))}
                onFocus={(e) => e.target.select()}
                placeholder="0"
                className={inputClass}
                readOnly={isReadOnly}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1">
                <MessageCircle className="w-3 h-3 text-teal-600" />
                <span>Comments</span>
              </label>
              <input
                type="number"
                value={metrics.day15_comments || ""}
                onChange={(e) => updateField("day15_comments", Number(e.target.value))}
                onFocus={(e) => e.target.select()}
                placeholder="0"
                className={inputClass}
                readOnly={isReadOnly}
              />
            </div>
          </div>

          {/* Row 2: Secondary Interactions, Watch Time & ER */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1">
                <Bookmark className="w-3 h-3 text-amber-500" />
                <span>Saves</span>
              </label>
              <input
                type="number"
                value={metrics.day15_saves || ""}
                onChange={(e) => updateField("day15_saves", Number(e.target.value))}
                onFocus={(e) => e.target.select()}
                placeholder="0"
                className={inputClass}
                readOnly={isReadOnly}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1">
                <Share2 className="w-3 h-3 text-[#00A3FF]" />
                <span>Shares</span>
              </label>
              <input
                type="number"
                value={metrics.day15_shares || ""}
                onChange={(e) => updateField("day15_shares", Number(e.target.value))}
                onFocus={(e) => e.target.select()}
                placeholder="0"
                className={inputClass}
                readOnly={isReadOnly}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1">
                <Clock className="w-3 h-3 text-indigo-500" />
                <span>Watch Time</span>
              </label>
              <input
                type="text"
                value={metrics.day15_avg_watch_time || ""}
                onChange={(e) => updateField("day15_avg_watch_time", e.target.value)}
                onFocus={(e) => e.target.select()}
                placeholder="e.g. 14s"
                className={inputClass}
                readOnly={isReadOnly}
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1">
                  <Sparkles className="w-3 h-3 text-emerald-600" />
                  <span>Day 15 ER (%)</span>
                </label>
                <button
                  type="button"
                  onClick={() => autoCalculateEr("15d")}
                  className="text-[9px] font-extrabold text-cyan-700 hover:underline cursor-pointer flex items-center space-x-0.5"
                  title="Auto calculate from views & reactions"
                >
                  <Sparkles className="w-2.5 h-2.5" />
                  <span>Auto Calc</span>
                </button>
              </div>
              <input
                type="number"
                step="0.01"
                value={metrics.day15_er || ""}
                onChange={(e) => updateField("day15_er", Number(e.target.value))}
                onFocus={(e) => e.target.select()}
                placeholder="0.00"
                className={inputClass}
                readOnly={isReadOnly}
              />
            </div>
          </div>

          {/* Screenshot Proof */}
          <div className="pt-2 border-t border-slate-100">
            <ScreenshotUploader
              value={metrics.day15_screenshot || ""}
              onChange={(url) => updateField("day15_screenshot", url)}
              creatorId={String(creator.id)}
              milestone="15d"
              label="Day 15 Proof Screenshots"
              description="Drop screenshots here or paste with Ctrl+V"
              maxFiles={5}
              isReadOnly={isReadOnly}
            />
          </div>
        </div>
      )}

      {/* ────────────────── Tab: Day 30 Milestone ────────────────── */}
      {activeTab === "30d" && (
        <div className="space-y-3.5 animate-in fade-in duration-150">
          <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200/80 flex items-center justify-between text-xs flex-wrap gap-2">
            <div className="flex items-center space-x-2">
              <Award className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-bold text-emerald-950">Day 30 Window:</span>
              <span className="text-slate-600">{milestoneSummary.milestones.day30.targetDateFormatted}</span>
            </div>
            <button
              type="button"
              onClick={() => applyMilestoneToOverall("30d")}
              className="text-[10px] font-bold text-emerald-900 bg-white px-2.5 py-1 rounded-lg border border-emerald-200 hover:bg-emerald-100/60 cursor-pointer shadow-2xs flex items-center space-x-1"
            >
              <Copy className="w-3 h-3 text-emerald-600" />
              <span>Apply to Overall Reel</span>
            </button>
          </div>

          {/* Row 1: Primary Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1">
                <Eye className="w-3 h-3 text-emerald-600" />
                <span>Day 30 Views</span>
              </label>
              <input
                type="number"
                value={metrics.day30_views || ""}
                onChange={(e) => updateField("day30_views", Number(e.target.value))}
                onFocus={(e) => e.target.select()}
                placeholder="0"
                className={inputClass}
                readOnly={isReadOnly}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1">
                <Users className="w-3 h-3 text-indigo-600" />
                <span>Day 30 Reach</span>
              </label>
              <input
                type="number"
                value={metrics.day30_reach || ""}
                onChange={(e) => updateField("day30_reach", Number(e.target.value))}
                onFocus={(e) => e.target.select()}
                placeholder="0"
                className={inputClass}
                readOnly={isReadOnly}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1">
                <Heart className="w-3 h-3 text-rose-500" />
                <span>Likes</span>
              </label>
              <input
                type="number"
                value={metrics.day30_likes || ""}
                onChange={(e) => updateField("day30_likes", Number(e.target.value))}
                onFocus={(e) => e.target.select()}
                placeholder="0"
                className={inputClass}
                readOnly={isReadOnly}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1">
                <MessageCircle className="w-3 h-3 text-teal-600" />
                <span>Comments</span>
              </label>
              <input
                type="number"
                value={metrics.day30_comments || ""}
                onChange={(e) => updateField("day30_comments", Number(e.target.value))}
                onFocus={(e) => e.target.select()}
                placeholder="0"
                className={inputClass}
                readOnly={isReadOnly}
              />
            </div>
          </div>

          {/* Row 2: Secondary Interactions, Watch Time & ER */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1">
                <Bookmark className="w-3 h-3 text-amber-500" />
                <span>Saves</span>
              </label>
              <input
                type="number"
                value={metrics.day30_saves || ""}
                onChange={(e) => updateField("day30_saves", Number(e.target.value))}
                onFocus={(e) => e.target.select()}
                placeholder="0"
                className={inputClass}
                readOnly={isReadOnly}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1">
                <Share2 className="w-3 h-3 text-[#00A3FF]" />
                <span>Shares</span>
              </label>
              <input
                type="number"
                value={metrics.day30_shares || ""}
                onChange={(e) => updateField("day30_shares", Number(e.target.value))}
                onFocus={(e) => e.target.select()}
                placeholder="0"
                className={inputClass}
                readOnly={isReadOnly}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1">
                <Clock className="w-3 h-3 text-indigo-500" />
                <span>Watch Time</span>
              </label>
              <input
                type="text"
                value={metrics.day30_avg_watch_time || ""}
                onChange={(e) => updateField("day30_avg_watch_time", e.target.value)}
                onFocus={(e) => e.target.select()}
                placeholder="e.g. 14s"
                className={inputClass}
                readOnly={isReadOnly}
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1">
                  <Sparkles className="w-3 h-3 text-emerald-600" />
                  <span>Day 30 ER (%)</span>
                </label>
                <button
                  type="button"
                  onClick={() => autoCalculateEr("30d")}
                  className="text-[9px] font-extrabold text-emerald-700 hover:underline cursor-pointer flex items-center space-x-0.5"
                  title="Auto calculate from views & reactions"
                >
                  <Sparkles className="w-2.5 h-2.5" />
                  <span>Auto Calc</span>
                </button>
              </div>
              <input
                type="number"
                step="0.01"
                value={metrics.day30_er || ""}
                onChange={(e) => updateField("day30_er", Number(e.target.value))}
                onFocus={(e) => e.target.select()}
                placeholder="0.00"
                className={inputClass}
                readOnly={isReadOnly}
              />
            </div>
          </div>

          {/* Screenshot Proof */}
          <div className="pt-2 border-t border-slate-100">
            <ScreenshotUploader
              value={metrics.day30_screenshot || ""}
              onChange={(url) => updateField("day30_screenshot", url)}
              creatorId={String(creator.id)}
              milestone="30d"
              label="Day 30 Proof Screenshots"
              description="Drop screenshots here or paste with Ctrl+V"
              maxFiles={5}
              isReadOnly={isReadOnly}
            />
          </div>
        </div>
      )}

      {/* ────────────────── Tab: Overall Performance ────────────────── */}
      {activeTab === "overall" && (
        <div className="space-y-3.5 animate-in fade-in duration-150">
          <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200/80 flex items-center justify-between text-xs flex-wrap gap-2">
            <div className="flex items-center space-x-2">
              <BarChart3 className="w-4 h-4 text-[#0052FF] shrink-0" />
              <span className="font-bold text-slate-900">Overall Reel Performance:</span>
              <span className="text-slate-600 text-[11px]">Consolidated metrics shown to Client &amp; Executive KPIs</span>
            </div>
            
            {/* Quick Copy from Milestones */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] text-slate-400 font-bold uppercase mr-1">Copy From:</span>
              {Number(metrics.day7_views) > 0 && (
                <button
                  type="button"
                  onClick={() => applyMilestoneToOverall("7d")}
                  className="px-2 py-0.5 rounded text-[10px] font-bold bg-white text-amber-800 border border-amber-200 hover:bg-amber-50 cursor-pointer shadow-2xs"
                >
                  ⚡ Day 7
                </button>
              )}
              {Number(metrics.day15_views) > 0 && (
                <button
                  type="button"
                  onClick={() => applyMilestoneToOverall("15d")}
                  className="px-2 py-0.5 rounded text-[10px] font-bold bg-white text-cyan-800 border border-cyan-200 hover:bg-cyan-50 cursor-pointer shadow-2xs"
                >
                  🚀 Day 15
                </button>
              )}
              {Number(metrics.day30_views) > 0 && (
                <button
                  type="button"
                  onClick={() => applyMilestoneToOverall("30d")}
                  className="px-2 py-0.5 rounded text-[10px] font-bold bg-white text-emerald-800 border border-emerald-200 hover:bg-emerald-50 cursor-pointer shadow-2xs"
                >
                  🏆 Day 30
                </button>
              )}
            </div>
          </div>

          {/* Row 1: Views, Reach, Likes, Comments */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1">
                <Eye className="w-3 h-3 text-[#0052FF]" />
                <span>Total Views</span>
              </label>
              <input
                type="number"
                value={metrics.total_views || ""}
                onChange={(e) => updateField("total_views", Number(e.target.value))}
                onFocus={(e) => e.target.select()}
                placeholder="0"
                className={inputClass}
                readOnly={isReadOnly}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1">
                <Users className="w-3 h-3 text-indigo-600" />
                <span>Account Reach</span>
              </label>
              <input
                type="number"
                value={metrics.account_reach || ""}
                onChange={(e) => updateField("account_reach", Number(e.target.value))}
                onFocus={(e) => e.target.select()}
                placeholder="0"
                className={inputClass}
                readOnly={isReadOnly}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1">
                <Heart className="w-3 h-3 text-rose-500" />
                <span>Likes</span>
              </label>
              <input
                type="number"
                value={metrics.likes || ""}
                onChange={(e) => updateField("likes", Number(e.target.value))}
                onFocus={(e) => e.target.select()}
                placeholder="0"
                className={inputClass}
                readOnly={isReadOnly}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1">
                <MessageCircle className="w-3 h-3 text-teal-600" />
                <span>Comments</span>
              </label>
              <input
                type="number"
                value={metrics.comments || ""}
                onChange={(e) => updateField("comments", Number(e.target.value))}
                onFocus={(e) => e.target.select()}
                placeholder="0"
                className={inputClass}
                readOnly={isReadOnly}
              />
            </div>
          </div>

          {/* Row 2: Saves, Shares, Watch Time & ER */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1">
                <Bookmark className="w-3 h-3 text-amber-500" />
                <span>Saves</span>
              </label>
              <input
                type="number"
                value={metrics.saves || ""}
                onChange={(e) => updateField("saves", Number(e.target.value))}
                onFocus={(e) => e.target.select()}
                placeholder="0"
                className={inputClass}
                readOnly={isReadOnly}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1">
                <Share2 className="w-3 h-3 text-[#00A3FF]" />
                <span>Shares</span>
              </label>
              <input
                type="number"
                value={metrics.shares || ""}
                onChange={(e) => updateField("shares", Number(e.target.value))}
                onFocus={(e) => e.target.select()}
                placeholder="0"
                className={inputClass}
                readOnly={isReadOnly}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1">
                <Clock className="w-3 h-3 text-indigo-500" />
                <span>Avg Watch Time</span>
              </label>
              <input
                type="text"
                value={metrics.avg_watch_time || ""}
                onChange={(e) => updateField("avg_watch_time", e.target.value)}
                onFocus={(e) => e.target.select()}
                placeholder="e.g. 14s"
                className={inputClass}
                readOnly={isReadOnly}
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1">
                  <Sparkles className="w-3 h-3 text-emerald-600" />
                  <span>ER (%)</span>
                </label>
                <button
                  type="button"
                  onClick={() => autoCalculateEr("overall")}
                  className="text-[9px] font-extrabold text-[#0052FF] hover:underline cursor-pointer flex items-center space-x-0.5"
                  title="Auto calculate from views & reactions"
                >
                  <Sparkles className="w-2.5 h-2.5" />
                  <span>Auto Calc</span>
                </button>
              </div>
              <input
                type="number"
                step="0.01"
                value={metrics.engagement_rate || ""}
                onChange={(e) => updateField("engagement_rate", Number(e.target.value))}
                onFocus={(e) => e.target.select()}
                placeholder="0.00"
                className={inputClass}
                readOnly={isReadOnly}
              />
            </div>
          </div>

          {/* Screenshot Proof */}
          <div className="pt-2 border-t border-slate-100">
            <ScreenshotUploader
              value={metrics.screenshots || ""}
              onChange={(val) => updateField("screenshots", val)}
              creatorId={String(creator.id)}
              milestone="overall"
              label="Insights Screenshots"
              description="Drop screenshots here or paste with Ctrl+V"
              maxFiles={5}
              isReadOnly={isReadOnly}
            />
          </div>
        </div>
      )}

      {/* ── Auto-Reflect Checkbox Notice ── */}
      <div className="flex items-center justify-between pt-2 px-1 text-xs border-t border-slate-100 flex-wrap gap-2">
        <label className="flex items-center space-x-2 cursor-pointer select-none text-[11px] font-semibold text-slate-600">
          <input
            type="checkbox"
            checked={autoReflect}
            onChange={(e) => setAutoReflect(e.target.checked)}
            className="w-3.5 h-3.5 rounded text-[#0052FF] focus:ring-[#0052FF]"
          />
          <span>Auto-reflect milestone entries directly into Overall Performance</span>
        </label>

        <span className="text-[11px] text-slate-400">
          Press <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded font-mono text-[10px]">Ctrl+S</kbd> to save anytime
        </span>
      </div>

      {/* ── Bottom Save Action Bar ── */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
        <button
          type="button"
          onClick={() => autoCalculateEr(activeTab)}
          className="px-3 py-2 rounded-xl bg-blue-50 text-[#0052FF] text-xs font-bold hover:bg-blue-100 transition-all flex items-center space-x-1.5 cursor-pointer shadow-2xs"
          title="Auto-calculate ER from entered reactions"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Auto Calc ER</span>
        </button>

        <div className="flex items-center space-x-2">
          {saveSuccess && (
            <span className="text-xs font-bold text-emerald-600 flex items-center space-x-1 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Metrics Saved!</span>
            </span>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || isReadOnly}
            className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center space-x-2 cursor-pointer shadow-md ${
              saveSuccess
                ? "bg-emerald-600 text-white shadow-emerald-500/20"
                : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/25 active:scale-98"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isSaving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : saveSuccess ? (
              <>
                <Check className="w-4 h-4" />
                <span>Saved!</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Save All Metrics</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
