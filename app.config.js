/** @type {import('expo/config').ConfigContext} */
module.exports = ({ config }) => {
  const apiUrl =
    process.env.EXPO_PUBLIC_API_URL?.trim() || "https://core.gisekibris.com";

  return {
    ...config,
    extra: {
      ...config.extra,
      apiUrl,
    },
  };
};
