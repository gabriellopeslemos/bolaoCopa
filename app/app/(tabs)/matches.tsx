import React from "react";
import { FlatList, View, StyleSheet, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/hooks/useAuth";
import { useActiveGroup } from "@/hooks/useActiveGroup";
import { useMatches, useMyBets } from "@/lib/data";
import { Screen, Text, EmptyState, SkeletonCard, FadeIn, Button } from "@/components/ui";
import { MatchCard } from "@/components/MatchCard";
import { isBettingOpen } from "@/lib/format";
import { palette, spacing } from "@/lib/theme";

export default function MatchesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { activeGroupId, activeGroup } = useActiveGroup();

  const { data: matches, isLoading, refetch, isRefetching } = useMatches();
  const myBets = useMyBets(activeGroupId, user?.uid);

  return (
    <Screen edges={{ top: true }}>
      <View style={styles.header}>
        <Text variant="title">Jogos</Text>
        <Text variant="body" color={palette.textMuted}>
          {activeGroup ? `Palpites no bolão "${activeGroup.name}"` : "Todas as partidas da competição"}
        </Text>
      </View>

      {isLoading ? (
        <View style={styles.list}>{[0, 1, 2, 3].map((i) => <SkeletonCard key={i} />)}</View>
      ) : (
        <FlatList
          data={matches ?? []}
          keyExtractor={(m) => m.id}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + spacing.xl }]}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={palette.primary} />
          }
          ListHeaderComponent={
            !activeGroupId ? (
              <View style={styles.notice}>
                <Text variant="caption" color={palette.textMuted}>
                  Selecione um grupo no Perfil para palpitar.
                </Text>
                <Button title="Ir para o Perfil" variant="secondary" icon="person-outline"
                  onPress={() => router.push("/(tabs)/profile")} />
              </View>
            ) : null
          }
          ListEmptyComponent={
            <EmptyState
              icon="football-outline"
              title="Nenhum jogo cadastrado"
              subtitle="Os jogos aparecem aqui assim que forem sincronizados pela API ou cadastrados pelo admin."
            />
          }
          renderItem={({ item, index }) => {
            const bet = myBets.data?.[item.id];
            const open = isBettingOpen(item);
            return (
              <FadeIn delay={index * 40}>
                <MatchCard
                  match={item}
                  bet={bet}
                  onPress={
                    activeGroupId
                      ? () =>
                          open
                            ? router.push(`/group/bet/${item.id}?groupId=${activeGroupId}`)
                            : router.push(`/group/match/${item.id}?groupId=${activeGroupId}`)
                      : undefined
                  }
                />
              </FadeIn>
            );
          }}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.lg, gap: 2 },
  list: { paddingHorizontal: spacing.xl, gap: spacing.md, flexGrow: 1 },
  notice: { gap: spacing.sm, marginBottom: spacing.md },
});
