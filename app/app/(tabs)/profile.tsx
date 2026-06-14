import React, { useEffect, useState } from "react";
import {
  View, StyleSheet, Alert, Pressable, Modal, FlatList,
  KeyboardAvoidingView, Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getIdTokenResult } from "firebase/auth";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { signOut } from "@/lib/auth";
import { useAuth } from "@/hooks/useAuth";
import { useActiveGroup } from "@/hooks/useActiveGroup";
import { useCreateGroup, useJoinGroup } from "@/lib/data";
import { Screen, Text, Card, Button, Avatar, Input } from "@/components/ui";
import { palette, spacing, radius } from "@/lib/theme";
import type { GroupSummary } from "@/lib/types";

export default function ProfileScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!user) return;
    getIdTokenResult(user)
      .then((r) => setIsAdmin(r.claims.admin === true))
      .catch(() => {});
  }, [user]);

  function handleSignOut() {
    Alert.alert("Sair da conta", "Tem certeza que deseja sair?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Sair", style: "destructive", onPress: () => signOut() },
    ]);
  }

  const name = user?.displayName ?? "Jogador";

  return (
    <Screen edges={{ top: true, bottom: true }} style={styles.screen}>
      <View style={styles.hero}>
        <Avatar name={name} size={88} ring />
        <Text variant="title" center style={{ marginTop: spacing.md }}>{name}</Text>
        <Text variant="body" color={palette.textMuted}>{user?.email}</Text>
      </View>

      <Text variant="label" color={palette.textMuted} style={styles.sectionLabel}>Bolão ativo</Text>
      <GroupSwitcher />

      <Card padded={false} style={styles.menu}>
        <Row icon="football-outline" label="Ver todos os jogos" onPress={() => router.push("/(tabs)/matches")} />
        {isAdmin && (
          <>
            <Divider />
            <Row icon="settings-outline" label="Administração" tint={palette.cyan}
              onPress={() => router.push("/admin")} />
          </>
        )}
      </Card>

      <View style={{ flex: 1 }} />
      <Button title="Sair da conta" variant="danger" icon="log-out-outline" onPress={handleSignOut} />
      <Text variant="caption" color={palette.textFaint} center style={{ marginTop: spacing.md }}>
        Bolão Copa · v1.0.0
      </Text>
    </Screen>
  );
}

/* ------------------------------------------------------------------ */
/* Seletor de grupo (dropdown) + criar/entrar                          */
/* ------------------------------------------------------------------ */

