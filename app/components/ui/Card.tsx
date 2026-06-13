import React from "react";
import { View, ViewStyle, StyleSheet } from "react-native";
import { palette, radius, spacing, shadow } from "@/lib/theme";

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
  padded?: boolean;
  highlight?: boolean;
  elevated?: boolean;
}

export function Card({ children, style, padded = true, highlight, elevated }: Props) {
  return (
    <View
      style={[
        styles.card,
        padded && styles.padded,
        highlight && styles.highlight,
        elevated && (shadow.card as ViewStyle),
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.border,
  },
  padded: { padding: spacing.lg },
  highlight: {
    borderColor: palette.primary,
    backgroundColor: palette.bgElevated,
  },
});
