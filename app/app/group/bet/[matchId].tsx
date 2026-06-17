import React, { useEffect, useState } from "react";
import { View, StyleSheet, ScrollView, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/hooks/useAuth";
import { useMatch, useMyBets, usePlaceBet } from "@/lib/data";
import { Screen, Text, Card, Button } from "@/components/ui";
import { ScoreStepper } from "@/components/ScoreStepper";
import { ScoringRulesCard } from "@/components/ScoringRulesCard";
import { palette, spacing, radius } from "@/lib/theme";
import { formatKickoff, isBettingOpen } from "@/lib/format";
import { maxPossiblePoints, type Score } from "@bolao/scoring";

export default function BetScreen() {
  const { matchId, groupId } = useLocalSearchParams<{ matchId: string; groupId: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const match = useMatch(matchId);
  const myBets = useMyBets(groupId, user?.uid);
  const placeBet = usePlaceBet(groupId!, user?.uid ?? "", user?.displayName ?? "Você");

  const [score, setScore] = useState<Score>({ home: 0, away: 0 });
  const existing = myBets.data?.[matchId!];

  useEffect(() => {
    if (existing) setScore(existing.score);
  }, [existing]);

  const closed = !!match.data && !isBettingOpen(match.data);
  const potential = maxPossiblePoints(score);

  async function save() {
    try {
      await placeBet.mutateAsync({ matchId: matchId!, score });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      router.back();
    } catch {
      Alert.alert("Ops", "Não foi possível salvar o palpite. Tente novamente.");
    }
  }

  if (match.isLoading) {
    return <Screen style={styles.center}><Text color={palette.textMuted}>Carregando…</Text></Screen>;
  }
  if (!match.data) {
    return <Screen style={styles.center}><Text color={palette.textMuted}>Partida não encontrada.</Text></Screen>;
  }
  if (closed) {
    return (
      <Screen style={styles.center}>
        <Text variant="heading" center>Palpites encerrados</Text>
        <Text variant="body" color={palette.textMuted} center style={{ marginTop: spacing.xs }}>
          Os palpites fecham 5 minutos antes do início da partida.
        </Text>
        <Button title="Ver palpites" onPress={() => router.replace(`/group/match/${matchId}?groupId=${groupId}`)}
          style={{ marginTop: spacing.lg }} />
      </Screen>
    );
  }

  const m = match.data;

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text variant="caption" color={palette.textMuted} center>{m.round || "Partida"}</Text>
        <Text variant="caption" color={palette.textFaint} center>{formatKickoff(m.kickoff)}</Text>

        <Card style={styles.pickCard}>
          <View style={styles.steppers}>
            <ScoreStepper team={m.home} value={score.home} onChange={(n) => setScore((s) => ({ ...s, home: n }))} />
            <Text variant="title" color={palette.textFaint} style={styles.vsLabel}>×</Text>
            <ScoreStepper team={m.away} value={score.away} onChange={(n) => setScore((s) => ({ ...s, away: n }))} align="right" />
          </View>

          <View style={styles.potential}>
            <Text variant="caption" color={palette.textMuted}>VALE ATÉ</Text>
            <Text style={styles.potentialValue}>{potential} pts</Text>
          </View>
        </Card>

        <ScoringRulesCard />

        {existing && (
          <Text variant="caption" color={palette.textMuted} center>
            Você já palpitou {existing.score.home}-{existing.score.away}. Salvar substitui o palpite.
          </Text>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <Button
          title={existing ? "Atualizar palpite" : "Confirmar palpite"}
          icon="checkmark-circle"
          onPress={save}
          loading={placeBet.isPending}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", justifyContent: "center", padding: spacing.xl },
  container: { padding: spacing.xl, gap: spacing.md },
  pickCard: { gap: spacing.lg, alignItems: "center" },
  steppers: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.md, width: "100%" },
  vsLabel: { marginTop: 40 },
  potential: {
    alignItems: "center", backgroundColor: palette.primaryGlow,
    paddingVertical: spacing.md, paddingHorizontal: spacing.xxl, borderRadius: radius.lg,
    width: "100%",
  },
  potentialValue: { fontFamily: "Inter_800ExtraBold", fontSize: 30, lineHeight: 38, color: palette.primary },
  footer: {
    position: "absolute", left: 0, right: 0, bottom: 0,
    paddingHorizontal: spacing.xl, paddingTop: spacing.md,
    backgroundColor: palette.bg, borderTopWidth: 1, borderTopColor: palette.border,
  },
});
