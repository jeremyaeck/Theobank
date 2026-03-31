"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import AuthGuard from "@/components/layout/AuthGuard";
import Navbar from "@/components/layout/Navbar";
import { motion } from "framer-motion";
import PlayerAvatar from "@/components/ui/PlayerAvatar";
import type { Duel } from "@/types";

const STATUS_LABELS: Record<string, { label: string; color: string; desc: string }> = {
  PENDING: { label: "En attente", color: "text-yellow-400", desc: "En attente de réponse de l'adversaire" },
  ACTIVE: { label: "En cours", color: "text-blue-400", desc: "Votez pour désigner le gagnant !" },
  COMPLETED: { label: "Terminé", color: "text-green-400", desc: "Le duel est terminé" },
  CANCELLED: { label: "Annulé", color: "text-red-400", desc: "Le duel a été annulé" },
};

export default function DuelDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, token } = useAuth();
  const { addToast } = useToast();
  const [duel, setDuel] = useState<Duel | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  const duelId = params.id as string;

  const fetchDuel = () => {
    if (!token) return;
    fetch(`/api/duels/${duelId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => setDuel(d.duel))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDuel();
    const interval = setInterval(fetchDuel, 3000);
    return () => clearInterval(interval);
  }, [token, duelId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAccept = async () => {
    setActing(true);
    try {
      const res = await fetch(`/api/duels/${duelId}/accept`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDuel(data.duel);
      addToast("Duel accepté ! Votez maintenant.", "success");
    } catch (err: any) {
      addToast(err.message || "Erreur", "error");
    } finally {
      setActing(false);
    }
  };

  const handleRefuse = async () => {
    setActing(true);
    try {
      const res = await fetch(`/api/duels/${duelId}/refuse`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDuel(data.duel);
      addToast("Duel refusé", "info");
    } catch (err: any) {
      addToast(err.message || "Erreur", "error");
    } finally {
      setActing(false);
    }
  };

  const handleVote = async (winnerId: string) => {
    setActing(true);
    try {
      const res = await fetch(`/api/duels/${duelId}/vote`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ winnerId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDuel(data.duel);
      addToast("Vote enregistré !", "success");
    } catch (err: any) {
      addToast(err.message || "Erreur", "error");
    } finally {
      setActing(false);
    }
  };

  if (loading || !duel) {
    return (
      <AuthGuard>
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-pulse text-4xl gradient-text font-bold">T$</div>
        </div>
      </AuthGuard>
    );
  }

  const isChallenger = user?.id === duel.challengerId;
  const isOpponent = user?.id === duel.opponentId;
  const myVote = isChallenger ? duel.challengerVote : duel.opponentVote;
  const status = STATUS_LABELS[duel.status];

  return (
    <AuthGuard>
      <Navbar />
      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <button
            onClick={() => router.push("/dashboard")}
            className="text-sm text-white/40 hover:text-white/60 transition-colors mb-4"
          >
            ← Retour
          </button>

          {/* Duel card */}
          <div className="glass-strong gradient-border p-6 text-center space-y-4">
            <div className={`text-sm font-medium ${status.color}`}>{status.label}</div>

            <div className="grid grid-cols-3 items-center gap-2">
              <div className="text-center flex flex-col items-center">
                <PlayerAvatar username={duel.challenger.username} profilePhotoUrl={duel.challenger.profilePhotoUrl} size="lg" />
                <p className="text-sm text-white/80 mt-2 font-medium truncate max-w-full">
                  {duel.challenger.username}
                </p>
                {isChallenger && (
                  <span className="text-xs text-white/40">(vous)</span>
                )}
              </div>

              <div className="text-center flex flex-col items-center justify-center">
                <p className="text-3xl font-black gradient-text">{duel.betAmount} T$</p>
                <p className="text-white/40 text-xs mt-1">misent chacun</p>
              </div>

              <div className="text-center flex flex-col items-center">
                <PlayerAvatar username={duel.opponent.username} profilePhotoUrl={duel.opponent.profilePhotoUrl} size="lg" />
                <p className="text-sm text-white/80 mt-2 font-medium truncate max-w-full">
                  {duel.opponent.username}
                </p>
                {isOpponent && (
                  <span className="text-xs text-white/40">(vous)</span>
                )}
              </div>
            </div>

            <p className="text-xs text-white/40">{status.desc}</p>

            {/* Winner display */}
            {duel.status === "COMPLETED" && duel.winnerId && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
                <p className="text-green-400 font-bold text-lg">
                  {duel.winnerId === user?.id
                    ? `Vous avez gagné ${duel.betAmount * 2} T$!`
                    : `${duel.winnerId === duel.challengerId ? duel.challenger.username : duel.opponent.username} a gagné !`}
                </p>
              </div>
            )}

            {duel.status === "CANCELLED" && (duel.challengerVote || duel.opponentVote) && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                <p className="text-red-300 text-sm">
                  Votes contradictoires — les mises ont été restituées
                </p>
              </div>
            )}
          </div>

          {/* Actions */}
          {duel.status === "PENDING" && isOpponent && (
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleAccept}
                disabled={acting}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {acting ? "..." : "Accepter"}
              </button>
              <button
                onClick={handleRefuse}
                disabled={acting}
                className="flex-1 py-3 rounded-xl bg-white/5 border border-red-500/30 text-red-300 font-bold hover:bg-red-500/10 transition-colors disabled:opacity-50"
              >
                {acting ? "..." : "Refuser"}
              </button>
            </div>
          )}

          {duel.status === "PENDING" && isChallenger && (
            <div className="glass p-4 text-center mt-6">
              <p className="text-white/50 text-sm">En attente de la réponse de {duel.opponent.username}...</p>
              <div className="mt-2 animate-pulse text-2xl">⏳</div>
            </div>
          )}

          {duel.status === "ACTIVE" && !myVote && (
            <div className="mt-6 space-y-3">
              <p className="text-center text-white/60 text-sm">Qui a gagné ce duel ?</p>
              <div className="flex gap-3">
                <button
                  onClick={() => handleVote(duel.challengerId)}
                  disabled={acting}
                  className="flex-1 glass p-4 text-center hover:bg-white/10 transition-colors rounded-xl disabled:opacity-50"
                >
                  <PlayerAvatar username={duel.challenger.username} profilePhotoUrl={duel.challenger.profilePhotoUrl} />
                  <p className="text-sm text-white/80 mt-2">{duel.challenger.username}</p>
                </button>
                <button
                  onClick={() => handleVote(duel.opponentId)}
                  disabled={acting}
                  className="flex-1 glass p-4 text-center hover:bg-white/10 transition-colors rounded-xl disabled:opacity-50"
                >
                  <PlayerAvatar username={duel.opponent.username} profilePhotoUrl={duel.opponent.profilePhotoUrl} />
                  <p className="text-sm text-white/80 mt-2">{duel.opponent.username}</p>
                </button>
              </div>
            </div>
          )}

          {duel.status === "ACTIVE" && myVote && (
            <div className="glass p-4 text-center mt-6">
              <p className="text-white/50 text-sm">Votre vote est enregistré. En attente de l&apos;autre joueur...</p>
              <div className="mt-2 animate-pulse text-2xl">🗳️</div>
            </div>
          )}
        </motion.div>
      </main>
    </AuthGuard>
  );
}
