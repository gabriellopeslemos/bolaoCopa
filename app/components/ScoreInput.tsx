/**
 * Componente de entrada de placar com dois campos numéricos (mandante e visitante).
 * Exibe preview da pontuação potencial ao lado.
 */
import React from "react";
import { View, Text, TextInput, StyleSheet } from "react-native";
import { maxPossiblePoints, type Score } from "@bolao/scoring";
import { colors } from "@/lib/colors";

interface Props {
  homeTeam: string;
  awayTeam: string;
  value: Score;
  onChange: (s: Score) => void;
  disabled?: boolean;
}

export function ScoreInput({ homeTeam, awayTeam, value, onChange, disabled }: Props) {
  const maxPts = maxPossiblePoints(value);

  function handleChange(field: keyof Score, text: string) {
    const n = parseInt(text, 10);
    if (!isNaN(n) && n >= 0 && n <= 20) {
      onChange({ ...value, [field]: n });
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={styles.team} numberOfLines={1}>{homeTeam}</Text>
        <TextInput
          style={[styles.input, disabled && styles.inputDisabled]}
          keyboardType="number-pad"
          maxLength={2}
          value={String(value.home)}
          onChangeText={(t) => handleChange("home", t)}
          editable={!disabled}
          selectTextOnFocus
        />
        <Text style={styles.separator}>×</Text>
        <TextInput
          style={[styles.input, disabled && styles.inputDisabled]}
          keyboardType="number-pad"
          maxLength={2}
          value={String(value.away)}
          onChangeText={(t) => handleChange("away", t)}
          editable={!disabled}
          selectTextOnFocus
        />
        <Text style={styles.team} numberOfLines={1}>{awayTeam}</Text>
      </View>
      {!disabled && (
        <Text style={styles.maxPts}>
          Até <Text style={styles.maxPtsValue}>{maxPts} pts</Text>
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center", gap: 6 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  team: {
    color: colors.text,
    fontSize: 14,
    flex: 1,
    textAlign: "center",
    fontWeight: "600",
  },
  input: {
    backgroundColor: colors.inputBg,
    borderColor: colors.inputBorder,
    borderWidth: 1,
    borderRadius: 8,
    color: colors.text,
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
    width: 52,
    height: 52,
  },
  inputDisabled: {
    opacity: 0.6,
  },
  separator: {
    color: colors.textMuted,
    fontSize: 18,
  },
  maxPts: {
    color: colors.textMuted,
    fontSize: 12,
  },
  maxPtsValue: {
    color: colors.green,
    fontWeight: "bold",
  },
});
