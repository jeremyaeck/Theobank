import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, unauthorized } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { ACHIEVEMENTS } from "@/lib/achievements";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const viewer = await getAuthUser(req);
  if (!viewer) return unauthorized();

  const { id } = await params;

  const target = await prisma.user.findUnique({
    where: { id },
    include: {
      achievements: { orderBy: { unlockedAt: "asc" } },
      auctionWins: {
        where: { winnerId: id },
        select: {
          id: true,
          displayName: true,
          name: true,
          isMystery: true,
          winningBid: true,
          phase: { select: { phase: true } },
        },
        orderBy: { phase: { phase: "asc" } },
      },
    },
  });

  if (!target || target.isAdmin) {
    return NextResponse.json({ error: "Joueur introuvable" }, { status: 404 });
  }

  return NextResponse.json({
    user: {
      id: target.id,
      username: target.username,
      profilePhotoUrl: target.profilePhotoUrl ?? null,
    },
    achievements: target.achievements.map((a) => ({
      achievementId: a.achievementId,
      ...(ACHIEVEMENTS[a.achievementId] || { name: a.achievementId, description: "", emoji: "🏅" }),
      unlockedAt: a.unlockedAt.toISOString(),
    })),
    auctionWins: target.auctionWins.map((item) => ({
      id: item.id,
      name: item.isMystery ? item.name : item.displayName,
      displayName: item.displayName,
      isMystery: item.isMystery,
      winningBid: item.winningBid,
      phase: item.phase.phase,
    })),
  });
}
