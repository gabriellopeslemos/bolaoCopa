import React from "react";
import { View, StyleSheet } from "react-native";
import { Card } from "./ui/Card";
import { Text } from "./ui/Text";
import { palette, spacing, bonus } from "@/lib/theme";
import type { PointsBreakdown } from "@/lib/types";

const ROWS: { key: keyof PointsBreakdown; color: string; label: string; pts: number }[] = [
  { key: "exact",       ...bonus.exact },
  { key: "winnerScore", ...bonus.winnerScore },
  { key: "goalDiff",    ...bonus.goalDiff },
  { key: "loserScore",  ...bonus.loserScore },
  { key: "rout",        ...bonus.rout },
];

/**
 * Card "Pontos Base" — réplica da tela de regras.
 * Se `active` for passado, destaca os bônus efetivamente conquistados.
 */
export function ScoringRulesCard({ active }: { active?: PointsBreakdown }) {
  return (
    <Card padded style={styles.card}>
      <Text variant="heading">Pontos Base</Text>
      <Text variant="body" color={palette.textMuted}>3 pts por acertar o vencedor</Text>

      <View style={styles.divider} />

      <Text variant="label" color={palette.textMuted}>Bônus</Text>
      <View style={styles.list}>
        {ROWS.map((r) => {
          const isActive = active ? active[r.key] > 0 : true;
          return (
            <View key={r.key} style={[styles.row, active && !isActive && styles.dim]}>
              <View style={[styles.dot, { backgroundColor: r.color }]} />
              <Text variant="bodyMed" style={{ flex: 1 }}>{r.label}</Text>
              <Text variant="bodyMed" color={r.color}>+{r.pts} pts</Text>
            </View>
          );
        })}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
  divider: { height: 1, backgroundColor: palette.border, marginVertical: spacing.sm },
  list: { gap: spacing.md, marginTop: spacing.xs },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  dim: { opacity: 0.32 },
  dot: { width: 11, height: 11, borderRadius: 6 },
});
