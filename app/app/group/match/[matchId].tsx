/**
 * Detalhe de uma partida encerrada — mostra o resultado real
 * e os palpites de todos os membros do grupo com suas pontuações.
 */
import React from "react";
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import {
  collection, doc, getDocs, getDoc, query,
  type Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { colors } from "@/lib/colors";
import { PointsBadge } from "@/components/PointsBadge";
import type { Score, PointsBreakdown } from "@bolao/scoring";

interface BetDoc {
  userId: string;
  matchId: string;
  score: Score;
  points: number;
  breakdown?: PointsBreakdown;
  displayName?: string;
}

export default function MatchDetailScreen() {
  const { matchId, groupId } = useLocalSearchParams<{ matchId: string; groupId: string }>();
  const { user } = useAuth();

  const { data: match, isLoading: mLoading } = useQuery({
    queryKey: ["match", matchId],
    queryFn: async () => {
      const snap = await getDoc(doc(db, "matches", matchId!));
      return { id: snap.id, ...snap.data() } as {
        id: string;
        home: { name: string };
        away: { name: string };
        kickoff: Timestamp;
        status: string;
        score: Score | null;
        round?: string;
      };
    },
    enabled: !!matchId,
  });

  const { data: bets, isLoading: bLoading } = useQuery({
    queryKey: ["allBets", groupId, matchId],
    queryFn: async () => {
      const betsSnap = await getDocs(
        query(collection(db, "groups", groupId!, "bets"))
      );
      const membersSnap = await getDocs(
        collection(db, "groups", groupId!, "members")
      );
      const nameMap: Record<string, string> = {};
      membersSnap.docs.forEach((d) => {
        nameMap[d.id] = (d.data().displayName as string) ?? "Participante";
      });

      return betsSnap.docs
        .filter((d) => (d.data() as BetDoc).matchId === matchId)
        .map((d) => {
          const b = d.data() as BetDoc;
          return { ...b, displayName: nameMap[b.userId] ?? "Participante" };
        })
        .sort((a, b) => b.points - a.points);
    },
    enabled: !!groupId && !!matchId,
  });

  if (mLoading || bLoading) {
    return <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>;
  }

  return (
    <FlatList
      data={bets ?? []}
      keyExtractor={(b) => b.userId}
      contentContainerStyle={styles.list}
      ListHeaderComponent={
        <View style={styles.header}>
          {match?.round && <Text style={styles.round}>{match.round}</Text>}
          <View style={styles.scoreRow}>
            <Text style={styles.team} numberOfLines={1}>{match?.home.name}</Text>
            {match?.score ? (
              <Text style={styles.score}>
                {match.score.home} × {match.score.away}
              </Text>
            ) : (
              <Text style={styles.scorePlaceholder}>? × ?</Text>
            )}
            <Text style={[styles.team, { textAlign: "right" }]} numberOfLines={1}>
              {match?.away.name}
            </Text>
          </View>
          <Text style={styles.sectionTitle}>Palpites</Text>
        </View>
      }
      ListEmptyComponent={
        <Text style={styles.empty}>Nenhum palpite nesta partida.</Text>
      }
      renderItem={({ item }) => (
        <View style={[styles.betCard, item.userId === user?.uid && styles.myCard]}>
          <View style={styles.betRow}>
            <Text style={styles.betName} numberOfLines={1}>{item.displayName}</Text>
            <Text style={styles.betScore}>{item.score.home} × {item.score.away}</Text>
            <PointsBadge total={item.points} compact />
          </View>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.bg },
  list: { padding: 16, gap: 10, backgroundColor: colors.bg, flexGrow: 1 },
  header: { gap: 12, marginBottom: 8 },
  round: { color: colors.textMuted, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 },
  scoreRow: {
    backgroundColor: colors.card, borderRadius: 14, padding: 20,
    flexDirection: "row", alignItems: "center",
    borderWidth: 1, borderColor: colors.cardBorder,
  },
  team: { flex: 1, color: colors.text, fontSize: 14, fontWeight: "600" },
  score: { color: colors.text, fontSize: 26, fontWeight: "bold", paddingHorizontal: 12 },
  scorePlaceholder: { color: colors.textMuted, fontSize: 22, paddingHorizontal: 12 },
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: "bold", marginTop: 4 },
  betCard: {
    backgroundColor: colors.card, borderRadius: 10, padding: 14,
    borderWidth: 1, borderColor: colors.cardBorder,
  },
  myCard: { borderColor: colors.primary },
  betRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  betName: { color: colors.text, flex: 1, fontSize: 14 },
  betScore: { color: colors.textMuted, fontSize: 15, fontWeight: "bold" },
  empty: { color: colors.textMuted, textAlign: "center", marginTop: 20 },
});
