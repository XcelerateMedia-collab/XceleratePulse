"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  UploadCloud,
  FileImage,
  CheckCircle2,
  X,
  ExternalLink,
  Eye,
  RefreshCw,
  Link as LinkIcon,
  Trash2,
  Sparkles,
  Plus,
  ChevronLeft,
  ChevronRight,
  Layers,
} from "lucide-react";

export interface ScreenshotUploaderProps {
  value: string; // JSON array string e.g. '["url1", "url2"]' or legacy single URL string
  onChange: (url: string) => void; // returns JSON array string
  creatorId: string;
  milestone: "7d" | "15d" | "30d" | "overall";
  label?: string;
  description?: string;
  isReadOnly?: boolean;
  maxFiles?: number; // default: 5
}

/**
 * High-performance image compressor using HTML5 Canvas & ObjectURL
 * - Handles PNG, JPG, JPEG, WebP, AVIF, HEIC/BMP
 * - Instant ObjectURL decoding (avoids slow FileReader string serialization)
 * - Constrains max dimension to 1600px (keeps text crystal clear, reduces byte size by ~85%)
 * - Compresses to lightweight JPEG in ~20-30ms
 */
export async function compressImageFile(file: File): Promise<{ compressed: File; ratioText?: string }> {
  if (!file.type.startsWith("image/") || file.type === "image/svg+xml" || file.type === "image/gif") {
    return { compressed: file };
  }

  // If already under 350KB, it's already fast and light
  if (file.size < 350 * 1024) {
    return { compressed: file };
  }

  return new Promise((resolve) => {
    let objectUrl = "";
    try {
      objectUrl = URL.createObjectURL(file);
    } catch {
      resolve({ compressed: file });
      return;
    }

    const img = new Image();
    img.src = objectUrl;
    img.onload = () => {
      try {
        URL.revokeObjectURL(objectUrl);
      } catch (_) {}

      const maxWidth = 1600;
      const maxHeight = 1600;
      let width = img.width;
      let height = img.height;

      if (width > maxWidth || height > maxHeight) {
        if (width > height) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve({ compressed: file });
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob || blob.size >= file.size) {
            resolve({ compressed: file });
          } else {
            const origMB = (file.size / (1024 * 1024)).toFixed(1);
            const compKB = Math.round(blob.size / 1024);
            const percent = Math.round((1 - blob.size / file.size) * 100);
            const ratioText = `Optimized: ${origMB}MB → ${compKB}KB (${percent}% faster)`;

            const newName = file.name.replace(/\.[^/.]+$/, "") + ".jpg";
            const compressedFile = new File([blob], newName, {
              type: "image/jpeg",
              lastModified: Date.now(),
            });
            resolve({ compressed: compressedFile, ratioText });
          }
        },
        "image/jpeg",
        0.80
      );
    };
    img.onerror = () => {
      try {
        URL.revokeObjectURL(objectUrl);
      } catch (_) {}
      resolve({ compressed: file });
    };
  });
}

interface PendingUpload {
  id: string;
  previewUrl: string;
  ratioText?: string;
}

