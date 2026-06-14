import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Platform } from "react-native";
import { ActiveGroupProvider } from "@/hooks/useActiveGroup";
import { palette } from "@/lib/theme";

export default function TabsLayout() {
  return (
    <ActiveGroupProvider>
      <Tabs
        screenOptions={{
          tabBarStyle: {
            backgroundColor: palette.bgElevated,
            borderTopColor: palette.border,
            borderTopWidth: 1,
            height: Platform.OS === "ios" ? 88 : 64,
            paddingTop: 8,
          },
          tabBarActiveTintColor: palette.primary,
          tabBarInactiveTintColor: palette.textFaint,
          tabBarLabelStyle: { fontFamily: "Inter_600SemiBold", fontSize: 11 },
          headerStyle: { backgroundColor: palette.bg },
          headerTintColor: palette.text,
          headerTitleStyle: { fontFamily: "Inter_700Bold", fontSize: 20 },
          headerShadowVisible: false,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Ranking",
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? "podium" : "podium-outline"} size={24} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="matches"
          options={{
            title: "Jogos",
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? "football" : "football-outline"} size={24} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="mata-mata"
          options={{
            title: "Mata-mata",
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? "git-network" : "git-network-outline"} size={24} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Perfil",
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? "person" : "person-outline"} size={24} color={color} />
            ),
          }}
        />
      </Tabs>
    </ActiveGroupProvider>
  );
}
