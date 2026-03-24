"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import AuthGuard from "@/components/layout/AuthGuard";
import Navbar from "@/components/layout/Navbar";
import { motion, AnimatePresence } from "framer-motion";
import { getInitials, getAvatarColor, formatTD } from "@/lib/utils";
import type { User, Duel } from "@/types";

export default function AdminPage() {
  const { token } = useAuth();
  const { addToast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [duels, setDuels] = useState<Duel[]>([]);
  const [tab, setTab] = useState<"players" | "duels">("players");
  const [loading, setLoading] = useState(true);

  // Credit/debit modal
  const [modalUser, setModalUser] = useState<User | null>(null);
  const [modalAmount, setModalAmount] = useState(10);
  const [modalReason, setModalReason] = useState("");
  const [acting, setActing] = useState(false);

  const fetchData = () => {
    if (!token) return;
    Promise.all([
      fetch("/api/admin/users", { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
      fetch("/api/admin/duels", { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
    ])
      .then(([uData, dData]) => {
        setUsers(uData.users || []);
        setDuels(dData.duels || []);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCreditDebit = async (amount: number) => {
    if (!modalUser) return;
    setActing(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId: modalUser.id,
          amount,
          reason: modalReason || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      addToast(`${amount > 0 ? "Crédité" : "Débité"} ${Math.abs(amount)} T$ à ${modalUser.username}`, "success");
      setModalUser(null);
      setModalAmount(10);
      setModalReason("");
      fetchData();
    } catch (err: any) {
      addToast(err.message || "Erreur", "error");
    } finally {
      setActing(false);
    }
  };

  const handleReset = async () => {
    if (!confirm("Réinitialiser TOUS les soldes à 50 T$ et annuler les duels actifs?")) return;
    try {
      const res = await fetch("/api/admin/reset", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Erreur");
      addToast("Tous les soldes ont été réinitialisés", "success");
      fetchData();
    } catch {
      addToast("Erreur de réinitialisation", "error");
    }
  };

  const totalBalance = users.reduce((s, u) => s + u.balance, 0);

  const STATUS_COLORS: Record<string, string> = {
    PENDING: "text-yellow-400",
    ACTIVE: "text-blue-400",
    COMPLETED: "text-green-400",
    CANCELLED: "text-red-400",
  };

  return (
    <AuthGuard requireAdmin>
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold text-white/90 mb-2">Panel Admin — Banque</h1>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="glass p-4 text-center">
              <p className="text-2xl font-bold text-cyan-400">{users.length}</p>
              <p className="text-xs text-white/40">Joueurs</p>
            </div>
            <div className="glass p-4 text-center">
              <p className="text-2xl font-bold text-purple-400">{formatTD(totalBalance)}</p>
              <p className="text-xs text-white/40">Total en jeu</p>
            </div>
            <div className="glass p-4 text-center">
              <p className="text-2xl font-bold text-pink-400">
                {duels.filter((d) => d.status === "ACTIVE" || d.status === "PENDING").length}
              </p>
              <p className="text-xs text-white/40">Duels actifs</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setTab("players")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === "players"
                  ? "bg-purple-500/20 border border-purple-500/40 text-purple-300"
                  : "bg-white/5 text-white/50 hover:bg-white/10"
              }`}
            >
              Joueurs
            </button>
            <button
              onClick={() => setTab("duels")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === "duels"
                  ? "bg-purple-500/20 border border-purple-500/40 text-purple-300"
                  : "bg-white/5 text-white/50 hover:bg-white/10"
              }`}
            >
              Duels
            </button>
            <button
              onClick={handleReset}
              className="ml-auto px-4 py-2 rounded-lg text-sm font-medium bg-red-500/10 border border-red-500/30 text-red-300 hover:bg-red-500/20 transition-all"
            >
              Reset tout
            </button>
          </div>

          {/* Players tab */}
          {tab === "players" && (
            <div className="space-y-2">
              {loading ? (
                <div className="animate-pulse space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 bg-white/5 rounded-xl" />
                  ))}
                </div>
              ) : (
                users.map((u) => (
                  <motion.div
                    key={u.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="glass flex items-center justify-between px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-full bg-gradient-to-br ${getAvatarColor(
                          u.username
                        )} flex items-center justify-center text-sm font-bold text-white`}
                      >
                        {getInitials(u.username)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white/90">{u.username}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-cyan-400">{u.balance} T$</span>
                      <button
                        onClick={() => {
                          setModalUser(u);
                          setModalAmount(10);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-purple-500/20 border border-purple-500/30 text-purple-300 text-sm hover:bg-purple-500/30 transition-all"
                      >
                        Gérer
                      </button>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          )}

          {/* Duels tab */}
          {tab === "duels" && (
            <div className="space-y-2">
              {duels.length === 0 ? (
                <p className="text-white/40 text-center py-8">Aucun duel</p>
              ) : (
                duels.map((d) => (
                  <div key={d.id} className="glass px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm text-white/80">
                        {d.challenger.username} vs {d.opponent.username}
                      </p>
                      <p className="text-xs text-white/40">
                        {new Date(d.createdAt).toLocaleString("fr-FR")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-cyan-400">{d.betAmount} T$</p>
                      <p className={`text-xs ${STATUS_COLORS[d.status]}`}>{d.status}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </motion.div>

        {/* Credit/Debit Modal */}
        <AnimatePresence>
          {modalUser && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
              onClick={() => setModalUser(null)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="glass-strong p-6 w-full max-w-sm space-y-4"
              >
                <h3 className="text-lg font-bold text-white/90">
                  Gérer — {modalUser.username}
                </h3>
                <p className="text-sm text-white/50">
                  Solde actuel: <span className="text-cyan-400 font-bold">{modalUser.balance} T$</span>
                </p>

                <div>
                  <label className="text-sm text-white/60">Montant</label>
                  <input
                    type="number"
                    value={modalAmount}
                    onChange={(e) => setModalAmount(Number(e.target.value))}
                    min={1}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500/50 mt-1"
                  />
                </div>

                <div>
                  <label className="text-sm text-white/60">Raison (optionnel)</label>
                  <input
                    type="text"
                    value={modalReason}
                    onChange={(e) => setModalReason(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500/50 mt-1"
                    placeholder="Ex: Enchère gagnée"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => handleCreditDebit(modalAmount)}
                    disabled={acting}
                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold hover:opacity-90 disabled:opacity-50"
                  >
                    + Créditer
                  </button>
                  <button
                    onClick={() => handleCreditDebit(-modalAmount)}
                    disabled={acting || modalAmount > modalUser.balance}
                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-red-600 to-pink-600 text-white font-bold hover:opacity-90 disabled:opacity-50"
                  >
                    - Débiter
                  </button>
                </div>

                <button
                  onClick={() => setModalUser(null)}
                  className="w-full py-2 text-sm text-white/40 hover:text-white/60 transition-colors"
                >
                  Annuler
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </AuthGuard>
  );
}
