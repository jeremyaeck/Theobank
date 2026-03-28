import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, unauthorized } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";

const BONUS_TYPES = ["GAIN_DOUBLE", "VOL", "BOUCLIER", "JACKPOT", "ROUE"] as const;
const COOLDOWN_MS = 20 * 60 * 1000; // 20 minutes

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();

  const usages = await prisma.bonusUsage.findMany({
    where: { userId: user.id },
    orderBy: { usedAt: "desc" },
  });

  // Build status per bonus type
  const bonuses = BONUS_TYPES.map((type) => {
    const usage = usages.find((u) => u.bonusType === type);
    return {
      type,
      used: !!usage,
      usage: usage
        ? {
            id: usage.id,
            usedAt: usage.usedAt.toISOString(),
            expiresAt: usage.expiresAt?.toISOString() || null,
            data: usage.data,
          }
        : null,
    };
  });

  // Last usage timestamp for cooldown
  const lastUsage = usages.length > 0 ? usages[0] : null;
  const lastUsedAt = lastUsage?.usedAt.toISOString() || null;
  const cooldownEndsAt = lastUsage
    ? new Date(lastUsage.usedAt.getTime() + COOLDOWN_MS).toISOString()
    : null;

  // Check if any auction is active
  const activeAuction = await prisma.auctionPhase.findFirst({
    where: { status: "ACTIVE" },
  });

  return NextResponse.json({
    bonuses,
    lastUsedAt,
    cooldownEndsAt,
    auctionActive: !!activeAuction,
  });
}
