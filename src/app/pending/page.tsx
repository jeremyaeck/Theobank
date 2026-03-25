"use client";

import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

export default function PendingPage() {
  const { user, token, refreshUser, logout } = useAuth();
  const router = useRouter();

  // Poll every 3 seconds to check if approved
  useEffect(() => {
    if (!token) {
      router.push("/login");
      return;
    }

    const interval = setInterval(async () => {
      await refreshUser();
    }, 3000);

    return () => clearInterval(interval);
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  // Redirect when approved
  useEffect(() => {
    if (user?.approved) {
      router.push("/dashboard");
    }
  }, [user?.approved, router]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm text-center"
      >
        <div className="mb-8">
          <h1 className="text-5xl font-black gradient-text mb-2">T$</h1>
          <p className="text-xl font-semibold text-white/80">Theobank</p>
        </div>

        <div className="glass-strong p-8 space-y-6">
          <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center">
            <motion.span
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="text-3xl"
            >
              ⏳
            </motion.span>
          </div>

          <div>
            <h2 className="text-lg font-bold text-white/90 mb-2">
              En attente de validation
            </h2>
            <p className="text-sm text-white/50">
              Votre inscription doit être validée par l&apos;administrateur.
              Vous recevrez <span className="text-cyan-400 font-bold">50 T$</span> une fois approuvé.
            </p>
          </div>

          <div className="flex items-center justify-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-xs text-white/40">Vérification en cours...</span>
          </div>
        </div>

        <button
          onClick={logout}
          className="mt-4 text-sm text-white/40 hover:text-white/60 transition-colors"
        >
          Se déconnecter
        </button>
      </motion.div>
    </div>
  );
}
