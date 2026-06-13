/**
 * Tela "Jogos" — lista todas as partidas da competição com status e placar.
 */
import React from "react";
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { collection, query, orderBy, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { colors } from "@/lib/colors";
import type { Timestamp } from "firebase/firestore";

interface MatchItem {
  id: string;
  home: { name: string };
  away: { name: string };
  kickoff: Timestamp;
  status: "scheduled" | "live" | "finished";
  score: { home: number; away: number } | null;
  round?: string;
}

function useMatches() {
  return useQuery({
    queryKey: ["matches"],
    queryFn: async () => {
      const snap = await getDocs(
        query(collection(db, "matches"), orderBy("kickoff", "asc"))
      );
      return snap.docs.map((d) => ({ id: d.id, ...d.data() } as MatchItem));
    },
  });
}

const STATUS_LABEL: Record<string, string> = {
  scheduled: "Em breve",
  live: "AO VIVO",
  finished: "Encerrado",
};
const STATUS_COLOR: Record<string, string> = {
  scheduled: colors.textMuted,
  live: colors.green,
  finished: colors.textMuted,
};

export default function MatchesScreen() {
  const { data: matches, isLoading } = useMatches();

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <FlatList
      data={matches ?? []}
      keyExtractor={(m) => m.id}
      contentContainerStyle={styles.list}
      ListEmptyComponent={
        <Text style={styles.empty}>Nenhuma partida cadastrada ainda.</Text>
      }
      renderItem={({ item }) => <MatchCard match={item} />}
    />
  );
}

function MatchCard({ match }: { match: MatchItem }) {
  const date = match.kickoff?.toDate?.();
  const dateStr = date
    ? date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
    : "";

  return (
    <View style={styles.card}>
      {match.round && <Text style={styles.round}>{match.round}</Text>}
      <View style={styles.row}>
        <Text style={styles.team} numberOfLines={1}>{match.home.name}</Text>
        {match.score ? (
          <Text style={styles.score}>{match.score.home} × {match.score.away}</Text>
        ) : (
          <Text style={styles.vs}>vs</Text>
        )}
        <Text style={[styles.team, styles.teamRight]} numberOfLines={1}>
          {match.away.name}
        </Text>
      </View>
      <View style={styles.meta}>
        <Text style={styles.date}>{dateStr}</Text>
        <Text style={[styles.status, { color: STATUS_COLOR[match.status] }]}>
          {STATUS_LABEL[match.status] ?? match.status}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.bg },
  list: { padding: 16, gap: 10, backgroundColor: colors.bg, flexGrow: 1 },
  empty: { color: colors.textMuted, textAlign: "center", marginTop: 40, fontSize: 15 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: colors.cardBorder, gap: 6,
  },
  round: { color: colors.textMuted, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 },
  row: { flexDirection: "row", alignItems: "center" },
  team: { flex: 1, color: colors.text, fontSize: 14, fontWeight: "600" },
  teamRight: { textAlign: "right" },
  score: { color: colors.text, fontSize: 20, fontWeight: "bold", paddingHorizontal: 12 },
  vs: { color: colors.textMuted, fontSize: 14, paddingHorizontal: 12 },
  meta: { flexDirection: "row", justifyContent: "space-between" },
  date: { color: colors.textMuted, fontSize: 12 },
  status: { fontSize: 12, fontWeight: "600" },
});
