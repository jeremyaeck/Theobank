"use client";

import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect } from "react";

export default function BalanceDisplay({ balance }: { balance: number }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => Math.round(v).toLocaleString("fr-FR"));

  useEffect(() => {
    const controls = animate(count, balance, {
      duration: 1.2,
      ease: "easeOut",
    });
    return controls.stop;
  }, [balance, count]);

  return (
    <div className="glass-strong p-8 text-center animate-glow">
      <p className="text-sm text-white/50 uppercase tracking-widest mb-2">Votre solde</p>
      <div className="flex items-center justify-center gap-3">
        <span className="text-6xl sm:text-7xl font-black gradient-text">
          <motion.span>{rounded}</motion.span>
        </span>
        <span className="text-3xl sm:text-4xl font-bold text-cyan-400/80">T$</span>
      </div>
      <div className="mt-4 h-1 w-32 mx-auto rounded-full bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500" />
    </div>
  );
}
