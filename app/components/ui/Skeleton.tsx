import React, { useEffect, useRef } from "react";
import { Animated, ViewStyle, StyleSheet, View } from "react-native";
import { palette, radius, spacing } from "@/lib/theme";

export function Skeleton({ height = 16, width = "100%", style }: { height?: number; width?: ViewStyle["width"]; style?: ViewStyle }) {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        { height, width, opacity, backgroundColor: palette.surfaceAlt, borderRadius: radius.sm },
        style,
      ]}
    />
  );
}

export function SkeletonCard() {
  return (
    <View style={styles.card}>
      <Skeleton height={18} width="55%" />
      <Skeleton height={12} width="35%" />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
});
