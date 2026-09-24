import { Image, ImageContentFit, type ImageProps } from "expo-image";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import { AppColors } from "../../constants/colors";

type Props = {
  uri: string | null;
  recyclingKey?: string;
  contentFit?: ImageContentFit;
  priority?: ImageProps["priority"];
  style?: StyleProp<ViewStyle>;
  className?: string;
  /** Uzak görsel yoksa veya yükleme hata verirse gösterilecek yerel görsel. */
  fallbackSource?: ImageProps["source"];
};

export function RemoteCardImage({
  uri,
  recyclingKey,
  contentFit = "cover",
  priority = "normal",
  style,
  className,
  fallbackSource,
}: Props) {
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setReady(false);
    setFailed(false);
  }, [uri]);

  const showRemote = Boolean(uri) && !failed;
  const showSpinner = showRemote && !ready;

  return (
    <View className={className} style={[style, styles.frame]}>
      <View style={[StyleSheet.absoluteFill, styles.placeholder]} />

      {showRemote ? (
        <Image
          source={{ uri: uri! }}
          recyclingKey={recyclingKey ?? uri!}
          style={StyleSheet.absoluteFill}
          contentFit={contentFit}
          cachePolicy="memory-disk"
          priority={priority}
          transition={0}
          onLoad={() => setReady(true)}
          onError={() => setFailed(true)}
        />
      ) : fallbackSource ? (
        <Image
          source={fallbackSource}
          style={StyleSheet.absoluteFill}
          contentFit={contentFit}
          recyclingKey={recyclingKey ?? "fallback-image"}
          cachePolicy="memory-disk"
          priority={priority}
        />
      ) : null}

      {showSpinner ? (
        <View style={styles.spinnerWrap} pointerEvents="none">
          <ActivityIndicator size="small" color={AppColors.accent} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    overflow: "hidden",
  },
  placeholder: {
    backgroundColor: "#E8ECF0",
  },
  spinnerWrap: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
  },
});
