import React from "react";
import { View, Image, StyleSheet } from "react-native";
import { Text } from "./ui/Text";
import { avatarColor, initials, palette } from "@/lib/theme";
import type { TeamInfo } from "@/lib/types";

export function TeamCrest({ team, size = 40 }: { team: TeamInfo; size?: number }) {
  if (team.flag) {
    return (
      <Image
        source={{ uri: team.flag }}
        style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: palette.surfaceAlt }}
      />
    );
  }
  const bg = avatarColor(team.name);
  return (
    <View
      style={[
        styles.fallback,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: bg + "2A", borderColor: bg + "66" },
      ]}
    >
      <Text style={{ fontSize: size * 0.34, color: bg, fontFamily: "Inter_700Bold" }}>
        {initials(team.name)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: { alignItems: "center", justifyContent: "center", borderWidth: 1.5 },
});
