import React from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { palette } from "@/lib/theme";

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
  /** Aplica padding seguro no topo (telas sem header). */
  edges?: { top?: boolean; bottom?: boolean };
}

export function Screen({ children, style, edges }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.base,
        {
          paddingTop: edges?.top ? insets.top : 0,
          paddingBottom: edges?.bottom ? insets.bottom : 0,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: { flex: 1, backgroundColor: palette.bg },
});
