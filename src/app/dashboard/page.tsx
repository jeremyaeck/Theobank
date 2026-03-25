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
          <div className="flex gap-3">
            <Link
              href="/duels/new"
              className="flex-1 py-5 rounded-2xl bg-gradient-to-br from-purple-600 via-pink-600 to-cyan-600 text-white text-center font-bold hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-purple-500/25 border border-white/10"
            >
              <span className="text-2xl block mb-1">⚔️</span>
              <span className="text-base">Défier</span>
            </Link>
            <Link
              href="/auctions"
              className="flex-1 py-5 rounded-2xl bg-gradient-to-br from-amber-600 via-orange-600 to-red-600 text-white text-center font-bold hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-orange-500/25 border border-white/10"
            >
              <span className="text-2xl block mb-1">🔨</span>
              <span className="text-base">Enchérir</span>
            </Link>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <Link
            href="/bonuses"
            className="block w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white text-center font-bold hover:scale-[1.01] active:scale-[0.99] transition-all shadow-lg shadow-emerald-500/25 border border-white/10"
          >
            <span className="text-xl mr-2">🎁</span>
            <span className="text-base">Bonus</span>
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
