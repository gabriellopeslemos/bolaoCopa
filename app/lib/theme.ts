/**
 * Design system do Bolão Copa — "Asfalto" (Street/Graphite)
 *
 * Tokens: cores graphite asphalt, street orange brand,
 * tipografia Bebas Neue + Barlow Condensed (via Anton + system fonts em React Native),
 * espaçamento 4px grid, raios 0px (sharp), sombras hard-offset.
 *
 * Paleta inspirada em futebol de rua — superfícies de asfalto,
 * iluminadas por um flash de street orange e accent spectrum.
 */
import { Platform } from "react-native";

export const palette = {
  // — Asphalt / concrete surfaces — graphite
  asphalt950:  "#080808",  // deepest void / page bg
  asphalt900:  "#0f0f0f",  // page background
  asphalt850:  "#161616",  // elevated background
  asphalt800:  "#1c1c1c",  // card surface
  asphalt750:  "#242424",  // alt surface / inset
  asphalt700:  "#2e2e2e",  // strong border
  asphalt650:  "#3a3a3a",  // hairline on light areas

  // — Chalk / ink — warm, not cool
  ink0:        "#F2EDE4",  // primary text — chalk white
  ink1:        "#D6D0C8",  // secondary text
  ink2:        "#8C8880",  // muted text
  ink3:        "#5C5854",  // faint / disabled

  // — Street Orange — primary brand
  streetOrange:   "#FF4500",
  streetOrange2:  "#CC3600",
  orangeWarm:     "#FF6B1A",

  // — Street accent spectrum (ponto bonuses)
  neonGreen:    "#39FF14",
  streetYellow: "#FFD200",
  electricBlue: "#0057FF",
  hotPink:      "#FF1464",
  cyan:         "#00D4F5",
  violet:       "#9B59FF",
  chalk:        "#EDE8DF",
  red:          "#FF2020",

  // — Medals
  gold:   "#FFC83D",
  silver: "#C8D4E8",
  bronze: "#E08A4E",

  white: "#FFFFFF",
  black: "#000000",

  // — Semantic aliases
  bg:            "#0f0f0f",     // asphalt-900
  bgElevated:    "#161616",     // asphalt-850
  surface:       "#1c1c1c",     // asphalt-800
  surfaceAlt:    "#242424",     // asphalt-750
  border:        "#222222",     // default border
  borderStrong:  "#2e2e2e",     // asphalt-700

  // — Text
  text:           "#F2EDE4",    // ink-0
  textSecondary:  "#D6D0C8",    // ink-1
  textMuted:      "#8C8880",    // ink-2
  textFaint:      "#5C5854",    // ink-3
  textOnPrimary:  "#0a0a0a",    // near-black on orange
  textOnAccent:   "#0a0a0a",

  // — Brand / primary
  primary:        "#FF4500",    // street-orange
  primaryStrong:  "#CC3600",    // street-orange-2
  primarySoft:    "rgba(255, 69, 0, 0.14)",
  primaryRing:    "rgba(255, 69, 0, 0.50)",

  // — Status / feedback
  success:  "#39FF14",
  info:     "#0057FF",
  warning:  "#FFD200",
  danger:   "#FF2020",
  live:     "#FF2020",

  // — Legacy aliases (for compatibility)
  primaryDark: "#CC3600",
  primaryGlow: "rgba(255, 69, 0, 0.20)",
  green:       "#39FF14",
  blue:        "#0057FF",
  purple:      "#9B59FF",
  orange:      "#FF6B1A",
} as const;

export const bonus = {
  exact:       { color: palette.neonGreen,  label: "Placar Exato",      pts: 5 },
  winnerScore: { color: palette.electricBlue, label: "Placar Vencedor",   pts: 3 },
  goalDiff:    { color: palette.cyan,       label: "Diferença de Gols", pts: 2 },
  loserScore:  { color: palette.violet,     label: "Placar Perdedor",   pts: 1 },
  rout:        { color: palette.hotPink,    label: "Goleada (extra)",   pts: 1 },
} as const;

export const spacing = {
  xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28, xxxl: 40,
} as const;

