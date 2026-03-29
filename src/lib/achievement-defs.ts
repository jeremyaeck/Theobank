export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  emoji: string;
}

export const ACHIEVEMENTS: Record<string, AchievementDef> = {
  FIRST_DUEL_WIN: {
    id: "FIRST_DUEL_WIN",
    name: "Premier sang",
    description: "Remporter son premier duel",
    emoji: "⚔️",
  },
  DUEL_CHAMPION: {
    id: "DUEL_CHAMPION",
    name: "Champion des duels",
    description: "Remporter 5 duels",
    emoji: "🏆",
  },
  MILLIONAIRE: {
    id: "MILLIONAIRE",
    name: "Millionnaire",
    description: "Atteindre un solde de 1000 T$",
    emoji: "💰",
  },
  AUCTION_WINNER: {
    id: "AUCTION_WINNER",
    name: "Enchérisseur",
    description: "Remporter une enchère",
    emoji: "🎁",
  },
  THIEF: {
    id: "THIEF",
    name: "Pickpocket",
    description: "Voler un joueur avec le bonus Vol",
    emoji: "🦹",
  },
  JACKPOT_LUCKY: {
    id: "JACKPOT_LUCKY",
    name: "Veinard",
    description: "Gagner au Jackpot (résultat positif)",
    emoji: "🎰",
  },
  WHEEL_MASTER: {
    id: "WHEEL_MASTER",
    name: "Maître de la roue",
    description: "Tourner la Roue du Destin",
    emoji: "🎡",
  },
  BOUCLIER_USER: {
    id: "BOUCLIER_USER",
    name: "Intouchable",
    description: "Activer le Bouclier",
    emoji: "🛡️",
  },
  BONUS_COLLECTOR: {
    id: "BONUS_COLLECTOR",
    name: "Collectionneur",
    description: "Utiliser les 5 bonus",
    emoji: "✨",
  },
};
