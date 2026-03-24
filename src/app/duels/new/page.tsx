"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import AuthGuard from "@/components/layout/AuthGuard";
import Navbar from "@/components/layout/Navbar";
import { motion } from "framer-motion";
import { getInitials, getAvatarColor } from "@/lib/utils";
import type { User } from "@/types";

export default function NewDuelPage() {
  const { user, token } = useAuth();
  const { addToast } = useToast();
  const router = useRouter();
  const [players, setPlayers] = useState<User[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<string>("");
  const [betAmount, setBetAmount] = useState<number>(5);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!token) return;
    // Fetch all players (using admin endpoint with a fallback)
    fetch("/api/duels/players", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => setPlayers(d.players || []))
      .catch(() => {});
  }, [token]);

  const filteredPlayers = players.filter(
    (p) =>
      p.id !== user?.id &&
      !p.isAdmin &&
      p.username.toLowerCase().includes(search.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlayer || !betAmount) return;

    setLoading(true);
    try {
      const res = await fetch("/api/duels", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ opponentId: selectedPlayer, betAmount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      addToast("Défi envoyé!", "success");
      router.push(`/duels/${data.duel.id}`);
    } catch (err: any) {
      addToast(err.message || "Erreur", "error");
    } finally {
      setLoading(false);
    }
  };

  const selectedInfo = players.find((p) => p.id === selectedPlayer);

  return (
    <AuthGuard>
      <Navbar />
      <main className="max-w-lg mx-auto px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-2xl font-bold text-white/90 mb-6">Nouveau duel</h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Player selection */}
            <div className="glass-strong p-5 space-y-3">
              <label className="block text-sm text-white/60">Choisir un adversaire</label>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-purple-500/50 transition-all"
                placeholder="Rechercher un joueur..."
              />
              <div className="max-h-48 overflow-y-auto space-y-1">
                {filteredPlayers.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedPlayer(p.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all ${
                      selectedPlayer === p.id
                        ? "bg-purple-500/20 border border-purple-500/40"
                        : "hover:bg-white/5"
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full bg-gradient-to-br ${getAvatarColor(
                        p.username
                      )} flex items-center justify-center text-xs font-bold text-white`}
                    >
                      {getInitials(p.username)}
                    </div>
                    <span className="text-sm text-white/80">{p.username}</span>
                    <span className="text-xs text-white/40 ml-auto">{p.balance} T$</span>
                  </button>
                ))}
                {filteredPlayers.length === 0 && (
                  <p className="text-sm text-white/40 text-center py-4">Aucun joueur trouvé</p>
                )}
              </div>
            </div>

            {/* Bet amount */}
            <div className="glass-strong p-5 space-y-3">
              <label className="block text-sm text-white/60">Montant de la mise</label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={1}
                  max={user?.balance || 50}
                  value={betAmount}
                  onChange={(e) => setBetAmount(Number(e.target.value))}
                  className="flex-1 accent-purple-500"
                />
                <div className="w-24 text-center">
                  <input
                    type="number"
                    min={1}
                    max={user?.balance || 50}
                    value={betAmount}
                    onChange={(e) => setBetAmount(Math.min(Number(e.target.value), user?.balance || 50))}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-center font-bold focus:outline-none focus:border-purple-500/50"
                  />
                </div>
                <span className="text-cyan-400 font-bold">T$</span>
              </div>
              <div className="flex justify-between text-xs text-white/40">
                <span>Min: 1 T$</span>
                <span>Max: {user?.balance || 0} T$</span>
              </div>
              {/* Quick amounts */}
              <div className="flex gap-2">
                {[5, 10, 20, 50].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    disabled={amt > (user?.balance || 0)}
                    onClick={() => setBetAmount(amt)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                      betAmount === amt
                        ? "bg-purple-500/30 border border-purple-500/50 text-purple-300"
                        : "bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 disabled:opacity-30"
                    }`}
                  >
                    {amt} T$
                  </button>
                ))}
              </div>
            </div>

            {/* Summary */}
            {selectedInfo && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass p-4 text-center"
              >
                <p className="text-white/60 text-sm">Vous défiez</p>
                <p className="text-xl font-bold text-white/90">{selectedInfo.username}</p>
                <p className="text-3xl font-black gradient-text mt-1">{betAmount} T$</p>
              </motion.div>
            )}

            <button
              type="submit"
              disabled={loading || !selectedPlayer || betAmount < 1}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-cyan-600 text-white text-lg font-bold hover:opacity-90 transition-opacity disabled:opacity-50 shadow-lg shadow-purple-500/20"
            >
              {loading ? "Envoi..." : "Envoyer le défi"}
            </button>
          </form>
        </motion.div>
      </main>
    </AuthGuard>
  );
}
