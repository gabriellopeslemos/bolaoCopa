import { useEffect } from "react";
import { registerPushToken } from "@/lib/notifications";

/** Registra o Expo push token do usuário logado (para os lembretes de palpite). */
export function usePushToken(uid: string | undefined) {
  useEffect(() => {
    if (!uid) return;
    registerPushToken(uid).catch(() => {});
  }, [uid]);
}
