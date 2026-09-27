"use client";

import React, { useState, useEffect } from "react";
import { 
  Camera, 
  CheckCircle2, 
  RefreshCw, 
  Sparkles, 
  Calendar, 
  ExternalLink, 
  TrendingUp, 
  Eye, 
  Heart, 
  MessageCircle, 
  Bookmark, 
  Share2, 
  Users, 
  Clock, 
  X,
  FileImage,
  BarChart3,
  Zap,
  Rocket,
  Award,
  Layers,
  AlertCircle,
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
  initialTab?: "overall" | "7d" | "15d" | "30d" | "all";
}

export const PerformanceMetricsEditor: React.FC<PerformanceMetricsEditorProps> = ({
  creator,
  onSaved,
  onClose,
  isReadOnly = false,
  initialTab = "overall",
}) => {
  const [activeTab, setActiveTab] = useState<"overall" | "7d" | "15d" | "30d" | "all">(initialTab);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const internalCreator = creator as CreatorDeliverableInternal;

  const [metrics, setMetrics] = useState({
    live_date: internalCreator.live_date || "",
    // 7-day milestone
    day7_views: internalCreator.day7_views || 0,
    day7_er: internalCreator.day7_er || 0,
    day7_screenshot: internalCreator.day7_screenshot || "",
    // 15-day milestone
    day15_views: internalCreator.day15_views || 0,
    day15_er: internalCreator.day15_er || 0,
    day15_screenshot: internalCreator.day15_screenshot || "",
    // 30-day milestone
    day30_views: internalCreator.day30_views || 0,
    day30_er: internalCreator.day30_er || 0,
    day30_screenshot: internalCreator.day30_screenshot || "",
    // Overall reel performance
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
      day7_screenshot: c.day7_screenshot || "",
      day15_views: c.day15_views || 0,
      day15_er: c.day15_er || 0,
      day15_screenshot: c.day15_screenshot || "",
      day30_views: c.day30_views || 0,
      day30_er: c.day30_er || 0,
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
    if (initialTab) setActiveTab(initialTab);
  }, [creator.id, initialTab]);

  const updateField = (field: string, value: string | number) => {
    setMetrics((prev) => ({ ...prev, [field]: value }));
    setSaveSuccess(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      const res = await updateDeliverableWithAutomation(creator.id, {
        live_date: metrics.live_date ? String(metrics.live_date) : undefined,
        day7_views: Number(metrics.day7_views) || 0,
        day7_er: Number(metrics.day7_er) || 0,
        day7_screenshot: String(metrics.day7_screenshot || ""),
        day15_views: Number(metrics.day15_views) || 0,
        day15_er: Number(metrics.day15_er) || 0,
        day15_screenshot: String(metrics.day15_screenshot || ""),
        day30_views: Number(metrics.day30_views) || 0,
        day30_er: Number(metrics.day30_er) || 0,
        day30_screenshot: String(metrics.day30_screenshot || ""),
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
  };

  // Helper to auto-calculate overall ER
  const autoCalculateOverallEr = () => {
    const v = Number(metrics.total_views) || 0;
    if (v > 0) {
      const interactions =
        (Number(metrics.likes) || 0) +
        (Number(metrics.comments) || 0) +
        (Number(metrics.saves) || 0) +
        (Number(metrics.shares) || 0);
      const computed = Number(((interactions / v) * 100).toFixed(2));
      updateField("engagement_rate", computed);
    }
  };

  const inputClass =
    "w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0052FF] focus:ring-2 focus:ring-[#0052FF]/20 transition-all font-medium";

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2.5">
        <div className="flex items-start sm:items-center space-x-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-[#0052FF] shrink-0 mt-0.5 sm:mt-0">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                Creator Reel Performance &amp; Milestones
              </h4>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold border border-slate-200 truncate max-w-[120px]">
                {creator.creator_name}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
              Verified Instagram insights, real-time metrics &amp; milestone snapshot proofs
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0 self-start sm:self-auto">
          {saveSuccess && (
            <span className="text-[10px] px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-black flex items-center space-x-1 animate-in fade-in">
              <CheckCircle2 className="w-3 h-3" />
              <span>Saved</span>
            </span>
          )}

          {!isReadOnly && (
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all cursor-pointer shadow-xs disabled:opacity-50 flex items-center space-x-1.5"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Save All Metrics</span>
                </>
              )}
            </button>
          )}

          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* ── Visual Milestone Timeline & Auto-Schedule ── */}
      <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-slate-50 border border-blue-200/80 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-[#0052FF]" />
            <span className="text-xs font-black text-slate-900 uppercase tracking-wider">
              Reel Milestone Timeline &amp; Auto-Schedule
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-[11px] font-bold text-slate-600">Reel Live Date:</span>
            <input
              type="date"
              value={metrics.live_date ? metrics.live_date.split("T")[0] : ""}
              onChange={(e) => updateField("live_date", e.target.value)}
              className="px-2 py-1 rounded-lg bg-white border border-slate-300 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0052FF] cursor-pointer"
              readOnly={isReadOnly}
            />
          </div>
        </div>

        {/* 4-Step Interactive Milestone Progression */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-0.5">
          {/* Step 1: Live Date */}
          <div className="p-3 rounded-xl bg-white border border-slate-200/90 shadow-2xs flex flex-col justify-between min-h-[108px]">
            <div>
              <div className="flex items-center justify-between text-[11px] font-bold">
                <span className="text-slate-800 flex items-center space-x-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#0052FF]" />
                  <span>1. Live Date</span>
                </span>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-blue-50 text-[#0052FF] border border-blue-200">
                  Origin
                </span>
              </div>
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1.5">
                Publication
              </div>
              <div className="text-xs font-black text-slate-900 mt-0.5 truncate">
                {milestoneSummary.liveDateFormatted}
              </div>
            </div>
            <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500 font-medium">
              <span>{milestoneSummary.daysSinceLive !== null ? `${milestoneSummary.daysSinceLive}d elapsed` : "Set live date"}</span>
              <span className="text-slate-400 font-mono text-[9px]">Day 0</span>
            </div>
          </div>

          {/* Step 2: 7-Day Velocity */}
          <div
            onClick={() => setActiveTab("7d")}
            className={`p-3 rounded-xl border transition-all cursor-pointer shadow-2xs flex flex-col justify-between min-h-[108px] ${
              activeTab === "7d"
                ? "bg-blue-50/70 border-blue-500 ring-2 ring-blue-200"
                : "bg-white border-slate-200/90 hover:border-blue-300"
            }`}
          >
            <div>
              <div className="flex items-center justify-between text-[11px] font-bold">
                <span className="text-slate-900 flex items-center space-x-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>2. Day 7</span>
                </span>
                <span className={`px-1.5 py-0.2 rounded text-[9px] font-black border ${milestoneSummary.milestones.day7.badgeClass}`}>
                  {milestoneSummary.milestones.day7.badgeLabel}
                </span>
              </div>
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1.5 truncate">
                Launch Velocity
              </div>
              <div className="text-xs font-black text-slate-900 mt-0.5 truncate">
                {milestoneSummary.milestones.day7.targetDateFormatted}
              </div>
            </div>
            <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px] font-medium">
              <span className="text-slate-500 truncate max-w-[80px]">
                {milestoneSummary.milestones.day7.isLogged ? `${Number(metrics.day7_views).toLocaleString()} views` : "Pending"}
              </span>
              <span className={`text-[10px] font-bold ${activeTab === "7d" ? "text-[#0052FF] font-black" : "text-blue-600 hover:underline"}`}>
                {activeTab === "7d" ? "Active" : "Open →"}
              </span>
            </div>
          </div>

          {/* Step 3: 15-Day Mid-Flight */}
          <div
            onClick={() => setActiveTab("15d")}
            className={`p-3 rounded-xl border transition-all cursor-pointer shadow-2xs flex flex-col justify-between min-h-[108px] ${
              activeTab === "15d"
                ? "bg-cyan-50/70 border-cyan-500 ring-2 ring-cyan-200"
                : "bg-white border-slate-200/90 hover:border-cyan-300"
            }`}
          >
            <div>
              <div className="flex items-center justify-between text-[11px] font-bold">
                <span className="text-slate-900 flex items-center space-x-1.5">
                  <Rocket className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
                  <span>3. Day 15</span>
                </span>
                <span className={`px-1.5 py-0.2 rounded text-[9px] font-black border ${milestoneSummary.milestones.day15.badgeClass}`}>
                  {milestoneSummary.milestones.day15.badgeLabel}
                </span>
              </div>
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1.5 truncate">
                Algorithm Scale
              </div>
              <div className="text-xs font-black text-slate-900 mt-0.5 truncate">
                {milestoneSummary.milestones.day15.targetDateFormatted}
              </div>
            </div>
            <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px] font-medium">
              <span className="text-slate-500 truncate max-w-[80px]">
                {milestoneSummary.milestones.day15.isLogged ? `${Number(metrics.day15_views).toLocaleString()} views` : "Pending"}
              </span>
              <span className={`text-[10px] font-bold ${activeTab === "15d" ? "text-cyan-700 font-black" : "text-cyan-600 hover:underline"}`}>
                {activeTab === "15d" ? "Active" : "Open →"}
              </span>
            </div>
          </div>

          {/* Step 4: 30-Day Wrap */}
          <div
            onClick={() => setActiveTab("30d")}
            className={`p-3 rounded-xl border transition-all cursor-pointer shadow-2xs flex flex-col justify-between min-h-[108px] ${
              activeTab === "30d"
                ? "bg-emerald-50/70 border-emerald-500 ring-2 ring-emerald-200"
                : "bg-white border-slate-200/90 hover:border-emerald-300"
            }`}
          >
            <div>
              <div className="flex items-center justify-between text-[11px] font-bold">
                <span className="text-slate-900 flex items-center space-x-1.5">
                  <Award className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>4. Day 30</span>
                </span>
                <span className={`px-1.5 py-0.2 rounded text-[9px] font-black border ${milestoneSummary.milestones.day30.badgeClass}`}>
                  {milestoneSummary.milestones.day30.badgeLabel}
                </span>
              </div>
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1.5 truncate">
                Mature Wrap
              </div>
              <div className="text-xs font-black text-slate-900 mt-0.5 truncate">
                {milestoneSummary.milestones.day30.targetDateFormatted}
              </div>
            </div>
            <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px] font-medium">
              <span className="text-slate-500 truncate max-w-[80px]">
                {milestoneSummary.milestones.day30.isLogged ? `${Number(metrics.day30_views).toLocaleString()} views` : "Pending"}
              </span>
              <span className={`text-[10px] font-bold ${activeTab === "30d" ? "text-emerald-700 font-black" : "text-emerald-600 hover:underline"}`}>
                {activeTab === "30d" ? "Active" : "Open →"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Segmented Milestone Selector Tabs (Structured 5-Item Grid) */}
      <div className="grid grid-cols-5 p-1 rounded-xl bg-slate-100/90 border border-slate-200/90 text-xs font-bold gap-1">
        <button
          type="button"
          onClick={() => setActiveTab("overall")}
          className={`py-2 px-2 rounded-lg transition-all cursor-pointer flex items-center justify-center space-x-1.5 text-center ${
            activeTab === "overall"
              ? "bg-white text-[#0052FF] shadow-xs font-black ring-1 ring-slate-200/60"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5 shrink-0 text-[#0052FF]" />
          <span className="truncate">Core Stats</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("7d")}
          className={`py-2 px-2 rounded-lg transition-all cursor-pointer flex items-center justify-center space-x-1.5 text-center ${
            activeTab === "7d"
              ? "bg-white text-blue-700 shadow-xs font-black ring-1 ring-slate-200/60"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
          }`}
        >
          <Zap className="w-3.5 h-3.5 shrink-0 text-amber-500" />
          <span className="truncate">7-Day</span>
          {milestoneSummary.milestones.day7.isLogged ? (
            <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
          ) : (milestoneSummary.milestones.day7.isDue || milestoneSummary.milestones.day7.isOverdue) ? (
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping shrink-0" />
          ) : null}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("15d")}
          className={`py-2 px-2 rounded-lg transition-all cursor-pointer flex items-center justify-center space-x-1.5 text-center ${
            activeTab === "15d"
              ? "bg-white text-cyan-700 shadow-xs font-black ring-1 ring-slate-200/60"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
          }`}
        >
          <Rocket className="w-3.5 h-3.5 shrink-0 text-cyan-600" />
          <span className="truncate">15-Day</span>
          {milestoneSummary.milestones.day15.isLogged ? (
            <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
          ) : (milestoneSummary.milestones.day15.isDue || milestoneSummary.milestones.day15.isOverdue) ? (
            <span className="w-2 h-2 rounded-full bg-cyan-500 animate-ping shrink-0" />
          ) : null}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("30d")}
          className={`py-2 px-2 rounded-lg transition-all cursor-pointer flex items-center justify-center space-x-1.5 text-center ${
            activeTab === "30d"
              ? "bg-white text-emerald-700 shadow-xs font-black ring-1 ring-slate-200/60"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
          }`}
        >
          <Award className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
          <span className="truncate">30-Day</span>
          {milestoneSummary.milestones.day30.isLogged ? (
            <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
          ) : (milestoneSummary.milestones.day30.isDue || milestoneSummary.milestones.day30.isOverdue) ? (
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping shrink-0" />
          ) : null}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("all")}
          className={`py-2 px-2 rounded-lg transition-all cursor-pointer flex items-center justify-center space-x-1.5 text-center ${
            activeTab === "all"
              ? "bg-white text-purple-700 shadow-xs font-black ring-1 ring-slate-200/60"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
          }`}
        >
          <Layers className="w-3.5 h-3.5 shrink-0 text-purple-600" />
          <span className="truncate">All-In-One</span>
        </button>
      </div>

      {/* ────────────────── Tab 1: All Core Reel Performance Metrics ────────────────── */}
      {activeTab === "overall" && (
        <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200 space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-900 flex items-center space-x-1.5">
                <span>📊 Core Creator Reel Performance Metrics</span>
              </span>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                Fill all 8 Instagram Insights numbers. All numbers auto-sync to database and client reports.
              </p>
            </div>
            <button
              type="button"
              onClick={autoCalculateOverallEr}
              className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#0052FF] text-[11px] font-bold border border-blue-200 transition-colors flex items-center space-x-1 cursor-pointer"
              title="Automatically calculate Engagement Rate based on (Likes + Comments + Saves + Shares) / Total Views"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#0052FF]" />
              <span>Auto-Calculate ER</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1">
                <Eye className="w-3 h-3 text-[#0052FF]" />
                <span>Total Views</span>
              </label>
              <input
                type="number"
                value={metrics.total_views || ""}
                onChange={(e) => updateField("total_views", Number(e.target.value))}
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
                placeholder="0"
                className={inputClass}
                readOnly={isReadOnly}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1">
                <MessageCircle className="w-3 h-3 text-blue-500" />
                <span>Comments</span>
              </label>
              <input
                type="number"
                value={metrics.comments || ""}
                onChange={(e) => updateField("comments", Number(e.target.value))}
                placeholder="0"
                className={inputClass}
                readOnly={isReadOnly}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1">
                <Bookmark className="w-3 h-3 text-amber-500" />
                <span>Saves</span>
              </label>
              <input
                type="number"
                value={metrics.saves || ""}
                onChange={(e) => updateField("saves", Number(e.target.value))}
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
                placeholder="e.g. 14.5s"
                className={inputClass}
                readOnly={isReadOnly}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1">
                <TrendingUp className="w-3 h-3 text-emerald-600" />
                <span>Engagement Rate (%)</span>
              </label>
              <input
                type="number"
                step="0.01"
                value={metrics.engagement_rate || ""}
                onChange={(e) => updateField("engagement_rate", Number(e.target.value))}
                placeholder="0.00"
                className={inputClass}
                readOnly={isReadOnly}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1">
                <Users className="w-3 h-3 text-purple-500" />
                <span>Account Reach</span>
              </label>
              <input
                type="number"
                value={metrics.account_reach || ""}
                onChange={(e) => updateField("account_reach", Number(e.target.value))}
                placeholder="0"
                className={inputClass}
                readOnly={isReadOnly}
              />
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200">
            <ScreenshotUploader
              value={metrics.screenshots || ""}
              onChange={(val) => updateField("screenshots", val)}
              creatorId={String(creator.id)}
              milestone="overall"
              label="Overall Reel Insights Screenshot Proofs (Up to 5)"
              description="Upload up to 5 verified Instagram Insights screenshots (Overview, Demographics, Retention, Interactions). Auto-compressed & saved to Google Drive."
              maxFiles={5}
              isReadOnly={isReadOnly}
            />
          </div>
        </div>
      )}

      {/* ────────────────── Tab 2: 7-Day Performance ────────────────── */}
      {activeTab === "7d" && (
        <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50/50 via-white to-slate-50 border border-blue-100 space-y-3 animate-in fade-in">
          {/* Milestone Reference Context Banner */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-blue-50/70 border border-blue-200/80 text-xs">
            <div className="flex flex-wrap items-center gap-1.5 text-slate-700 text-[11px]">
              <span className="font-bold text-blue-900 flex items-center space-x-1 mr-1">
                <Sparkles className="w-3.5 h-3.5 text-[#0052FF]" />
                <span>Core Reference:</span>
              </span>
              <span className="px-2 py-0.5 rounded-md bg-white text-slate-800 font-bold border border-blue-100 shadow-2xs">
                {Number(metrics.total_views || 0).toLocaleString()} Views
              </span>
              <span className="px-2 py-0.5 rounded-md bg-white text-slate-800 font-bold border border-blue-100 shadow-2xs">
                {Number(metrics.likes || 0).toLocaleString()} Likes
              </span>
              <span className="px-2 py-0.5 rounded-md bg-white text-slate-800 font-bold border border-blue-100 shadow-2xs">
                {Number(metrics.comments || 0).toLocaleString()} Comments
              </span>
              <span className="px-2 py-0.5 rounded-md bg-white text-slate-800 font-bold border border-blue-100 shadow-2xs">
                {Number(metrics.saves || 0).toLocaleString()} Saves
              </span>
              <span className="px-2 py-0.5 rounded-md bg-white text-slate-800 font-bold border border-blue-100 shadow-2xs">
                {Number(metrics.shares || 0).toLocaleString()} Shares
              </span>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab("overall")}
              className="px-2.5 py-1 rounded-lg bg-[#0052FF] hover:bg-blue-700 text-white text-[10px] font-bold transition-all cursor-pointer shrink-0 shadow-2xs"
            >
              Edit Core Metrics →
            </button>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-900 flex items-center space-x-1.5">
              <span>⚡ Day 7 Milestone Window</span>
            </span>
            <span className="text-[10px] font-semibold text-slate-500">
              Initial launch momentum snapshot
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider flex items-center space-x-1">
                <Eye className="w-3 h-3 text-[#0052FF]" />
                <span>Day 7 Views</span>
              </label>
              <input
                type="number"
                value={metrics.day7_views || ""}
                onChange={(e) => updateField("day7_views", Number(e.target.value))}
                placeholder="e.g. 25000"
                className={inputClass}
                readOnly={isReadOnly}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider flex items-center space-x-1">
                <TrendingUp className="w-3 h-3 text-emerald-600" />
                <span>Day 7 Engagement Rate (%)</span>
              </label>
              <input
                type="number"
                step="0.01"
                value={metrics.day7_er || ""}
                onChange={(e) => updateField("day7_er", Number(e.target.value))}
                placeholder="e.g. 4.25"
                className={inputClass}
                readOnly={isReadOnly}
              />
            </div>
          </div>

          <div className="pt-1">
            <ScreenshotUploader
              value={metrics.day7_screenshot || ""}
              onChange={(url) => updateField("day7_screenshot", url)}
              creatorId={String(creator.id)}
              milestone="7d"
              label="Day 7 Insights Proof Screenshots (Up to 5)"
              description="Upload up to 5 Instagram Insights screenshots (auto-compressed & uploaded to Google Drive)."
              maxFiles={5}
              isReadOnly={isReadOnly}
            />
          </div>
        </div>
      )}

      {/* ────────────────── Tab 3: 15-Day Performance ────────────────── */}
      {activeTab === "15d" && (
        <div className="p-4 rounded-xl bg-gradient-to-br from-cyan-50/50 via-white to-slate-50 border border-cyan-100 space-y-3 animate-in fade-in">
          {/* Milestone Reference Context Banner */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-cyan-50/70 border border-cyan-200/80 text-xs">
            <div className="flex flex-wrap items-center gap-1.5 text-slate-700 text-[11px]">
              <span className="font-bold text-cyan-950 flex items-center space-x-1 mr-1">
                <Sparkles className="w-3.5 h-3.5 text-cyan-700" />
                <span>Core Reference:</span>
              </span>
              <span className="px-2 py-0.5 rounded-md bg-white text-slate-800 font-bold border border-cyan-100 shadow-2xs">
                {Number(metrics.total_views || 0).toLocaleString()} Views
              </span>
              <span className="px-2 py-0.5 rounded-md bg-white text-slate-800 font-bold border border-cyan-100 shadow-2xs">
                {Number(metrics.likes || 0).toLocaleString()} Likes
              </span>
              <span className="px-2 py-0.5 rounded-md bg-white text-slate-800 font-bold border border-cyan-100 shadow-2xs">
                {Number(metrics.comments || 0).toLocaleString()} Comments
              </span>
              <span className="px-2 py-0.5 rounded-md bg-white text-slate-800 font-bold border border-cyan-100 shadow-2xs">
                {Number(metrics.saves || 0).toLocaleString()} Saves
              </span>
              <span className="px-2 py-0.5 rounded-md bg-white text-slate-800 font-bold border border-cyan-100 shadow-2xs">
                {Number(metrics.shares || 0).toLocaleString()} Shares
              </span>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab("overall")}
              className="px-2.5 py-1 rounded-lg bg-cyan-700 hover:bg-cyan-800 text-white text-[10px] font-bold transition-all cursor-pointer shrink-0 shadow-2xs"
            >
              Edit Core Metrics →
            </button>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-cyan-900 flex items-center space-x-1.5">
              <span>🚀 Day 15 Mid-Flight Window</span>
            </span>
            <span className="text-[10px] font-semibold text-slate-500">
              Algorithm expansion snapshot
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider flex items-center space-x-1">
                <Eye className="w-3 h-3 text-[#00A3FF]" />
                <span>Day 15 Views</span>
              </label>
              <input
                type="number"
                value={metrics.day15_views || ""}
                onChange={(e) => updateField("day15_views", Number(e.target.value))}
                placeholder="e.g. 52000"
                className={inputClass}
                readOnly={isReadOnly}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider flex items-center space-x-1">
                <TrendingUp className="w-3 h-3 text-emerald-600" />
                <span>Day 15 Engagement Rate (%)</span>
              </label>
              <input
                type="number"
                step="0.01"
                value={metrics.day15_er || ""}
                onChange={(e) => updateField("day15_er", Number(e.target.value))}
                placeholder="e.g. 3.80"
                className={inputClass}
                readOnly={isReadOnly}
              />
            </div>
          </div>

          <div className="pt-1">
            <ScreenshotUploader
              value={metrics.day15_screenshot || ""}
              onChange={(url) => updateField("day15_screenshot", url)}
              creatorId={String(creator.id)}
              milestone="15d"
              label="Day 15 Insights Proof Screenshots (Up to 5)"
              description="Upload up to 5 Instagram Insights screenshots (auto-compressed & uploaded to Google Drive)."
              maxFiles={5}
              isReadOnly={isReadOnly}
            />
          </div>
        </div>
      )}

      {/* ────────────────── Tab 4: 30-Day Performance ────────────────── */}
      {activeTab === "30d" && (
        <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-50/50 via-white to-slate-50 border border-emerald-100 space-y-3 animate-in fade-in">
          {/* Milestone Reference Context Banner */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-emerald-50/70 border border-emerald-200/80 text-xs">
            <div className="flex flex-wrap items-center gap-1.5 text-slate-700 text-[11px]">
              <span className="font-bold text-emerald-950 flex items-center space-x-1 mr-1">
                <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
                <span>Core Reference:</span>
              </span>
              <span className="px-2 py-0.5 rounded-md bg-white text-slate-800 font-bold border border-emerald-100 shadow-2xs">
                {Number(metrics.total_views || 0).toLocaleString()} Views
              </span>
              <span className="px-2 py-0.5 rounded-md bg-white text-slate-800 font-bold border border-emerald-100 shadow-2xs">
                {Number(metrics.likes || 0).toLocaleString()} Likes
              </span>
              <span className="px-2 py-0.5 rounded-md bg-white text-slate-800 font-bold border border-emerald-100 shadow-2xs">
                {Number(metrics.comments || 0).toLocaleString()} Comments
              </span>
              <span className="px-2 py-0.5 rounded-md bg-white text-slate-800 font-bold border border-emerald-100 shadow-2xs">
                {Number(metrics.saves || 0).toLocaleString()} Saves
              </span>
              <span className="px-2 py-0.5 rounded-md bg-white text-slate-800 font-bold border border-emerald-100 shadow-2xs">
                {Number(metrics.shares || 0).toLocaleString()} Shares
              </span>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab("overall")}
              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold transition-all cursor-pointer shrink-0 shadow-2xs"
            >
              Edit Core Metrics →
            </button>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-900 flex items-center space-x-1.5">
              <span>🏆 Day 30 Mature Impact Window</span>
            </span>
            <span className="text-[10px] font-semibold text-slate-500">
              Mature campaign wrap snapshot
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider flex items-center space-x-1">
                <Eye className="w-3 h-3 text-emerald-600" />
                <span>Day 30 Views</span>
              </label>
              <input
                type="number"
                value={metrics.day30_views || ""}
                onChange={(e) => updateField("day30_views", Number(e.target.value))}
                placeholder="e.g. 78000"
                className={inputClass}
                readOnly={isReadOnly}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider flex items-center space-x-1">
                <TrendingUp className="w-3 h-3 text-emerald-600" />
                <span>Day 30 Engagement Rate (%)</span>
              </label>
              <input
                type="number"
                step="0.01"
                value={metrics.day30_er || ""}
                onChange={(e) => updateField("day30_er", Number(e.target.value))}
                placeholder="e.g. 3.45"
                className={inputClass}
                readOnly={isReadOnly}
              />
            </div>
          </div>

          <div className="pt-1">
            <ScreenshotUploader
              value={metrics.day30_screenshot || ""}
              onChange={(url) => updateField("day30_screenshot", url)}
              creatorId={String(creator.id)}
              milestone="30d"
              label="Day 30 Insights Proof Screenshots (Up to 5)"
              description="Upload up to 5 Instagram Insights screenshots (auto-compressed & uploaded to Google Drive)."
              maxFiles={5}
              isReadOnly={isReadOnly}
            />
          </div>
        </div>
      )}

      {/* ────────────────── Tab 5: All-In-One Full Matrix Form ────────────────── */}
      {activeTab === "all" && (
        <div className="space-y-5 animate-in fade-in">
          {/* Section 1: All 8 Core Reel Performance Metrics */}
          <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
                  <span>📊 1. Core Reel Performance Metrics (All 8 Metrics)</span>
                </span>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                  Total views, reactions, and account reach.
                </p>
              </div>
              <button
                type="button"
                onClick={autoCalculateOverallEr}
                className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#0052FF] text-[11px] font-bold border border-blue-200 transition-colors flex items-center space-x-1 cursor-pointer"
                title="Automatically calculate Engagement Rate based on (Likes + Comments + Saves + Shares) / Total Views"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#0052FF]" />
                <span>Auto-Calculate ER</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1">
                  <Eye className="w-3 h-3 text-[#0052FF]" />
                  <span>Total Views</span>
                </label>
                <input
                  type="number"
                  value={metrics.total_views || ""}
                  onChange={(e) => updateField("total_views", Number(e.target.value))}
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
                  placeholder="0"
                  className={inputClass}
                  readOnly={isReadOnly}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1">
                  <MessageCircle className="w-3 h-3 text-blue-500" />
                  <span>Comments</span>
                </label>
                <input
                  type="number"
                  value={metrics.comments || ""}
                  onChange={(e) => updateField("comments", Number(e.target.value))}
                  placeholder="0"
                  className={inputClass}
                  readOnly={isReadOnly}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1">
                  <Bookmark className="w-3 h-3 text-amber-500" />
                  <span>Saves</span>
                </label>
                <input
                  type="number"
                  value={metrics.saves || ""}
                  onChange={(e) => updateField("saves", Number(e.target.value))}
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
                  placeholder="e.g. 14.5s"
                  className={inputClass}
                  readOnly={isReadOnly}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1">
                  <TrendingUp className="w-3 h-3 text-emerald-600" />
                  <span>Engagement Rate (%)</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={metrics.engagement_rate || ""}
                  onChange={(e) => updateField("engagement_rate", Number(e.target.value))}
                  placeholder="0.00"
                  className={inputClass}
                  readOnly={isReadOnly}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1">
                  <Users className="w-3 h-3 text-purple-500" />
                  <span>Account Reach</span>
                </label>
                <input
                  type="number"
                  value={metrics.account_reach || ""}
                  onChange={(e) => updateField("account_reach", Number(e.target.value))}
                  placeholder="0"
                  className={inputClass}
                  readOnly={isReadOnly}
                />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200">
              <ScreenshotUploader
                value={metrics.screenshots || ""}
                onChange={(val) => updateField("screenshots", val)}
                creatorId={String(creator.id)}
                milestone="overall"
                label="Overall Reel Insights Screenshot Proofs (Up to 5)"
                description="Upload up to 5 verified Instagram Insights screenshots (Overview, Demographics, Retention, Interactions). Auto-compressed & saved to Google Drive."
                maxFiles={5}
                isReadOnly={isReadOnly}
              />
            </div>
          </div>

          {/* Section 2: 7-Day Milestone */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50/50 via-white to-slate-50 border border-blue-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-blue-950 uppercase tracking-wider flex items-center space-x-1.5">
                <span>⚡ 2. Day 7 Milestone Window</span>
              </span>
              <span className="text-[10px] font-semibold text-slate-500">
                Initial launch momentum snapshot
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider flex items-center space-x-1">
                  <Eye className="w-3 h-3 text-[#0052FF]" />
                  <span>Day 7 Views</span>
                </label>
                <input
                  type="number"
                  value={metrics.day7_views || ""}
                  onChange={(e) => updateField("day7_views", Number(e.target.value))}
                  placeholder="e.g. 25000"
                  className={inputClass}
                  readOnly={isReadOnly}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider flex items-center space-x-1">
                  <TrendingUp className="w-3 h-3 text-emerald-600" />
                  <span>Day 7 Engagement Rate (%)</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={metrics.day7_er || ""}
                  onChange={(e) => updateField("day7_er", Number(e.target.value))}
                  placeholder="e.g. 4.25"
                  className={inputClass}
                  readOnly={isReadOnly}
                />
              </div>
            </div>

            <div className="pt-1">
              <ScreenshotUploader
                value={metrics.day7_screenshot || ""}
                onChange={(url) => updateField("day7_screenshot", url)}
                creatorId={String(creator.id)}
                milestone="7d"
                label="Day 7 Insights Proof Screenshots (Up to 5)"
                description="Upload up to 5 Instagram Insights screenshots (auto-compressed & uploaded to Google Drive)."
                maxFiles={5}
                isReadOnly={isReadOnly}
              />
            </div>
          </div>

          {/* Section 3: 15-Day Milestone */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-cyan-50/50 via-white to-slate-50 border border-cyan-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-cyan-950 uppercase tracking-wider flex items-center space-x-1.5">
                <span>🚀 3. Day 15 Mid-Flight Window</span>
              </span>
              <span className="text-[10px] font-semibold text-slate-500">
                Algorithm expansion snapshot
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider flex items-center space-x-1">
                  <Eye className="w-3 h-3 text-[#00A3FF]" />
                  <span>Day 15 Views</span>
                </label>
                <input
                  type="number"
                  value={metrics.day15_views || ""}
                  onChange={(e) => updateField("day15_views", Number(e.target.value))}
                  placeholder="e.g. 52000"
                  className={inputClass}
                  readOnly={isReadOnly}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider flex items-center space-x-1">
                  <TrendingUp className="w-3 h-3 text-emerald-600" />
                  <span>Day 15 Engagement Rate (%)</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={metrics.day15_er || ""}
                  onChange={(e) => updateField("day15_er", Number(e.target.value))}
                  placeholder="e.g. 3.80"
                  className={inputClass}
                  readOnly={isReadOnly}
                />
              </div>
            </div>

            <div className="pt-1">
              <ScreenshotUploader
                value={metrics.day15_screenshot || ""}
                onChange={(url) => updateField("day15_screenshot", url)}
                creatorId={String(creator.id)}
                milestone="15d"
                label="Day 15 Insights Proof Screenshots (Up to 5)"
                description="Upload up to 5 Instagram Insights screenshots (auto-compressed & uploaded to Google Drive)."
                maxFiles={5}
                isReadOnly={isReadOnly}
              />
            </div>
          </div>

          {/* Section 4: 30-Day Milestone */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50/50 via-white to-slate-50 border border-emerald-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-emerald-950 uppercase tracking-wider flex items-center space-x-1.5">
                <span>🏆 4. Day 30 Mature Impact Window</span>
              </span>
              <span className="text-[10px] font-semibold text-slate-500">
                Mature campaign wrap snapshot
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider flex items-center space-x-1">
                  <Eye className="w-3 h-3 text-emerald-600" />
                  <span>Day 30 Views</span>
                </label>
                <input
                  type="number"
                  value={metrics.day30_views || ""}
                  onChange={(e) => updateField("day30_views", Number(e.target.value))}
                  placeholder="e.g. 78000"
                  className={inputClass}
                  readOnly={isReadOnly}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider flex items-center space-x-1">
                  <TrendingUp className="w-3 h-3 text-emerald-600" />
                  <span>Day 30 Engagement Rate (%)</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={metrics.day30_er || ""}
                  onChange={(e) => updateField("day30_er", Number(e.target.value))}
                  placeholder="e.g. 3.45"
                  className={inputClass}
                  readOnly={isReadOnly}
                />
              </div>
            </div>

            <div className="pt-1">
              <ScreenshotUploader
                value={metrics.day30_screenshot || ""}
                onChange={(url) => updateField("day30_screenshot", url)}
                creatorId={String(creator.id)}
                milestone="30d"
                label="Day 30 Insights Proof Screenshots (Up to 5)"
                description="Upload up to 5 Instagram Insights screenshots (auto-compressed & uploaded to Google Drive)."
                maxFiles={5}
                isReadOnly={isReadOnly}
              />
            </div>
          </div>

          {/* Sticky Bottom Save Button for All-in-One Form */}
          {!isReadOnly && (
            <div className="flex items-center justify-between pt-3 border-t border-slate-200">
              <p className="text-xs text-slate-500 font-medium">
                Changes to all 4 milestone sections will be saved simultaneously.
              </p>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all cursor-pointer shadow-sm disabled:opacity-50 flex items-center space-x-2"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Saving All Sections...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Save All Metrics &amp; Milestones</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
