import { Image, ImageContentFit } from "expo-image";
import { useMemo } from "react";
import { StyleProp, ViewStyle } from "react-native";
import { resolveEventImageUrl } from "../../lib/events";
import { RemoteCardImage } from "./RemoteCardImage";

type Props = {
  imageUrl: string | null | undefined;
  /** Görsel URL değişince önbelleği kırmak için — `eventImageCacheKey(event)` */
  cacheKey?: string | null;
  recyclingKey?: string;
  contentFit?: ImageContentFit;
  priority?: "low" | "normal" | "high";
  style?: StyleProp<ViewStyle>;
  className?: string;
};

export function EventCardImage({
  imageUrl,
  cacheKey,
  recyclingKey,
  contentFit = "cover",
  priority = "normal",
  style,
  className,
}: Props) {
  const uri = useMemo(
    () => resolveEventImageUrl(imageUrl, cacheKey),
    [imageUrl, cacheKey],
  );

  return (
    <RemoteCardImage
      uri={uri}
      recyclingKey={recyclingKey ?? uri ?? undefined}
      contentFit={contentFit}
      priority={priority}
      style={style}
      className={className}
      fallbackSource={require("../../assets/images/gise-event-placeholder.jpeg")}
    />
  );
}

export async function prefetchEventImages(
  items: Array<{
    id: string;
    imageUrl: string | null;
    venueLayoutImageUrl?: string | null;
  }>,
): Promise<void> {
  const urls: string[] = [];
  for (const item of items) {
    const banner = resolveEventImageUrl(
      item.imageUrl,
      item.imageUrl ?? item.id,
    );
    if (banner) urls.push(banner);
    if (item.venueLayoutImageUrl) {
      const layout = resolveEventImageUrl(
        item.venueLayoutImageUrl,
        item.venueLayoutImageUrl,
      );
      if (layout) urls.push(layout);
    }
  }
  if (urls.length === 0) return;
  await Image.prefetch(urls, { cachePolicy: "disk" });
}
