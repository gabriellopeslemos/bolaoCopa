import React, { useEffect, useState } from "react";
import { View, StyleSheet, Alert, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getIdTokenResult } from "firebase/auth";
import { signOut } from "@/lib/auth";
import { useAuth } from "@/hooks/useAuth";
import { Screen, Text, Card, Button, Avatar } from "@/components/ui";
import { palette, spacing, radius } from "@/lib/theme";

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

      <Card padded={false} style={styles.menu}>
        <Row icon="football-outline" label="Ver todos os jogos" onPress={() => router.push("/(tabs)/matches")} />
        <Divider />
        <Row icon="trophy-outline" label="Meus grupos" onPress={() => router.push("/(tabs)")} />
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
  hero: { alignItems: "center", marginBottom: spacing.xxl },
  menu: { overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.lg },
  divider: { height: 1, backgroundColor: palette.border, marginLeft: spacing.lg + 22 + spacing.md },
});
