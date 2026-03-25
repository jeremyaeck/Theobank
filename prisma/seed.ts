import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminPassword = process.env.ADMIN_PASSWORD || "banque123";
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  const admin = await prisma.user.upsert({
    where: { username: "Banque" },
    update: {},
    create: {
      username: "Banque",
      passwordHash,
      balance: 999999999,
      isAdmin: true,
    },
  });

  console.log(`Admin account created: ${admin.username} (id: ${admin.id})`);

  // Seed auction phases and items
  const phases = [
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

  for (const phaseData of phases) {
    const phase = await prisma.auctionPhase.upsert({
      where: { phase: phaseData.phase },
      update: {},
      create: { phase: phaseData.phase },
    });

    for (const item of phaseData.items) {
      const existing = await prisma.auctionItem.findFirst({
        where: { phaseId: phase.id, position: item.position },
      });
      if (!existing) {
        await prisma.auctionItem.create({
          data: { ...item, phaseId: phase.id },
        });
      }
    }

    console.log(`Phase ${phaseData.phase} created with ${phaseData.items.length} items`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
