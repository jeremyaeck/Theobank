"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { WheelSegment } from "@/types";

const SPIN_DURATION_MS = 5000;

export const WHEEL_SEGMENTS: WheelSegment[] = [
  { type: "JACKPOT",     emoji: "🤑", name: "Jackpot !",  description: "+40% de ton solde", color: "#F59E0B" },
  { type: "GAIN",        emoji: "💸", name: "Gain",        description: "+20% de ton solde", color: "#10B981" },
  { type: "VOL_RANDOM",  emoji: "🦹", name: "Vol",         description: "10% volé à un joueur aléatoire", color: "#8B5CF6" },
  { type: "PLUIE",       emoji: "💰", name: "Pluie",       description: "+25% de ton solde", color: "#06B6D4" },
  { type: "RIEN",        emoji: "😐", name: "Rien",        description: "Pas de chance...", color: "#6B7280" },
  { type: "MALUS",       emoji: "💀", name: "Malus",       description: "-15% de ton solde", color: "#EF4444" },
  { type: "RUINE",       emoji: "🔥", name: "Ruine",       description: "-20% redistribué à un autre joueur", color: "#DC2626" },
  { type: "JACKPOT_INV", emoji: "☠️", name: "Jackpot -",  description: "-35% de ton solde", color: "#7F1D1D" },
];

const GRADIENT = WHEEL_SEGMENTS.map((seg, i) => `${seg.color} ${i * 45}deg ${(i + 1) * 45}deg`).join(", ");

interface WheelModalProps {
  segmentIndex: number;
  amount: number;
  targetUsername?: string;
  spinnerUsername?: string;
  isSpectator?: boolean;
  onClose: () => void;
}

export default function WheelModal({
  segmentIndex,
  amount,
  targetUsername,
  spinnerUsername,
  isSpectator = false,
  onClose,
}: WheelModalProps) {
  const [rotation, setRotation] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showResult, setShowResult] = useState(false);

  const segment = WHEEL_SEGMENTS[segmentIndex];

  useEffect(() => {
    const targetRotation = 6 * 360 + (segmentIndex + 0.5) * 45;
    const delay = setTimeout(() => {
      setIsAnimating(true);
      setRotation(targetRotation);
      setTimeout(() => {
        setIsAnimating(false);
        setShowResult(true);
      }, SPIN_DURATION_MS + 300);
    }, 400);
    return () => clearTimeout(delay);
  }, [segmentIndex]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4"
        onClick={showResult ? onClose : undefined}
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="glass-strong p-6 w-full max-w-sm space-y-5 text-center"
        >
          <div>
            <h2 className="text-xl font-bold text-white/90">
              {isSpectator ? `🎡 ${spinnerUsername} lance la roue !` : "🎡 Roue du Destin"}
            </h2>
            {!showResult && (
              <p className="text-xs text-white/40 mt-1">
                {isAnimating ? "La roue tourne..." : "Prépare-toi..."}
              </p>
            )}
          </div>

          {/* Wheel */}
          <div className="relative flex items-center justify-center">
            {/* Pointer */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10 text-2xl drop-shadow-lg">▼</div>

            <div className="relative w-64 h-64">
              {/* Rotating wheel */}
              <div
                className="w-full h-full rounded-full relative overflow-hidden"
                style={{
                  background: `conic-gradient(${GRADIENT})`,
                  transform: `rotate(${rotation}deg)`,
                  transition: isAnimating
                    ? `transform ${SPIN_DURATION_MS}ms cubic-bezier(0.12, 0.8, 0.2, 1)`
                    : "none",
                  boxShadow: showResult
                    ? `0 0 40px ${segment.color}80`
                    : "0 0 20px rgba(0,0,0,0.5)",
                }}
              >
                {/* Segment labels (rotate with wheel) */}
                {WHEEL_SEGMENTS.map((seg, i) => {
                  const angleDeg = (i + 0.5) * 45;
                  const x = 50 + 35 * Math.sin((angleDeg * Math.PI) / 180);
                  const y = 50 - 35 * Math.cos((angleDeg * Math.PI) / 180);
                  return (
                    <div
                      key={i}
                      className="absolute pointer-events-none select-none"
                      style={{ left: `${x}%`, top: `${y}%`, transform: "translate(-50%, -50%)" }}
                    >
                      <div style={{ fontSize: 18, lineHeight: 1 }}>{seg.emoji}</div>
                    </div>
                  );
                })}

                {/* Segment separators */}
                {WHEEL_SEGMENTS.map((_, i) => (
                  <div
                    key={i}
                    className="absolute inset-0 origin-center"
                    style={{
                      transform: `rotate(${i * 45}deg)`,
                      borderLeft: "1px solid rgba(0,0,0,0.3)",
                      width: "50%",
                      left: "50%",
                    }}
                  />
                ))}
              </div>

              {/* Center hub */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-10 h-10 rounded-full bg-gray-900 border-4 border-white/20 shadow-lg z-10" />
              </div>
            </div>
          </div>

          {/* Result */}
          <AnimatePresence>
            {showResult && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className="space-y-2"
              >
                <div
                  className="rounded-2xl p-4 space-y-1"
                  style={{ backgroundColor: `${segment.color}20`, border: `1px solid ${segment.color}50` }}
                >
                  <p className="text-2xl font-black text-white">
                    {segment.emoji} {segment.name}
                  </p>
                  <p className="text-sm text-white/70">{segment.description}</p>
                  {amount !== 0 && (
                    <p className={`text-3xl font-black mt-2 ${amount > 0 ? "text-green-400" : "text-red-400"}`}>
                      {amount > 0 ? "+" : ""}{amount} T$
                    </p>
                  )}
                  {targetUsername && (
                    <p className="text-xs text-white/50 mt-1">
                      {segment.type === "VOL_RANDOM" ? `Volé à : ${targetUsername}` : `Redistribué à : ${targetUsername}`}
                    </p>
                  )}
                </div>
                <button
                  onClick={onClose}
                  className="w-full py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/60 text-sm hover:bg-white/10 transition-colors"
                >
                  Fermer
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {!showResult && (
            <p className="text-xs text-white/20">
              {isSpectator ? "Regardez la roue tourner..." : "Bonne chance !"}
            </p>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
