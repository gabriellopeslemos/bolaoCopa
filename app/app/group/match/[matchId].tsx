import React from "react";
import { View, FlatList, StyleSheet } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/hooks/useAuth";
import { useMatch, useMatchBets } from "@/lib/data";
import { Screen, Text, Card, Avatar, EmptyState, FadeIn } from "@/components/ui";
import { PointsPill } from "@/components/PointsBadge";
import { TeamCrest } from "@/components/TeamCrest";
import { palette, spacing } from "@/lib/theme";
import { formatKickoff, STATUS_META, isBettingOpen } from "@/lib/format";

export default function MatchDetailScreen() {
  const { matchId, groupId } = useLocalSearchParams<{ matchId: string; groupId: string }>();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const match = useMatch(matchId);
  const m = match.data;
  const status = m ? STATUS_META[m.status] : undefined;
  // Os palpites do grupo só ficam visíveis quando as apostas fecham (5 min
  // antes do início). Enquanto abertas, nem consultamos (as regras negariam).
  const revealed = !!m && !isBettingOpen(m);
  const bets = useMatchBets(groupId, revealed ? matchId : undefined);

  return (
    <Screen>
      <FlatList
        data={bets.data ?? []}
        keyExtractor={(b) => b.id}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + spacing.xl }]}
        ListHeaderComponent={
          <View style={{ gap: spacing.lg, marginBottom: spacing.sm }}>
            {m && (
              <Card style={styles.scoreCard}>
                {status && (
                  <View style={styles.statusRow}>
                    {m.status === "live" && <View style={styles.liveDot} />}
                    <Text variant="label" color={status.color}>{status.label}</Text>
                  </View>
                )}
                <View style={styles.scoreRow}>
                  <View style={styles.teamCol}>
                    <TeamCrest team={m.home} size={52} />
                    <Text variant="bodyMed" center numberOfLines={2}>{m.home.name}</Text>
                  </View>
                  <View style={styles.scoreMid}>
                    {m.score ? (
                      <Text style={styles.bigScore}>{m.score.home} - {m.score.away}</Text>
                    ) : (
                      <Text variant="title" color={palette.textFaint}>vs</Text>
                    )}
                  </View>
                  <View style={styles.teamCol}>
                    <TeamCrest team={m.away} size={52} />
                    <Text variant="bodyMed" center numberOfLines={2}>{m.away.name}</Text>
                  </View>
                </View>
                <Text variant="caption" color={palette.textFaint} center>{formatKickoff(m.kickoff)}</Text>
              </Card>
            )}
            <Text variant="heading">Palpites do grupo</Text>
          </View>
        }
        ListEmptyComponent={
          revealed ? (
            <EmptyState icon="people-outline" title="Nenhum palpite"
              subtitle="Ninguém palpitou nesta partida." />
          ) : (
            <EmptyState icon="lock-closed-outline" title="Palpites ocultos"
              subtitle="Os palpites de todos ficam visíveis quando as apostas fecharem, 5 minutos antes do início." />
          )
        }
        renderItem={({ item, index }) => {
          const isMe = item.userId === user?.uid;
          const name = item.displayName ?? "Participante";
          return (
            <FadeIn delay={index * 40}>
              <Card highlight={isMe} style={styles.betRow}>
                <Avatar name={name} size={38} ring={isMe} />
                <View style={{ flex: 1 }}>
                  <Text variant="bodyMed" numberOfLines={1}>{name}{isMe ? " (você)" : ""}</Text>
                  {item.points > 0 && item.breakdown?.exact ? (
                    <View style={styles.exactTag}>
                      <Ionicons name="star" size={11} color={palette.green} />
                      <Text variant="caption" color={palette.green}>Placar exato!</Text>
                    </View>
                  ) : null}
                </View>
                <Text variant="subtitle" color={palette.textMuted}>{item.score.home}-{item.score.away}</Text>
                <PointsPill points={item.points} />
              </Card>
            </FadeIn>
          );
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.xl, gap: spacing.md, flexGrow: 1 },
  scoreCard: { alignItems: "center", gap: spacing.md },
  statusRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: palette.red },
  scoreRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", width: "100%" },
  teamCol: { flex: 1, alignItems: "center", gap: spacing.sm },
  scoreMid: { paddingHorizontal: spacing.md },
  bigScore: { fontFamily: "Inter_800ExtraBold", fontSize: 32, color: palette.text },
  betRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  exactTag: { flexDirection: "row", alignItems: "center", gap: spacing.xs, marginTop: 2 },
});
