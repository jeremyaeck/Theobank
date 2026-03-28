import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthUser, unauthorized } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";

const COOLDOWN_MS = 20 * 60 * 1000; // 20 minutes

const useSchema = z.object({
  bonusType: z.enum(["GAIN_DOUBLE", "VOL", "BOUCLIER", "JACKPOT"]),
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
      case "BOUCLIER": {
        const usage = await prisma.bonusUsage.create({
          data: {
            userId: user.id,
            bonusType: "BOUCLIER",
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

      case "JACKPOT": {
        const currentUser = await prisma.user.findUnique({ where: { id: user.id } });
        const balance = currentUser?.balance || 0;

        // Random between -15% and +30%
        const percentage = Math.random() * 0.45 - 0.15;
        const amount = Math.floor(balance * percentage);
        const finalAmount = percentage < 0 ? Math.max(amount, -balance) : amount;

        await prisma.$transaction(async (tx) => {
          await tx.user.update({
            where: { id: user.id },
            data: { balance: { increment: finalAmount } },
          });
          await tx.transaction.create({
            data: {
              userId: user.id,
              amount: finalAmount,
              type: "BONUS_JACKPOT",
              description: `Jackpot (${finalAmount >= 0 ? "+" : ""}${Math.round(percentage * 100)}%)`,
            },
          });
        });

        const usage = await prisma.bonusUsage.create({
          data: {
            userId: user.id,
            bonusType: "JACKPOT",
            expiresAt: new Date(now.getTime() + 10 * 1000),
            data: { amount: finalAmount, percentage: Math.round(percentage * 100) },
          },
        });

        return NextResponse.json({
          bonus: {
            id: usage.id,
            bonusType: usage.bonusType,
            usedAt: usage.usedAt.toISOString(),
            expiresAt: usage.expiresAt?.toISOString(),
            data: { amount: finalAmount, percentage: Math.round(percentage * 100) },
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

          // Check if victim has an active shield
          const shield = await tx.bonusUsage.findFirst({
            where: {
              userId: victimId,
              bonusType: "BOUCLIER",
              expiresAt: { gt: now },
            },
          });
          if (shield) {
            throw new Error("Ce joueur est protégé par un bouclier !");
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
