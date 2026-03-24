import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthUser, unauthorized } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  winnerId: z.string().min(1),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();

  const { id } = await params;

  try {
    const body = await req.json();
    const { winnerId } = schema.parse(body);

    const result = await prisma.$transaction(async (tx) => {
      const duel = await tx.duel.findUnique({ where: { id } });

      if (!duel) throw new Error("Duel introuvable");
      if (duel.status !== "ACTIVE") throw new Error("Ce duel n'est pas actif");

      const isChallenger = duel.challengerId === user.id;
      const isOpponent = duel.opponentId === user.id;
      if (!isChallenger && !isOpponent) throw new Error("Vous ne participez pas à ce duel");

      // Verify winnerId is one of the two participants
      if (winnerId !== duel.challengerId && winnerId !== duel.opponentId) {
        throw new Error("Vote invalide");
      }

      // Check if already voted
      if (isChallenger && duel.challengerVote) throw new Error("Vous avez déjà voté");
      if (isOpponent && duel.opponentVote) throw new Error("Vous avez déjà voté");

      // Record vote
      const updateData = isChallenger
        ? { challengerVote: winnerId }
        : { opponentVote: winnerId };

      const updated = await tx.duel.update({
        where: { id },
        data: updateData,
      });

      // Check if both votes are now in
      const challengerVote = isChallenger ? winnerId : updated.challengerVote;
      const opponentVote = isOpponent ? winnerId : updated.opponentVote;

      if (challengerVote && opponentVote) {
        if (challengerVote === opponentVote) {
          // Agreement: winner takes all
          const pot = duel.betAmount * 2;
          await tx.user.update({
            where: { id: challengerVote },
            data: { balance: { increment: pot } },
          });
          await tx.transaction.create({
            data: {
              userId: challengerVote,
              amount: pot,
              type: "DUEL_WIN",
              description: `Victoire au duel — gain de ${pot} T$`,
              duelId: id,
            },
          });

          const final = await tx.duel.update({
            where: { id },
            data: {
              status: "COMPLETED",
              winnerId: challengerVote,
              challengerVote,
              opponentVote,
            },
            include: {
              challenger: { select: { id: true, username: true, balance: true, isAdmin: true, createdAt: true } },
              opponent: { select: { id: true, username: true, balance: true, isAdmin: true, createdAt: true } },
            },
          });

          return final;
        } else {
          // Disagreement: refund both
          await tx.user.update({
            where: { id: duel.challengerId },
            data: { balance: { increment: duel.betAmount } },
          });
          await tx.user.update({
            where: { id: duel.opponentId },
            data: { balance: { increment: duel.betAmount } },
          });
          await tx.transaction.createMany({
            data: [
              {
                userId: duel.challengerId,
                amount: duel.betAmount,
                type: "DUEL_REFUND",
                description: "Duel annulé — mise restituée",
                duelId: id,
              },
              {
                userId: duel.opponentId,
                amount: duel.betAmount,
                type: "DUEL_REFUND",
                description: "Duel annulé — mise restituée",
                duelId: id,
              },
            ],
          });

          const final = await tx.duel.update({
            where: { id },
            data: {
              status: "CANCELLED",
              challengerVote,
              opponentVote,
            },
            include: {
              challenger: { select: { id: true, username: true, balance: true, isAdmin: true, createdAt: true } },
              opponent: { select: { id: true, username: true, balance: true, isAdmin: true, createdAt: true } },
            },
          });

          return final;
        }
      }

      // Only one vote so far
      const partial = await tx.duel.findUnique({
        where: { id },
        include: {
          challenger: { select: { id: true, username: true, balance: true, isAdmin: true, createdAt: true } },
          opponent: { select: { id: true, username: true, balance: true, isAdmin: true, createdAt: true } },
        },
      });

      return partial;
    });

    return NextResponse.json({ duel: result });
  } catch (e: any) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }
    return NextResponse.json({ error: e.message || "Erreur serveur" }, { status: 400 });
  }
}
