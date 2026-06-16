import React, { useState, useRef, useEffect } from "react";
import {
  FlatList,
  ScrollView,
  View,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Text as RNText,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/hooks/useAuth";
import { useActiveGroup } from "@/hooks/useActiveGroup";
import { useMatches, useMyBets } from "@/lib/data";
import { EmptyState, SkeletonCard, FadeIn, Button } from "@/components/ui";
import { MatchCard } from "@/components/MatchCard";
import { isBettingOpen } from "@/lib/format";
import { palette, spacing, font } from "@/lib/theme";
const WEEKDAY_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTH_NAMES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseDateKey(key: string): { day: number; weekday: string; month: string; year: number } {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return { day: d, weekday: WEEKDAY_SHORT[date.getDay()], month: MONTH_NAMES[m - 1], year: y };
}

function formatHeaderSubtitle(key: string): string {
  const { day, weekday, month, year } = parseDateKey(key);
  return `${weekday}, ${day} ${month} ${year} · Copa do Mundo`;
}

function getItemOpacity(index: number, selectedIndex: number): number {
  const dist = Math.abs(index - selectedIndex);
  if (dist === 0) return 1;
  if (dist === 1) return 0.6;
  if (dist === 2) return 0.45;
  return 0.35;
}

export default function MatchesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { activeGroupId, activeGroup } = useActiveGroup();

  const [statusFilter, setStatusFilter] = useState<"upcoming" | "finished">("upcoming");
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);

  const dateScrollRef = useRef<ScrollView>(null);

  const { data: matches, isLoading, refetch, isRefetching } = useMatches();
  const myBets = useMyBets(activeGroupId, user?.uid);

  // All filtered matches for the selected tab
  const filtered = matches?.filter((m) => {
    if (!m.kickoff) return false;
    if (statusFilter === "finished") return m.status === "finished";
    return m.status === "scheduled" || m.status === "live";
  }) ?? [];

  // Unique sorted date keys
  const dateKeys = Array.from(new Set(filtered.map((m) => toDateKey(m.kickoff.toDate())))).sort(
    (a, b) => (statusFilter === "finished" ? b.localeCompare(a) : a.localeCompare(b))
  );

  // Keep selected date valid when filter changes
  useEffect(() => {
    if (dateKeys.length === 0) {
      setSelectedDateKey(null);
      return;
    }
    setSelectedDateKey((prev) => (prev && dateKeys.includes(prev) ? prev : dateKeys[0]));
  }, [statusFilter, dateKeys.join(",")]);

  // Scroll selected date chip into view
  useEffect(() => {
    if (!selectedDateKey) return;
    const idx = dateKeys.indexOf(selectedDateKey);
    if (idx < 0) return;
    // Each item is roughly 44px wide + 18px gap
    const offset = 20 + idx * 62 - 100;
    setTimeout(() => dateScrollRef.current?.scrollTo({ x: Math.max(0, offset), animated: true }), 50);
  }, [selectedDateKey]);

  // Matches for the selected date only
  const visibleMatches = selectedDateKey
    ? filtered
        .filter((m) => toDateKey(m.kickoff.toDate()) === selectedDateKey)
        .sort((a, b) =>
          statusFilter === "finished"
            ? b.kickoff.toMillis() - a.kickoff.toMillis()
            : a.kickoff.toMillis() - b.kickoff.toMillis()
        )
    : [];

  const selectedIndex = dateKeys.indexOf(selectedDateKey ?? "");

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <RNText style={styles.pageTitle}>Jogos</RNText>
        <RNText style={styles.pageSubtitle}>
          {selectedDateKey ? formatHeaderSubtitle(selectedDateKey) : "Copa do Mundo 2026"}
        </RNText>
      </View>

      {/* ── Date strip ── */}
      {!isLoading && dateKeys.length > 0 && (
        <View style={styles.dateStripWrapper}>
          <ScrollView
            ref={dateScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dateStripContent}
          >
            {dateKeys.map((key, idx) => {
              const { day, weekday } = parseDateKey(key);
              const isSelected = key === selectedDateKey;
              const opacity = getItemOpacity(idx, selectedIndex);
              return (
                <TouchableOpacity
                  key={key}
                  onPress={() => setSelectedDateKey(key)}
                  activeOpacity={0.7}
                  style={[styles.dateItem, isSelected && styles.dateItemSelected, { opacity }]}
                >
                  <RNText style={[styles.dateWeekday, isSelected && styles.dateWeekdaySelected]}>
                    {weekday.toUpperCase()}
                  </RNText>
                  <RNText style={[styles.dateNumber, isSelected && styles.dateNumberSelected]}>
                    {day}
                  </RNText>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* ── Toggle ── */}
      <View style={styles.toggleWrapper}>
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[styles.toggleOption, statusFilter === "upcoming" && styles.toggleOptionActive]}
            onPress={() => setStatusFilter("upcoming")}
            activeOpacity={0.8}
          >
            <RNText style={[styles.toggleText, statusFilter === "upcoming" && styles.toggleTextActive]}>
              Próximos
            </RNText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleOption, statusFilter === "finished" && styles.toggleOptionActive]}
            onPress={() => setStatusFilter("finished")}
            activeOpacity={0.8}
          >
            <RNText style={[styles.toggleText, statusFilter === "finished" && styles.toggleTextActive]}>
              Finalizados
            </RNText>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Match list ── */}
      {isLoading ? (
        <View style={styles.list}>
          {[0, 1, 2, 3].map((i) => <SkeletonCard key={i} />)}
        </View>
      ) : (
        <FlatList
          data={visibleMatches}
          keyExtractor={(m) => m.id}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + spacing.xxxl }]}
          showsVerticalScrollIndicator={false}
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
                <RNText style={styles.noticeText}>
                  Selecione um grupo no Perfil para palpitar.
                </RNText>
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
                  ? "Nenhuma partida encerrada ainda."
                  : "Nenhuma partida agendada."
              }
            />
          }
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          renderItem={({ item, index }) => {
            const bet = myBets.data?.[item.id];
            const open = isBettingOpen(item);
            return (
              <FadeIn delay={index * 30}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: palette.bg,
  },

  // ── Header ──
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: palette.bgElevated,
  },
  pageTitle: {
    fontFamily: font.display,
    fontSize: 34,
    letterSpacing: 2,
    color: palette.text,
    lineHeight: 36,
  },
  pageSubtitle: {
    fontFamily: font.bold,
    fontSize: 11,
    fontWeight: undefined,
    letterSpacing: 3,
    color: palette.textFaint,
    textTransform: "uppercase",
    marginTop: 1,
  },

  // ── Date strip ──
  dateStripWrapper: {
    borderBottomWidth: 1,
    borderBottomColor: palette.bgElevated,
  },
  dateStripContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    gap: 18,
    alignItems: "flex-end",
    paddingBottom: 0,
  },
  dateItem: {
    alignItems: "center",
    gap: 3,
    paddingBottom: 8,
  },
  dateItemSelected: {
    borderBottomWidth: 2,
    borderBottomColor: palette.primary,
    paddingBottom: 4,
  },
  dateWeekday: {
    fontFamily: font.bold,
    fontSize: 10,
    fontWeight: undefined,
    letterSpacing: 1,
    color: palette.textMuted,
    textTransform: "uppercase",
  },
  dateWeekdaySelected: {
    color: palette.primary,
  },
  dateNumber: {
    fontFamily: font.display,
    fontSize: 22,
    color: palette.text,
    lineHeight: 22,
  },
  dateNumberSelected: {
    fontSize: 28,
    lineHeight: 28,
    color: palette.primary,
  },

  // ── Toggle ──
  toggleWrapper: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 14,
  },
  toggleContainer: {
    flexDirection: "row",
    backgroundColor: palette.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 3,
  },
  toggleOption: {
    flex: 1,
    paddingVertical: 7,
    paddingHorizontal: 22,
    borderRadius: 8,
    alignItems: "center",
  },
  toggleOptionActive: {
    backgroundColor: palette.primary,
  },
  toggleText: {
    fontFamily: font.bold,
    fontSize: 12,
    fontWeight: undefined,
    letterSpacing: 1.5,
    color: palette.textFaint,
    textTransform: "uppercase",
  },
  toggleTextActive: {
    color: palette.textOnPrimary,
  },

  // ── List ──
  list: {
    paddingHorizontal: 16,
    paddingTop: 0,
    flexGrow: 1,
  },
  notice: {
    gap: spacing.sm,
    marginBottom: spacing.md,
    paddingTop: spacing.md,
  },
  noticeText: {
    fontFamily: font.regular,
    fontSize: 12,
    color: palette.textMuted,
  },
});
