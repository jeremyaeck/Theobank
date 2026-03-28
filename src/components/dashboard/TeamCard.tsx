"use client";

import { useSocket } from "@/context/SocketContext";

const COLORS = [
  "from-purple-500 to-pink-500",
  "from-cyan-500 to-blue-500",
  "from-emerald-500 to-teal-500",
  "from-orange-500 to-amber-500",
  "from-red-500 to-pink-500",
  "from-indigo-500 to-purple-500",
];

function avatarColor(username: string) {
  let hash = 0;
  for (let i = 0; i < username.length; i++) hash = username.charCodeAt(i) + ((hash << 5) - hash);
  return COLORS[Math.abs(hash) % COLORS.length];
}

export default function TeamCard() {
  const { currentTeam } = useSocket();

  if (!currentTeam) return null;

  return (
    <div className="glass p-4 rounded-2xl border border-amber-400/20 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-lg">🏆</span>
        <span className="text-sm font-semibold text-white/90">Mon équipe</span>
        <span className="ml-auto px-2 py-0.5 rounded-full text-xs bg-gradient-to-r from-amber-500/20 to-yellow-500/10 border border-amber-400/30 text-amber-200 font-semibold">
          {currentTeam.name}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {currentTeam.members.map((m) => (
          <div key={m.id} className="flex items-center gap-1.5">
            <div
              className={`w-7 h-7 rounded-full bg-gradient-to-br ${avatarColor(m.username)} flex items-center justify-center text-xs font-bold text-white shadow`}
            >
              {m.username.slice(0, 1).toUpperCase()}
            </div>
            <span className="text-xs text-white/70">{m.username}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
