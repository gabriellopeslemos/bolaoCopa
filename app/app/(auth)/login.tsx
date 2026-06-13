import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView,
  Platform, ScrollView,
} from "react-native";
import { Link } from "expo-router";
import { signIn } from "@/lib/auth";
import { colors } from "@/lib/colors";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin() {
    if (!email || !password) return;
    setLoading(true);
    setError("");
    try {
      await signIn(email.trim(), password);
    } catch (e: unknown) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.logo}>Bolão Copa</Text>
        <Text style={styles.subtitle}>Entre na sua conta</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TextInput
          style={styles.input}
          placeholder="E-mail"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Senha"
          placeholderTextColor={colors.textMuted}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>Entrar</Text>
          )}
        </TouchableOpacity>

        <Link href="/(auth)/register" asChild>
          <TouchableOpacity style={styles.link}>
            <Text style={styles.linkText}>Não tem conta? Cadastre-se</Text>
          </TouchableOpacity>
        </Link>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function errorMessage(e: unknown): string {
  if (e && typeof e === "object" && "code" in e) {
    const code = (e as { code: string }).code;
    if (code === "auth/invalid-credential") return "E-mail ou senha incorretos.";
    if (code === "auth/user-not-found") return "Usuário não encontrado.";
    if (code === "auth/wrong-password") return "Senha incorreta.";
    if (code === "auth/too-many-requests") return "Muitas tentativas. Tente mais tarde.";
  }
  return "Erro ao entrar. Verifique seus dados.";
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  container: {
    flexGrow: 1, justifyContent: "center",
    padding: 24, gap: 16,
  },
  logo: {
    fontSize: 36, fontWeight: "bold",
    color: colors.primary, textAlign: "center",
  },
  subtitle: {
    color: colors.textMuted, textAlign: "center",
    fontSize: 16, marginBottom: 8,
  },
  input: {
    backgroundColor: colors.inputBg,
    borderColor: colors.inputBorder,
    borderWidth: 1, borderRadius: 10,
    color: colors.text, padding: 14, fontSize: 16,
  },
  btn: {
    backgroundColor: colors.primary,
    borderRadius: 10, padding: 16,
    alignItems: "center", marginTop: 4,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  link: { alignItems: "center", marginTop: 8 },
  linkText: { color: colors.primary, fontSize: 14 },
  error: {
    color: colors.red, textAlign: "center",
    fontSize: 14, backgroundColor: "#2A0A0A",
    padding: 10, borderRadius: 8,
  },
});
