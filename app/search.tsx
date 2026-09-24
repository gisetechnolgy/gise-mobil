import { Redirect, useLocalSearchParams } from "expo-router";

/**
 * Eski /search route — ana sayfa / etkinlikler artık navbar altında sheet açıyor.
 * Derin link gelirse ana sekmeye dön.
 */
export default function SearchScreen() {
  const rawParams = useLocalSearchParams<{ scope?: string | string[] }>();
  const scopeParam = Array.isArray(rawParams.scope)
    ? rawParams.scope[0]
    : rawParams.scope;

  if (scopeParam === "events" || scopeParam === "venues") {
    return <Redirect href="/(tabs)/events" />;
  }
  return <Redirect href="/(tabs)" />;
}
