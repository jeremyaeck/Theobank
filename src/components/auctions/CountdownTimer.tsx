"use client";

import { useState, useEffect } from "react";

interface CountdownTimerProps {
  endsAt: string;
  onExpired?: () => void;
}

export default function CountdownTimer({ endsAt, onExpired }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState(getTimeLeft(endsAt));

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = getTimeLeft(endsAt);
      setTimeLeft(remaining);
      if (remaining.total <= 0) {
        clearInterval(interval);
        onExpired?.();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [endsAt, onExpired]);

  const isUrgent = timeLeft.total <= 60000 && timeLeft.total > 0;
  const isExpired = timeLeft.total <= 0;

  if (isExpired) {
    return (
      <div className="text-center">
        <p className="text-2xl font-bold text-red-400">Temps écoulé</p>
      </div>
    );
  }

  return (
    <div className={`text-center ${isUrgent ? "animate-pulse" : ""}`}>
      <p className={`text-4xl font-mono font-bold ${isUrgent ? "text-red-400" : "text-cyan-400"}`}>
        {String(timeLeft.minutes).padStart(2, "0")}:{String(timeLeft.seconds).padStart(2, "0")}
      </p>
      <p className="text-xs text-white/40 mt-1">temps restant</p>
    </div>
  );
}

function getTimeLeft(endsAt: string) {
  const total = Math.max(0, new Date(endsAt).getTime() - Date.now());
  const minutes = Math.floor(total / 60000);
  const seconds = Math.floor((total % 60000) / 1000);
  return { total, minutes, seconds };
}
