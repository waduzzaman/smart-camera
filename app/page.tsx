"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  SwitchCamera,
  Download,
  Settings2,
  Image as ImageIcon,
  AlertCircle,
  Focus,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import {
  getNextSequenceNumber,
  updateSequenceNumber,
  generateFileName,
} from "@/lib/naming-utils";

export default function CameraPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [facingMode, setFacingMode] =
    useState<"user" | "environment">("environment");

  const [permissionDenied, setPermissionDenied] = useState(false);
  const [isFlashing, setIsFlashing] = useState(false);

  // ✅ Lazy initialization (NO effect needed)
  const [sequenceNumber, setSequenceNumber] = useState<number>(() =>
    getNextSequenceNumber()
  );

  const [lastCapturedImage, setLastCapturedImage] =
    useState<string | null>(() => {
      if (typeof window === "undefined") return null;
      return localStorage.getItem("camera_last_image");
    });

  const [lastCapturedName, setLastCapturedName] =
    useState<string | null>(() => {
      if (typeof window === "undefined") return null;
      return localStorage.getItem("camera_last_filename");
    });

  const [useCustomPrefix, setUseCustomPrefix] = useState(false);
  const [customPrefix, setCustomPrefix] = useState("");
  const [jpegQuality, setJpegQuality] = useState(92);

  // ✅ React 18 safe camera effect
  useEffect(() => {
    let isMounted = true;

    const startCamera = async () => {
      try {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode,
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });

        if (!isMounted) return;

        streamRef.current = stream;
        setPermissionDenied(false);

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch {
        try {
          const fallback =
            await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: false,
            });

          if (!isMounted) return;

          streamRef.current = fallback;
          setPermissionDenied(false);

          if (videoRef.current) {
            videoRef.current.srcObject = fallback;
          }
        } catch {
          if (isMounted) setPermissionDenied(true);
        }
      }
    };

    startCamera();

    return () => {
      isMounted = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [facingMode]);

  const toggleCamera = () => {
    setFacingMode((prev) =>
      prev === "user" ? "environment" : "user"
    );
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    ctx.save();

    if (facingMode === "user") {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.restore();

    const dataUrl = canvas.toDataURL(
      "image/jpeg",
      jpegQuality / 100
    );

    const fileName = generateFileName(
      useCustomPrefix,
      customPrefix,
      sequenceNumber
    );

    setIsFlashing(true);
    setTimeout(() => setIsFlashing(false), 150);

    setLastCapturedImage(dataUrl);
    setLastCapturedName(fileName);

    try {
      localStorage.setItem("camera_last_image", dataUrl);
      localStorage.setItem("camera_last_filename", fileName);
    } catch {}

    const nextSeq = sequenceNumber + 1;
    setSequenceNumber(nextSeq);
    updateSequenceNumber(nextSeq);

    downloadImage(dataUrl, fileName);
  };

  const downloadImage = (dataUrl: string, fileName: string) => {
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <main className="relative flex h-[100dvh] w-full items-center justify-center bg-black text-white overflow-hidden">
      <div className="absolute inset-0">
        {permissionDenied ? (
          <div className="flex h-full items-center justify-center p-6">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Camera Access Denied</AlertTitle>
              <AlertDescription>
                Please enable camera permission in browser settings.
              </AlertDescription>
            </Alert>
          </div>
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={cn(
              "h-full w-full object-cover",
              facingMode === "user" ? "scale-x-[-1]" : "",
              isFlashing
                ? "blur-md brightness-110 scale-105"
                : ""
            )}
          />
        )}
      </div>

      <AnimatePresence>
        {isFlashing && (
          <motion.div
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-white z-50"
          />
        )}
      </AnimatePresence>

      <div className="absolute bottom-10 flex items-center gap-8 z-20">
        {lastCapturedImage ? (
          <img
            src={lastCapturedImage}
            alt="preview"
            className="h-14 w-14 rounded-full object-cover border border-white/30"
          />
        ) : (
          <div className="h-14 w-14 rounded-full bg-white/10 flex items-center justify-center">
            <ImageIcon className="h-5 w-5 text-white/40" />
          </div>
        )}

        <button
          onClick={capturePhoto}
          disabled={permissionDenied}
          className="h-20 w-20 rounded-full border-4 border-white flex items-center justify-center"
        >
          <div className="h-14 w-14 bg-white rounded-full" />
        </button>

        <button
          onClick={toggleCamera}
          className="h-14 w-14 rounded-full bg-white/20 flex items-center justify-center"
        >
          <SwitchCamera className="h-5 w-5" />
        </button>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </main>
  );
}

function cn(
  ...classes: (string | undefined | null | false)[]
) {
  return classes.filter(Boolean).join(" ");
}