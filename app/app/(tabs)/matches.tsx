import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import {
  SectionList,
  ScrollView,
  View,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Text as RNText,
  useWindowDimensions,
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
import type { Match } from "@/lib/types";

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

function getItemOpacity(index: number, selectedIndex: number): number {
  const dist = Math.abs(index - selectedIndex);
  if (dist === 0) return 1;
  if (dist === 1) return 0.6;
  if (dist === 2) return 0.45;
  return 0.35;
}

type Section = { key: string; data: Match[] };

export default function MatchesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { activeGroupId } = useActiveGroup();

  const { width: screenWidth } = useWindowDimensions();

  const [statusFilter, setStatusFilter] = useState<"upcoming" | "finished">("upcoming");
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);

  const dateScrollRef = useRef<ScrollView>(null);
  const sectionListRef = useRef<SectionList<Match>>(null);
  // Measured layout of each date chip within the scroll content
  const itemLayoutRef = useRef<Record<string, { x: number; width: number }>>({});

  // Stable ref so onViewableItemsChanged never changes after mount
  const viewableHandlerRef = useRef<((info: any) => void) | null>(null);
  // Suppress viewable-items updates while a programmatic scroll is in flight
  const isProgrammaticScroll = useRef(false);

  const { data: matches, isLoading, refetch, isRefetching } = useMatches();
  const myBets = useMyBets(activeGroupId, user?.uid);

  // All unique dates across ALL matches (strip always shows these)
  const allDateKeys = useMemo(() => {
    if (!matches) return [];
    return Array.from(
      new Set(matches.filter((m) => m.kickoff).map((m) => toDateKey(m.kickoff.toDate())))
    ).sort((a, b) => a.localeCompare(b));
  }, [matches]);

  // Sections grouped by date for the current status tab
  const sections = useMemo<Section[]>(() => {
    if (!matches) return [];
    const filtered = matches
      .filter((m) => {
        if (!m.kickoff) return false;
        if (statusFilter === "finished") return m.status === "finished";
        return m.status === "scheduled" || m.status === "live";
      })
      .sort((a, b) =>
        statusFilter === "finished"
          ? b.kickoff.toMillis() - a.kickoff.toMillis()
          : a.kickoff.toMillis() - b.kickoff.toMillis()
      );

    const map = new Map<string, Match[]>();
    for (const m of filtered) {
      const key = toDateKey(m.kickoff.toDate());
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(m);
    }
    return Array.from(map.entries()).map(([key, data]) => ({ key, data }));
  }, [matches, statusFilter]);

  // Which dates have matches in the current tab (for dot indicator)
  const activeDateKeys = useMemo(() => new Set(sections.map((s) => s.key)), [sections]);

  // Initialize selectedDateKey on first load
  useEffect(() => {
    if (selectedDateKey === null && allDateKeys.length > 0) {
      const today = toDateKey(new Date());
      setSelectedDateKey(allDateKeys.includes(today) ? today : allDateKeys[0]);
    }
  }, [allDateKeys]);

  // When tab changes, prefer today's date; fall back to first section
  useEffect(() => {
    if (allDateKeys.length === 0) return;
    const today = toDateKey(new Date());
    const newKey = allDateKeys.includes(today)
      ? today
      : sections[0]?.key ?? allDateKeys[0] ?? null;
    setSelectedDateKey(newKey);
  }, [statusFilter]);

  const centerDateInStrip = useCallback(
    (dateKey: string, animated = true) => {
      const layout = itemLayoutRef.current[dateKey];
      let offset: number;
      if (layout) {
        offset = layout.x + layout.width / 2 - screenWidth / 2;
      } else {
        const idx = allDateKeys.indexOf(dateKey);
        if (idx < 0) return;
        offset = 20 + idx * 62 + 22 - screenWidth / 2;
      }
      dateScrollRef.current?.scrollTo({ x: Math.max(0, offset), animated });
    },
    [allDateKeys, screenWidth]
  );

  // Keep selected date chip centered in view
  useEffect(() => {
    if (!selectedDateKey) return;
    const t = setTimeout(() => centerDateInStrip(selectedDateKey), 80);
    return () => clearTimeout(t);
  }, [selectedDateKey, allDateKeys, screenWidth]);

  const scrollDateStripTo = useCallback(
    (dateKey: string) => centerDateInStrip(dateKey),
    [centerDateInStrip]
  );

  // Update viewable handler ref on every render so it always sees fresh state/closures
  viewableHandlerRef.current = ({ viewableItems }: any) => {
    if (isProgrammaticScroll.current) return;
    if (!viewableItems.length) return;
    const first = viewableItems.find((vi: any) => vi.isViewable && vi.section);
    if (first?.section?.key && first.section.key !== selectedDateKey) {
      setSelectedDateKey(first.section.key);
      scrollDateStripTo(first.section.key);
    }
  };

  // Stable callback that delegates to the ref — never changes after mount
  const onViewableItemsChanged = useCallback((info: any) => {
    viewableHandlerRef.current?.(info);
  }, []);

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 15 });

  const handleDatePress = useCallback(
    (dateKey: string) => {
      setSelectedDateKey(dateKey);
      const sectionIdx = sections.findIndex((s) => s.key === dateKey);
      if (sectionIdx >= 0 && sectionListRef.current) {
        isProgrammaticScroll.current = true;
        // Clear the flag after the scroll animation settles (~500ms)
        setTimeout(() => { isProgrammaticScroll.current = false; }, 600);
        try {
          sectionListRef.current.scrollToLocation({
            sectionIndex: sectionIdx,
            itemIndex: 0,
            animated: true,
            viewOffset: 0,
          });
        } catch (_) {
          isProgrammaticScroll.current = false;
        }
      }
    },
    [sections]
  );

  const selectedIndex = allDateKeys.indexOf(selectedDateKey ?? "");

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <RNText style={styles.pageTitle}>Jogos</RNText>
        <RNText style={styles.pageSubtitle}>Copa do Mundo 2026</RNText>
      </View>

      {/* ── Date strip — always shows ALL match dates ── */}
      {!isLoading && allDateKeys.length > 0 && (
        <View style={styles.dateStripWrapper}>
          <ScrollView
            ref={dateScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dateStripContent}
          >
            {allDateKeys.map((key, idx) => {
              const { day, weekday } = parseDateKey(key);
              const isSelected = key === selectedDateKey;
              const hasMatches = activeDateKeys.has(key);
              const opacity = hasMatches
                ? getItemOpacity(idx, selectedIndex)
                : 0.2;
              return (
                <TouchableOpacity
                  key={key}
                  onPress={() => handleDatePress(key)}
                  activeOpacity={0.7}
                  onLayout={(e) => {
                    itemLayoutRef.current[key] = {
                      x: e.nativeEvent.layout.x,
                      width: e.nativeEvent.layout.width,
                    };
                  }}
                  style={[styles.dateItem, isSelected && styles.dateItemSelected, { opacity }]}
                >
                  <RNText style={[styles.dateWeekday, isSelected && styles.dateWeekdaySelected]}>
                    {weekday.toUpperCase()}
                  </RNText>
                  <RNText style={[styles.dateNumber, isSelected && styles.dateNumberSelected]}>
                    {day}
                  </RNText>
                  {hasMatches && (
                    <View style={[styles.dateDot, isSelected && styles.dateDotSelected]} />
                  )}
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
        <SectionList
          ref={sectionListRef}
          sections={sections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + spacing.xxxl }]}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig.current}
          onScrollToIndexFailed={() => {}}
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
          renderSectionHeader={({ section }) => {
            const { day, weekday, month, year } = parseDateKey(section.key);
            return (
              <View style={styles.sectionHeader}>
                <RNText style={styles.sectionHeaderText}>
                  {weekday}, {day} {month} {year} · Copa do Mundo
                </RNText>
              </View>
            );
          }}
          SectionSeparatorComponent={() => <View style={{ height: 8 }} />}
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
    paddingBottom: 10,
  },
  dateItemSelected: {
    borderBottomWidth: 2,
    borderBottomColor: palette.primary,
    paddingBottom: 6,
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
  dateDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: palette.textMuted,
    marginTop: 1,
  },
  dateDotSelected: {
    backgroundColor: palette.primary,
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

  // ── Section header ──
  sectionHeader: {
    paddingTop: 14,
    paddingBottom: 8,
  },
  sectionHeaderText: {
    fontFamily: font.bold,
    fontSize: 11,
    fontWeight: undefined,
    letterSpacing: 2.5,
    color: palette.textFaint,
    textTransform: "uppercase",
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
