import React, { useState } from "react";
import {
  View, FlatList, StyleSheet, Pressable, Share, RefreshControl,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/hooks/useAuth";
import { useGroup, useMembers, useMatches, useMyBets } from "@/lib/data";
import {
  Screen, Text, Card, Avatar, EmptyState, SkeletonCard, FadeIn,
} from "@/components/ui";
import { MatchCard } from "@/components/MatchCard";
import { ScoringRulesCard } from "@/components/ScoringRulesCard";
import { palette, spacing, radius, gradients } from "@/lib/theme";
import type { Member } from "@/lib/types";

type Tab = "ranking" | "jogos" | "regras";
const TABS: { key: Tab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: "ranking", label: "Ranking", icon: "podium-outline" },
  { key: "jogos", label: "Jogos", icon: "football-outline" },
  { key: "regras", label: "Regras", icon: "book-outline" },
];

export default function GroupDetailScreen() {
  const { id: groupId } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>("ranking");

  const group = useGroup(groupId);
  const members = useMembers(groupId);
  const matches = useMatches();
  const myBets = useMyBets(groupId, user?.uid);

  async function shareInvite() {
    if (!group.data) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    await Share.share({
      message: `Entre no meu bolão "${group.data.name}" no Bolão Copa!\nCódigo de convite: ${group.data.inviteCode}`,
    });
  }

  const loading = group.isLoading || members.isLoading;

  return (
    <Screen>
      {/* Header */}
      <LinearGradient colors={gradients.header} style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <View style={styles.headerTop}>
          <Pressable onPress={() => router.back()} hitSlop={10} style={styles.headerBtn}>
            <Ionicons name="chevron-back" size={24} color={palette.text} />
          </Pressable>
          <Pressable onPress={shareInvite} hitSlop={10} style={styles.inviteBtn}>
            <Ionicons name="share-social-outline" size={16} color={palette.primary} />
            <Text variant="label" color={palette.primary}>{group.data?.inviteCode ?? "..."}</Text>
          </Pressable>
        </View>
        <Text variant="title" numberOfLines={1}>{group.data?.name ?? " "}</Text>
        <Text variant="caption" color={palette.textMuted}>
          {group.data?.memberCount ?? members.data?.length ?? 0} participantes
        </Text>

        <View style={styles.segment}>
          {TABS.map((t) => {
            const active = tab === t.key;
            return (
              <Pressable
                key={t.key}
                style={[styles.segmentItem, active && styles.segmentActive]}
                onPress={() => { Haptics.selectionAsync().catch(() => {}); setTab(t.key); }}
              >
                <Ionicons name={t.icon} size={15} color={active ? palette.black : palette.textMuted} />
                <Text variant="label" color={active ? palette.black : palette.textMuted}>{t.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </LinearGradient>

      {/* Conteúdo */}
      {loading ? (
        <View style={styles.list}>{[0, 1, 2].map((i) => <SkeletonCard key={i} />)}</View>
      ) : tab === "ranking" ? (
        <RankingTab members={members.data ?? []} myUid={user?.uid}
          refreshing={members.isRefetching} onRefresh={members.refetch} insetBottom={insets.bottom} />
      ) : tab === "jogos" ? (
        <FlatList
          data={matches.data ?? []}
          keyExtractor={(m) => m.id}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + spacing.xl }]}
          refreshControl={
            <RefreshControl refreshing={matches.isRefetching} onRefresh={matches.refetch} tintColor={palette.primary} />
          }
          ListEmptyComponent={
            <EmptyState icon="football-outline" title="Sem jogos ainda"
              subtitle="Os jogos aparecem aqui assim que forem cadastrados." />
          }
          renderItem={({ item, index }) => {
            const bet = myBets.data?.[item.id];
            const open = item.status === "scheduled";
            return (
              <FadeIn delay={index * 40}>
                <MatchCard
                  match={item}
                  bet={bet}
                  onPress={() =>
                    open
                      ? router.push(`/group/bet/${item.id}?groupId=${groupId}`)
                      : router.push(`/group/match/${item.id}?groupId=${groupId}`)
                  }
                />
              </FadeIn>
            );
          }}
        />
      ) : (
        <View style={[styles.list, { paddingBottom: insets.bottom + spacing.xl }]}>
          <ScoringRulesCard />
          <Text variant="caption" color={palette.textFaint} style={{ paddingHorizontal: spacing.xs }}>
            Os bônus são cumulativos e só contam se você acertar o vencedor (ou o empate).
            Placar exato vale o máximo. Goleada = diferença de 4 gols ou mais.
          </Text>
        </View>
      )}
    </Screen>
  );
}

function RankingTab({
  members, myUid, refreshing, onRefresh, insetBottom,
}: {
  members: Member[]; myUid?: string;
  refreshing: boolean; onRefresh: () => void; insetBottom: number;
}) {
  return (
    <FlatList
      data={members}
      keyExtractor={(m) => m.id}
      contentContainerStyle={[styles.list, { paddingBottom: insetBottom + spacing.xl }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.primary} />}
      ListEmptyComponent={<EmptyState icon="podium-outline" title="Ranking vazio" subtitle="Faça palpites para pontuar." />}
      renderItem={({ item, index }) => (
        <FadeIn delay={index * 40}>
          <RankRow member={item} position={index + 1} isMe={item.id === myUid} />
        </FadeIn>
      )}
    />
  );
}

const MEDAL: Record<number, string> = { 1: palette.gold, 2: palette.silver, 3: palette.bronze };

function RankRow({ member, position, isMe }: { member: Member; position: number; isMe: boolean }) {
  const medal = MEDAL[position];
  return (
    <Card highlight={isMe} style={styles.rankRow}>
      <View style={styles.rankPos}>
        {medal ? (
          <Ionicons name="medal" size={22} color={medal} />
        ) : (
          <Text variant="subtitle" color={palette.textMuted}>{position}</Text>
        )}
      </View>
      <Avatar name={member.displayName} size={42} ring={isMe} />
      <View style={{ flex: 1 }}>
        <Text variant="bodyMed" numberOfLines={1}>
          {member.displayName}{isMe ? " (você)" : ""}
        </Text>
        <Text variant="caption" color={palette.textMuted}>
          {member.exactCount ?? 0} placares exatos · {member.correctCount ?? 0} acertos
        </Text>
      </View>
      <View style={styles.rankPts}>
        <Text variant="heading" color={position <= 3 ? palette.primary : palette.text}>
          {member.totalPoints}
        </Text>
        <Text variant="caption" color={palette.textMuted}>pts</Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.xl, paddingBottom: spacing.lg, gap: 2,
    borderBottomWidth: 1, borderBottomColor: palette.border,
  },
  headerTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.sm },
  headerBtn: { marginLeft: -spacing.xs },
  inviteBtn: {
    flexDirection: "row", alignItems: "center", gap: spacing.xs,
    backgroundColor: palette.primaryGlow, paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
  segment: {
    flexDirection: "row", marginTop: spacing.lg, backgroundColor: palette.bg,
    borderRadius: radius.md, padding: 4, gap: 4,
  },
  segmentItem: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: spacing.xs, paddingVertical: spacing.sm, borderRadius: radius.sm,
  },
  segmentActive: { backgroundColor: palette.primary },
  list: { padding: spacing.xl, gap: spacing.md, flexGrow: 1 },
  rankRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  rankPos: { width: 28, alignItems: "center" },
  rankPts: { alignItems: "center", minWidth: 40 },
});
