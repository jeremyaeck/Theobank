"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import AuthGuard from "@/components/layout/AuthGuard";
import Navbar from "@/components/layout/Navbar";
import PhaseCard from "@/components/auctions/PhaseCard";
import { motion } from "framer-motion";
import type { AuctionPhase } from "@/types";
import Link from "next/link";

export default function AuctionsPage() {
  const { token } = useAuth();
  const [phases, setPhases] = useState<AuctionPhase[]>([]);
  const [loading, setLoading] = useState(true);
  const [serverTimeOffset, setServerTimeOffset] = useState(0);

  const fetchPhases = async () => {
    if (!token) return;
    try {
      const fetchStart = Date.now();
      const res = await fetch("/api/auctions", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.serverTime) {
          const fetchEnd = Date.now();
          const clientMidpoint = (fetchStart + fetchEnd) / 2;
          const serverTime = new Date(data.serverTime).getTime();
          setServerTimeOffset(clientMidpoint - serverTime);
        }
        setPhases(data.phases || []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPhases();
    const interval = setInterval(fetchPhases, 3000);
    return () => clearInterval(interval);
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AuthGuard>
      <Navbar />
      <main className="max-w-lg mx-auto px-4 py-6 space-y-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-white/90">Enchères</h1>
            <Link href="/dashboard" className="text-sm text-white/40 hover:text-white/60 transition-colors">
              ← Retour
            </Link>
          </div>
          <p className="text-sm text-white/50 mb-6">
            Misez secrètement sur les cadeaux. Le plus offrant remporte l&apos;objet !
          </p>
        </motion.div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-40 bg-white/5 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {phases.map((phase, i) => (
              <PhaseCard key={phase.id} phase={phase} index={i} serverTimeOffset={serverTimeOffset} />
            ))}
          </div>
        )}
      </main>
    </AuthGuard>
  );
}
