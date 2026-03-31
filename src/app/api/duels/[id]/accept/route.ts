import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, unauthorized } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();

  const { id } = await params;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const duel = await tx.duel.findUnique({
        where: { id },
        include: {
          challenger: true,
          opponent: true,
        },
      });

      if (!duel) throw new Error("Duel introuvable");
      if (duel.status !== "PENDING") throw new Error("Ce duel n'est plus en attente");
      if (duel.opponentId !== user.id) throw new Error("Vous n'êtes pas le joueur défié");

      // Check opponent has enough balance
      if (duel.opponent.balance < duel.betAmount) {
        throw new Error("Votre solde est insuffisant");
      }

      // Lock stake: debit opponent only (challenger already debited at creation)
      await tx.user.update({
        where: { id: duel.opponentId },
        data: { balance: { decrement: duel.betAmount } },
      });

      // Record transaction for opponent
      await tx.transaction.create({
        data: {
          userId: duel.opponentId,
          amount: -duel.betAmount,
          type: "DUEL_LOCK",
          description: `Mise bloquée — duel vs ${duel.challenger.username}`,
          duelId: id,
        },
      });

      // Update duel status
      const updated = await tx.duel.update({
        where: { id },
        data: { status: "ACTIVE" },
        include: {
          challenger: { select: { id: true, username: true, balance: true, isAdmin: true, profilePhotoUrl: true, createdAt: true } },
          opponent: { select: { id: true, username: true, balance: true, isAdmin: true, profilePhotoUrl: true, createdAt: true } },
        },
      });

      return updated;
    });

    return NextResponse.json({ duel: result });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Erreur serveur" }, { status: 400 });
  }
}
