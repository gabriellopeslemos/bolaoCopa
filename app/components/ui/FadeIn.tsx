import React, { useEffect, useRef } from "react";
import { Animated, ViewStyle } from "react-native";

interface Props {
  children: React.ReactNode;
  delay?: number;
  offset?: number;
  style?: ViewStyle;
}

/** Entrada suave (fade + slide) usando o driver nativo. */
export function FadeIn({ children, delay = 0, offset = 12, style }: Props) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: 380,
      delay,
      useNativeDriver: true,
    }).start();
  }, [progress, delay]);

  return (
    <Animated.View
      style={[
        {
          opacity: progress,
          transform: [
            {
              translateY: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [offset, 0],
              }),
            },
          ],
        },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
}
