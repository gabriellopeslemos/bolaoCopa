import type { Timestamp } from "firebase/firestore";
import type { Score, PointsBreakdown, ScoringConfig } from "@bolao/scoring";

export type { Score, PointsBreakdown, ScoringConfig };
export type {
  TournamentState, TournamentPhase, Seeded, DrawGroup,
  QualifiedParticipant, Matchup, KnockoutRound,
} from "@bolao/scoring";
import type { TournamentPhase } from "@bolao/scoring";

export type MatchStatus = "scheduled" | "live" | "finished";

export interface TeamInfo {
  name: string;
  code?: string;
  flag?: string;
}

export interface Match {
  id: string;
  competitionId: string;
  externalId?: number;
  round?: string;
  home: TeamInfo;
  away: TeamInfo;
  kickoff: Timestamp;
  status: MatchStatus;
  score: Score | null;
  elapsed?: number | null;
}

export interface Group {
  id: string;
  name: string;
  ownerId: string;
  inviteCode: string;
  memberCount?: number;
  scoringConfig?: Partial<ScoringConfig>;
  createdAt?: Timestamp;
}

export interface Member {
  id: string; // uid
  displayName: string;
  role: "owner" | "member";
  totalPoints: number;
  /** Pontos por fase do mata-mata (os pontos "zeram" a cada fase). */
  phasePoints?: Partial<Record<TournamentPhase, number>>;
  exactCount?: number;
  correctCount?: number;
  joinedAt?: Timestamp;
}

export interface Bet {
  id: string;
  userId: string;
  displayName?: string;
  matchId: string;
  score: Score;
  points: number;
  breakdown?: PointsBreakdown;
}

export interface GroupSummary {
  id: string;
  name: string;
  role: "owner" | "member";
  totalPoints: number;
  memberCount: number;
}
