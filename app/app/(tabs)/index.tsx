import React from "react";
import { View, SectionList, StyleSheet, Pressable, Share, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/hooks/useAuth";
import { useActiveGroup } from "@/hooks/useActiveGroup";
import { useGroup, useMembers } from "@/lib/data";
import {
  Screen, Text, Card, Avatar, EmptyState, SkeletonCard, FadeIn, Button,
} from "@/components/ui";
import { ScoringRulesCard } from "@/components/ScoringRulesCard";
import { palette, spacing, radius } from "@/lib/theme";
import type { Member } from "@/lib/types";

const DIVISION_SIZE = 4;

/** Quebra o ranking (já ordenado por pontos) em divisões de 4, estilo fase de grupos. */
function toDivisions(members: Member[]): { title: string; data: Member[] }[] {
  const sections: { title: string; data: Member[] }[] = [];
  for (let i = 0; i < members.length; i += DIVISION_SIZE) {
    sections.push({
      title: `Divisão ${String.fromCharCode(65 + sections.length)}`,
      data: members.slice(i, i + DIVISION_SIZE),
    });
  }
  return sections;
}

export default function RankingScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { activeGroupId, activeGroup, isLoading: groupsLoading } = useActiveGroup();

  const group = useGroup(activeGroupId);
  const members = useMembers(activeGroupId);

  async function shareInvite() {
    if (!group.data) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    await Share.share({
      message: `Entre no meu bolão "${group.data.name}" no Bolão Copa!\nCódigo de convite: ${group.data.inviteCode}`,
    });
  }

  // Nenhum grupo: orienta a criar/entrar no Perfil.
  if (!groupsLoading && !activeGroupId) {
    return (
      <Screen edges={{ top: true }}>
        <View style={styles.header}><Text variant="title">Ranking</Text></View>
        <EmptyState
          icon="people-outline"
          title="Nenhum grupo selecionado"
          subtitle="Crie um bolão ou entre em um com o código de convite, lá no Perfil."
        >
          <Button title="Ir para o Perfil" icon="person-outline"
            onPress={() => router.push("/(tabs)/profile")} />
        </EmptyState>
      </Screen>
    );
  }

  const sections = toDivisions(members.data ?? []);

  return (
    <Screen edges={{ top: true }}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text variant="caption" color={palette.textMuted}>Ranking · fase de grupos</Text>
          <Text variant="title" numberOfLines={1}>{activeGroup?.name ?? group.data?.name ?? " "}</Text>
        </View>
        {group.data && (
          <Pressable onPress={shareInvite} hitSlop={10} style={styles.inviteBtn}>
            <Ionicons name="share-social-outline" size={16} color={palette.primary} />
            <Text variant="label" color={palette.primary}>{group.data.inviteCode}</Text>
          </Pressable>
        )}
      </View>

      {members.isLoading ? (
        <View style={styles.list}>{[0, 1, 2].map((i) => <SkeletonCard key={i} />)}</View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(m) => m.id}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + spacing.xl }]}
          refreshControl={
            <RefreshControl refreshing={members.isRefetching} onRefresh={members.refetch} tintColor={palette.primary} />
          }
          ListEmptyComponent={
            <EmptyState icon="podium-outline" title="Ranking vazio" subtitle="Faça palpites para pontuar." />
          }
          ListFooterComponent={
            sections.length > 0 ? (
              <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
                <Text variant="label" color={palette.textMuted}>Como pontua</Text>
                <ScoringRulesCard />
              </View>
            ) : null
          }
          renderSectionHeader={({ section }) => (
            <View style={styles.divHeader}>
              <Ionicons name="grid-outline" size={14} color={palette.primary} />
              <Text variant="label" color={palette.primary}>{section.title}</Text>
            </View>
          )}
          renderItem={({ item, index }) => (
            <FadeIn delay={index * 30}>
              <RankRow member={item} position={index + 1} isMe={item.id === user?.uid} />
            </FadeIn>
          )}
          SectionSeparatorComponent={() => <View style={{ height: spacing.xs }} />}
          ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        />
      )}
    </Screen>
  );
}

const MEDAL: Record<number, string> = { 1: palette.gold, 2: palette.silver, 3: palette.bronze };

/** position = colocação DENTRO da divisão (1..4). O 4º é a "lanterna". */
function RankRow({ member, position, isMe }: { member: Member; position: number; isMe: boolean }) {
  const medal = MEDAL[position];
  const last = position === DIVISION_SIZE;
  return (
    <Card highlight={isMe} style={styles.rankRow}>
      <View style={styles.rankPos}>
        {medal ? (
          <Ionicons name="medal" size={22} color={medal} />
        ) : (
          <Text variant="subtitle" color={last ? palette.red : palette.textMuted}>{position}</Text>
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
    flexDirection: "row", alignItems: "center", gap: spacing.md,
    paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.lg,
  },
  inviteBtn: {
    flexDirection: "row", alignItems: "center", gap: spacing.xs,
    backgroundColor: palette.primaryGlow, paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
  list: { paddingHorizontal: spacing.xl, flexGrow: 1 },
  divHeader: {
    flexDirection: "row", alignItems: "center", gap: spacing.xs,
    paddingTop: spacing.lg, paddingBottom: spacing.sm,
  },
  rankRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  rankPos: { width: 28, alignItems: "center" },
  rankPts: { alignItems: "center", minWidth: 40 },
});
