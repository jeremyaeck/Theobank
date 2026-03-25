"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import type { Transaction } from "@/types";
import { motion, AnimatePresence } from "framer-motion";

const TYPE_LABELS: Record<string, { label: string; icon: string }> = {
  INITIAL_BALANCE: { label: "Solde initial", icon: "🎁" },
  DUEL_LOCK: { label: "Mise bloquée", icon: "🔒" },
  DUEL_WIN: { label: "Victoire", icon: "🏆" },
  DUEL_REFUND: { label: "Remboursement", icon: "↩️" },
  ADMIN_CREDIT: { label: "Crédit Banque", icon: "🏦" },
  ADMIN_DEBIT: { label: "Débit Banque", icon: "🏦" },
  ADMIN_RESET: { label: "Réinitialisation", icon: "🔄" },
  AUCTION_BID: { label: "Enchère", icon: "🔨" },
  BONUS_STEAL_GAIN: { label: "Vol (gain)", icon: "🦹" },
  BONUS_STEAL_LOSS: { label: "Vol (perte)", icon: "😱" },
};

export default function TransactionList() {
  const { token } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    fetch("/api/transactions", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => setTransactions(d.transactions || []))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="glass p-6">
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-white/5 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="glass p-6">
      <h2 className="text-lg font-semibold text-white/80 mb-4">Historique</h2>
      {transactions.length === 0 ? (
        <p className="text-white/40 text-sm text-center py-4">Aucune transaction</p>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          <AnimatePresence>
            {transactions.map((tx) => {
              const info = TYPE_LABELS[tx.type] || { label: tx.type, icon: "💰" };
              return (
                <motion.div
                  key={tx.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{info.icon}</span>
                    <div>
                      <p className="text-sm text-white/80">{info.label}</p>
                      <p className="text-xs text-white/40">
                        {new Date(tx.createdAt).toLocaleString("fr-FR", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`font-mono font-bold text-sm ${
                      tx.amount >= 0 ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    {tx.amount >= 0 ? "+" : ""}
                    {tx.amount} T$
                  </span>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
