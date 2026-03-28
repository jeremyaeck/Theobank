"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";

interface ActiveBonusIndicatorProps {
  expiresAt: string;
  label: string;
  gradient: string;
}

export default function ActiveBonusIndicator({ expiresAt, label, gradient }: ActiveBonusIndicatorProps) {
  const [secondsLeft, setSecondsLeft] = useState(() =>
    Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 1000))
  );

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining <= 0) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  if (secondsLeft <= 0) return null;

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`fixed top-2 left-1/2 -translate-x-1/2 z-50 px-4 py-1.5 rounded-full bg-gradient-to-r ${gradient} shadow-lg`}
    >
      <p className="text-xs font-bold text-white flex items-center gap-1.5">
        <span>{label}</span>
        <span className="font-mono">
          {minutes}:{String(seconds).padStart(2, "0")}
        </span>
      </p>
    </motion.div>
  );
}
