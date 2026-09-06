import { useEffect, useState } from "react";
import { AccessibilityInfo, ScrollView, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useFrameCallback,
  useSharedValue,
} from "react-native-reanimated";
import { EventItem } from "../../lib/events";
import HomeEventCard from "./HomeEventCard";

const AUTO_SPEED = 45;
// Parmak bırakıldıktan kaç frame beklenecek (frame timestamp cinsinden ms)
const PAUSE_AFTER_TOUCH_MS = 1200;

type Props = {
  events: EventItem[];
  cardWidth: number;
  gap: number;
  sectionId: string;
  isFeatured?: boolean;
};

function wrapOffset(value: number, singleSetWidth: number) {
  "worklet";
  if (!singleSetWidth) return value;
  let result = value % singleSetWidth;
  if (result < 0) result += singleSetWidth;
  return result;
}

export default function HomeEventsMarquee({
  events,
  cardWidth,
  gap,
  sectionId,
  isFeatured = false,
}: Props) {
  const offset = useSharedValue(0);
  const dragStartOffset = useSharedValue(0);
  const singleSetWidthSv = useSharedValue(0);
  // -1 = serbest akış; >= 0 = bu frame timestamp'ına kadar dur
  const pausedUntilTs = useSharedValue(-1);
  const reduceMotionSv = useSharedValue(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  const step = cardWidth + gap;
  const singleSetWidth = events.length * step;
  const loopItems = [...events, ...events];

  useEffect(() => {
    singleSetWidthSv.value = singleSetWidth;
    offset.value = 0;
  }, [events.length, cardWidth, gap, offset, sectionId, singleSetWidth, singleSetWidthSv]);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        setReduceMotion(enabled);
        reduceMotionSv.value = enabled;
      })
      .catch(() => {
        setReduceMotion(false);
        reduceMotionSv.value = false;
      });

    const subscription = AccessibilityInfo.addEventListener?.(
      "reduceMotionChanged",
      (enabled) => {
        setReduceMotion(enabled);
        reduceMotionSv.value = enabled;
      },
    );

    return () => {
      subscription?.remove?.();
    };
  }, [reduceMotionSv]);

  useFrameCallback((frame) => {
    "worklet";
    const now = frame.timestamp;

    // Parmak bırakıldı sinyali: gerçek deadline'ı frame timestamp'iyle yaz
    if (pausedUntilTs.value === -2) {
      pausedUntilTs.value = now + PAUSE_AFTER_TOUCH_MS;
      return;
    }

    const setWidth = singleSetWidthSv.value;
    if (!setWidth || reduceMotionSv.value) return;

    // Duraklama süresi bitmemişse bekle (sürükleme sırasında veya sonrasında)
    if (pausedUntilTs.value >= 0 && now < pausedUntilTs.value) return;

    // Duraklama bitti
    if (pausedUntilTs.value >= 0) {
      pausedUntilTs.value = -1;
    }

    const dt = (frame.timeSincePreviousFrame ?? 16) / 1000;
    offset.value = wrapOffset(offset.value + AUTO_SPEED * dt, setWidth);
  });

  const panGesture = Gesture.Pan()
    .activeOffsetX([-6, 6])
    .failOffsetY([-10, 10])
    .onBegin(() => {
      // Akışı durdur; MAX_SAFE_INTEGER = "süresiz dur" (sürükleme devam ediyor)
      pausedUntilTs.value = Number.MAX_SAFE_INTEGER;
      dragStartOffset.value = offset.value;
    })
    .onUpdate((event) => {
      const setWidth = singleSetWidthSv.value;
      offset.value = wrapOffset(
        dragStartOffset.value - event.translationX,
        setWidth,
      );
    })
    .onFinalize((event) => {
      // Hız bazlı küçük momentum uygula
      const setWidth = singleSetWidthSv.value;
      const momentumShift = -(event.velocityX * 0.1);
      offset.value = wrapOffset(offset.value + momentumShift, setWidth);
      // -2 sinyali: frame callback gerçek deadline'ı bir sonraki frame'de yazar
      pausedUntilTs.value = -2;
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -offset.value }],
  }));

  if (!events.length) return null;

  if (reduceMotion) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: 4,
          paddingBottom: 10,
          gap,
        }}
      >
        {events.map((event, index) => (
          <HomeEventCard
            key={`${sectionId}-${event.id}-${index}`}
            event={event}
            width={cardWidth}
            isFeatured={isFeatured}
          />
        ))}
      </ScrollView>
    );
  }

  return (
    <View
      style={{
        overflow: "hidden",
        paddingTop: 4,
        paddingBottom: 10,
      }}
    >
      <GestureDetector gesture={panGesture}>
        <Animated.View
          style={[
            {
              flexDirection: "row",
              gap,
            },
            animatedStyle,
          ]}
        >
          {loopItems.map((event, index) => (
            <HomeEventCard
              key={`${sectionId}-${event.id}-marquee-${index}`}
              event={event}
              width={cardWidth}
              isFeatured={isFeatured}
            />
          ))}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}
