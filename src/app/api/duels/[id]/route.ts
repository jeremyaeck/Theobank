import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, unauthorized } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();

  const { id } = await params;

  const duel = await prisma.duel.findUnique({
    where: { id },
    include: {
      challenger: { select: { id: true, username: true, balance: true, isAdmin: true, profilePhotoUrl: true, createdAt: true } },
      opponent: { select: { id: true, username: true, balance: true, isAdmin: true, profilePhotoUrl: true, createdAt: true } },
    },
  });

  if (!duel) {
    return NextResponse.json({ error: "Duel introuvable" }, { status: 404 });
  }

  if (duel.challengerId !== user.id && duel.opponentId !== user.id && !user.isAdmin) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  return NextResponse.json({ duel });
}
