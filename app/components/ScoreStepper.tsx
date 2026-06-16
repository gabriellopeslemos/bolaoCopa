import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Text } from "./ui/Text";
import { TeamCrest } from "./TeamCrest";
import { palette, radius, spacing } from "@/lib/theme";
import type { TeamInfo } from "@/lib/types";

interface Props {
  team: TeamInfo;
  value: number;
  onChange: (n: number) => void;
  disabled?: boolean;
  align?: "left" | "right";
}

export function ScoreStepper({ team, value, onChange, disabled, align = "left" }: Props) {
  function bump(delta: number) {
    const next = Math.max(0, Math.min(20, value + delta));
    if (next !== value) {
      Haptics.selectionAsync().catch(() => {});
      onChange(next);
    }
  }

  return (
    <View style={styles.wrap}>
      <View style={[styles.teamRow, align === "right" && styles.teamRowRight]}>
        <TeamCrest team={team} size={36} />
        <Text variant="bodyMed" numberOfLines={1} style={styles.name}>{team.name}</Text>
      </View>

      <View style={styles.stepper}>
        <StepBtn icon="remove" onPress={() => bump(-1)} disabled={disabled || value <= 0} />
        <View style={styles.valueBox}>
          <Text style={styles.value}>{value}</Text>
        </View>
        <StepBtn icon="add" onPress={() => bump(1)} disabled={disabled || value >= 20} primary />
      </View>
    </View>
  );
}

function StepBtn({
  icon, onPress, disabled, primary,
}: { icon: "add" | "remove"; onPress: () => void; disabled?: boolean; primary?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.btn,
        primary && styles.btnPrimary,
        pressed && !disabled && styles.btnPressed,
        disabled && styles.btnDisabled,
      ]}
      hitSlop={6}
    >
      <Ionicons name={icon} size={22} color={primary ? palette.black : palette.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: "center", gap: spacing.md },
  teamRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, maxWidth: "100%" },
  teamRowRight: { flexDirection: "row-reverse" },
  name: { flexShrink: 1 },
  stepper: { alignItems: "center", gap: spacing.sm },
  valueBox: {
    minWidth: 64, height: 64, borderRadius: radius.md,  // 0px — sharp corners
    backgroundColor: palette.bgElevated, borderWidth: 1, borderColor: palette.border,
    alignItems: "center", justifyContent: "center",
  },
  value: { fontWeight: "900", fontSize: 48, color: palette.text },  // scoreLg from design system
  btn: {
    width: 44, height: 44, borderRadius: radius.xs,  // 0px — sharp corners
    backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border,
    alignItems: "center", justifyContent: "center",
  },
  btnPrimary: { backgroundColor: palette.primary, borderColor: palette.primary },
  btnPressed: { opacity: 0.7, transform: [{ scale: 0.94 }] },
  btnDisabled: { opacity: 0.4 },
});
