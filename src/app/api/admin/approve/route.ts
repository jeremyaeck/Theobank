import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthUser, unauthorized, forbidden } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  userId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();
  if (!user.isAdmin) return forbidden();

  try {
    const body = await req.json();
    const { userId } = schema.parse(body);

    const target = await prisma.user.findUnique({ where: { id: userId } });
    if (!target) {
      return NextResponse.json({ error: "Joueur introuvable" }, { status: 404 });
    }
    if (target.approved) {
      return NextResponse.json({ error: "Joueur déjà approuvé" }, { status: 400 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const u = await tx.user.update({
        where: { id: userId },
        data: { approved: true, balance: 50 },
      });

      await tx.transaction.create({
        data: {
          userId,
          amount: 50,
          type: "INITIAL_BALANCE",
          description: "Solde initial — inscription validée",
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
        approved: updated.approved,
        createdAt: updated.createdAt.toISOString(),
      },
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }
    console.error("Approve error:", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
