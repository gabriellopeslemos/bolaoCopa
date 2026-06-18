import React, { useEffect, useRef } from "react";
import { View, Pressable, StyleSheet, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "./ui/Text";
import { TeamCrest } from "./TeamCrest";
import { palette, radius, spacing, font } from "@/lib/theme";
import { formatBrasiliaTime, formatCountdown, formatRound, isBettingOpen } from "@/lib/format";
import type { Match, Bet } from "@/lib/types";

interface Props {
  match: Match;
  bet?: Bet;
  onPress?: () => void;
}

function LiveDot() {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.2, duration: 600, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [pulse]);

  return <Animated.View style={[styles.liveDot, { opacity: pulse }]} />;
}

export function MatchCard({ match, bet, onPress }: Props) {
  const live = match.status === "live";
  const finished = match.status === "finished";
  const canBet = isBettingOpen(match);
  const brtTime = formatBrasiliaTime(match.kickoff);
  const countdown = !live && !finished ? formatCountdown(match.kickoff) : null;
  const statusColor = canBet ? "#7FA593" : palette.textFaint;
  const statusLabel = finished
    ? "Encerrado"
    : canBet
    ? `Aberto · ${brtTime}`
    : `Fechado · ${brtTime}`;

  const isExact = (bet?.breakdown?.exact ?? 0) > 0;
  const betColor = isExact ? palette.neonGreen : palette.primary;
  const elapsed = match.elapsed;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && onPress && styles.pressed]}
    >
      {/* Header: round/group · status or live badge */}
      <View style={styles.topRow}>
        <Text style={styles.roundText} numberOfLines={1}>
          {formatRound(match.round)}
        </Text>
        {live ? (
          <View style={styles.liveBadge}>
            <LiveDot />
            <Text style={styles.liveText}>Ao Vivo</Text>
          </View>
        ) : (
          <Text style={[styles.statusText, { color: statusColor }]}>
            {statusLabel}
          </Text>
        )}
      </View>

      {/* Teams + score/time */}
      <View style={styles.teamsRow}>
        <View style={styles.teamCol}>
          <TeamCrest team={match.home} size={44} />
          <Text style={styles.teamName} numberOfLines={1}>
            {match.home.name.toUpperCase()}
          </Text>
        </View>

        <View style={styles.centerBox}>
          {match.score != null ? (
            <>
              <Text style={[styles.scoreBig, finished && styles.scoreDimmed]}>
                {match.score.home}—{match.score.away}
              </Text>
              {live && elapsed != null ? (
                <Text style={styles.elapsedText}>{elapsed}'</Text>
              ) : finished ? (
                <Text style={styles.finLabel}>FIM</Text>
              ) : null}
            </>
          ) : (
            <>
              <Text style={styles.timeText}>{brtTime || "vs"}</Text>
              <Text style={styles.brtLabel}>BRT</Text>
              {countdown ? (
                <Text style={styles.countdownText}>{countdown}</Text>
              ) : null}
            </>
          )}
        </View>

        <View style={styles.teamCol}>
          <TeamCrest team={match.away} size={44} />
          <Text style={styles.teamName} numberOfLines={1}>
            {match.away.name.toUpperCase()}
          </Text>
        </View>
      </View>

      {/* Bet footer */}
      <View
        style={[
          styles.betRow,
          bet && isExact ? styles.betRowExact : null,
          !bet && canBet ? styles.betRowCTA : null,
          bet && !isExact ? styles.betRowDefault : null,
          !bet && !canBet ? styles.betRowDefault : null,
        ]}
      >
        {bet ? (
          <>
            <Ionicons
              name={isExact ? "checkmark-circle" : "checkmark-circle-outline"}
              size={14}
              color={betColor}
            />
            <Text style={[styles.betText, { color: betColor }]}>
              {isExact
                ? `Placar Exato · +${bet.points} pts`
                : `Seu palpite: ${bet.score.home}–${bet.score.away}${bet.points > 0 ? ` · +${bet.points} pts` : ""}`}
            </Text>
          </>
        ) : canBet ? (
          <>
            <Text style={styles.betCTA}>Toque para palpitar</Text>
            <Ionicons name="chevron-forward" size={13} color={palette.primary} />
          </>
        ) : (
          <Text style={styles.noBetText}>Sem palpite</Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.border,
    overflow: "hidden",
  },
  pressed: { opacity: 0.7 },

  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  roundText: {
    fontFamily: font.bold,
    fontSize: 11,
    letterSpacing: 2,
    color: palette.textFaint,
    textTransform: "uppercase",
    flex: 1,
    marginRight: spacing.sm,
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: palette.red,
  },
  liveText: {
    fontFamily: font.bold,
    fontSize: 12,
    letterSpacing: 1,
    color: palette.red,
    textTransform: "uppercase",
  },
  statusText: {
    fontFamily: font.semibold,
    fontSize: 12,
    letterSpacing: 0.3,
  },

  teamsRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  teamCol: {
    flex: 1,
    alignItems: "center",
    gap: spacing.xs,
  },
  teamName: {
    fontFamily: font.bold,
    fontSize: 15,
    color: palette.text,
    letterSpacing: 1,
    textAlign: "center",
  },
  centerBox: {
    width: 88,
    alignItems: "center",
    gap: 2,
  },
  scoreBig: {
    fontFamily: font.display,
    fontSize: 44,
    color: palette.text,
    lineHeight: 44,
    letterSpacing: 3,
  },
  scoreDimmed: {
    opacity: 0.75,
  },
  elapsedText: {
    fontFamily: font.bold,
    fontSize: 11,
    letterSpacing: 1,
    color: palette.red,
  },
  finLabel: {
    fontFamily: font.bold,
    fontSize: 9,
    letterSpacing: 1,
    color: palette.textMuted,
    textTransform: "uppercase",
  },
  timeText: {
    fontFamily: font.display,
    fontSize: 30,
    color: palette.text,
    lineHeight: 32,
    letterSpacing: 2,
  },
  brtLabel: {
    fontFamily: font.regular,
    fontSize: 10,
    color: palette.textFaint,
  },
  countdownText: {
    fontFamily: font.semibold,
    fontSize: 11,
    color: palette.primary,
    marginTop: 2,
  },

  betRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 1,
    borderTopWidth: 1,
    borderTopColor: palette.border,
  },
  betRowDefault: {
    backgroundColor: palette.bgElevated,
  },
  betRowExact: {
    backgroundColor: "rgba(57, 255, 20, 0.07)",
    borderTopColor: "rgba(57, 255, 20, 0.2)",
  },
  betRowCTA: {
    backgroundColor: "rgba(255, 69, 0, 0.08)",
    borderTopColor: "rgba(255, 69, 0, 0.18)",
  },
  betText: {
    fontFamily: font.semibold,
    fontSize: 13,
  },
  betCTA: {
    fontFamily: font.bold,
    fontSize: 12,
    letterSpacing: 2,
    color: palette.primary,
    textTransform: "uppercase",
  },
  noBetText: {
    fontFamily: font.regular,
    fontSize: 12,
    color: palette.textFaint,
  },
});
