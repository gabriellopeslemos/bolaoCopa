import React from "react";
import { Text as RNText, TextProps, StyleSheet, TextStyle } from "react-native";
import { type, palette } from "@/lib/theme";

type Variant = keyof typeof type;

interface Props extends TextProps {
  variant?: Variant;
  color?: string;
  center?: boolean;
  children: React.ReactNode;
}

export function Text({ variant = "body", color, center, style, children, ...rest }: Props) {
  return (
    <RNText
      style={[
        type[variant] as TextStyle,
        { color: color ?? palette.text },
        center && styles.center,
        style,
      ]}
      {...rest}
    >
      {children}
    </RNText>
  );
}

const styles = StyleSheet.create({
  center: { textAlign: "center" },
});
