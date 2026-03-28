"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import AuthGuard from "@/components/layout/AuthGuard";
import Navbar from "@/components/layout/Navbar";
import BonusCard from "@/components/bonuses/BonusCard";
import BonusResultOverlay from "@/components/bonuses/BonusResultOverlay";
import StealTargetPicker from "@/components/bonuses/StealTargetPicker";
import ActiveBonusIndicator from "@/components/bonuses/ActiveBonusIndicator";
import { motion } from "framer-motion";
import type { BonusType } from "@/types";
import Link from "next/link";

interface BonusState {
  type: BonusType;
  used: boolean;
  usage: {
    id: string;
    usedAt: string;
    expiresAt: string | null;
    data: any;
  } | null;
}

export default function BonusesPage() {
  const { token, refreshUser } = useAuth();
  const { addToast } = useToast();

  const [bonuses, setBonuses] = useState<BonusState[]>([]);
  const [cooldownEndsAt, setCooldownEndsAt] = useState<string | null>(null);
  const [auctionActive, setAuctionActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);

  // Overlay states
  const [showResultOverlay, setShowResultOverlay] = useState<{
    bonusType: BonusType;
    data: any;
    expiresAt: string;
  } | null>(null);
  const [showStealPicker, setShowStealPicker] = useState(false);
  const [activeGainDouble, setActiveGainDouble] = useState<string | null>(null);
  const [activeBouclier, setActiveBouclier] = useState<string | null>(null);

  const fetchBonuses = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/bonuses", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setBonuses(data.bonuses || []);
        setCooldownEndsAt(data.cooldownEndsAt || null);
        setAuctionActive(data.auctionActive || false);

        // Check for active timed bonuses
        const gainDouble = (data.bonuses || []).find(
          (b: BonusState) =>
            b.type === "GAIN_DOUBLE" &&
            b.usage?.expiresAt &&
            new Date(b.usage.expiresAt) > new Date()
        );
        setActiveGainDouble(gainDouble?.usage?.expiresAt || null);

        const bouclier = (data.bonuses || []).find(
          (b: BonusState) =>
            b.type === "BOUCLIER" &&
            b.usage?.expiresAt &&
            new Date(b.usage.expiresAt) > new Date()
        );
        setActiveBouclier(bouclier?.usage?.expiresAt || null);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchBonuses();
    const interval = setInterval(fetchBonuses, 5000);
    return () => clearInterval(interval);
  }, [fetchBonuses]);

  const isCooldownActive = cooldownEndsAt ? new Date(cooldownEndsAt) > new Date() : false;

  const handleActivate = async (type: BonusType) => {
    if (type === "VOL") {
      setShowStealPicker(true);
      return;
    }

    setActivating(true);
    try {
      const res = await fetch("/api/bonuses/use", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ bonusType: type }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (type === "GAIN_DOUBLE") {
        addToast("✨ Gain x2 activé pour 5 minutes !", "success");
        setActiveGainDouble(data.bonus.expiresAt);
      } else if (type === "BOUCLIER") {
        addToast("🛡️ Bouclier activé pendant 5 minutes !", "success");
        setActiveBouclier(data.bonus.expiresAt);
      } else if (type === "JACKPOT") {
        refreshUser();
        setShowResultOverlay({
          bonusType: type,
          data: data.bonus.data,
          expiresAt: data.bonus.expiresAt,
        });
      } else {
        setShowResultOverlay({
          bonusType: type,
          data: data.bonus.data,
          expiresAt: data.bonus.expiresAt,
        });
      }

      fetchBonuses();
    } catch (err: any) {
      addToast(err.message || "Erreur", "error");
    } finally {
      setActivating(false);
    }
  };

  const handleSteal = async (victimId: string) => {
    setActivating(true);
    try {
      const res = await fetch("/api/bonuses/use", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ bonusType: "VOL", victimId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      addToast(`🦹 Vous avez volé ${data.stolenAmount} T$ à ${data.victimUsername} !`, "success");
      setShowStealPicker(false);
      refreshUser();
      fetchBonuses();
    } catch (err: any) {
      addToast(err.message || "Erreur", "error");
    } finally {
      setActivating(false);
    }
  };

  // Cooldown display
  const [cooldownDisplay, setCooldownDisplay] = useState("");
  useEffect(() => {
    if (!cooldownEndsAt) return;
    const update = () => {
      const remaining = Math.max(0, new Date(cooldownEndsAt).getTime() - Date.now());
      if (remaining <= 0) {
        setCooldownDisplay("");
        return;
      }
      const min = Math.floor(remaining / 60000);
      const sec = Math.floor((remaining % 60000) / 1000);
      setCooldownDisplay(`${min}:${String(sec).padStart(2, "0")}`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [cooldownEndsAt]);

  return (
    <AuthGuard>
      <Navbar />

      {activeGainDouble && (
        <ActiveBonusIndicator expiresAt={activeGainDouble} label="✨ Gain x2" gradient="from-purple-600 to-pink-600" />
      )}
      {activeBouclier && (
        <ActiveBonusIndicator expiresAt={activeBouclier} label="🛡️ Bouclier" gradient="from-blue-600 to-cyan-600" />
      )}

      <main className="max-w-lg mx-auto px-4 py-6 space-y-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl font-bold text-white/90">Bonus</h1>
            <Link
              href="/dashboard"
              className="text-sm text-white/40 hover:text-white/60 transition-colors"
            >
              ← Retour
            </Link>
          </div>
          <p className="text-sm text-white/50 mb-2">
            5 bonus à usage unique. Utilisez-les stratégiquement !
          </p>

          {isCooldownActive && cooldownDisplay && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="glass p-3 flex items-center justify-center gap-2 mb-2"
            >
              <span className="text-sm text-white/50">⏳ Prochain bonus disponible dans</span>
              <span className="font-mono font-bold text-cyan-400">{cooldownDisplay}</span>
            </motion.div>
          )}

          {auctionActive && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="glass p-3 text-center mb-2 border border-orange-500/30"
            >
              <p className="text-sm text-orange-400">
                🔒 Bonus désactivés pendant l&apos;enchère en cours
              </p>
            </motion.div>
          )}
        </motion.div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-20 bg-white/5 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {bonuses.map((bonus, i) => (
              <BonusCard
                key={bonus.type}
                type={bonus.type}
                used={bonus.used}
                cooldownActive={isCooldownActive}
                auctionActive={auctionActive}
                onActivate={() => handleActivate(bonus.type)}
                index={i}
              />
            ))}
          </div>
        )}
      </main>

      {/* Info bonus result overlay */}
      {showResultOverlay && (
        <BonusResultOverlay
          bonusType={showResultOverlay.bonusType}
          data={showResultOverlay.data}
          expiresAt={showResultOverlay.expiresAt}
          onClose={() => setShowResultOverlay(null)}
        />
      )}

      {/* Steal target picker */}
      {showStealPicker && (
        <StealTargetPicker
          onConfirm={handleSteal}
          onClose={() => setShowStealPicker(false)}
          loading={activating}
        />
      )}
    </AuthGuard>
  );
}
