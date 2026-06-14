import React from "react";
import { View, ScrollView, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useActiveGroup } from "@/hooks/useActiveGroup";
import { useTournament } from "@/lib/data";
import { Screen, Text, Card, Avatar } from "@/components/ui";
import { palette, spacing, radius } from "@/lib/theme";
import type { TournamentPhase, TournamentState, Matchup } from "@/lib/types";

type Phase = {
  icon: keyof typeof Ionicons.glyphMap;
  name: string;
  summary: string;
  rules: string[];
};

const PHASES: Phase[] = [
  {
    icon: "flag-outline",
    name: "1 · Qualificatória",
    summary: "Define o Seed de cada participante.",
    rules: [
      "Todos palpitam nos jogos iniciais do torneio.",
      "Os pontos acumulados viram o Seed (peso) de cada um.",
      "Os maiores Seeds tornam-se cabeças de chave.",
    ],
  },
  {
    icon: "grid-outline",
    name: "2 · Fase de Grupos",
    summary: "Divisões de 4 por distribuição em serpentina.",
    rules: [
      "Cabeças de chave ficam em grupos distintos (serpentina).",
      "Todos competem entre si dentro do grupo.",
      "Classificam todos, menos o último de cada grupo.",
      "A lanterna vai direto para a Repescagem.",
    ],
  },
  {
    icon: "git-network-outline",
    name: "3 · Eliminatórias",
    summary: "Chave principal: Triplos e Duelos.",
    rules: [
      "Davi x Golias: primeiros enfrentam últimos de outros grupos.",
      "Reencontro adiado: nada de rival do mesmo grupo na 1ª rodada.",
      "Difficulty Score prioriza confrontos Triplos.",
      "Triplo: 3 jogam, 2 avançam. Duelo: 1x1, vencedor avança.",
    ],
  },
  {
    icon: "refresh-outline",
    name: "4 · Repescagem",
    summary: "Segunda chance para lanternas e eliminados em duelos.",
    rules: [
      "Novos grupos, todos contra todos.",
      "Metade avança, metade é eliminada.",
      "Repete até sobrar 1, que vai à Grande Final.",
    ],
  },
  {
    icon: "trophy-outline",
    name: "5 · Grande Final",
    summary: "Sobreviventes da chave + remanescente da repescagem.",
    rules: ["Pontos zerados.", "Melhor desempenho nos jogos finais vence o torneio."],
  },
];

const PHASE_LABEL: Record<TournamentPhase, string> = {
  qualifier: "Qualificatória",
  groups: "Fase de Grupos",
  knockout: "Eliminatórias",
  repechage: "Repescagem",
  final: "Grande Final",
  done: "Encerrado",
};

export default function MataMataScreen() {
  const insets = useSafeAreaInsets();
  const { activeGroup, activeGroupId } = useActiveGroup();
  const tournament = useTournament(activeGroupId);
  const state = tournament.data;
  const started = !!state?.seeds?.length;

  return (
    <Screen edges={{ top: true }}>
      <View style={styles.header}>
        <Text variant="title">Mata-mata</Text>
        <Text variant="body" color={palette.textMuted}>
          {activeGroup ? activeGroup.name : "Selecione um grupo no Perfil"}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + spacing.xl }]}
        showsVerticalScrollIndicator={false}
      >
        {started ? <LiveTournament state={state!} /> : <FormatGuide />}
      </ScrollView>
    </Screen>
  );
}

