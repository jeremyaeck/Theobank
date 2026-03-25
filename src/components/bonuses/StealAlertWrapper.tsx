"use client";

import { useSocket } from "@/context/SocketContext";
import StealAlertOverlay from "./StealAlertOverlay";

export default function StealAlertWrapper() {
  const { currentStealAlert, dismissStealAlert } = useSocket();

  if (!currentStealAlert) return null;

  return (
    <StealAlertOverlay alert={currentStealAlert} onDismiss={dismissStealAlert} />
  );
}
