"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { AuctionPhase } from "@/types";
import CountdownTimer from "./CountdownTimer";

interface PhaseCardProps {
  phase: AuctionPhase;
  index: number;
}

const STATUS_CONFIG = {
  LOCKED: { label: "Verrouillée", color: "text-white/40", bg: "bg-white/5", border: "border-white/10", icon: "🔒" },
  ACTIVE: { label: "En cours", color: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/30", icon: "🔥" },
  FINISHED: { label: "Terminée", color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/30", icon: "✅" },
};

export default function PhaseCard({ phase, index }: PhaseCardProps) {
  const config = STATUS_CONFIG[phase.status];
  const isActive = phase.status === "ACTIVE";
  const isFinished = phase.status === "FINISHED";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <Link
        href={phase.status === "LOCKED" ? "#" : `/auctions/${phase.id}`}
        className={`block glass p-5 border ${config.border} ${
          phase.status === "LOCKED" ? "opacity-50 cursor-not-allowed" : "hover:bg-white/[0.07] transition-colors"
        }`}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold text-white/90">
            {config.icon} Phase {phase.phase}
          </h3>
          <span className={`text-xs px-2 py-1 rounded-full ${config.bg} ${config.color} font-medium`}>
            {config.label}
          </span>
        </div>

        <div className="flex flex-wrap gap-2 mb-3">
          {phase.items.map((item) => (
            <span
              key={item.id}
              className={`text-xs px-2 py-1 rounded-lg ${
                item.isMystery && phase.status !== "FINISHED"
                  ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                  : "bg-white/5 text-white/60 border border-white/10"
              }`}
            >
              {item.isMystery && phase.status !== "FINISHED" ? "🎁 Mystère" : item.name}
            </span>
          ))}
        </div>

        {isActive && phase.endsAt && (
          <CountdownTimer endsAt={phase.endsAt} />
        )}

        {isFinished && (
          <p className="text-xs text-white/40">Voir les résultats →</p>
        )}
      </Link>
    </motion.div>
  );
}
