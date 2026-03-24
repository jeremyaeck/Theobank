import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthUser, unauthorized } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();

  const duels = await prisma.duel.findMany({
    where: {
      OR: [{ challengerId: user.id }, { opponentId: user.id }],
    },
    include: {
      challenger: { select: { id: true, username: true, balance: true, isAdmin: true, createdAt: true } },
      opponent: { select: { id: true, username: true, balance: true, isAdmin: true, createdAt: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ duels });
}

const createSchema = z.object({
  opponentId: z.string().min(1),
  betAmount: z.number().int().positive(),
});

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();

  try {
    const body = await req.json();
    const { opponentId, betAmount } = createSchema.parse(body);

    if (opponentId === user.id) {
      return NextResponse.json({ error: "Vous ne pouvez pas vous défier vous-même" }, { status: 400 });
    }

    if (betAmount > user.balance) {
      return NextResponse.json({ error: "Solde insuffisant" }, { status: 400 });
    }

    const opponent = await prisma.user.findUnique({ where: { id: opponentId } });
    if (!opponent) {
      return NextResponse.json({ error: "Joueur introuvable" }, { status: 404 });
    }

    if (opponent.isAdmin) {
      return NextResponse.json({ error: "Vous ne pouvez pas défier la Banque" }, { status: 400 });
    }

    const duel = await prisma.duel.create({
      data: {
        challengerId: user.id,
        opponentId,
        betAmount,
      },
      include: {
        challenger: { select: { id: true, username: true, balance: true, isAdmin: true, createdAt: true } },
        opponent: { select: { id: true, username: true, balance: true, isAdmin: true, createdAt: true } },
      },
    });

    return NextResponse.json({ duel });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }
    console.error("Create duel error:", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
