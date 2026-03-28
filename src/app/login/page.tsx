"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { motion } from "framer-motion";
import { startAuthentication } from "@simplewebauthn/browser";

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(username, password);
    } catch (err: any) {
      setError(err.message || "Erreur de connexion");
    } finally {
      setLoading(false);
    }
  };

  const handleBiometric = async () => {
    if (!username.trim()) {
      setError("Entrez votre nom d'utilisateur d'abord");
      return;
    }
    setError("");
    setBiometricLoading(true);
    try {
      // Get options
      const optRes = await fetch("/api/auth/webauthn/login-options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim() }),
      });
      const { options, challengeToken, error: optErr } = await optRes.json();
      if (!optRes.ok) throw new Error(optErr || "Face ID non configuré");

      // Trigger Face ID / Touch ID
      const credential = await startAuthentication({ optionsJSON: options });

      // Verify
      const verRes = await fetch("/api/auth/webauthn/login-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential, challengeToken }),
      });
      const data = await verRes.json();
      if (!verRes.ok) throw new Error(data.error || "Authentification échouée");

      // Store token and redirect (page reload picks up from localStorage)
      localStorage.setItem("token", data.token);
      window.location.href = data.user.isAdmin ? "/admin" : data.user.approved ? "/dashboard" : "/pending";
    } catch (e: any) {
      if (e.name === "NotAllowedError") {
        // User cancelled
      } else {
        setError(e.message || "Authentification biométrique échouée");
      }
    } finally {
      setBiometricLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-8">
          <h1 className="text-5xl font-black gradient-text mb-2">T$</h1>
          <p className="text-xl font-semibold text-white/80">Theobank</p>
          <p className="text-sm text-white/40 mt-1">Connectez-vous pour jouer</p>
        </div>

        <form onSubmit={handleSubmit} className="glass-strong p-6 space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-2 text-sm text-red-300">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm text-white/60 mb-1">Nom d&apos;utilisateur</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30 transition-all"
              placeholder="Votre pseudo"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-white/60 mb-1">Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30 transition-all"
              placeholder="Votre mot de passe"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-600 text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? "Connexion..." : "Se connecter"}
          </button>

          <div className="relative flex items-center gap-3">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-xs text-white/30">ou</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          <button
            type="button"
            onClick={handleBiometric}
            disabled={biometricLoading}
            className="w-full py-3 rounded-xl bg-white/5 border border-white/15 text-white/70 font-medium hover:bg-white/10 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            {biometricLoading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white/70 rounded-full animate-spin" />
            ) : (
              <span className="text-lg">🔐</span>
            )}
            {biometricLoading ? "Vérification..." : "Connexion avec Face ID / Touch ID"}
          </button>

          <p className="text-center text-sm text-white/40">
            Pas encore de compte ?{" "}
            <Link href="/signup" className="text-cyan-400 hover:text-cyan-300 transition-colors">
              S&apos;inscrire
            </Link>
          </p>
        </form>
      </motion.div>
    </div>
  );
}
