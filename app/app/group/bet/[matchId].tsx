/**
 * Tela de palpite.
 * O usuário escolhe o placar antes do início do jogo.
 * Exibe o preview de pontos potenciais em tempo real.
 */
import React, { useState } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, ScrollView,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  collection, doc, getDocs, getDoc, query,
  setDoc, serverTimestamp, where,
  type Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { colors } from "@/lib/colors";
import { ScoreInput } from "@/components/ScoreInput";
import { PointsBadge } from "@/components/PointsBadge";
import {
  calculatePoints, maxPossiblePoints,
  DEFAULT_SCORING_CONFIG, type Score,
} from "@bolao/scoring";

export default function BetScreen() {
  const { matchId, groupId } = useLocalSearchParams<{ matchId: string; groupId: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();

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
      };
    },
    enabled: !!matchId,
  });

  const { data: existingBet } = useQuery({
    queryKey: ["myBet", groupId, matchId, user?.uid],
    queryFn: async () => {
      const snap = await getDocs(
        query(
          collection(db, "groups", groupId!, "bets"),
          where("userId", "==", user!.uid),
          where("matchId", "==", matchId!)
        )
      );
      if (snap.empty) return null;
      return snap.docs[0].data() as { score: Score; points: number };
    },
    enabled: !!groupId && !!matchId && !!user,
  });

  const [bet, setBet] = useState<Score>({ home: 0, away: 0 });

  // Populate from existing bet once loaded
  React.useEffect(() => {
    if (existingBet) setBet(existingBet.score);
  }, [existingBet]);

  const preview = maxPossiblePoints(bet);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const betId = `${user!.uid}_${matchId}`;
      await setDoc(
        doc(db, "groups", groupId!, "bets", betId),
        {
          userId: user!.uid,
          matchId: matchId!,
          score: bet,
          points: 0,
          updatedAt: serverTimestamp(),
        },
        { merge: false }
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bets", groupId, user?.uid] });
      Alert.alert("Palpite salvo!", "Boa sorte!", [
        { text: "OK", onPress: () => router.back() },
      ]);
    },
    onError: () => Alert.alert("Erro", "Não foi possível salvar o palpite."),
  });

  if (mLoading) {
    return <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>;
  }

  if (!match || match.status !== "scheduled") {
    return (
      <View style={styles.center}>
        <Text style={styles.msg}>Palpites encerrados para esta partida.</Text>
      </View>
    );
  }

  const kickoffDate = match.kickoff?.toDate?.();
  const kickoffStr = kickoffDate
    ? kickoffDate.toLocaleDateString("pt-BR", {
        weekday: "short", day: "2-digit", month: "2-digit",
        hour: "2-digit", minute: "2-digit",
      })
    : "";

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.subtitle}>{kickoffStr}</Text>

      <View style={styles.inputCard}>
        <ScoreInput
          homeTeam={match.home.name}
          awayTeam={match.away.name}
          value={bet}
          onChange={setBet}
        />
      </View>

      {/* Preview de pontos potenciais */}
      <View style={styles.previewCard}>
        <Text style={styles.previewTitle}>Pontos Base</Text>
        <Text style={styles.previewSub}>3 pts por acertar o vencedor</Text>
        <View style={styles.divider} />
        <Text style={styles.previewBonus}>Bonus:</Text>
        {[
          { key: "exact",       label: "Placar Exato",       pts: 5, color: colors.green },
          { key: "winnerScore", label: "Placar Vencedor",    pts: 3, color: colors.primary },
          { key: "goalDiff",    label: "Diferença de Gols",  pts: 2, color: colors.teal },
          { key: "loserScore",  label: "Placar Perdedor",    pts: 1, color: colors.purple },
          { key: "rout",        label: "Goleada (extra)",    pts: 1, color: colors.orange },
        ].map((b) => (
          <View key={b.key} style={styles.bonusRow}>
            <View style={[styles.dot, { backgroundColor: b.color }]} />
            <Text style={styles.bonusLabel}>{b.label}</Text>
            <Text style={[styles.bonusPts, { color: b.color }]}>+{b.pts} pts</Text>
          </View>
        ))}
      </View>

      <Text style={styles.potential}>
        Potencial: até <Text style={styles.potentialValue}>{preview} pts</Text>
      </Text>

      <TouchableOpacity
        style={[styles.btn, saveMutation.isPending && styles.btnDisabled]}
        onPress={() => saveMutation.mutate()}
        disabled={saveMutation.isPending}
      >
        {saveMutation.isPending
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.btnText}>Salvar palpite</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.bg },
  msg: { color: colors.textMuted, fontSize: 15 },
  container: { padding: 20, gap: 16, backgroundColor: colors.bg, flexGrow: 1 },
  subtitle: { color: colors.textMuted, textAlign: "center", fontSize: 13 },
  inputCard: {
    backgroundColor: colors.card, borderRadius: 14, padding: 20,
    borderWidth: 1, borderColor: colors.cardBorder,
  },
  previewCard: {
    backgroundColor: colors.card, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: colors.cardBorder, gap: 8,
  },
  previewTitle: { color: colors.text, fontSize: 16, fontWeight: "bold" },
  previewSub: { color: colors.textMuted, fontSize: 13 },
  divider: { height: 1, backgroundColor: colors.divider },
  previewBonus: { color: colors.textMuted, fontSize: 12 },
  bonusRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  bonusLabel: { color: colors.text, flex: 1, fontSize: 14 },
  bonusPts: { fontWeight: "bold", fontSize: 14 },
  potential: { color: colors.textMuted, textAlign: "center", fontSize: 14 },
  potentialValue: { color: colors.green, fontWeight: "bold" },
  btn: {
    backgroundColor: colors.primary, borderRadius: 12,
    padding: 16, alignItems: "center", marginTop: 4,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
});
