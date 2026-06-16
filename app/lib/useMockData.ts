/**
 * Hook para usar dados mockados em testes e desenvolvimento.
 *
 * Uso:
 * ```
 * import { useMockMatches, useMockGroupMembers } from "@/lib/useMockData";
 *
 * // No componente
 * const { data: matches } = useMockMatches();
 * const { data: members } = useMockGroupMembers("group-001");
 * ```
 */


import { useQuery } from "@tanstack/react-query";
import {
  getMockData,
  getMockMatchesByDate,
  getMockGroupMembers,
  getMockUserBets,
} from "./mockData";
import type { Match, Group, Member, Bet } from "./types";

// ============ MATCHES ============

export function useMockMatches() {
  return useQuery<Match[]>({
    queryKey: ["mock-matches"],
    queryFn: async () => {
      return getMockData("matches");
    },
  });
}

export function useMockMatchesByDate(date: Date) {
  return useQuery<Match[]>({
    queryKey: ["mock-matches-by-date", date.toISOString().split("T")[0]],
    queryFn: async () => {
      return getMockMatchesByDate(date);
    },
  });
}

// ============ GROUPS ============

export function useMockGroups() {
  return useQuery<Group[]>({
    queryKey: ["mock-groups"],
    queryFn: async () => {
      return getMockData("groups");
    },
  });
}

export function useMockGroup(groupId: string | undefined) {
  return useQuery<Group | null>({
    queryKey: ["mock-group", groupId],
    enabled: !!groupId,
    queryFn: async () => {
      const groups = getMockData("groups");
      return groups.find((g) => g.id === groupId) || null;
    },
  });
}

// ============ MEMBERS ============

export function useMockGroupMembers(groupId: string | undefined) {
  return useQuery<Member[]>({
    queryKey: ["mock-members", groupId],
    enabled: !!groupId,
    queryFn: async () => {
      return groupId ? getMockGroupMembers(groupId) : [];
    },
  });
}

// ============ BETS ============

export function useMockUserBets(groupId: string | undefined, userId: string | undefined) {
  return useQuery<Record<string, Bet>>({
    queryKey: ["mock-user-bets", groupId, userId],
    enabled: !!groupId && !!userId,
    queryFn: async () => {
      if (!groupId || !userId) return {};
      const bets = getMockUserBets(groupId, userId);
      return bets.reduce(
        (acc, bet) => {
          acc[bet.matchId] = bet;
          return acc;
        },
        {} as Record<string, Bet>
      );
    },
  });
}
