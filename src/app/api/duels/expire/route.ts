import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Auto-expire pending duels older than 5 minutes
// Called by client polling or can be triggered manually
export async function POST(req: NextRequest) {
  try {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const expiredDuels = await prisma.duel.findMany({
      where: {
        status: "PENDING",
        createdAt: { lt: fiveMinutesAgo },
      },
    });

    for (const duel of expiredDuels) {
      await prisma.$transaction(async (tx) => {
        // Refund challenger
        await tx.user.update({
          where: { id: duel.challengerId },
          data: { balance: { increment: duel.betAmount } },
        });

        await tx.transaction.create({
          data: {
            userId: duel.challengerId,
            amount: duel.betAmount,
            type: "DUEL_REFUND",
            description: "Défi expiré (5 min) — mise restituée",
            duelId: duel.id,
          },
        });

        await tx.duel.update({
          where: { id: duel.id },
          data: { status: "CANCELLED" },
        });
      });
    }

    return NextResponse.json({ expired: expiredDuels.length });
  } catch (e) {
    console.error("Expire duels error:", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
