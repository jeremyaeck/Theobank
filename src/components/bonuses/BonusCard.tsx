"use client";

import { motion } from "framer-motion";
import type { BonusType } from "@/types";

interface BonusCardProps {
  type: BonusType;
  used: boolean;
  cooldownActive: boolean;
  auctionActive: boolean;
  onActivate: () => void;
  index: number;
}

const BONUS_CONFIG: Record<
  BonusType,
  { icon: string; name: string; description: string; gradient: string }
> = {
  CLASSEMENT: {
    icon: "🏅",
    name: "Classement",
    description: "Voir le classement des joueurs pendant 30s",
    gradient: "from-yellow-600 to-amber-600",
  },
  SOLDE_MAX: {
    icon: "💎",
    name: "Solde Max",
    description: "Voir le solde le plus élevé pendant 30s",
    gradient: "from-blue-600 to-cyan-600",
  },
  SOLDE_MOYEN: {
    icon: "📊",
    name: "Solde Moyen",
    description: "Voir le solde moyen pendant 30s",
    gradient: "from-green-600 to-emerald-600",
  },
  GAIN_DOUBLE: {
    icon: "✨",
    name: "Gain x2",
    description: "Virements banque doublés pendant 5 min",
    gradient: "from-purple-600 to-pink-600",
  },
  VOL: {
    icon: "🦹",
    name: "Vol",
    description: "Voler 5% du solde d'un joueur",
    gradient: "from-red-600 to-rose-600",
  },
};

export default function BonusCard({
  type,
  used,
  cooldownActive,
  auctionActive,
  onActivate,
  index,
}: BonusCardProps) {
  const config = BONUS_CONFIG[type];
  const disabled = used || cooldownActive || auctionActive;

  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      onClick={onActivate}
      disabled={disabled}
      className={`relative w-full p-4 rounded-2xl border text-left transition-all ${
        used
          ? "bg-white/5 border-white/10 opacity-50"
          : disabled
          ? "bg-white/5 border-white/10 opacity-60"
          : `bg-gradient-to-br ${config.gradient} border-transparent shadow-lg hover:scale-[1.02] active:scale-[0.98]`
      }`}
    >
      <div className="flex items-center gap-3">
        <span className="text-3xl">{config.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-white text-sm">{config.name}</p>
          <p className="text-xs text-white/70 mt-0.5">{config.description}</p>
        </div>
        {used && (
          <span className="text-xs px-2 py-1 rounded-full bg-white/10 text-white/50 font-medium shrink-0">
            Utilisé
          </span>
        )}
      </div>
      {cooldownActive && !used && (
        <p className="text-xs text-white/50 mt-2">⏳ Cooldown actif</p>
      )}
      {auctionActive && !used && !cooldownActive && (
        <p className="text-xs text-white/50 mt-2">🔒 Enchère en cours</p>
      )}
    </motion.button>
  );
}
