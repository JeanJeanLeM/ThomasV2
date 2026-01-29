const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Configuration pour React Native Web
config.resolver.alias = {
  // Fix pour react-native-web
  'react-native$': 'react-native-web',
  'react-native/': 'react-native-web/',
  
  // Alias pour le projet
  '@': './src',
  '@/components': './src/components',
  '@/screens': './src/screens',
  '@/services': './src/services',
  '@/hooks': './src/hooks',
  '@/utils': './src/utils',
  '@/types': './src/types',
  '@/constants': './src/constants',
};

// Plateformes supportées
config.resolver.platforms = ['web', 'ios', 'android', 'native'];

// Extensions de fichiers
config.resolver.sourceExts = [...config.resolver.sourceExts, 'jsx', 'js', 'ts', 'tsx'];

module.exports = config;
