"use client";

import Link from "next/link";
import { useState } from "react";
import AuthGuard from "@/components/layout/AuthGuard";
import Navbar from "@/components/layout/Navbar";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { motion } from "framer-motion";

export default function AdminSettingsPage() {
  const { token } = useAuth();
  const { addToast } = useToast();
  const [resetting, setResetting] = useState(false);

  const handleReset = async () => {
    if (!confirm("Réinitialiser TOUS les soldes à 50 T$ et annuler les duels actifs ?")) return;
    setResetting(true);
    try {
      const res = await fetch("/api/admin/reset", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Erreur");
      addToast("Tous les soldes ont été réinitialisés", "success");
    } catch {
      addToast("Erreur de réinitialisation", "error");
    } finally {
      setResetting(false);
    }
  };

  return (
    <AuthGuard requireAdmin>
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-white/90">Settings Admin</h1>
            <Link
              href="/admin"
              className="px-3 py-2 rounded-lg text-sm bg-white/5 border border-white/10 text-white/70 hover:bg-white/10"
            >
              Retour Admin
            </Link>
          </div>

          <div className="glass p-4 space-y-3 border border-red-500/20">
            <p className="text-sm font-medium text-red-300">Actions dangereuses</p>
            <p className="text-xs text-white/50">
              Cette action remet tous les soldes non-admin à 50 T$ et annule les duels actifs/en attente.
            </p>

            <button
              onClick={handleReset}
              disabled={resetting}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-red-500/10 border border-red-500/30 text-red-300 hover:bg-red-500/20 disabled:opacity-50 transition-all"
            >
              {resetting ? "Réinitialisation..." : "Reset tout"}
            </button>
          </div>
        </motion.div>
      </main>
    </AuthGuard>
  );
}
