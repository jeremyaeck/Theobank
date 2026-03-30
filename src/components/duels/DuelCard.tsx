"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { Duel } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { getInitials, getAvatarColor } from "@/lib/utils";

const STATUS_STYLES: Record<string, { label: string; color: string }> = {
  PENDING: { label: "En attente", color: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30" },
  ACTIVE: { label: "En cours", color: "bg-blue-500/20 text-blue-300 border-blue-500/30" },
  COMPLETED: { label: "Terminé", color: "bg-green-500/20 text-green-300 border-green-500/30" },
  CANCELLED: { label: "Annulé", color: "bg-red-500/20 text-red-300 border-red-500/30" },
};

function Avatar({ name }: { name: string }) {
  return (
    <div
      className={`w-10 h-10 rounded-full bg-gradient-to-br ${getAvatarColor(name)} flex items-center justify-center text-sm font-bold text-white`}
    >
      {getInitials(name)}
    </div>
  );
}

export default function DuelCard({ duel }: { duel: Duel }) {
  const { user } = useAuth();
  const status = STATUS_STYLES[duel.status];
  const isChallenger = user?.id === duel.challengerId;
  const opponent = isChallenger ? duel.opponent : duel.challenger;
  const role = isChallenger ? "Challenger" : "Défié";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass gradient-border p-4 hover:bg-white/[0.07] transition-colors"
    >
      <Link href={`/duels/${duel.id}`} className="block">
        <div className="flex items-center justify-between mb-3">
          <span className={`text-xs px-2 py-1 rounded-full border ${status.color}`}>
            {status.label}
          </span>
          <span className="text-xs text-white/40">{role}</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar name={opponent.username} />
            <div>
              <p className="font-medium text-white/90">vs {opponent.username}</p>
              <p className="text-xs text-white/40">
                {new Date(duel.createdAt).toLocaleString("fr-FR", {
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>

          <div className="text-right">
            <p className="text-xl font-bold text-cyan-400">{duel.betAmount} T$</p>
            {duel.winnerId && (
              <p className={`text-xs ${duel.winnerId === user?.id ? "text-green-400" : "text-red-400"}`}>
                {duel.winnerId === user?.id ? "Gagné !" : "Perdu"}
              </p>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
