"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { Upload, ImageIcon, Lock, LockOpen } from "lucide-react";
import { ImageWithFallback } from "./ImageWithFallback";

const ADMIN_KEY_STORAGE = "photos-admin-key";
const ADMIN_KEY_HEADER = "x-admin-key";

function getStoredAdminKey(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ADMIN_KEY_STORAGE);
}

function getAdminHeaders(): Record<string, string> {
  const key = getStoredAdminKey();
  if (!key) return {};
  return { [ADMIN_KEY_HEADER]: key };
}

const DEFAULT_PHOTO_SIZE = 140;
const MIN_PHOTO_SIZE = 60;
const PHOTO_PADDING = 6;
const REFERENCE_MIN_WIDTH = 1200;
const REFERENCE_MIN_HEIGHT = 800;

/** Given max dimension and aspect ratio (width/height), return display width and height in px */
function sizeToDimensions(
  maxSize: number,
  aspectRatio: number,
): { width: number; height: number } {
  if (aspectRatio >= 1)
    return { width: maxSize, height: maxSize / aspectRatio };
  return { width: maxSize * aspectRatio, height: maxSize };
}

function getPhotoAspectRatio(photo: Photo): number {
  if (typeof photo.aspectRatio === "number") return photo.aspectRatio;
  if (
    typeof photo.width === "number" &&
    typeof photo.height === "number" &&
    photo.height > 0
  )
    return photo.width / photo.height;
  return 1;
}

/** Get the four corners of a photo's box in design space after rotation (around its center) */
function getRotatedCorners(photo: Photo): { x: number; y: number }[] {
  const size = typeof photo.size === "number" ? photo.size : DEFAULT_PHOTO_SIZE;
  const ar = getPhotoAspectRatio(photo);
  const { width: w, height: h } = sizeToDimensions(size, ar);
  const boxW = w + PHOTO_PADDING * 2;
  const boxH = h + PHOTO_PADDING * 2;
  const cx = photo.x + boxW / 2;
  const cy = photo.y + boxH / 2;
  const rad = (photo.rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const halfW = boxW / 2;
  const halfH = boxH / 2;
  const localCorners: [number, number][] = [
    [-halfW, -halfH],
    [halfW, -halfH],
    [halfW, halfH],
    [-halfW, halfH],
  ];
  return localCorners.map(([lx, ly]) => ({
    x: cx + lx * cos - ly * sin,
    y: cy + lx * sin + ly * cos,
  }));
}

function rotatedPhotoFitsInBounds(
  photo: Photo,
  bounds: {
    contentMinX: number;
    contentMinY: number;
    contentWidth: number;
    contentHeight: number;
  },
): boolean {
  const corners = getRotatedCorners(photo);
  const maxX = bounds.contentMinX + bounds.contentWidth;
  const maxY = bounds.contentMinY + bounds.contentHeight;
  return corners.every(
    (c) =>
      c.x >= bounds.contentMinX &&
      c.x <= maxX &&
      c.y >= bounds.contentMinY &&
      c.y <= maxY,
  );
}

/** If the rotated photo exceeds content bounds, shrink it (and adjust x,y to keep center) so it fits. */
function fitRotatedPhotoInBounds(
  photo: Photo,
  bounds: {
    contentMinX: number;
    contentMinY: number;
    contentWidth: number;
    contentHeight: number;
  },
): { x: number; y: number; size: number } {
  const currentSize =
    typeof photo.size === "number" ? photo.size : DEFAULT_PHOTO_SIZE;
  const ar = getPhotoAspectRatio(photo);
  const { width: w, height: h } = sizeToDimensions(currentSize, ar);
  const boxW = w + PHOTO_PADDING * 2;
  const boxH = h + PHOTO_PADDING * 2;
  const centerX = photo.x + boxW / 2;
  const centerY = photo.y + boxH / 2;

  if (rotatedPhotoFitsInBounds(photo, bounds)) {
    return { x: photo.x, y: photo.y, size: currentSize };
  }

  const minScale = Math.max(0.01, MIN_PHOTO_SIZE / currentSize);
  let lo = minScale;
  let hi = 1;
  for (let i = 0; i < 40; i++) {
    const s = (lo + hi) / 2;
    const newSize = currentSize * s;
    const { width: nw, height: nh } = sizeToDimensions(newSize, ar);
    const newBoxW = nw + PHOTO_PADDING * 2;
    const newBoxH = nh + PHOTO_PADDING * 2;
    const newX = centerX - newBoxW / 2;
    const newY = centerY - newBoxH / 2;
    const testPhoto: Photo = {
      ...photo,
      x: newX,
      y: newY,
      size: newSize,
    };
    if (rotatedPhotoFitsInBounds(testPhoto, bounds)) {
      lo = s;
    } else {
      hi = s;
    }
  }
  const finalS = lo;
  const newSize = Math.max(MIN_PHOTO_SIZE, currentSize * finalS);
  const { width: fw, height: fh } = sizeToDimensions(newSize, ar);
  const finalBoxW = fw + PHOTO_PADDING * 2;
  const finalBoxH = fh + PHOTO_PADDING * 2;
  return {
    x: centerX - finalBoxW / 2,
    y: centerY - finalBoxH / 2,
    size: newSize,
  };
}

/** Content bounds in design space; optionally clamped to minimum reference size */
function computeContentBounds(photoList: Photo[]): {
  contentMinX: number;
  contentMinY: number;
  contentWidth: number;
  contentHeight: number;
} {
  if (photoList.length === 0) {
    return {
      contentMinX: 0,
      contentMinY: 0,
      contentWidth: REFERENCE_MIN_WIDTH,
      contentHeight: REFERENCE_MIN_HEIGHT,
    };
  }
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const p of photoList) {
    const size = typeof p.size === "number" ? p.size : DEFAULT_PHOTO_SIZE;
    const ar = getPhotoAspectRatio(p);
    const { width: w, height: h } = sizeToDimensions(size, ar);
    const boxW = w + PHOTO_PADDING * 2;
    const boxH = h + PHOTO_PADDING * 2;
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x + boxW);
    maxY = Math.max(maxY, p.y + boxH);
  }
  const rawW = maxX - minX;
  const rawH = maxY - minY;
  return {
    contentMinX: minX,
    contentMinY: minY,
    contentWidth: Math.max(rawW, REFERENCE_MIN_WIDTH),
    contentHeight: Math.max(rawH, REFERENCE_MIN_HEIGHT),
  };
}

