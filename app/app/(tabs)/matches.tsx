import React, { useState, useRef, useEffect } from "react";
import { FlatList, View, StyleSheet, RefreshControl, ScrollView, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/hooks/useAuth";
import { useActiveGroup } from "@/hooks/useActiveGroup";
import { useMatches, useMyBets } from "@/lib/data";
import { Screen, Text, EmptyState, SkeletonCard, FadeIn, Button } from "@/components/ui";
import { MatchCard } from "@/components/MatchCard";
import { isBettingOpen } from "@/lib/format";
import { palette, spacing, radius } from "@/lib/theme";

const MONTH_NAMES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const CIRCLE_SIZE = 50;
const CIRCLE_GAP = spacing.sm;

const TOURNAMENT_START = new Date(2026, 5, 11); // 11 jun
const TOURNAMENT_END   = new Date(2026, 6, 19); // 19 jul

function generateDateRange(): Date[] {
  const dates: Date[] = [];
  const cur = new Date(TOURNAMENT_START);
  while (cur <= TOURNAMENT_END) {
    dates.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function getInitialDate(dates: Date[]): Date {
  const today = new Date();
  if (today >= TOURNAMENT_START && today <= TOURNAMENT_END) {
    return dates.find((d) => isSameDay(d, today)) ?? dates[0];
  }
  if (today < TOURNAMENT_START) return dates[0];
  return dates[dates.length - 1];
}

const DATES = generateDateRange();

export default function MatchesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { activeGroupId, activeGroup } = useActiveGroup();

  const [selectedDate, setSelectedDate] = useState<Date>(() => getInitialDate(DATES));
  const [statusFilter, setStatusFilter] = useState<"upcoming" | "finished">("upcoming");
  const scrollRef = useRef<ScrollView>(null);

  const { data: matches, isLoading, refetch, isRefetching } = useMatches();
  const myBets = useMyBets(activeGroupId, user?.uid);

  const filteredMatches =
    matches?.filter((m) => {
      if (!m.kickoff) return false;
      const d = m.kickoff.toDate();
      if (!isSameDay(d, selectedDate)) return false;
      if (statusFilter === "finished") return m.status === "finished";
      return m.status === "scheduled" || m.status === "live";
    }) ?? [];

  // Scroll date picker to selected date on mount
  useEffect(() => {
    const idx = DATES.findIndex((d) => isSameDay(d, selectedDate));
    if (idx > 0) {
      const offset = spacing.xl + idx * (CIRCLE_SIZE + CIRCLE_GAP) - 80;
      setTimeout(() => scrollRef.current?.scrollTo({ x: Math.max(0, offset), animated: false }), 50);
    }
  }, []);

  function handleSelectDate(date: Date) {
    setSelectedDate(date);
    const idx = DATES.findIndex((d) => isSameDay(d, date));
    const offset = spacing.xl + idx * (CIRCLE_SIZE + CIRCLE_GAP) - 80;
    scrollRef.current?.scrollTo({ x: Math.max(0, offset), animated: true });
  }

  return (
    <Screen edges={{ top: true }}>
      <View style={styles.header}>
        <Text variant="title">Jogos</Text>
        <Text variant="body" color={palette.textMuted}>
          {activeGroup
            ? `Palpites no bolão "${activeGroup.name}"`
            : "Todas as partidas da competição"}
        </Text>
      </View>

      {/* Date circles */}
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.dateList}
        style={styles.dateScroll}
      >
        {DATES.map((date) => {
          const isSelected = isSameDay(date, selectedDate);
          const isToday = isSameDay(date, new Date());
          return (
            <TouchableOpacity
              key={date.toISOString()}
              onPress={() => handleSelectDate(date)}
              style={[styles.circle, isSelected && styles.circleSelected]}
              activeOpacity={0.7}
            >
              <Text
                variant="label"
                color={isSelected ? palette.bg : palette.text}
              >
                {date.getDate()}
              </Text>
              <Text
                variant="caption"
                color={isSelected ? palette.bg : palette.textMuted}
              >
                {MONTH_NAMES[date.getMonth()]}
              </Text>
              {isToday && (
                <View style={[styles.todayDot, isSelected && styles.todayDotSelected]} />
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Status toggle */}
      <View style={styles.toggleWrapper}>
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[styles.toggleOption, statusFilter === "upcoming" && styles.toggleOptionActive]}
            onPress={() => setStatusFilter("upcoming")}
            activeOpacity={0.8}
          >
            <Text
              variant="label"
              color={statusFilter === "upcoming" ? palette.bg : palette.textMuted}
            >
              Próximos
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleOption, statusFilter === "finished" && styles.toggleOptionActive]}
            onPress={() => setStatusFilter("finished")}
            activeOpacity={0.8}
          >
            <Text
              variant="label"
              color={statusFilter === "finished" ? palette.bg : palette.textMuted}
            >
              Finalizados
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.list}>{[0, 1, 2, 3].map((i) => <SkeletonCard key={i} />)}</View>
      ) : (
        <FlatList
          data={filteredMatches}
          keyExtractor={(m) => m.id}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + spacing.xl }]}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={palette.primary}
            />
          }
          ListHeaderComponent={
            !activeGroupId ? (
              <View style={styles.notice}>
                <Text variant="caption" color={palette.textMuted}>
                  Selecione um grupo no Perfil para palpitar.
                </Text>
                <Button
                  title="Ir para o Perfil"
                  variant="secondary"
                  icon="person-outline"
                  onPress={() => router.push("/(tabs)/profile")}
                />
              </View>
            ) : null
          }
          ListEmptyComponent={
            <EmptyState
              icon="football-outline"
              title={statusFilter === "finished" ? "Nenhum jogo finalizado" : "Nenhum jogo agendado"}
              subtitle={
                statusFilter === "finished"
                  ? "Sem partidas encerradas nesta data."
                  : "Sem partidas agendadas para esta data. Selecione outro dia."
              }
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
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    gap: 2,
  },
  dateScroll: {
    flexGrow: 0,
    marginBottom: spacing.lg,
  },
  dateList: {
    paddingHorizontal: spacing.xl,
    gap: CIRCLE_GAP,
    alignItems: "center",
  },
  circle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    alignItems: "center",
    justifyContent: "center",
    gap: 1,
  },
  circleSelected: {
    backgroundColor: palette.primary,
    borderColor: palette.primary,
  },
  todayDot: {
    position: "absolute",
    bottom: 5,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: palette.primary,
  },
  todayDotSelected: {
    backgroundColor: palette.bg,
  },
  toggleWrapper: {
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  toggleContainer: {
    flexDirection: "row",
    backgroundColor: palette.surface,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 3,
  },
  toggleOption: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },
  toggleOptionActive: {
    backgroundColor: palette.primary,
  },
  list: { paddingHorizontal: spacing.xl, gap: spacing.md, flexGrow: 1 },
  notice: { gap: spacing.sm, marginBottom: spacing.md },
});
