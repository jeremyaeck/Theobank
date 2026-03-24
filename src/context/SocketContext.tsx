"use client";

import { createContext, useContext, useEffect, useRef, ReactNode, useCallback } from "react";
import { useAuth } from "./AuthContext";
import { useToast } from "./ToastContext";

interface PollingContextType {
  refresh: () => void;
}

const SocketContext = createContext<PollingContextType>({
  refresh: () => {},
});

export function useSocket() {
  return useContext(SocketContext);
}

export function SocketProvider({ children }: { children: ReactNode }) {
  const { user, token, refreshUser } = useAuth();
  const { addToast } = useToast();
  const lastBalanceRef = useRef<number | null>(null);
  const lastDuelCountRef = useRef<number | null>(null);

  const pollForChanges = useCallback(async () => {
    if (!token || !user) return;

    try {
      // Check balance changes
      const meRes = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (meRes.ok) {
        const meData = await meRes.json();
        const newBalance = meData.user.balance;

        if (lastBalanceRef.current !== null && newBalance !== lastBalanceRef.current) {
          const diff = newBalance - lastBalanceRef.current;
          if (diff > 0) {
            addToast(`+${diff} T$ reçus!`, "success");
          } else {
            addToast(`${diff} T$`, "info");
          }
          refreshUser();
        }
        lastBalanceRef.current = newBalance;
      }

      // Check for new pending duels
      const duelsRes = await fetch("/api/duels", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (duelsRes.ok) {
        const duelsData = await duelsRes.json();
        const pendingCount = (duelsData.duels || []).filter(
          (d: any) => d.status === "PENDING" && d.opponentId === user.id
        ).length;

        if (lastDuelCountRef.current !== null && pendingCount > lastDuelCountRef.current) {
          addToast("Nouveau défi reçu!", "duel");
        }
        lastDuelCountRef.current = pendingCount;
      }
    } catch {
      // Silently fail on polling errors
    }
  }, [token, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!token || !user) return;

    // Initial fetch to set baseline
    pollForChanges();

    // Poll every 3 seconds
    const interval = setInterval(pollForChanges, 3000);
    return () => clearInterval(interval);
  }, [token, user?.id, pollForChanges]);

  const refresh = useCallback(() => {
    pollForChanges();
    refreshUser();
  }, [pollForChanges, refreshUser]);

  return (
    <SocketContext.Provider value={{ refresh }}>
      {children}
    </SocketContext.Provider>
  );
}
