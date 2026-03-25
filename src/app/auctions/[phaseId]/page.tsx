"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import AuthGuard from "@/components/layout/AuthGuard";
import Navbar from "@/components/layout/Navbar";
import ItemCard from "@/components/auctions/ItemCard";
import CountdownTimer from "@/components/auctions/CountdownTimer";
import { motion, AnimatePresence } from "framer-motion";
import { formatTD } from "@/lib/utils";
import type { AuctionPhase } from "@/types";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function AuctionPhasePage() {
  const { token, user, refreshUser } = useAuth();
  const { addToast } = useToast();
  const params = useParams();
  const phaseId = params.phaseId as string;

  const [phase, setPhase] = useState<AuctionPhase | null>(null);
  const [loading, setLoading] = useState(true);
  const [bids, setBids] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [hasValidated, setHasValidated] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [serverTimeOffset, setServerTimeOffset] = useState(0);

  const fetchPhase = useCallback(async () => {
    if (!token) return;
    try {
      const fetchStart = Date.now();
      const res = await fetch("/api/auctions", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        // Calculate clock offset: clientTime - serverTime
        // Account for network latency by using midpoint of request
        if (data.serverTime) {
          const fetchEnd = Date.now();
          const clientMidpoint = (fetchStart + fetchEnd) / 2;
          const serverTime = new Date(data.serverTime).getTime();
          setServerTimeOffset(clientMidpoint - serverTime);
        }
        const found = (data.phases || []).find((p: AuctionPhase) => p.id === phaseId);
        if (found) {
          setPhase(found);
          // Check if user already has bids
          const userHasBids = found.items.some(
            (item: any) => item.bids && item.bids.length > 0
          );
          setHasValidated(userHasBids);
        }
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [token, phaseId]);

  useEffect(() => {
    fetchPhase();
    const interval = setInterval(fetchPhase, 3000);
    return () => clearInterval(interval);
  }, [fetchPhase]);

  const totalBid = Object.values(bids).reduce((sum, v) => sum + v, 0);
  const balance = user?.balance || 0;
  const overBudget = totalBid > balance;

  const handleSubmit = async () => {
    if (!phase || overBudget || totalBid <= 0) return;
    setSubmitting(true);
    try {
      const bidArray = phase.items.map((item) => ({
        itemId: item.id,
        amount: bids[item.id] || 0,
      }));

      const res = await fetch(`/api/auctions/${phaseId}/bid`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ bids: bidArray }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      addToast(`Mises validées ! -${totalBid} T$`, "success");
      setHasValidated(true);
      setShowConfirm(false);
      refreshUser();
      fetchPhase();
    } catch (err: any) {
      addToast(err.message || "Erreur", "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <AuthGuard>
        <Navbar />
        <main className="max-w-lg mx-auto px-4 py-6">
          <div className="h-64 bg-white/5 rounded-2xl animate-pulse" />
        </main>
      </AuthGuard>
    );
  }

  if (!phase) {
    return (
      <AuthGuard>
        <Navbar />
        <main className="max-w-lg mx-auto px-4 py-6 text-center">
          <p className="text-white/50">Phase introuvable</p>
          <Link href="/auctions" className="text-cyan-400 text-sm mt-2 inline-block">
            ← Retour aux enchères
          </Link>
        </main>
      </AuthGuard>
    );
  }

  const isLocked = phase.status === "LOCKED";
  const isActive = phase.status === "ACTIVE";
  const isFinished = phase.status === "FINISHED";

  return (
    <AuthGuard>
      <Navbar />
      <main className="max-w-lg mx-auto px-4 py-6 space-y-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-xl font-bold text-white/90">Phase {phase.phase}</h1>
            <Link href="/auctions" className="text-sm text-white/40 hover:text-white/60 transition-colors">
              ← Retour
            </Link>
          </div>
        </motion.div>

        {isLocked && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass p-8 text-center">
            <span className="text-4xl">🔒</span>
            <p className="text-white/50 mt-3">Cette phase n&apos;est pas encore ouverte</p>
            <p className="text-xs text-white/30 mt-1">L&apos;animateur lancera bientôt cette phase</p>
          </motion.div>
        )}

        {isActive && phase.endsAt && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="glass p-4">
            <CountdownTimer endsAt={phase.endsAt} serverTimeOffset={serverTimeOffset} onExpired={fetchPhase} />
          </motion.div>
        )}

        {(isActive || isFinished) && (
          <>
            <div className="grid grid-cols-2 gap-3">
              {phase.items.map((item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  bidAmount={bids[item.id] || 0}
                  onBidChange={(amount) => setBids((prev) => ({ ...prev, [item.id]: amount }))}
                  disabled={hasValidated || isFinished}
                  phaseStatus={phase.status}
                  currentUserId={user?.id}
                />
              ))}
            </div>

            {isActive && !hasValidated && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                <div className="glass p-3 flex items-center justify-between">
                  <span className="text-sm text-white/60">Total misé</span>
                  <span className={`text-lg font-bold ${overBudget ? "text-red-400" : "text-cyan-400"}`}>
                    {formatTD(totalBid)}
                  </span>
                </div>
                <div className="glass p-3 flex items-center justify-between">
                  <span className="text-sm text-white/60">Solde disponible</span>
                  <span className="text-lg font-bold text-white/70">{formatTD(balance)}</span>
                </div>
                {overBudget && (
                  <p className="text-xs text-red-400 text-center">Solde insuffisant !</p>
                )}
                <button
                  onClick={() => setShowConfirm(true)}
                  disabled={overBudget || totalBid <= 0}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-green-600 to-emerald-600 text-white text-center text-lg font-bold hover:opacity-90 transition-opacity disabled:opacity-40 shadow-lg shadow-green-500/20"
                >
                  Valider mes mises
                </button>
              </motion.div>
            )}

            {isActive && hasValidated && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass p-5 text-center border border-green-500/30">
                <span className="text-3xl">✅</span>
                <p className="text-green-400 font-bold mt-2">Mises validées !</p>
                <p className="text-xs text-white/40 mt-1">Résultats à la fin du décompte</p>
              </motion.div>
            )}
          </>
        )}

        {/* Confirmation Modal */}
        <AnimatePresence>
          {showConfirm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
              onClick={() => setShowConfirm(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="glass-strong p-6 w-full max-w-sm space-y-4"
              >
                <h3 className="text-lg font-bold text-white/90 text-center">Confirmer vos mises</h3>
                <div className="space-y-2">
                  {phase.items.map((item) => {
                    const amount = bids[item.id] || 0;
                    if (amount <= 0) return null;
                    return (
                      <div key={item.id} className="flex items-center justify-between text-sm">
                        <span className="text-white/70">
                          {item.isMystery ? item.displayName : item.name}
                        </span>
                        <span className="text-cyan-400 font-bold">{amount} T$</span>
                      </div>
                    );
                  })}
                  <div className="border-t border-white/10 pt-2 flex items-center justify-between">
                    <span className="text-white/90 font-bold">Total</span>
                    <span className="text-cyan-400 font-bold text-lg">{formatTD(totalBid)}</span>
                  </div>
                </div>
                <p className="text-xs text-red-400/80 text-center">
                  Cette action est définitive. L&apos;argent misé ne sera pas remboursé.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowConfirm(false)}
                    className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-white/60 font-medium hover:bg-white/10"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold hover:opacity-90 disabled:opacity-50"
                  >
                    {submitting ? "..." : "Confirmer"}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </AuthGuard>
  );
}
