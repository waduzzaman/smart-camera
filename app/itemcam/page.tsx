"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

export default function ItemCamPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // initialize with localStorage to avoid effects that set state
  const [item, setItem] = useState(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("current_item") || "";
  });
  const [sequence, setSequence] = useState(() => {
    if (typeof window === "undefined") return 1;
    const saved = localStorage.getItem("current_item");
    return saved ? getNextSeq(saved) : 1;
  });
  const [status, setStatus] = useState("");
  const [lastImage, setLastImage] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [useBackCamera, setUseBackCamera] = useState(true);
  const [livePreviewAvailable, setLivePreviewAvailable] = useState(false);

  // ----------------------------
  // LocalStorage helpers
  // ----------------------------
  const getSeqMap = () => {
    if (typeof window === "undefined") return {};
    return JSON.parse(localStorage.getItem("seqMap") || "{}");
  };

  const setSeqMap = (map: Record<string, number>) => {
    localStorage.setItem("seqMap", JSON.stringify(map));
  };

  const getNextSeq = (item: string) => {
    const map = getSeqMap();
    return map[item] || 1;
  };

  const setSeqForItem = (item: string, n: number) => {
    if (!item) return;
    const map = getSeqMap();
    map[item] = n;
    setSeqMap(map);
  };

  // ----------------------------
  // Camera
  // ----------------------------
  const stopCamera = () => {
    stream?.getTracks().forEach((track) => track.stop());
    setStream(null);
  };

  const initCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setLivePreviewAvailable(false);
      setStatus("Live preview not supported.");
      return;
    }

    stopCamera();

    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: useBackCamera ? "environment" : "user",
          width: { ideal: 4032 },
          height: { ideal: 3024 },
        },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
        await videoRef.current.play();
      }

      setStream(newStream);
      setLivePreviewAvailable(true);
      setStatus("Live preview ready.");
    } catch {
      setLivePreviewAvailable(false);
      setStatus("Camera blocked. Use fallback.");
    }
  };

  // ----------------------------
  // Capture
  // ----------------------------
  const downloadImage = (dataUrl: string, filename: string) => {
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = filename;
    a.click();
  };

  const captureLive = () => {
    if (!videoRef.current || !canvasRef.current || !item) {
      setStatus("Enter item # first.");
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    ctx?.drawImage(video, 0, 0);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
    const filename = `${item}-${sequence}.jpg`;

    downloadImage(dataUrl, filename);
    setLastImage(dataUrl);
    setStatus(`Saved ${filename}`);

    setSeqForItem(item, sequence + 1);
    setSequence(sequence + 1);
  };

  const handleFallback = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !item) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const filename = `${item}-${sequence}.jpg`;

      downloadImage(dataUrl, filename);
      setLastImage(dataUrl);
      setStatus(`Saved ${filename}`);

      setSeqForItem(item, sequence + 1);
      setSequence(sequence + 1);
    };
    reader.readAsDataURL(file);
  };

  // ----------------------------
  // Effects
  // ----------------------------
  // When the user types a new item we update storage and sequence directly
  // (handled in onChange) so no need for effects that set state.

  // camera initialization when facing mode changes
  // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect
  useEffect(() => {
    initCamera();
    return () => stopCamera();
  }, [useBackCamera]);

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <h1 className="text-xl font-bold mb-4">ItemCam</h1>

      <div className="space-y-4 max-w-xl">
        <input
          type="text"
          placeholder="Item #"
          value={item}
          onChange={(e) => {
            const v = e.target.value;
            setItem(v);
            if (typeof window !== "undefined") {
              localStorage.setItem("current_item", v);
            }
            setSequence(getNextSeq(v));
          }}
          className="w-full p-3 bg-gray-800 rounded"
        />

        <div>Next filename: {item ? `${item}-${sequence}.jpg` : "—"}</div>

        <video ref={videoRef} className="w-full rounded bg-black" />

        <div className="flex gap-3">
          <button
            onClick={() =>
              livePreviewAvailable ? captureLive() : handleFallback()
            }
            className="bg-blue-600 px-4 py-2 rounded"
          >
            Capture
          </button>

          <button
            onClick={() => setUseBackCamera(!useBackCamera)}
            className="bg-gray-700 px-4 py-2 rounded"
          >
            Flip
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          onChange={handleFileChange}
        />

        {lastImage && (
          <div>
            <p className="mt-4">Latest Photo</p>
            <Image
              src={lastImage}
              alt="Last captured"
              width={800}
              height={600}
              className="rounded"
              unoptimized
            />
          </div>
        )}

        <canvas ref={canvasRef} hidden />
        <p className="text-sm text-gray-400">{status}</p>
      </div>
    </div>
  );
}