import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

async function main() {
  const data = {
    exportDate: new Date().toISOString(),
    users: await prisma.user.findMany(),
    teams: await prisma.team.findMany({ include: { members: true } }),
    duels: await prisma.duel.findMany(),
    transactions: await prisma.transaction.findMany(),
    auctionPhases: await prisma.auctionPhase.findMany(),
    auctionItems: await prisma.auctionItem.findMany(),
    auctionBids: await prisma.auctionBid.findMany(),
    bonusUsages: await prisma.bonusUsage.findMany(),
  };

  const filename = `backup-soiree-${new Date().toISOString().slice(0, 10)}.json`;
  fs.writeFileSync(filename, JSON.stringify(data, null, 2));
  console.log(`Export terminé: ${filename}`);
  console.log(`- ${data.users.length} utilisateurs`);
  console.log(`- ${data.duels.length} duels`);
  console.log(`- ${data.transactions.length} transactions`);
  console.log(`- ${data.auctionBids.length} enchères`);
  console.log(`- ${data.bonusUsages.length} bonus utilisés`);

  await prisma.$disconnect();
}

main().catch(console.error);
