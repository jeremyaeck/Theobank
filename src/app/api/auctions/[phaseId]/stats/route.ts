import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, unauthorized } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: Promise<{ phaseId: string }> }) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();

  const { phaseId } = await params;

  const phase = await prisma.auctionPhase.findUnique({
    where: { id: phaseId },
    include: {
      items: {
        orderBy: { position: "asc" },
        include: {
          bids: {
            include: {
              user: { select: { id: true, username: true } },
            },
            orderBy: { amount: "desc" },
          },
        },
      },
    },
  });

  if (!phase || phase.status !== "FINISHED") {
    return NextResponse.json({ error: "Phase non terminée" }, { status: 400 });
  }

  // Total amount bid per item
  const itemStats = phase.items.map((item) => {
    const totalBid = item.bids.reduce((sum, b) => sum + b.amount, 0);
    return {
      itemId: item.id,
      itemName: item.name,
      displayName: item.displayName,
      isMystery: item.isMystery,
      totalBid,
      bidCount: item.bids.length,
    };
  });

  // Top 3 biggest individual bids across all items
  const allBids = phase.items.flatMap((item) =>
    item.bids.map((b) => ({
      username: b.user.username,
      amount: b.amount,
      itemName: item.name,
      itemDisplayName: item.displayName,
      isMystery: item.isMystery,
    }))
  );
  allBids.sort((a, b) => b.amount - a.amount);
  const top3 = allBids.slice(0, 3);

  // Current player's bids
  const myBids = phase.items.map((item) => {
    const myBid = item.bids.find((b) => b.userId === user.id);
    return {
      itemId: item.id,
      itemName: item.name,
      displayName: item.displayName,
      isMystery: item.isMystery,
      amount: myBid?.amount || 0,
    };
  });

  return NextResponse.json({
    itemStats,
    top3,
    myBids,
  });
}
