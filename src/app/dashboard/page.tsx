"use client";

import AuthGuard from "@/components/layout/AuthGuard";
import Navbar from "@/components/layout/Navbar";
import BalanceDisplay from "@/components/dashboard/BalanceDisplay";
import ActiveDuels from "@/components/dashboard/ActiveDuels";
import TransactionList from "@/components/dashboard/TransactionList";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { motion } from "framer-motion";

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <AuthGuard>
      <Navbar />
      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <BalanceDisplay balance={user?.balance || 0} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Link
            href="/duels/new"
            className="block w-full py-4 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-cyan-600 text-white text-center text-lg font-bold hover:opacity-90 transition-opacity shadow-lg shadow-purple-500/20"
          >
            Défier un joueur
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <ActiveDuels />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <TransactionList />
        </motion.div>
      </main>
    </AuthGuard>
  );
}
