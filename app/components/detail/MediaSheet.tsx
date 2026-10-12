import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText as Text } from "@/components/ui/AppText";
import { DETAIL_ACCENT } from "../../../constants/mobileDetail";
import { useTranslation } from "../../context/_LocaleContext";
import { RemoteCardImage } from "../_RemoteCardImage";

export type MediaImage = { uri: string; label: string };

function resolveYoutubeId(raw: string | null | undefined): string | null {
  const value = raw?.trim();
  if (!value) return null;
  if (/^[\w-]{11}$/.test(value)) return value;
  const match =
    value.match(/[?&]v=([\w-]{11})/) ||
    value.match(/youtu\.be\/([\w-]{11})/) ||
    value.match(/\/(?:embed|shorts)\/([\w-]{11})/);
  return match ? match[1] : null;
}

/** Aynı adresli görselleri eler, boşları atar. */
export function buildMediaImages(
  items: { uri: string | null | undefined; label: string }[],
): MediaImage[] {
  const seen = new Set<string>();
  const out: MediaImage[] = [];
  for (const { uri, label } of items) {
    if (!uri || seen.has(uri)) continue;
    seen.add(uri);
    out.push({ uri, label });
  }
  return out;
}

export function hasMedia(youtube: string | null | undefined, images: MediaImage[]) {
  return Boolean(youtube?.trim()) || images.length > 0;
}

export default function MediaSheet({
  visible,
  onClose,
  youtube,
  images,
}: {
  visible: boolean;
  onClose: () => void;
  youtube?: string | null;
  images: MediaImage[];
}) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [zoomed, setZoomed] = useState<MediaImage | null>(null);

  const youtubeId = resolveYoutubeId(youtube);
  const youtubeUrl = youtube?.trim()
    ? youtube.trim().startsWith("http")
      ? youtube.trim()
      : `https://www.youtube.com/watch?v=${youtube.trim()}`
    : null;
  const grid = images.length > 1;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={zoomed ? () => setZoomed(null) : onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>{t("media")}</Text>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              accessibilityLabel={t("close")}
            >
              <Ionicons name="close" size={20} color="#111827" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.body}>
            {youtubeUrl ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t("mediaVideo")}</Text>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => void Linking.openURL(youtubeUrl)}
                  style={styles.videoFrame}
                >
                  {youtubeId ? (
                    <RemoteCardImage
                      uri={`https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`}
                      style={StyleSheet.absoluteFill}
                      contentFit="cover"
                    />
                  ) : null}
                  <View style={styles.playIcon}>
                    <Ionicons name="play" size={30} color="#fff" />
                  </View>
                </TouchableOpacity>
              </View>
            ) : null}

            {images.length ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t("mediaImages")}</Text>
                <View style={grid ? styles.grid : undefined}>
                  {images.map((image, index) => {
                    const wide = grid && index === 0 && images.length % 2 === 1;
                    return (
                      <TouchableOpacity
                        key={image.uri}
                        activeOpacity={0.85}
                        onPress={() => setZoomed(image)}
                        style={[
                          styles.tile,
                          grid && !wide ? styles.tileHalf : styles.tileWide,
                        ]}
                      >
                        <RemoteCardImage
                          uri={image.uri}
                          style={StyleSheet.absoluteFill}
                          contentFit="contain"
                        />
                        <View style={styles.badge}>
                          <Ionicons name="expand-outline" size={12} color="#fff" />
                          <Text style={styles.badgeText} numberOfLines={1}>
                            {image.label}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ) : null}
          </ScrollView>
        </View>

        {zoomed ? (
          <View style={styles.viewer}>
            <RemoteCardImage
              uri={zoomed.uri}
              style={StyleSheet.absoluteFill}
              contentFit="contain"
            />
            <TouchableOpacity
              onPress={() => setZoomed(null)}
              style={[styles.viewerClose, { top: insets.top + 12 }]}
              accessibilityLabel={t("close")}
            >
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  sheet: {
    maxHeight: "88%",
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D1D5DB",
    marginTop: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#EFEFEF",
  },
  title: { fontFamily: "PoppinsBold", fontSize: 17, color: "#0F2137" },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  body: { padding: 16, gap: 18 },
  section: { gap: 8 },
  sectionTitle: {
    fontFamily: "PoppinsSemiBold",
    fontSize: 14,
    color: "#6B7280",
  },
  videoFrame: {
    width: "100%",
    aspectRatio: 16 / 9,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
  },
  playIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: DETAIL_ACCENT,
    alignItems: "center",
    justifyContent: "center",
    paddingLeft: 3,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 10,
  },
  tile: {
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F7F7F8",
  },
  tileHalf: { width: "48.5%", aspectRatio: 4 / 3 },
  tileWide: { width: "100%", aspectRatio: 16 / 9 },
  badge: {
    position: "absolute",
    right: 8,
    bottom: 8,
    maxWidth: "85%",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(17,17,17,0.72)",
  },
  badgeText: { fontFamily: "PoppinsSemiBold", fontSize: 11, color: "#fff" },
  viewer: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "#000",
  },
  viewerClose: {
    position: "absolute",
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
});
