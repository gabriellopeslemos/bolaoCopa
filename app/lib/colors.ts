/**
 * Alias de compatibilidade. Use `palette` / `theme` de "@/lib/theme".
 */
import { palette } from "./theme";

export const colors = {
  bg:          palette.bg,
  card:        palette.surface,
  cardBorder:  palette.border,
  text:        palette.text,
  textMuted:   palette.textMuted,
  primary:     palette.primary,
  green:       palette.green,
  teal:        palette.cyan,
  purple:      palette.purple,
  orange:      palette.orange,
  red:         palette.red,
  divider:     palette.border,
  tabBar:      palette.bgElevated,
  inputBg:     palette.bgElevated,
  inputBorder: palette.border,
} as const;

export const bonusColor: Record<string, string> = {
  exact:       palette.green,
  winnerScore: palette.blue,
  goalDiff:    palette.cyan,
  loserScore:  palette.purple,
  rout:        palette.orange,
};
