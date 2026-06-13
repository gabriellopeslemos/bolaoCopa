import React, { useState } from "react";
import {
  View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView,
} from "react-native";
import { Link } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { register } from "@/lib/auth";
import { Screen, Text, Input, Button } from "@/components/ui";
import { authError } from "./login";
import { palette, spacing, radius, gradients } from "@/lib/theme";

export default function RegisterScreen() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleRegister() {
    if (!name.trim() || !email || !password) {
      setError("Preencha todos os campos.");
      return;
    }
    if (password.length < 6) {
      setError("A senha deve ter no mínimo 6 caracteres.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await register(email.trim(), password, name.trim());
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
              <Ionicons name="person-add" size={30} color={palette.black} />
            </LinearGradient>
            <Text variant="title" center>Criar conta</Text>
            <Text variant="body" color={palette.textMuted} center>
              Leva menos de um minuto
            </Text>
          </View>

          <View style={styles.form}>
            {error ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={18} color={palette.red} />
                <Text variant="caption" color={palette.red} style={{ flex: 1 }}>{error}</Text>
              </View>
            ) : null}

            <Input label="Nome" icon="person-outline" placeholder="Seu nome"
              value={name} onChangeText={setName} />
            <Input label="E-mail" icon="mail-outline" placeholder="voce@email.com"
              autoCapitalize="none" keyboardType="email-address"
              value={email} onChangeText={setEmail} />
            <Input label="Senha" icon="lock-closed-outline" placeholder="Mínimo 6 caracteres"
              secureTextEntry value={password} onChangeText={setPassword} />

            <Button title="Cadastrar" onPress={handleRegister} loading={loading}
              style={{ marginTop: spacing.sm }} />
          </View>

          <View style={styles.footer}>
            <Text variant="body" color={palette.textMuted}>Já tem conta? </Text>
            <Link href="/(auth)/login">
              <Text variant="bodyMed" color={palette.primary}>Entrar</Text>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flexGrow: 1, justifyContent: "center", padding: spacing.xl, gap: spacing.xxl },
  hero: { alignItems: "center", gap: spacing.xs },
  logo: {
    width: 68, height: 68, borderRadius: radius.xl,
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
