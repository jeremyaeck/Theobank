"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import AuthGuard from "@/components/layout/AuthGuard";
import Navbar from "@/components/layout/Navbar";
import { motion } from "framer-motion";
import Link from "next/link";

interface Stats {
  gameOver: boolean;
  podium: { id: string; username: string; totalGains: number }[];
  jeuStats: { label: string; ranking: { username: string; gains: number }[] }[];
  duels: {
    mostWins: { username: string; wins: number };
    mostLosses: { username: string; losses: number };
    mostDuels: { username: string; count: number };
    biggestDuel: { challenger: string; opponent: string; betAmount: number; winner: string } | null;
    totalDuelTD: number;
    total: number;
    completed: number;
  };
  auctions: {
    mostCoveted: { name: string; total: number; count: number } | null;
    biggestBid: { username: string; amount: number; itemName: string } | null;
    top3Bids: { username: string; amount: number; itemName: string }[];
    mostBidder: { username: string; total: number };
    phases: {
      phase: number;
      status: string;
      items: {
        name: string;
        displayName: string;
        isMystery: boolean;
        winner: string | null;
        winningBid: number | null;
        totalBids: number;
        bidCount: number;
      }[];
    }[];
  };
  bonuses: {
    mostStolen: { username: string; lost: number };
    totalStolen: number;
    usageByType: Record<string, number>;
    totalUsed: number;
  };
  global: {
    totalDistributed: number;
    playerCount: number;
  };
}

const BONUS_LABELS: Record<string, string> = {
  CLASSEMENT: "Classement",
  SOLDE_MAX: "Solde max",
  SOLDE_MOYEN: "Solde moyen",
  GAIN_DOUBLE: "Gain doublé",
  VOL: "Vol",
};

const MEDALS = ["🥇", "🥈", "🥉"];

