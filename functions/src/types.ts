import { Timestamp } from "firebase-admin/firestore";
import type { Score, ScoringConfig, PointsBreakdown } from "@bolao/scoring";

export type MatchStatus = "scheduled" | "live" | "finished";

export interface TeamInfo {
  name: string;
  code?: string;
  flag?: string;
}

export interface MatchDoc {
  competitionId: string;
  externalId: number;
  round?: string;
  home: TeamInfo;
  away: TeamInfo;
  kickoff: Timestamp;
  status: MatchStatus;
  score: Score | null;
  updatedAt?: Timestamp;
  // Marca quando os lembretes (~2h antes) já foram enviados, para não repetir.
  remindersSentAt?: Timestamp;
}

export interface GroupDoc {
  name: string;
  ownerId: string;
  inviteCode: string;
  scoringConfig?: Partial<ScoringConfig>;
  createdAt: Timestamp;
}

export interface BetDoc {
  userId: string;
  matchId: string;
  score: Score;
  points: number;
  breakdown?: PointsBreakdown;
  scoredAt?: Timestamp | null;
}

export interface MemberDoc {
  displayName: string;
  role: "owner" | "member";
  totalPoints: number;
  joinedAt: Timestamp;
}
