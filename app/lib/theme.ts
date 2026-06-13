/**
 * Design system do Bolão Copa.
 *
 * Tokens centrais: cores, espaçamento, tipografia, raios e sombras.
 * Tema escuro premium com acento verde (mesma identidade da tela "Pontos Base").
 */
import { Platform } from "react-native";

export const palette = {
  // Fundo / superfícies (verde-petróleo profundo)
  bg:          "#091410",
  bgElevated:  "#0E1F18",
  surface:     "#12271E",
  surfaceAlt:  "#16302479",
  border:      "#204534",
  borderSoft:  "#16302410",

  // Texto
  text:        "#F1F8F4",
  textMuted:   "#7FA593",
  textFaint:   "#4E6B5C",

  // Marca
  primary:     "#22C55E",
  primaryDark: "#16A34A",
  primaryGlow: "#22C55E33",

  // Cores dos bônus (iguais à foto)
  green:       "#34D17F",
  blue:        "#3B82F6",
  cyan:        "#22C7D9",
  purple:      "#A855F7",
  orange:      "#F59E0B",
  red:         "#EF4444",
  gold:        "#FFD166",
  silver:      "#CBD5E1",
  bronze:      "#E8A06A",

  white:       "#FFFFFF",
  black:       "#000000",
} as const;

export const bonus = {
  exact:       { color: palette.green,  label: "Placar Exato",      pts: 5 },
  winnerScore: { color: palette.blue,   label: "Placar Vencedor",   pts: 3 },
  goalDiff:    { color: palette.cyan,   label: "Diferença de Gols", pts: 2 },
  loserScore:  { color: palette.purple, label: "Placar Perdedor",   pts: 1 },
  rout:        { color: palette.orange, label: "Goleada (extra)",   pts: 1 },
} as const;

export const spacing = {
  xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28, xxxl: 40,
} as const;

export const radius = {
  sm: 8, md: 12, lg: 16, xl: 20, xxl: 28, pill: 999,
} as const;

export const font = {
  regular:   "Inter_400Regular",
  medium:    "Inter_500Medium",
  semibold:  "Inter_600SemiBold",
  bold:      "Inter_700Bold",
  extrabold: "Inter_800ExtraBold",
} as const;

export const type = {
  display:  { fontFamily: font.extrabold, fontSize: 34, lineHeight: 40, letterSpacing: -0.5 },
  title:    { fontFamily: font.bold,      fontSize: 26, lineHeight: 32, letterSpacing: -0.3 },
  heading:  { fontFamily: font.bold,      fontSize: 20, lineHeight: 26, letterSpacing: -0.2 },
  subtitle: { fontFamily: font.semibold,  fontSize: 17, lineHeight: 23 },
  body:     { fontFamily: font.regular,   fontSize: 15, lineHeight: 22 },
  bodyMed:  { fontFamily: font.medium,    fontSize: 15, lineHeight: 22 },
  label:    { fontFamily: font.semibold,  fontSize: 13, lineHeight: 18 },
  caption:  { fontFamily: font.medium,    fontSize: 12, lineHeight: 16 },
  mono:     { fontFamily: font.extrabold, fontSize: 28, lineHeight: 32 },
} as const;

export const shadow = {
  card: Platform.select({
    ios: {
      shadowColor: "#000",
      shadowOpacity: 0.35,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
    },
    android: { elevation: 6 },
    default: {},
  }),
  glow: Platform.select({
    ios: {
      shadowColor: palette.primary,
      shadowOpacity: 0.5,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 4 },
    },
    android: { elevation: 8 },
    default: {},
  }),
} as const;

/** Gradiente principal usado em cabeçalhos e botões. */
export const gradients = {
  brand:   ["#22C55E", "#0EA66B"] as const,
  header:  ["#12271E", "#091410"] as const,
  surface: ["#13291F", "#0E1F18"] as const,
  gold:    ["#FFE08A", "#F0A93E"] as const,
};

/** Cor determinística para avatar a partir de um texto. */
export function avatarColor(seed: string): string {
  const colors = [
    palette.green, palette.blue, palette.cyan,
    palette.purple, palette.orange, "#EC4899", "#14B8A6", "#F97316",
  ];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return colors[h % colors.length];
}

/** Iniciais a partir de um nome. */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
