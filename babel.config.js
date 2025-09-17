// babel.config.js
module.exports = function (api) {
    api.cache(true);
    return {
      presets: ['babel-preset-expo'],
      plugins: [
        // If you use Expo Router, keep this:
        require.resolve('expo-router/babel'),
  
        // MUST be last:
        'react-native-reanimated/plugin',
      ],
    };
  };
  