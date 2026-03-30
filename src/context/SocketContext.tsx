"use client";

import { createContext, useContext, useEffect, useRef, useState, ReactNode, useCallback } from "react";
import { useAuth } from "./AuthContext";
import { useToast } from "./ToastContext";
import type { StealAlert, WheelEvent, NewAchievementEvent } from "@/types";

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
  currentWheelEvent: WheelEvent | null;
  clearWheelEvent: () => void;
  suppressBalanceToast: () => void;
}

const SocketContext = createContext<PollingContextType>({
  refresh: () => {},
  currentStealAlert: null,
  dismissStealAlert: () => {},
  currentTeam: null,
  currentWheelEvent: null,
  clearWheelEvent: () => {},
  suppressBalanceToast: () => {},
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
  const seenWheelEventIds = useRef<Set<string>>(new Set());
  const seenAchievementIds = useRef<Set<string>>(new Set());
  const suppressBalanceToastRef = useRef(false);
  const [currentStealAlert, setCurrentStealAlert] = useState<StealAlert | null>(null);
  const [currentTeam, setCurrentTeam] = useState<TeamInfo | null>(null);
  const [currentWheelEvent, setCurrentWheelEvent] = useState<WheelEvent | null>(null);

  const clearWheelEvent = useCallback(() => setCurrentWheelEvent(null), []);
  const suppressBalanceToast = useCallback(() => { suppressBalanceToastRef.current = true; }, []);

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
          if (diff > 0 && !user.isAdmin && !suppressBalanceToastRef.current) {
            addToast(`+${diff} T$ reçus !`, "success");
          }
          suppressBalanceToastRef.current = false;
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
            break;
          }
        }

        // Check for new wheel events from other players
        const wheelEvents: WheelEvent[] = meData.wheelEvents || [];
        for (const event of wheelEvents) {
          if (!seenWheelEventIds.current.has(event.id)) {
            seenWheelEventIds.current.add(event.id);
            setCurrentWheelEvent(event);
            break;
          }
        }

        // Check for newly unlocked achievements
        const newAchievements: NewAchievementEvent[] = meData.newAchievements || [];
        let hasNewAchievement = false;
        for (const achievement of newAchievements) {
          if (!seenAchievementIds.current.has(achievement.id)) {
            seenAchievementIds.current.add(achievement.id);
            addToast(
              `${achievement.emoji} ${achievement.name} — ${achievement.description}`,
              "achievement"
            );
            hasNewAchievement = true;
          }
        }

        // Refresh user to update achievements in AuthContext when newly unlocked
        if (hasNewAchievement) {
          refreshUser();
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
    <SocketContext.Provider value={{ refresh, currentStealAlert, dismissStealAlert, currentTeam, currentWheelEvent, clearWheelEvent, suppressBalanceToast }}>
      {children}
    </SocketContext.Provider>
  );
}
