import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, unauthorized, forbidden } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();
  if (!user.isAdmin) return forbidden();

  const phases = await prisma.auctionPhase.findMany({
    orderBy: { phase: "asc" },
    include: { items: { orderBy: { position: "asc" } } },
  });

  return NextResponse.json({ phases });
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();
  if (!user.isAdmin) return forbidden();

  const body = await req.json();
  const { phases: inputPhases } = body as {
    phases: {
      phase: number;
      items: {
        name: string;
        displayName: string;
        isMystery: boolean;
        position: number;
      }[];
    }[];
  };

  if (!Array.isArray(inputPhases)) {
    return NextResponse.json({ error: "Format invalide" }, { status: 400 });
  }

  const existingPhases = await prisma.auctionPhase.findMany({
    include: { items: true },
  });

  const inputPhaseNumbers = inputPhases.map((p) => p.phase);
  const warnings: string[] = [];

  await prisma.$transaction(async (tx) => {
    // Delete LOCKED phases not in input
    for (const existing of existingPhases) {
      if (!inputPhaseNumbers.includes(existing.phase) && existing.status === "LOCKED") {
        await tx.auctionItem.deleteMany({ where: { phaseId: existing.id } });
        await tx.auctionPhase.delete({ where: { id: existing.id } });
      }
    }

    // Create or update phases
    for (const inputPhase of inputPhases) {
      const existing = existingPhases.find((p) => p.phase === inputPhase.phase);

      if (existing) {
        if (existing.status !== "LOCKED") {
          warnings.push(`Phase ${inputPhase.phase} (${existing.status}) — non modifiable`);
          continue;
        }
        // Delete and recreate items for LOCKED phase
        await tx.auctionItem.deleteMany({ where: { phaseId: existing.id } });
        for (const item of inputPhase.items) {
          await tx.auctionItem.create({
            data: {
              name: item.name,
              displayName: item.displayName,
              isMystery: item.isMystery,
              position: item.position,
              phaseId: existing.id,
            },
          });
        }
      } else {
        // Create new phase
        const newPhase = await tx.auctionPhase.create({
          data: { phase: inputPhase.phase, status: "LOCKED" },
        });
        for (const item of inputPhase.items) {
          await tx.auctionItem.create({
            data: {
              name: item.name,
              displayName: item.displayName,
              isMystery: item.isMystery,
              position: item.position,
              phaseId: newPhase.id,
            },
          });
        }
      }
    }
  });

  return NextResponse.json({ success: true, warnings });
}
