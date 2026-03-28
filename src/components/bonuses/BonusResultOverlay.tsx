"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { BonusType } from "@/types";

interface BonusResultOverlayProps {
  bonusType: BonusType;
  data: any;
  expiresAt: string;
  onClose: () => void;
}

export default function BonusResultOverlay({
  bonusType,
  data,
  expiresAt,
  onClose,
}: BonusResultOverlayProps) {
  const [secondsLeft, setSecondsLeft] = useState(() => {
    return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 1000));
  });
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining <= 0) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        onCloseRef.current();
      }
    }, 200); // Update more frequently for smoother countdown

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [expiresAt]);

  const isExpired = secondsLeft <= 0;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="glass-strong p-6 w-full max-w-sm space-y-4"
        >
          {/* Timer */}
          <div className="text-center">
            <span className="text-xs text-white/40">Disparaît dans</span>
            <p className={`text-2xl font-mono font-bold ${secondsLeft <= 5 ? "text-red-400 animate-pulse" : "text-cyan-400"}`}>
              {secondsLeft}s
            </p>
          </div>

          {/* Content based on bonus type */}
          {bonusType === "CLASSEMENT" && (
            <div>
              <h3 className="text-lg font-bold text-white/90 text-center mb-3">🏅 Classement</h3>
              <div className="space-y-1.5 max-h-72 overflow-y-auto">
                {(data as { rank: number; username: string }[]).map((entry) => (
                  <div
                    key={entry.rank}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg ${
                      entry.rank <= 3 ? "bg-yellow-500/10 border border-yellow-500/20" : "bg-white/5"
                    }`}
                  >
                    <span
                      className={`text-lg font-bold w-8 text-center ${
                        entry.rank === 1
                          ? "text-yellow-400"
                          : entry.rank === 2
                          ? "text-gray-300"
                          : entry.rank === 3
                          ? "text-amber-600"
                          : "text-white/40"
                      }`}
                    >
                      {entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : entry.rank === 3 ? "🥉" : `${entry.rank}.`}
                    </span>
                    <span className="text-white/80 font-medium">{entry.username}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {bonusType === "SOLDE_MAX" && (
            <div className="text-center">
              <h3 className="text-lg font-bold text-white/90 mb-2">💎 Solde Maximum</h3>
              <p className="text-xs text-white/40 mb-4">Le joueur le plus riche possède</p>
              <p className="text-5xl font-bold gradient-text">{data.maxBalance} T$</p>
            </div>
          )}

          {bonusType === "SOLDE_MOYEN" && (
            <div className="text-center">
              <h3 className="text-lg font-bold text-white/90 mb-2">📊 Solde Moyen</h3>
              <p className="text-xs text-white/40 mb-4">Moyenne des soldes de tous les joueurs</p>
              <p className="text-5xl font-bold gradient-text">{data.averageBalance} T$</p>
            </div>
          )}

          {bonusType === "JACKPOT" && (
            <div className="text-center space-y-3">
              <h3 className="text-lg font-bold text-white/90">🎰 Jackpot !</h3>
              <p className={`text-5xl font-bold ${data.amount >= 0 ? "text-green-400" : "text-red-400"}`}>
                {data.amount >= 0 ? "+" : ""}{data.amount} T$
              </p>
              <p className="text-sm text-white/50">
                {data.percentage >= 0 ? "+" : ""}{data.percentage}% de votre solde
              </p>
              <p className="text-xs text-white/30">
                {data.amount >= 0 ? "Vous avez de la chance !" : "Pas de chance cette fois..."}
              </p>
            </div>
          )}

          <button
            onClick={onClose}
            className="w-full py-2 rounded-xl bg-white/5 border border-white/10 text-white/60 text-sm hover:bg-white/10 transition-colors"
          >
            Fermer
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