function LiveTournament({ state }: { state: TournamentState }) {
  const {
    phase, seeds = [], groups, knockout, repechage,
    mainBracketWinner, repechageWinner, champion, runnerUp,
  } = state;
  const finalists = [mainBracketWinner, repechageWinner].filter(Boolean) as NonNullable<
    typeof mainBracketWinner
  >[];
  return (
    <>
      <View style={styles.phaseChip}>
        <Ionicons name="ellipse" size={8} color={palette.primary} />
        <Text variant="label" color={palette.primary}>Fase atual: {PHASE_LABEL[phase]}</Text>
      </View>

      {champion && (
        <Card style={[styles.winnerCard, styles.championCard]}>
          <Ionicons name="trophy" size={26} color={palette.gold} />
          <View style={{ flex: 1 }}>
            <Text variant="caption" color={palette.textMuted}>Campeão do torneio</Text>
            <Text variant="title" numberOfLines={1}>{champion.displayName ?? "Participante"}</Text>
            {runnerUp && (
              <Text variant="caption" color={palette.textFaint}>
                Vice: {runnerUp.displayName ?? "Participante"}
              </Text>
            )}
          </View>
        </Card>
      )}

      {(phase === "final" || phase === "done") && finalists.length > 0 && !champion && (
        <View style={{ gap: spacing.sm }}>
          <Text variant="label" color={palette.textMuted}>Grande Final</Text>
          <Card style={{ gap: spacing.sm }}>
            {finalists.map((p, i) => (
              <View key={p.uid}>
                {i > 0 && (
                  <Text variant="caption" color={palette.textFaint} style={styles.vs}>vs</Text>
                )}
                <View style={styles.memberRow}>
                  <Ionicons
                    name={i === 0 ? "git-network-outline" : "refresh-outline"}
                    size={18}
                    color={palette.primary}
                  />
                  <Avatar name={p.displayName ?? "?"} size={30} />
                  <Text variant="bodyMed" style={{ flex: 1 }} numberOfLines={1}>
                    {p.displayName ?? "Participante"}
                  </Text>
                  <Text variant="caption" color={palette.textFaint}>
                    {i === 0 ? "Chave principal" : "Repescagem"}
                  </Text>
                </View>
              </View>
            ))}
          </Card>
        </View>
      )}

      {repechageWinner && phase !== "done" && (
        <Card style={styles.winnerCard}>
          <Ionicons name="refresh-circle" size={22} color={palette.cyan} />
          <View style={{ flex: 1 }}>
            <Text variant="caption" color={palette.textMuted}>Sobrevivente da Repescagem</Text>
            <Text variant="subtitle" numberOfLines={1}>{repechageWinner.displayName ?? "Participante"}</Text>
            <Text variant="caption" color={palette.textFaint}>Classificado para a Grande Final</Text>
          </View>
        </Card>
      )}

      {mainBracketWinner && (
        <Card style={styles.winnerCard}>
          <Ionicons name="trophy" size={22} color={palette.gold} />
          <View style={{ flex: 1 }}>
            <Text variant="caption" color={palette.textMuted}>Vencedor da chave principal</Text>
            <Text variant="subtitle" numberOfLines={1}>{mainBracketWinner.displayName ?? "Participante"}</Text>
            <Text variant="caption" color={palette.textFaint}>Classificado para a Grande Final</Text>
          </View>
        </Card>
      )}

      {knockout && knockout.matchups.length > 0 && (
        <View style={{ gap: spacing.md }}>
          <Text variant="label" color={palette.textMuted}>
            Eliminatórias · {knockout.round}ª rodada
          </Text>
          {knockout.matchups.map((m, i) => (
            <MatchupCard key={i} matchup={m} />
          ))}
        </View>
      )}

      {repechage && repechage.length > 0 && (
        <View style={{ gap: spacing.sm }}>
          <Text variant="label" color={palette.textMuted}>Repescagem (em disputa)</Text>
          <Card style={{ gap: spacing.sm }}>
            {repechage.map((p) => (
              <View key={p.uid} style={styles.memberRow}>
                <View style={[styles.seedBadge, { backgroundColor: palette.textFaint }]}>
                  <Text variant="caption" color={palette.black}>{p.seed}</Text>
                </View>
                <Avatar name={p.displayName ?? "?"} size={30} />
                <Text variant="bodyMed" style={{ flex: 1 }} numberOfLines={1}>
                  {p.displayName ?? "Participante"}
                </Text>
                <Text variant="caption" color={palette.textFaint}>Grupo {p.groupId}</Text>
              </View>
            ))}
          </Card>
        </View>
      )}

      {groups && groups.length > 0 && (
        <View style={{ gap: spacing.md }}>
          <Text variant="label" color={palette.textMuted}>Grupos sorteados (serpentina)</Text>
          {groups.map((g) => (
            <Card key={g.id} style={{ gap: spacing.sm }}>
              <Text variant="subtitle">Grupo {g.id}</Text>
              {g.members.map((m) => (
                <View key={m.uid} style={styles.memberRow}>
                  <View style={styles.seedBadge}>
                    <Text variant="caption" color={palette.black}>{m.seed}</Text>
                  </View>
                  <Avatar name={m.displayName ?? "?"} size={30} />
                  <Text variant="bodyMed" style={{ flex: 1 }} numberOfLines={1}>
                    {m.displayName ?? "Participante"}
                  </Text>
                </View>
              ))}
            </Card>
          ))}
        </View>
      )}

      <View style={{ gap: spacing.sm }}>
        <Text variant="label" color={palette.textMuted}>Seeds (resultado da Qualificatória)</Text>
        <Card style={{ gap: spacing.sm }}>
          {seeds.map((s) => (
            <View key={s.uid} style={styles.memberRow}>
              <View style={styles.seedBadge}>
                <Text variant="caption" color={palette.black}>{s.seed}</Text>
              </View>
              <Avatar name={s.displayName ?? "?"} size={30} />
              <Text variant="bodyMed" style={{ flex: 1 }} numberOfLines={1}>
                {s.displayName ?? "Participante"}
              </Text>
              <Text variant="caption" color={palette.textMuted}>{s.points} pts</Text>
            </View>
          ))}
        </Card>
      </View>
    </>
  );
}

