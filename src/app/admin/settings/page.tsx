"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import AuthGuard from "@/components/layout/AuthGuard";
import Navbar from "@/components/layout/Navbar";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { motion } from "framer-motion";

interface ItemConfig {
  name: string;
  displayName: string;
  isMystery: boolean;
  position: number;
}

interface PhaseConfig {
  phase: number;
  status: string;
  items: ItemConfig[];
}

function emptyItem(position: number): ItemConfig {
  return { name: "", displayName: "Cadeau mystère", isMystery: false, position };
}

export default function AdminSettingsPage() {
  const { token } = useAuth();
  const { addToast } = useToast();
  const [resetting, setResetting] = useState(false);
  const [phases, setPhases] = useState<PhaseConfig[]>([]);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetch("/api/admin/auctions/config", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.phases) {
          setPhases(
            d.phases.map((p: any) => ({
              phase: p.phase,
              status: p.status,
              items: p.items.map((i: any) => ({
                name: i.name,
                displayName: i.displayName,
                isMystery: i.isMystery,
                position: i.position,
              })),
            }))
          );
        }
      })
      .finally(() => setLoadingConfig(false));
  }, [token]);

  const handleReset = async () => {
    if (!confirm("Réinitialiser TOUS les soldes à 50 T$ et annuler les duels actifs/en attente ?")) return;
    setResetting(true);
    try {
      const res = await fetch("/api/admin/reset", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Erreur");
      addToast("Tous les soldes ont été réinitialisés", "success");
    } catch {
      addToast("Erreur de réinitialisation", "error");
    } finally {
      setResetting(false);
    }
  };

  const handleSaveConfig = async () => {
    setSavingConfig(true);
    try {
      const res = await fetch("/api/admin/auctions/config", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ phases }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.warnings?.length) {
        data.warnings.forEach((w: string) => addToast(w, "error"));
      } else {
        addToast("Configuration sauvegardée", "success");
      }
    } catch (e: any) {
      addToast(e.message || "Erreur", "error");
    } finally {
      setSavingConfig(false);
    }
  };

  const addPhase = () => {
    const nextNum = phases.length > 0 ? Math.max(...phases.map((p) => p.phase)) + 1 : 1;
    setPhases((prev) => [
      ...prev,
      { phase: nextNum, status: "LOCKED", items: [emptyItem(1)] },
    ]);
  };

  const removePhase = (phaseNum: number) => {
    setPhases((prev) => prev.filter((p) => p.phase !== phaseNum));
  };

  const addItem = (phaseNum: number) => {
    setPhases((prev) =>
      prev.map((p) => {
        if (p.phase !== phaseNum) return p;
        const nextPos = p.items.length > 0 ? Math.max(...p.items.map((i) => i.position)) + 1 : 1;
        return { ...p, items: [...p.items, emptyItem(nextPos)] };
      })
    );
  };

  const removeItem = (phaseNum: number, position: number) => {
    setPhases((prev) =>
      prev.map((p) => {
        if (p.phase !== phaseNum) return p;
        const filtered = p.items.filter((i) => i.position !== position);
        // Re-number positions
        return { ...p, items: filtered.map((i, idx) => ({ ...i, position: idx + 1 })) };
      })
    );
  };

  const updateItem = (phaseNum: number, position: number, field: keyof ItemConfig, value: any) => {
    setPhases((prev) =>
      prev.map((p) => {
        if (p.phase !== phaseNum) return p;
        return {
          ...p,
          items: p.items.map((i) =>
            i.position === position ? { ...i, [field]: value } : i
          ),
        };
      })
    );
  };

  return (
    <AuthGuard requireAdmin>
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-white/90">Settings Admin</h1>
            <Link
              href="/admin"
              className="px-3 py-2 rounded-lg text-sm bg-white/5 border border-white/10 text-white/70 hover:bg-white/10"
            >
              ← Retour Admin
            </Link>
          </div>

          {/* Auction config */}
          <div className="glass p-4 space-y-4">
            <p className="text-sm font-medium text-white/80">🎁 Configuration des enchères</p>
            <p className="text-xs text-white/40">
              Seules les phases verrouillées (🔒) peuvent être modifiées. Les phases actives ou terminées sont en lecture seule.
            </p>

            {loadingConfig ? (
              <div className="h-20 bg-white/5 rounded-xl animate-pulse" />
            ) : (
              <div className="space-y-4">
                {phases.map((phase) => {
                  const isLocked = phase.status === "LOCKED";
                  return (
                    <div
                      key={phase.phase}
                      className={`rounded-xl border p-4 space-y-3 ${
                        isLocked ? "border-white/10 bg-white/3" : "border-white/5 opacity-60"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-white/80 text-sm">
                          {isLocked ? "🔒" : phase.status === "ACTIVE" ? "🔥" : "✅"} Phase {phase.phase}
                        </span>
                        {isLocked && (
                          <button
                            onClick={() => removePhase(phase.phase)}
                            className="text-xs px-2 py-1 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 hover:bg-red-500/20 transition-colors"
                          >
                            Supprimer
                          </button>
                        )}
                        {!isLocked && (
                          <span className="text-xs text-white/30">non modifiable</span>
                        )}
                      </div>

                      <div className="space-y-2">
                        {phase.items.map((item) => (
                          <div key={item.position} className="space-y-1.5">
                            <div className="flex gap-2 items-center">
                              <span className="text-xs text-white/30 w-5 text-right shrink-0">
                                {item.position}.
                              </span>
                              <input
                                type="text"
                                value={item.name}
                                onChange={(e) => updateItem(phase.phase, item.position, "name", e.target.value)}
                                disabled={!isLocked}
                                placeholder="Nom du cadeau"
                                className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder-white/20 focus:outline-none focus:border-purple-500/40 disabled:opacity-40"
                              />
                              <label className="flex items-center gap-1.5 shrink-0">
                                <input
                                  type="checkbox"
                                  checked={item.isMystery}
                                  onChange={(e) => updateItem(phase.phase, item.position, "isMystery", e.target.checked)}
                                  disabled={!isLocked}
                                  className="accent-purple-500"
                                />
                                <span className="text-xs text-white/50">Mystère</span>
                              </label>
                              {isLocked && (
                                <button
                                  onClick={() => removeItem(phase.phase, item.position)}
                                  disabled={phase.items.length <= 1}
                                  className="text-white/30 hover:text-red-300 transition-colors disabled:opacity-20 text-lg leading-none shrink-0"
                                >
                                  ×
                                </button>
                              )}
                            </div>
                            {item.isMystery && isLocked && (
                              <div className="flex gap-2 items-center pl-7">
                                <input
                                  type="text"
                                  value={item.displayName}
                                  onChange={(e) => updateItem(phase.phase, item.position, "displayName", e.target.value)}
                                  placeholder="Nom affiché pendant l'enchère"
                                  className="flex-1 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/70 text-xs placeholder-white/20 focus:outline-none focus:border-purple-500/40"
                                />
                                <span className="text-xs text-white/30 shrink-0">affiché joueurs</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      {isLocked && (
                        <button
                          onClick={() => addItem(phase.phase)}
                          className="text-xs text-cyan-400/70 hover:text-cyan-400 transition-colors"
                        >
                          + Ajouter un cadeau
                        </button>
                      )}
                    </div>
                  );
                })}

                <button
                  onClick={addPhase}
                  className="w-full py-2.5 rounded-xl border border-dashed border-white/20 text-white/50 hover:border-white/40 hover:text-white/70 text-sm transition-all"
                >
                  + Ajouter une phase
                </button>

                <button
                  onClick={handleSaveConfig}
                  disabled={savingConfig}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-600 text-white font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  {savingConfig ? "Sauvegarde..." : "Sauvegarder la configuration"}
                </button>
              </div>
            )}
          </div>

          {/* Danger zone */}
          <div className="glass p-4 space-y-3 border border-red-500/20">
            <p className="text-sm font-medium text-red-300">Actions dangereuses</p>
            <p className="text-xs text-white/50">
              Cette action remet tous les soldes non-admin à 50 T$ et annule les duels actifs/en attente.
            </p>
            <button
              onClick={handleReset}
              disabled={resetting}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-red-500/10 border border-red-500/30 text-red-300 hover:bg-red-500/20 disabled:opacity-50 transition-all"
            >
              {resetting ? "Réinitialisation..." : "Reset tout"}
            </button>
          </div>
        </motion.div>
      </main>
    </AuthGuard>
  );
}
