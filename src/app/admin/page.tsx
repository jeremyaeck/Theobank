"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import AuthGuard from "@/components/layout/AuthGuard";
import Navbar from "@/components/layout/Navbar";
import { motion, AnimatePresence } from "framer-motion";
import { getInitials, getAvatarColor, formatTD } from "@/lib/utils";
import type { User, Duel, AuctionPhase, Team } from "@/types";

export default function AdminPage() {
  const { token } = useAuth();
  const { addToast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [duels, setDuels] = useState<Duel[]>([]);
  const [auctionPhases, setAuctionPhases] = useState<AuctionPhase[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [renamingTeamId, setRenamingTeamId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [newTeamName, setNewTeamName] = useState("");
  const [randomTeamCount, setRandomTeamCount] = useState(2);
  const [randomPrefix, setRandomPrefix] = useState("Équipe");
  const [savingTeam, setSavingTeam] = useState(false);
  const [teamMemberIds, setTeamMemberIds] = useState<string[]>([]);
  const [tab, setTab] = useState<"players" | "duels" | "auctions" | "teams">("players");
  const [loading, setLoading] = useState(true);

  // Credit/debit modal
  const [modalUser, setModalUser] = useState<User | null>(null);
  const [modalAmount, setModalAmount] = useState(10);
  const [modalReason, setModalReason] = useState("");
  const [acting, setActing] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [bulkAmount, setBulkAmount] = useState(10);
  const [bulkReason, setBulkReason] = useState("");
  const [bulkActing, setBulkActing] = useState(false);

  const fetchData = () => {
    if (!token) return;
    Promise.allSettled([
      fetch("/api/admin/users", { headers: { Authorization: `Bearer ${token}` } }),
      fetch("/api/admin/duels", { headers: { Authorization: `Bearer ${token}` } }),
      fetch("/api/auctions", { headers: { Authorization: `Bearer ${token}` } }),
      fetch("/api/admin/teams", { headers: { Authorization: `Bearer ${token}` } }),
    ])
      .then(async ([usersRes, duelsRes, auctionsRes, teamsRes]) => {
        if (usersRes.status === "fulfilled" && usersRes.value.ok) {
          const uData = await usersRes.value.json();
          setUsers(uData.users || []);
        }

        if (duelsRes.status === "fulfilled" && duelsRes.value.ok) {
          const dData = await duelsRes.value.json();
          setDuels(dData.duels || []);
        }

        if (auctionsRes.status === "fulfilled" && auctionsRes.value.ok) {
          const aData = await auctionsRes.value.json();
          setAuctionPhases(aData.phases || []);
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
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const userIdSet = new Set(users.map((u) => u.id));
    setSelectedUserIds((prev) => prev.filter((id) => userIdSet.has(id)));
  }, [users]);

  const handleCreditDebit = async (amount: number) => {
    if (!modalUser) return;
    setActing(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId: modalUser.id,
          amount,
          reason: modalReason || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      addToast(`${amount > 0 ? "Crédité" : "Débité"} ${Math.abs(amount)} T$ à ${modalUser.username}`, "success");
      setModalUser(null);
      setModalAmount(10);
      setModalReason("");
      fetchData();
    } catch (err: any) {
      addToast(err.message || "Erreur", "error");
    } finally {
      setActing(false);
    }
  };

  const approvedUsers = users.filter((u) => u.approved);
  const selectedTeam = teams.find((t) => t.id === selectedTeamId);

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const toggleSelectAllApproved = () => {
    if (selectedUserIds.length === approvedUsers.length) {
      setSelectedUserIds([]);
      return;
    }
    setSelectedUserIds(approvedUsers.map((u) => u.id));
  };

  const handleBulkCredit = async () => {
    if (selectedUserIds.length === 0) {
      addToast("Sélectionnez au moins un joueur", "error");
      return;
    }
    if (bulkAmount <= 0) {
      addToast("Le montant doit être supérieur à 0", "error");
      return;
    }

    setBulkActing(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userIds: selectedUserIds,
          amount: bulkAmount,
          reason: bulkReason || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      addToast(`${data.count} joueur(s) crédité(s) de ${bulkAmount} T$`, "success");
      setSelectedUserIds([]);
      setBulkAmount(10);
      setBulkReason("");
      fetchData();
    } catch (err: any) {
      addToast(err.message || "Erreur", "error");
    } finally {
      setBulkActing(false);
    }
  };

  const selectedTeamObj = teams.find((t) => t.id === selectedTeamId);

  // Sync teamMemberIds when selected team changes
  const handleSelectTeam = (teamId: string) => {
    setSelectedTeamId(teamId);
    const team = teams.find((t) => t.id === teamId);
    setTeamMemberIds(team ? team.members.map((m) => m.id) : []);
    setRenamingTeamId(null);
  };

  const handleCreateTeam = async () => {
    const name = newTeamName.trim();
    if (name.length < 2) { addToast("Nom trop court", "error"); return; }
    setSavingTeam(true);
    try {
      const res = await fetch("/api/admin/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "create", name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      setTeams(data.teams || []);
      setNewTeamName("");
      addToast("Équipe créée", "success");
    } catch (err: any) { addToast(err.message || "Erreur", "error"); }
    finally { setSavingTeam(false); }
  };

  const handleRandomize = async () => {
    if (!confirm("Générer des équipes aléatoires ? Les équipes actuelles seront remplacées.")) return;
    setSavingTeam(true);
    try {
      const res = await fetch("/api/admin/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "randomize", teamCount: randomTeamCount, prefix: randomPrefix.trim() || "Équipe" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      setTeams(data.teams || []);
      setSelectedTeamId("");
      setTeamMemberIds([]);
      addToast("Équipes générées aléatoirement", "success");
    } catch (err: any) { addToast(err.message || "Erreur", "error"); }
    finally { setSavingTeam(false); }
  };

  const handleRenameTeam = async (teamId: string) => {
    const name = renameValue.trim();
    if (name.length < 2) { addToast("Nom trop court", "error"); return; }
    setSavingTeam(true);
    try {
      const res = await fetch("/api/admin/teams", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ teamId, name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      setTeams(data.teams || []);
      setRenamingTeamId(null);
      setRenameValue("");
      addToast("Équipe renommée", "success");
    } catch (err: any) { addToast(err.message || "Erreur", "error"); }
    finally { setSavingTeam(false); }
  };

  const handleSaveTeamMembers = async () => {
    if (!selectedTeamId) { addToast("Choisissez une équipe", "error"); return; }
    setSavingTeam(true);
    try {
      const res = await fetch("/api/admin/teams", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ teamId: selectedTeamId, userIds: teamMemberIds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      setTeams(data.teams || []);
      addToast("Membres mis à jour", "success");
    } catch (err: any) { addToast(err.message || "Erreur", "error"); }
    finally { setSavingTeam(false); }
  };

  const handleDeleteTeam = async (teamId: string) => {
    if (!confirm("Supprimer cette équipe ?")) return;
    setSavingTeam(true);
    try {
      const res = await fetch("/api/admin/teams", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ teamId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      setTeams(data.teams || []);
      if (selectedTeamId === teamId) { setSelectedTeamId(""); setTeamMemberIds([]); }
      addToast("Équipe supprimée", "success");
    } catch (err: any) { addToast(err.message || "Erreur", "error"); }
    finally { setSavingTeam(false); }
  };

  // Users sorted: team members first when a team is selected
  const sortedApprovedUsers = selectedTeamObj
    ? [
        ...approvedUsers.filter((u) => selectedTeamObj.members.some((m) => m.id === u.id)),
        ...approvedUsers.filter((u) => !selectedTeamObj.members.some((m) => m.id === u.id)),
      ]
    : approvedUsers;

  const applyTeamSelection = () => {
    if (!selectedTeam) {
      addToast("Choisissez une équipe", "error");
      return;
    }
    const approvedSet = new Set(approvedUsers.map((u) => u.id));
    const teamMemberIds = selectedTeam.members.map((m) => m.id).filter((id) => approvedSet.has(id));
    setSelectedUserIds(teamMemberIds);
    addToast(`${selectedTeam.name} appliquée (${teamMemberIds.length} joueur(s))`, "success");
  };

  const totalBalance = users.reduce((s, u) => s + u.balance, 0);

  const STATUS_COLORS: Record<string, string> = {
    PENDING: "text-yellow-400",
    ACTIVE: "text-blue-400",
    COMPLETED: "text-green-400",
    CANCELLED: "text-red-400",
  };

  return (
    <AuthGuard requireAdmin>
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold text-white/90 mb-2">Panel Admin — Banque</h1>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="glass p-4 text-center">
              <p className="text-2xl font-bold text-cyan-400">{users.length}</p>
              <p className="text-xs text-white/40">Joueurs</p>
            </div>
            <div className="glass p-4 text-center">
              <p className="text-2xl font-bold text-purple-400">{formatTD(totalBalance)}</p>
              <p className="text-xs text-white/40">Total en jeu</p>
            </div>
            <div className="glass p-4 text-center">
              <p className="text-2xl font-bold text-pink-400">
                {duels.filter((d) => d.status === "ACTIVE" || d.status === "PENDING").length}
              </p>
              <p className="text-xs text-white/40">Duels actifs</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setTab("players")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === "players"
                  ? "bg-purple-500/20 border border-purple-500/40 text-purple-300"
                  : "bg-white/5 text-white/50 hover:bg-white/10"
              }`}
            >
              Joueurs
            </button>
            <button
              onClick={() => setTab("duels")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === "duels"
                  ? "bg-purple-500/20 border border-purple-500/40 text-purple-300"
                  : "bg-white/5 text-white/50 hover:bg-white/10"
              }`}
            >
              Duels
            </button>
            <button
              onClick={() => setTab("auctions")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === "auctions"
                  ? "bg-orange-500/20 border border-orange-500/40 text-orange-300"
                  : "bg-white/5 text-white/50 hover:bg-white/10"
              }`}
            >
              Enchères
            </button>
            <button
              onClick={() => setTab("teams")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === "teams"
                  ? "bg-amber-500/20 border border-amber-500/40 text-amber-300"
                  : "bg-white/5 text-white/50 hover:bg-white/10"
              }`}
            >
              Équipes
            </button>
          </div>

          {/* Players tab */}
          {tab === "players" && (
            <div className="space-y-2">
              <div className="glass p-4 space-y-3 mb-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-white/80">
                    Envoi groupé Banque
                  </p>
                  <button
                    onClick={toggleSelectAllApproved}
                    disabled={approvedUsers.length === 0}
                    className="px-3 py-1.5 rounded-lg text-xs bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 disabled:opacity-50"
                  >
                    {selectedUserIds.length === approvedUsers.length
                      ? "Tout désélectionner"
                      : "Tout sélectionner"}
                  </button>
                </div>
                <p className="text-xs text-white/50">
                  {selectedUserIds.length} joueur(s) sélectionné(s)
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
                  <select
                    value={selectedTeamId}
                    onChange={(e) => setSelectedTeamId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500/50"
                  >
                    <option value="">Choisir une équipe...</option>
                    {teams.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name} ({team.members.length})
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={applyTeamSelection}
                    disabled={!selectedTeamId}
                    className="px-3 py-2 rounded-xl text-sm bg-orange-500/15 border border-orange-500/30 text-orange-300 hover:bg-orange-500/25 disabled:opacity-50"
                  >
                    Appliquer équipe
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-white/60">Montant unique</label>
                    <input
                      type="number"
                      min={1}
                      value={bulkAmount}
                      onChange={(e) => setBulkAmount(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500/50 mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-white/60">Raison (optionnel)</label>
                    <input
                      type="text"
                      value={bulkReason}
                      onChange={(e) => setBulkReason(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500/50 mt-1"
                      placeholder="Ex: Prime d'équipe"
                    />
                  </div>
                </div>

                <button
                  onClick={handleBulkCredit}
                  disabled={bulkActing || selectedUserIds.length === 0 || bulkAmount <= 0}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white text-sm font-bold hover:opacity-90 disabled:opacity-50"
                >
                  Envoyer {bulkAmount} T$ à la sélection
                </button>
              </div>

              {loading ? (
                <div className="animate-pulse space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 bg-white/5 rounded-xl" />
                  ))}
                </div>
              ) : (
                users.map((u) => (
                  <motion.div
                    key={u.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="glass flex items-center justify-between px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-full bg-gradient-to-br ${getAvatarColor(
                          u.username
                        )} flex items-center justify-center text-sm font-bold text-white`}
                      >
                        {getInitials(u.username)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white/90">
                          {u.username}
                          {!u.approved && (
                            <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              En attente
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedUserIds.includes(u.id)}
                        onChange={() => toggleUserSelection(u.id)}
                        disabled={!u.approved}
                        className="w-4 h-4 rounded border-white/20 bg-white/5 text-cyan-500 focus:ring-cyan-500/40 disabled:opacity-40"
                      />
                      <span className="text-lg font-bold text-cyan-400">{u.balance} T$</span>
                      {!u.approved ? (
                        <button
                          onClick={async () => {
                            try {
                              const res = await fetch("/api/admin/approve", {
                                method: "POST",
                                headers: {
                                  "Content-Type": "application/json",
                                  Authorization: `Bearer ${token}`,
                                },
                                body: JSON.stringify({ userId: u.id }),
                              });
                              if (!res.ok) throw new Error();
                              addToast(`${u.username} approuvé — 50 T$ crédités`, "success");
                              fetchData();
                            } catch {
                              addToast("Erreur d'approbation", "error");
                            }
                          }}
                          className="px-3 py-1.5 rounded-lg bg-green-500/20 border border-green-500/30 text-green-300 text-sm hover:bg-green-500/30 transition-all"
                        >
                          Approuver
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setModalUser(u);
                            setModalAmount(10);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-purple-500/20 border border-purple-500/30 text-purple-300 text-sm hover:bg-purple-500/30 transition-all"
                        >
                          Gérer
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          )}

          {/* Duels tab */}
          {tab === "duels" && (
            <div className="space-y-2">
              {duels.length === 0 ? (
                <p className="text-white/40 text-center py-8">Aucun duel</p>
              ) : (
                duels.map((d) => (
                  <div key={d.id} className="glass px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm text-white/80">
                        {d.challenger.username} vs {d.opponent.username}
                      </p>
                      <p className="text-xs text-white/40">
                        {new Date(d.createdAt).toLocaleString("fr-FR")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-cyan-400">{d.betAmount} T$</p>
                      <p className={`text-xs ${STATUS_COLORS[d.status]}`}>{d.status}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
          {/* Teams tab */}
          {tab === "teams" && (
            <div className="space-y-4">
              {/* Create + Randomize */}
              <div className="glass p-4 space-y-3">
                <p className="text-sm font-medium text-white/80">Créer une équipe</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-cyan-500/50"
                    placeholder="Nom d'équipe"
                    onKeyDown={(e) => e.key === "Enter" && handleCreateTeam()}
                  />
                  <button
                    onClick={handleCreateTeam}
                    disabled={savingTeam}
                    className="px-3 py-2 rounded-xl text-sm bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/30 disabled:opacity-50"
                  >
                    Créer
                  </button>
                </div>

                <p className="text-sm font-medium text-white/80 pt-1">Équipes aléatoires</p>
                <div className="flex gap-2">
                  <input
                    type="number" min={2} max={20} value={randomTeamCount}
                    onChange={(e) => setRandomTeamCount(Number(e.target.value))}
                    className="w-20 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none"
                    title="Nombre d'équipes"
                  />
                  <input
                    type="text" value={randomPrefix}
                    onChange={(e) => setRandomPrefix(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none"
                    placeholder="Préfixe (ex: Équipe)"
                  />
                  <button
                    onClick={handleRandomize}
                    disabled={savingTeam}
                    className="px-3 py-2 rounded-xl text-sm bg-orange-500/15 border border-orange-500/30 text-orange-300 hover:bg-orange-500/25 disabled:opacity-50"
                  >
                    Aléatoire
                  </button>
                </div>
              </div>

              {/* Team list */}
              {teams.length === 0 ? (
                <p className="text-white/40 text-center py-4">Aucune équipe</p>
              ) : (
                <div className="glass p-4 space-y-3">
                  <p className="text-sm font-medium text-white/80">Équipes ({teams.length})</p>
                  <div className="space-y-1">
                    {teams.map((team) => (
                      <div key={team.id} className="space-y-1">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleSelectTeam(selectedTeamId === team.id ? "" : team.id)}
                            className={`flex-1 text-left px-3 py-2 rounded-lg text-sm border transition-all ${
                              selectedTeamId === team.id
                                ? "bg-amber-500/20 border-amber-500/40 text-amber-200"
                                : "bg-white/5 border-white/10 text-white/80 hover:bg-white/10"
                            }`}
                          >
                            {team.name} <span className="text-white/40">({team.members.length})</span>
                          </button>
                          <button
                            onClick={() => { setRenamingTeamId(renamingTeamId === team.id ? null : team.id); setRenameValue(team.name); }}
                            disabled={savingTeam}
                            className="px-2.5 py-2 rounded-lg text-xs bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/20 disabled:opacity-50"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDeleteTeam(team.id)}
                            disabled={savingTeam}
                            className="px-2.5 py-2 rounded-lg text-xs bg-red-500/10 border border-red-500/30 text-red-300 hover:bg-red-500/20 disabled:opacity-50"
                          >
                            ✕
                          </button>
                        </div>
                        {renamingTeamId === team.id && (
                          <div className="flex gap-2 pl-1">
                            <input
                              type="text" value={renameValue}
                              onChange={(e) => setRenameValue(e.target.value)}
                              className="flex-1 px-3 py-1.5 rounded-lg bg-white/5 border border-cyan-500/30 text-white text-sm focus:outline-none focus:border-cyan-500/60"
                              placeholder="Nouveau nom"
                              onKeyDown={(e) => e.key === "Enter" && handleRenameTeam(team.id)}
                            />
                            <button
                              onClick={() => handleRenameTeam(team.id)}
                              disabled={savingTeam}
                              className="px-3 py-1.5 rounded-lg text-xs bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/30 disabled:opacity-50"
                            >
                              OK
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Member editor for selected team */}
              {selectedTeamObj && (
                <div className="glass p-4 space-y-3">
                  <p className="text-sm font-medium text-white/80">
                    Membres — <span className="text-amber-300">{selectedTeamObj.name}</span>
                  </p>
                  <p className="text-xs text-white/40">Les membres de l&apos;équipe apparaissent en haut.</p>
                  <div className="max-h-80 overflow-y-auto space-y-1 pr-1">
                    {sortedApprovedUsers.map((u) => {
                      const isMember = selectedTeamObj.members.some((m) => m.id === u.id);
                      return (
                        <label
                          key={u.id}
                          className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2 cursor-pointer transition-colors ${
                            isMember ? "bg-amber-500/10 border border-amber-500/20" : "bg-white/5"
                          }`}
                        >
                          <span className={`text-sm ${isMember ? "text-amber-200 font-medium" : "text-white/70"}`}>
                            {isMember && "★ "}{u.username}
                          </span>
                          <input
                            type="checkbox"
                            checked={teamMemberIds.includes(u.id)}
                            onChange={() =>
                              setTeamMemberIds((prev) =>
                                prev.includes(u.id) ? prev.filter((id) => id !== u.id) : [...prev, u.id]
                              )
                            }
                            className="w-4 h-4 rounded border-white/20 bg-white/5 text-amber-500 focus:ring-amber-500/40"
                          />
                        </label>
                      );
                    })}
                  </div>
                  <button
                    onClick={handleSaveTeamMembers}
                    disabled={savingTeam}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 text-white text-sm font-bold hover:opacity-90 disabled:opacity-50"
                  >
                    Sauvegarder les membres
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Auctions tab */}
          {tab === "auctions" && (
            <div className="space-y-4">
              {auctionPhases.length === 0 ? (
                <p className="text-white/40 text-center py-8">Aucune phase d&apos;enchère</p>
              ) : (
                auctionPhases.map((phase) => {
                  const totalBids = phase.items.reduce(
                    (sum, item) => sum + (item.bids?.length || 0),
                    0
                  );
                  const totalAmount = phase.items.reduce(
                    (sum, item) =>
                      sum + (item.bids?.reduce((s, b) => s + b.amount, 0) || 0),
                    0
                  );
                  const uniqueBidders = new Set(
                    phase.items.flatMap((item) => item.bids?.map((b) => b.userId) || [])
                  ).size;

                  return (
                    <div key={phase.id} className="glass p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-white/90">
                          Phase {phase.phase}
                        </h3>
                        <span
                          className={`text-xs px-2 py-1 rounded-full font-medium ${
                            phase.status === "LOCKED"
                              ? "bg-white/5 text-white/40"
                              : phase.status === "ACTIVE"
                              ? "bg-green-500/10 text-green-400"
                              : "bg-purple-500/10 text-purple-400"
                          }`}
                        >
                          {phase.status === "LOCKED"
                            ? "Verrouillée"
                            : phase.status === "ACTIVE"
                            ? "En cours"
                            : "Terminée"}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {phase.items.map((item) => (
                          <div key={item.id} className="bg-white/5 rounded-lg p-2">
                            <p className="text-white/70 truncate">
                              {item.isMystery ? `🎁 ${item.name}` : item.name}
                            </p>
                            {phase.status === "FINISHED" && item.winner && (
                              <p className="text-yellow-400 text-[10px]">
                                🏆 {item.winner.username} ({item.winningBid} T$)
                              </p>
                            )}
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center justify-between text-xs text-white/40">
                        <span>{uniqueBidders} joueur(s) • {totalBids} mise(s) • {totalAmount} T$</span>
                      </div>

                      <div className="flex gap-2">
                        {phase.status === "LOCKED" && (
                          <button
                            onClick={async () => {
                              if (!confirm(`Lancer la phase ${phase.phase} ? (5 minutes)`)) return;
                              try {
                                const res = await fetch(
                                  `/api/admin/auctions/${phase.id}/start`,
                                  {
                                    method: "POST",
                                    headers: { Authorization: `Bearer ${token}` },
                                  }
                                );
                                if (!res.ok) throw new Error();
                                addToast(`Phase ${phase.phase} lancée !`, "success");
                                fetchData();
                              } catch {
                                addToast("Erreur", "error");
                              }
                            }}
                            className="flex-1 py-2 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 text-white text-sm font-bold hover:opacity-90"
                          >
                            Lancer la phase
                          </button>
                        )}
                        {phase.status === "ACTIVE" && (
                          <button
                            onClick={async () => {
                              if (!confirm(`Terminer la phase ${phase.phase} maintenant ?`)) return;
                              try {
                                const res = await fetch(
                                  `/api/admin/auctions/${phase.id}/resolve`,
                                  {
                                    method: "POST",
                                    headers: { Authorization: `Bearer ${token}` },
                                  }
                                );
                                if (!res.ok) throw new Error();
                                addToast(`Phase ${phase.phase} terminée !`, "success");
                                fetchData();
                              } catch {
                                addToast("Erreur", "error");
                              }
                            }}
                            className="flex-1 py-2 rounded-lg bg-gradient-to-r from-red-600 to-pink-600 text-white text-sm font-bold hover:opacity-90"
                          >
                            Terminer maintenant
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </motion.div>

        {/* Credit/Debit Modal */}
        <AnimatePresence>
          {modalUser && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
              onClick={() => setModalUser(null)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="glass-strong p-6 w-full max-w-sm space-y-4"
              >
                <h3 className="text-lg font-bold text-white/90">
                  Gérer — {modalUser.username}
                </h3>
                <p className="text-sm text-white/50">
                  Solde actuel: <span className="text-cyan-400 font-bold">{modalUser.balance} T$</span>
                </p>

                <div>
                  <label className="text-sm text-white/60">Montant</label>
                  <input
                    type="number"
                    value={modalAmount}
                    onChange={(e) => setModalAmount(Number(e.target.value))}
                    min={1}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500/50 mt-1"
                  />
                </div>

                <div>
                  <label className="text-sm text-white/60">Raison (optionnel)</label>
                  <input
                    type="text"
                    value={modalReason}
                    onChange={(e) => setModalReason(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-purple-500/50 mt-1"
                    placeholder="Ex: Enchère gagnée"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => handleCreditDebit(modalAmount)}
                    disabled={acting}
                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold hover:opacity-90 disabled:opacity-50"
                  >
                    + Créditer
                  </button>
                  <button
                    onClick={() => handleCreditDebit(-modalAmount)}
                    disabled={acting || modalAmount > modalUser.balance}
                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-red-600 to-pink-600 text-white font-bold hover:opacity-90 disabled:opacity-50"
                  >
                    - Débiter
                  </button>
                </div>

                <button
                  onClick={() => setModalUser(null)}
                  className="w-full py-2 text-sm text-white/40 hover:text-white/60 transition-colors"
                >
                  Annuler
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </AuthGuard>
  );
}
