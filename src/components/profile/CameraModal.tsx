"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  onCapture: (dataUrl: string) => void;
  onClose: () => void;
}

export default function CameraModal({ onCapture, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const videoCallbackRef = useCallback((node: HTMLVideoElement | null) => {
    videoRef.current = node;
    if (node && streamRef.current) {
      node.srcObject = streamRef.current;
    }
  }, []);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [captured, setCaptured] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "user", width: 512, height: 512 } })
      .then((s) => {
        streamRef.current = s;
        setStream(s);
        if (videoRef.current) {
          videoRef.current.srcObject = s;
        }
      })
      .catch(() => setError("Impossible d'accéder à la caméra"));

    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const handleCapture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const size = 256;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Crop to square (center)
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const side = Math.min(vw, vh);
    const sx = (vw - side) / 2;
    const sy = (vh - side) / 2;

    // Flip horizontally for front camera (mirror effect)
    ctx.translate(size, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, sx, sy, side, side, 0, 0, size, size);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
    setCaptured(dataUrl);
  };

  const handleRetake = () => {
    setCaptured(null);
  };

  const handleConfirm = () => {
    if (captured) {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      onCapture(captured);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="glass-strong w-full max-w-sm rounded-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <h2 className="font-bold text-white/90">📸 Photo de profil</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white/70 transition-colors text-xl">✕</button>
        </div>

        <div className="p-4 space-y-4">
          {error && (
            <p className="text-red-300 text-sm text-center">{error}</p>
          )}

          {!error && (
            <div className="relative aspect-square rounded-xl overflow-hidden bg-black">
              <AnimatePresence mode="wait">
                {!captured ? (
                  <motion.div key="video" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full h-full">
                    <video
                      ref={videoCallbackRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover scale-x-[-1]"
                    />
                    {/* Oval guide */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-3/4 h-3/4 rounded-full border-2 border-white/40 border-dashed" />
                    </div>
                  </motion.div>
                ) : (
                  <motion.div key="preview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full h-full">
                    <img src={captured} alt="Aperçu" className="w-full h-full object-cover rounded-xl" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          <canvas ref={canvasRef} className="hidden" />

          <div className="flex gap-3">
            {!captured ? (
              <button
                onClick={handleCapture}
                disabled={!!error}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-600 text-white font-bold hover:opacity-90 disabled:opacity-40 transition-opacity"
              >
                📸 Prendre la photo
              </button>
            ) : (
              <>
                <button
                  onClick={handleRetake}
                  className="flex-1 py-3 rounded-xl bg-white/10 text-white/70 font-medium hover:bg-white/15 transition-colors"
                >
                  Reprendre
                </button>
                <button
                  onClick={handleConfirm}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold hover:opacity-90 transition-opacity"
                >
                  Confirmer ✓
                </button>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
