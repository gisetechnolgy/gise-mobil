import type { FC } from "react";
import type { SvgProps } from "react-native-svg";
import CategorySvg from "../../assets/icons/category.svg";
import CloseSvg from "../../assets/icons/close.svg";
import ClubBarSvg from "../../assets/icons/club-bar.svg";
import ConcertSvg from "../../assets/icons/concert.svg";
import EducationSvg from "../../assets/icons/education.svg";
import ElectronicSvg from "../../assets/icons/electronic.svg";
import LiveMusicSvg from "../../assets/icons/live-music.svg";
import SearchSvg from "../../assets/icons/search.svg";
import TheatreSvg from "../../assets/icons/theatre.svg";
import VGridSvg from "../../assets/icons/v-grid.svg";
import VListSvg from "../../assets/icons/v-list.svg";

/** public/icons — web SiteIcon ile aynı anahtarlar */
export type SiteIconName =
  | "category"
  | "search"
  | "close"
  | "vList"
  | "vGrid"
  | "concert"
  | "liveMusic"
  | "clubBar"
  | "electronic"
  | "theatre"
  | "education";

const ICONS: Record<SiteIconName, FC<SvgProps>> = {
  category: CategorySvg,
  search: SearchSvg,
  close: CloseSvg,
  vList: VListSvg,
  vGrid: VGridSvg,
  concert: ConcertSvg,
  liveMusic: LiveMusicSvg,
  clubBar: ClubBarSvg,
  electronic: ElectronicSvg,
  theatre: TheatreSvg,
  education: EducationSvg,
};

export const SITE_PRIMARY = "#AE256D";

type Props = {
  icon: SiteIconName;
  size?: number;
  color?: string;
};

export function SiteIcon({ icon, size = 16, color = "#2D2D2D" }: Props) {
  const Comp = ICONS[icon];
  if (!Comp) return null;
  return (
    <Comp
      width={size}
      height={size}
      color={color}
      fill={color}
    />
  );
}