function MatchupCard({ matchup }: { matchup: Matchup }) {
  const isTriple = matchup.kind === "triple";
  return (
    <Card style={{ gap: spacing.sm }}>
      <View style={styles.matchHead}>
        <View style={[styles.kindTag, { backgroundColor: isTriple ? palette.cyan : palette.primary }]}>
          <Text variant="caption" color={palette.black}>{isTriple ? "TRIPLO" : "DUELO"}</Text>
        </View>
        <Text variant="caption" color={palette.textMuted}>
          {isTriple ? "2 de 3 avançam" : "vencedor avança"}
        </Text>
      </View>
      {matchup.players.map((p, i) => (
        <View key={p.uid}>
          {i > 0 && (
            <Text variant="caption" color={palette.textFaint} style={styles.vs}>vs</Text>
          )}
          <View style={styles.memberRow}>
            <View style={styles.seedBadge}>
              <Text variant="caption" color={palette.black}>{p.seed}</Text>
            </View>
            <Avatar name={p.displayName ?? "?"} size={30} />
            <Text variant="bodyMed" style={{ flex: 1 }} numberOfLines={1}>
              {p.displayName ?? "Participante"}
            </Text>
            <Text variant="caption" color={palette.textFaint}>{p.placement}º · Grupo {p.groupId}</Text>
          </View>
        </View>
      ))}
    </Card>
  );
}

function FormatGuide() {
  return (
    <>
      <Card style={styles.banner}>
        <Ionicons name="construct-outline" size={20} color={palette.primary} />
        <View style={{ flex: 1 }}>
          <Text variant="bodyMed">Torneio ainda não iniciado</Text>
          <Text variant="caption" color={palette.textMuted}>
            O chaveamento aparece aqui quando a Qualificatória terminar e os Seeds forem definidos.
          </Text>
        </View>
      </Card>

      <View style={styles.note}>
        <Ionicons name="information-circle-outline" size={15} color={palette.textMuted} />
        <Text variant="caption" color={palette.textMuted}>Os pontos são zerados ao fim de cada fase.</Text>
      </View>

      {PHASES.map((p, i) => (
        <Card key={p.name} style={styles.phase}>
          <View style={styles.phaseTop}>
            <View style={styles.phaseIcon}>
              <Ionicons name={p.icon} size={18} color={palette.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="subtitle">{p.name}</Text>
              <Text variant="caption" color={palette.textMuted}>{p.summary}</Text>
            </View>
          </View>
          <View style={styles.rules}>
            {p.rules.map((r) => (
              <View key={r} style={styles.ruleRow}>
                <View style={styles.bullet} />
                <Text variant="caption" color={palette.textMuted} style={{ flex: 1 }}>{r}</Text>
              </View>
            ))}
          </View>
          {i < PHASES.length - 1 && (
            <Ionicons name="chevron-down" size={16} color={palette.textFaint}
              style={{ alignSelf: "center", marginTop: spacing.sm }} />
          )}
        </Card>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.lg, gap: 2 },
  body: { paddingHorizontal: spacing.xl, gap: spacing.md, flexGrow: 1 },
  phaseChip: {
    flexDirection: "row", alignItems: "center", gap: spacing.xs,
    alignSelf: "flex-start", backgroundColor: palette.primaryGlow,
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.pill,
  },
  memberRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  seedBadge: {
    width: 22, height: 22, borderRadius: 11, backgroundColor: palette.primary,
    alignItems: "center", justifyContent: "center",
  },
  winnerCard: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  championCard: { borderWidth: 1, borderColor: palette.gold },
  matchHead: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  kindTag: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.sm },
  vs: { marginLeft: 30 + spacing.sm, marginVertical: 2 },
  banner: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  note: { flexDirection: "row", alignItems: "center", gap: spacing.xs, paddingHorizontal: spacing.xs },
  phase: { gap: spacing.md },
  phaseTop: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  phaseIcon: {
    width: 38, height: 38, borderRadius: radius.md,
    backgroundColor: palette.primaryGlow, alignItems: "center", justifyContent: "center",
  },
  rules: { gap: spacing.sm },
  ruleRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  bullet: { width: 5, height: 5, borderRadius: 3, backgroundColor: palette.primary, marginTop: 6 },
});
