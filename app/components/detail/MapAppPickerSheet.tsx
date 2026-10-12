import { Ionicons } from "@expo/vector-icons";
import { Modal, Pressable, StyleSheet, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DETAIL_ACCENT } from "../../../constants/mobileDetail";
import type { MapAppOption } from "../../../lib/mapApps";
import { useTranslation } from "../../context/_LocaleContext";
import { AppText as Text } from "@/components/ui/AppText";

type Props = {
  visible: boolean;
  apps: MapAppOption[];
  onSelect: (app: MapAppOption) => void;
  onClose: () => void;
};

export default function MapAppPickerSheet({
  visible,
  apps,
  onSelect,
  onClose,
}: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View
          style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 12) }]}
        >
          <View style={styles.handle} />
          <Text style={styles.title}>{t("chooseMapApp")}</Text>
          {apps.map((app) => (
            <TouchableOpacity
              key={app.id}
              style={styles.row}
              activeOpacity={0.7}
              onPress={() => onSelect(app)}
            >
              <Ionicons name="navigate-outline" size={20} color={DETAIL_ACCENT} />
              <Text style={styles.rowText}>{app.label}</Text>
              <Ionicons name="chevron-forward" size={18} color="#B0B0B0" />
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={styles.cancel}
            activeOpacity={0.7}
            onPress={onClose}
          >
            <Text style={styles.cancelText}>{t("cancel")}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E0E0E0",
    marginBottom: 12,
  },
  title: {
    fontFamily: "PoppinsSemiBold",
    fontSize: 15,
    color: "#2D2D2D",
    marginBottom: 6,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#EBEBEB",
  },
  rowText: {
    flex: 1,
    fontFamily: "PoppinsMedium",
    fontSize: 15,
    color: "#2D2D2D",
  },
  cancel: {
    marginTop: 10,
    paddingVertical: 14,
    alignItems: "center",
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
  },
  cancelText: {
    fontFamily: "PoppinsSemiBold",
    fontSize: 15,
    color: DETAIL_ACCENT,
  },
});
