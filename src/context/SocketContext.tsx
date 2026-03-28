"use client";

import { createContext, useContext, useEffect, useRef, useState, ReactNode, useCallback } from "react";
import { useAuth } from "./AuthContext";
import { useToast } from "./ToastContext";
import type { StealAlert } from "@/types";

interface TeamInfo {
  id: string;
  name: string;
  members: { id: string; username: string }[];
}

interface PollingContextType {
  refresh: () => void;
  currentStealAlert: StealAlert | null;
  dismissStealAlert: () => void;
  currentTeam: TeamInfo | null;
}

const SocketContext = createContext<PollingContextType>({
  refresh: () => {},
  currentStealAlert: null,
  dismissStealAlert: () => {},
  currentTeam: null,
});

export function useSocket() {
  return useContext(SocketContext);
}

export function SocketProvider({ children }: { children: ReactNode }) {
  const { user, token, refreshUser } = useAuth();
  const { addToast } = useToast();
  const lastBalanceRef = useRef<number | null>(null);
  const lastDuelCountRef = useRef<number | null>(null);
  const lastTeamIdRef = useRef<string | null | undefined>(undefined); // undefined = not yet initialized
  const lastTeamNameRef = useRef<string | null>(null);
  const seenStealAlertIds = useRef<Set<string>>(new Set());
  const [currentStealAlert, setCurrentStealAlert] = useState<StealAlert | null>(null);
  const [currentTeam, setCurrentTeam] = useState<TeamInfo | null>(null);

  const dismissStealAlert = useCallback(async () => {
    if (currentStealAlert && token) {
      // Acknowledge on server so it doesn't reappear
      try {
        await fetch("/api/bonuses/acknowledge", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ alertId: currentStealAlert.id }),
        });
      } catch {
        // silent
      }
    }
    setCurrentStealAlert(null);
  }, [currentStealAlert, token]);

  const pollForChanges = useCallback(async () => {
    if (!token || !user) return;

    try {
      // Check balance changes + steal alerts
      const meRes = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (meRes.ok) {
        const meData = await meRes.json();
        const newBalance = meData.user.balance;

        if (lastBalanceRef.current !== null && newBalance !== lastBalanceRef.current) {
          const diff = newBalance - lastBalanceRef.current;
          if (diff > 0 && !user.isAdmin) {
            addToast(`+${diff} T$ reçus !`, "success");
          }
          refreshUser();
        }
        lastBalanceRef.current = newBalance;

        // Check for team changes
        const newTeamId: string | null = meData.team?.id ?? null;
        const newTeamName: string | null = meData.team?.name ?? null;
        if (lastTeamIdRef.current !== undefined) {
          const teamIdChanged = newTeamId !== lastTeamIdRef.current;
          const teamNameChanged = newTeamName !== lastTeamNameRef.current;

          if (teamIdChanged || teamNameChanged) {
            if (!newTeamId) {
              addToast("Tu as été retiré de ton équipe", "info");
            } else if (teamIdChanged) {
              // New team assignment
              addToast(`Tu rejoins l'équipe ${newTeamName} !`, "team");
            } else if (teamNameChanged && newTeamName) {
              // Renamed — same team, new name
              addToast(`Ton équipe s'appelle maintenant : ${newTeamName}`, "team");
            }
          }
        }
        lastTeamIdRef.current = newTeamId;
        lastTeamNameRef.current = newTeamName;
        setCurrentTeam(meData.team ?? null);

        // Check for new steal alerts
        const alerts: StealAlert[] = meData.stealAlerts || [];
        for (const alert of alerts) {
          if (!seenStealAlertIds.current.has(alert.id)) {
            seenStealAlertIds.current.add(alert.id);
            setCurrentStealAlert(alert);
            break; // Show one at a time
          }
        }
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
          addToast("Nouveau défi reçu !", "duel");
        }
        lastDuelCountRef.current = pendingCount;
      }
    } catch {
      // Silently fail on polling errors
    }
  }, [token, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!token || !user) {
      // Reset baseline when logged out
      lastBalanceRef.current = null;
      lastDuelCountRef.current = null;
      lastTeamIdRef.current = undefined;
      lastTeamNameRef.current = null;
      return;
    }

    // Reset baseline on user change (new login) to avoid wrong diff
    lastBalanceRef.current = null;
    lastDuelCountRef.current = null;
    lastTeamIdRef.current = undefined;
    lastTeamNameRef.current = null;

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
    <SocketContext.Provider value={{ refresh, currentStealAlert, dismissStealAlert, currentTeam }}>
      {children}
    </SocketContext.Provider>
  );
}
