import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthUser, unauthorized, forbidden } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();
  if (!user.isAdmin) return forbidden();

  const users = await prisma.user.findMany({
    where: { isAdmin: false },
    select: { id: true, username: true, balance: true, isAdmin: true, createdAt: true },
    orderBy: { username: "asc" },
  });

  return NextResponse.json({ users });
}

const patchSchema = z.object({
  userId: z.string().min(1),
  amount: z.number().int(),
  reason: z.string().optional(),
});

export async function PATCH(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();
  if (!user.isAdmin) return forbidden();

  try {
    const body = await req.json();
    const { userId, amount, reason } = patchSchema.parse(body);

    const target = await prisma.user.findUnique({ where: { id: userId } });
    if (!target) {
      return NextResponse.json({ error: "Joueur introuvable" }, { status: 404 });
    }

    if (amount < 0 && target.balance + amount < 0) {
      return NextResponse.json({ error: "Le solde deviendrait négatif" }, { status: 400 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const u = await tx.user.update({
        where: { id: userId },
        data: { balance: { increment: amount } },
      });

      await tx.transaction.create({
        data: {
          userId,
          amount,
          type: amount >= 0 ? "ADMIN_CREDIT" : "ADMIN_DEBIT",
          description: reason || (amount >= 0 ? "Crédit de la Banque" : "Débit de la Banque"),
        },
      });

      return u;
    });

    return NextResponse.json({
      user: {
        id: updated.id,
        username: updated.username,
        balance: updated.balance,
        isAdmin: updated.isAdmin,
        createdAt: updated.createdAt.toISOString(),
      },
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }
    console.error("Admin users error:", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