interface Photo {
  id: string;
  src: string;
  x: number;
  y: number;
  rotation: number;
  filename?: string;
  uploadedAt?: string;
  size?: number;
  aspectRatio?: number;
  scale?: number;
  width?: number;
  height?: number;
}

export function PhotoCanvas() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [draggedPhoto, setDraggedPhoto] = useState<string | null>(null);
  const [resizingPhoto, setResizingPhoto] = useState<{
    photoId: string;
    previewSize: number;
  } | null>(null);
  const [rotatingPhoto, setRotatingPhoto] = useState<string | null>(null);
  const [hoverRotateCorner, setHoverRotateCorner] = useState<string | null>(
    null,
  );
  const [hoverResizeCorner, setHoverResizeCorner] = useState<string | null>(
    null,
  );
  const [hoverTopRight, setHoverTopRight] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    photoId: string;
    x: number;
    y: number;
  } | null>(null);
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [backgroundImage, setBackgroundImage] = useState<string>(
    "/api/photo/background.jpg",
  );
  const photosRef = useRef<Photo[]>([]);
  const dragStartRef = useRef<{
    startX: number;
    startY: number;
    startPhotoX: number;
    startPhotoY: number;
  } | null>(null);
  const resizeStartRef = useRef<{ startX: number; startSize: number } | null>(
    null,
  );
  const resizePreviewSizeRef = useRef<number>(DEFAULT_PHOTO_SIZE);
  const desktopContainerRef = useRef<HTMLDivElement>(null);
  const canvasWrapperRef = useRef<HTMLDivElement>(null);
  const scaleRef = useRef<number>(1);
  const frozenLayoutBoundsRef = useRef(computeContentBounds([]));

  // Keep the ref in sync with the state
  photosRef.current = photos;

  // Content bounds in design space (from current photo positions)
  const contentBounds = useMemo(() => computeContentBounds(photos), [photos]);

  // While dragging, freeze layout/scale so viewport doesn't resize; only update after mouse release
  const layoutBounds = draggedPhoto
    ? frozenLayoutBoundsRef.current
    : contentBounds;
  if (!draggedPhoto) {
    frozenLayoutBoundsRef.current = contentBounds;
  }

  // Scale so the full content fits in the viewport (uses frozen bounds when dragging)
  const scale = useMemo(() => {
    const { contentWidth, contentHeight } = layoutBounds;
    const { width: vw, height: vh } = viewportSize;
    if (vw <= 0 || vh <= 0 || contentWidth <= 0 || contentHeight <= 0) return 1;
    return Math.min(vw / contentWidth, vh / contentHeight);
  }, [layoutBounds, viewportSize]);

  scaleRef.current = scale;

  // Measure viewport (desktop canvas container) for scale
  useEffect(() => {
    const el = desktopContainerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        const { width, height } = entry.contentRect;
        setViewportSize({ width, height });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [isMobileViewport]);

  // Detect mobile viewport so we constrain height and avoid double scroll
  useEffect(() => {
    const mql = window.matchMedia("(max-width: 767px)");
    const handler = () => setIsMobileViewport(mql.matches);
    handler();
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  // Cursor grabbing while dragging or rotating (cursor stays correct when pointer leaves photo)
  useEffect(() => {
    if (!draggedPhoto) return;
    const prev = document.body.style.cursor;
    document.body.style.cursor = "grabbing";
    return () => {
      document.body.style.cursor = prev;
    };
  }, [draggedPhoto]);

  // Validate stored admin key on mount
  useEffect(() => {
    const key = getStoredAdminKey();
    if (!key) {
      setAuthChecked(true);
      return;
    }
    fetch("/api/auth/check", {
      method: "POST",
      headers: { [ADMIN_KEY_HEADER]: key },
    })
      .then((r) => r.ok && r.json().then((d) => d.admin === true))
      .then((valid) => {
        setIsAdmin(!!valid);
        if (!valid) localStorage.removeItem(ADMIN_KEY_STORAGE);
      })
      .catch(() => setIsAdmin(false))
      .finally(() => setAuthChecked(true));
  }, []);

  // Load photos on mount (background served via /api/photo/background.jpg)
  useEffect(() => {
    const loadData = async () => {
      try {
        const photosResponse = await fetch("/api/photos");
        if (photosResponse.ok) {
          const photosData = await photosResponse.json();
          if (photosData.photos && photosData.photos.length > 0) {
            setPhotos(photosData.photos);
          }
        }
      } catch (error) {
        console.error("Failed to load data:", error);
      }
    };

    loadData();
  }, []);

  // Upload file to server
  const uploadFileToServer = async (
    file: File,
    dropX: number,
    dropY: number,
  ) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        headers: getAdminHeaders(),
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const result = await response.json();

      // Use the photoData from server response, but update position to drop location
      const newPhoto: Photo = {
        ...result.photoData,
        x: dropX - 40, // Center the photo on the drop position
        y: dropY - 40,
      };

      setPhotos((prev) => [...prev, newPhoto]);
    } catch (error) {
      console.error("Upload failed:", error);
      // Fallback to local file reading if server upload fails
      const reader = new FileReader();
      reader.onload = (event) => {
        const newPhoto: Photo = {
          id: Date.now().toString(),
          src: event.target?.result as string,
          x: dropX - 40,
          y: dropY - 40,
          rotation: Math.random() * 20 - 10,
        };
        setPhotos((prev) => [...prev, newPhoto]);
      };
      reader.readAsDataURL(file);
    } finally {
      setIsUploading(false);
    }
  };

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, photoId: string) => {
      if (!isAdmin) return;
      if (e.button !== 0) return; // only left-click starts drag; right-click is for context menu
      e.preventDefault();
      setDraggedPhoto(photoId);

      const startX = e.clientX;
      const startY = e.clientY;

      // Find the current photo position from ref
      const photo = photosRef.current.find((p) => p.id === photoId);
      if (!photo) return;

      // Store the initial positions in ref
      dragStartRef.current = {
        startX,
        startY,
        startPhotoX: photo.x,
        startPhotoY: photo.y,
      };

      const handleMouseMove = (e: MouseEvent) => {
        const dragStart = dragStartRef.current;
        if (!dragStart) return;
        const scale = scaleRef.current;

        const deltaX = (e.clientX - dragStart.startX) / scale;
        const deltaY = (e.clientY - dragStart.startY) / scale;

        setPhotos((currentPhotos) =>
          currentPhotos.map((p) =>
            p.id === photoId
              ? {
                  ...p,
                  x: dragStart.startPhotoX + deltaX,
                  y: dragStart.startPhotoY + deltaY,
                }
              : p,
          ),
        );
      };

      const handleMouseUp = async () => {
        setDraggedPhoto(null);
        dragStartRef.current = null;
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);

        // Save the final position to server
        const finalPhoto = photosRef.current.find((p) => p.id === photoId);
        if (finalPhoto) {
          try {
            await fetch("/api/photos", {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
                ...getAdminHeaders(),
              },
              body: JSON.stringify({
                photoId: finalPhoto.id,
                x: finalPhoto.x,
                y: finalPhoto.y,
                rotation: finalPhoto.rotation,
                ...(typeof finalPhoto.size === "number" && {
                  size: finalPhoto.size,
                }),
              }),
            });
          } catch (error) {
            console.error("Failed to save photo position:", error);
          }
        }
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [isAdmin],
  );

  const handleResizeMouseDown = useCallback(
    (e: React.MouseEvent, photoId: string) => {
      if (!isAdmin) return;
      e.preventDefault();
      e.stopPropagation();
      const photo = photosRef.current.find((p) => p.id === photoId);
      if (!photo) return;
      const startSize =
        typeof photo.size === "number" ? photo.size : DEFAULT_PHOTO_SIZE;
      resizePreviewSizeRef.current = startSize;
      setResizingPhoto({ photoId, previewSize: startSize });
      resizeStartRef.current = { startX: e.clientX, startSize };

      const handleMouseMove = (e: MouseEvent) => {
        const start = resizeStartRef.current;
        if (!start) return;
        const scale = scaleRef.current;
        const deltaX = (e.clientX - start.startX) / scale;
        const newSize = Math.max(MIN_PHOTO_SIZE, start.startSize + deltaX);
        resizePreviewSizeRef.current = newSize;
        const ar = getPhotoAspectRatio(photo);
        const { width: w, height: h } = sizeToDimensions(newSize, ar);
        console.log("[resize] preview dimensions:", {
          width: w,
          height: h,
          maxSize: newSize,
        });
        setResizingPhoto((prev) =>
          prev ? { ...prev, previewSize: newSize } : null,
        );
      };

      const handleMouseUp = async () => {
        const finalSize = resizePreviewSizeRef.current;
        setResizingPhoto(null);
        resizeStartRef.current = null;
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);

        setPhotos((prev) =>
          prev.map((p) => (p.id === photoId ? { ...p, size: finalSize } : p)),
        );
        try {
          const current = photosRef.current.find((p) => p.id === photoId);
          if (current) {
            await fetch("/api/photos", {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
                ...getAdminHeaders(),
              },
              body: JSON.stringify({
                photoId: current.id,
                x: current.x,
                y: current.y,
                rotation: current.rotation,
                size: finalSize,
              }),
            });
          }
        } catch (err) {
          console.error("Failed to save photo size:", err);
        }
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [isAdmin],
  );

  const handleRotateMouseDown = useCallback(
    (e: React.MouseEvent, photoId: string) => {
      if (!isAdmin) return;
      e.preventDefault();
      e.stopPropagation();
      setRotatingPhoto(photoId);

      const photo = photosRef.current.find((p) => p.id === photoId);
      if (!photo) return;

      // Photo center in screen space (for atan2 with clientX/clientY)
      const getCenterScreen = (p: Photo) => {
        const canvasRect = canvasWrapperRef.current?.getBoundingClientRect();
        const scale = scaleRef.current;
        if (!canvasRect) return { cx: p.x, cy: p.y };
        const photoSize =
          typeof p.size === "number" ? p.size : DEFAULT_PHOTO_SIZE;
        const ar = getPhotoAspectRatio(p);
        const { width: w, height: h } = sizeToDimensions(photoSize, ar);
        const boxW = w + PHOTO_PADDING * 2;
        const boxH = h + PHOTO_PADDING * 2;
        const designCx = p.x + boxW / 2;
        const designCy = p.y + boxH / 2;
        return {
          cx: canvasRect.left + (designCx - contentBounds.contentMinX) * scale,
          cy: canvasRect.top + (designCy - contentBounds.contentMinY) * scale,
        };
      };

      const { cx, cy } = getCenterScreen(photo);
      const startCursorAngle = Math.atan2(e.clientY - cy, e.clientX - cx);
      const startRotationDeg = photo.rotation;

      const handleMouseMove = (e: MouseEvent) => {
        const current = photosRef.current.find((p) => p.id === photoId);
        if (!current) return;
        const { cx: cxNow, cy: cyNow } = getCenterScreen(current);
        const cursorAngle = Math.atan2(e.clientY - cyNow, e.clientX - cxNow);
        const deltaRad = cursorAngle - startCursorAngle;
        const deltaDeg = (deltaRad * 180) / Math.PI;
        const newRotationDeg = startRotationDeg + deltaDeg;
        setPhotos((prev) =>
          prev.map((p) =>
            p.id === photoId ? { ...p, rotation: newRotationDeg } : p,
          ),
        );
      };

      const handleMouseUp = async () => {
        setRotatingPhoto(null);
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        const current = photosRef.current.find((p) => p.id === photoId);
        if (!current) return;
        // After rotation, ensure the rotated photo fits in the viewport (content bounds); resize if needed
        const fitted = fitRotatedPhotoInBounds(current, contentBounds);
        const needsResize =
          fitted.x !== current.x ||
          fitted.y !== current.y ||
          fitted.size !==
            (typeof current.size === "number"
              ? current.size
              : DEFAULT_PHOTO_SIZE);
        if (needsResize) {
          setPhotos((prev) =>
            prev.map((p) =>
              p.id === photoId
                ? { ...p, x: fitted.x, y: fitted.y, size: fitted.size }
                : p,
            ),
          );
        }
        try {
          await fetch("/api/photos", {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              ...getAdminHeaders(),
            },
            body: JSON.stringify({
              photoId: current.id,
              x: fitted.x,
              y: fitted.y,
              rotation: current.rotation,
              size: fitted.size,
            }),
          });
        } catch (err) {
          console.error("Failed to save photo rotation:", err);
        }
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [isAdmin, contentBounds],
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!isAdmin) return;
      setIsDragOver(true);
    },
    [isAdmin],
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      if (!isAdmin) return;

      const files = Array.from(e.dataTransfer.files);
      const imageFiles = files.filter((file) => file.type.startsWith("image/"));

      if (imageFiles.length > 0) {
        let dropDesignX: number;
        let dropDesignY: number;
        const canvasEl = canvasWrapperRef.current;
        const scale = scaleRef.current;
        if (canvasEl && scale > 0) {
          const r = canvasEl.getBoundingClientRect();
          dropDesignX =
            contentBounds.contentMinX + (e.clientX - r.left) / scale;
          dropDesignY = contentBounds.contentMinY + (e.clientY - r.top) / scale;
        } else {
          const rect = e.currentTarget.getBoundingClientRect();
          dropDesignX = e.clientX - rect.left - 40;
          dropDesignY = e.clientY - rect.top - 40;
        }
        // Center the new photo on the drop position (offset in design space)
        const offset = 40;
        imageFiles.forEach((file) => {
          uploadFileToServer(file, dropDesignX - offset, dropDesignY - offset);
        });
      }
    },
    [isAdmin, contentBounds],
  );

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Use server upload for file input as well
      uploadFileToServer(
        file,
        Math.random() * 200 + 100,
        Math.random() * 150 + 100,
      );
    }
  };

  const handleDeletePhoto = useCallback(async (photoId: string) => {
    setContextMenu(null);
    // Optimistic update: remove from canvas immediately
    setPhotos((prev) => prev.filter((p) => p.id !== photoId));
    try {
      const res = await fetch("/api/photos", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...getAdminHeaders(),
        },
        body: JSON.stringify({ photoId }),
      });
      if (!res.ok) {
        const data = await fetch("/api/photos").then((r) => r.json());
        if (data.photos) setPhotos(data.photos);
      }
    } catch (err) {
      console.error("Failed to delete photo:", err);
      try {
        const data = await fetch("/api/photos").then((r) => r.json());
        if (data.photos) setPhotos(data.photos);
      } catch (_) {}
    }
  }, []);

  // Close context menu on click outside (delay adding listener so right-click doesn't immediately close)
  useEffect(() => {
    if (!contextMenu) return;
    let remove: (() => void) | undefined;
    const id = setTimeout(() => {
      const close = () => setContextMenu(null);
      document.addEventListener("mousedown", close);
      remove = () => document.removeEventListener("mousedown", close);
    }, 0);
    return () => {
      clearTimeout(id);
      remove?.();
    };
  }, [contextMenu]);

  const handleBackgroundUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/background", {
        method: "POST",
        headers: getAdminHeaders(),
        body: formData,
      });

      if (!response.ok) throw new Error("Failed to save background");

      setBackgroundImage(`/api/photo/background.jpg?t=${Date.now()}`);
    } catch (error) {
      console.error("Background upload failed:", error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div
      className={`relative min-h-screen w-full bg-gradient-to-br from-slate-700 to-slate-900 overflow-hidden transition-all duration-300 ${
        isDragOver ? "ring-4 ring-blue-400 ring-opacity-50 bg-blue-500/20" : ""
      }`}
      style={{
        minHeight: "100vh",
        height: isMobileViewport ? "100dvh" : "100vh",
        backgroundImage: `url("${backgroundImage}")`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="absolute inset-0 bg-black/40" />

      {/* Admin lock + upload controls: top-right, visible on hover */}
      {authChecked && (
        <div
          className="absolute top-0 right-0 z-20 p-4 min-w-24 min-h-24"
          onMouseEnter={() => setHoverTopRight(true)}
          onMouseLeave={() => setHoverTopRight(false)}
        >
          <div
            className={`flex items-center justify-end gap-2 transition-opacity duration-200 ${
              hoverTopRight ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
          >
            {!isAdmin ? (
              <button
                type="button"
                onClick={async () => {
                  const key = window.prompt("Enter admin key");
                  if (!key?.trim()) return;
                  const res = await fetch("/api/auth/check", {
                    method: "POST",
                    headers: { [ADMIN_KEY_HEADER]: key.trim() },
                  });
                  if (res.ok) {
                    localStorage.setItem(ADMIN_KEY_STORAGE, key.trim());
                    setIsAdmin(true);
                  } else {
                    window.alert("Invalid key");
                  }
                }}
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/20 text-white backdrop-blur-sm hover:bg-white/30"
                title="Unlock admin mode"
              >
                <Lock className="h-4 w-4" />
              </button>
            ) : (
              <>
                <label
                  className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg bg-white/20 text-white backdrop-blur-sm hover:bg-white/30"
                  title="Upload photos"
                >
                  <Upload className="h-4 w-4" />
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
                <label
                  className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg bg-white/20 text-white backdrop-blur-sm hover:bg-white/30"
                  title="Change background"
                >
                  <ImageIcon className="h-4 w-4" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleBackgroundUpload}
                    className="hidden"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => {
                    localStorage.removeItem(ADMIN_KEY_STORAGE);
                    setIsAdmin(false);
                  }}
                  className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg bg-white/20 text-white backdrop-blur-sm hover:bg-white/30"
                  title="Lock (exit admin mode)"
                >
                  <LockOpen className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Drag instruction overlay (only when admin) */}
      {isAdmin && !isDragOver && photos.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-white/70">
            <Upload className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">Drag & drop photos here</p>
          </div>
        </div>
      )}

      {/* Drag over indicator */}
      {isDragOver && (
        <div className="absolute inset-0 flex items-center justify-center bg-blue-500/20 pointer-events-none">
          <div className="text-center text-white">
            <Upload className="w-16 h-16 mx-auto mb-4 animate-bounce" />
            <p className="text-xl font-bold">Drop photos here!</p>
          </div>
        </div>
      )}

      {/* Uploading indicator */}
      {isUploading && (
        <div className="absolute top-3 left-3 z-20 bg-white/90 text-black px-3 py-2 rounded-lg shadow-lg">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-medium">Uploading...</span>
          </div>
        </div>
      )}

      {contextMenu &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed z-[9999] min-w-[120px] rounded-lg border border-white/20 bg-black/90 py-1 shadow-lg backdrop-blur-sm"
            style={{ left: contextMenu.x, top: contextMenu.y }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleDeletePhoto(contextMenu.photoId);
              }}
              className="w-full px-3 py-2 text-left text-sm text-white hover:bg-white/20"
            >
              Delete photo
            </button>
          </div>,
          document.body,
        )}

      {/* Mobile: single scroll container (root is 100dvh so no body scroll) */}
      <div className="flex flex-col overflow-y-auto overflow-x-hidden md:hidden h-full min-h-0 relative z-10">
        {photos.map((photo) => (
          <section
            key={photo.id}
            className="min-h-[85dvh] flex items-center justify-center shrink-0 py-6 px-4"
          >
            <div
              className="shadow-lg"
              style={{
                transform: `rotate(${photo.rotation}deg)`,
                background: "white",
                padding: `${PHOTO_PADDING}px`,
                maxWidth: "min(90vw, 400px)",
                maxHeight: "75dvh",
              }}
            >
              <ImageWithFallback
                src={photo.src}
                alt="Memory"
                draggable={false}
                className="object-contain block w-auto h-auto max-w-full max-h-[70dvh]"
              />
            </div>
          </section>
        ))}
      </div>

      {/* Desktop: viewport-scaled canvas (centered, scale-to-fit) */}
      <div
        ref={desktopContainerRef}
        className="hidden md:block absolute inset-0 overflow-hidden"
      >
        <div
          ref={canvasWrapperRef}
          className="absolute"
          style={{
            left: (viewportSize.width - layoutBounds.contentWidth * scale) / 2,
            top: (viewportSize.height - layoutBounds.contentHeight * scale) / 2,
            width: layoutBounds.contentWidth * scale,
            height: layoutBounds.contentHeight * scale,
            transition:
              draggedPhoto || resizingPhoto || rotatingPhoto
                ? "none"
                : "left 220ms ease-out, top 220ms ease-out, width 220ms ease-out, height 220ms ease-out",
          }}
        >
          {photos.map((photo) => {
            const photoSize =
              typeof photo.size === "number" ? photo.size : DEFAULT_PHOTO_SIZE;
            const isResizing = resizingPhoto?.photoId === photo.id;
            const isRotating = rotatingPhoto === photo.id;
            const showPreview = isResizing && resizingPhoto;
            const left = (photo.x - layoutBounds.contentMinX) * scale;
            const top = (photo.y - layoutBounds.contentMinY) * scale;
            const scaledSize = photoSize * scale;
            const scaledPadding = PHOTO_PADDING * scale;
            return (
              <div
                key={photo.id}
                className="absolute"
                style={{
                  left,
                  top,
                  transition:
                    draggedPhoto || isResizing || isRotating
                      ? "none"
                      : "left 220ms ease-out, top 220ms ease-out",
                }}
              >
                {/* Resize preview: thin rectangle when dragging (matches photo aspect ratio) */}
                {showPreview &&
                  (() => {
                    const ar = getPhotoAspectRatio(photo);
                    const { width: w, height: h } = sizeToDimensions(
                      resizingPhoto.previewSize,
                      ar,
                    );
                    return (
                      <div
                        className="absolute left-0 top-0 pointer-events-none border-2 border-white/90 z-20"
                        style={{
                          width: (w + PHOTO_PADDING * 2) * scale,
                          height: (h + PHOTO_PADDING * 2) * scale,
                          transform: `rotate(${photo.rotation}deg)`,
                          boxShadow: "0 0 0 1px rgba(0,0,0,0.3)",
                        }}
                      />
                    );
                  })()}
                {/* Rotate preview: border frame when dragging to rotate */}
                {isRotating &&
                  (() => {
                    const ar = getPhotoAspectRatio(photo);
                    const { width: w, height: h } = sizeToDimensions(
                      photoSize,
                      ar,
                    );
                    return (
                      <div
                        className="absolute left-0 top-0 pointer-events-none border-2 border-white/90 z-20"
                        style={{
                          width: (w + PHOTO_PADDING * 2) * scale,
                          height: (h + PHOTO_PADDING * 2) * scale,
                          transform: `rotate(${photo.rotation}deg)`,
                          boxShadow: "0 0 0 1px rgba(0,0,0,0.3)",
                        }}
                      />
                    );
                  })()}
                <div
                  className={`absolute left-0 top-0 select-none transition-transform ${
                    isAdmin
                      ? draggedPhoto === photo.id
                        ? "cursor-grabbing"
                        : "cursor-grab"
                      : "cursor-default"
                  } ${draggedPhoto === photo.id ? "z-10" : "z-0"} ${
                    isResizing || isRotating ? "invisible" : ""
                  }`}
                  style={{ transform: `rotate(${photo.rotation}deg)` }}
                  onMouseDown={(e) => handleMouseDown(e, photo.id)}
                  onDragStart={(e) => e.preventDefault()}
                  onContextMenu={(e) => {
                    if (!isAdmin) return;
                    e.preventDefault();
                    setContextMenu({
                      photoId: photo.id,
                      x: e.clientX,
                      y: e.clientY,
                    });
                  }}
                >
                  <div
                    className="shadow-lg transform transition-shadow relative"
                    style={{
                      background: "white",
                      padding: `${scaledPadding}px`,
                      display: "inline-block",
                      transition:
                        draggedPhoto || isResizing || isRotating
                          ? "none"
                          : "padding 220ms ease-out",
                    }}
                  >
                    <ImageWithFallback
                      src={photo.src}
                      alt="Memory"
                      draggable={false}
                      className="object-contain"
                      style={{
                        maxWidth: `${scaledSize}px`,
                        maxHeight: `${scaledSize}px`,
                        width: "auto",
                        height: "auto",
                        display: "block",
                        transition:
                          draggedPhoto || isResizing || isRotating
                            ? "none"
                            : "max-width 220ms ease-out, max-height 220ms ease-out",
                      }}
                      onLoad={(e) => {
                        const img = e.currentTarget;
                        if (
                          typeof photo.width !== "number" ||
                          typeof photo.height !== "number"
                        ) {
                          const w = img.naturalWidth;
                          const h = img.naturalHeight;
                          console.log("[photo] dimensions:", {
                            photoId: photo.id,
                            width: w,
                            height: h,
                          });
                          setPhotos((prev) =>
                            prev.map((p) =>
                              p.id === photo.id
                                ? { ...p, width: w, height: h }
                                : p,
                            ),
                          );
                        }
                      }}
                    />
                    {isAdmin && (
                      <>
                        {/* Top-right: rotate handle shown only when hovering corner or actively rotating */}
                        <div
                          className="absolute -top-3 -right-3 h-12 w-12"
                          onMouseEnter={() => setHoverRotateCorner(photo.id)}
                          onMouseLeave={() => setHoverRotateCorner(null)}
                        >
                          {(hoverRotateCorner === photo.id ||
                            rotatingPhoto === photo.id) && (
                            <div
                              className="absolute top-2 right-2 h-5 w-5 cursor-move bg-white/90 border border-slate-400 rounded-bl shadow"
                              onMouseDown={(e) =>
                                handleRotateMouseDown(e, photo.id)
                              }
                              title="Drag to rotate"
                            />
                          )}
                        </div>
                        {/* Bottom-right: resize handle shown only when hovering corner or actively resizing */}
                        <div
                          className="absolute -bottom-3 -right-3 h-12 w-12"
                          onMouseEnter={() => setHoverResizeCorner(photo.id)}
                          onMouseLeave={() => setHoverResizeCorner(null)}
                        >
                          {(hoverResizeCorner === photo.id ||
                            resizingPhoto?.photoId === photo.id) && (
                            <div
                              className="absolute bottom-2 right-2 h-5 w-5 cursor-nwse-resize bg-white/90 border border-slate-400 rounded-tl shadow"
                              onMouseDown={(e) =>
                                handleResizeMouseDown(e, photo.id)
                              }
                              title="Drag to resize"
                            />
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
