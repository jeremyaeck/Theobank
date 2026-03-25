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
      acknowledgedAt: null, // Not yet dismissed by victim
      data: { path: ["victimId"], equals: user.id },
    },
    include: {
      user: { select: { username: true } },
    },
    orderBy: { usedAt: "desc" },
  });

  return NextResponse.json({
    user: {
      id: user.id,
      username: user.username,
      balance: user.balance,
      isAdmin: user.isAdmin,
      approved: user.approved,
      createdAt: user.createdAt.toISOString(),
    },
    stealAlerts: stealAlerts.map((a) => ({
      id: a.id,
      thiefUsername: a.user.username,
      amount: (a.data as any)?.amount || 0,
      usedAt: a.usedAt.toISOString(),
    })),
  });
}
