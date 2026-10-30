import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { supabase } from './supabase';
import { apiClient } from '@/api/client';

// Configure notification behavior when app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  let token: string | null = null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Kalaswar Notifications',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#234c3d',
    });
  }

  if (Device.isDevice || Platform.OS !== 'web') {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification permission.');
      return null;
    }

    try {
      const projectId =
        Constants?.expoConfig?.extra?.eas?.projectId ??
        Constants?.easConfig?.projectId;

      const tokenData = await Notifications.getExpoPushTokenAsync(
        projectId ? { projectId } : undefined
      );
      token = tokenData.data;

      // Save token to backend and Supabase profile
      await savePushTokenToBackend(token);
    } catch (error) {
      console.log('Error obtaining push token:', error);
      // Fallback device token
      try {
        const deviceToken = await Notifications.getDevicePushTokenAsync();
        token = deviceToken.data;
        if (token) {
          await savePushTokenToBackend(token);
        }
      } catch (err) {
        console.log('Could not get device token:', err);
      }
    }
  } else {
    console.log('Must use physical device or emulator for Push Notifications');
  }

  return token;
}

/**
 * Saves the device push token to Supabase profiles and backend notification registry
 */
export async function savePushTokenToBackend(token: string) {
  try {
    const { data } = await supabase.auth.getSession();
    const user = data.session?.user;

    if (user?.id) {
      // 1. Update user profile push token
      await supabase
        .from('profiles')
        .update({ push_token: token, updated_at: new Date().toISOString() })
        .eq('id', user.id);

      // 2. Also register with backend notifications endpoint if available
      try {
        await apiClient.POST('/api/v1/notifications' as any, {
          body: {
            user_id: user.id,
            token,
            platform: Platform.OS,
          },
        });
      } catch {
        // Endpoint might be fire-and-forget
      }
    }
  } catch (err) {
    console.warn('Error saving push token to backend:', err);
  }
}
