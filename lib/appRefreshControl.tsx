import { RefreshControl, RefreshControlProps } from "react-native";
import { AppColors } from "../constants/colors";

export function appRefreshControl(
  refreshing: boolean,
  onRefresh: () => void | Promise<void>,
  overrides?: Partial<RefreshControlProps>,
) {
  return (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={() => {
        void onRefresh();
      }}
      tintColor={AppColors.navBg}
      colors={[AppColors.navBg]}
      {...overrides}
    />
  );
}
