"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { formatTD, getInitials, getAvatarColor } from "@/lib/utils";

export default function Navbar() {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <nav className="glass sticky top-4 z-40 mx-4 mt-4 px-4 py-3 flex items-center justify-between">
      <Link href={user.isAdmin ? "/admin" : "/dashboard"} className="flex items-center gap-2">
        <span className="text-2xl font-bold gradient-text">T$</span>
        <span className="text-sm text-white/60 hidden sm:inline">Theobank</span>
      </Link>

      <div className="flex items-center gap-3">
        {!user.isAdmin && (
          <span className="text-sm font-semibold text-cyan-400">
            {formatTD(user.balance)}
          </span>
        )}

        {user.isAdmin && (
          <>
            <span className="text-xs px-2 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
              Admin
            </span>
            <Link
              href="/admin/settings"
              className="text-xs px-2 py-1 rounded-full bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 transition-all"
            >
              ⚙️ Settings
            </Link>
          </>
        )}

        {/* Avatar / profile link (players only) */}
        {user.isAdmin ? (
          <span className="text-sm text-white/70">{user.username}</span>
        ) : (
          <Link href="/profile" className="flex items-center gap-2 hover:opacity-80 transition-opacity" title="Mon profil">
            {user.profilePhotoUrl ? (
              <img
                src={user.profilePhotoUrl}
                alt={user.username}
                className="w-8 h-8 rounded-full object-cover border border-white/20"
              />
            ) : (
              <div
                className={`w-8 h-8 rounded-full bg-gradient-to-br ${getAvatarColor(user.username)} flex items-center justify-center text-xs font-bold text-white`}
              >
                {getInitials(user.username)}
              </div>
            )}
            <span className="text-sm text-white/70 hidden sm:inline">{user.username}</span>
          </Link>
        )}

        <button
          onClick={logout}
          className="text-white/40 hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-white/5"
          title="Se déconnecter"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
      </div>
    </nav>
  );
}
