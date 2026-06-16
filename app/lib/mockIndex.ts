/**
 * Index centralizado para dados mockados.
 *
 * Imports rápidos:
 * ```
 * import {
 *   mockMatches,
 *   useMockMatches,
 *   getMockMatchesByDate,
 *   validateAllMockData,
 * } from "@/lib/mockIndex";
 * ```
 */

// ============ DADOS PUROS ============
export {
  mockMatches,
  mockGroups,
  mockMembers,
  mockBets,
  getMockData,
  getMockMatchesByDate,
  getMockGroupMembers,
  getMockUserBets,
} from "./mockData";

// ============ HOOKS REACT QUERY ============
export {
  useMockMatches,
  useMockMatchesByDate,
  useMockGroups,
  useMockGroup,
  useMockGroupMembers,
  useMockUserBets,
} from "./useMockData";

// ============ VALIDAÇÃO ============
export { validateAllMockData, printValidationReport } from "./validateMockData";

// ============ TIPOS ============
export type { Match, Group, Member, Bet } from "./types";
