import { View, StyleSheet } from "react-native";

/** Web hamburger — 40×40 kutu içinde 18×2 barlar */
export default function HamburgerIcon() {
  return (
    <View style={styles.box}>
      <View style={styles.bar} />
      <View style={styles.bar} />
      <View style={styles.bar} />
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    width: 18,
    height: 14,
    justifyContent: "space-between",
  },
  bar: {
    width: 18,
    height: 2,
    borderRadius: 1,
    backgroundColor: "#2D2D2D",
  },
});
