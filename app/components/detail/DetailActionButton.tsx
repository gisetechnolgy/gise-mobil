import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import {
  DETAIL_ACCENT,
  DETAIL_ACTION_HEIGHT,
} from "../../../constants/mobileDetail";
import { AppText as Text } from "@/components/ui/AppText";

type Props = {
  label: string;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  primary?: boolean;
  flex?: number;
};

export default function DetailActionButton({
  label,
  onPress,
  icon,
  primary = true,
  flex = 1,
}: Props) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[
        styles.btn,
        { flex },
        primary ? styles.primary : styles.secondary,
      ]}
    >
      {icon ? (
        <Ionicons
          name={icon}
          size={18}
          color={primary ? "#FFFFFF" : DETAIL_ACCENT}
        />
      ) : null}
      <Text style={[styles.label, !primary && styles.labelSecondary]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export function DetailActionsRow({ children }: { children: React.ReactNode }) {
  return <View style={styles.row}>{children}</View>;
}

const styles = StyleSheet.create({
  row: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  btn: {
    minHeight: DETAIL_ACTION_HEIGHT,
    height: DETAIL_ACTION_HEIGHT,
    paddingHorizontal: 8,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  primary: {
    backgroundColor: DETAIL_ACCENT,
  },
  secondary: {
    backgroundColor: "#F3F4F6",
  },
  label: {
    fontFamily: "PoppinsSemiBold",
    fontSize: 12,
    color: "#FFFFFF",
  },
  labelSecondary: {
    color: DETAIL_ACCENT,
  },
});
