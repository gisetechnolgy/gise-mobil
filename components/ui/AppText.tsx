import React, { forwardRef } from "react";
import {
  StyleSheet,
  Text as RNText,
  type TextProps,
  type TextStyle,
} from "react-native";

function resolvePoppinsFamily(style: TextProps["style"]): string {
  const flattened = StyleSheet.flatten(style) ?? {};
  const explicitFamily = flattened.fontFamily ?? "";

  if (explicitFamily.includes("PoppinsBold")) return "PoppinsBold";
  if (explicitFamily.includes("PoppinsSemiBold")) return "PoppinsSemiBold";
  if (explicitFamily.includes("PoppinsMedium")) return "PoppinsMedium";
  if (explicitFamily.includes("PoppinsRegular")) return "PoppinsRegular";
  if (explicitFamily.includes("Poppins_700Bold")) return "PoppinsBold";
  if (explicitFamily.includes("Poppins_600SemiBold")) return "PoppinsSemiBold";
  if (explicitFamily.includes("Poppins_500Medium")) return "PoppinsMedium";
  if (explicitFamily.includes("Poppins_400Regular")) return "PoppinsRegular";

  const weightRaw = flattened.fontWeight;
  let weight = 400;
  if (typeof weightRaw === "number") {
    weight = weightRaw;
  } else if (typeof weightRaw === "string") {
    if (weightRaw === "bold") weight = 700;
    else if (weightRaw === "normal") weight = 400;
    else {
      const parsed = parseInt(weightRaw, 10);
      weight = Number.isFinite(parsed) ? parsed : 400;
    }
  }

  if (weight >= 700) return "PoppinsBold";
  if (weight >= 600) return "PoppinsSemiBold";
  if (weight >= 500) return "PoppinsMedium";
  return "PoppinsRegular";
}

export const AppText = forwardRef<RNText, TextProps>(function AppText(
  { style, ...rest },
  ref,
) {
  const family = resolvePoppinsFamily(style);
  const normalizedStyle: TextStyle = {
    fontFamily: family,
    fontWeight: "normal",
  };

  return <RNText ref={ref} {...rest} style={[style, normalizedStyle]} />;
});

