"use client";

import React, { useState, useEffect, useCallback } from "react";
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
  ArrowRight,
  Save,
  Check
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
  const [isDirty, setIsDirty] = useState(false);
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
    setIsDirty(false);
    if (initialTab) setActiveTab(initialTab);
  }, [creator.id, initialTab]);

  const updateField = (field: string, value: string | number) => {
    setMetrics((prev) => ({ ...prev, [field]: value }));
    setSaveSuccess(false);
    setIsDirty(true);
  };

  const handleSave = useCallback(async () => {
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
        setIsDirty(false);
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
    "w-full bg-slate-50 focus:bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-[#0052FF] focus:ring-2 focus:ring-[#0052FF]/20 transition-all font-mono";

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-4">
      {/* ── Top Header: Clean, Minimal, Fast ── */}
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

        {/* Live Date Pill & Top Action */}
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

      {/* ── Interactive Milestone Progression (Clean & Minimal) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {/* Step 1: Live Date */}
        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-800">1. Live Date</span>
            <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-blue-50 text-[#0052FF] border border-blue-200">
              Origin
            </span>
          </div>
          <div className="text-xs font-extrabold text-slate-900 mt-1 truncate">
            {milestoneSummary.liveDateFormatted}
          </div>
          <div className="text-[10px] text-slate-400 font-medium mt-1">
            {milestoneSummary.daysSinceLive !== null ? `${milestoneSummary.daysSinceLive}d live` : "Set date"}
          </div>
        </div>

        {/* Step 2: Day 7 */}
        <div
          onClick={() => setActiveTab("7d")}
          className={`p-2.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
            activeTab === "7d"
              ? "bg-blue-50 border-blue-500 ring-2 ring-blue-200 shadow-xs"
              : "bg-white border-slate-200 hover:border-blue-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-900 flex items-center space-x-1">
              <Zap className="w-3 h-3 text-amber-500 shrink-0" />
              <span>2. Day 7</span>
            </span>
            <span className={`px-1.5 py-0.2 rounded text-[9px] font-black border ${milestoneSummary.milestones.day7.badgeClass}`}>
              {milestoneSummary.milestones.day7.badgeLabel}
            </span>
          </div>
          <div className="text-xs font-extrabold text-slate-900 mt-1 truncate">
            {milestoneSummary.milestones.day7.targetDateFormatted}
          </div>
          <div className="text-[10px] font-bold flex items-center justify-between mt-1">
            <span className="text-slate-500 truncate">
              {milestoneSummary.milestones.day7.isLogged ? `${Number(metrics.day7_views).toLocaleString()} views` : "Pending"}
            </span>
            <span className={activeTab === "7d" ? "text-[#0052FF]" : "text-blue-600"}>
              {activeTab === "7d" ? "Active" : "Fill →"}
            </span>
          </div>
        </div>

        {/* Step 3: Day 15 */}
        <div
          onClick={() => setActiveTab("15d")}
          className={`p-2.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
            activeTab === "15d"
              ? "bg-cyan-50 border-cyan-500 ring-2 ring-cyan-200 shadow-xs"
              : "bg-white border-slate-200 hover:border-cyan-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-900 flex items-center space-x-1">
              <Rocket className="w-3 h-3 text-cyan-600 shrink-0" />
              <span>3. Day 15</span>
            </span>
            <span className={`px-1.5 py-0.2 rounded text-[9px] font-black border ${milestoneSummary.milestones.day15.badgeClass}`}>
              {milestoneSummary.milestones.day15.badgeLabel}
            </span>
          </div>
          <div className="text-xs font-extrabold text-slate-900 mt-1 truncate">
            {milestoneSummary.milestones.day15.targetDateFormatted}
          </div>
          <div className="text-[10px] font-bold flex items-center justify-between mt-1">
            <span className="text-slate-500 truncate">
              {milestoneSummary.milestones.day15.isLogged ? `${Number(metrics.day15_views).toLocaleString()} views` : "Pending"}
            </span>
            <span className={activeTab === "15d" ? "text-cyan-700" : "text-cyan-600"}>
              {activeTab === "15d" ? "Active" : "Fill →"}
            </span>
          </div>
        </div>

        {/* Step 4: Day 30 */}
        <div
          onClick={() => setActiveTab("30d")}
          className={`p-2.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
            activeTab === "30d"
              ? "bg-emerald-50 border-emerald-500 ring-2 ring-emerald-200 shadow-xs"
              : "bg-white border-slate-200 hover:border-emerald-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-900 flex items-center space-x-1">
              <Award className="w-3 h-3 text-emerald-600 shrink-0" />
              <span>4. Day 30</span>
            </span>
            <span className={`px-1.5 py-0.2 rounded text-[9px] font-black border ${milestoneSummary.milestones.day30.badgeClass}`}>
              {milestoneSummary.milestones.day30.badgeLabel}
            </span>
          </div>
          <div className="text-xs font-extrabold text-slate-900 mt-1 truncate">
            {milestoneSummary.milestones.day30.targetDateFormatted}
          </div>
          <div className="text-[10px] font-bold flex items-center justify-between mt-1">
            <span className="text-slate-500 truncate">
              {milestoneSummary.milestones.day30.isLogged ? `${Number(metrics.day30_views).toLocaleString()} views` : "Pending"}
            </span>
            <span className={activeTab === "30d" ? "text-emerald-700" : "text-emerald-600"}>
              {activeTab === "30d" ? "Active" : "Fill →"}
            </span>
          </div>
        </div>
      </div>

      {/* ── Segmented Fast Tab Switcher (Never truncates on mobile) ── */}
      <div className="grid grid-cols-5 p-1 rounded-xl bg-slate-100 border border-slate-200/90 text-xs font-bold gap-1">
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
          <span className="truncate">Core</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("7d")}
          className={`py-2 px-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center space-x-1 text-center ${
            activeTab === "7d"
              ? "bg-white text-blue-700 shadow-xs font-black"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Zap className="w-3.5 h-3.5 shrink-0 text-amber-500" />
          <span>7 Days</span>
          {milestoneSummary.milestones.day7.isLogged ? (
            <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
          ) : (milestoneSummary.milestones.day7.isDue || milestoneSummary.milestones.day7.isOverdue) ? (
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping shrink-0" />
          ) : null}
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
          {milestoneSummary.milestones.day15.isLogged ? (
            <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
          ) : (milestoneSummary.milestones.day15.isDue || milestoneSummary.milestones.day15.isOverdue) ? (
            <span className="w-2 h-2 rounded-full bg-cyan-500 animate-ping shrink-0" />
          ) : null}
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
          {milestoneSummary.milestones.day30.isLogged ? (
            <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
          ) : (milestoneSummary.milestones.day30.isDue || milestoneSummary.milestones.day30.isOverdue) ? (
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping shrink-0" />
          ) : null}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("all")}
          className={`py-2 px-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center space-x-1 text-center ${
            activeTab === "all"
              ? "bg-white text-purple-700 shadow-xs font-black"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Layers className="w-3.5 h-3.5 shrink-0 text-purple-600" />
          <span className="truncate">All</span>
        </button>
      </div>

      {/* ────────────────── Tab 1: Core Performance ────────────────── */}
      {activeTab === "overall" && (
        <div className="space-y-3 animate-in fade-in">
          {/* Fast Entry Grid: Row 1 Primary Reach & Views */}
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
                <Users className="w-3 h-3 text-purple-500" />
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
                <MessageCircle className="w-3 h-3 text-blue-500" />
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

          {/* Fast Entry Grid: Row 2 Interactions & ER */}
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
                  <TrendingUp className="w-3 h-3 text-emerald-600" />
                  <span>ER (%)</span>
                </label>
                <button
                  type="button"
                  onClick={autoCalculateOverallEr}
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

          {/* Screenshot Proofs */}
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

      {/* ────────────────── Tab 2: 7-Day Performance ────────────────── */}
      {activeTab === "7d" && (
        <div className="space-y-3 animate-in fade-in">
          <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-200/80 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2">
              <Zap className="w-4 h-4 text-amber-500" />
              <span className="font-bold text-blue-950">Day 7 Window:</span>
              <span className="text-slate-600">{milestoneSummary.milestones.day7.targetDateFormatted}</span>
            </div>
            {Number(metrics.total_views) > 0 && !metrics.day7_views && (
              <button
                type="button"
                onClick={() => {
                  updateField("day7_views", metrics.total_views);
                  if (metrics.engagement_rate) updateField("day7_er", metrics.engagement_rate);
                }}
                className="text-[10px] font-bold text-[#0052FF] bg-white px-2 py-0.5 rounded border border-blue-200 hover:bg-blue-50 cursor-pointer shadow-2xs"
              >
                Copy from Core ({Number(metrics.total_views).toLocaleString()} views)
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                <TrendingUp className="w-3 h-3 text-emerald-600" />
                <span>Day 7 Engagement Rate (%)</span>
              </label>
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

      {/* ────────────────── Tab 3: 15-Day Performance ────────────────── */}
      {activeTab === "15d" && (
        <div className="space-y-3 animate-in fade-in">
          <div className="p-3 rounded-xl bg-cyan-50/60 border border-cyan-200/80 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2">
              <Rocket className="w-4 h-4 text-cyan-600" />
              <span className="font-bold text-cyan-950">Day 15 Window:</span>
              <span className="text-slate-600">{milestoneSummary.milestones.day15.targetDateFormatted}</span>
            </div>
            {Number(metrics.total_views) > 0 && !metrics.day15_views && (
              <button
                type="button"
                onClick={() => {
                  updateField("day15_views", metrics.total_views);
                  if (metrics.engagement_rate) updateField("day15_er", metrics.engagement_rate);
                }}
                className="text-[10px] font-bold text-cyan-800 bg-white px-2 py-0.5 rounded border border-cyan-200 hover:bg-cyan-50 cursor-pointer shadow-2xs"
              >
                Copy from Core ({Number(metrics.total_views).toLocaleString()} views)
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1">
                <Eye className="w-3 h-3 text-[#00A3FF]" />
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
                <TrendingUp className="w-3 h-3 text-emerald-600" />
                <span>Day 15 Engagement Rate (%)</span>
              </label>
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

      {/* ────────────────── Tab 4: 30-Day Performance ────────────────── */}
      {activeTab === "30d" && (
        <div className="space-y-3 animate-in fade-in">
          <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200/80 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2">
              <Award className="w-4 h-4 text-emerald-600" />
              <span className="font-bold text-emerald-950">Day 30 Window:</span>
              <span className="text-slate-600">{milestoneSummary.milestones.day30.targetDateFormatted}</span>
            </div>
            {Number(metrics.total_views) > 0 && !metrics.day30_views && (
              <button
                type="button"
                onClick={() => {
                  updateField("day30_views", metrics.total_views);
                  if (metrics.engagement_rate) updateField("day30_er", metrics.engagement_rate);
                }}
                className="text-[10px] font-bold text-emerald-800 bg-white px-2 py-0.5 rounded border border-emerald-200 hover:bg-emerald-50 cursor-pointer shadow-2xs"
              >
                Copy from Core ({Number(metrics.total_views).toLocaleString()} views)
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                <TrendingUp className="w-3 h-3 text-emerald-600" />
                <span>Day 30 Engagement Rate (%)</span>
              </label>
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

      {/* ────────────────── Tab 5: All-In-One Full Matrix Form ────────────────── */}
      {activeTab === "all" && (
        <div className="space-y-4 animate-in fade-in">
          {/* Section 1: Core 8 Metrics */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-900 uppercase">Core Reel Performance</span>
              <button
                type="button"
                onClick={autoCalculateOverallEr}
                className="text-[10px] font-bold text-[#0052FF] hover:underline flex items-center space-x-1 cursor-pointer"
              >
                <Sparkles className="w-3 h-3" />
                <span>Auto-Calculate ER</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-600 uppercase">Total Views</label>
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
                <label className="text-[10px] font-bold text-slate-600 uppercase">Reach</label>
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
                <label className="text-[10px] font-bold text-slate-600 uppercase">Likes</label>
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
                <label className="text-[10px] font-bold text-slate-600 uppercase">Comments</label>
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

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-600 uppercase">Saves</label>
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
                <label className="text-[10px] font-bold text-slate-600 uppercase">Shares</label>
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
                <label className="text-[10px] font-bold text-slate-600 uppercase">Avg Watch</label>
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
                <label className="text-[10px] font-bold text-slate-600 uppercase">ER (%)</label>
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
          </div>

          {/* Section 2: 7-Day & 15-Day & 30-Day Compact Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* 7D */}
            <div className="p-3 rounded-xl bg-blue-50/50 border border-blue-200/70 space-y-2">
              <span className="text-xs font-bold text-blue-900 flex items-center space-x-1">
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                <span>Day 7 Milestone</span>
              </span>
              <input
                type="number"
                value={metrics.day7_views || ""}
                onChange={(e) => updateField("day7_views", Number(e.target.value))}
                onFocus={(e) => e.target.select()}
                placeholder="Day 7 Views"
                className={inputClass}
                readOnly={isReadOnly}
              />
              <input
                type="number"
                step="0.01"
                value={metrics.day7_er || ""}
                onChange={(e) => updateField("day7_er", Number(e.target.value))}
                onFocus={(e) => e.target.select()}
                placeholder="Day 7 ER %"
                className={inputClass}
                readOnly={isReadOnly}
              />
            </div>

            {/* 15D */}
            <div className="p-3 rounded-xl bg-cyan-50/50 border border-cyan-200/70 space-y-2">
              <span className="text-xs font-bold text-cyan-900 flex items-center space-x-1">
                <Rocket className="w-3.5 h-3.5 text-cyan-600" />
                <span>Day 15 Milestone</span>
              </span>
              <input
                type="number"
                value={metrics.day15_views || ""}
                onChange={(e) => updateField("day15_views", Number(e.target.value))}
                onFocus={(e) => e.target.select()}
                placeholder="Day 15 Views"
                className={inputClass}
                readOnly={isReadOnly}
              />
              <input
                type="number"
                step="0.01"
                value={metrics.day15_er || ""}
                onChange={(e) => updateField("day15_er", Number(e.target.value))}
                onFocus={(e) => e.target.select()}
                placeholder="Day 15 ER %"
                className={inputClass}
                readOnly={isReadOnly}
              />
            </div>

            {/* 30D */}
            <div className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-200/70 space-y-2">
              <span className="text-xs font-bold text-emerald-900 flex items-center space-x-1">
                <Award className="w-3.5 h-3.5 text-emerald-600" />
                <span>Day 30 Milestone</span>
              </span>
              <input
                type="number"
                value={metrics.day30_views || ""}
                onChange={(e) => updateField("day30_views", Number(e.target.value))}
                onFocus={(e) => e.target.select()}
                placeholder="Day 30 Views"
                className={inputClass}
                readOnly={isReadOnly}
              />
              <input
                type="number"
                step="0.01"
                value={metrics.day30_er || ""}
                onChange={(e) => updateField("day30_er", Number(e.target.value))}
                onFocus={(e) => e.target.select()}
                placeholder="Day 30 ER %"
                className={inputClass}
                readOnly={isReadOnly}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Sticky Persistent Action Bar (Always visible across all tabs!) ── */}
      {!isReadOnly && (
        <div className="sticky bottom-0 z-30 -mx-4 -mb-4 sm:-mx-5 sm:-mb-5 p-3 sm:p-3.5 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-lg flex items-center justify-between gap-2 rounded-b-2xl">
          <div className="flex items-center space-x-2">
            {saveSuccess ? (
              <span className="text-[11px] px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 font-extrabold flex items-center space-x-1 animate-in fade-in">
                <Check className="w-3.5 h-3.5 stroke-[3]" />
                <span>All Changes Saved!</span>
              </span>
            ) : isDirty ? (
              <span className="text-[11px] px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 font-bold border border-amber-200 flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span>Unsaved Edits</span>
              </span>
            ) : (
              <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
                Press <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded font-mono text-[9px]">Ctrl+S</kbd> to save anytime
              </span>
            )}

            {Number(metrics.engagement_rate) > 0 && (
              <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md hidden xs:inline">
                ER: {metrics.engagement_rate}%
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              type="button"
              onClick={autoCalculateOverallEr}
              className="px-3 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#0052FF] text-xs font-bold border border-blue-200 transition-colors flex items-center space-x-1 cursor-pointer"
              title="Auto calculate ER"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Auto Calc</span>
            </button>

            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all cursor-pointer shadow-md disabled:opacity-50 flex items-center space-x-1.5"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
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
      )}
    </div>
  );
};
