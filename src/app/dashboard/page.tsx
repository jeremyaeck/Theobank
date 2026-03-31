"use client";

import { useEffect, useState, useCallback } from "react";
import AuthGuard from "@/components/layout/AuthGuard";
import Navbar from "@/components/layout/Navbar";
import BalanceDisplay from "@/components/dashboard/BalanceDisplay";
import ActiveDuels from "@/components/dashboard/ActiveDuels";
import TransactionList from "@/components/dashboard/TransactionList";
import TeamCard from "@/components/dashboard/TeamCard";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

interface ActiveAuction {
  id: string;
  phase: number;
  endsAt: string | null;
  itemCount: number;
}

export default function DashboardPage() {
  const { user, token } = useAuth();
  const [gameOver, setGameOver] = useState(false);
  const [activeAuction, setActiveAuction] = useState<ActiveAuction | null>(null);
  const [auctionTimeLeft, setAuctionTimeLeft] = useState("");

  const fetchAuctions = useCallback(() => {
    if (!token) return;
    fetch("/api/auctions", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => {
        const phases = d.phases || [];
        const phase4 = phases.find((p: any) => p.phase === 4);
        setGameOver(phase4?.status === "FINISHED");

        const active = phases.find((p: any) => p.status === "ACTIVE");
        if (active) {
          setActiveAuction({
            id: active.id,
            phase: active.phase,
            endsAt: active.endsAt,
            itemCount: active.items?.length || 0,
          });
        } else {
          setActiveAuction(null);
        }
      })
      .catch(() => {});
  }, [token]);

  useEffect(() => {
    fetchAuctions();
    const interval = setInterval(fetchAuctions, 5000);
    return () => clearInterval(interval);
  }, [fetchAuctions]);

  // Countdown timer for active auction
  useEffect(() => {
    if (!activeAuction?.endsAt) {
      setAuctionTimeLeft("");
      return;
    }
    const updateTimer = () => {
      const remaining = new Date(activeAuction.endsAt!).getTime() - Date.now();
      if (remaining <= 0) {
        setAuctionTimeLeft("Terminée");
        return;
      }
      const min = Math.floor(remaining / 60000);
      const sec = Math.floor((remaining % 60000) / 1000);
      setAuctionTimeLeft(`${min}:${sec.toString().padStart(2, "0")}`);
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [activeAuction?.endsAt]);

  return (
    <AuthGuard>
      <Navbar />
      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <BalanceDisplay balance={user?.balance || 0} />
        </motion.div>

        <AnimatePresence>
          {activeAuction && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: 0.12 }}
            >
              <Link
                href={`/auctions/${activeAuction.id}`}
                className="block w-full py-4 px-5 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 text-white font-bold hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-orange-500/30 border border-white/20 relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.1),transparent)] pointer-events-none" />
                <div className="flex items-center justify-between relative">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl animate-pulse">🔨</span>
                    <div>
                      <p className="text-base">Enchère Phase {activeAuction.phase} en cours !</p>
                      <p className="text-xs text-white/70 font-normal">{activeAuction.itemCount} objets disponibles</p>
                    </div>
                  </div>
                  {auctionTimeLeft && auctionTimeLeft !== "Terminée" && (
                    <div className="text-right">
                      <p className="text-xs text-white/70 font-normal">Temps restant</p>
                      <p className="text-lg font-mono font-black tabular-nums">{auctionTimeLeft}</p>
                    </div>
                  )}
                </div>
              </Link>
            </motion.div>
          )}
        </AnimatePresence>

        {gameOver && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15 }}
          >
            <Link
              href="/stats"
              className="block w-full py-5 rounded-2xl bg-gradient-to-br from-yellow-500 via-amber-500 to-orange-500 text-white text-center font-bold hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-yellow-500/30 border border-white/20"
            >
              <span className="text-2xl block mb-1">🏆</span>
              <span className="text-base">Voir les statistiques de la soirée</span>
            </Link>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex gap-3">
            <Link
              href="/duels/new"
              className={`flex-1 py-5 rounded-2xl bg-gradient-to-br from-purple-600 via-pink-600 to-cyan-600 text-white text-center font-bold transition-all shadow-lg shadow-purple-500/25 border border-white/10 ${
                gameOver ? "opacity-40 pointer-events-none" : "hover:scale-[1.02] active:scale-[0.98]"
              }`}
            >
              <span className="text-2xl block mb-1">⚔️</span>
              <span className="text-base">Défier</span>
            </Link>
            <Link
              href="/auctions"
              className="flex-1 py-5 rounded-2xl bg-gradient-to-br from-amber-600 via-orange-600 to-red-600 text-white text-center font-bold hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-orange-500/25 border border-white/10"
            >
              <span className="text-2xl block mb-1">🔨</span>
              <span className="text-base">Enchérir</span>
            </Link>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <Link
            href="/bonuses"
            className={`block w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white text-center font-bold transition-all shadow-lg shadow-emerald-500/25 border border-white/10 ${
              gameOver ? "opacity-40 pointer-events-none" : "hover:scale-[1.01] active:scale-[0.99]"
            }`}
          >
            <span className="text-xl mr-2">🎁</span>
            <span className="text-base">Bonus</span>
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28 }}
        >
          <a
            href="https://theodollars.elevate.how/"
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full py-4 rounded-2xl bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 text-white text-center font-bold hover:scale-[1.01] active:scale-[0.99] transition-all shadow-lg shadow-violet-500/25 border border-white/10"
          >
            <span className="text-xl mr-2">📸</span>
            <span className="text-base">Créer un souvenir</span>
          </a>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.29 }}
        >
          <TeamCard />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <ActiveDuels />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <TransactionList />
        </motion.div>
      </main>
    </AuthGuard>
  );
}
