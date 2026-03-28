import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, unauthorized } from "@/lib/middleware";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();

  // Get all phases
  const phases = await prisma.auctionPhase.findMany({
    orderBy: { phase: "asc" },
    include: {
      items: {
        orderBy: { position: "asc" },
        include: {
          winner: { select: { id: true, username: true } },
          bids: { include: { user: { select: { id: true, username: true } } } },
        },
      },
    },
  });

  const phase4 = phases.find((p) => p.phase === 4);
  const gameOver = phase4?.status === "FINISHED";

  // Get all players (non-admin)
  const players = await prisma.user.findMany({
    where: { isAdmin: false },
    select: { id: true, username: true, balance: true },
    orderBy: { username: "asc" },
  });

  // Get all transactions
  const transactions = await prisma.transaction.findMany({
    where: { user: { isAdmin: false } },
    orderBy: { createdAt: "asc" },
  });

  // Get all duels
  const duels = await prisma.duel.findMany({
    include: {
      challenger: { select: { id: true, username: true } },
      opponent: { select: { id: true, username: true } },
    },
  });

  // Get all bonus usages
  const bonusUsages = await prisma.bonusUsage.findMany({
    where: { user: { isAdmin: false } },
    include: { user: { select: { id: true, username: true } } },
  });

  // ── Podium: total gains (DUEL_WIN + ADMIN_CREDIT + BONUS_STEAL_GAIN) ──
  const gainTypes = ["DUEL_WIN", "ADMIN_CREDIT", "BONUS_STEAL_GAIN"];
  const gainByPlayer: Record<string, number> = {};
  for (const p of players) gainByPlayer[p.id] = 0;
  for (const tx of transactions) {
    if (gainTypes.includes(tx.type) && tx.amount > 0) {
      gainByPlayer[tx.userId] = (gainByPlayer[tx.userId] || 0) + tx.amount;
    }
  }
  const podium = players
    .map((p) => ({ id: p.id, username: p.username, totalGains: gainByPlayer[p.id] || 0 }))
    .sort((a, b) => b.totalGains - a.totalGains);

  // ── Jeu 1-4: gains per time window ──
  // Jeu 1: from start to phase 1 startedAt
  // Jeu 2: from phase 1 endsAt to phase 2 startedAt
  // Jeu 3: from phase 2 endsAt to phase 3 startedAt
  // Jeu 4: from phase 3 endsAt to phase 4 startedAt
  const jeuWindows = [
    { label: "Jeu 1", from: null as Date | null, to: phases[0]?.startedAt ?? null },
    { label: "Jeu 2", from: phases[0]?.endsAt ?? null, to: phases[1]?.startedAt ?? null },
    { label: "Jeu 3", from: phases[1]?.endsAt ?? null, to: phases[2]?.startedAt ?? null },
    { label: "Jeu 4", from: phases[2]?.endsAt ?? null, to: phases[3]?.startedAt ?? null },
  ];

  const jeuStats = jeuWindows.map(({ label, from, to }) => {
    const gainsByPlayer: Record<string, number> = {};
    for (const p of players) gainsByPlayer[p.id] = 0;
    for (const tx of transactions) {
      if (!gainTypes.includes(tx.type) || tx.amount <= 0) continue;
      const t = tx.createdAt;
      if (from && t <= from) continue;
      if (to && t >= to) continue;
      gainsByPlayer[tx.userId] = (gainsByPlayer[tx.userId] || 0) + tx.amount;
    }
    const ranking = players
      .map((p) => ({ username: p.username, gains: gainsByPlayer[p.id] || 0 }))
      .sort((a, b) => b.gains - a.gains)
      .filter((p) => p.gains > 0);
    return { label, ranking };
  });

  // ── Duel stats ──
  const completedDuels = duels.filter((d) => d.status === "COMPLETED" && d.winnerId);
  const duelWins: Record<string, number> = {};
  const duelLosses: Record<string, number> = {};
  const duelCountByPlayer: Record<string, number> = {};

  for (const d of completedDuels) {
    const loserId = d.winnerId === d.challengerId ? d.opponentId : d.challengerId;
    duelWins[d.winnerId!] = (duelWins[d.winnerId!] || 0) + 1;
    duelLosses[loserId] = (duelLosses[loserId] || 0) + 1;
  }

  for (const d of duels.filter((d) => d.status !== "PENDING")) {
    duelCountByPlayer[d.challengerId] = (duelCountByPlayer[d.challengerId] || 0) + 1;
    duelCountByPlayer[d.opponentId] = (duelCountByPlayer[d.opponentId] || 0) + 1;
  }

  const mostWins = players
    .map((p) => ({ username: p.username, wins: duelWins[p.id] || 0 }))
    .sort((a, b) => b.wins - a.wins)[0];

  const mostLosses = players
    .map((p) => ({ username: p.username, losses: duelLosses[p.id] || 0 }))
    .sort((a, b) => b.losses - a.losses)[0];

  const mostDuels = players
    .map((p) => ({ username: p.username, count: duelCountByPlayer[p.id] || 0 }))
    .sort((a, b) => b.count - a.count)[0];

  const biggestDuel = [...completedDuels].sort((a, b) => b.betAmount - a.betAmount)[0];
  const totalDuelTD = completedDuels.reduce((s, d) => s + d.betAmount * 2, 0);

  // ── Auction stats ──
  const allItems = phases.flatMap((p) => p.items);
  const allBids = phases.flatMap((p) => p.items.flatMap((i) => i.bids));

  // Most coveted: highest total bids amount per item
  const bidsByItem: Record<string, { name: string; total: number; count: number }> = {};
  for (const item of allItems) {
    const total = item.bids.reduce((s, b) => s + b.amount, 0);
    bidsByItem[item.id] = { name: item.isMystery ? `${item.name} (mystère)` : item.name, total, count: item.bids.length };
  }
  const mostCoveted = Object.values(bidsByItem).sort((a, b) => b.total - a.total)[0];

  const biggestBid = [...allBids].sort((a, b) => b.amount - a.amount)[0];
  const biggestBidItem = biggestBid ? allItems.find((i) => i.id === biggestBid.itemId) : null;

  const totalBidPerPlayer: Record<string, number> = {};
  for (const bid of allBids) {
    totalBidPerPlayer[bid.userId] = (totalBidPerPlayer[bid.userId] || 0) + bid.amount;
  }
  const mostBidder = players
    .map((p) => ({ username: p.username, total: totalBidPerPlayer[p.id] || 0 }))
    .sort((a, b) => b.total - a.total)[0];

  // Top 3 single bids
  const top3Bids = [...allBids]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 3)
    .map((b) => {
      const item = allItems.find((i) => i.id === b.itemId);
      return {
        username: b.user.username,
        amount: b.amount,
        itemName: item ? (item.isMystery ? `${item.name} (mystère)` : item.name) : "?",
      };
    });

  // ── Bonus stats ──
  const stealLossMap: Record<string, number> = {};
  for (const tx of transactions) {
    if (tx.type === "BONUS_STEAL_LOSS") {
      stealLossMap[tx.userId] = (stealLossMap[tx.userId] || 0) + Math.abs(tx.amount);
    }
  }
  const mostStolen = players
    .map((p) => ({ username: p.username, lost: stealLossMap[p.id] || 0 }))
    .sort((a, b) => b.lost - a.lost)[0];

  const totalStolen = transactions
    .filter((tx) => tx.type === "BONUS_STEAL_GAIN")
    .reduce((s, tx) => s + tx.amount, 0);

  const bonusUsageByType: Record<string, number> = {};
  for (const u of bonusUsages) {
    bonusUsageByType[u.bonusType] = (bonusUsageByType[u.bonusType] || 0) + 1;
  }

  // ── Global stats ──
  const totalDistributed = transactions
    .filter((tx) => tx.type === "ADMIN_CREDIT" || tx.type === "INITIAL_BALANCE")
    .reduce((s, tx) => s + tx.amount, 0);

  return NextResponse.json({
    gameOver,
    podium,
    jeuStats,
    duels: {
      mostWins,
      mostLosses,
      mostDuels,
      biggestDuel: biggestDuel
        ? {
            challenger: biggestDuel.challenger.username,
            opponent: biggestDuel.opponent.username,
            betAmount: biggestDuel.betAmount,
            winner: players.find((p) => p.id === biggestDuel.winnerId)?.username || "?",
          }
        : null,
      totalDuelTD,
      total: duels.length,
      completed: completedDuels.length,
    },
    auctions: {
      mostCoveted,
      biggestBid: biggestBid
        ? {
            username: biggestBid.user.username,
            amount: biggestBid.amount,
            itemName: biggestBidItem
              ? biggestBidItem.isMystery
                ? `${biggestBidItem.name} (mystère)`
                : biggestBidItem.name
              : "?",
          }
        : null,
      top3Bids,
      mostBidder,
      phases: phases.map((p) => ({
        phase: p.phase,
        status: p.status,
        items: p.items.map((i) => ({
          name: i.name,
          displayName: i.displayName,
          isMystery: i.isMystery,
          winner: i.winner?.username || null,
          winningBid: i.winningBid,
          totalBids: i.bids.reduce((s, b) => s + b.amount, 0),
          bidCount: i.bids.length,
        })),
      })),
    },
    bonuses: {
      mostStolen,
      totalStolen,
      usageByType: bonusUsageByType,
      totalUsed: bonusUsages.length,
    },
    global: {
      totalDistributed,
      playerCount: players.length,
    },
  });
}
