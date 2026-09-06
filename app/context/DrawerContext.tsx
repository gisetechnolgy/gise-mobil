import { Animated } from "react-native";
import { createContext, useContext } from "react";

type DrawerContextType = {
  isOpen: boolean;
  pushAnim: Animated.Value;
  openDrawer: () => void;
  closeDrawer: () => void;
};

const fallbackAnim = new Animated.Value(0);

export const DrawerContext = createContext<DrawerContextType>({
  isOpen: false,
  pushAnim: fallbackAnim,
  openDrawer: () => {},
  closeDrawer: () => {},
});

export const useDrawer = () => useContext(DrawerContext);

// expo-router bu dosyayı route sanmasın diye default export ekliyoruz.
export default function DrawerContextRoute() {
  return null;
}
