import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthUser, unauthorized } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";

const COOLDOWN_MS = 20 * 60 * 1000; // 20 minutes

const useSchema = z.object({
  bonusType: z.enum(["CLASSEMENT", "SOLDE_MAX", "SOLDE_MOYEN", "GAIN_DOUBLE", "VOL"]),
  victimId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();
  if (user.isAdmin) {
    return NextResponse.json({ error: "La Banque ne peut pas utiliser de bonus" }, { status: 400 });
  }

  try {
    const body = await req.json();
    const { bonusType, victimId } = useSchema.parse(body);

    // Check game over (phase 4 finished)
    const phase4 = await prisma.auctionPhase.findFirst({ where: { phase: 4 } });
    if (phase4?.status === "FINISHED") {
      return NextResponse.json({ error: "La partie est terminée — les bonus ne sont plus disponibles" }, { status: 400 });
    }

    // Check active auction
    const activeAuction = await prisma.auctionPhase.findFirst({
      where: { status: "ACTIVE" },
    });
    if (activeAuction) {
      return NextResponse.json({ error: "Impossible pendant une enchère active" }, { status: 400 });
    }

    // Check if bonus already used
    const existingUsage = await prisma.bonusUsage.findFirst({
      where: { userId: user.id, bonusType },
    });
    if (existingUsage) {
      return NextResponse.json({ error: "Ce bonus a déjà été utilisé" }, { status: 400 });
    }

    // Check cooldown
    const lastUsage = await prisma.bonusUsage.findFirst({
      where: { userId: user.id },
      orderBy: { usedAt: "desc" },
    });
    if (lastUsage) {
      const timeSince = Date.now() - lastUsage.usedAt.getTime();
      if (timeSince < COOLDOWN_MS) {
        const remainingMs = COOLDOWN_MS - timeSince;
        const remainingMin = Math.ceil(remainingMs / 60000);
        return NextResponse.json(
          { error: `Cooldown actif. Réessayez dans ${remainingMin} min.` },
          { status: 400 }
        );
      }
    }

    const now = new Date();

    // Execute bonus based on type
    switch (bonusType) {
      case "CLASSEMENT": {
        const players = await prisma.user.findMany({
          where: { isAdmin: false },
          orderBy: { balance: "desc" },
          select: { username: true },
        });
        const ranking = players.map((p, i) => ({ rank: i + 1, username: p.username }));

        const usage = await prisma.bonusUsage.create({
          data: {
            userId: user.id,
            bonusType: "CLASSEMENT",
            expiresAt: new Date(now.getTime() + 30 * 1000),
            data: ranking,
          },
        });

        return NextResponse.json({
          bonus: {
            id: usage.id,
            bonusType: usage.bonusType,
            usedAt: usage.usedAt.toISOString(),
            expiresAt: usage.expiresAt?.toISOString(),
            data: ranking,
          },
        });
      }

      case "SOLDE_MAX": {
        const result = await prisma.user.aggregate({
          where: { isAdmin: false },
          _max: { balance: true },
        });
        const maxBalance = result._max.balance || 0;

        const usage = await prisma.bonusUsage.create({
          data: {
            userId: user.id,
            bonusType: "SOLDE_MAX",
            expiresAt: new Date(now.getTime() + 30 * 1000),
            data: { maxBalance },
          },
        });

        return NextResponse.json({
          bonus: {
            id: usage.id,
            bonusType: usage.bonusType,
            usedAt: usage.usedAt.toISOString(),
            expiresAt: usage.expiresAt?.toISOString(),
            data: { maxBalance },
          },
        });
      }

      case "SOLDE_MOYEN": {
        const result = await prisma.user.aggregate({
          where: { isAdmin: false },
          _avg: { balance: true },
        });
        const averageBalance = Math.round(result._avg.balance || 0);

        const usage = await prisma.bonusUsage.create({
          data: {
            userId: user.id,
            bonusType: "SOLDE_MOYEN",
            expiresAt: new Date(now.getTime() + 30 * 1000),
            data: { averageBalance },
          },
        });

        return NextResponse.json({
          bonus: {
            id: usage.id,
            bonusType: usage.bonusType,
            usedAt: usage.usedAt.toISOString(),
            expiresAt: usage.expiresAt?.toISOString(),
            data: { averageBalance },
          },
        });
      }

      case "GAIN_DOUBLE": {
        const usage = await prisma.bonusUsage.create({
          data: {
            userId: user.id,
            bonusType: "GAIN_DOUBLE",
            expiresAt: new Date(now.getTime() + 5 * 60 * 1000),
          },
        });

        return NextResponse.json({
          bonus: {
            id: usage.id,
            bonusType: usage.bonusType,
            usedAt: usage.usedAt.toISOString(),
            expiresAt: usage.expiresAt?.toISOString(),
            data: null,
          },
        });
      }

      case "VOL": {
        if (!victimId) {
          return NextResponse.json({ error: "Veuillez choisir un joueur à voler" }, { status: 400 });
        }
        if (victimId === user.id) {
          return NextResponse.json({ error: "Vous ne pouvez pas vous voler vous-même" }, { status: 400 });
        }

        const result = await prisma.$transaction(async (tx) => {
          const victim = await tx.user.findUnique({ where: { id: victimId } });
          if (!victim || victim.isAdmin) {
            throw new Error("Joueur introuvable");
          }

          const stolenAmount = Math.floor(victim.balance * 0.05);

          if (stolenAmount > 0) {
            // Debit victim
            await tx.user.update({
              where: { id: victimId },
              data: { balance: { decrement: stolenAmount } },
            });

            // Credit thief
            await tx.user.update({
              where: { id: user.id },
              data: { balance: { increment: stolenAmount } },
            });

            // Transaction records
            await tx.transaction.createMany({
              data: [
                {
                  userId: victimId,
                  amount: -stolenAmount,
                  type: "BONUS_STEAL_LOSS",
                  description: `Vol par ${user.username}`,
                },
                {
                  userId: user.id,
                  amount: stolenAmount,
                  type: "BONUS_STEAL_GAIN",
                  description: `Vol sur ${victim.username}`,
                },
              ],
            });
          }

          const usage = await tx.bonusUsage.create({
            data: {
              userId: user.id,
              bonusType: "VOL",
              data: {
                victimId: victim.id,
                victimUsername: victim.username,
                thiefUsername: user.username,
                amount: stolenAmount,
              },
            },
          });

          return { usage, stolenAmount, victimUsername: victim.username };
        });

        return NextResponse.json({
          bonus: {
            id: result.usage.id,
            bonusType: "VOL",
            usedAt: result.usage.usedAt.toISOString(),
            expiresAt: null,
            data: result.usage.data,
          },
          stolenAmount: result.stolenAmount,
          victimUsername: result.victimUsername,
        });
      }
    }
  } catch (e: any) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }
    if (e.message === "Joueur introuvable") {
      return NextResponse.json({ error: "Joueur introuvable" }, { status: 404 });
    }
    console.error("Bonus use error:", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
