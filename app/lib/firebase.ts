/**
 * Inicialização do Firebase.
 *
 * As chaves são lidas das variáveis de ambiente EXPO_PUBLIC_FIREBASE_*.
 * Copie o arquivo app/.env.example para app/.env.local e preencha os valores.
 * Obtenha as chaves em: Firebase Console → Projeto → Configurações → Seus apps → App Web.
 */
import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey:            process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? "",
  authDomain:        process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
  projectId:         process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? "",
  storageBucket:     process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
  appId:             process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? "",
};

// Evita inicializar múltiplas vezes no hot-reload do Metro.
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);
export const db   = getFirestore(app);
export const fns  = getFunctions(app, "us-central1");
