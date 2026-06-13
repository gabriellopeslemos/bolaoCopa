import React, { useState } from "react";
import {
  View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView,
} from "react-native";
import { Link } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { signIn } from "@/lib/auth";
import { Screen, Text, Input, Button } from "@/components/ui";
import { palette, spacing, radius, gradients } from "@/lib/theme";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin() {
    if (!email || !password) {
      setError("Preencha e-mail e senha.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await signIn(email.trim(), password);
    } catch (e) {
      setError(authError(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen edges={{ top: true, bottom: true }}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <LinearGradient colors={gradients.brand} style={styles.logo}>
              <Ionicons name="trophy" size={34} color={palette.black} />
            </LinearGradient>
            <Text variant="display" center>Bolão Copa</Text>
            <Text variant="body" color={palette.textMuted} center>
              Dispute palpites com a galera e suba no ranking
            </Text>
          </View>

          <View style={styles.form}>
            {error ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={18} color={palette.red} />
                <Text variant="caption" color={palette.red} style={{ flex: 1 }}>{error}</Text>
              </View>
            ) : null}

            <Input
              label="E-mail"
              icon="mail-outline"
              placeholder="voce@email.com"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
            <Input
              label="Senha"
              icon="lock-closed-outline"
              placeholder="••••••••"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />

            <Button title="Entrar" onPress={handleLogin} loading={loading} style={{ marginTop: spacing.sm }} />
          </View>

          <View style={styles.footer}>
            <Text variant="body" color={palette.textMuted}>Ainda não tem conta? </Text>
            <Link href="/(auth)/register">
              <Text variant="bodyMed" color={palette.primary}>Cadastre-se</Text>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

export function authError(e: unknown): string {
  if (e && typeof e === "object" && "code" in e) {
    const code = (e as { code: string }).code;
    const map: Record<string, string> = {
      "auth/invalid-credential": "E-mail ou senha incorretos.",
      "auth/user-not-found": "Usuário não encontrado.",
      "auth/wrong-password": "Senha incorreta.",
      "auth/too-many-requests": "Muitas tentativas. Tente mais tarde.",
      "auth/invalid-email": "E-mail inválido.",
      "auth/email-already-in-use": "Este e-mail já está cadastrado.",
      "auth/weak-password": "Senha muito fraca (mínimo 6 caracteres).",
      "auth/network-request-failed": "Sem conexão. Verifique sua internet.",
    };
    return map[code] ?? "Não foi possível concluir. Tente novamente.";
  }
  return "Não foi possível concluir. Tente novamente.";
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flexGrow: 1, justifyContent: "center", padding: spacing.xl, gap: spacing.xxl },
  hero: { alignItems: "center", gap: spacing.sm },
  logo: {
    width: 76, height: 76, borderRadius: radius.xl,
    alignItems: "center", justifyContent: "center", marginBottom: spacing.sm,
  },
  form: { gap: spacing.lg },
  errorBox: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    backgroundColor: palette.red + "1A", padding: spacing.md,
    borderRadius: radius.md, borderWidth: 1, borderColor: palette.red + "44",
  },
  footer: { flexDirection: "row", justifyContent: "center", alignItems: "center" },
});
