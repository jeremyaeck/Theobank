import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthUser, unauthorized } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";

const bidSchema = z.object({
  bids: z.array(
    z.object({
      itemId: z.string().min(1),
      amount: z.number().int().min(0),
    })
  ),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ phaseId: string }> }
) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();
  if (user.isAdmin) {
    return NextResponse.json({ error: "La Banque ne peut pas enchérir" }, { status: 400 });
  }

  const { phaseId } = await params;

  try {
    const body = await req.json();
    const { bids } = bidSchema.parse(body);

    const phase = await prisma.auctionPhase.findUnique({
      where: { id: phaseId },
      include: { items: true },
    });

    if (!phase) {
      return NextResponse.json({ error: "Phase introuvable" }, { status: 404 });
    }
    if (phase.status !== "ACTIVE") {
      return NextResponse.json({ error: "Cette phase n'est pas active" }, { status: 400 });
    }
    if (phase.endsAt && new Date(phase.endsAt) <= new Date()) {
      return NextResponse.json({ error: "Le temps est écoulé" }, { status: 400 });
    }

    // Check if user already bid in this phase
    const existingBids = await prisma.auctionBid.findMany({
      where: {
        userId: user.id,
        item: { phaseId },
      },
    });
    if (existingBids.length > 0) {
      return NextResponse.json({ error: "Vous avez déjà validé vos mises pour cette phase" }, { status: 400 });
    }

    // Validate all itemIds belong to this phase
    const phaseItemIds = phase.items.map(i => i.id);
    for (const bid of bids) {
      if (!phaseItemIds.includes(bid.itemId)) {
        return NextResponse.json({ error: "Objet invalide" }, { status: 400 });
      }
    }

    const totalBid = bids.reduce((sum, b) => sum + b.amount, 0);
    if (totalBid <= 0) {
      return NextResponse.json({ error: "Vous devez miser au moins 1 T$" }, { status: 400 });
    }

    // Re-fetch user balance inside transaction for race condition safety
    const result = await prisma.$transaction(async (tx) => {
      const freshUser = await tx.user.findUnique({ where: { id: user.id } });
      if (!freshUser || totalBid > freshUser.balance) {
        throw new Error("Solde insuffisant");
      }

      const now = new Date();

      // Create bids for items with amount > 0
      for (const bid of bids) {
        if (bid.amount > 0) {
          await tx.auctionBid.create({
            data: {
              userId: user.id,
              itemId: bid.itemId,
              amount: bid.amount,
              validatedAt: now,
            },
          });
        }
      }

      // Debit user
      await tx.user.update({
        where: { id: user.id },
        data: { balance: { decrement: totalBid } },
      });

      // Create transaction
      await tx.transaction.create({
        data: {
          userId: user.id,
          amount: -totalBid,
          type: "AUCTION_BID",
          description: `Enchère phase ${phase.phase}`,
        },
      });

      return { totalBid };
    });

    return NextResponse.json({ success: true, totalBid: result.totalBid });
  } catch (e: any) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }
    if (e.message === "Solde insuffisant") {
      return NextResponse.json({ error: "Solde insuffisant" }, { status: 400 });
    }
    console.error("Bid error:", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
