import { Text } from "react-native";
import { Tabs } from "expo-router";
import type { ColorValue } from "react-native";
import { colors } from "@/lib/colors";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarStyle: { backgroundColor: colors.tabBar, borderTopColor: colors.divider },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: "bold" },
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Grupos",
          tabBarLabel: "Grupos",
          tabBarIcon: ({ color }) => <TabIcon emoji="🏆" color={color} />,
        }}
      />
      <Tabs.Screen
        name="matches"
        options={{
          title: "Jogos",
          tabBarLabel: "Jogos",
          tabBarIcon: ({ color }) => <TabIcon emoji="⚽" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Perfil",
          tabBarLabel: "Perfil",
          tabBarIcon: ({ color }) => <TabIcon emoji="👤" color={color} />,
        }}
      />
    </Tabs>
  );
}

function TabIcon({ emoji, color }: { emoji: string; color: ColorValue }) {
  return <Text style={{ fontSize: 20, color }}>{emoji}</Text>;
}
