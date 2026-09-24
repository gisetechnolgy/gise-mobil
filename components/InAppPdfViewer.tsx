import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  View,
} from "react-native";
import { WebView } from "react-native-webview";
import { AppColors } from "../constants/colors";

type Props = {
  url: string;
};

/**
 * Kurumsal sunum PDF — web’deki iframe gibi uygulama içinde.
 * iOS WKWebView PDF’i native gösterir; Android için Google gview.
 */
export default function InAppPdfViewer({ url }: Props) {
  const [loading, setLoading] = useState(true);

  const sourceUri = useMemo(() => {
    if (Platform.OS === "android") {
      return `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(url)}`;
    }
    return url;
  }, [url]);

  return (
    <View style={styles.wrap}>
      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={AppColors.heading} />
        </View>
      ) : null}
      <WebView
        source={{ uri: sourceUri }}
        style={styles.webview}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        startInLoadingState
        originWhitelist={["*"]}
        allowFileAccess
        mixedContentMode="always"
        setSupportMultipleWindows={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    minHeight: 480,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: AppColors.cardBg,
  },
  webview: {
    flex: 1,
    backgroundColor: AppColors.cardBg,
  },
  loading: {
    ...StyleSheet.absoluteFill,
    zIndex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: AppColors.cardBg,
  },
});
