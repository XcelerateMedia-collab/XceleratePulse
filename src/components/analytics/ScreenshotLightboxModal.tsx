"use client";

import React, { useEffect, useState } from "react";
import { ExternalLink, ChevronLeft, ChevronRight, X } from "lucide-react";

export interface ScreenshotLightboxState {
  urls: string[];
  currentIndex: number;
  title: string;
  tag: string;
}

export interface ScreenshotLightboxModalProps {
  state: ScreenshotLightboxState | null;
  onClose: () => void;
  onNavigate?: (newIndex: number) => void;
}

export const ScreenshotLightboxModal: React.FC<ScreenshotLightboxModalProps> = ({
  state,
  onClose,
  onNavigate,
}) => {
  const [internalIndex, setInternalIndex] = useState(0);

  useEffect(() => {
    if (state) {
      setInternalIndex(state.currentIndex || 0);
    }
  }, [state]);

  // Keyboard navigation: Escape to close, Left/Right arrows to flip
  useEffect(() => {
    if (!state) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowLeft") {
        setInternalIndex((prev) => {
          const next = Math.max(0, prev - 1);
          if (onNavigate) onNavigate(next);
          return next;
        });
      } else if (e.key === "ArrowRight") {
        setInternalIndex((prev) => {
          const next = Math.min(state.urls.length - 1, prev + 1);
          if (onNavigate) onNavigate(next);
          return next;
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [state, onClose, onNavigate]);

  if (!state || !state.urls || state.urls.length === 0) return null;

  const currentUrl = state.urls[internalIndex] || state.urls[0];
  const hasMultiple = state.urls.length > 1;

  const handlePrev = () => {
    setInternalIndex((prev) => {
      const next = Math.max(0, prev - 1);
      if (onNavigate) onNavigate(next);
      return next;
    });
  };

  const handleNext = () => {
    setInternalIndex((prev) => {
      const next = Math.min(state.urls.length - 1, prev + 1);
      if (onNavigate) onNavigate(next);
      return next;
    });
  };

  const handleSelectIndex = (idx: number) => {
    setInternalIndex(idx);
    if (onNavigate) onNavigate(idx);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80"
      onClick={onClose}
    >
      <div
        className="relative max-w-4xl w-full max-h-[92vh] rounded-3xl overflow-hidden border border-white/20 shadow-2xl bg-white p-3.5 space-y-3 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-2 pt-1 border-b border-slate-100 pb-2">
          <div className="flex items-center space-x-2 min-w-0">
            <span className="text-xs sm:text-sm font-black text-slate-900 truncate">
              {state.title}
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-[#0052FF] border border-blue-200 shrink-0">
              {state.tag}
            </span>
            {hasMultiple && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
                {internalIndex + 1} of {state.urls.length}
              </span>
            )}
          </div>
          <div className="flex items-center space-x-1.5 shrink-0">
            <a
              href={currentUrl}
              target="_blank"
              rel="noreferrer"
              className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors"
              title="Open full resolution in new tab"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-900 font-bold transition-colors cursor-pointer"
              title="Close (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Main Image Stage */}
        <div className="relative flex-1 flex items-center justify-center min-h-[320px] max-h-[70vh] overflow-hidden bg-slate-950/5 rounded-2xl">
          <img
            src={currentUrl}
            alt={`${state.title} #${internalIndex + 1}`}
            className="max-w-full max-h-[70vh] w-auto h-auto object-contain rounded-xl shadow-xs"
          />

          {/* Prev Button */}
          {hasMultiple && internalIndex > 0 && (
            <button
              type="button"
              onClick={handlePrev}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/95 hover:bg-white text-slate-800 shadow-lg flex items-center justify-center cursor-pointer transition-transform hover:scale-110 border border-slate-200"
              title="Previous screenshot (← Arrow)"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}

          {/* Next Button */}
          {hasMultiple && internalIndex < state.urls.length - 1 && (
            <button
              type="button"
              onClick={handleNext}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/95 hover:bg-white text-slate-800 shadow-lg flex items-center justify-center cursor-pointer transition-transform hover:scale-110 border border-slate-200"
              title="Next screenshot (→ Arrow)"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Bottom thumbnail strip if multiple screenshots */}
        {hasMultiple && (
          <div className="flex items-center justify-center gap-2 pt-1 pb-0.5 overflow-x-auto">
            {state.urls.map((u, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSelectIndex(i)}
                className={`relative w-12 h-12 rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                  i === internalIndex
                    ? "border-[#0052FF] scale-105 shadow-md ring-2 ring-[#0052FF]/20"
                    : "border-slate-200 opacity-60 hover:opacity-100"
                }`}
              >
                <img src={u} alt="" className="w-full h-full object-cover" />
                <span className="absolute bottom-0 right-0 bg-slate-900/80 text-white text-[8px] font-bold px-1 rounded-tl">
                  #{i + 1}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
