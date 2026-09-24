import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import { GISE_WEB_URL } from "../lib/appConfig";
import { AppText as Text } from "@/components/ui/AppText";

export type InAppVideoSource = {
  youtubeId?: string | null;
  videoUrl?: string | null;
  title?: string | null;
};

/** YouTube Error 153 — https:// + bundleId / domain Referer şart */
function youtubeRefererOrigin(): string {
  const iosId = Constants.expoConfig?.ios?.bundleIdentifier?.trim();
  const androidId = Constants.expoConfig?.android?.package?.trim();
  const appId = Platform.OS === "ios" ? iosId : androidId;
  if (appId) return `https://${appId}`;
  return GISE_WEB_URL || "https://www.gisekibris.com";
}

function extractYoutubeId(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (/^[\w-]{11}$/.test(trimmed)) return trimmed;
  try {
    const u = new URL(
      trimmed.startsWith("http") ? trimmed : `https://${trimmed}`,
    );
    if (u.hostname.includes("youtu.be")) {
      return u.pathname.replace(/^\//, "").split("/")[0] || null;
    }
    if (
      u.hostname.includes("youtube.com") ||
      u.hostname.includes("youtube-nocookie.com")
    ) {
      const v = u.searchParams.get("v");
      if (v) return v;
      const embed = u.pathname.match(/\/(?:embed|shorts|live)\/([^/?#]+)/);
      if (embed?.[1]) return embed[1];
    }
  } catch {
    /* ignore */
  }
  return null;
}

function resolveYoutubeId(source: InAppVideoSource): string | null {
  if (source.youtubeId?.trim()) {
    return extractYoutubeId(source.youtubeId) || source.youtubeId.trim();
  }
  if (source.videoUrl?.trim()) return extractYoutubeId(source.videoUrl);
  return null;
}

type WebSource =
  | { uri: string; headers: Record<string, string> }
  | { html: string; baseUrl: string };

function buildWebSource(
  source: InAppVideoSource,
  referer: string,
): WebSource | null {
  const yt = resolveYoutubeId(source);
  if (yt) {
    const qs = new URLSearchParams({
      playsinline: "1",
      rel: "0",
      modestbranding: "1",
      controls: "1",
      fs: "1",
    });
    return {
      uri: `https://www.youtube.com/embed/${encodeURIComponent(yt)}?${qs.toString()}`,
      headers: { Referer: referer },
    };
  }

  const url = source.videoUrl?.trim();
  if (!url) return null;
  const safe = url.replace(/"/g, "&quot;").replace(/</g, "&lt;");
  return {
    baseUrl: referer,
    html: `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/><style>*{margin:0;padding:0}html,body{height:100%;background:#000;display:flex;align-items:center;justify-content:center}video{width:100%;height:100%;object-fit:contain}</style></head><body><video src="${safe}" controls playsinline webkit-playsinline preload="metadata"></video></body></html>`,
  };
}

type Props = {
  visible: boolean;
  source: InAppVideoSource | null;
  onClose: () => void;
  closeLabel?: string;
};

/** Destek / FAQ videoları — uygulama içi oynatıcı */
export default function InAppVideoModal({
  visible,
  source,
  onClose,
  closeLabel = "Kapat",
}: Props) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const referer = useMemo(() => youtubeRefererOrigin(), []);
  const webSource = useMemo(
    () => (source ? buildWebSource(source, referer) : null),
    [source, referer],
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View
        style={[
          styles.root,
          { paddingTop: insets.top, paddingBottom: insets.bottom },
        ]}
      >
        <View style={styles.topBar}>
          <Text style={styles.title} numberOfLines={1}>
            {source?.title?.trim() || "Video"}
          </Text>
          <Pressable
            onPress={onClose}
            style={styles.closeBtn}
            hitSlop={10}
            accessibilityLabel={closeLabel}
          >
            <Ionicons name="close" size={22} color="#FFF" />
          </Pressable>
        </View>

        <View style={styles.player}>
          {loading && webSource ? (
            <View style={styles.loading}>
              <ActivityIndicator color="#FFF" />
            </View>
          ) : null}
          {webSource ? (
            <WebView
              key={"uri" in webSource ? webSource.uri : source?.videoUrl || "v"}
              originWhitelist={["*"]}
              source={webSource}
              style={styles.webview}
              onLoadStart={() => setLoading(true)}
              onLoadEnd={() => setLoading(false)}
              allowsFullscreenVideo
              allowsInlineMediaPlayback
              mediaPlaybackRequiresUserAction={false}
              javaScriptEnabled
              domStorageEnabled
              sharedCookiesEnabled
              thirdPartyCookiesEnabled
              mixedContentMode="always"
              setSupportMultipleWindows={false}
              nestedScrollEnabled
              {...(Platform.OS === "android"
                ? { androidLayerType: "hardware" as const }
                : {})}
            />
          ) : (
            <View style={styles.loading}>
              <Text style={styles.empty}>Video bulunamadı</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#000",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 12,
  },
  title: {
    flex: 1,
    color: "#FFF",
    fontFamily: "PoppinsSemiBold",
    fontSize: 16,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  player: {
    flex: 1,
    backgroundColor: "#000",
  },
  webview: {
    flex: 1,
    backgroundColor: "#000",
  },
  loading: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#000",
  },
  empty: {
    color: "rgba(255,255,255,0.7)",
    fontFamily: "PoppinsRegular",
    fontSize: 14,
  },
});