function GroupSwitcher() {
  const { groups, activeGroup, activeGroupId, setActiveGroupId } = useActiveGroup();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Pressable onPress={() => { Haptics.selectionAsync().catch(() => {}); setOpen(true); }}
        style={({ pressed }) => [styles.switcher, pressed && { opacity: 0.7 }]}>
        <View style={styles.switcherIcon}>
          <Ionicons name="trophy" size={20} color={palette.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="bodyMed" numberOfLines={1}>
            {activeGroup?.name ?? "Nenhum grupo"}
          </Text>
          <Text variant="caption" color={palette.textMuted}>
            {groups.length > 0
              ? `${groups.length} ${groups.length === 1 ? "bolão" : "bolões"} · toque para trocar`
              : "Crie ou entre em um bolão"}
          </Text>
        </View>
        <Ionicons name="chevron-down" size={20} color={palette.textMuted} />
      </Pressable>

      <GroupPickerModal
        visible={open}
        groups={groups}
        activeGroupId={activeGroupId}
        onSelect={(id) => { setActiveGroupId(id); setOpen(false); }}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

function GroupPickerModal({
  visible, groups, activeGroupId, onSelect, onClose,
}: {
  visible: boolean;
  groups: GroupSummary[];
  activeGroupId?: string;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { setActiveGroupId, refetch } = useActiveGroup();
  const create = useCreateGroup();
  const join = useJoinGroup();
  const { user } = useAuth();

  const [form, setForm] = useState<null | "create" | "join">(null);
  const [value, setValue] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (visible) { setForm(null); setValue(""); setError(""); }
  }, [visible]);

  async function submit() {
    if (!value.trim() || !user) return;
    setError("");
    try {
      let id: string;
      if (form === "create") {
        id = await create.mutateAsync({
          uid: user.uid,
          displayName: user.displayName ?? "Você",
          name: value.trim(),
        });
      } else {
        const res = await join.mutateAsync(value.trim());
        id = res.groupId;
      }
      // Aguarda a lista atualizar antes de selecionar (evita o reset p/ o primeiro grupo).
      await refetch();
      setActiveGroupId(id);
      onClose();
    } catch {
      setError(form === "create"
        ? "Não foi possível criar o grupo."
        : "Código inválido ou grupo não encontrado.");
    }
  }

  const pending = create.isPending || join.isPending;
  const isForm = form !== null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.xl }]}>
          <View style={styles.handle} />

          {isForm ? (
            <>
              <Pressable onPress={() => setForm(null)} hitSlop={8} style={styles.backRow}>
                <Ionicons name="chevron-back" size={18} color={palette.textMuted} />
                <Text variant="label" color={palette.textMuted}>Voltar</Text>
              </Pressable>
              <Text variant="heading">{form === "create" ? "Criar bolão" : "Entrar em um grupo"}</Text>
              <Text variant="body" color={palette.textMuted}>
                {form === "create"
                  ? "Dê um nome ao seu grupo. Você poderá convidar amigos por um código."
                  : "Digite o código de convite que você recebeu."}
              </Text>
              <Input
                icon={form === "create" ? "trophy-outline" : "key-outline"}
                placeholder={form === "create" ? "Ex: Bolão da firma" : "Ex: ABC123"}
                autoCapitalize={form === "create" ? "sentences" : "characters"}
                autoFocus
                value={value}
                onChangeText={setValue}
                error={error}
                maxLength={form === "create" ? 40 : 6}
                onSubmitEditing={submit}
              />
              <Button
                title={form === "create" ? "Criar e selecionar" : "Entrar"}
                onPress={submit}
                loading={pending}
                disabled={!value.trim()}
              />
            </>
          ) : (
            <>
              <Text variant="heading">Seus bolões</Text>
              <FlatList
                data={groups}
                keyExtractor={(g) => g.id}
                style={{ maxHeight: 320 }}
                ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
                ListEmptyComponent={
                  <Text variant="body" color={palette.textMuted} style={{ paddingVertical: spacing.md }}>
                    Você ainda não participa de nenhum bolão.
                  </Text>
                }
                renderItem={({ item }) => {
                  const active = item.id === activeGroupId;
                  return (
                    <Pressable onPress={() => onSelect(item.id)}
                      style={({ pressed }) => [styles.groupRow, active && styles.groupRowActive, pressed && { opacity: 0.7 }]}>
                      <View style={styles.switcherIcon}>
                        <Ionicons name="trophy" size={18} color={palette.primary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text variant="bodyMed" numberOfLines={1}>{item.name}</Text>
                        <Text variant="caption" color={palette.textMuted}>
                          {item.memberCount} {item.memberCount === 1 ? "participante" : "participantes"} · {item.totalPoints} pts
                        </Text>
                      </View>
                      {active && <Ionicons name="checkmark-circle" size={22} color={palette.primary} />}
                    </Pressable>
                  );
                }}
              />
              <View style={styles.formActions}>
                <Button title="Entrar com código" variant="secondary" icon="enter-outline"
                  onPress={() => setForm("join")} style={{ flex: 1 }} />
                <Button title="Criar bolão" icon="add"
                  onPress={() => setForm("create")} style={{ flex: 1 }} />
              </View>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */

function Row({
  icon, label, onPress, tint,
}: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; tint?: string }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}>
      <Ionicons name={icon} size={22} color={tint ?? palette.textMuted} />
      <Text variant="bodyMed" style={{ flex: 1 }} color={tint ?? palette.text}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={palette.textFaint} />
    </Pressable>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  screen: { paddingHorizontal: spacing.xl, paddingTop: spacing.xl },
  hero: { alignItems: "center", marginBottom: spacing.xl },
  sectionLabel: { marginBottom: spacing.sm },
  switcher: {
    flexDirection: "row", alignItems: "center", gap: spacing.md,
    backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border,
    borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.xl,
  },
  switcherIcon: {
    width: 40, height: 40, borderRadius: radius.md,
    backgroundColor: palette.primaryGlow, alignItems: "center", justifyContent: "center",
  },
  menu: { overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.lg },
  divider: { height: 1, backgroundColor: palette.border, marginLeft: spacing.lg + 22 + spacing.md },
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
  backRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs, marginBottom: -spacing.xs },
  groupRow: {
    flexDirection: "row", alignItems: "center", gap: spacing.md,
    padding: spacing.md, borderRadius: radius.md,
    borderWidth: 1, borderColor: palette.border, backgroundColor: palette.surface,
  },
  groupRowActive: { borderColor: palette.primary, backgroundColor: palette.primaryGlow },
  formActions: { flexDirection: "row", gap: spacing.md, marginTop: spacing.sm },
});
