"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";

interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info" | "duel" | "team";
}

interface ToastContextType {
  addToast: (message: string, type?: Toast["type"]) => void;
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
};

const COLORS: Record<Toast["type"], string> = {
  success: "border-green-500/50 bg-green-500/10",
  error: "border-red-500/50 bg-red-500/10",
  info: "border-cyan-500/50 bg-cyan-500/10",
  duel: "border-purple-500/50 bg-purple-500/10",
  team: "border-amber-400/70 bg-gradient-to-r from-amber-500/20 to-yellow-500/10",
};

const DURATIONS: Record<Toast["type"], number> = {
  success: 4000,
  error: 4000,
  info: 4000,
  duel: 4000,
  team: 8000,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: Toast["type"] = "info") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, DURATIONS[type]);
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
                toast.type === "team" ? "py-4 shadow-lg shadow-amber-500/20" : "py-3"
              }`}
            >
              <span className={toast.type === "team" ? "text-2xl" : "text-lg"}>
                {ICONS[toast.type]}
              </span>
              <span className={`text-white/90 ${toast.type === "team" ? "text-base font-semibold" : "text-sm"}`}>
                {toast.message}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
