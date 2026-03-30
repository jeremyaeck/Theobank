"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { WheelSegment } from "@/types";

const STOP_DURATION_MS = 8000;
const FREE_SPIN_SPEED = 400; // degrees per second

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
  const [phase, setPhase] = useState<"idle" | "spinning" | "stopping" | "result">("idle");
  const [showResult, setShowResult] = useState(false);
  const wheelRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number | null>(null);
  const currentRotationRef = useRef(0);

  const segment = WHEEL_SEGMENTS[segmentIndex];

  // Free spin animation loop (direct DOM manipulation for performance)
  useEffect(() => {
    if (phase !== "spinning") return;

    let startTime: number | null = null;
    const startRotation = currentRotationRef.current;

    const animate = (time: number) => {
      if (!startTime) startTime = time;
      const elapsed = (time - startTime) / 1000;
      currentRotationRef.current = startRotation + elapsed * FREE_SPIN_SPEED;
      if (wheelRef.current) {
        wheelRef.current.style.transition = "none";
        wheelRef.current.style.transform = `rotate(${currentRotationRef.current}deg)`;
      }
      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [phase]);

  // Start spinning after short delay
  useEffect(() => {
    const delay = setTimeout(() => setPhase("spinning"), 400);
    return () => clearTimeout(delay);
  }, []);

  const handleStop = useCallback(() => {
    if (phase !== "spinning") return;
    if (animRef.current) cancelAnimationFrame(animRef.current);

    const current = currentRotationRef.current;
    // The pointer is at top. Rotating clockwise by R means the segment at angle (360 - R%360) is under the pointer.
    // To land on segmentIndex center: 360 - (R%360) = (segmentIndex + 0.5) * 45
    const baseTarget = (360 - (segmentIndex + 0.5) * 45 + 360) % 360;
    const currentMod = ((current % 360) + 360) % 360;
    const diff = ((baseTarget - currentMod) + 360) % 360;

    // Use Math.floor so totalDistance ≤ idealTotal → initial CSS speed ≤ free spin speed (no acceleration)
    // Bezier ratio p1y/p1x = 2, so idealTotal = 400 * 8 / 2 = 1600°
    const BEZIER_RATIO = 2;
    const idealTotal = FREE_SPIN_SPEED * (STOP_DURATION_MS / 1000) / BEZIER_RATIO;
    const extraTurns = Math.max(2, Math.floor((idealTotal - diff) / 360));
    const target = current + diff + extraTurns * 360;

    setPhase("stopping");

    // Seamless handoff: snap to current position, force reflow, then apply deceleration
    if (wheelRef.current) {
      wheelRef.current.style.transition = "none";
      wheelRef.current.style.transform = `rotate(${current}deg)`;
      // Force reflow to flush the "none" transition before applying the new one
      wheelRef.current.offsetHeight; // eslint-disable-line @typescript-eslint/no-unused-expressions
      wheelRef.current.style.transition = `transform ${STOP_DURATION_MS}ms cubic-bezier(0.33, 0.66, 0.1, 1)`;
      wheelRef.current.style.transform = `rotate(${target}deg)`;
    }

    setTimeout(() => {
      setPhase("result");
      setShowResult(true);
    }, STOP_DURATION_MS + 500);
  }, [phase, segmentIndex]);

  // Auto-stop for spectators after 3 seconds of spinning
  useEffect(() => {
    if (!isSpectator || phase !== "spinning") return;
    const timer = setTimeout(() => handleStop(), 3000);
    return () => clearTimeout(timer);
  }, [isSpectator, phase, handleStop]);

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
                {phase === "stopping"
                  ? "La roue ralentit..."
                  : phase === "spinning"
                  ? isSpectator ? "La roue tourne..." : "Appuie pour arrêter la roue !"
                  : "Prépare-toi..."}
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
                ref={wheelRef}
                className="w-full h-full rounded-full relative overflow-hidden"
                style={{
                  background: `conic-gradient(${GRADIENT})`,
                  boxShadow: showResult
                    ? `0 0 40px ${segment.color}80`
                    : "0 0 20px rgba(0,0,0,0.5)",
                }}
              >
                {/* Segment labels */}
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

          {/* Stop button (player only, during free spin) */}
          {!isSpectator && phase === "spinning" && (
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={handleStop}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 text-white font-bold text-base hover:scale-[1.02] active:scale-[0.98] transition-transform shadow-lg"
            >
              Arrêter la roue
            </motion.button>
          )}

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

          {phase === "stopping" && (
            <p className="text-xs text-white/20">Bonne chance !</p>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
