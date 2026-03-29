import { prisma } from "./prisma";
import { ACHIEVEMENTS } from "./achievement-defs";

export { ACHIEVEMENTS };
export type { AchievementDef } from "./achievement-defs";

export type AchievementTrigger =
  | "DUEL_WIN"
  | "BALANCE_INCREASE"
  | "AUCTION_WIN"
  | "BONUS_VOL"
  | "BONUS_JACKPOT_WIN"
  | "BONUS_ROUE"
  | "BONUS_BOUCLIER";

/**
 * Checks which achievements the user just unlocked and creates records for new ones.
 * Returns the IDs of newly unlocked achievements.
 * Should be called AFTER the main transaction (needs final DB state).
 */
export async function checkAndUnlockAchievements(
  userId: string,
  trigger: AchievementTrigger
): Promise<string[]> {
  const existing = await prisma.userAchievement.findMany({
    where: { userId },
    select: { achievementId: true },
  });
  const existingIds = new Set(existing.map((a) => a.achievementId));

  const toUnlock: string[] = [];

  if (trigger === "DUEL_WIN") {
    if (!existingIds.has("FIRST_DUEL_WIN")) {
      toUnlock.push("FIRST_DUEL_WIN");
    }
    if (!existingIds.has("DUEL_CHAMPION")) {
      const wins = await prisma.duel.count({
        where: { winnerId: userId, status: "COMPLETED" },
      });
      if (wins >= 5) toUnlock.push("DUEL_CHAMPION");
    }
    // Check millionaire on duel win (prize money)
    if (!existingIds.has("MILLIONAIRE")) {
      const u = await prisma.user.findUnique({ where: { id: userId }, select: { balance: true } });
      if (u && u.balance >= 1000) toUnlock.push("MILLIONAIRE");
    }
  }

  if (trigger === "BALANCE_INCREASE") {
    if (!existingIds.has("MILLIONAIRE")) {
      const u = await prisma.user.findUnique({ where: { id: userId }, select: { balance: true } });
      if (u && u.balance >= 1000) toUnlock.push("MILLIONAIRE");
    }
  }

  if (trigger === "AUCTION_WIN" && !existingIds.has("AUCTION_WINNER")) {
    toUnlock.push("AUCTION_WINNER");
  }

  if (trigger === "BONUS_VOL" && !existingIds.has("THIEF")) {
    toUnlock.push("THIEF");
  }

  if (trigger === "BONUS_JACKPOT_WIN" && !existingIds.has("JACKPOT_LUCKY")) {
    toUnlock.push("JACKPOT_LUCKY");
  }

  if (trigger === "BONUS_ROUE" && !existingIds.has("WHEEL_MASTER")) {
    toUnlock.push("WHEEL_MASTER");
  }

  if (trigger === "BONUS_BOUCLIER" && !existingIds.has("BOUCLIER_USER")) {
    toUnlock.push("BOUCLIER_USER");
  }

  // BONUS_COLLECTOR: all 5 active bonus types used
  if (
    (trigger === "BONUS_VOL" ||
      trigger === "BONUS_JACKPOT_WIN" ||
      trigger === "BONUS_ROUE" ||
      trigger === "BONUS_BOUCLIER") &&
    !existingIds.has("BONUS_COLLECTOR")
  ) {
    const used = await prisma.bonusUsage.groupBy({
      by: ["bonusType"],
      where: {
        userId,
        bonusType: { in: ["GAIN_DOUBLE", "VOL", "BOUCLIER", "JACKPOT", "ROUE"] },
      },
    });
    if (used.length >= 5) toUnlock.push("BONUS_COLLECTOR");
  }

  const unlocked: string[] = [];
  for (const achievementId of toUnlock) {
    try {
      await prisma.userAchievement.create({ data: { userId, achievementId } });
      unlocked.push(achievementId);
    } catch {
      // Already exists (race condition) — skip
    }
  }

  return unlocked;
}
