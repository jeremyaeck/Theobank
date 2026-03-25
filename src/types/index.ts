export type DuelStatus = "PENDING" | "ACTIVE" | "COMPLETED" | "CANCELLED";
export type TransactionType =
  | "INITIAL_BALANCE"
  | "DUEL_LOCK"
  | "DUEL_WIN"
  | "DUEL_REFUND"
  | "ADMIN_CREDIT"
  | "ADMIN_DEBIT"
  | "ADMIN_RESET"
  | "AUCTION_BID";

export interface User {
  id: string;
  username: string;
  balance: number;
  isAdmin: boolean;
  createdAt: string;
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