export const ScreenshotUploader: React.FC<ScreenshotUploaderProps> = ({
  value,
  onChange,
  creatorId,
  milestone,
  label = "Screenshot Proofs",
  description = "Upload verified Instagram Insights screenshots (Up to 5). Auto-compressed & saved to Google Drive.",
  isReadOnly = false,
  maxFiles = 5,
}) => {
  const [pendingUploads, setPendingUploads] = useState<PendingUpload[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [manualUrl, setManualUrl] = useState("");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper to parse value into an array of URLs
  const parseUrls = (val: string): string[] => {
    if (!val || val === "[]") return [];
    const trimmed = val.trim();
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
  };

  const urls = parseUrls(value);
  const currentUrlsRef = useRef<string[]>(urls);
  React.useEffect(() => {
    currentUrlsRef.current = parseUrls(value);
  }, [value]);

  const totalCount = urls.length + pendingUploads.length;
  const canAddMore = !isReadOnly && totalCount < maxFiles;

  // Upload multiple files concurrently with optimistic previews
  const handleUploadFiles = async (files: FileList | File[]) => {
    if (isReadOnly) return;
    setUploadError(null);

    const fileList = Array.from(files);
    const availableSlots = maxFiles - currentUrlsRef.current.length - pendingUploads.length;

    if (availableSlots <= 0) {
      setUploadError(`Maximum of ${maxFiles} screenshots allowed.`);
      return;
    }

    const toProcess = fileList.slice(0, availableSlots);
    if (fileList.length > availableSlots) {
      setUploadError(`Selected ${fileList.length} files, but only ${availableSlots} more screenshot slot(s) available.`);
    }

    // Process each file with instant optimistic local preview
    for (const file of toProcess) {
      const uploadId = Math.random().toString(36).slice(2, 9);
      let localPreview = "";
      try {
        localPreview = URL.createObjectURL(file);
      } catch (_) {}

      // Add to pending state immediately (instant rendering)
      setPendingUploads((prev) => [...prev, { id: uploadId, previewUrl: localPreview }]);

      // Async compress & upload in background
      (async () => {
        try {
          const { compressed, ratioText } = await compressImageFile(file);
          if (ratioText) {
            setPendingUploads((prev) =>
              prev.map((p) => (p.id === uploadId ? { ...p, ratioText } : p))
            );
          }

          const formData = new FormData();
          formData.append("file", compressed);
          formData.append("creatorId", creatorId);
          formData.append("milestone", milestone);

          const res = await fetch("/api/upload", {
            method: "POST",
            body: formData,
          });

          const data = await res.json();
          if (!res.ok || !data.success) {
            throw new Error(data.error || "Failed to upload screenshot");
          }

          // Append newly uploaded permanent URL safely avoiding race condition
          currentUrlsRef.current = [...currentUrlsRef.current, data.url].slice(0, maxFiles);
          onChange(JSON.stringify(currentUrlsRef.current));
        } catch (err: any) {
          console.error("Screenshot upload failed:", err);
          setUploadError(err.message || "Failed to upload screenshot. Please try again.");
        } finally {
          // Remove from pending
          setPendingUploads((prev) => prev.filter((p) => p.id !== uploadId));
          if (localPreview) {
            try {
              URL.revokeObjectURL(localPreview);
            } catch (_) {}
          }
        }
      })();
    }
  };

  const handleRemoveUrl = (indexToRemove: number) => {
    if (isReadOnly) return;
    const nextUrls = urls.filter((_, idx) => idx !== indexToRemove);
    onChange(nextUrls.length > 0 ? JSON.stringify(nextUrls) : "[]");
    if (lightboxIndex !== null && lightboxIndex >= nextUrls.length) {
      setLightboxIndex(nextUrls.length > 0 ? nextUrls.length - 1 : null);
    }
  };

  const handleAddManualLink = () => {
    if (!manualUrl.trim()) return;
    if (urls.length >= maxFiles) {
      setUploadError(`Maximum of ${maxFiles} screenshots allowed.`);
      return;
    }
    const nextUrls = [...urls, manualUrl.trim()].slice(0, maxFiles);
    onChange(JSON.stringify(nextUrls));
    setManualUrl("");
    setShowUrlInput(false);
  };

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleUploadFiles(e.target.files);
      e.target.value = ""; // reset so same files can be re-selected if needed
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (canAddMore) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (!canAddMore) return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleUploadFiles(files);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    if (!canAddMore) return;
    const items = e.clipboardData?.items;
    if (!items) return;

    const files: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const file = items[i].getAsFile();
        if (file) files.push(file);
      }
    }

    if (files.length > 0) {
      e.preventDefault();
      handleUploadFiles(files);
    }
  };

  const allDisplayItems = [
    ...urls.map((u, i) => ({ id: `url_${i}`, url: u, isPending: false, ratioText: undefined })),
    ...pendingUploads.map((p) => ({ id: p.id, url: p.previewUrl, isPending: true, ratioText: p.ratioText })),
  ];

  return (
    <div className="space-y-2.5" onPaste={handlePaste} tabIndex={0}>
      {/* Top Header / Counter Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
            <FileImage className="w-3.5 h-3.5 text-[#0052FF]" />
            <span>{label}</span>
          </label>
          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-black border border-slate-200">
            {totalCount}/{maxFiles}
          </span>
        </div>

        {!isReadOnly && (
          <button
            type="button"
            onClick={() => setShowUrlInput(!showUrlInput)}
            className="text-[10px] font-semibold text-[#0052FF] hover:underline flex items-center space-x-1 cursor-pointer"
          >
            <LinkIcon className="w-3 h-3" />
            <span>{showUrlInput ? "Hide Link Box" : "+ Paste Drive URL"}</span>
          </button>
        )}
      </div>

      {description && (
        <p className="text-[10px] text-slate-500 font-medium">
          {description}
        </p>
      )}

      {/* Manual URL Input Dropdown */}
      {showUrlInput && !isReadOnly && (
        <div className="flex items-center space-x-2 p-2 rounded-xl bg-blue-50/60 border border-blue-200">
          <input
            type="text"
            value={manualUrl}
            onChange={(e) => setManualUrl(e.target.value)}
            placeholder="Paste Google Drive file link or image URL..."
            className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0052FF]"
          />
          <button
            type="button"
            onClick={handleAddManualLink}
            disabled={!manualUrl.trim() || urls.length >= maxFiles}
            className="px-3 py-1.5 rounded-lg bg-[#0052FF] hover:bg-blue-700 text-white text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shrink-0"
          >
            Add Link
          </button>
        </div>
      )}

      {/* Error Message */}
      {uploadError && (
        <div className="p-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center justify-between animate-in fade-in">
          <span>{uploadError}</span>
          <button
            type="button"
            onClick={() => setUploadError(null)}
            className="text-rose-500 hover:text-rose-800 cursor-pointer p-0.5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Hidden File Input for Browsing */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/png,image/jpeg,image/jpg,image/webp,image/gif,image/avif,image/heic,image/heif,image/*,.png,.jpg,.jpeg,.webp,.gif,.avif,.heic,.heif,.jfif"
        onChange={onFileInputChange}
        className="hidden"
      />

      {/* ────────────────── Gallery View (When 1 or more items exist) ────────────────── */}
      {allDisplayItems.length > 0 ? (
        <div className="space-y-2">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
            {allDisplayItems.map((item, idx) => {
              const isDirectImg =
                item.url.startsWith("/uploads/") ||
                item.url.startsWith("blob:") ||
                item.url.startsWith("data:") ||
                item.url.includes("thumbnail?id=") ||
                Boolean(item.url.match(/\.(jpeg|jpg|gif|png|webp|avif)($|\?)/i));

              return (
                <div
                  key={item.id}
                  className="relative aspect-[4/5] rounded-xl overflow-hidden border border-slate-200 bg-slate-100 group shadow-2xs transition-all hover:border-[#0052FF]/50"
                >
                  {/* Thumbnail Image */}
                  {isDirectImg ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.url}
                      alt={`Screenshot Proof ${idx + 1}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform cursor-pointer"
                      onClick={() => setLightboxIndex(idx)}
                    />
                  ) : (
                    <div
                      onClick={() => setLightboxIndex(idx)}
                      className="w-full h-full flex flex-col items-center justify-center p-2 bg-blue-50 text-[#0052FF] cursor-pointer"
                    >
                      <FileImage className="w-8 h-8 text-[#0052FF]" />
                      <span className="text-[9px] font-bold mt-1 text-center line-clamp-2">
                        Proof #{idx + 1}
                      </span>
                    </div>
                  )}

                  {/* Top Badges */}
                  <div className="absolute top-1.5 left-1.5 right-1.5 flex items-center justify-between pointer-events-none">
                    <span className="px-1.5 py-0.5 rounded-md bg-black/80 text-white text-[9px] font-black">
                      #{idx + 1}
                    </span>

                    {item.isPending ? (
                      <span className="px-1.5 py-0.5 rounded-md bg-blue-600 text-white text-[9px] font-bold flex items-center space-x-1 animate-pulse shadow-xs">
                        <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                        <span>Syncing</span>
                      </span>
                    ) : item.url.includes("drive.google.com") ? (
                      <span className="px-1.5 py-0.5 rounded-md bg-emerald-600/90 text-white text-[8px] font-bold flex items-center space-x-0.5 shadow-xs">
                        <CheckCircle2 className="w-2 h-2" />
                        <span>Drive</span>
                      </span>
                    ) : null}
                  </div>

                  {/* Hover Overlay Controls */}
                  <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2 p-1">
                    <button
                      type="button"
                      onClick={() => setLightboxIndex(idx)}
                      className="p-1.5 rounded-lg bg-white/90 hover:bg-white text-slate-800 transition-colors shadow-xs cursor-pointer"
                      title="Inspect Screenshot"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>

                    {!isReadOnly && !item.isPending && (
                      <button
                        type="button"
                        onClick={() => handleRemoveUrl(idx)}
                        className="p-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white transition-colors shadow-xs cursor-pointer"
                        title="Delete Screenshot"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {/* "+ Add Screenshot" Card in Grid if under max limit */}
            {canAddMore && (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative aspect-[4/5] rounded-xl border-2 border-dashed flex flex-col items-center justify-center text-center p-2 transition-all cursor-pointer ${
                  isDragging
                    ? "border-[#0052FF] bg-blue-50/70 scale-[1.02]"
                    : "border-slate-300 hover:border-[#0052FF] hover:bg-blue-50/30 bg-slate-50/50"
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-blue-100/80 text-[#0052FF] flex items-center justify-center mb-1 shadow-2xs">
                  <Plus className="w-4 h-4" />
                </div>
                <span className="text-[11px] font-bold text-slate-700">Add #{totalCount + 1}</span>
                <span className="text-[9px] text-slate-400 mt-0.5">Drag, browse, or Ctrl+V</span>
              </div>
            )}
          </div>

          {/* Quick Footer Status */}
          <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium px-1">
            <span>
              {totalCount === 1
                ? "1 screenshot attached"
                : `${totalCount} screenshots attached (Max ${maxFiles})`}
            </span>
            <span>Click any screenshot to zoom &amp; inspect</span>
          </div>
        </div>
      ) : (
        /* ────────────────── Empty State: Large Dropzone ────────────────── */
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !isReadOnly && fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-2xl p-5 text-center transition-all cursor-pointer ${
            isDragging
              ? "border-[#0052FF] bg-blue-50/60 scale-[1.01]"
              : "border-slate-200 hover:border-[#0052FF]/60 hover:bg-blue-50/20 bg-slate-50/50"
          } ${isReadOnly ? "opacity-60 pointer-events-none" : ""}`}
        >
          <div className="flex flex-col items-center justify-center space-y-1.5 py-2">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#0052FF] flex items-center justify-center">
              <UploadCloud className="w-4 h-4" />
            </div>

            <div>
              <p className="text-xs font-bold text-slate-800">
                Upload or drag screenshots (Max {maxFiles})
              </p>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                Auto-compressed • Or press <kbd className="px-1.5 py-0.5 text-[9px] bg-slate-200 rounded font-mono font-bold">Ctrl+V</kbd> to paste
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────── Lightbox Carousel Modal ────────────────── */}
      {lightboxIndex !== null && allDisplayItems[lightboxIndex] && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxIndex(null)}
        >
          <div
            className="relative max-w-4xl max-h-[92vh] bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col w-full"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Lightbox Header */}
            <div className="flex items-center justify-between p-3.5 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center space-x-2">
                <FileImage className="w-4 h-4 text-[#0052FF]" />
                <span className="text-xs font-black text-slate-900">
                  {label} — Proof #{lightboxIndex + 1} of {allDisplayItems.length}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-blue-100 text-[#0052FF] text-[10px] font-bold">
                  {milestone.toUpperCase()} Snapshot
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <a
                  href={allDisplayItems[lightboxIndex].url}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 flex items-center space-x-1"
                >
                  <span>Open Full Link</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
                <button
                  type="button"
                  onClick={() => setLightboxIndex(null)}
                  className="p-1 rounded-lg hover:bg-slate-200 text-slate-600 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Lightbox Body with Prev/Next Navigation */}
            <div className="relative p-2 overflow-auto flex items-center justify-center bg-slate-950/90 max-h-[calc(90vh-120px)] min-h-[300px]">
              {allDisplayItems.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setLightboxIndex((prev) => (prev! > 0 ? prev! - 1 : allDisplayItems.length - 1));
                    }}
                    className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white/80 hover:bg-white text-slate-900 flex items-center justify-center shadow-lg transition-transform hover:scale-105 cursor-pointer"
                    title="Previous Screenshot"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setLightboxIndex((prev) => (prev! < allDisplayItems.length - 1 ? prev! + 1 : 0));
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white/80 hover:bg-white text-slate-900 flex items-center justify-center shadow-lg transition-transform hover:scale-105 cursor-pointer"
                    title="Next Screenshot"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}

              {/* Main Image */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={allDisplayItems[lightboxIndex].url}
                alt={`Proof ${lightboxIndex + 1}`}
                className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-2xl"
              />
            </div>

            {/* Bottom Thumbnail Strip */}
            {allDisplayItems.length > 1 && (
              <div className="p-2.5 bg-slate-900 border-t border-slate-800 flex items-center justify-center space-x-2 overflow-x-auto">
                {allDisplayItems.map((item, idx) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setLightboxIndex(idx)}
                    className={`relative w-12 h-12 rounded-lg overflow-hidden border-2 transition-all cursor-pointer shrink-0 ${
                      lightboxIndex === idx ? "border-[#0052FF] scale-105 shadow-md" : "border-slate-700 opacity-60 hover:opacity-100"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.url} alt={`Thumb ${idx + 1}`} className="w-full h-full object-cover" />
                    <span className="absolute bottom-0 right-0 bg-black/80 text-[8px] text-white px-1 font-bold">
                      #{idx + 1}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
