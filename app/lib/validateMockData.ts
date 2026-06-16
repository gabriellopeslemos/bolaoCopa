/**
 * Utilitário para validar integridade dos dados mockados.
 *
 * Uso:
 * ```
 * import { validateAllMockData } from "@/lib/validateMockData";
 *
 * const report = validateAllMockData();
 * console.log(report);
 * ```
 */

import {
  mockMatches,
  mockGroups,
  mockMembers,
  mockBets,
  getMockMatchesByDate,
  getMockGroupMembers,
  getMockUserBets,
} from "./mockData";
import type { Match, Group, Member, Bet } from "./types";

interface ValidationReport {
  valid: boolean;
  summary: string;
  details: {
    matches: MatchValidation;
    groups: GroupValidation;
    members: MemberValidation;
    bets: BetValidation;
    consistency: ConsistencyValidation;
  };
  errors: string[];
  warnings: string[];
}

interface MatchValidation {
  total: number;
  finalized: number;
  live: number;
  scheduled: number;
  dateRange: string;
  issues: string[];
}

interface GroupValidation {
  total: number;
  memberCounts: Record<string, number>;
  issues: string[];
}

interface MemberValidation {
  total: number;
  byGroup: Record<string, number>;
  avgPoints: number;
  issues: string[];
}

interface BetValidation {
  total: number;
  byGroup: Record<string, number>;
  issues: string[];
}

interface ConsistencyValidation {
  groupMembersMatch: boolean;
  betsMatchesExist: boolean;
  userIdsConsistent: boolean;
  issues: string[];
}

// ============ VALIDAÇÕES ============

function validateMatches(): MatchValidation {
  const result: MatchValidation = {
    total: mockMatches.length,
    finalized: 0,
    live: 0,
    scheduled: 0,
    dateRange: "",
    issues: [],
  };

  const dates: number[] = [];

  mockMatches.forEach((m, i) => {
    // Validar campos obrigatórios
    if (!m.id) result.issues.push(`Match ${i}: ID faltando`);
    if (!m.home.name) result.issues.push(`Match ${i}: home.name faltando`);
    if (!m.away.name) result.issues.push(`Match ${i}: away.name faltando`);
    if (!m.kickoff) result.issues.push(`Match ${i}: kickoff faltando`);
    if (!["scheduled", "live", "finished"].includes(m.status)) {
      result.issues.push(`Match ${i}: status inválido (${m.status})`);
    }

    // Contar por status
    if (m.status === "finished") result.finalized++;
    if (m.status === "live") result.live++;
    if (m.status === "scheduled") result.scheduled++;

    // Coletar datas
    if (m.kickoff) {
      const d = m.kickoff.toDate();
      dates.push(d.getTime());
    }

    // Validar score vs status
    if (m.status === "finished" && !m.score) {
      result.issues.push(`Match ${i}: status finished mas score é null`);
    }
    if (m.status !== "finished" && m.score) {
      result.issues.push(`Match ${i}: status não finished mas score existe`);
    }
  });

  if (dates.length > 0) {
    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(Math.max(...dates));
    result.dateRange = `${minDate.toLocaleDateString("pt-BR")} a ${maxDate.toLocaleDateString("pt-BR")}`;
  }

  return result;
}

function validateGroups(): GroupValidation {
  const result: GroupValidation = {
    total: mockGroups.length,
    memberCounts: {},
    issues: [],
  };

  mockGroups.forEach((g, i) => {
    if (!g.id) result.issues.push(`Group ${i}: ID faltando`);
    if (!g.name) result.issues.push(`Group ${i}: name faltando`);
    if (!g.ownerId) result.issues.push(`Group ${i}: ownerId faltando`);
    if (!g.inviteCode) result.issues.push(`Group ${i}: inviteCode faltando`);

    result.memberCounts[g.id] = g.memberCount ?? 0;
  });

  return result;
}

function validateMembers(): MemberValidation {
  const result: MemberValidation = {
    total: 0,
    byGroup: {},
    avgPoints: 0,
    issues: [],
  };

  let totalPoints = 0;

  Object.entries(mockMembers).forEach(([groupId, members]) => {
    result.byGroup[groupId] = members.length;
    result.total += members.length;

    members.forEach((m, i) => {
      if (!m.id) result.issues.push(`Member ${i} in ${groupId}: ID faltando`);
      if (!m.displayName) result.issues.push(`Member ${i} in ${groupId}: displayName faltando`);
      if (![‌"owner", "member"].includes(m.role)) {
        result.issues.push(`Member ${i} in ${groupId}: role inválido (${m.role})`);
      }

      totalPoints += m.totalPoints ?? 0;
    });
  });

  result.avgPoints = result.total > 0 ? Math.round(totalPoints / result.total) : 0;

  return result;
}

