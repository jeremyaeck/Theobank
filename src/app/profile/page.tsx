"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { startRegistration, startAuthentication } from "@simplewebauthn/browser";
import AuthGuard from "@/components/layout/AuthGuard";
import Navbar from "@/components/layout/Navbar";
import CameraModal from "@/components/profile/CameraModal";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { getInitials, getAvatarColor } from "@/lib/utils";
import Link from "next/link";

export default function ProfilePage() {
  const { user, token, refreshUser } = useAuth();
  const { addToast } = useToast();
  const [showCamera, setShowCamera] = useState(false);
  const [savingPhoto, setSavingPhoto] = useState(false);
  const [webAuthnLoading, setWebAuthnLoading] = useState(false);

  const handlePhotoCapture = async (dataUrl: string) => {
    setShowCamera(false);
    setSavingPhoto(true);
    try {
      const res = await fetch("/api/profile/photo", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ photoDataUrl: dataUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await refreshUser();
      addToast("Photo de profil mise à jour !", "success");
    } catch (e: any) {
      addToast(e.message || "Erreur", "error");
    } finally {
      setSavingPhoto(false);
    }
  };

  const handleRemovePhoto = async () => {
    if (!confirm("Supprimer la photo de profil ?")) return;
    try {
      await fetch("/api/profile/photo", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      await refreshUser();
      addToast("Photo supprimée", "success");
    } catch {
      addToast("Erreur", "error");
    }
  };

  const handleRegisterWebAuthn = async () => {
    setWebAuthnLoading(true);
    try {
      // Get options from server
      const optRes = await fetch("/api/auth/webauthn/register-options", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const { options, challengeToken } = await optRes.json();
      if (!optRes.ok) throw new Error(options.error);

      // Trigger Face ID / Touch ID / Windows Hello
      const credential = await startRegistration({ optionsJSON: options });

      // Verify on server
      const verRes = await fetch("/api/auth/webauthn/register-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ credential, challengeToken }),
      });
      const verData = await verRes.json();
      if (!verRes.ok) throw new Error(verData.error);

      await refreshUser();
      addToast("Face ID activé avec succès !", "success");
    } catch (e: any) {
      if (e.name === "NotAllowedError") {
        addToast("Annulé", "info");
      } else {
        addToast(e.message || "Erreur lors de l'activation", "error");
      }
    } finally {
      setWebAuthnLoading(false);
    }
  };

  const handleRemoveWebAuthn = async () => {
    if (!confirm("Désactiver Face ID pour ce compte ?")) return;
    try {
      await fetch("/api/auth/webauthn/register-options", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      await refreshUser();
      addToast("Face ID désactivé", "success");
    } catch {
      addToast("Erreur", "error");
    }
  };

  return (
    <AuthGuard>
      <Navbar />
      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-4">
            <Link href="/dashboard" className="text-white/40 hover:text-white/70 transition-colors">
              ← Retour
            </Link>
            <h1 className="text-xl font-bold text-white/90">Mon profil</h1>
          </div>

          {/* Avatar section */}
          <div className="glass p-6 rounded-2xl flex flex-col items-center gap-4">
            <div className="relative">
              {user?.profilePhotoUrl ? (
                <img
                  src={user.profilePhotoUrl}
                  alt="Photo de profil"
                  className="w-24 h-24 rounded-full object-cover border-2 border-white/20 shadow-lg"
                />
              ) : (
                <div
                  className={`w-24 h-24 rounded-full bg-gradient-to-br ${getAvatarColor(user?.username || "")} flex items-center justify-center text-2xl font-bold text-white shadow-lg`}
                >
                  {getInitials(user?.username || "")}
                </div>
              )}
              {savingPhoto && (
                <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                </div>
              )}
            </div>

            <p className="text-lg font-bold text-white/90">{user?.username}</p>

            <div className="flex gap-3 w-full">
              <button
                onClick={() => setShowCamera(true)}
                disabled={savingPhoto}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-600 text-white font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity text-sm"
              >
                📸 {user?.profilePhotoUrl ? "Changer la photo" : "Ajouter une photo"}
              </button>
              {user?.profilePhotoUrl && (
                <button
                  onClick={handleRemovePhoto}
                  className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 hover:bg-red-500/20 transition-colors text-sm"
                >
                  Supprimer
                </button>
              )}
            </div>
          </div>

          {/* Face ID section */}
          {!user?.isAdmin && (
            <div className="glass p-6 rounded-2xl space-y-4 mt-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🔐</span>
                <div>
                  <p className="font-semibold text-white/90">Connexion biométrique</p>
                  <p className="text-xs text-white/50">Face ID, Touch ID ou empreinte digitale</p>
                </div>
                {user?.hasWebAuthn && (
                  <span className="ml-auto px-2 py-1 rounded-full text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Activé
                  </span>
                )}
              </div>

              {user?.hasWebAuthn ? (
                <div className="space-y-3">
                  <p className="text-sm text-white/60">
                    La connexion biométrique est activée sur cet appareil. Tu peux te connecter sans mot de passe depuis la page de connexion.
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={handleRegisterWebAuthn}
                      disabled={webAuthnLoading}
                      className="flex-1 py-2.5 rounded-xl bg-white/10 text-white/70 text-sm font-medium hover:bg-white/15 disabled:opacity-50 transition-colors"
                    >
                      Réenregistrer sur cet appareil
                    </button>
                    <button
                      onClick={handleRemoveWebAuthn}
                      className="px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm hover:bg-red-500/20 transition-colors"
                    >
                      Désactiver
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-white/60">
                    Active la connexion biométrique pour te connecter rapidement sans saisir ton mot de passe.
                  </p>
                  <button
                    onClick={handleRegisterWebAuthn}
                    disabled={webAuthnLoading}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
                  >
                    {webAuthnLoading ? "Activation..." : "🔐 Activer Face ID / Touch ID"}
                  </button>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </main>

      <AnimatePresence>
        {showCamera && (
          <CameraModal
            onCapture={handlePhotoCapture}
            onClose={() => setShowCamera(false)}
          />
        )}
      </AnimatePresence>
    </AuthGuard>
  );
}
