/** @type {import('expo/config').ExpoConfig} */
module.exports = () => {
  const appJson = require("./app.json");

  const apiUrl =
    process.env.EXPO_PUBLIC_API_URL?.trim() || "https://core.gisekibris.com";

  return {
    ...appJson.expo,
    extra: {
      ...appJson.expo.extra,
      apiUrl,
    },
  };
};
