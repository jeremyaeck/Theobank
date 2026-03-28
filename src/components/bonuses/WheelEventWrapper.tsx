"use client";

import { useEffect, useState } from "react";
import { useSocket } from "@/context/SocketContext";
import { useToast } from "@/context/ToastContext";
import WheelModal from "./WheelModal";
import type { WheelEvent } from "@/types";

export default function WheelEventWrapper() {
  const { currentWheelEvent, clearWheelEvent } = useSocket();
  const { addToast } = useToast();
  const [spectatorEvent, setSpectatorEvent] = useState<WheelEvent | null>(null);

  useEffect(() => {
    if (!currentWheelEvent) return;

    const event = currentWheelEvent;
    clearWheelEvent();

    addToast(
      `${event.spinnerUsername} lance la roue du destin !`,
      "wheel",
      {
        label: "Voir",
        onClick: () => setSpectatorEvent(event),
      }
    );
  }, [currentWheelEvent]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!spectatorEvent) return null;

  return (
    <WheelModal
      segmentIndex={spectatorEvent.segmentIndex}
      amount={spectatorEvent.amount}
      targetUsername={spectatorEvent.targetUsername}
      spinnerUsername={spectatorEvent.spinnerUsername}
      isSpectator
      onClose={() => setSpectatorEvent(null)}
    />
  );
}
