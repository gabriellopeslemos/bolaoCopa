/** Paleta de cores do tema escuro do Bolão Copa. */
export const colors = {
  bg:          "#0D1B2A",
  card:        "#112236",
  cardBorder:  "#1E3A5F",
  text:        "#FFFFFF",
  textMuted:   "#8BA3BB",
  primary:     "#2979FF",
  green:       "#4CAF50",
  teal:        "#26C6DA",
  purple:      "#9C27B0",
  orange:      "#FFA726",
  red:         "#EF5350",
  divider:     "#1E3A5F",
  tabBar:      "#0A1520",
  inputBg:     "#0A1520",
  inputBorder: "#1E3A5F",
} as const;

/** Cor do bônus por tipo. */
export const bonusColor: Record<string, string> = {
  exact:       colors.green,
  winnerScore: colors.primary,
  goalDiff:    colors.teal,
  loserScore:  colors.purple,
  rout:        colors.orange,
};
