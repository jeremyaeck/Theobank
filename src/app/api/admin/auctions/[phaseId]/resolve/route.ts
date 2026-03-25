import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, unauthorized, forbidden } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ phaseId: string }> }
) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();
  if (!user.isAdmin) return forbidden();

  const { phaseId } = await params;

  const phase = await prisma.auctionPhase.findUnique({
    where: { id: phaseId },
    include: {
      items: {
        include: {
          bids: { orderBy: [{ amount: "desc" }, { validatedAt: "asc" }] },
        },
      },
    },
  });

  if (!phase) {
    return NextResponse.json({ error: "Phase introuvable" }, { status: 404 });
  }
  if (phase.status !== "ACTIVE") {
    return NextResponse.json({ error: "Cette phase n'est pas active" }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    for (const item of phase.items) {
      if (item.bids.length > 0) {
        const topBid = item.bids[0]; // Highest amount, earliest validatedAt
        await tx.auctionItem.update({
          where: { id: item.id },
          data: { winnerId: topBid.userId, winningBid: topBid.amount },
        });
      }
    }
    await tx.auctionPhase.update({
      where: { id: phaseId },
      data: { status: "FINISHED" },
    });
  });

  return NextResponse.json({ success: true });
}