export default function StatsPage() {
  const { token, user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    fetch("/api/stats", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setStats(d);
      })
      .catch(() => setError("Erreur de chargement"))
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <AuthGuard>
      <Navbar />
      <main className="max-w-lg mx-auto px-4 py-6 space-y-6 pb-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-2">
            <Link href="/dashboard" className="text-white/40 hover:text-white/70 transition-colors">
              ← Retour
            </Link>
          </div>
          <h1 className="text-2xl font-black gradient-text">📊 Statistiques de la soirée</h1>
        </motion.div>

        {loading && (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 glass rounded-2xl animate-pulse" />
            ))}
          </div>
        )}

        {error && (
          <div className="glass p-6 text-center text-red-300">{error}</div>
        )}

        {!loading && !error && stats && (
          <>
            {!stats.gameOver && !user?.isAdmin && (
              <div className="glass p-4 rounded-2xl border border-amber-500/30 text-amber-200 text-sm text-center">
                ⚠️ La partie n&apos;est pas encore terminée — les stats sont provisoires
              </div>
            )}

            {/* ── Podium ── */}
            <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <h2 className="text-lg font-bold text-white/80 mb-3">🏆 Podium — Total gagné</h2>
              <div className="space-y-2">
                {stats.podium.slice(0, 3).map((p, i) => (
                  <div
                    key={p.id}
                    className={`glass flex items-center gap-4 px-5 py-4 rounded-2xl border ${
                      i === 0
                        ? "border-yellow-400/40 bg-yellow-400/5"
                        : i === 1
                        ? "border-slate-400/40 bg-slate-400/5"
                        : "border-amber-600/40 bg-amber-600/5"
                    }`}
                  >
                    <span className="text-3xl">{MEDALS[i]}</span>
                    <div className="flex-1">
                      <p className="font-bold text-white text-lg">{p.username}</p>
                    </div>
                    <span className="text-xl font-black text-cyan-400">+{p.totalGains} T$</span>
                  </div>
                ))}
                {stats.podium.length > 3 && (
                  <div className="glass px-4 py-3 rounded-2xl space-y-1">
                    {stats.podium.slice(3).map((p, i) => (
                      <div key={p.id} className="flex items-center justify-between text-sm">
                        <span className="text-white/60">{i + 4}. {p.username}</span>
                        <span className="text-cyan-400/80">+{p.totalGains} T$</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.section>

            {/* ── Jeu 1-4 ── */}
            <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <h2 className="text-lg font-bold text-white/80 mb-3">🎮 Gains par période de jeu</h2>
              <div className="grid grid-cols-2 gap-3">
                {stats.jeuStats.map((jeu) => (
                  <div key={jeu.label} className="glass p-4 rounded-2xl space-y-2">
                    <p className="font-bold text-white/90 text-sm">{jeu.label}</p>
                    {jeu.ranking.length === 0 ? (
                      <p className="text-xs text-white/30">Aucun gain</p>
                    ) : (
                      jeu.ranking.slice(0, 5).map((r, i) => (
                        <div key={r.username} className="flex items-center justify-between gap-2">
                          <span className="text-xs text-white/60 truncate">
                            {i === 0 ? "🥇 " : i === 1 ? "🥈 " : i === 2 ? "🥉 " : `${i + 1}. `}
                            {r.username}
                          </span>
                          <span className="text-xs text-cyan-400 shrink-0">+{r.gains} T$</span>
                        </div>
                      ))
                    )}
                  </div>
                ))}
              </div>
            </motion.section>

            {/* ── Duels ── */}
            <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <h2 className="text-lg font-bold text-white/80 mb-3">⚔️ Statistiques Duels</h2>
              <div className="glass p-4 rounded-2xl space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Stat label="Total duels" value={stats.duels.total} />
                  <Stat label="Duels terminés" value={stats.duels.completed} />
                  <Stat label="T$ échangés" value={`${stats.duels.totalDuelTD} T$`} />
                  <Stat label="Meilleur duelliste" value={stats.duels.mostDuels?.username || "—"} sub={`${stats.duels.mostDuels?.count || 0} duels`} />
                </div>
                <div className="border-t border-white/10 pt-3 space-y-2">
                  <StatRow icon="🏆" label="Plus de victoires" value={`${stats.duels.mostWins?.username || "—"} (${stats.duels.mostWins?.wins || 0})`} />
                  <StatRow icon="💀" label="Plus de défaites" value={`${stats.duels.mostLosses?.username || "—"} (${stats.duels.mostLosses?.losses || 0})`} />
                  {stats.duels.biggestDuel && (
                    <StatRow
                      icon="💥"
                      label="Plus gros duel"
                      value={`${stats.duels.biggestDuel.betAmount} T$ · ${stats.duels.biggestDuel.challenger} vs ${stats.duels.biggestDuel.opponent}`}
                      sub={`Gagnant : ${stats.duels.biggestDuel.winner}`}
                    />
                  )}
                </div>
              </div>
            </motion.section>

            {/* ── Enchères ── */}
            <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
              <h2 className="text-lg font-bold text-white/80 mb-3">🔨 Statistiques Enchères</h2>
              <div className="glass p-4 rounded-2xl space-y-3">
                {stats.auctions.mostCoveted && (
                  <StatRow icon="🔥" label="Objet le plus convoité" value={stats.auctions.mostCoveted.name} sub={`${stats.auctions.mostCoveted.total} T$ misés (${stats.auctions.mostCoveted.count} enchères)`} />
                )}
                {stats.auctions.mostBidder && (
                  <StatRow icon="💸" label="Plus gros enchérisseur" value={stats.auctions.mostBidder.username} sub={`${stats.auctions.mostBidder.total} T$ misés au total`} />
                )}
                {stats.auctions.biggestBid && (
                  <StatRow icon="💰" label="Plus grosse mise unique" value={`${stats.auctions.biggestBid.amount} T$ par ${stats.auctions.biggestBid.username}`} sub={stats.auctions.biggestBid.itemName} />
                )}

                {stats.auctions.top3Bids.length > 0 && (
                  <div className="border-t border-white/10 pt-3">
                    <p className="text-xs text-white/50 mb-2">Top 3 des mises</p>
                    {stats.auctions.top3Bids.map((b, i) => (
                      <div key={i} className="flex items-center justify-between text-sm py-1">
                        <span className="text-white/70">{MEDALS[i]} {b.username} — {b.itemName}</span>
                        <span className="text-cyan-400 font-bold">{b.amount} T$</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Phase results */}
                <div className="border-t border-white/10 pt-3 space-y-4">
                  <p className="text-xs text-white/50">Résultats par phase</p>
                  {stats.auctions.phases.map((p) => (
                    <div key={p.phase} className="space-y-2">
                      <p className="text-sm font-semibold text-white/80">Phase {p.phase}</p>
                      {p.items.map((item) => (
                        <div key={item.name} className="flex items-center justify-between gap-2 bg-white/5 rounded-lg px-3 py-2">
                          <div>
                            <p className="text-xs text-white/80">{item.name}</p>
                            <p className="text-[10px] text-white/40">{item.totalBids} T$ misés · {item.bidCount} enchère(s)</p>
                          </div>
                          <div className="text-right">
                            {item.winner ? (
                              <>
                                <p className="text-xs text-yellow-400 font-semibold">🏆 {item.winner}</p>
                                <p className="text-[10px] text-white/40">{item.winningBid} T$</p>
                              </>
                            ) : (
                              <p className="text-xs text-white/30">Pas de gagnant</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </motion.section>

            {/* ── Bonus ── */}
            <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <h2 className="text-lg font-bold text-white/80 mb-3">🎁 Statistiques Bonus</h2>
              <div className="glass p-4 rounded-2xl space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Stat label="Bonus utilisés" value={stats.bonuses.totalUsed} />
                  <Stat label="T$ volés total" value={`${stats.bonuses.totalStolen} T$`} />
                </div>
                {stats.bonuses.mostStolen?.lost > 0 && (
                  <StatRow icon="🥷" label="Joueur le plus volé" value={stats.bonuses.mostStolen.username} sub={`${stats.bonuses.mostStolen.lost} T$ perdus`} />
                )}
                <div className="border-t border-white/10 pt-3">
                  <p className="text-xs text-white/50 mb-2">Utilisation par type</p>
                  {Object.entries(stats.bonuses.usageByType).map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between text-sm py-0.5">
                      <span className="text-white/60">{BONUS_LABELS[type] || type}</span>
                      <span className="text-white/80">{count}x</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.section>

            {/* ── Global ── */}
            <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
              <h2 className="text-lg font-bold text-white/80 mb-3">🌍 Statistiques globales</h2>
              <div className="glass p-4 rounded-2xl">
                <div className="grid grid-cols-2 gap-3">
                  <Stat label="Joueurs" value={stats.global.playerCount} />
                  <Stat label="T$ distribués par la Banque" value={`${stats.global.totalDistributed} T$`} />
                </div>
              </div>
            </motion.section>
          </>
        )}
      </main>
    </AuthGuard>
  );
}

function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white/5 rounded-xl p-3 text-center">
      <p className="text-lg font-bold text-cyan-400">{value}</p>
      <p className="text-[10px] text-white/40 mt-0.5">{label}</p>
      {sub && <p className="text-[10px] text-white/30">{sub}</p>}
    </div>
  );
}

function StatRow({ icon, label, value, sub }: { icon: string; label: string; value: string; sub?: string }) {
  return (
    <div className="flex items-start gap-3 py-1">
      <span className="text-lg shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-white/40">{label}</p>
        <p className="text-sm text-white/80 font-medium">{value}</p>
        {sub && <p className="text-xs text-white/40">{sub}</p>}
      </div>
    </div>
  );
}
