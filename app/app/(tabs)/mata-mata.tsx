import React from "react";
import { View, ScrollView, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useActiveGroup } from "@/hooks/useActiveGroup";
import { Screen, Text, Card } from "@/components/ui";
import { palette, spacing, radius } from "@/lib/theme";

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
    rules: [
      "Pontos zerados.",
      "Melhor desempenho nos jogos finais vence o torneio.",
    ],
  },
];

export default function MataMataScreen() {
  const insets = useSafeAreaInsets();
  const { activeGroup } = useActiveGroup();

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
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.lg, gap: 2 },
  body: { paddingHorizontal: spacing.xl, gap: spacing.md, flexGrow: 1 },
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
