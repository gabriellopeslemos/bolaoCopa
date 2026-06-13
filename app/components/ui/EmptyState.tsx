import React from "react";
import { View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "./Text";
import { palette, spacing, radius } from "@/lib/theme";

interface Props {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}

export function EmptyState({ icon, title, subtitle, children }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.iconCircle}>
        <Ionicons name={icon} size={36} color={palette.primary} />
      </View>
      <Text variant="heading" center>{title}</Text>
      {subtitle && (
        <Text variant="body" color={palette.textMuted} center style={styles.sub}>
          {subtitle}
        </Text>
      )}
      {children && <View style={styles.actions}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: radius.pill,
    backgroundColor: palette.primaryGlow,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  sub: { maxWidth: 280 },
  actions: { marginTop: spacing.lg, width: "100%", maxWidth: 320, gap: spacing.sm },
});
