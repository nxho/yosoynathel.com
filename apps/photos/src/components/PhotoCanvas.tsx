"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Upload, RotateCcw } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";

interface Photo {
  id: string;
  src: string;
  x: number;
  y: number;
  rotation: number;
  filename?: string;
  uploadedAt?: string;
  size?: number;
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
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [canvasHeight, setCanvasHeight] = useState(600);
  const [backgroundImage, setBackgroundImage] = useState<string>(
    "https://images.unsplash.com/photo-1759015403439-e75abba7dfb4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhZXN0aGV0aWMlMjBibGFja2JvYXJkJTIwY2hhbGt8ZW58MXx8fHwxNzU5NjIzNzM4fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
  );
  const photosRef = useRef<Photo[]>(initialPhotos);
  const dragStartRef = useRef<{
    startX: number;
    startY: number;
    startPhotoX: number;
    startPhotoY: number;
  } | null>(null);

  // Keep the ref in sync with the state
  photosRef.current = photos;

  // Calculate required canvas height based on photo positions
  const calculateRequiredHeight = useCallback((photoList: Photo[]) => {
    if (photoList.length === 0) return 600; // Default height

    const photoHeight = 150; // Approximate photo height including borders
    const maxY = Math.max(...photoList.map((photo) => photo.y + photoHeight));
    const requiredHeight = Math.max(600, maxY + 50); // Add 50px padding

    return requiredHeight;
  }, []);

  // Update canvas height when photos change
  useEffect(() => {
    const newHeight = calculateRequiredHeight(photos);
    setCanvasHeight(newHeight);
  }, [photos, calculateRequiredHeight]);

  // Load photos and background from server on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load photos
        const photosResponse = await fetch("/api/photos");
        if (photosResponse.ok) {
          const photosData = await photosResponse.json();
          if (photosData.photos && photosData.photos.length > 0) {
            setPhotos(photosData.photos);
          }
        }

        // Load background
        const backgroundResponse = await fetch("/api/background");
        if (backgroundResponse.ok) {
          const backgroundData = await backgroundResponse.json();
          if (backgroundData.backgroundImage) {
            setBackgroundImage(backgroundData.backgroundImage);
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
    dropY: number
  ) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      // Upload to server endpoint
      const response = await fetch("/api/upload", {
        method: "POST",
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
              : p
          )
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
              },
              body: JSON.stringify({
                photoId: finalPhoto.id,
                x: finalPhoto.x,
                y: finalPhoto.y,
                rotation: finalPhoto.rotation,
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
    []
  );

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter((file) => file.type.startsWith("image/"));

    if (imageFiles.length > 0) {
      const rect = e.currentTarget.getBoundingClientRect();
      const dropX = e.clientX - rect.left;
      const dropY = e.clientY - rect.top;

      // Upload each image file
      imageFiles.forEach((file) => {
        uploadFileToServer(file, dropX, dropY);
      });
    }
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Use server upload for file input as well
      uploadFileToServer(
        file,
        Math.random() * 200 + 100,
        Math.random() * 150 + 100
      );
    }
  };

  const handleBackgroundUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error("Upload failed");
        }

        const result = await response.json();

        // Save background to server
        await fetch("/api/background", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            backgroundImage: result.url,
          }),
        });

        // Update local state
        setBackgroundImage(result.url);
      } catch (error) {
        console.error("Background upload failed:", error);
      } finally {
        setIsUploading(false);
      }
    }
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Photo Canvas
          <div className="flex gap-2">
            <Button size="sm" variant="outline" asChild>
              <label className="cursor-pointer">
                <Upload className="w-4 h-4 mr-2" />
                Upload Photos
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </Button>
            <Button size="sm" variant="outline" asChild>
              <label className="cursor-pointer">
                <Upload className="w-4 h-4 mr-2" />
                Change Background
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleBackgroundUpload}
                  className="hidden"
                />
              </label>
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div
          className={`relative w-full bg-gradient-to-br from-slate-700 to-slate-900 overflow-hidden transition-all duration-300 ${
            isDragOver
              ? "ring-4 ring-blue-400 ring-opacity-50 bg-blue-500/20"
              : ""
          }`}
          style={{
            height: `${canvasHeight}px`,
            backgroundImage: `url("${backgroundImage}")`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="absolute inset-0 bg-black/40" />

          {/* Drag instruction overlay */}
          {!isDragOver && photos.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-white/70">
                <Upload className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">Drag & drop photos here</p>
                <p className="text-sm opacity-75">or use the upload button</p>
              </div>
            </div>
          )}

          {/* Drag over indicator */}
          {isDragOver && (
            <div className="absolute inset-0 flex items-center justify-center bg-blue-500/20">
              <div className="text-center text-white">
                <Upload className="w-16 h-16 mx-auto mb-4 animate-bounce" />
                <p className="text-xl font-bold">Drop photos here!</p>
              </div>
            </div>
          )}

          {/* Uploading indicator */}
          {isUploading && (
            <div className="absolute top-4 right-4 bg-white/90 text-black px-3 py-2 rounded-lg shadow-lg">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm font-medium">Uploading...</span>
              </div>
            </div>
          )}

          {photos.map((photo) => (
            <div
              key={photo.id}
              className={`absolute cursor-move select-none transition-transform hover:scale-105 ${
                draggedPhoto === photo.id ? "z-10 scale-105" : "z-0"
              }`}
              style={{
                left: photo.x,
                top: photo.y,
                transform: `rotate(${photo.rotation}deg)`,
              }}
              onMouseDown={(e) => handleMouseDown(e, photo.id)}
            >
              <div
                className="shadow-lg transform hover:shadow-xl transition-shadow"
                style={{
                  background: "white",
                  padding: "6px",
                  display: "inline-block",
                }}
              >
                <ImageWithFallback
                  src={photo.src}
                  alt="Memory"
                  className="object-contain"
                  style={{
                    maxWidth: "140px",
                    maxHeight: "140px",
                    width: "auto",
                    height: "auto",
                    display: "block",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
