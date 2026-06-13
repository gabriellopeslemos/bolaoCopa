/**
 * Tela de administração (restrita ao usuário com custom claim admin:true).
 * Permite disparar a sincronização de jogos da API ou lançar placar manualmente.
 */
import React, { useState } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet,
  TextInput, ActivityIndicator, Alert, ScrollView,
} from "react-native";
import { httpsCallable } from "firebase/functions";
import { fns } from "@/lib/firebase";
import { colors } from "@/lib/colors";

export default function AdminScreen() {
  const [syncing, setSyncing] = useState(false);
  const [matchId, setMatchId] = useState("");
  const [homeGoals, setHomeGoals] = useState("");
  const [awayGoals, setAwayGoals] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSync() {
    setSyncing(true);
    try {
      const fn = httpsCallable<void, { synced: number }>(fns, "syncFixturesNow");
      const res = await fn();
      Alert.alert("Sincronizado", `${res.data.synced} jogos atualizados.`);
    } catch (e: unknown) {
      Alert.alert("Erro", String(e));
    } finally {
      setSyncing(false);
    }
  }

  async function handleSetResult() {
    const h = parseInt(homeGoals, 10);
    const a = parseInt(awayGoals, 10);
    if (!matchId || isNaN(h) || isNaN(a)) {
      Alert.alert("Preencha todos os campos corretamente.");
      return;
    }
    setSaving(true);
    try {
      const fn = httpsCallable(fns, "setMatchResult");
      await fn({ matchId: matchId.trim(), home: h, away: a, status: "finished" });
      Alert.alert("Resultado lançado!", "Os palpites serão pontuados automaticamente.");
      setMatchId(""); setHomeGoals(""); setAwayGoals("");
    } catch (e: unknown) {
      Alert.alert("Erro", String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sincronizar jogos (API)</Text>
        <Text style={styles.desc}>
          Busca os jogos e placares da Copa na API-Football e atualiza o Firestore.
        </Text>
        <TouchableOpacity
          style={[styles.btn, syncing && styles.btnDisabled]}
          onPress={handleSync} disabled={syncing}
        >
          {syncing ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Sincronizar agora</Text>}
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Lançar resultado manualmente</Text>
        <Text style={styles.desc}>
          Use quando a API não estiver disponível. Informe o ID da partida no Firestore.
        </Text>
        <TextInput
          style={styles.input}
          placeholder="ID da partida (ex: world-cup-2026-12345)"
          placeholderTextColor={colors.textMuted}
          value={matchId}
          onChangeText={setMatchId}
          autoCapitalize="none"
        />
        <View style={styles.goalsRow}>
          <TextInput
            style={[styles.input, styles.goalInput]}
            placeholder="Gols casa"
            placeholderTextColor={colors.textMuted}
            keyboardType="number-pad"
            value={homeGoals}
            onChangeText={setHomeGoals}
          />
          <Text style={styles.x}>×</Text>
          <TextInput
            style={[styles.input, styles.goalInput]}
            placeholder="Gols fora"
            placeholderTextColor={colors.textMuted}
            keyboardType="number-pad"
            value={awayGoals}
            onChangeText={setAwayGoals}
          />
        </View>
        <TouchableOpacity
          style={[styles.btn, saving && styles.btnDisabled]}
          onPress={handleSetResult} disabled={saving}
        >
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Lançar resultado</Text>}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 24, backgroundColor: colors.bg, flexGrow: 1 },
  section: {
    backgroundColor: colors.card, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: colors.cardBorder, gap: 12,
  },
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: "bold" },
  desc: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
  input: {
    backgroundColor: colors.inputBg,
    borderColor: colors.inputBorder, borderWidth: 1, borderRadius: 10,
    color: colors.text, padding: 12, fontSize: 15,
  },
  goalsRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  goalInput: { flex: 1 },
  x: { color: colors.textMuted, fontSize: 20 },
  btn: {
    backgroundColor: colors.primary, borderRadius: 10,
    padding: 14, alignItems: "center",
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: "#fff", fontWeight: "bold", fontSize: 15 },
});
