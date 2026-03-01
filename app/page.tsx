"use client";

import React, { useState, useRef, useEffect } from "react";
import { SwitchCamera, AlertCircle, Image as ImageIcon } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

import {
  getNextSequenceNumber,
  updateSequenceNumber,
  generateFileName,
} from "@/lib/naming-utils";
import Image from "next/image";

export default function CameraPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [facingMode, setFacingMode] = useState<"user" | "environment">(
    "environment",
  );

  const [permissionDenied, setPermissionDenied] = useState(false);
  const [isFlashing, setIsFlashing] = useState(false);

  // ✅ Lazy init → no effect needed
  const [sequenceNumber, setSequenceNumber] = useState<number>(() =>
    getNextSequenceNumber(),
  );

  const [lastCapturedImage, setLastCapturedImage] = useState<string | null>(
    () => {
      if (typeof window === "undefined") return null;
      return localStorage.getItem("camera_last_image");
    },
  );

  const [useCustomPrefix, setUseCustomPrefix] = useState(false);
  const [customPrefix, setCustomPrefix] = useState("");

  const [jpegQuality] = useState(92);

  // ✅ React 18 safe camera effect
  useEffect(() => {
    let mounted = true;

    const startCamera = async () => {
      try {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode },
          audio: false,
        });

        if (!mounted) return;

        streamRef.current = stream;
        setPermissionDenied(false);

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch {
        if (mounted) setPermissionDenied(true);
      }
    };

    startCamera();

    return () => {
      mounted = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [facingMode]);

  const toggleCamera = () => {
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
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

    const dataUrl = canvas.toDataURL("image/jpeg", jpegQuality / 100);

    const fileName = generateFileName(
      useCustomPrefix,
      customPrefix,
      sequenceNumber,
    );

    // ✅ Save last used number
    updateSequenceNumber(sequenceNumber);

    // ✅ Prepare next number
    setSequenceNumber((prev) => prev + 1);

    setLastCapturedImage(dataUrl);
    localStorage.setItem("camera_last_image", dataUrl);

    setIsFlashing(true);
    setTimeout(() => setIsFlashing(false), 150);

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
    <main className="relative flex h-screen w-full items-center justify-center bg-black text-white overflow-hidden">
      <div className="absolute inset-0">
        {permissionDenied ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <AlertCircle className="mx-auto mb-4 h-6 w-6 text-red-500" />
              Camera access denied.
            </div>
          </div>
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`h-full w-full object-cover ${
              facingMode === "user" ? "scale-x-[-1]" : ""
            }`}
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
          <div className="relative h-14 w-14 rounded-full overflow-hidden border border-white/30">
            <Image
              src={lastCapturedImage}
              alt="preview"
              fill
              className="object-cover"
              unoptimized
            />
          </div>
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
