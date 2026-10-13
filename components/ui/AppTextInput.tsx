import { forwardRef } from "react";
import {
  StyleSheet,
  TextInput as RNTextInput,
  type TextInputProps,
  type TextStyle,
} from "react-native";

/**
 * iOS + özel font: letterSpacing tanımsızken placeholder harfleri
 * açılıyor ("S o r u n u z u…"). Varsayılan 0; bilinçli değer korunur.
 */
export const AppTextInput = forwardRef<RNTextInput, TextInputProps>(
  function AppTextInput({ style, ...rest }, ref) {
    const flat = StyleSheet.flatten(style) as TextStyle | undefined;
    return (
      <RNTextInput
        ref={ref}
        {...rest}
        style={[style, { letterSpacing: flat?.letterSpacing ?? 0 }]}
      />
    );
  },
);