function validateBets(): BetValidation {
  const result: BetValidation = {
    total: 0,
    byGroup: {},
    issues: [],
  };

  Object.entries(mockBets).forEach(([groupId, userBets]) => {
    const groupBetCount = Object.values(userBets).reduce((sum, bets) => sum + bets.length, 0);
    result.byGroup[groupId] = groupBetCount;
    result.total += groupBetCount;

    Object.entries(userBets).forEach(([userId, bets]) => {
      bets.forEach((b, i) => {
        if (!b.id) result.issues.push(`Bet ${i} by ${userId}: ID faltando`);
        if (!b.matchId) result.issues.push(`Bet ${i} by ${userId}: matchId faltando`);
        if (!b.score || b.score.home === undefined || b.score.away === undefined) {
          result.issues.push(`Bet ${i} by ${userId}: score inválido`);
        }
        if (typeof b.points !== "number") {
          result.issues.push(`Bet ${i} by ${userId}: points não é número`);
        }
      });
    });
  });

  return result;
}

function validateConsistency(): ConsistencyValidation {
  const result: ConsistencyValidation = {
    groupMembersMatch: true,
    betsMatchesExist: true,
    userIdsConsistent: true,
    issues: [],
  };

  // Verificar se membros.length corresponde a memberCount dos groups
  mockGroups.forEach((g) => {
    const actualCount = mockMembers[g.id]?.length ?? 0;
    const expectedCount = g.memberCount ?? 0;
    if (actualCount !== expectedCount) {
      result.groupMembersMatch = false;
      result.issues.push(
        `Group ${g.id}: memberCount é ${expectedCount} mas tem ${actualCount} membros`
      );
    }
  });

  // Verificar se todos os bets referem matches que existem
  const matchIds = new Set(mockMatches.map((m) => m.id));
  Object.values(mockBets).forEach((userBets) => {
    Object.values(userBets).forEach((bets) => {
      bets.forEach((b) => {
        if (!matchIds.has(b.matchId)) {
          result.betsMatchesExist = false;
          result.issues.push(`Bet ${b.id}: matchId ${b.matchId} não existe em matches`);
        }
      });
    });
  });

  // Verificar se userIds de bets existem em members
  const memberIds = new Set<string>();
  Object.values(mockMembers).forEach((members) => {
    members.forEach((m) => memberIds.add(m.id));
  });

  Object.entries(mockBets).forEach(([groupId, userBets]) => {
    Object.keys(userBets).forEach((userId) => {
      const groupMemberIds = new Set(mockMembers[groupId]?.map((m) => m.id) ?? []);
      if (!groupMemberIds.has(userId)) {
        result.userIdsConsistent = false;
        result.issues.push(`Group ${groupId}: bet user ${userId} não é membro do grupo`);
      }
    });
  });

  return result;
}

// ============ MAIN VALIDATION ============

export function validateAllMockData(): ValidationReport {
  const matches = validateMatches();
  const groups = validateGroups();
  const members = validateMembers();
  const bets = validateBets();
  const consistency = validateConsistency();

  const allErrors = [
    ...matches.issues,
    ...groups.issues,
    ...members.issues,
    ...bets.issues,
    ...consistency.issues,
  ];

  const warnings: string[] = [];

  if (matches.total < 5) warnings.push("⚠️ Menos de 5 matches (recomendado: 10+)");
  if (groups.total < 2) warnings.push("⚠️ Menos de 2 grupos (recomendado: 3+)");
  if (members.total < 8) warnings.push("⚠️ Menos de 8 membros no total (recomendado: 15+)");
  if (bets.total < 5) warnings.push("⚠️ Menos de 5 palpites (recomendado: 20+)");

  const valid = allErrors.length === 0;

  const summary = valid
    ? `✅ Todos os dados mockados estão válidos!\n${matches.total} matches, ${groups.total} grupos, ${members.total} membros, ${bets.total} palpites`
    : `❌ ${allErrors.length} erro(s) encontrado(s) nos dados mockados`;

  return {
    valid,
    summary,
    details: { matches, groups, members, bets, consistency },
    errors: allErrors,
    warnings,
  };
}

// ============ HELPERS ============

export function printValidationReport(report: ValidationReport): void {
  console.log("\n" + "=".repeat(60));
  console.log("📋 VALIDAÇÃO DE DADOS MOCKADOS");
  console.log("=".repeat(60));

  console.log("\n" + report.summary);

  console.log("\n📊 ESTATÍSTICAS:");
  console.log(`  Matches: ${report.details.matches.total}`);
  console.log(`    - Finalizadas: ${report.details.matches.finalized}`);
  console.log(`    - Ao vivo: ${report.details.matches.live}`);
  console.log(`    - Agendadas: ${report.details.matches.scheduled}`);
  console.log(`    - Período: ${report.details.matches.dateRange}`);

  console.log(`  Grupos: ${report.details.groups.total}`);
  Object.entries(report.details.groups.memberCounts).forEach(([gid, count]) => {
    console.log(`    - ${gid}: ${count} membros`);
  });

  console.log(`  Membros: ${report.details.members.total} (média: ${report.details.members.avgPoints} pts)`);
  console.log(`  Palpites: ${report.details.bets.total}`);

  if (report.errors.length > 0) {
    console.log("\n❌ ERROS:");
    report.errors.forEach((e) => console.log(`  - ${e}`));
  }

  if (report.warnings.length > 0) {
    console.log("\n⚠️ AVISOS:");
    report.warnings.forEach((w) => console.log(`  ${w}`));
  }

  console.log("\n✨ Validação concluída!");
  console.log("=".repeat(60) + "\n");
}

// Auto-run em dev
if (__DEV__) {
  const report = validateAllMockData();
  printValidationReport(report);
}
