import { Image } from "react-native";
import { SiteIcon, SITE_PRIMARY } from "./SiteIcon";
import { getCategoryIconName } from "../../lib/categoryIcons";
import { resolveRemoteImageUrl } from "../../lib/remoteImage";

type CategoryIconProps = {
  category:
    | {
        value?: string;
        label?: string;
        slug?: string;
        icon?: string | { src?: string } | null;
      }
    | "all";
  size?: number;
  active?: boolean;
};

function getCustomIconSrc(
  category: CategoryIconProps["category"],
): string | null {
  if (!category || category === "all") return null;
  if (typeof category !== "object") return null;
  if (category.value === "all") return null;
  const icon = category.icon;
  if (!icon) return null;
  if (typeof icon === "string" && icon.trim()) {
    return resolveRemoteImageUrl(icon.trim());
  }
  if (typeof icon === "object" && typeof icon.src === "string" && icon.src.trim()) {
    return resolveRemoteImageUrl(icon.src.trim());
  }
  return null;
}

export function CategoryIcon({
  category,
  size = 22,
  active = false,
}: CategoryIconProps) {
  const customSrc = getCustomIconSrc(category);
  if (customSrc) {
    return (
      <Image
        source={{ uri: customSrc }}
        style={{ width: size, height: size }}
        resizeMode="contain"
      />
    );
  }

  return (
    <SiteIcon
      icon={getCategoryIconName(category)}
      size={size}
      color={active ? SITE_PRIMARY : "#2D2D2D"}
    />
  );
}
