import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, unauthorized } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();

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
      createdAt: user.createdAt.toISOString(),
    },
    team,
    stealAlerts: stealAlerts.map((a) => ({
      id: a.id,
      thiefUsername: a.user.username,
      amount: (a.data as any)?.amount || 0,
      usedAt: a.usedAt.toISOString(),
    })),
  });
}
