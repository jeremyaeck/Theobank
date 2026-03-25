import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, unauthorized } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();

  // Check for recent steal alerts (last 60 seconds)
  const sixtySecondsAgo = new Date(Date.now() - 60 * 1000);
  const stealAlerts = await prisma.bonusUsage.findMany({
    where: {
      bonusType: "VOL",
      usedAt: { gt: sixtySecondsAgo },
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
