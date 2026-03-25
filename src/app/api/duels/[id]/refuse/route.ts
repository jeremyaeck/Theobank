import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, unauthorized } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();

  const { id } = await params;

  const duel = await prisma.duel.findUnique({ where: { id } });
  if (!duel) {
    return NextResponse.json({ error: "Duel introuvable" }, { status: 404 });
  }
  if (duel.status !== "PENDING") {
    return NextResponse.json({ error: "Ce duel n'est plus en attente" }, { status: 400 });
  }
  if (duel.opponentId !== user.id) {
    return NextResponse.json({ error: "Vous n'êtes pas le joueur défié" }, { status: 403 });
  }

  // Refund challenger and cancel duel
  const result = await prisma.$transaction(async (tx) => {
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
        description: `Défi refusé — mise restituée`,
        duelId: id,
      },
    });

    const d = await tx.duel.update({
      where: { id },
      data: { status: "CANCELLED" },
      include: {
        challenger: { select: { id: true, username: true, balance: true, isAdmin: true, createdAt: true } },
        opponent: { select: { id: true, username: true, balance: true, isAdmin: true, createdAt: true } },
      },
    });

    return d;
  });

  return NextResponse.json({ duel: result });
}
