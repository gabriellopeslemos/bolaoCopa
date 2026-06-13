import React from "react";
import { View, StyleSheet } from "react-native";
import { Text } from "./Text";
import { avatarColor, initials, palette } from "@/lib/theme";

interface Props {
  name: string;
  size?: number;
  ring?: boolean;
}

export function Avatar({ name, size = 44, ring }: Props) {
  const bg = avatarColor(name);
  return (
    <View
      style={[
        styles.base,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: bg + "33",
          borderColor: ring ? palette.primary : bg,
          borderWidth: ring ? 2 : 1.5,
        },
      ]}
    >
      <Text
        style={{ fontSize: size * 0.36, color: bg, fontFamily: "Inter_700Bold" }}
      >
        {initials(name)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: "center", justifyContent: "center" },
});
