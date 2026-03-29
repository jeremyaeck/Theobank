"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import AuthGuard from "@/components/layout/AuthGuard";
import Navbar from "@/components/layout/Navbar";
import { useAuth } from "@/context/AuthContext";
import { getInitials, getAvatarColor } from "@/lib/utils";
import { ACHIEVEMENTS } from "@/lib/achievement-defs";
import Link from "next/link";

interface PlayerProfile {
  user: {
    id: string;
    username: string;
    profilePhotoUrl: string | null;
  };
  achievements: {
    achievementId: string;
    name: string;
    description: string;
    emoji: string;
    unlockedAt: string;
  }[];
  auctionWins: {
    id: string;
    name: string;
    displayName: string;
    isMystery: boolean;
    winningBid: number | null;
    phase: number;
  }[];
}

export default function PlayerProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !id) return;
    fetch(`/api/users/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setProfile(d);
      })
      .catch(() => setError("Erreur de chargement"))
      .finally(() => setLoading(false));
  }, [token, id]);

  return (
    <AuthGuard>
      <Navbar />
      <main className="max-w-lg mx-auto px-4 py-6 space-y-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-4">
            <Link href="/dashboard" className="text-white/40 hover:text-white/70 transition-colors">
              ← Retour
            </Link>
            <h1 className="text-xl font-bold text-white/90">Profil</h1>
          </div>

          {loading && (
            <div className="space-y-4">
              <div className="glass p-6 rounded-2xl flex flex-col items-center gap-4">
                <div className="w-24 h-24 rounded-full bg-white/10 animate-pulse" />
                <div className="h-5 w-32 bg-white/10 rounded-lg animate-pulse" />
              </div>
              <div className="glass p-6 rounded-2xl h-32 animate-pulse" />
            </div>
          )}

          {error && (
            <div className="glass p-6 rounded-2xl text-center">
              <p className="text-white/50">{error}</p>
            </div>
          )}

          {profile && (
            <div className="space-y-4">
              {/* Avatar + name */}
              <div className="glass p-6 rounded-2xl flex flex-col items-center gap-4">
                {profile.user.profilePhotoUrl ? (
                  <img
                    src={profile.user.profilePhotoUrl}
                    alt={profile.user.username}
                    className="w-24 h-24 rounded-full object-cover border-2 border-white/20 shadow-lg"
                  />
                ) : (
                  <div
                    className={`w-24 h-24 rounded-full bg-gradient-to-br ${getAvatarColor(profile.user.username)} flex items-center justify-center text-2xl font-bold text-white shadow-lg`}
                  >
                    {getInitials(profile.user.username)}
                  </div>
                )}
                <p className="text-lg font-bold text-white/90">{profile.user.username}</p>
              </div>

              {/* Achievements */}
              <div className="glass p-6 rounded-2xl space-y-4">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🏅</span>
                  <p className="font-semibold text-white/90">Achievements</p>
                  <span className="ml-auto text-xs text-white/40">
                    {profile.achievements.length} / {Object.keys(ACHIEVEMENTS).length}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {Object.values(ACHIEVEMENTS).map((def) => {
                    const unlocked = profile.achievements.find((a) => a.achievementId === def.id);
                    return (
                      <div
                        key={def.id}
                        className={`flex flex-col items-center gap-1 p-3 rounded-xl border transition-all ${
                          unlocked
                            ? "bg-violet-500/10 border-violet-500/30"
                            : "bg-white/5 border-white/5 opacity-30"
                        }`}
                        title={def.description}
                      >
                        <span className={`text-2xl ${unlocked ? "" : "grayscale"}`}>{def.emoji}</span>
                        <p className="text-xs text-white/70 font-medium text-center leading-tight">{def.name}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Auction wins */}
              <div className="glass p-6 rounded-2xl space-y-4">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🎁</span>
                  <p className="font-semibold text-white/90">Cadeaux remportés</p>
                </div>

                {profile.auctionWins.length === 0 ? (
                  <p className="text-sm text-white/40 text-center py-2">Aucun cadeau remporté pour l&apos;instant</p>
                ) : (
                  <div className="space-y-2">
                    {profile.auctionWins.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10"
                      >
                        <div>
                          <p className="text-sm font-medium text-white/80">{item.displayName}</p>
                          <p className="text-xs text-white/40">Phase {item.phase}</p>
                        </div>
                        {item.winningBid !== null && (
                          <p className="text-sm font-bold text-amber-400">{item.winningBid} T$</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </main>
    </AuthGuard>
  );
}
