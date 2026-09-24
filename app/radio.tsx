import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useMemo } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  View
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { AppColors } from "../constants/colors";
import { useLiveRadioPlayback } from "../hooks/useLiveRadioPlayback";
import { useRadioLiveMeta } from "../hooks/useRadioLiveMeta";
import { useIsTablet } from "../lib/responsive";
import { AppText as Text } from "@/components/ui/AppText";

const fallbackImage = require("../assets/photos/cageee.webp");

const TEXT = AppColors.cardText;
const TEXT_MUTED = "rgba(0,0,0,0.55)";
const TEXT_SOFT = "rgba(0,0,0,0.72)";

export default function RadioDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isTablet = useIsTablet();
  const { width: screenW } = Dimensions.get("window");
  const artMax = isTablet
    ? Math.min(screenW * 0.72, 620)
    : Math.min(screenW - 48, 340);

  const { loading, radioName, title, artist, coverUrl, streamUrl } =
    useRadioLiveMeta();
  const { isPlaying, isBuffering, toggle } = useLiveRadioPlayback(streamUrl);

  const heroSource = useMemo(() => {
    if (coverUrl) return { uri: coverUrl } as const;
    return fallbackImage;
  }, [coverUrl]);

  const topSlot = isTablet ? 68 : 44;
  const framePadding = isTablet ? 14 : 8;
  const frameRadius = isTablet ? 28 : 18;
  const imageRadius = isTablet ? 22 : 12;
  const metaMaxWidth = isTablet ? 680 : 400;
  const liveDotSize = isTablet ? 12 : 6;
  const playDiscSize = isTablet ? 128 : 80;

  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: AppColors.background }]}
      edges={["top", "left", "right", "bottom"]}
    >
      <StatusBar style="dark" />
      <Stack.Screen options={{ headerShown: false }} />

      <View
        style={[
          styles.topBar,
          isTablet && {
            paddingHorizontal: 26,
            paddingBottom: 16,
            paddingTop: 8,
          },
        ]}
      >
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={({ pressed }) => [
            styles.backBtn,
            isTablet && { width: topSlot, height: topSlot },
            { opacity: pressed ? 0.65 : 1 },
          ]}
        >
          <Ionicons
            name="chevron-down"
            size={isTablet ? 36 : 26}
            color={TEXT}
          />
        </Pressable>
        <Text style={[styles.topTitle, isTablet && styles.topTitleTablet]}>
          Radyo
        </Text>
        <View style={{ width: topSlot }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom: Math.max(insets.bottom, isTablet ? 44 : 24),
            paddingHorizontal: isTablet ? 44 : 24,
            paddingTop: isTablet ? 16 : 4,
          },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View
          style={[
            styles.artFrame,
            {
              width: artMax + framePadding * 2,
              padding: framePadding,
              borderRadius: frameRadius,
            },
          ]}
        >
          <View
            style={[
              styles.artInner,
              {
                width: artMax,
                height: artMax,
                borderRadius: imageRadius,
              },
            ]}
          >
            {loading ? (
              <View style={styles.artLoading}>
                <ActivityIndicator color={AppColors.navBg} size="large" />
              </View>
            ) : (
              <Image
                source={heroSource}
                style={StyleSheet.absoluteFill}
                resizeMode="cover"
              />
            )}
          </View>
        </View>

        <View
          style={[
            styles.meta,
            { marginTop: isTablet ? 42 : 24, maxWidth: metaMaxWidth },
          ]}
        >
          <View style={styles.livePill}>
            <View
              style={[
                styles.liveDot,
                {
                  width: liveDotSize,
                  height: liveDotSize,
                  borderRadius: liveDotSize / 2,
                  marginRight: isTablet ? 8 : 6,
                },
              ]}
            />
            <Text
              style={[
                styles.liveText,
                isTablet && { fontSize: 18, letterSpacing: 2 },
              ]}
            >
              CANLI
            </Text>
          </View>
          <Text
            style={[styles.stationName, isTablet && styles.stationNameTablet]}
            numberOfLines={1}
          >
            {radioName}
          </Text>
          <Text
            style={[styles.trackTitle, isTablet && styles.trackTitleTablet]}
            numberOfLines={2}
          >
            {title}
          </Text>
          <Text
            style={[styles.artistName, isTablet && styles.artistNameTablet]}
            numberOfLines={2}
          >
            {artist?.trim() ? artist : " "}
          </Text>
        </View>

        <Pressable
          onPress={() => void toggle()}
          disabled={!streamUrl || loading || isBuffering}
          hitSlop={12}
          style={[styles.playPressableWrap, isTablet && { marginTop: 52 }]}
        >
          {({ pressed }) => (
            <View
              style={[
                styles.playDisc,
                isTablet && {
                  width: playDiscSize,
                  height: playDiscSize,
                  borderRadius: playDiscSize / 2,
                },
                (!streamUrl || loading) && styles.playDiscDisabled,
                pressed && streamUrl && !loading && !isBuffering && styles.playDiscPressed,
              ]}
            >
              {isBuffering ? (
                <ActivityIndicator
                  size={isTablet ? "large" : "small"}
                  color="#FFFFFF"
                />
              ) : (
                <Ionicons
                  name={isPlaying ? "stop" : "play"}
                  size={isTablet ? (isPlaying ? 46 : 50) : isPlaying ? 30 : 32}
                  color={streamUrl && !loading ? "#FFFFFF" : "rgba(255,255,255,0.45)"}
                  style={!isPlaying ? { marginLeft: 4 } : undefined}
                />
              )}
            </View>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 4,
    justifyContent: "flex-start",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  topTitle: {
    color: TEXT_MUTED,
    fontSize: 13,
    fontFamily: "PoppinsBold",
    letterSpacing: 0.8,
  },
  topTitleTablet: {
    fontSize: 22,
  },
  artFrame: {
    padding: 8,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.04)",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  artInner: {
    overflow: "hidden",
    backgroundColor: "rgba(0,0,0,0.04)",
  },
  artLoading: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
  },
  meta: {
    marginTop: 24,
    width: "100%",
    maxWidth: 400,
    alignItems: "center",
    paddingHorizontal: 4,
  },
  livePill: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: AppColors.navBg,
    marginRight: 6,
  },
  liveText: {
    color: TEXT_MUTED,
    fontSize: 11,
    fontFamily: "PoppinsBold",
    letterSpacing: 1.2,
  },
  stationName: {
    color: TEXT_SOFT,
    fontSize: 15,
    fontFamily: "PoppinsSemiBold",
    marginBottom: 8,
    textAlign: "center",
  },
  stationNameTablet: {
    fontSize: 28,
  },
  trackTitle: {
    color: TEXT,
    fontSize: 22,
    fontFamily: "PoppinsBold",
    textAlign: "center",
    lineHeight: 28,
  },
  trackTitleTablet: {
    fontSize: 44,
    lineHeight: 54,
  },
  artistName: {
    color: TEXT_MUTED,
    fontSize: 16,
    fontFamily: "PoppinsMedium",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 22,
  },
  artistNameTablet: {
    fontSize: 30,
    lineHeight: 40,
  },
  /** Touch alanı — arka plan yok; daire iç View’da (Android ripple/bg çakışması olmasın). */
  playPressableWrap: {
    marginTop: 28,
    alignSelf: "center",
  },
  /** Opak dolu daire — ikinci ekrandaki gibi; renk literal (Pressable üstünde kaybolmuyor). */
  playDisc: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: AppColors.musicAccent,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  playDiscPressed: {
    transform: [{ scale: 0.96 }],
  },
  playDiscDisabled: {
    backgroundColor: AppColors.musicAccent,
  },
});
