import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { existsSync } from "fs";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const creatorId = (formData.get("creatorId") as string) || "creator";
    const milestone = (formData.get("milestone") as string) || "general";

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file was uploaded" },
        { status: 400 }
      );
    }

    // Validate mime type: Accept any valid image format (PNG, JPEG, JPG, WebP, AVIF, HEIC, GIF, BMP, etc.)
    const isImageMime = file.type && file.type.startsWith("image/");
    const isImageExt = Boolean(file.name && file.name.match(/\.(jpg|jpeg|png|webp|gif|avif|bmp|heic|heif|jfif|svg)$/i));

    if (!isImageMime && !isImageExt) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid file type. Please upload an image file (PNG, JPG, JPEG, WebP, AVIF, HEIC, etc.)",
        },
        { status: 400 }
      );
    }

    // Ensure uploads directory exists
    const uploadsDir = path.join(process.cwd(), "public", "uploads", "screenshots");
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // Determine extension
    let ext = "png";
    const nameParts = file.name.split(".");
    if (nameParts.length > 1) {
      ext = nameParts.pop()?.toLowerCase() || "png";
    } else if (file.type) {
      const sub = file.type.split("/")[1];
      if (sub && sub !== "octet-stream") ext = sub;
    }

    // Clean sanitize identifier
    const safeCreator = String(creatorId).replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 20);
    const safeMilestone = String(milestone).replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 10);
    const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const filename = `proof_${safeMilestone}_${safeCreator}_${uniqueSuffix}.${ext}`;
    const targetFilePath = path.join(uploadsDir, filename);

    // Read buffer and save to local public folder as instant local cache/backup
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(targetFilePath, buffer);

    const publicUrl = `/uploads/screenshots/${filename}`;

    // If Google Apps Script Web App URL is configured, push directly to Google Drive!
    const gasWebAppUrl = process.env.GOOGLE_APPS_SCRIPT_WEBAPP_URL;
    const gasFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

    if (gasWebAppUrl && gasWebAppUrl.trim().startsWith("http")) {
      try {
        const base64Data = buffer.toString("base64");
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const gasResponse = await fetch(gasWebAppUrl.trim(), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "upload_screenshot",
            folderId: gasFolderId || "",
            filename,
            mimeType: file.type || "image/png",
            base64Data,
            creatorId,
            milestone,
          }),
          redirect: "follow",
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (gasResponse.ok) {
          const gasData = await gasResponse.json();
          if (gasData.success && (gasData.thumbnailUrl || gasData.url)) {
            return NextResponse.json({
              success: true,
              url: gasData.thumbnailUrl || gasData.url,
              driveUrl: gasData.url,
              fileId: gasData.fileId,
              localUrl: publicUrl,
              filename,
              size: file.size,
              mimeType: file.type,
              isGoogleDrive: true,
              message: "Screenshot successfully uploaded directly to company Google Drive",
            });
          }
        }
      } catch (gasErr) {
        console.warn("Google Apps Script Drive upload failed, falling back to local storage:", gasErr);
      }
    }

    return NextResponse.json({
      success: true,
      url: publicUrl,
      filename,
      size: file.size,
      mimeType: file.type,
      message: "Screenshot successfully uploaded to website storage",
    });
  } catch (error: any) {
    console.error("Direct screenshot upload error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to process screenshot upload" },
      { status: 500 }
    );
  }
}
