import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, unauthorized, forbidden } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();
  if (!user.isAdmin) return forbidden();

  await prisma.$transaction(async (tx) => {
    // Reset all non-admin users to 50 T$
    const users = await tx.user.findMany({ where: { isAdmin: false } });

    for (const u of users) {
      await tx.user.update({
        where: { id: u.id },
        data: { balance: 50 },
      });
      await tx.transaction.create({
        data: {
          userId: u.id,
          amount: 50 - u.balance,
          type: "ADMIN_RESET",
          description: "Réinitialisation par la Banque",
        },
      });
    }

    // Cancel all active/pending duels and refund
    await tx.duel.updateMany({
      where: { status: { in: ["PENDING", "ACTIVE"] } },
      data: { status: "CANCELLED" },
    });
  });

  return NextResponse.json({ success: true });
}
