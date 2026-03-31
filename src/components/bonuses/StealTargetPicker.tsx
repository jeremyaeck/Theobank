"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import PlayerAvatar from "@/components/ui/PlayerAvatar";
import type { User } from "@/types";

interface StealTargetPickerProps {
  onConfirm: (victimId: string) => void;
  onClose: () => void;
  loading: boolean;
}

export default function StealTargetPicker({ onConfirm, onClose, loading }: StealTargetPickerProps) {
  const { token, user } = useAuth();
  const [players, setPlayers] = useState<User[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!token) return;
    fetch("/api/duels/players", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => {
        const list = (d.players || []).filter((p: User) => p.id !== user?.id && !p.isAdmin);
        setPlayers(list);
      })
      .catch(() => {})
      .finally(() => setFetching(false));
  }, [token, user?.id]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="glass-strong p-6 w-full max-w-sm space-y-4"
        >
          <h3 className="text-lg font-bold text-white/90 text-center">
            🦹 Choisir une victime
          </h3>
          <p className="text-xs text-white/40 text-center">
            Vous allez voler 5% du solde du joueur choisi
          </p>

          {fetching ? (
            <div className="h-40 flex items-center justify-center">
              <div className="animate-spin h-6 w-6 border-2 border-white/20 border-t-white/60 rounded-full" />
            </div>
          ) : (
            <div className="space-y-1.5 max-h-60 overflow-y-auto">
              {players.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedId(p.id === selectedId ? null : p.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left ${
                    selectedId === p.id
                      ? "bg-red-500/20 border border-red-500/40"
                      : "bg-white/5 border border-transparent hover:bg-white/10"
                  }`}
                >
                  <PlayerAvatar username={p.username} profilePhotoUrl={p.profilePhotoUrl} size="sm" />
                  <span className="text-white/80 font-medium text-sm">{p.username}</span>
                  {selectedId === p.id && (
                    <span className="ml-auto text-red-400 text-xs">✓</span>
                  )}
                </button>
              ))}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-white/60 font-medium hover:bg-white/10"
            >
              Annuler
            </button>
            <button
              onClick={() => selectedId && onConfirm(selectedId)}
              disabled={!selectedId || loading}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 text-white font-bold hover:opacity-90 disabled:opacity-40 transition-opacity"
            >
              {loading ? "..." : "Voler !"}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
