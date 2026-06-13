import { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import { useAuth } from "@/hooks/useAuth";
import { colors } from "@/lib/colors";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;
    const inAuth = segments[0] === "(auth)";
    if (!user && !inAuth) {
      router.replace("/(auth)/login");
    } else if (user && inAuth) {
      router.replace("/(tabs)");
    }
  }, [user, loading, segments, router]);

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthGuard>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.bg },
            headerTintColor: colors.text,
            headerTitleStyle: { fontWeight: "bold" },
            contentStyle: { backgroundColor: colors.bg },
            headerShadowVisible: false,
          }}
        >
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="group/[id]"
            options={{ title: "Grupo", headerBackTitle: "" }}
          />
          <Stack.Screen
            name="group/bet/[matchId]"
            options={{ title: "Palpite", headerBackTitle: "" }}
          />
          <Stack.Screen
            name="group/match/[matchId]"
            options={{ title: "Partida", headerBackTitle: "" }}
          />
          <Stack.Screen
            name="admin"
            options={{ title: "Administração", headerBackTitle: "" }}
          />
        </Stack>
      </AuthGuard>
    </QueryClientProvider>
  );
}
