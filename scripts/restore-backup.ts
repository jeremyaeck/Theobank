import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

async function main() {
  const filename = process.argv[2] || 'backup-soiree-2026-03-27.json';

  if (!fs.existsSync(filename)) {
    console.error(`Fichier introuvable: ${filename}`);
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(filename, 'utf-8'));
  console.log(`Restauration depuis: ${filename} (export du ${data.exportDate})`);

  // Suppression dans l'ordre inverse des dépendances
  console.log('Suppression des données existantes...');
  await prisma.bonusUsage.deleteMany();
  await prisma.auctionBid.deleteMany();
  await prisma.auctionItem.deleteMany();
  await prisma.auctionPhase.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.duel.deleteMany();
  await prisma.teamMember.deleteMany();
  await prisma.team.deleteMany();
  await prisma.webAuthnCredential.deleteMany();
  await prisma.user.deleteMany();
  console.log('Tables vidées.');

  // Restauration dans l'ordre des dépendances
  console.log('Insertion des utilisateurs...');
  for (const u of data.users) {
    await prisma.user.create({
      data: {
        id: u.id,
        username: u.username,
        passwordHash: u.passwordHash,
        balance: u.balance,
        isAdmin: u.isAdmin,
        approved: u.approved,
        profilePhotoUrl: u.profilePhotoUrl ?? null,
        createdAt: new Date(u.createdAt),
        updatedAt: new Date(u.updatedAt),
      },
    });
  }
  console.log(`  ${data.users.length} utilisateurs insérés.`);

  console.log('Insertion des équipes...');
  for (const t of data.teams) {
    await prisma.team.create({
      data: {
        id: t.id,
        name: t.name,
        createdAt: new Date(t.createdAt),
        updatedAt: new Date(t.updatedAt),
      },
    });
  }
  for (const t of data.teams) {
    for (const m of t.members) {
      await prisma.teamMember.create({
        data: {
          id: m.id,
          teamId: m.teamId,
          userId: m.userId,
          createdAt: new Date(m.createdAt),
        },
      });
    }
  }
  console.log(`  ${data.teams.length} équipes insérées.`);

  console.log('Insertion des duels...');
  for (const d of data.duels) {
    await prisma.duel.create({
      data: {
        id: d.id,
        challengerId: d.challengerId,
        opponentId: d.opponentId,
        betAmount: d.betAmount,
        status: d.status,
        challengerVote: d.challengerVote ?? null,
        opponentVote: d.opponentVote ?? null,
        winnerId: d.winnerId ?? null,
        createdAt: new Date(d.createdAt),
        updatedAt: new Date(d.updatedAt),
      },
    });
  }
  console.log(`  ${data.duels.length} duels insérés.`);

  console.log('Insertion des transactions...');
  for (const tx of data.transactions) {
    await prisma.transaction.create({
      data: {
        id: tx.id,
        userId: tx.userId,
        amount: tx.amount,
        type: tx.type,
        description: tx.description ?? null,
        duelId: tx.duelId ?? null,
        createdAt: new Date(tx.createdAt),
      },
    });
  }
  console.log(`  ${data.transactions.length} transactions insérées.`);

  console.log('Insertion des phases d\'enchères...');
  for (const ap of data.auctionPhases) {
    await prisma.auctionPhase.create({
      data: {
        id: ap.id,
        phase: ap.phase,
        status: ap.status,
        startedAt: ap.startedAt ? new Date(ap.startedAt) : null,
        endsAt: ap.endsAt ? new Date(ap.endsAt) : null,
        createdAt: new Date(ap.createdAt),
      },
    });
  }

  console.log('Insertion des items d\'enchères...');
  for (const ai of data.auctionItems) {
    await prisma.auctionItem.create({
      data: {
        id: ai.id,
        name: ai.name,
        displayName: ai.displayName,
        isMystery: ai.isMystery,
        phaseId: ai.phaseId,
        position: ai.position,
        winnerId: ai.winnerId ?? null,
        winningBid: ai.winningBid ?? null,
      },
    });
  }

  console.log('Insertion des enchères...');
  for (const ab of data.auctionBids) {
    await prisma.auctionBid.create({
      data: {
        id: ab.id,
        userId: ab.userId,
        itemId: ab.itemId,
        amount: ab.amount,
        validatedAt: new Date(ab.validatedAt),
      },
    });
  }
  console.log(`  ${data.auctionPhases.length} phases, ${data.auctionItems.length} items, ${data.auctionBids.length} enchères insérés.`);

  console.log('Insertion des bonus...');
  for (const b of data.bonusUsages) {
    await prisma.bonusUsage.create({
      data: {
        id: b.id,
        userId: b.userId,
        bonusType: b.bonusType,
        usedAt: new Date(b.usedAt),
        expiresAt: b.expiresAt ? new Date(b.expiresAt) : null,
        data: b.data ?? undefined,
        acknowledgedAt: b.acknowledgedAt ? new Date(b.acknowledgedAt) : null,
      },
    });
  }
  console.log(`  ${data.bonusUsages.length} bonus insérés.`);

  console.log('\nRestauration terminée avec succès !');
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
