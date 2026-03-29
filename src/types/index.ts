export type DuelStatus = "PENDING" | "ACTIVE" | "COMPLETED" | "CANCELLED";
export type TransactionType =
  | "INITIAL_BALANCE"
  | "DUEL_LOCK"
  | "DUEL_WIN"
  | "DUEL_REFUND"
  | "ADMIN_CREDIT"
  | "ADMIN_DEBIT"
  | "ADMIN_RESET"
  | "AUCTION_BID"
  | "BONUS_STEAL_GAIN"
  | "BONUS_STEAL_LOSS"
  | "BONUS_JACKPOT";

export interface User {
  id: string;
  username: string;
  balance: number;
  isAdmin: boolean;
  approved?: boolean;
  profilePhotoUrl?: string | null;
  hasWebAuthn?: boolean;
  createdAt: string;
}

export interface Team {
  id: string;
  name: string;
  members: User[];
  createdAt: string;
  updatedAt: string;
}

export interface Duel {
  id: string;
  challengerId: string;
  opponentId: string;
  betAmount: number;
  status: DuelStatus;
  challengerVote: string | null;
  opponentVote: string | null;
  winnerId: string | null;
  createdAt: string;
  updatedAt: string;
  challenger: User;
  opponent: User;
}

export interface Transaction {
  id: string;
  userId: string;
  amount: number;
  type: TransactionType;
  description: string | null;
  duelId: string | null;
  createdAt: string;
}

export interface AuthPayload {
  userId: string;
  isAdmin: boolean;
}

export type BonusType = "CLASSEMENT" | "SOLDE_MAX" | "SOLDE_MOYEN" | "GAIN_DOUBLE" | "VOL" | "BOUCLIER" | "JACKPOT" | "ROUE";

export type WheelSegmentType = "JACKPOT" | "GAIN" | "VOL_RANDOM" | "PLUIE" | "RIEN" | "MALUS" | "RUINE" | "JACKPOT_INV";

export interface WheelSegment {
  type: WheelSegmentType;
  emoji: string;
  name: string;
  description: string;
  color: string;
}

export interface WheelEvent {
  id: string;
  spinnerUsername: string;
  segmentIndex: number;
  amount: number;
  targetUsername?: string;
  usedAt: string;
}

export interface BonusUsage {
  id: string;
  userId: string;
  bonusType: BonusType;
  usedAt: string;
  expiresAt: string | null;
  data: any;
}

export interface StealAlert {
  id: string;
  thiefUsername: string;
  amount: number;
  usedAt: string;
}

export interface Achievement {
  id: string;
  achievementId: string;
  name: string;
  description: string;
  emoji: string;
  unlockedAt: string;
}

export interface NewAchievementEvent {
  id: string;
  achievementId: string;
  name: string;
  description: string;
  emoji: string;
  unlockedAt: string;
}

export type AuctionPhaseStatus = "LOCKED" | "ACTIVE" | "FINISHED";

export interface AuctionBid {
  id: string;
  userId: string;
  itemId: string;
  amount: number;
  validatedAt: string;
  user?: User;
}

export interface AuctionItem {
  id: string;
  name: string;
  displayName: string;
  isMystery: boolean;
  position: number;
  phaseId: string;
  winnerId: string | null;
  winner?: User | null;
  winningBid: number | null;
  bids?: AuctionBid[];
}

export interface AuctionPhase {
  id: string;
  phase: number;
  status: AuctionPhaseStatus;
  startedAt: string | null;
  endsAt: string | null;
  items: AuctionItem[];
  createdAt: string;
}
