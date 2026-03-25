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

  const phase = await prisma.auctionPhase.findUnique({ where: { id: phaseId } });
  if (!phase) {
    return NextResponse.json({ error: "Phase introuvable" }, { status: 404 });
  }
  if (phase.status !== "LOCKED") {
    return NextResponse.json({ error: "Cette phase a déjà été lancée" }, { status: 400 });
  }

  const now = new Date();
  const endsAt = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes

  const updated = await prisma.auctionPhase.update({
    where: { id: phaseId },
    data: { status: "ACTIVE", startedAt: now, endsAt },
  });

  return NextResponse.json({ phase: updated });
}
