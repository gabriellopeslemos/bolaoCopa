/**
 * Exibe a pontuação de um palpite com detalhamento de bônus,
 * igual ao card "Pontos Base" da foto.
 */
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import type { PointsBreakdown } from "@bolao/scoring";
import { colors, bonusColor } from "@/lib/colors";

interface Props {
  total: number;
  breakdown?: PointsBreakdown;
  compact?: boolean;
}

const BONUS_LABELS: { key: keyof PointsBreakdown; label: string }[] = [
  { key: "exact",       label: "Placar Exato" },
  { key: "winnerScore", label: "Placar Vencedor" },
  { key: "goalDiff",    label: "Diferença de Gols" },
  { key: "loserScore",  label: "Placar Perdedor" },
  { key: "rout",        label: "Goleada (extra)" },
];

export function PointsBadge({ total, breakdown, compact }: Props) {
  if (compact) {
    return (
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{total} pts</Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.total}>{total} pts</Text>
      {breakdown && (
        <View style={styles.list}>
          {breakdown.base > 0 && (
            <BonusRow label="Acertou vencedor" pts={breakdown.base} color={colors.text} />
          )}
          {BONUS_LABELS.map(({ key, label }) =>
            breakdown[key] > 0 ? (
              <BonusRow key={key} label={label} pts={breakdown[key]} color={bonusColor[key]} />
            ) : null
          )}
        </View>
      )}
    </View>
  );
}

function BonusRow({ label, pts, color }: { label: string; pts: number; color: string }) {
  return (
    <View style={styles.row}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.pts, { color }]}>+{pts} pts</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    gap: 8,
  },
  total: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "bold",
  },
  list: { gap: 6 },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  label: { color: colors.text, flex: 1, fontSize: 14 },
  pts: { fontWeight: "bold", fontSize: 14 },
  badge: {
    backgroundColor: colors.card,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: { color: colors.green, fontWeight: "bold", fontSize: 14 },
});
