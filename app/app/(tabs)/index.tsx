import React, { useState } from "react";
import {
  View, FlatList, StyleSheet, Modal, Pressable,
  KeyboardAvoidingView, Platform, RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/hooks/useAuth";
import { useMyGroups, useCreateGroup, useJoinGroup } from "@/lib/data";
import {
  Screen, Text, Button, Card, Input, EmptyState, SkeletonCard, FadeIn,
} from "@/components/ui";
import { palette, spacing, radius } from "@/lib/theme";
import type { GroupSummary } from "@/lib/types";

export default function GroupsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: groups, isLoading, refetch, isRefetching } = useMyGroups(user?.uid);

  const [sheet, setSheet] = useState<null | "create" | "join">(null);

  return (
    <Screen edges={{ top: true }}>
      <View style={styles.header}>
        <View>
          <Text variant="caption" color={palette.textMuted}>Olá,</Text>
          <Text variant="title">{user?.displayName?.split(" ")[0] ?? "jogador"} 👋</Text>
        </View>
        <Pressable style={styles.iconBtn} onPress={() => router.push("/(tabs)/profile")}>
          <Ionicons name="person-circle-outline" size={28} color={palette.textMuted} />
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.list}>
          {[0, 1, 2].map((i) => <SkeletonCard key={i} />)}
        </View>
      ) : (
        <FlatList
          data={groups ?? []}
          keyExtractor={(g) => g.id}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 160 }]}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={palette.primary} />
          }
          ListEmptyComponent={
            <EmptyState
              icon="people-outline"
              title="Nenhum grupo ainda"
              subtitle="Crie um bolão e convide a galera, ou entre em um grupo com o código de convite."
            />
          }
          renderItem={({ item, index }) => (
            <FadeIn delay={index * 60}>
              <GroupCard group={item} onPress={() => router.push(`/group/${item.id}`)} />
            </FadeIn>
          )}
        />
      )}

      <View style={[styles.actions, { paddingBottom: insets.bottom + spacing.md }]}>
        <Button title="Entrar com código" variant="secondary" icon="enter-outline"
          onPress={() => setSheet("join")} style={{ flex: 1 }} />
        <Button title="Criar bolão" icon="add" onPress={() => setSheet("create")} style={{ flex: 1 }} />
      </View>

      <GroupSheet
        mode={sheet}
        onClose={() => setSheet(null)}
        onCreated={(id) => { setSheet(null); router.push(`/group/${id}`); }}
      />
    </Screen>
  );
}

function GroupCard({ group, onPress }: { group: GroupSummary; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && { opacity: 0.7 }}>
      <Card style={styles.groupCard}>
        <View style={styles.groupIcon}>
          <Ionicons name="trophy" size={22} color={palette.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="subtitle" numberOfLines={1}>{group.name}</Text>
          <Text variant="caption" color={palette.textMuted}>
            {group.memberCount} {group.memberCount === 1 ? "participante" : "participantes"}
            {group.role === "owner" ? " · você é o dono" : ""}
          </Text>
        </View>
        <View style={styles.groupPts}>
          <Text variant="heading" color={palette.primary}>{group.totalPoints}</Text>
          <Text variant="caption" color={palette.textMuted}>pts</Text>
        </View>
      </Card>
    </Pressable>
  );
}

function GroupSheet({
  mode, onClose, onCreated,
}: { mode: null | "create" | "join"; onClose: () => void; onCreated: (id: string) => void }) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const create = useCreateGroup();
  const join = useJoinGroup();
  const [value, setValue] = useState("");
  const [error, setError] = useState("");

  const visible = mode !== null;
  const isCreate = mode === "create";

  React.useEffect(() => {
    if (visible) { setValue(""); setError(""); }
  }, [visible, mode]);

  async function submit() {
    if (!value.trim() || !user) return;
    setError("");
    try {
      if (isCreate) {
        const id = await create.mutateAsync({
          uid: user.uid,
          displayName: user.displayName ?? "Você",
          name: value.trim(),
        });
        onCreated(id);
      } else {
        const res = await join.mutateAsync(value.trim());
        onCreated(res.groupId);
      }
    } catch (e) {
      setError(isCreate
        ? "Não foi possível criar o grupo."
        : "Código inválido ou grupo não encontrado.");
    }
  }

  const pending = create.isPending || join.isPending;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.xl }]}>
          <View style={styles.handle} />
          <Text variant="heading">{isCreate ? "Criar bolão" : "Entrar em um grupo"}</Text>
          <Text variant="body" color={palette.textMuted}>
            {isCreate
              ? "Dê um nome ao seu grupo. Você poderá convidar amigos por um código."
              : "Digite o código de convite que você recebeu."}
          </Text>
          <Input
            icon={isCreate ? "trophy-outline" : "key-outline"}
            placeholder={isCreate ? "Ex: Bolão da firma" : "Ex: ABC123"}
            autoCapitalize={isCreate ? "sentences" : "characters"}
            autoFocus
            value={value}
            onChangeText={setValue}
            error={error}
            maxLength={isCreate ? 40 : 6}
            onSubmitEditing={submit}
          />
          <Button
            title={isCreate ? "Criar e abrir" : "Entrar"}
            onPress={submit}
            loading={pending}
            disabled={!value.trim()}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.lg,
  },
  iconBtn: { padding: spacing.xs },
  list: { paddingHorizontal: spacing.xl, gap: spacing.md, flexGrow: 1 },
  groupCard: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  groupIcon: {
    width: 46, height: 46, borderRadius: radius.md,
    backgroundColor: palette.primaryGlow, alignItems: "center", justifyContent: "center",
  },
  groupPts: { alignItems: "center", minWidth: 44 },
  actions: {
    position: "absolute", left: 0, right: 0, bottom: 0,
    flexDirection: "row", gap: spacing.md,
    paddingHorizontal: spacing.xl, paddingTop: spacing.md,
    backgroundColor: palette.bg, borderTopWidth: 1, borderTopColor: palette.border,
  },
  backdrop: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.6)" },
  sheet: {
    backgroundColor: palette.bgElevated,
    borderTopLeftRadius: radius.xxl, borderTopRightRadius: radius.xxl,
    padding: spacing.xl, gap: spacing.md,
    borderTopWidth: 1, borderColor: palette.border,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: palette.border,
    alignSelf: "center", marginBottom: spacing.sm,
  },
});
