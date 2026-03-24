"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { formatTD } from "@/lib/utils";

export default function Navbar() {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <nav className="glass sticky top-0 z-40 mx-4 mt-4 px-4 py-3 flex items-center justify-between">
      <Link href={user.isAdmin ? "/admin" : "/dashboard"} className="flex items-center gap-2">
        <span className="text-2xl font-bold gradient-text">T$</span>
        <span className="text-sm text-white/60 hidden sm:inline">Theodollars Bank</span>
      </Link>

      <div className="flex items-center gap-3">
        {!user.isAdmin && (
          <>
            <span className="text-sm font-semibold text-cyan-400">
              {formatTD(user.balance)}
            </span>
            <Link
              href="/duels/new"
              className="bg-gradient-to-r from-purple-600 to-cyan-600 text-white text-sm font-medium px-3 py-1.5 rounded-lg hover:opacity-90 transition-opacity"
            >
              Défier
            </Link>
          </>
        )}

        {user.isAdmin && (
          <span className="text-xs px-2 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
            Admin
          </span>
        )}

        <span className="text-sm text-white/70">{user.username}</span>

        <button
          onClick={logout}
          className="text-sm text-white/50 hover:text-white/80 transition-colors"
        >
          Quitter
        </button>
      </div>
    </nav>
  );
}
