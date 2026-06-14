import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "./ui/Text";
import { TeamCrest } from "./TeamCrest";
import { palette, radius, spacing } from "@/lib/theme";
import { formatKickoff, STATUS_META, isBettingOpen } from "@/lib/format";
import type { Match, Bet } from "@/lib/types";

interface Props {
  match: Match;
  bet?: Bet;
  onPress?: () => void;
}

export function MatchCard({ match, bet, onPress }: Props) {
  const status = STATUS_META[match.status] ?? STATUS_META.scheduled;
  const live = match.status === "live";
  const canBet = isBettingOpen(match);
  // Agendado mas dentro dos 5 min finais: apostas já fecharam.
  const statusLabel = match.status === "scheduled" && !canBet ? "Fechado" : status.label;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && onPress && styles.pressed]}
    >
      <View style={styles.topRow}>
        <Text variant="caption" color={palette.textMuted} numberOfLines={1} style={{ flex: 1 }}>
          {match.round || "Partida"}
        </Text>
        <View style={[styles.statusDot, { backgroundColor: live ? palette.red : "transparent" }]} />
        <Text variant="caption" color={status.color}>{statusLabel}</Text>
      </View>

      <View style={styles.teams}>
        <View style={styles.team}>
          <TeamCrest team={match.home} size={36} />
          <Text variant="bodyMed" numberOfLines={1} style={styles.teamName}>{match.home.name}</Text>
        </View>

        <View style={styles.scoreBox}>
          {match.score ? (
            <Text style={styles.score}>{match.score.home}-{match.score.away}</Text>
          ) : (
            <Text variant="caption" color={palette.textMuted}>{formatKickoff(match.kickoff).split("·")[1]?.trim() || "vs"}</Text>
          )}
        </View>

        <View style={[styles.team, styles.teamRight]}>
          <TeamCrest team={match.away} size={36} />
          <Text variant="bodyMed" numberOfLines={1} style={[styles.teamName, styles.teamNameRight]}>{match.away.name}</Text>
        </View>
      </View>

      <View style={styles.bottomRow}>
        <Text variant="caption" color={palette.textFaint}>{formatKickoff(match.kickoff)}</Text>
        {bet ? (
          <View style={styles.betChip}>
            <Ionicons name="checkmark-circle" size={14} color={palette.primary} />
            <Text variant="caption" color={palette.primary}>
              {bet.score.home}-{bet.score.away}
              {bet.points > 0 ? ` · ${bet.points} pts` : ""}
            </Text>
          </View>
        ) : canBet ? (
          <View style={styles.betChip}>
            <Ionicons name="add-circle-outline" size={14} color={palette.cyan} />
            <Text variant="caption" color={palette.cyan}>Palpitar</Text>
          </View>
        ) : (
          <Text variant="caption" color={palette.textFaint}>Sem palpite</Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  pressed: { opacity: 0.7 },
  topRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  teams: { flexDirection: "row", alignItems: "center" },
  team: { flex: 1, flexDirection: "row", alignItems: "center", gap: spacing.sm },
  teamRight: { flexDirection: "row-reverse" },
  teamName: { flexShrink: 1 },
  teamNameRight: { textAlign: "right" },
  scoreBox: {
    minWidth: 64, alignItems: "center", justifyContent: "center",
    paddingHorizontal: spacing.sm,
  },
  score: { fontFamily: "Inter_800ExtraBold", fontSize: 22, color: palette.text },
  bottomRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    borderTopWidth: 1, borderTopColor: palette.border, paddingTop: spacing.md,
  },
  betChip: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
});
