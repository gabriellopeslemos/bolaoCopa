import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { useRouter } from "expo-router";
import { signOut } from "@/lib/auth";
import { useAuth } from "@/hooks/useAuth";
import { colors } from "@/lib/colors";

export default function ProfileScreen() {
  const { user } = useAuth();
  const router = useRouter();

  async function handleSignOut() {
    Alert.alert("Sair", "Tem certeza que deseja sair?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Sair",
        style: "destructive",
        onPress: async () => {
          await signOut();
          router.replace("/(auth)/login");
        },
      },
    ]);
  }

  return (
    <View style={styles.container}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {(user?.displayName ?? user?.email ?? "?")[0].toUpperCase()}
        </Text>
      </View>
      <Text style={styles.name}>{user?.displayName ?? "Usuário"}</Text>
      <Text style={styles.email}>{user?.email}</Text>

      <View style={styles.section}>
        <TouchableOpacity
          style={styles.row}
          onPress={() => router.push("/admin")}
        >
          <Text style={styles.rowLabel}>⚙️  Administração</Text>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleSignOut}>
        <Text style={styles.logoutText}>Sair da conta</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: colors.bg,
    padding: 24, alignItems: "center",
  },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: colors.primary,
    justifyContent: "center", alignItems: "center",
    marginTop: 24, marginBottom: 16,
  },
  avatarText: { color: "#fff", fontSize: 32, fontWeight: "bold" },
  name: { color: colors.text, fontSize: 20, fontWeight: "bold", marginBottom: 4 },
  email: { color: colors.textMuted, fontSize: 14, marginBottom: 32 },
  section: {
    width: "100%",
    backgroundColor: colors.card, borderRadius: 12,
    borderWidth: 1, borderColor: colors.cardBorder, marginBottom: 24,
  },
  row: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", padding: 16,
  },
  rowLabel: { color: colors.text, fontSize: 15 },
  arrow: { color: colors.textMuted, fontSize: 18 },
  logoutBtn: {
    width: "100%",
    borderColor: colors.red, borderWidth: 1,
    borderRadius: 10, padding: 14, alignItems: "center",
  },
  logoutText: { color: colors.red, fontWeight: "bold", fontSize: 15 },
});
