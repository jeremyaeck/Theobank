"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";

interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info" | "duel" | "team" | "wheel" | "achievement";
  action?: { label: string; onClick: () => void };
}

interface ToastContextType {
  addToast: (message: string, type?: Toast["type"], action?: Toast["action"]) => void;
}

const ToastContext = createContext<ToastContextType>({ addToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

const ICONS: Record<Toast["type"], string> = {
  success: "✓",
  error: "✗",
  info: "ℹ",
  duel: "⚔️",
  team: "🏆",
  wheel: "🎡",
  achievement: "🏅",
};

const COLORS: Record<Toast["type"], string> = {
  success: "border-green-500/50 bg-green-500/10",
  error: "border-red-500/50 bg-red-500/10",
  info: "border-cyan-500/50 bg-cyan-500/10",
  duel: "border-purple-500/50 bg-purple-500/10",
  team: "border-amber-400/70 bg-gradient-to-r from-amber-500/20 to-yellow-500/10",
  wheel: "border-yellow-500/60 bg-gradient-to-r from-yellow-500/15 to-orange-500/10",
  achievement: "border-violet-400/70 bg-gradient-to-r from-violet-500/20 to-purple-500/10",
};

const DURATIONS: Record<Toast["type"], number> = {
  success: 4000,
  error: 4000,
  info: 4000,
  duel: 4000,
  team: 8000,
  wheel: 20000,
  achievement: 8000,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback(
    (message: string, type: Toast["type"] = "info", action?: Toast["action"]) => {
      const id = Math.random().toString(36).slice(2);
      setToasts((prev) => [...prev, { id, message, type, action }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, DURATIONS[type]);
    },
    []
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 100, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.9 }}
              className={`flex items-center gap-3 px-4 backdrop-blur-xl border rounded-xl ${COLORS[toast.type]} ${
                toast.type === "team" || toast.type === "wheel" || toast.type === "achievement" ? "py-4 shadow-lg" : "py-3"
              }`}
            >
              <span className={toast.type === "team" || toast.type === "wheel" || toast.type === "achievement" ? "text-2xl" : "text-lg"}>
                {ICONS[toast.type]}
              </span>
              <span className={`text-white/90 flex-1 ${toast.type === "team" || toast.type === "wheel" || toast.type === "achievement" ? "text-base font-semibold" : "text-sm"}`}>
                {toast.message}
              </span>
              {toast.action && (
                <button
                  onClick={() => {
                    toast.action!.onClick();
                    dismissToast(toast.id);
                  }}
                  className="shrink-0 px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs font-bold transition-colors"
                >
                  {toast.action.label}
                </button>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
