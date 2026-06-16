import { Timestamp } from "firebase/firestore";
import type { Match, Group, Member, Bet } from "./types";

/**
 * Dados mockados para testar todas as funcionalidades do app.
 * Inclui:
 * - Partidas em várias datas, com diferentes status (scheduled, live, finished)
 * - Grupos/bolões
 * - Membros com pontuações variadas
 * - Palpites dos jogadores
 */

// MATCHES - Partidas da competição
export const mockMatches: Match[] = [
  // Junho 11
  {
    id: "match-001",
    competitionId: "copa-2026",
    externalId: 1,
    round: "Group Stage",
    home: { name: "Brasil", code: "BRA", flag: "🇧🇷" },
    away: { name: "Canadá", code: "CAN", flag: "🇨🇦" },
    kickoff: Timestamp.fromDate(new Date(2026, 5, 11, 17, 0)),
    status: "finished",
    score: { home: 3, away: 0 },
  },
  {
    id: "match-002",
    competitionId: "copa-2026",
    externalId: 2,
    round: "Group Stage",
    home: { name: "Argentina", code: "ARG", flag: "🇦🇷" },
    away: { name: "Marrocos", code: "MAR", flag: "🇲🇦" },
    kickoff: Timestamp.fromDate(new Date(2026, 5, 11, 20, 0)),
    status: "finished",
    score: { home: 2, away: 1 },
  },
  {
    id: "match-003",
    competitionId: "copa-2026",
    externalId: 3,
    round: "Group Stage",
    home: { name: "Uruguai", code: "URU", flag: "🇺🇾" },
    away: { name: "Colômbia", code: "COL", flag: "🇨🇴" },
    kickoff: Timestamp.fromDate(new Date(2026, 5, 11, 23, 0)),
    status: "finished",
    score: { home: 1, away: 1 },
  },

  // Junho 12
  {
    id: "match-004",
    competitionId: "copa-2026",
    externalId: 4,
    round: "Group Stage",
    home: { name: "França", code: "FRA", flag: "🇫🇷" },
    away: { name: "Itália", code: "ITA", flag: "🇮🇹" },
    kickoff: Timestamp.fromDate(new Date(2026, 5, 12, 14, 0)),
    status: "finished",
    score: { home: 2, away: 1 },
  },
  {
    id: "match-005",
    competitionId: "copa-2026",
    externalId: 5,
    round: "Group Stage",
    home: { name: "Alemanha", code: "GER", flag: "🇩🇪" },
    away: { name: "Espanha", code: "ESP", flag: "🇪🇸" },
    kickoff: Timestamp.fromDate(new Date(2026, 5, 12, 17, 30)),
    status: "finished",
    score: { home: 1, away: 2 },
  },
  {
    id: "match-006",
    competitionId: "copa-2026",
    externalId: 6,
    round: "Group Stage",
    home: { name: "Inglaterra", code: "ENG", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
    away: { name: "Holanda", code: "NED", flag: "🇳🇱" },
    kickoff: Timestamp.fromDate(new Date(2026, 5, 12, 21, 0)),
    status: "live",
    score: { home: 1, away: 1 },
  },

  // Junho 13 - Próximos
  {
    id: "match-007",
    competitionId: "copa-2026",
    externalId: 7,
    round: "Group Stage",
    home: { name: "Portugal", code: "POR", flag: "🇵🇹" },
    away: { name: "Bélgica", code: "BEL", flag: "🇧🇪" },
    kickoff: Timestamp.fromDate(new Date(2026, 5, 13, 15, 0)),
    status: "scheduled",
    score: null,
  },
  {
    id: "match-008",
    competitionId: "copa-2026",
    externalId: 8,
    round: "Group Stage",
    home: { name: "México", code: "MEX", flag: "🇲🇽" },
    away: { name: "Japão", code: "JPN", flag: "🇯🇵" },
    kickoff: Timestamp.fromDate(new Date(2026, 5, 13, 18, 30)),
    status: "scheduled",
    score: null,
  },
  {
    id: "match-009",
    competitionId: "copa-2026",
    externalId: 9,
    round: "Group Stage",
    home: { name: "Austrália", code: "AUS", flag: "🇦🇺" },
    away: { name: "Coreia do Sul", code: "KOR", flag: "🇰🇷" },
    kickoff: Timestamp.fromDate(new Date(2026, 5, 13, 21, 0)),
    status: "scheduled",
    score: null,
  },

  // Junho 14
  {
    id: "match-010",
    competitionId: "copa-2026",
    externalId: 10,
    round: "Group Stage",
    home: { name: "Suíça", code: "SUI", flag: "🇨🇭" },
    away: { name: "Irã", code: "IRI", flag: "🇮🇷" },
    kickoff: Timestamp.fromDate(new Date(2026, 5, 14, 14, 0)),
    status: "scheduled",
    score: null,
  },
  {
    id: "match-011",
    competitionId: "copa-2026",
    externalId: 11,
    round: "Group Stage",
    home: { name: "Dinamarca", code: "DEN", flag: "🇩🇰" },
    away: { name: "Sérvia", code: "SRB", flag: "🇷🇸" },
    kickoff: Timestamp.fromDate(new Date(2026, 5, 14, 17, 30)),
    status: "scheduled",
    score: null,
  },
];

// GROUPS - Bolões/Grupos
export const mockGroups: Group[] = [
  {
    id: "group-001",
    name: "Bolão dos Amigos",
    ownerId: "user-001",
    inviteCode: "ABC123",
    memberCount: 8,
    createdAt: Timestamp.fromDate(new Date(2026, 4, 1)),
  },
  {
    id: "group-002",
    name: "Copa no Trampo",
    ownerId: "user-002",
    inviteCode: "XYZ789",
    memberCount: 12,
    createdAt: Timestamp.fromDate(new Date(2026, 3, 15)),
  },
  {
    id: "group-003",
    name: "Família FC",
    ownerId: "user-003",
    inviteCode: "FAM456",
    memberCount: 5,
    createdAt: Timestamp.fromDate(new Date(2026, 4, 10)),
  },
];

// MEMBERS - Membros dos grupos com pontuação
export const mockMembers: Record<string, Member[]> = {
  "group-001": [
    {
      id: "user-001",
      displayName: "João Silva",
      role: "owner",
      totalPoints: 285,
      exactCount: 2,
      correctCount: 8,
      joinedAt: Timestamp.fromDate(new Date(2026, 4, 1)),
    },
    {
      id: "user-002",
      displayName: "Maria Santos",
      role: "member",
      totalPoints: 245,
      exactCount: 1,
      correctCount: 7,
      joinedAt: Timestamp.fromDate(new Date(2026, 4, 2)),
    },
    {
      id: "user-003",
      displayName: "Pedro Oliveira",
      role: "member",
      totalPoints: 220,
      exactCount: 0,
      correctCount: 6,
      joinedAt: Timestamp.fromDate(new Date(2026, 4, 3)),
    },
    {
      id: "user-004",
      displayName: "Ana Costa",
      role: "member",
      totalPoints: 195,
      exactCount: 1,
      correctCount: 5,
      joinedAt: Timestamp.fromDate(new Date(2026, 4, 5)),
    },
    {
      id: "user-005",
      displayName: "Carlos Ferreira",
      role: "member",
      totalPoints: 160,
      exactCount: 0,
      correctCount: 4,
      joinedAt: Timestamp.fromDate(new Date(2026, 4, 7)),
    },
    {
      id: "user-006",
      displayName: "Lucia Mendes",
      role: "member",
      totalPoints: 135,
      exactCount: 0,
      correctCount: 3,
      joinedAt: Timestamp.fromDate(new Date(2026, 4, 8)),
    },
    {
      id: "user-007",
      displayName: "Roberto Silva",
      role: "member",
      totalPoints: 110,
      exactCount: 0,
      correctCount: 2,
      joinedAt: Timestamp.fromDate(new Date(2026, 4, 10)),
    },
    {
      id: "user-008",
      displayName: "Fernanda Rocha",
      role: "member",
      totalPoints: 85,
      exactCount: 0,
      correctCount: 1,
      joinedAt: Timestamp.fromDate(new Date(2026, 4, 12)),
    },
  ],
  "group-002": [
    {
      id: "user-002",
      displayName: "Gustavo Lima",
      role: "owner",
      totalPoints: 310,
      exactCount: 3,
      correctCount: 9,
      joinedAt: Timestamp.fromDate(new Date(2026, 3, 15)),
    },
    {
      id: "user-003",
      displayName: "Felipe Alves",
      role: "member",
      totalPoints: 275,
      exactCount: 2,
      correctCount: 8,
      joinedAt: Timestamp.fromDate(new Date(2026, 3, 20)),
    },
    {
      id: "user-004",
      displayName: "Juliana Gomes",
      role: "member",
      totalPoints: 250,
      exactCount: 1,
      correctCount: 7,
      joinedAt: Timestamp.fromDate(new Date(2026, 3, 22)),
    },
    {
      id: "user-009",
      displayName: "Marcelo Dias",
      role: "member",
      totalPoints: 200,
      exactCount: 1,
      correctCount: 5,
      joinedAt: Timestamp.fromDate(new Date(2026, 4, 1)),
    },
    {
      id: "user-010",
      displayName: "Camila Souza",
      role: "member",
      totalPoints: 175,
      exactCount: 0,
      correctCount: 4,
      joinedAt: Timestamp.fromDate(new Date(2026, 4, 5)),
    },
  ],
  "group-003": [
    {
      id: "user-003",
      displayName: "Paola Silva",
      role: "owner",
      totalPoints: 295,
      exactCount: 2,
      correctCount: 8,
      joinedAt: Timestamp.fromDate(new Date(2026, 4, 10)),
    },
    {
      id: "user-011",
      displayName: "Bruno Silva",
      role: "member",
      totalPoints: 260,
      exactCount: 2,
      correctCount: 7,
      joinedAt: Timestamp.fromDate(new Date(2026, 4, 11)),
    },
    {
      id: "user-012",
      displayName: "Isabela Costa",
      role: "member",
      totalPoints: 190,
      exactCount: 0,
      correctCount: 5,
      joinedAt: Timestamp.fromDate(new Date(2026, 4, 12)),
    },
    {
      id: "user-013",
      displayName: "Thiago Oliveira",
      role: "member",
      totalPoints: 140,
      exactCount: 0,
      correctCount: 3,
      joinedAt: Timestamp.fromDate(new Date(2026, 4, 13)),
    },
  ],
};

// BETS - Palpites dos jogadores
export const mockBets: Record<string, Record<string, Bet>> = {
  "group-001": {
    "user-001": [
      {
        id: "bet-001-001",
        userId: "user-001",
        displayName: "João Silva",
        matchId: "match-001",
        score: { home: 3, away: 0 },
        points: 60,
      },
      {
        id: "bet-001-002",
        userId: "user-001",
        displayName: "João Silva",
        matchId: "match-002",
        score: { home: 2, away: 0 },
        points: 30,
      },
      {
        id: "bet-001-003",
        userId: "user-001",
        displayName: "João Silva",
        matchId: "match-003",
        score: { home: 2, away: 1 },
        points: 15,
      },
      {
        id: "bet-001-004",
        userId: "user-001",
        displayName: "João Silva",
        matchId: "match-004",
        score: { home: 2, away: 1 },
        points: 60,
      },
      {
        id: "bet-001-005",
        userId: "user-001",
        displayName: "João Silva",
        matchId: "match-005",
        score: { home: 1, away: 2 },
        points: 60,
      },
      {
        id: "bet-001-006",
        userId: "user-001",
        displayName: "João Silva",
        matchId: "match-006",
        score: { home: 1, away: 1 },
        points: 60,
      },
    ],
    "user-002": [
      {
        id: "bet-002-001",
        userId: "user-002",
        displayName: "Maria Santos",
        matchId: "match-001",
        score: { home: 2, away: 0 },
        points: 30,
      },
      {
        id: "bet-002-002",
        userId: "user-002",
        displayName: "Maria Santos",
        matchId: "match-002",
        score: { home: 3, away: 1 },
        points: 15,
      },
      {
        id: "bet-002-003",
        userId: "user-002",
        displayName: "Maria Santos",
        matchId: "match-003",
        score: { home: 2, away: 2 },
        points: 0,
      },
      {
        id: "bet-002-004",
        userId: "user-002",
        displayName: "Maria Santos",
        matchId: "match-004",
        score: { home: 3, away: 1 },
        points: 15,
      },
      {
        id: "bet-002-005",
        userId: "user-002",
        displayName: "Maria Santos",
        matchId: "match-005",
        score: { home: 2, away: 1 },
        points: 30,
      },
      {
        id: "bet-002-006",
        userId: "user-002",
        displayName: "Maria Santos",
        matchId: "match-006",
        score: { home: 2, away: 0 },
        points: 15,
      },
    ],
    "user-003": [
      {
        id: "bet-003-001",
        userId: "user-003",
        displayName: "Pedro Oliveira",
        matchId: "match-001",
        score: { home: 2, away: 1 },
        points: 15,
      },
      {
        id: "bet-003-002",
        userId: "user-003",
        displayName: "Pedro Oliveira",
        matchId: "match-002",
        score: { home: 1, away: 0 },
        points: 15,
      },
      {
        id: "bet-003-003",
        userId: "user-003",
        displayName: "Pedro Oliveira",
        matchId: "match-003",
        score: { home: 1, away: 1 },
        points: 60,
      },
      {
        id: "bet-003-004",
        userId: "user-003",
        displayName: "Pedro Oliveira",
        matchId: "match-004",
        score: { home: 1, away: 1 },
        points: 15,
      },
      {
        id: "bet-003-005",
        userId: "user-003",
        displayName: "Pedro Oliveira",
        matchId: "match-005",
        score: { home: 2, away: 0 },
        points: 15,
      },
      {
        id: "bet-003-006",
        userId: "user-003",
        displayName: "Pedro Oliveira",
        matchId: "match-006",
        score: { home: 2, away: 1 },
        points: 15,
      },
    ],
  },
};

// HELPER: Obtém dados mockados por tipo
export function getMockData(type: "matches" | "groups" | "members" | "bets") {
  switch (type) {
    case "matches":
      return mockMatches;
    case "groups":
      return mockGroups;
    case "members":
      return mockMembers;
    case "bets":
      return mockBets;
    default:
      throw new Error(`Unknown mock data type: ${type}`);
  }
}

// HELPER: Obtém matches filtrados por data
export function getMockMatchesByDate(date: Date): Match[] {
  return mockMatches.filter((m) => {
    if (!m.kickoff) return false;
    const d = m.kickoff.toDate();
    return (
      d.getFullYear() === date.getFullYear() &&
      d.getMonth() === date.getMonth() &&
      d.getDate() === date.getDate()
    );
  });
}

// HELPER: Obtém membros de um grupo
export function getMockGroupMembers(groupId: string): Member[] {
  return mockMembers[groupId] || [];
}

// HELPER: Obtém palpites de um usuário em um grupo
export function getMockUserBets(groupId: string, userId: string): Bet[] {
  return mockBets[groupId]?.[userId] || [];
}
