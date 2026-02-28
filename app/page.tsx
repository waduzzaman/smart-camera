"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Camera, SwitchCamera, Download, Settings2, Image as ImageIcon, AlertCircle, Focus } from "lucide-react";
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

import { getNextSequenceNumber, updateSequenceNumber, generateFileName } from "@/lib/naming-utils";

export default function CameraPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [isFlashing, setIsFlashing] = useState(false);
  
  // Settings State
  const [useCustomPrefix, setUseCustomPrefix] = useState(false);
  const [customPrefix, setCustomPrefix] = useState("");
  const [sequenceNumber, setSequenceNumber] = useState(1);
  const [jpegQuality, setJpegQuality] = useState(92);
  
  // Gallery State
  const [lastCapturedImage, setLastCapturedImage] = useState<string | null>(null);
  const [lastCapturedName, setLastCapturedName] = useState<string | null>(null);

  // Initialize sequence number and gallery from local storage
  useEffect(() => {
    setSequenceNumber(getNextSequenceNumber());
    
    if (typeof window !== "undefined") {
      const savedImage = localStorage.getItem("camera_last_image");
      const savedName = localStorage.getItem("camera_last_filename");
      if (savedImage) setLastCapturedImage(savedImage);
      if (savedName) setLastCapturedName(savedName);
    }
  }, []);

  const startCamera = useCallback(async () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });

      streamRef.current = newStream;
      setPermissionDenied(false);

      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      
      // Fallback for devices that might reject specific constraints
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
        streamRef.current = fallbackStream;
        setPermissionDenied(false);
        if (videoRef.current) {
          videoRef.current.srcObject = fallbackStream;
        }
      } catch (fallbackErr) {
        console.error("Fallback error accessing camera:", fallbackErr);
        setPermissionDenied(true);
      }
    }
  }, [facingMode]);

  useEffect(() => {
    startCamera();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [startCamera]);

  const toggleCamera = () => {
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    if (!context) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    if (facingMode === "user") {
      context.translate(canvas.width, 0);
      context.scale(-1, 1);
    }
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageDataUrl = canvas.toDataURL("image/jpeg", jpegQuality / 100);
    const fileName = generateFileName(useCustomPrefix, customPrefix, sequenceNumber);

    setIsFlashing(true);
    setTimeout(() => setIsFlashing(false), 150);

    setLastCapturedImage(imageDataUrl);
    setLastCapturedName(fileName);
    
    // Persist to local storage
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("camera_last_image", imageDataUrl);
        localStorage.setItem("camera_last_filename", fileName);
      } catch (e) {
        console.warn("Could not save image to localStorage (might exceed quota):", e);
      }
    }
    
    const nextSeq = sequenceNumber + 1;
    setSequenceNumber(nextSeq);
    updateSequenceNumber(sequenceNumber);

    downloadImage(imageDataUrl, fileName);
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
    <main className="relative flex h-[100dvh] w-full flex-col items-center justify-center overflow-hidden bg-[#050505] text-slate-100 font-sans selection:bg-emerald-500/30">
      {/* Camera Viewfinder */}
      <div className="absolute inset-0 z-0 bg-black">
        {permissionDenied ? (
          <div className="flex h-full w-full items-center justify-center bg-zinc-950 p-6">
            <Alert variant="destructive" className="max-w-md bg-zinc-900/50 border-red-900/50 backdrop-blur-xl">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Camera Access Denied</AlertTitle>
              <AlertDescription className="flex flex-col gap-4 mt-2">
                <p>Please allow camera permissions in your browser settings to use this application.</p>
                <Button variant="destructive" onClick={startCamera} className="w-fit">
                  Retry Camera Access
                </Button>
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
              "h-full w-full object-cover transition-all duration-700 ease-out",
              facingMode === "user" ? "scale-x-[-1]" : "",
              isFlashing ? "blur-md brightness-110 scale-105" : "blur-0 brightness-100 scale-100"
            )}
          />
        )}
      </div>

      {/* Cinematic Vignette & Focus Reticle */}
      <div className="absolute inset-0 z-10 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_20%,rgba(0,0,0,0.6)_100%)]" />
      <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center opacity-20">
        <Focus className="w-32 h-32 text-white font-thin" strokeWidth={0.5} />
      </div>

      {/* Flash Effect */}
      <AnimatePresence>
        {isFlashing && (
          <motion.div
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute inset-0 z-50 bg-white pointer-events-none"
          />
        )}
      </AnimatePresence>

      {/* Top Floating Pill (Settings & Info) */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2 z-20 flex items-center gap-4 bg-black/20 backdrop-blur-2xl border border-white/10 rounded-full pl-6 pr-2 py-2 shadow-2xl">
        <div className="flex items-center gap-2">
           <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
           <span className="font-mono text-xs font-medium tracking-widest text-white/90 uppercase">
             {generateFileName(useCustomPrefix, customPrefix, sequenceNumber)}
           </span>
        </div>

        <div className="w-[1px] h-4 bg-white/20 mx-1" />

        <Dialog>
          <DialogTrigger asChild>
            <button className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 hover:bg-white/20 transition-colors text-white/80 hover:text-white">
              <Settings2 className="h-4 w-4" />
            </button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md border-white/10 bg-zinc-950/90 backdrop-blur-3xl shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-light tracking-tight text-white">Naming Rules</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-8 py-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="custom-prefix" className="text-sm font-medium text-white/90">Custom Prefix</Label>
                  <p className="text-xs text-white/50">
                    Use a project name instead of just numbers.
                  </p>
                </div>
                <Switch
                  id="custom-prefix"
                  checked={useCustomPrefix}
                  onCheckedChange={setUseCustomPrefix}
                  className="data-[state=checked]:bg-emerald-500"
                />
              </div>
              
              <AnimatePresence>
                {useCustomPrefix && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-3 overflow-hidden"
                  >
                    <Label htmlFor="prefix-input" className="text-xs font-medium text-white/70 uppercase tracking-wider">Project Name</Label>
                    <Input
                      id="prefix-input"
                      placeholder="e.g. studio_shoot"
                      value={customPrefix}
                      onChange={(e) => setCustomPrefix(e.target.value)}
                      className="bg-black/50 border-white/10 text-white focus-visible:ring-emerald-500 h-12 rounded-xl"
                    />
                  </motion.div>
                )}
              </AnimatePresence>
              
               <div className="space-y-3 pt-6 border-t border-white/10">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium text-white/70 uppercase tracking-wider">JPEG Quality</Label>
                    <span className="text-xs font-mono text-white/90">{jpegQuality}%</span>
                  </div>
                  <Slider
                    value={[jpegQuality]}
                    onValueChange={(vals) => setJpegQuality(vals[0])}
                    max={100}
                    min={1}
                    step={1}
                    className="py-2"
                  />
               </div>

               <div className="space-y-3 pt-6 border-t border-white/10">
                  <Label className="text-xs font-medium text-white/70 uppercase tracking-wider">Current Sequence</Label>
                  <div className="flex items-center gap-3">
                    <Input
                      type="number"
                      min="1"
                      value={sequenceNumber}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (!isNaN(val) && val > 0) {
                          setSequenceNumber(val);
                          updateSequenceNumber(val - 1);
                        }
                      }}
                      className="bg-black/50 border-white/10 w-full focus-visible:ring-emerald-500 h-12 rounded-xl font-mono text-lg"
                    />
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setSequenceNumber(1);
                        updateSequenceNumber(0);
                      }}
                      className="h-12 px-6"
                    >
                      Reset
                    </Button>
                  </div>
               </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Bottom Floating Controls */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20 flex items-center gap-8 bg-black/20 backdrop-blur-2xl border border-white/10 rounded-full px-8 py-4 shadow-2xl">
        
        {/* Gallery Preview */}
        <div className="flex h-14 w-14 items-center justify-center">
          {lastCapturedImage ? (
            <Dialog>
              <DialogTrigger asChild>
                <button className="relative h-12 w-12 overflow-hidden rounded-full border border-white/20 transition-all hover:scale-110 active:scale-95 shadow-lg">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={lastCapturedImage} alt="Last capture" className="h-full w-full object-cover" />
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl border-white/10 bg-zinc-950/95 backdrop-blur-3xl p-4 shadow-2xl rounded-2xl">
                <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black/50 border border-white/5">
                   {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={lastCapturedImage} alt="Preview" className="h-full w-full object-contain" />
                </div>
                <div className="flex items-center justify-between px-2 pt-4 pb-2">
                  <div className="flex flex-col">
                    <span className="text-xs text-white/50 uppercase tracking-wider font-medium mb-1">Captured File</span>
                    <span className="text-sm font-mono text-white/90">{lastCapturedName}</span>
                  </div>
                  <Button 
                    variant="default" 
                    className="rounded-full px-6 shadow-lg"
                    onClick={() => downloadImage(lastCapturedImage, lastCapturedName || "photo.jpg")}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Save Copy
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/5">
              <ImageIcon className="h-5 w-5 text-white/30" />
            </div>
          )}
        </div>

        {/* Shutter Button */}
        <button
          onClick={capturePhoto}
          disabled={permissionDenied}
          className="group relative flex h-[72px] w-[72px] items-center justify-center rounded-full border-[3px] border-white/60 bg-transparent transition-transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
        >
          <div className="h-[58px] w-[58px] rounded-full bg-white transition-all duration-200 group-hover:bg-slate-200 group-active:h-[48px] group-active:w-[48px] shadow-[0_0_20px_rgba(255,255,255,0.3)]" />
        </button>

        {/* Switch Camera */}
        <div className="flex h-14 w-14 items-center justify-center">
          <button
            onClick={toggleCamera}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 border border-white/5 hover:bg-white/20 transition-all hover:scale-110 active:scale-95 text-white"
          >
            <SwitchCamera className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Hidden Canvas for capturing */}
      <canvas ref={canvasRef} className="hidden" />
    </main>
  );
}

// Utility for conditional classes
function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(" ");
}
