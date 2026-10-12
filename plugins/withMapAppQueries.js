const { withAndroidManifest } = require("expo/config-plugins");

/** Android 11+: Linking.canOpenURL için harita uygulaması şemaları <queries> içinde olmalı */
const SCHEMES = ["waze", "yandexnavi", "yandexmaps"];

module.exports = function withMapAppQueries(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;
    const queries = manifest.queries?.[0] ?? {};
    const intents = queries.intent ?? [];

    for (const scheme of SCHEMES) {
      const exists = intents.some((i) =>
        i.data?.some((d) => d.$?.["android:scheme"] === scheme),
      );
      if (exists) continue;
      intents.push({
        action: [{ $: { "android:name": "android.intent.action.VIEW" } }],
        data: [{ $: { "android:scheme": scheme } }],
      });
    }

    queries.intent = intents;
    manifest.queries = [queries];
    return cfg;
  });
};
