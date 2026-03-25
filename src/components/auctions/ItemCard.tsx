"use client";

import { motion } from "framer-motion";
import type { AuctionItem } from "@/types";

interface ItemCardProps {
  item: AuctionItem;
  bidAmount: number;
  onBidChange: (amount: number) => void;
  disabled: boolean;
  phaseStatus: string;
  currentUserId?: string;
}

export default function ItemCard({ item, bidAmount, onBidChange, disabled, phaseStatus, currentUserId }: ItemCardProps) {
  const isMysteryCurrent = item.isMystery && phaseStatus !== "FINISHED";
  const isWinner = phaseStatus === "FINISHED" && item.winnerId === currentUserId;
  const hasWinner = phaseStatus === "FINISHED" && item.winnerId;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`glass p-4 border ${
        isMysteryCurrent
          ? "border-purple-500/30 bg-gradient-to-br from-purple-900/20 to-violet-900/20"
          : isWinner
          ? "border-yellow-500/40 bg-gradient-to-br from-yellow-900/20 to-amber-900/20"
          : "border-white/10"
      }`}
    >
      <div className="text-center mb-3">
        <span className="text-3xl">{isMysteryCurrent ? "🎁" : "🎀"}</span>
        <h4 className={`text-sm font-bold mt-1 ${isMysteryCurrent ? "text-purple-300" : "text-white/90"}`}>
          {isMysteryCurrent ? item.displayName : item.name}
        </h4>
        {isMysteryCurrent && (
          <p className="text-[10px] text-purple-400/60 mt-0.5">Révélé à la fin</p>
        )}
      </div>

      {phaseStatus === "ACTIVE" && !disabled && (
        <div className="space-y-2">
          <input
            type="number"
            min={0}
            value={bidAmount}
            onChange={(e) => onBidChange(Math.max(0, parseInt(e.target.value) || 0))}
            className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-center text-lg font-bold focus:outline-none focus:border-cyan-500/50"
            placeholder="0"
          />
          <p className="text-[10px] text-white/30 text-center">T$</p>
        </div>
      )}

      {phaseStatus === "ACTIVE" && disabled && (
        <div className="text-center">
          {item.bids && item.bids.length > 0 ? (
            <p className="text-sm text-cyan-400 font-bold">{item.bids[0].amount} T$</p>
          ) : (
            <p className="text-sm text-white/30">Pas de mise</p>
          )}
          <p className="text-[10px] text-white/40 mt-1">Mise validée</p>
        </div>
      )}

      {phaseStatus === "FINISHED" && (
        <div className="text-center space-y-1">
          {hasWinner ? (
            <>
              <p className={`text-sm font-bold ${isWinner ? "text-yellow-400" : "text-white/70"}`}>
                {isWinner ? "🏆 Vous avez gagné !" : `🏆 ${item.winner?.username}`}
              </p>
              <p className="text-xs text-cyan-400">{item.winningBid} T$</p>
            </>
          ) : (
            <p className="text-xs text-white/30">Aucune mise</p>
          )}
        </div>
      )}
    </motion.div>
  );
}
