import type { CategoryItem } from "../lib/definitions";
import type { SiteIconName } from "@/components/icons/SiteIcon";

/** Web category-menu-icons — SiteIcon anahtarları */
const categoryIconNames: Record<string, SiteIconName> = {
  all: "category",
  concert: "concert",
  live: "liveMusic",
  club: "clubBar",
  electronic: "electronic",
  stage: "theatre",
  education: "education",
  default: "category",
};

export type CategoryIconType = keyof typeof categoryIconNames;

export function getCategoryIconType(
  category: { value?: string; label?: string; slug?: string } | "all",
): CategoryIconType {
  if (
    category === "all" ||
    (typeof category === "object" && category.value === "all")
  ) {
    return "all";
  }

  const key = [
    typeof category === "object" ? category.value : "",
    typeof category === "object" ? category.slug : "",
    typeof category === "object" ? category.label : "",
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (key.includes("konser") || key.includes("concert")) return "concert";
  if (key.includes("canli") || key.includes("canlı") || key.includes("live")) {
    return "live";
  }
  if (
    key.includes("club") ||
    key.includes("lounge") ||
    key.includes("bar") ||
    key.includes("gece")
  ) {
    return "club";
  }
  if (
    key.includes("elektronik") ||
    key.includes("electronic") ||
    key.includes("dj")
  ) {
    return "electronic";
  }
  if (
    key.includes("sahne") ||
    key.includes("tiyatro") ||
    key.includes("theater") ||
    key.includes("theatre")
  ) {
    return "stage";
  }
  if (
    key.includes("egitim") ||
    key.includes("eğitim") ||
    key.includes("education")
  ) {
    return "education";
  }
  return "default";
}

export function getCategoryIconName(
  category: { value?: string; label?: string; slug?: string } | "all",
): SiteIconName {
  const type = getCategoryIconType(category);
  return categoryIconNames[type] || categoryIconNames.default;
}

/** Web formatCategoryMenuLabel — uppercase trim */
export function formatCategoryMenuLabel(label: string): string {
  return String(label || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleUpperCase("tr-TR");
}

export function categoryFromItem(item: CategoryItem): {
  value: string;
  label: string;
} {
  return { value: item.value, label: item.label };
}
