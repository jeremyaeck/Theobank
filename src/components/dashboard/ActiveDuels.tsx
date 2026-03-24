"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import DuelCard from "@/components/duels/DuelCard";
import type { Duel } from "@/types";

export default function ActiveDuels() {
  const { token } = useAuth();
  const [duels, setDuels] = useState<Duel[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDuels = () => {
    if (!token) return;
    fetch("/api/duels", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => setDuels(d.duels || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDuels();
    const interval = setInterval(fetchDuels, 5000);
    return () => clearInterval(interval);
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const activeDuels = duels.filter((d) => d.status === "PENDING" || d.status === "ACTIVE");
  const recentDuels = duels.filter((d) => d.status === "COMPLETED" || d.status === "CANCELLED").slice(0, 5);

  if (loading) {
    return (
      <div className="glass p-6">
        <div className="animate-pulse space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-20 bg-white/5 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-white/80 mb-3">Duels actifs</h2>
        {activeDuels.length === 0 ? (
          <div className="glass p-6 text-center">
            <p className="text-white/40 text-sm">Aucun duel en cours</p>
            <p className="text-white/30 text-xs mt-1">Défiez un joueur pour commencer!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeDuels.map((duel) => (
              <DuelCard key={duel.id} duel={duel} />
            ))}
          </div>
        )}
      </div>

      {recentDuels.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-white/80 mb-3">Duels récents</h2>
          <div className="space-y-3">
            {recentDuels.map((duel) => (
              <DuelCard key={duel.id} duel={duel} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
