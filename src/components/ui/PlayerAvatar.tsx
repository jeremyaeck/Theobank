"use client";

import { getInitials, getAvatarColor } from "@/lib/utils";

interface PlayerAvatarProps {
  username: string;
  profilePhotoUrl?: string | null;
  size?: "sm" | "md" | "lg";
}

const SIZES = {
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-16 h-16 text-xl",
};

export default function PlayerAvatar({ username, profilePhotoUrl, size = "md" }: PlayerAvatarProps) {
  const s = SIZES[size];

  if (profilePhotoUrl) {
    return (
      <img
        src={profilePhotoUrl}
        alt={username}
        className={`${s} rounded-full object-cover border border-white/20`}
      />
    );
  }

  return (
    <div
      className={`${s} rounded-full bg-gradient-to-br ${getAvatarColor(username)} flex items-center justify-center font-bold text-white`}
    >
      {getInitials(username)}
    </div>
  );
}