// Radius — industrial sharp corners everywhere except pills/toggles
export const radius = {
  xs: 0, sm: 0, md: 0, lg: 0, xl: 0, xxl: 0, pill: 999,
} as const;

// Typography: Bebas Neue (display/scores) + Barlow Condensed (UI)
export const font = {
  regular:     "BarlowCondensed_400Regular",
  medium:      "BarlowCondensed_500Medium",
  semibold:    "BarlowCondensed_600SemiBold",
  bold:        "BarlowCondensed_700Bold",
  extrabold:   "BarlowCondensed_800ExtraBold",
  display:     "BebasNeue_400Regular",
  displayBold: "BebasNeue_400Regular",
  sansBold:    "BarlowCondensed_700Bold",
} as const;

// Typography scale — Bebas Neue (display) + Barlow Condensed (UI)
export const type = {
  // Bebas Neue — display / scores / page titles
  display:  { fontFamily: font.display,   fontSize: 44, lineHeight: 48, letterSpacing: 1 },
  title:    { fontFamily: font.display,   fontSize: 34, lineHeight: 36, letterSpacing: 2 },
  heading:  { fontFamily: font.display,   fontSize: 22, lineHeight: 26, letterSpacing: 1 },
  subtitle: { fontFamily: font.semibold,  fontSize: 18, lineHeight: 22, letterSpacing: 0 },
  // Barlow Condensed — UI (body, labels)
  body:     { fontFamily: font.regular,   fontSize: 15, lineHeight: 20 },
  bodyMed:  { fontFamily: font.medium,    fontSize: 15, lineHeight: 20 },
  label:    { fontFamily: font.bold,      fontSize: 13, lineHeight: 18, letterSpacing: 1.5, textTransform: "uppercase" as const },
  caption:  { fontFamily: font.medium,    fontSize: 12, lineHeight: 16 },
  // Numeric display (scoreboards & points) — Bebas Neue
  score:    { fontFamily: font.display,   fontSize: 34, lineHeight: 38, letterSpacing: 2 },
  scoreLg:  { fontFamily: font.display,   fontSize: 48, lineHeight: 52, letterSpacing: 2 },
  points:   { fontFamily: font.display,   fontSize: 30, lineHeight: 34, letterSpacing: 1 },
} as const;

// Shadows — hard offset (screen-print style) instead of soft blurs
export const shadow = {
  sm: Platform.select({
    ios: {
      shadowColor: "#000",
      shadowOpacity: 0.85,
      shadowRadius: 0,
      shadowOffset: { width: 2, height: 2 },
    },
    android: { elevation: 3 },
    default: {},
  }),
  card: Platform.select({
    ios: {
      shadowColor: "#000",
      shadowOpacity: 0.90,
      shadowRadius: 0,
      shadowOffset: { width: 4, height: 4 },
    },
    android: { elevation: 6 },
    default: {},
  }),
  pop: Platform.select({
    ios: {
      shadowColor: palette.streetOrange,
      shadowOpacity: 0.9,
      shadowRadius: 0,
      shadowOffset: { width: 6, height: 6 },
    },
    android: { elevation: 8 },
    default: {},
  }),
  glowPrimary: Platform.select({
    ios: {
      shadowColor: palette.streetOrange2,
      shadowOpacity: 0.9,
      shadowRadius: 0,
      shadowOffset: { width: 3, height: 3 },
    },
    android: { elevation: 6 },
    default: {},
  }),
} as const;

/** Gradientes — street/asphalt identity */
export const gradients = {
  brand:   [palette.streetOrange, palette.streetOrange2] as const,  // street orange
  header:  [palette.asphalt800, palette.asphalt900] as const,       // graphite asphalt
  surface: [palette.asphalt850, palette.asphalt800] as const,
  gold:    [palette.gold, palette.bronze] as const,
};

/** Cor determinística para avatar a partir de um texto — street accent spectrum */
export function avatarColor(seed: string): string {
  const colors = [
    palette.neonGreen,
    palette.electricBlue,
    palette.cyan,
    palette.violet,
    palette.hotPink,
    palette.streetYellow,
    palette.streetOrange,
    palette.orange,
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
