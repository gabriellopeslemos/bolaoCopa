/**
 * Inicialização do Firebase.
 *
 * As chaves são lidas das variáveis EXPO_PUBLIC_FIREBASE_*.
 * Copie app/.env.example para app/.env.local e preencha os valores.
 *
 * O login é persistido com AsyncStorage (sem isso o usuário seria
 * deslogado a cada reinício do app no React Native).
 */
import { initializeApp, getApps, getApp } from "firebase/app";
import {
  initializeAuth,
  getAuth,
  connectAuthEmulator,
  // getReactNativePersistence existe apenas na entrada React Native do SDK;
  // o Metro resolve a versão correta em runtime.
  // @ts-ignore
  getReactNativePersistence,
  type Auth,
} from "firebase/auth";
import {
  getFirestore,
  connectFirestoreEmulator,
} from "firebase/firestore";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";
import AsyncStorage from "@react-native-async-storage/async-storage";

const firebaseConfig = {
  apiKey:            process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? "",
  authDomain:        process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
  projectId:         process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? "",
  storageBucket:     process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
  appId:             process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? "",
};

export const isConfigured = !!firebaseConfig.apiKey && !!firebaseConfig.projectId;

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

let _auth: Auth;
try {
  _auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch {
  // Já inicializado (hot-reload) — reaproveita a instância existente.
  _auth = getAuth(app);
}

export const auth = _auth;
export const db = getFirestore(app);
export const fns = getFunctions(app, "us-central1");

// Conecta nos emuladores quando EXPO_PUBLIC_USE_EMULATOR=1 (desenvolvimento local).
// Usa 127.0.0.1 por padrão: no Windows "localhost" pode resolver para IPv6 (::1),
// enquanto os emuladores do Firebase escutam apenas em IPv4 (127.0.0.1).
if (process.env.EXPO_PUBLIC_USE_EMULATOR === "1") {
  const host = process.env.EXPO_PUBLIC_EMULATOR_HOST ?? "127.0.0.1";
  // Cada conexão é independente: se um emulador não estiver no ar (ex.: subiu
  // apenas o firestore), os demais continuam funcionando em vez de tudo falhar.
  try {
    connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true });
  } catch (e) {
    console.warn("[firebase] Auth emulator não conectado:", e);
  }
  try {
    connectFirestoreEmulator(db, host, 8080);
  } catch (e) {
    console.warn("[firebase] Firestore emulator não conectado:", e);
  }
  try {
    connectFunctionsEmulator(fns, host, 5001);
  } catch (e) {
    console.warn("[firebase] Functions emulator não conectado:", e);
  }
  console.info(`[firebase] Emuladores ativos em ${host} (auth:9099, firestore:8080, functions:5001)`);
}
