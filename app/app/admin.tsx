import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Alert } from "react-native";
import { httpsCallable } from "firebase/functions";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fns } from "@/lib/firebase";
import { Screen, Text, Card, Button, Input } from "@/components/ui";
import { palette, spacing } from "@/lib/theme";

export default function AdminScreen() {
  const insets = useSafeAreaInsets();
  const [syncing, setSyncing] = useState(false);
  const [matchId, setMatchId] = useState("");
  const [home, setHome] = useState("");
  const [away, setAway] = useState("");
  const [saving, setSaving] = useState(false);

  async function sync() {
    setSyncing(true);
    try {
      const fn = httpsCallable<void, { synced: number }>(fns, "syncFixturesNow");
      const res = await fn();
      Alert.alert("Sincronizado ✓", `${res.data.synced} jogos atualizados.`);
    } catch (e) {
      Alert.alert("Erro", humanError(e));
    } finally {
      setSyncing(false);
    }
  }

  async function setResult() {
    const h = parseInt(home, 10);
    const a = parseInt(away, 10);
    if (!matchId.trim() || isNaN(h) || isNaN(a)) {
      Alert.alert("Atenção", "Informe o ID da partida e os dois placares.");
      return;
    }
    setSaving(true);
    try {
      const fn = httpsCallable(fns, "setMatchResult");
      await fn({ matchId: matchId.trim(), home: h, away: a, status: "finished" });
      Alert.alert("Resultado lançado ✓", "Os palpites serão pontuados automaticamente.");
      setMatchId(""); setHome(""); setAway("");
    } catch (e) {
      Alert.alert("Erro", humanError(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + spacing.xl }]}>
        <Card style={styles.card}>
          <Text variant="heading">Sincronizar jogos</Text>
          <Text variant="body" color={palette.textMuted}>
            Busca jogos e placares da Copa no TheSportsDB e atualiza o banco.
          </Text>
          <Button title="Sincronizar agora" icon="sync" onPress={sync} loading={syncing} />
        </Card>

        <Card style={styles.card}>
          <Text variant="heading">Lançar resultado manual</Text>
          <Text variant="body" color={palette.textMuted}>
            Use quando a API não cobrir o jogo. O ID está no documento da partida no Firestore.
          </Text>
          <Input label="ID da partida" icon="finger-print-outline"
            placeholder="world-cup-2026-12345" autoCapitalize="none"
            value={matchId} onChangeText={setMatchId} />
          <View style={styles.goals}>
            <View style={{ flex: 1 }}>
              <Input label="Casa" placeholder="0" keyboardType="number-pad"
                value={home} onChangeText={setHome} style={styles.goalInput} />
            </View>
            <Text variant="title" color={palette.textFaint} style={{ marginTop: spacing.lg }}>×</Text>
            <View style={{ flex: 1 }}>
              <Input label="Fora" placeholder="0" keyboardType="number-pad"
                value={away} onChangeText={setAway} style={styles.goalInput} />
            </View>
          </View>
          <Button title="Lançar resultado" icon="flag" onPress={setResult} loading={saving} />
        </Card>
      </ScrollView>
    </Screen>
  );
}

function humanError(e: unknown): string {
  if (e && typeof e === "object" && "message" in e) return String((e as { message: string }).message);
  return "Falha na operação.";
}

const styles = StyleSheet.create({
  container: { padding: spacing.xl, gap: spacing.lg },
  card: { gap: spacing.md },
  goals: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  goalInput: { textAlign: "center" },
});
