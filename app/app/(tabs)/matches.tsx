import React from "react";
import { FlatList, View, StyleSheet, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMatches } from "@/lib/data";
import { Screen, Text, EmptyState, SkeletonCard, FadeIn } from "@/components/ui";
import { MatchCard } from "@/components/MatchCard";
import { palette, spacing } from "@/lib/theme";

export default function MatchesScreen() {
  const insets = useSafeAreaInsets();
  const { data: matches, isLoading, refetch, isRefetching } = useMatches();

  return (
    <Screen edges={{ top: true }}>
      <View style={styles.header}>
        <Text variant="title">Jogos</Text>
        <Text variant="body" color={palette.textMuted}>Todas as partidas da competição</Text>
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
          ListEmptyComponent={
            <EmptyState
              icon="football-outline"
              title="Nenhum jogo cadastrado"
              subtitle="Os jogos aparecem aqui assim que forem sincronizados pela API ou cadastrados pelo admin."
            />
          }
          renderItem={({ item, index }) => (
            <FadeIn delay={index * 40}>
              <MatchCard match={item} />
            </FadeIn>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.lg, gap: 2 },
  list: { paddingHorizontal: spacing.xl, gap: spacing.md, flexGrow: 1 },
});
