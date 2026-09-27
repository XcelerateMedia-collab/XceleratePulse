"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { Role, BrandCredential } from "@/lib/types";
import { 
  Building2, 
  ChevronDown, 
  FileSpreadsheet, 
  Lock, 
  RefreshCw, 
  ShieldCheck, 
  Sparkles,
  CheckCircle2,
  Home as HomeIcon,
  Search,
  X,
  LogOut
} from "lucide-react";

interface NavbarProps {
  currentRole: Role;
  onRoleChange: (role: Role) => void;
  selectedOrg: string;
  onOrgChange: (org: string) => void;
  onOpenSyncModal?: () => void;
  onRefreshData?: () => void;
  isSyncing?: boolean;
  credentials?: BrandCredential[];
  onExitToLanding?: () => void;
  onCredentialChange?: (cred: BrandCredential | null) => void;
}

export const Navbar: React.FC<NavbarProps> = React.memo(({
  currentRole,
  onRoleChange,
  selectedOrg,
  onOrgChange,
  onOpenSyncModal,
  onRefreshData,
  isSyncing = false,
  credentials = [],
  onExitToLanding,
  onCredentialChange,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Click-outside handler to close dropdown cleanly
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
        setSearchQuery("");
      }
    };
    if (dropdownOpen) {
      document.addEventListener("mousedown", handler);
    }
    return () => document.removeEventListener("mousedown", handler);
  }, [dropdownOpen]);

  const isInternalAdmin = currentRole === "SUPER_ADMIN" || currentRole === "INTERNAL_OPS";
  const isEmployeeRole = currentRole === "EMPLOYEE";
  const isAnalystRole = currentRole === "PERFORMANCE_ANALYST";
  const isInternalTeam = isInternalAdmin || isEmployeeRole || isAnalystRole;

  const filteredCredentials = credentials.filter((cred) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      cred.org_name.toLowerCase().includes(q) ||
      (cred.portal_username && cred.portal_username.toLowerCase().includes(q))
    );
  });

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white shadow-xs border-t-2 border-t-[#0052FF]">
      <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
        
        {/* Company Logo & Brand Identity */}
        <div className="flex items-center space-x-2.5 sm:space-x-4">
          <div className="relative flex items-center">
            <img
              src="/logo.png"
              alt="Xcelerate Media"
              className="h-8 sm:h-11 w-auto object-contain drop-shadow-xs"
            />
          </div>

          <div className="hidden sm:block border-l border-slate-200 pl-4">
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-slate-900 text-sm tracking-tight">
                PULSE
              </span>
              <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-md bg-blue-50 text-[#0052FF] border border-blue-200/80">
                CLIENT PORTAL
              </span>
            </div>
            <p className="text-[11px] text-slate-600 font-medium">Execution Tracker &amp; Multi-Day Analytics</p>
          </div>
        </div>

        {/* Center: Live Google Sheets Sync Status (Status Indicator Badge - Never Opens Popup) */}
        {isInternalAdmin ? (
          <div className="hidden md:flex items-center space-x-3">
            <div
              className="flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-blue-50/90 border border-blue-200 text-[#0052FF] text-xs font-bold shadow-2xs select-none"
              title="Google Sheets Live Sync Connected & Active"
            >
              <span className="live-indicator-dot"></span>
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Google Sheets Live Sync</span>
            </div>
          </div>
        ) : (
          <div className="hidden md:flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-slate-50 border border-slate-200/80 text-slate-700 text-xs font-semibold shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-slate-800 font-bold">Live Execution Feed</span>
            <span className="text-[10px] text-slate-400">•</span>
            <span className="text-[11px] text-slate-500 font-medium">Real-Time Sync</span>
          </div>
        )}

        {/* Right: Client / Admin Role Switcher & Landing Button */}
        <div className="flex items-center space-x-2 sm:space-x-2.5">
          {onExitToLanding && (
            <button
              onClick={onExitToLanding}
              className={`flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-2xs ${
                isInternalAdmin
                  ? "bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border border-slate-200"
                  : "bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 border border-red-200"
              }`}
              title={isInternalAdmin ? "Return to Public Landing Page" : "Sign Out of Brand Session"}
            >
              {isInternalAdmin ? (
                <>
                  <HomeIcon className="w-3.5 h-3.5 text-slate-500" />
                  <span className="hidden sm:inline">Landing Page</span>
                </>
              ) : (
                <>
                  <LogOut className="w-3.5 h-3.5 text-red-500" />
                  <span className="hidden sm:inline">Sign Out</span>
                </>
              )}
            </button>
          )}

          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center space-x-2 sm:space-x-3 px-2 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-sm font-medium text-slate-900 transition-all shadow-xs cursor-pointer"
            >
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#0052FF] to-[#00C2FF] flex items-center justify-center text-white font-bold text-xs shadow-xs shrink-0">
                {isInternalAdmin ? "XP" : isEmployeeRole ? selectedOrg.charAt(0) : isAnalystRole ? "PA" : selectedOrg.charAt(0)}
              </div>
              <div className="text-left hidden xs:block">
                <div className="text-xs font-bold leading-tight text-slate-900 truncate max-w-[100px] sm:max-w-none">
                  {isInternalAdmin ? "Admin Ops" : isEmployeeRole ? selectedOrg : isAnalystRole ? "Analyst" : selectedOrg}
                </div>
                <div className="text-[10px] text-slate-600 leading-tight mt-0.5 hidden sm:block">
                  {isInternalAdmin ? "Full Financials & Margin Access" : isEmployeeRole ? "Employee • My Campaigns Only" : isAnalystRole ? "Read-Only • Metrics Editor" : "Brand Client Session"}
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-600 ml-0.5 sm:ml-1 shrink-0" />
            </button>

            {dropdownOpen && (
              <>
                {/* Mobile backdrop to dismiss cleanly and prevent backdrop clicks */}
                <div 
                  className="fixed inset-0 z-40 bg-slate-950/20 backdrop-blur-2xs sm:hidden"
                  onClick={() => setDropdownOpen(false)}
                />
                <div className="fixed inset-x-3.5 top-18 sm:inset-x-auto sm:absolute sm:top-full sm:right-0 mt-1.5 w-auto sm:w-80 max-w-none sm:max-w-sm rounded-2xl bg-white border border-slate-200 shadow-2xl p-2.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150 max-h-[calc(100vh-5.5rem)] overflow-y-auto">
                  {isInternalAdmin ? (
                  <>
                    <div className="px-2 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center justify-between">
                      <span>Select Client Portal</span>
                      <span className="text-[10px] text-slate-400 font-semibold">{credentials.length} Portals</span>
                    </div>

                    {/* Portal Search Filter */}
                    <div className="relative mb-2 px-0.5">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search client portal..."
                        className="w-full pl-8 pr-7 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#0052FF] focus:bg-white transition-all"
                        autoFocus
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => setSearchQuery("")}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    
                    {/* Scrollable List of Client Portals */}
                    <div className="max-h-56 overflow-y-auto space-y-1 pr-0.5">
                      {filteredCredentials.length === 0 ? (
                        <div className="px-3.5 py-4 text-center space-y-1 bg-slate-50/60 rounded-xl m-1 border border-dashed border-slate-200">
                          <p className="text-xs font-semibold text-slate-600">
                            {searchQuery ? "No matching portals" : "No Client Portals"}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {searchQuery ? "Try a different search term" : "Provision credentials in Settings to enable client sessions."}
                          </p>
                        </div>
                      ) : (
                        filteredCredentials.map((cred) => {
                          const isSelected = !isInternalAdmin && selectedOrg.toLowerCase() === cred.org_name.toLowerCase();
                          const isAgency = cred.role === "AGENCY_CLIENT";
                          const roleLabel = isAgency ? "Agency Client" : "Brand Client";

                          return (
                            <button
                              key={cred.id}
                              disabled={!cred.is_active}
                              onClick={() => {
                                if (!cred.is_active) return;
                                onOrgChange(cred.org_name);
                                onRoleChange(cred.role);
                                onCredentialChange?.(cred);
                                setDropdownOpen(false);
                                setSearchQuery("");
                              }}
                              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs transition-all ${
                                !cred.is_active
                                  ? "opacity-50 cursor-not-allowed bg-slate-50/50 text-slate-400"
                                  : isSelected
                                  ? "bg-blue-50/90 text-[#0052FF] border border-blue-200 font-bold cursor-pointer"
                                  : "text-slate-700 hover:bg-slate-50 font-medium cursor-pointer"
                              }`}
                              title={!cred.is_active ? "This client credential is currently disabled" : undefined}
                            >
                              <div className="text-left min-w-0 pr-2">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-slate-900 font-bold truncate">{cred.org_name}</span>
                                  {!cred.is_active && (
                                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-700">
                                      Disabled
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-slate-500 truncate">
                                  {roleLabel} • {cred.campaign_access_mode === "SPECIFIC" ? `🔒 ${cred.assigned_campaign_ids?.length || 0} Campaign(s)` : "🌐 All Campaigns"}
                                </div>
                              </div>

                              {isSelected && (
                                <CheckCircle2 className="w-4 h-4 text-[#0052FF] shrink-0" />
                              )}
                            </button>
                          );
                        })
                      )}
                    </div>

                    <div className="border-t border-slate-100 my-1.5"></div>

                    <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center justify-between">
                      <span>Agency Internal Access</span>
                      <Lock className="w-3 h-3 text-[#0052FF]" />
                    </div>

                    <button
                      onClick={() => {
                        onRoleChange("SUPER_ADMIN");
                        onOrgChange("All Organizations");
                        onCredentialChange?.(null);
                        setDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs transition-all cursor-pointer ${
                        isInternalAdmin
                          ? "bg-blue-50 text-[#0052FF] border border-blue-200 font-bold"
                          : "text-slate-700 hover:bg-slate-50 font-medium"
                      }`}
                    >
                      <div className="text-left">
                        <div className="text-slate-900 font-bold flex items-center space-x-1.5">
                          <span>Xcelerate Pulse Team</span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-100 text-[#0052FF] font-bold">
                            ADMIN
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-600">Unmask Gross Margins, Creator Costs &amp; CRM</div>
                      </div>
                      {isInternalAdmin && (
                        <CheckCircle2 className="w-4 h-4 text-[#0052FF]" />
                      )}
                    </button>
                  </>
                ) : (isEmployeeRole || isAnalystRole) ? (
                  /* Employee / Performance Analyst Simplified Panel */
                  <div className="p-2 space-y-3">
                    <div className="flex items-center space-x-3 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-base shadow-xs shrink-0 ${
                        isEmployeeRole 
                          ? "bg-gradient-to-tr from-emerald-500 to-teal-500" 
                          : "bg-gradient-to-tr from-purple-500 to-indigo-500"
                      }`}>
                        {isEmployeeRole ? selectedOrg.charAt(0) : "PA"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-sm text-slate-900 truncate">
                          {isEmployeeRole ? selectedOrg : "Performance Analyst"}
                        </div>
                        <div className="text-[11px] font-semibold flex items-center gap-1.5 mt-0.5">
                          <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase ${
                            isEmployeeRole 
                              ? "bg-emerald-100 text-emerald-700" 
                              : "bg-purple-100 text-purple-700"
                          }`}>
                            {isEmployeeRole ? "Employee" : "Analyst"}
                          </span>
                          <span className="text-slate-500 truncate">
                            {isEmployeeRole ? "My Assigned Campaigns" : "All Campaigns • Metrics Editor"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-blue-50/70 border border-blue-100 text-[11px] text-slate-600 space-y-1">
                      <div className="flex items-center space-x-1.5 font-bold text-[#0052FF]">
                        <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                        <span>{isEmployeeRole ? "Employee Access" : "Analyst Access"}</span>
                      </div>
                      <p className="text-[11px] leading-relaxed text-slate-500">
                        {isEmployeeRole 
                          ? "You can view and fill performance metrics for your assigned campaigns. Settings and delete actions are restricted."
                          : "You can view all campaigns and edit performance metrics. Settings, delete, and financial data are restricted."
                        }
                      </p>
                    </div>

                    {onExitToLanding && (
                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          onExitToLanding();
                        }}
                        className="w-full py-2.5 px-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold border border-red-200 transition-all flex items-center justify-center space-x-2 cursor-pointer shadow-2xs"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sign Out</span>
                      </button>
                    )}
                  </div>
                ) : (
                  /* Strictly Isolated Client View: Competitor Brand Privacy Protected */
                  <div className="p-2 space-y-3">
                    <div className="flex items-center space-x-3 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#0052FF] to-[#00C2FF] flex items-center justify-center text-white font-bold text-base shadow-xs shrink-0">
                        {selectedOrg.charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-sm text-slate-900 truncate">
                          {selectedOrg}
                        </div>
                        <div className="text-[11px] text-[#0052FF] font-semibold flex items-center gap-1.5 mt-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
                          <span className="truncate">{currentRole === "AGENCY_CLIENT" ? "Agency Client Session" : "Brand Client Session"}</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-blue-50/70 border border-blue-100 text-[11px] text-slate-600 space-y-1">
                      <div className="flex items-center space-x-1.5 font-bold text-[#0052FF]">
                        <Lock className="w-3.5 h-3.5 shrink-0" />
                        <span>Confidential Enterprise Portal</span>
                      </div>
                      <p className="text-[11px] leading-relaxed text-slate-500">
                        You are viewing isolated campaign tracking and live creator deliverables provisioned strictly for {selectedOrg}.
                      </p>
                    </div>

                    {onExitToLanding && (
                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          onExitToLanding();
                        }}
                        className="w-full py-2.5 px-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold border border-red-200 transition-all flex items-center justify-center space-x-2 cursor-pointer shadow-2xs"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sign Out of Portal</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
          </div>

          {/* Quick Refresh Icon (Internal Ops Only) */}
          {isInternalAdmin && (
            <button
              onClick={() => onRefreshData?.()}
              className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 hover:text-[#0052FF] transition-all cursor-pointer shadow-xs"
              title="Refresh Live Campaign Data"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? "animate-spin text-[#0052FF]" : ""}`} />
            </button>
          )}

        </div>

      </div>
    </header>
  );
});
