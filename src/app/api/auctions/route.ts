import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, unauthorized } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();

  const phases = await prisma.auctionPhase.findMany({
    include: {
      items: {
        orderBy: { position: "asc" },
        include: {
          winner: { select: { id: true, username: true, balance: true, isAdmin: true, createdAt: true } },
          bids: user.isAdmin
            ? { include: { user: { select: { id: true, username: true, balance: true, isAdmin: true, createdAt: true } } } }
            : { where: { userId: user.id } },
        },
      },
    },
    orderBy: { phase: "asc" },
  });

  // Auto-resolve expired phases
  for (const phase of phases) {
    if (phase.status === "ACTIVE" && phase.endsAt && new Date(phase.endsAt) <= new Date()) {
      await resolvePhase(phase.id);
    }
  }

  // Re-fetch if any phase was resolved
  const hasExpired = phases.some(p => p.status === "ACTIVE" && p.endsAt && new Date(p.endsAt) <= new Date());
  if (hasExpired) {
    const updated = await prisma.auctionPhase.findMany({
      include: {
        items: {
          orderBy: { position: "asc" },
          include: {
            winner: { select: { id: true, username: true, balance: true, isAdmin: true, createdAt: true } },
            bids: user.isAdmin
              ? { include: { user: { select: { id: true, username: true, balance: true, isAdmin: true, createdAt: true } } } }
              : { where: { userId: user.id } },
          },
        },
      },
      orderBy: { phase: "asc" },
    });
    return NextResponse.json({ phases: sanitizePhases(updated, user.isAdmin) });
  }

  return NextResponse.json({ phases: sanitizePhases(phases, user.isAdmin) });
}

function sanitizePhases(phases: any[], isAdmin: boolean) {
  return phases.map(phase => ({
    ...phase,
    items: phase.items.map((item: any) => {
      // Hide mystery item names during ACTIVE phase
      if (item.isMystery && phase.status !== "FINISHED") {
        return { ...item, name: item.displayName };
      }
      return item;
    }),
  }));
}

async function resolvePhase(phaseId: string) {
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

  if (!phase || phase.status !== "ACTIVE") return;

  await prisma.$transaction(async (tx) => {
    for (const item of phase.items) {
      if (item.bids.length > 0) {
        const topBid = item.bids[0];
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
}
