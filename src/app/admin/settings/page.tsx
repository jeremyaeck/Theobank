"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AuthGuard from "@/components/layout/AuthGuard";
import Navbar from "@/components/layout/Navbar";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { motion } from "framer-motion";
import type { Team, User } from "@/types";

export default function AdminSettingsPage() {
  const { token } = useAuth();
  const { addToast } = useToast();
  const [resetting, setResetting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState<Team[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [newTeamName, setNewTeamName] = useState("");
  const [randomTeamCount, setRandomTeamCount] = useState(2);
  const [randomPrefix, setRandomPrefix] = useState("Équipe");
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [savingTeam, setSavingTeam] = useState(false);

  const approvedUsers = useMemo(() => users.filter((u) => u.approved), [users]);
  const selectedTeam = useMemo(() => teams.find((t) => t.id === selectedTeamId), [teams, selectedTeamId]);

  const fetchData = () => {
    if (!token) return;
    setLoading(true);
    Promise.allSettled([
      fetch("/api/admin/users", { headers: { Authorization: `Bearer ${token}` } }),
      fetch("/api/admin/teams", { headers: { Authorization: `Bearer ${token}` } }),
    ])
      .then(async ([usersRes, teamsRes]) => {
        if (usersRes.status === "fulfilled" && usersRes.value.ok) {
          const uData = await usersRes.value.json();
          setUsers(uData.users || []);
        }

        if (teamsRes.status === "fulfilled" && teamsRes.value.ok) {
          const tData = await teamsRes.value.json();
          setTeams(tData.teams || []);
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!selectedTeamId) return;
    const team = teams.find((t) => t.id === selectedTeamId);
    if (!team) {
      setSelectedTeamId("");
      setSelectedMemberIds([]);
      return;
    }
    setSelectedMemberIds(team.members.map((m) => m.id));
  }, [teams, selectedTeamId]);

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

  const handleCreateTeam = async () => {
    const name = newTeamName.trim();
    if (name.length < 2) {
      addToast("Nom d'équipe trop court", "error");
      return;
    }
    setSavingTeam(true);
    try {
      const res = await fetch("/api/admin/teams", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: "create", name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      setTeams(data.teams || []);
      setNewTeamName("");
      addToast("Équipe créée", "success");
    } catch (err: any) {
      addToast(err.message || "Erreur de création", "error");
    } finally {
      setSavingTeam(false);
    }
  };

  const handleRandomize = async () => {
    if (!confirm("Générer des équipes aléatoires ? Les équipes actuelles seront remplacées.")) return;
    setSavingTeam(true);
    try {
      const res = await fetch("/api/admin/teams", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: "randomize",
          teamCount: randomTeamCount,
          prefix: randomPrefix.trim() || "Équipe",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      setTeams(data.teams || []);
      setSelectedTeamId("");
      setSelectedMemberIds([]);
      addToast("Équipes générées aléatoirement", "success");
    } catch (err: any) {
      addToast(err.message || "Erreur de génération", "error");
    } finally {
      setSavingTeam(false);
    }
  };

  const toggleMember = (userId: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const saveTeamMembers = async () => {
    if (!selectedTeamId) {
      addToast("Choisissez une équipe", "error");
      return;
    }
    setSavingTeam(true);
    try {
      const res = await fetch("/api/admin/teams", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ teamId: selectedTeamId, userIds: selectedMemberIds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      setTeams(data.teams || []);
      addToast("Membres de l'équipe mis à jour", "success");
    } catch (err: any) {
      addToast(err.message || "Erreur de sauvegarde", "error");
    } finally {
      setSavingTeam(false);
    }
  };

  const deleteTeam = async (teamId: string) => {
    if (!confirm("Supprimer cette équipe ?")) return;
    setSavingTeam(true);
    try {
      const res = await fetch("/api/admin/teams", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ teamId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      setTeams(data.teams || []);
      if (selectedTeamId === teamId) {
        setSelectedTeamId("");
        setSelectedMemberIds([]);
      }
      addToast("Équipe supprimée", "success");
    } catch (err: any) {
      addToast(err.message || "Erreur de suppression", "error");
    } finally {
      setSavingTeam(false);
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

          <div className="glass p-4 space-y-4">
            <p className="text-sm font-medium text-white/90">Équipes</p>

            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
              <input
                type="text"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-cyan-500/50"
                placeholder="Nom d'équipe"
              />
              <button
                onClick={handleCreateTeam}
                disabled={savingTeam || loading}
                className="px-3 py-2 rounded-xl text-sm bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/30 disabled:opacity-50"
              >
                Créer équipe
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr_auto] gap-2">
              <input
                type="number"
                min={2}
                max={20}
                value={randomTeamCount}
                onChange={(e) => setRandomTeamCount(Number(e.target.value))}
                className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-orange-500/50"
                title="Nombre d'équipes"
              />
              <input
                type="text"
                value={randomPrefix}
                onChange={(e) => setRandomPrefix(e.target.value)}
                className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-orange-500/50"
                placeholder="Préfixe (ex: Équipe)"
              />
              <button
                onClick={handleRandomize}
                disabled={savingTeam || loading}
                className="px-3 py-2 rounded-xl text-sm bg-orange-500/15 border border-orange-500/30 text-orange-300 hover:bg-orange-500/25 disabled:opacity-50"
              >
                Aléatoire
              </button>
            </div>

            <p className="text-xs text-white/50">
              Le bouton aléatoire recrée toutes les équipes à partir des joueurs approuvés.
            </p>
          </div>

          <div className="glass p-4 space-y-3">
            <p className="text-sm font-medium text-white/90">Membres par équipe</p>
            {loading ? (
              <p className="text-sm text-white/50">Chargement...</p>
            ) : teams.length === 0 ? (
              <p className="text-sm text-white/50">Aucune équipe créée.</p>
            ) : (
              <div className="space-y-2">
                {teams.map((team) => (
                  <div key={team.id} className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedTeamId(team.id)}
                      className={`flex-1 text-left px-3 py-2 rounded-lg text-sm border transition-all ${
                        selectedTeamId === team.id
                          ? "bg-purple-500/20 border-purple-500/40 text-purple-200"
                          : "bg-white/5 border-white/10 text-white/80 hover:bg-white/10"
                      }`}
                    >
                      {team.name} ({team.members.length})
                    </button>
                    <button
                      onClick={() => deleteTeam(team.id)}
                      disabled={savingTeam}
                      className="px-2.5 py-2 rounded-lg text-xs bg-red-500/10 border border-red-500/30 text-red-300 hover:bg-red-500/20 disabled:opacity-50"
                    >
                      Suppr.
                    </button>
                  </div>
                ))}
              </div>
            )}

            {selectedTeam && (
              <div className="space-y-3 pt-2 border-t border-white/10">
                <p className="text-xs text-white/60">
                  Équipe sélectionnée: <span className="text-white/90">{selectedTeam.name}</span>
                </p>
                <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                  {approvedUsers.map((u) => (
                    <label key={u.id} className="flex items-center justify-between gap-3 bg-white/5 rounded-lg px-3 py-2">
                      <span className="text-sm text-white/80">{u.username}</span>
                      <input
                        type="checkbox"
                        checked={selectedMemberIds.includes(u.id)}
                        onChange={() => toggleMember(u.id)}
                        className="w-4 h-4 rounded border-white/20 bg-white/5 text-cyan-500 focus:ring-cyan-500/40"
                      />
                    </label>
                  ))}
                </div>
                <button
                  onClick={saveTeamMembers}
                  disabled={savingTeam}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-600 text-white text-sm font-bold hover:opacity-90 disabled:opacity-50"
                >
                  Sauvegarder les membres
                </button>
              </div>
            )}
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
