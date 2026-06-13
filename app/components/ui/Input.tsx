import React, { useState } from "react";
import {
  View, TextInput, TextInputProps, StyleSheet,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "./Text";
import { palette, radius, spacing, type } from "@/lib/theme";

interface Props extends TextInputProps {
  label?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  error?: string;
}

export function Input({ label, icon, error, style, secureTextEntry, ...rest }: Props) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(!!secureTextEntry);

  return (
    <View style={styles.wrap}>
      {label && <Text variant="label" color={palette.textMuted} style={styles.label}>{label}</Text>}
      <View
        style={[
          styles.field,
          focused && styles.focused,
          error && styles.errored,
        ]}
      >
        {icon && (
          <Ionicons
            name={icon}
            size={18}
            color={focused ? palette.primary : palette.textMuted}
            style={{ marginRight: spacing.sm }}
          />
        )}
        <TextInput
          style={[styles.input, style]}
          placeholderTextColor={palette.textFaint}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          secureTextEntry={hidden}
          {...rest}
        />
        {secureTextEntry && (
          <Pressable onPress={() => setHidden((h) => !h)} hitSlop={10}>
            <Ionicons
              name={hidden ? "eye-outline" : "eye-off-outline"}
              size={20}
              color={palette.textMuted}
            />
          </Pressable>
        )}
      </View>
      {error ? <Text variant="caption" color={palette.red} style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  label: { marginLeft: spacing.xs },
  field: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: palette.bgElevated,
    borderWidth: 1.5,
    borderColor: palette.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    height: 52,
  },
  focused: { borderColor: palette.primary },
  errored: { borderColor: palette.red },
  input: {
    flex: 1,
    color: palette.text,
    ...type.bodyMed,
    paddingVertical: 0,
  },
  error: { marginLeft: spacing.xs },
});
