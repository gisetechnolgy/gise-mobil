import { StyleSheet, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  DETAIL_ACCENT,
  DETAIL_STICKY_BAR_PAD_BOTTOM,
  DETAIL_STICKY_BAR_PAD_TOP,
  DETAIL_STICKY_BAR_RADIUS,
  DETAIL_STICKY_BTN_HEIGHT,
  DETAIL_STICKY_BTN_RADIUS,
} from "../../../constants/mobileDetail";
import { AppText as Text } from "@/components/ui/AppText";

type Props = {
  label: string;
  subtitle?: string | null;
  onPress: () => void;
  disabled?: boolean;
};

export default function StickyCtaBar({
  label,
  subtitle,
  onPress,
  disabled,
}: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.bar,
        { paddingBottom: DETAIL_STICKY_BAR_PAD_BOTTOM + insets.bottom },
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onPress}
        disabled={disabled}
        style={[styles.btn, disabled && styles.btnDisabled]}
      >
        <Text style={styles.btnText}>{label}</Text>
        {subtitle ? <Text style={styles.btnSub}>{subtitle}</Text> : null}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 40,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: DETAIL_STICKY_BAR_RADIUS,
    borderTopRightRadius: DETAIL_STICKY_BAR_RADIUS,
    paddingHorizontal: 16,
    paddingTop: DETAIL_STICKY_BAR_PAD_TOP,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 10,
  },
  btn: {
    width: "100%",
    height: DETAIL_STICKY_BTN_HEIGHT,
    minHeight: DETAIL_STICKY_BTN_HEIGHT,
    borderRadius: DETAIL_STICKY_BTN_RADIUS,
    backgroundColor: DETAIL_ACCENT,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 0,
  },
  btnDisabled: {
    opacity: 0.55,
  },
  btnText: {
    color: "#FFFFFF",
    fontFamily: "PoppinsBold",
    fontSize: 15,
  },
  btnSub: {
    color: "rgba(255,255,255,0.92)",
    fontFamily: "PoppinsMedium",
    fontSize: 11,
    marginTop: 1,
  },
});
