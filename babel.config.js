// babel.config.js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'expo-router/babel',
      // REMOVE: 'react-native-worklets/plugin',
      ['react-native-reanimated/plugin', {
        // optional: if you use VisionCamera frame processors & globals, add them here
        // globals: ['__scanCodes'] 
      }],
    ],
  };
};
