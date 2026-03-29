import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, unauthorized, forbidden } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";

const DEFAULT_ITEMS: { phase: number; items: { name: string; displayName: string; isMystery: boolean; position: number }[] }[] = [
  {
    phase: 1,
    items: [
      { name: "Flip 7", displayName: "Flip 7", isMystery: false, position: 1 },
      { name: "Gourde", displayName: "Gourde", isMystery: false, position: 2 },
      { name: "Jeux à gratter", displayName: "Jeux à gratter", isMystery: false, position: 3 },
      { name: "Lego orchidée", displayName: "Cadeau mystère", isMystery: true, position: 4 },
    ],
  },
  {
    phase: 2,
    items: [
      { name: 'Livre "La femme de ménage"', displayName: 'Livre "La femme de ménage"', isMystery: false, position: 1 },
      { name: "Kusmi tea", displayName: "Kusmi tea", isMystery: false, position: 2 },
      { name: "7 wonders duel", displayName: "7 wonders duel", isMystery: false, position: 3 },
      { name: "Patate positive", displayName: "Cadeau mystère", isMystery: true, position: 4 },
    ],
  },
  {
    phase: 3,
    items: [
      { name: "Trio", displayName: "Trio", isMystery: false, position: 1 },
      { name: "Molkky", displayName: "Molkky", isMystery: false, position: 2 },
      { name: "Coffret bien être", displayName: "Coffret bien être", isMystery: false, position: 3 },
      { name: "Wonderbox ciné", displayName: "Cadeau mystère", isMystery: true, position: 4 },
    ],
  },
  {
    phase: 4,
    items: [
      { name: "The gang", displayName: "The gang", isMystery: false, position: 1 },
      { name: "Plaid", displayName: "Plaid", isMystery: false, position: 2 },
      { name: "Wonderbox Théâtre", displayName: "Wonderbox Théâtre", isMystery: false, position: 3 },
      { name: "Chaussettes pastis", displayName: "Cadeau mystère", isMystery: true, position: 4 },
    ],
  },
];

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();
  if (!user.isAdmin) return forbidden();

  await prisma.$transaction(async (tx) => {
    // Delete all data in FK-safe order (keep admin users)
    await tx.userAchievement.deleteMany();
    await tx.bonusUsage.deleteMany();
    await tx.auctionBid.deleteMany();
    await tx.auctionItem.deleteMany();
    await tx.auctionPhase.deleteMany();
    await tx.transaction.deleteMany();
    await tx.duel.deleteMany();
    await tx.teamMember.deleteMany();
    await tx.team.deleteMany();
    await tx.webAuthnCredential.deleteMany({ where: { user: { isAdmin: false } } });

    // Delete all non-admin users
    await tx.user.deleteMany({ where: { isAdmin: false } });

    // Recreate 4 auction phases with default items
    for (const phaseConfig of DEFAULT_ITEMS) {
      const phase = await tx.auctionPhase.create({
        data: { phase: phaseConfig.phase, status: "LOCKED" },
      });
      for (const item of phaseConfig.items) {
        await tx.auctionItem.create({
          data: {
            name: item.name,
            displayName: item.displayName,
            isMystery: item.isMystery,
            position: item.position,
            phaseId: phase.id,
          },
        });
      }
    }
  });

  return NextResponse.json({ success: true });
}
