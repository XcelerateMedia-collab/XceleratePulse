"use client";

import React from "react";
import { FileSpreadsheet, X } from "lucide-react";
import { CampaignSummary, CreatorDeliverableBrandView, CreatorDeliverableInternal } from "@/lib/types";
import { SyncControlPanel } from "./SyncControlPanel";

interface SyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSyncTriggered: () => void;
  campaigns?: CampaignSummary[];
  deliverables?: (CreatorDeliverableBrandView | CreatorDeliverableInternal)[];
}

export const SyncModal: React.FC<SyncModalProps> = ({
  isOpen,
  onClose,
  onSyncTriggered,
  campaigns = [],
  deliverables = [],
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-950/80"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl sm:rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0 pr-2">
            <div className="p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-blue-50 text-[#0052FF] border border-blue-200/80 shrink-0">
              <FileSpreadsheet className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-black text-slate-900 truncate">
                Google Sheets Sync &amp; Automation
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500 font-medium truncate">
                Control all 10 sync actions directly from your admin panel
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 font-bold transition-all flex items-center justify-center cursor-pointer shrink-0"
            title="Close Modal"
            aria-label="Close Modal"
          >
            <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-3.5 sm:p-6 overflow-y-auto flex-1 custom-modal-scroll">
          <SyncControlPanel
            campaigns={campaigns}
            deliverables={deliverables}
            onSyncTriggered={onSyncTriggered}
          />
        </div>
      </div>
    </div>
  );
};
