"use client";

import React, { useState, useMemo } from "react";
import { 
  DollarSign, 
  TrendingUp, 
  PieChart, 
  ShieldCheck, 
  Users, 
  Building2, 
  ArrowUpRight,
  Sparkles,
  Search
} from "lucide-react";
import { CampaignSummary } from "@/lib/types";

interface AgencyFinancialsViewProps {
  campaigns: CampaignSummary[];
}

export const AgencyFinancialsView: React.FC<AgencyFinancialsViewProps> = React.memo(({
  campaigns,
}) => {
  const [searchQuery, setSearchQuery] = useState("");

  const formatCurrency = (val: number) => "₹" + val.toLocaleString("en-IN");

  const filteredCampaigns = useMemo(() => {
    if (!searchQuery.trim()) return campaigns;
    const q = searchQuery.toLowerCase();
    return campaigns.filter(
      (c) =>
        c.id.toLowerCase().includes(q) ||
        c.org_name.toLowerCase().includes(q) ||
        (c.campaign_name && c.campaign_name.toLowerCase().includes(q)) ||
        (c.campaign_month && c.campaign_month.toLowerCase().includes(q))
    );
  }, [campaigns, searchQuery]);

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50/80 via-indigo-50/60 to-white border border-blue-200 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div>
          <h3 className="text-base font-black text-slate-900 flex items-center space-x-2">
            <PieChart className="w-5 h-5 text-[#0052FF]" />
            <span>Xcelerate Pulse Agency ERP: Commercials &amp; Margins Intelligence</span>
          </h3>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Internal Operations: Full campaign profitability, creator payouts, and client credential provisioning.
          </p>
        </div>

        <span className="text-xs px-3 py-1 rounded-full bg-blue-100 text-[#0052FF] border border-blue-200 font-extrabold">
          Restricted Leadership Access
        </span>
      </div>

      {/* Campaigns Financial Performance Breakdown */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-0.5">
            <h4 className="text-sm font-black text-slate-900 flex items-center space-x-2">
              <Building2 className="w-4 h-4 text-[#0052FF]" />
              <span>Active Campaigns Portfolio &amp; P&amp;L Health</span>
            </h4>
            <p className="text-[11px] text-slate-500 font-medium">
              Showing {filteredCampaigns.length} of {campaigns.length} campaigns
            </p>
          </div>

          {/* Quick Table Search */}
          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search campaign, brand, or month..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#0052FF]"
            />
          </div>
        </div>

        {/* Dedicated Internal Scrollable Table Container */}
        <div className="max-h-[440px] overflow-y-auto overflow-x-auto custom-modal-scroll rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 z-10 bg-slate-100 border-b border-slate-300/80 text-slate-700 font-bold uppercase text-[11px] shadow-2xs">
              <tr>
                <th className="py-3 px-3.5">Campaign Name &amp; Client</th>
                <th className="py-3 px-3.5">Month</th>
                <th className="py-3 px-3.5">Creators</th>
                <th className="py-3 px-3.5">Aggregated Views</th>
                <th className="py-3 px-3.5">Payment Terms</th>
                <th className="py-3 px-3.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCampaigns.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 font-medium text-xs">
                    No matching campaigns found
                  </td>
                </tr>
              ) : (
                filteredCampaigns.map((c) => {
                  const hasCustomTitle =
                    c.campaign_name &&
                    c.campaign_name.trim().toLowerCase() !== c.org_name.trim().toLowerCase();

                  return (
                    <tr key={c.id} className="hover:bg-blue-50/40 transition-colors">
                      <td className="py-3 px-3.5">
                        <div className="font-extrabold text-slate-900 text-xs truncate max-w-sm">
                          {hasCustomTitle ? c.campaign_name : c.org_name}
                        </div>
                        <div className="flex items-center space-x-1.5 mt-0.5">
                          <span className="text-[11px] text-[#0052FF] font-bold">
                            {c.org_name}
                          </span>
                          {c.client_type && c.client_type.trim() && (
                            <span className="px-1.5 py-0.2 rounded-md bg-blue-50 text-blue-700 text-[9px] font-bold border border-blue-200/60 uppercase">
                              {c.client_type}
                            </span>
                          )}
                          <span className="text-[10px] text-slate-400 font-mono">
                            • {c.id}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3.5 text-slate-600 font-semibold">
                        {c.campaign_month || "—"}
                      </td>
                      <td className="py-3 px-3.5 font-extrabold text-slate-900">
                        {c.deliverables_count || 0} Creators
                      </td>
                      <td className="py-3 px-3.5 font-extrabold text-[#0052FF]">
                        {(c.total_views || 0).toLocaleString()} Views
                      </td>
                      <td className="py-3 px-3.5 text-slate-600 font-medium">
                        {c.brand_payment_cycle || "Net 30"}
                      </td>
                      <td className="py-3 px-3.5">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            c.status === "Completed"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-blue-50 text-blue-700 border-blue-200"
                          }`}
                        >
                          {c.status || "Completed"}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
});
