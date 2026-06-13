/**
 * Tela de detalhe do grupo com três abas:
 * Ranking | Jogos | Regras
 */
import React, { useState } from "react";
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Share, ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import {
  collection, doc, getDocs, getDoc, query, orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { colors } from "@/lib/colors";
import { PointsBadge } from "@/components/PointsBadge";

type Tab = "ranking" | "jogos" | "regras";

interface Member { id: string; displayName: string; totalPoints: number; role: string }
interface MatchItem {
  id: string;
  home: { name: string };
  away: { name: string };
  kickoff: { toDate(): Date };
  status: "scheduled" | "live" | "finished";
  score: { home: number; away: number } | null;
  round?: string;
}
interface GroupData { id: string; name: string; inviteCode: string }
interface BetItem { matchId: string; score: { home: number; away: number }; points: number; userId: string }

export default function GroupDetailScreen() {
  const { id: groupId } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("ranking");

  const { data: group, isLoading: gLoading } = useQuery({
    queryKey: ["group", groupId],
    queryFn: async () => {
      const snap = await getDoc(doc(db, "groups", groupId!));
      const data = snap.data() ?? {};
      return { id: snap.id, ...(data as { name: string; inviteCode: string }) } as GroupData;
    },
    enabled: !!groupId,
  });

  const { data: members, isLoading: mLoading } = useQuery({
    queryKey: ["members", groupId],
    queryFn: async () => {
      const snap = await getDocs(
        query(collection(db, "groups", groupId!, "members"), orderBy("totalPoints", "desc"))
      );
      return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Member));
    },
    enabled: !!groupId,
  });

  const { data: matches } = useQuery({
    queryKey: ["matches"],
    queryFn: async () => {
      const snap = await getDocs(query(collection(db, "matches"), orderBy("kickoff", "asc")));
      return snap.docs.map((d) => ({ id: d.id, ...d.data() } as MatchItem));
    },
  });

  const { data: myBets } = useQuery({
    queryKey: ["bets", groupId, user?.uid],
    queryFn: async () => {
      const snap = await getDocs(
        query(
          collection(db, "groups", groupId!, "bets"),
          // In a real query you'd use where("userId","==",uid), but needs index
        )
      );
      const bets: Record<string, BetItem> = {};
      snap.docs
        .filter((d) => (d.data() as BetItem).matchId !== undefined && d.data().userId === user?.uid)
        .forEach((d) => {
          bets[(d.data() as BetItem).matchId] = d.data() as BetItem;
        });
      return bets;
    },
    enabled: !!groupId && !!user,
  });

  async function shareInvite() {
    if (!group) return;
    await Share.share({
      message: `Entre no meu grupo "${group.name}" no Bolão Copa! Código: ${group.inviteCode}`,
    });
  }

  if (gLoading || mLoading) {
    return <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>;
  }

  return (
    <View style={styles.container}>
      {/* Header do grupo */}
      <View style={styles.header}>
        <Text style={styles.groupName}>{group?.name}</Text>
        <TouchableOpacity style={styles.inviteBtn} onPress={shareInvite}>
          <Text style={styles.inviteText}>Convidar  {group?.inviteCode}</Text>
        </TouchableOpacity>
      </View>

      {/* Abas */}
      <View style={styles.tabs}>
        {(["ranking", "jogos", "regras"] as Tab[]).map((t) => (
          <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Conteúdo da aba */}
      {tab === "ranking" && (
        <FlatList
          data={members ?? []}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.list}
          renderItem={({ item, index }) => (
            <View style={[styles.memberCard, item.id === user?.uid && styles.myCard]}>
              <Text style={styles.rank}>{index + 1}°</Text>
              <Text style={styles.memberName} numberOfLines={1}>{item.displayName}</Text>
              <Text style={styles.pts}>{item.totalPoints} pts</Text>
            </View>
          )}
        />
      )}

      {tab === "jogos" && (
        <FlatList
          data={matches ?? []}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const myBet = myBets?.[item.id];
            const canBet = item.status === "scheduled";
            return (
              <TouchableOpacity
                style={styles.matchCard}
                onPress={() => canBet
                  ? router.push(`/group/bet/${item.id}?groupId=${groupId}`)
                  : router.push(`/group/match/${item.id}?groupId=${groupId}`)
                }
              >
                <View style={styles.matchRow}>
                  <Text style={styles.matchTeam} numberOfLines={1}>{item.home.name}</Text>
                  {item.score
                    ? <Text style={styles.matchScore}>{item.score.home}×{item.score.away}</Text>
                    : <Text style={styles.matchVs}>vs</Text>}
                  <Text style={[styles.matchTeam, { textAlign: "right" }]} numberOfLines={1}>
                    {item.away.name}
                  </Text>
                </View>
                <View style={styles.matchMeta}>
                  {myBet ? (
                    <Text style={styles.myBetText}>
                      Palpite: {myBet.score.home}×{myBet.score.away}
                      {myBet.points > 0 ? ` · ${myBet.points} pts` : ""}
                    </Text>
                  ) : canBet ? (
                    <Text style={styles.betCta}>Fazer palpite →</Text>
                  ) : (
                    <Text style={styles.noBet}>Sem palpite</Text>
                  )}
                  <Text style={[
                    styles.matchStatus,
                    { color: item.status === "live" ? colors.green : colors.textMuted },
                  ]}>
                    {item.status === "live" ? "AO VIVO" : item.status === "finished" ? "Encerrado" : "Em breve"}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {tab === "regras" && <RulesTab />}
    </View>
  );
}

function RulesTab() {
  const rules = [
    { label: "Acertar o vencedor (base)", pts: 3, color: colors.text },
    { label: "Placar Exato", pts: 5, color: colors.green },
    { label: "Placar Vencedor", pts: 3, color: colors.primary },
    { label: "Diferença de Gols", pts: 2, color: colors.teal },
    { label: "Placar Perdedor", pts: 1, color: colors.purple },
    { label: "Goleada (extra)", pts: 1, color: colors.orange },
  ];
  return (
    <View style={{ padding: 16, gap: 8 }}>
      <Text style={{ color: colors.text, fontSize: 18, fontWeight: "bold", marginBottom: 8 }}>
        Pontos Base
      </Text>
      <Text style={{ color: colors.textMuted, marginBottom: 8 }}>
        3 pts por acertar o vencedor (ou empate). Os bônus abaixo são cumulativos.
      </Text>
      {rules.map((r) => (
        <View key={r.label} style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text style={{ color: colors.text, fontSize: 14 }}>{r.label}</Text>
          <Text style={{ color: r.color, fontWeight: "bold" }}>+{r.pts} pts</Text>
        </View>
      ))}
      <Text style={{ color: colors.textMuted, marginTop: 12, fontSize: 12 }}>
        * Os bônus só contam se você acertou o vencedor/empate.
        Goleada = diferença de 4 gols ou mais.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.bg },
  header: {
    padding: 16, flexDirection: "row",
    justifyContent: "space-between", alignItems: "center",
    borderBottomWidth: 1, borderBottomColor: colors.divider,
  },
  groupName: { color: colors.text, fontSize: 18, fontWeight: "bold", flex: 1 },
  inviteBtn: {
    backgroundColor: colors.card,
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: colors.cardBorder,
  },
  inviteText: { color: colors.primary, fontSize: 13, fontWeight: "600" },
  tabs: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: colors.divider },
  tab: { flex: 1, padding: 12, alignItems: "center" },
  tabActive: { borderBottomWidth: 2, borderBottomColor: colors.primary },
  tabText: { color: colors.textMuted, fontWeight: "600" },
  tabTextActive: { color: colors.primary },
  list: { padding: 16, gap: 10 },
  memberCard: {
    backgroundColor: colors.card,
    borderRadius: 10, padding: 14,
    flexDirection: "row", alignItems: "center", gap: 12,
    borderWidth: 1, borderColor: colors.cardBorder,
  },
  myCard: { borderColor: colors.primary },
  rank: { color: colors.textMuted, fontSize: 16, fontWeight: "bold", width: 28 },
  memberName: { color: colors.text, fontSize: 15, flex: 1 },
  pts: { color: colors.green, fontWeight: "bold" },
  matchCard: {
    backgroundColor: colors.card,
    borderRadius: 12, padding: 14, gap: 8,
    borderWidth: 1, borderColor: colors.cardBorder,
  },
  matchRow: { flexDirection: "row", alignItems: "center" },
  matchTeam: { flex: 1, color: colors.text, fontSize: 13, fontWeight: "600" },
  matchScore: { color: colors.text, fontSize: 18, fontWeight: "bold", paddingHorizontal: 8 },
  matchVs: { color: colors.textMuted, paddingHorizontal: 8 },
  matchMeta: { flexDirection: "row", justifyContent: "space-between" },
  myBetText: { color: colors.teal, fontSize: 12 },
  betCta: { color: colors.primary, fontSize: 12, fontWeight: "600" },
  noBet: { color: colors.textMuted, fontSize: 12 },
  matchStatus: { fontSize: 11, fontWeight: "600" },
  // Expose color vars used in RulesTab inline
  teal: { color: colors.teal },
  purple: { color: colors.purple },
  orange: { color: colors.orange },
});
