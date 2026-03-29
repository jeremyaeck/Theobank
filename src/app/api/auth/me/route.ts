import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, unauthorized } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";
import { ACHIEVEMENTS } from "@/lib/achievements";

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();

  // Check WebAuthn credential
  const webAuthnCred = await prisma.webAuthnCredential.findUnique({ where: { userId: user.id } });

  // Check for unacknowledged steal alerts targeting this user
  const stealAlerts = await prisma.bonusUsage.findMany({
    where: {
      bonusType: "VOL",
      acknowledgedAt: null,
      data: { path: ["victimId"], equals: user.id },
    },
    include: {
      user: { select: { username: true } },
    },
    orderBy: { usedAt: "desc" },
  });

  // Recent wheel spins from other players (last 30s)
  const recentWheelEvents = await prisma.bonusUsage.findMany({
    where: {
      bonusType: "ROUE",
      userId: { not: user.id },
      usedAt: { gt: new Date(Date.now() - 30000) },
    },
    include: { user: { select: { username: true } } },
    orderBy: { usedAt: "desc" },
  });

  // Recently unlocked achievements (last 30s)
  const recentAchievements = await prisma.userAchievement.findMany({
    where: {
      userId: user.id,
      unlockedAt: { gt: new Date(Date.now() - 30000) },
    },
    orderBy: { unlockedAt: "desc" },
  });

  // All achievements for profile display
  const allAchievements = await prisma.userAchievement.findMany({
    where: { userId: user.id },
    orderBy: { unlockedAt: "asc" },
  });

  // Get auction wins
  const auctionWins = await prisma.auctionItem.findMany({
    where: { winnerId: user.id },
    select: {
      id: true,
      name: true,
      displayName: true,
      isMystery: true,
      winningBid: true,
      phase: { select: { phase: true } },
    },
    orderBy: { phase: { phase: "asc" } },
  });

  // Get user's team
  const teamMember = await prisma.teamMember.findFirst({
    where: { userId: user.id },
    include: {
      team: {
        include: {
          members: {
            include: { user: { select: { id: true, username: true } } },
            orderBy: { user: { username: "asc" } },
          },
        },
      },
    },
  });

  const team = teamMember
    ? {
        id: teamMember.team.id,
        name: teamMember.team.name,
        members: teamMember.team.members.map((m) => ({
          id: m.user.id,
          username: m.user.username,
        })),
      }
    : null;

  return NextResponse.json({
    user: {
      id: user.id,
      username: user.username,
      balance: user.balance,
      isAdmin: user.isAdmin,
      approved: user.approved,
      profilePhotoUrl: user.profilePhotoUrl ?? null,
      hasWebAuthn: !!webAuthnCred,
      createdAt: user.createdAt.toISOString(),
    },
    team,
    stealAlerts: stealAlerts.map((a) => ({
      id: a.id,
      thiefUsername: a.user.username,
      amount: (a.data as any)?.amount || 0,
      usedAt: a.usedAt.toISOString(),
    })),
    wheelEvents: recentWheelEvents.map((e) => ({
      id: e.id,
      spinnerUsername: e.user.username,
      segmentIndex: (e.data as any)?.segmentIndex ?? 4,
      amount: (e.data as any)?.amount ?? 0,
      targetUsername: (e.data as any)?.targetUsername,
      usedAt: e.usedAt.toISOString(),
    })),
    auctionWins: auctionWins.map((item) => ({
      id: item.id,
      name: item.isMystery ? item.name : item.displayName,
      displayName: item.displayName,
      isMystery: item.isMystery,
      winningBid: item.winningBid,
      phase: item.phase.phase,
    })),
    newAchievements: recentAchievements.map((a) => {
      const def = ACHIEVEMENTS[a.achievementId] || { name: a.achievementId, description: "", emoji: "🏅" };
      return {
        id: a.id,
        achievementId: a.achievementId,
        name: def.name,
        description: def.description,
        emoji: def.emoji,
        unlockedAt: a.unlockedAt.toISOString(),
      };
    }),
    achievements: allAchievements.map((a) => {
      const def = ACHIEVEMENTS[a.achievementId] || { name: a.achievementId, description: "", emoji: "🏅" };
      return {
        id: a.id,
        achievementId: a.achievementId,
        name: def.name,
        description: def.description,
        emoji: def.emoji,
        unlockedAt: a.unlockedAt.toISOString(),
      };
    }),
  });
}
