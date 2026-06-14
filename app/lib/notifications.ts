/**
 * Registro de push notifications (Expo) — suporte à feature 3 (lembretes).
 *
 * Salva o Expo push token no doc do usuário (`users/{uid}.expoPushToken`) para
 * que a Cloud Function `betReminders` possa enviar o lembrete ~2h antes do jogo
 * a quem ainda não palpitou.
 *
 * No-op na web e fora de um device físico (emuladores não recebem push).
 */
import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";

// Como exibir notificações recebidas com o app em primeiro plano.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function resolveProjectId(): string | undefined {
  const fromExtra = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
  const fromEas = (Constants as { easConfig?: { projectId?: string } }).easConfig?.projectId;
  return fromExtra ?? fromEas;
}

export async function registerPushToken(uid: string): Promise<void> {
  if (Platform.OS === "web" || !Device.isDevice) return;

  const current = await Notifications.getPermissionsAsync();
  let granted = current.granted;
  if (!granted && current.canAskAgain) {
    granted = (await Notifications.requestPermissionsAsync()).granted;
  }
  if (!granted) return;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Lembretes de palpite",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  try {
    const projectId = resolveProjectId();
    const { data: token } = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    await setDoc(
      doc(db, "users", uid),
      { expoPushToken: token, pushUpdatedAt: serverTimestamp() },
      { merge: true }
    );
  } catch (err) {
    // Sem projectId (EAS) ou sem rede: não bloqueia o app.
    console.warn("[push] não foi possível registrar o token de notificação:", err);
  }
}
