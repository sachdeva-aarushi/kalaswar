import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Kalaswar',
  slug: 'kalaswar-mobile',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'kalaswar',
  userInterfaceStyle: 'automatic',
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.kalaswar.mobile',
    buildNumber: '1',
  },
  android: {
    package: 'com.kalaswar.mobile',
    versionCode: 1,
    adaptiveIcon: {
      backgroundColor: '#083527',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  web: {
    bundler: 'metro',
    output: 'single',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#083527',
        image: './assets/images/splash-icon.png',
        imageWidth: 200,
      },
    ],
  ],
  extra: {
    apiUrl: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000',
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://hptiiyicxqgdtucxswal.supabase.co',
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_u_51_fQEMUj1UTns_ENCrA_ws-KlyWA',
    eas: {
      projectId:
        process.env.EAS_PROJECT_ID ||
        config.extra?.eas?.projectId ||
        '6d445079-d925-4017-bc80-0234b31f4b42',
    },
  },
});

