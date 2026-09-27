"use client";

import React from "react";
import { 
  Users, 
  Video, 
  Eye, 
  HeartHandshake, 
  TrendingUp, 
  DollarSign, 
  ShieldCheck, 
  CheckCircle2,
  PieChart,
  Sparkles
} from "lucide-react";
import { CreatorDeliverableBrandView, CreatorDeliverableInternal } from "@/lib/types";

interface ExecutiveKpisProps {
  deliverables: (CreatorDeliverableBrandView | CreatorDeliverableInternal)[];
  isInternal: boolean;
  campaignName: string;
}

export const ExecutiveKpis: React.FC<ExecutiveKpisProps> = React.memo(({
  deliverables,
  isInternal,
  campaignName,
}) => {
  const {
    totalCreators,
    activeCount,
    droppedCount,
    liveCount,
    inWorkflowCount,
    totalViews,
    totalReach,
    totalLikes,
    totalComments,
    totalSaves,
    totalShares,
    totalEngagements,
    avgEr,
    totalBrandCost,
    droppedBrandCost,
    totalCreatorCost,
    totalGrossMargin,
    marginPct,
  } = React.useMemo(() => {
    let aCount = 0;
    let dCount = 0;
    let lCount = 0;
    let tViews = 0;
    let tReach = 0;
    let tLikes = 0;
    let tComments = 0;
    let tSaves = 0;
    let tShares = 0;
    let erSum = 0;
    let erCount = 0;
    let bCost = 0;
    let dropBCost = 0;
    let cCost = 0;
    let gMargin = 0;

    for (let i = 0; i < deliverables.length; i++) {
      const d = deliverables[i];
      const isDrop = (
        d.execution_status === "Drop" ||
        d.script_status === "Drop" ||
        d.first_draft_status === "Drop" ||
        d.final_video_status === "Drop" ||
        d.confirmation_mail_status === "Drop"
      );

      if (isDrop) {
        dCount++;
        dropBCost += d.brand_cost || 0;
      } else {
        aCount++;
        if (d.execution_status === "Completed" || Boolean(d.live_link)) {
          lCount++;
        }
        tViews += d.total_views || 0;
        tReach += d.account_reach || 0;
        tLikes += d.likes || 0;
        tComments += d.comments || 0;
        tSaves += d.saves || 0;
        tShares += d.shares || 0;
        if (d.engagement_rate > 0) {
          erSum += d.engagement_rate;
          erCount++;
        }
        bCost += d.brand_cost || 0;
        if (isInternal) {
          cCost += (d as CreatorDeliverableInternal).creator_cost || 0;
          gMargin += (d as CreatorDeliverableInternal).gross_margin || 0;
        }
      }
    }

    return {
      totalCreators: deliverables.length,
      activeCount: aCount,
      droppedCount: dCount,
      liveCount: lCount,
      inWorkflowCount: Math.max(0, aCount - lCount),
      totalViews: tViews,
      totalReach: tReach,
      totalLikes: tLikes,
      totalComments: tComments,
      totalSaves: tSaves,
      totalShares: tShares,
      totalEngagements: tLikes + tComments + tSaves + tShares,
      avgEr: erCount > 0 ? (erSum / erCount).toFixed(2) : "0.00",
      totalBrandCost: bCost,
      droppedBrandCost: dropBCost,
      totalCreatorCost: cCost,
      totalGrossMargin: gMargin,
      marginPct: bCost > 0 ? ((gMargin / bCost) * 100).toFixed(1) : "0.0",
    };
  }, [deliverables, isInternal]);

  const formatNumber = (num: number) => {
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + "M";
    if (num >= 1_000) return (num / 1_000).toFixed(1) + "K";
    return num.toLocaleString();
  };

  const formatCurrency = (val: number) => {
    return "₹" + val.toLocaleString("en-IN");
  };

  return (
    <div className="space-y-4">
      {/* Live Campaign Banner Notice */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 p-3 sm:p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs">
        <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
          <span className="live-indicator-dot shrink-0"></span>
          <span className="text-xs font-bold text-slate-900 tracking-wide shrink-0">
            <span className="hidden sm:inline">Live Campaign </span>Intelligence
          </span>
          <span className="text-xs text-slate-400 shrink-0">•</span>
          <span className="text-xs text-[#0052FF] font-semibold bg-blue-50 px-2 sm:px-2.5 py-0.5 rounded-full border border-blue-200/60 truncate max-w-[200px] sm:max-w-none">
            {campaignName}
          </span>
        </div>

        {isInternal ? (
          <div className="flex items-center space-x-1.5 px-2.5 sm:px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold self-start sm:self-auto shrink-0">
            <PieChart className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">Xcelerate Ops • Internal Financials Unmasked</span>
            <span className="sm:hidden">Internal Financials Unmasked</span>
          </div>
        ) : (
          <div className="flex items-center space-x-1.5 px-2.5 sm:px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold self-start sm:self-auto shrink-0">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="hidden sm:inline">Verified Brand Session • Live Campaign Tracking</span>
            <span className="sm:hidden">Live Tracking Active</span>
          </div>
        )}
      </div>

      {/* High-Contrast KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2.5 sm:gap-3.5">
        
        {/* Total Creators */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs hover:shadow-md hover:border-blue-300 transition-all relative overflow-hidden group">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Creators</span>
            <div className="p-1.5 rounded-lg bg-blue-50 text-[#0052FF] border border-blue-100">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            {totalCreators}
          </div>
          <div className="text-[11px] text-slate-500 font-medium mt-1 flex flex-wrap items-center gap-1">
            <span className="text-[#0052FF] font-bold">{liveCount} Live</span>
            <span>•</span>
            <span>{inWorkflowCount} in workflow</span>
            {droppedCount > 0 && (
              <>
                <span>•</span>
                <span className="text-rose-600 font-bold">{droppedCount} Dropped</span>
              </>
            )}
          </div>
        </div>

        {/* Execution Progress */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs hover:shadow-md hover:border-blue-300 transition-all relative overflow-hidden group">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Progress</span>
            <div className="p-1.5 rounded-lg bg-cyan-50 text-[#00A3FF] border border-cyan-100">
              <Video className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            {activeCount > 0 ? Math.round((liveCount / activeCount) * 100) : 0}%
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full mt-2 overflow-hidden border border-slate-200/50">
            <div 
              className="bg-gradient-to-r from-[#0052FF] to-[#00C2FF] h-full rounded-full transition-all duration-500"
              style={{ width: `${activeCount > 0 ? (liveCount / activeCount) * 100 : 0}%` }}
            ></div>
          </div>
        </div>

        {/* Total Views */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs hover:shadow-md hover:border-blue-300 transition-all relative overflow-hidden group">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Total Views</span>
            <div className="p-1.5 rounded-lg bg-blue-50 text-[#0052FF] border border-blue-100">
              <Eye className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            {formatNumber(totalViews)}
          </div>
          <div className="text-[11px] text-slate-500 font-medium mt-1">
            {totalViews > 0 ? (
              <span className="text-emerald-600 font-bold">▲ Day 7/15/30 live</span>
            ) : (
              <span className="text-slate-400">Awaiting sheet metrics</span>
            )}
          </div>
        </div>

        {/* Audience Reach */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs hover:shadow-md hover:border-blue-300 transition-all relative overflow-hidden group">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Audience Reach</span>
            <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            {formatNumber(totalReach)}
          </div>
          <div className="text-[11px] text-slate-500 font-medium mt-1">
            {totalReach > 0 ? "Unique impressions" : <span className="text-slate-400">Awaiting reach data</span>}
          </div>
        </div>

        {/* Average Engagement Rate */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs hover:shadow-md hover:border-blue-300 transition-all relative overflow-hidden group">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Avg Engagement</span>
            <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600 border border-amber-100">
              <HeartHandshake className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            {avgEr}%
          </div>
          <div className="text-[11px] text-slate-500 font-medium mt-1">
            {totalEngagements > 0 ? `${formatNumber(totalEngagements)} interactions` : <span className="text-slate-400">0 interactions logged</span>}
          </div>
        </div>

        {/* Commercials: Brand Spend or Margin */}
        {isInternal ? (
          <div className="p-4 rounded-2xl bg-white border-2 border-blue-200 shadow-xs hover:shadow-md transition-all relative overflow-hidden">
            <div className="flex items-center justify-between text-[#0052FF] text-xs font-bold uppercase tracking-wider mb-2">
              <span>Gross Margin</span>
              <div className="p-1.5 rounded-lg bg-blue-50 text-[#0052FF] border border-blue-100">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-[#0052FF] tracking-tight">
              {formatCurrency(totalGrossMargin)}
            </div>
            <div className="text-[11px] text-slate-700 font-bold mt-1">
              {marginPct}% Margin ({formatCurrency(totalBrandCost)} Rev)
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs hover:shadow-md hover:border-blue-300 transition-all relative overflow-hidden group">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">
              <span>Campaign Budget</span>
              <div className="p-1.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {formatCurrency(totalBrandCost)}
            </div>
            <div className="text-[11px] text-slate-500 font-medium mt-1">
              {droppedCount > 0 ? (
                <span className="text-slate-600">Active • <span className="text-rose-600 font-semibold">{formatCurrency(droppedBrandCost)} saved</span></span>
              ) : (
                <span>Approved Commercials</span>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
});
