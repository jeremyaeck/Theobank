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
    select: { id: true, username: true, balance: true, isAdmin: true, approved: true, createdAt: true },
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
      let finalAmount = amount;
      let doubleApplied = false;

      // Check for active "Gain Doublé" bonus on credits
      if (amount > 0) {
        const activeDouble = await tx.bonusUsage.findFirst({
          where: {
            userId,
            bonusType: "GAIN_DOUBLE",
            expiresAt: { gt: new Date() },
          },
        });
        if (activeDouble) {
          finalAmount = amount * 2;
          doubleApplied = true;
        }
      }

      const u = await tx.user.update({
        where: { id: userId },
        data: { balance: { increment: finalAmount } },
      });

      const defaultDesc = finalAmount >= 0 ? "Crédit de la Banque" : "Débit de la Banque";
      const desc = reason || defaultDesc;

      await tx.transaction.create({
        data: {
          userId,
          amount: finalAmount,
          type: finalAmount >= 0 ? "ADMIN_CREDIT" : "ADMIN_DEBIT",
          description: doubleApplied ? `${desc} (x2 bonus)` : desc,
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
