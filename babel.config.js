// babel.config.js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // keep router first so it can transform routes
      'expo-router/babel',

      // ...any other plugins you use...

      // must be LAST:
      'react-native-worklets/plugin',
    ],
  };
};
