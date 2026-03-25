"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { StealAlert } from "@/types";

interface StealAlertOverlayProps {
  alert: StealAlert;
  onDismiss: () => void;
}

export default function StealAlertOverlay({ alert, onDismiss }: StealAlertOverlayProps) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-red-900/60 backdrop-blur-md px-4"
      >
        <motion.div
          initial={{ scale: 0.3, opacity: 0, rotate: -10 }}
          animate={{
            scale: 1,
            opacity: 1,
            rotate: 0,
            transition: { type: "spring", damping: 10, stiffness: 200 },
          }}
          exit={{ scale: 0.3, opacity: 0 }}
          className="text-center space-y-4 max-w-sm"
        >
          {/* Shake animation container */}
          <motion.div
            animate={{
              x: [0, -10, 10, -10, 10, -5, 5, 0],
              transition: { duration: 0.6, delay: 0.3 },
            }}
          >
            <span className="text-8xl block mb-2">🦹</span>
            <h2 className="text-3xl font-black text-white drop-shadow-[0_0_20px_rgba(255,0,0,0.5)]">
              VOL !
            </h2>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0, transition: { delay: 0.4 } }}
            className="space-y-2"
          >
            <p className="text-xl font-bold text-white">
              <span className="text-red-300">{alert.thiefUsername}</span> t&apos;a volé
            </p>
            <motion.p
              initial={{ scale: 0 }}
              animate={{ scale: 1, transition: { delay: 0.6, type: "spring", damping: 8 } }}
              className="text-5xl font-black text-red-400 drop-shadow-[0_0_30px_rgba(255,0,0,0.4)]"
            >
              -{alert.amount} T$
            </motion.p>
          </motion.div>

          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { delay: 1.2 } }}
            onClick={onDismiss}
            className="mt-6 px-8 py-3 rounded-xl bg-white/10 border border-white/20 text-white font-bold text-lg hover:bg-white/20 transition-colors"
          >
            OK
          </motion.button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
