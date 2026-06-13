import React from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import { Text } from "./ui/Text";
import { palette, radius, spacing } from "@/lib/theme";

/** Pílula compacta de pontos (ranking, lista de palpites). */
export function PointsPill({ points, style }: { points: number; style?: ViewStyle }) {
  const earned = points > 0;
  return (
    <View
      style={[
        styles.pill,
        { backgroundColor: earned ? palette.primaryGlow : palette.surfaceAlt },
        style,
      ]}
    >
      <Text variant="label" color={earned ? palette.primary : palette.textMuted}>
        {points} pts
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    minWidth: 56,
    alignItems: "center",
  },
});
