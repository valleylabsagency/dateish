import React from "react";
import { Text, TextProps } from "react-native";

/**
 * UI text: buttons, labels, bubbles, headers that must NOT reflow.
 * Locks OS font scaling.
 */
export function AppText(props: TextProps) {
  return (
    <Text {...props} allowFontScaling={false} maxFontSizeMultiplier={1.0} />
  );
}

/**
 * Reading text: paragraphs where scaling is OK.
 * Allows scaling, but caps it.
 */
export function ReadableText(props: TextProps) {
  return <Text {...props} allowFontScaling maxFontSizeMultiplier={1.25} />;
}
