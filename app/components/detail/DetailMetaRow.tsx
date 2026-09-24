import { Ionicons } from "@expo/vector-icons";
import {
  Linking,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { DETAIL_ICON } from "../../../constants/mobileDetail";
import { AppText as Text } from "@/components/ui/AppText";

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  href?: string | null;
  onPress?: () => void;
};

export default function DetailMetaRow({ icon, label, href, onPress }: Props) {
  if (!label) return null;

  const content = (
    <View style={styles.row}>
      <View style={styles.iconSlot}>
        <Ionicons name={icon} size={15} color={DETAIL_ICON} />
      </View>
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  if (href) {
    return (
      <TouchableOpacity
        onPress={() => void Linking.openURL(href)}
        activeOpacity={0.7}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minWidth: 0,
  },
  iconSlot: {
    width: 18,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  label: {
    flex: 1,
    fontFamily: "PoppinsSemiBold",
    fontSize: 13,
    lineHeight: 17,
    color: DETAIL_ICON,
  },
});
