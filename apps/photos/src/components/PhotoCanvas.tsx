"use client";

import { useState, useCallback, useRef, useEffect } from "react";
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

const initialPhotos: Photo[] = [
  // {
  //   id: "1",
  //   src: "https://images.unsplash.com/photo-1615574147484-ebb0b9947186?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmcmllbmRzJTIwcG9sYXJvaWQlMjBwaG90b3N8ZW58MXx8fHwxNzU5NjIzNzMxfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
  //   x: 50,
  //   y: 80,
  //   rotation: -5,
  // },
  // {
  //   id: "2",
  //   src: "https://images.unsplash.com/photo-1570632555109-90a0d0442209?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx2aW50YWdlJTIwaW5zdGFudCUyMHBob3Rvc3xlbnwxfHx8fDE3NTk2MjM3MzN8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
  //   x: 250,
  //   y: 120,
  //   rotation: 8,
  // },
  // {
  //   id: "3",
  //   src: "https://images.unsplash.com/photo-1573502344213-f7407f6685f3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmaWxtJTIwY2FtZXJhJTIwbWVtb3JpZXN8ZW58MXx8fHwxNzU5NjIzNzM2fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
  //   x: 180,
  //   y: 200,
  //   rotation: -12,
  // },
];

export function PhotoCanvas() {
  const [photos, setPhotos] = useState<Photo[]>(initialPhotos);
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
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    photoId: string;
    x: number;
    y: number;
  } | null>(null);
  const [canvasHeight, setCanvasHeight] = useState(600);
  const [backgroundImage, setBackgroundImage] = useState<string>(
    "/api/photo/background.jpg",
  );
  const photosRef = useRef<Photo[]>(initialPhotos);
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

  // Keep the ref in sync with the state
  photosRef.current = photos;

  // Calculate required canvas height based on photo positions
  const calculateRequiredHeight = useCallback((photoList: Photo[]) => {
    if (photoList.length === 0) return 600;

    const maxY = Math.max(
      ...photoList.map((p) => {
        const h =
          (typeof p.size === "number" ? p.size : DEFAULT_PHOTO_SIZE) +
          PHOTO_PADDING * 2;
        return p.y + h;
      }),
    );
    return Math.max(600, maxY + 50);
  }, []);

  // Update canvas height when photos change
  useEffect(() => {
    const newHeight = calculateRequiredHeight(photos);
    setCanvasHeight(newHeight);
  }, [photos, calculateRequiredHeight]);

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

        const deltaX = e.clientX - dragStart.startX;
        const deltaY = e.clientY - dragStart.startY;

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
        const deltaX = e.clientX - start.startX;
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

      const getCenter = (p: Photo) => {
        const photoSize =
          typeof p.size === "number" ? p.size : DEFAULT_PHOTO_SIZE;
        const ar = getPhotoAspectRatio(p);
        const { width: w, height: h } = sizeToDimensions(photoSize, ar);
        const boxW = w + PHOTO_PADDING * 2;
        const boxH = h + PHOTO_PADDING * 2;
        return {
          cx: p.x + boxW / 2,
          cy: p.y + boxH / 2,
        };
      };

      const { cx, cy } = getCenter(photo);
      const startCursorAngle = Math.atan2(
        e.clientY - cy,
        e.clientX - cx,
      );
      const startRotationDeg = photo.rotation;

      const handleMouseMove = (e: MouseEvent) => {
        const current = photosRef.current.find((p) => p.id === photoId);
        if (!current) return;
        const { cx: cxNow, cy: cyNow } = getCenter(current);
        const cursorAngle = Math.atan2(
          e.clientY - cyNow,
          e.clientX - cxNow,
        );
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
        if (current) {
          try {
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
                ...(typeof current.size === "number" && { size: current.size }),
              }),
            });
          } catch (err) {
            console.error("Failed to save photo rotation:", err);
          }
        }
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [isAdmin],
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
        const rect = e.currentTarget.getBoundingClientRect();
        const dropX = e.clientX - rect.left;
        const dropY = e.clientY - rect.top;

        imageFiles.forEach((file) => {
          uploadFileToServer(file, dropX, dropY);
        });
      }
    },
    [isAdmin],
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
        height: `max(100vh, ${canvasHeight}px)`,
        backgroundImage: `url("${backgroundImage}")`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="absolute inset-0 bg-black/40" />

      {/* Admin lock + upload controls: top-right */}
      {authChecked && (
        <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
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
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/20 text-white backdrop-blur-sm hover:bg-white/30"
                title="Lock (exit admin mode)"
              >
                <LockOpen className="h-4 w-4" />
              </button>
            </>
          )}
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

      {photos.map((photo) => {
        const photoSize =
          typeof photo.size === "number" ? photo.size : DEFAULT_PHOTO_SIZE;
        const isResizing = resizingPhoto?.photoId === photo.id;
        const isRotating = rotatingPhoto === photo.id;
        const showPreview = isResizing && resizingPhoto;
        return (
          <div
            key={photo.id}
            className="absolute"
            style={{ left: photo.x, top: photo.y }}
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
                      width: w + PHOTO_PADDING * 2,
                      height: h + PHOTO_PADDING * 2,
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
                const { width: w, height: h } = sizeToDimensions(photoSize, ar);
                return (
                  <div
                    className="absolute left-0 top-0 pointer-events-none border-2 border-white/90 z-20"
                    style={{
                      width: w + PHOTO_PADDING * 2,
                      height: h + PHOTO_PADDING * 2,
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
                  padding: `${PHOTO_PADDING}px`,
                  display: "inline-block",
                }}
              >
                <ImageWithFallback
                  src={photo.src}
                  alt="Memory"
                  draggable={false}
                  className="object-contain"
                  style={{
                    maxWidth: `${photoSize}px`,
                    maxHeight: `${photoSize}px`,
                    width: "auto",
                    height: "auto",
                    display: "block",
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
                          p.id === photo.id ? { ...p, width: w, height: h } : p,
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
  );
}
