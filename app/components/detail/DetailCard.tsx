import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import {
  DETAIL_CARD_PAD,
  DETAIL_CARD_RADIUS,
  DETAIL_CARD_SHADOW,
} from "../../../constants/mobileDetail";

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  noPad?: boolean;
};

export default function DetailCard({ children, style, noPad }: Props) {
  return (
    <View
      style={[
        styles.card,
        DETAIL_CARD_SHADOW,
        noPad ? styles.noPad : null,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: DETAIL_CARD_RADIUS,
    padding: DETAIL_CARD_PAD,
  },
  noPad: {
    padding: 0,
    overflow: "hidden",
  },
});
