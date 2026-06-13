import React, { useRef } from "react";
import {
  Pressable, Animated, StyleSheet, ActivityIndicator,
  ViewStyle, View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "./Text";
import { palette, radius, spacing, gradients, shadow } from "@/lib/theme";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "lg" | "md" | "sm";

interface Props {
  title: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: ViewStyle;
  haptic?: boolean;
}

export function Button({
  title, onPress, variant = "primary", size = "lg",
  loading, disabled, icon, style, haptic = true,
}: Props) {
  const scale = useRef(new Animated.Value(1)).current;
  const isDisabled = disabled || loading;

  const animate = (to: number) =>
    Animated.spring(scale, { toValue: to, useNativeDriver: true, speed: 50, bounciness: 4 }).start();

  function handlePress() {
    if (isDisabled) return;
    if (haptic) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    onPress();
  }

  const h = size === "lg" ? 54 : size === "md" ? 46 : 38;
  const fontVariant = size === "sm" ? "label" : "subtitle";

  const content = (
    <View style={styles.row}>
      {loading ? (
        <ActivityIndicator color={variant === "primary" ? palette.black : palette.primary} />
      ) : (
        <>
          {icon && (
            <Ionicons
              name={icon}
              size={size === "sm" ? 16 : 20}
              color={textColor(variant)}
              style={{ marginRight: spacing.sm }}
            />
          )}
          <Text variant={fontVariant} color={textColor(variant)}>{title}</Text>
        </>
      )}
    </View>
  );

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <Pressable
        onPress={handlePress}
        onPressIn={() => animate(0.96)}
        onPressOut={() => animate(1)}
        disabled={isDisabled}
        style={{ opacity: isDisabled ? 0.5 : 1 }}
      >
        {variant === "primary" ? (
          <LinearGradient
            colors={gradients.brand}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.base, { height: h }, shadow.glow as ViewStyle]}
          >
            {content}
          </LinearGradient>
        ) : (
          <View style={[styles.base, { height: h }, variantStyle(variant)]}>{content}</View>
        )}
      </Pressable>
    </Animated.View>
  );
}

function textColor(v: Variant): string {
  if (v === "primary") return palette.black;
  if (v === "danger") return palette.red;
  return palette.text;
}

function variantStyle(v: Variant): ViewStyle {
  switch (v) {
    case "secondary":
      return { backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border };
    case "danger":
      return { backgroundColor: "transparent", borderWidth: 1, borderColor: palette.red };
    default:
      return { backgroundColor: "transparent" };
  }
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
  },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
});
