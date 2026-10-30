import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { queryClient } from '@/lib/query-client';
import { AuthProvider, useAuth } from '@/hooks/use-auth';
import { registerForPushNotificationsAsync } from '@/lib/notifications';
import '@/i18n'; // Initialize i18n
import { Palette } from '@/constants/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

function RootNavigator() {
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    SplashScreen.hideAsync().catch(() => {});

    const inAuthGroup = segments[0] === '(auth)';

    if (!user && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (user && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [user, isLoading, segments, router]);

  // Push notifications registration & event listener
  useEffect(() => {
    if (user) {
      void registerForPushNotificationsAsync();
    }

    const notificationSubscription = Notifications.addNotificationReceivedListener((notification) => {
      console.log('Push notification received in foreground:', notification);
    });

    const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as { route?: string } | undefined;
      if (data?.route) {
        router.push(data.route as any);
      } else {
        router.push('/notifications' as any);
      }
    });

    return () => {
      notificationSubscription.remove();
      responseSubscription.remove();
    };
  }, [user, router]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Palette.background },
      }}
    >
      <Stack.Screen name="(auth)/login" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="coordinator/scan" options={{ headerShown: false }} />
      <Stack.Screen name="passport/[token]" options={{ headerShown: false }} />
      <Stack.Screen name="coordinator/assignments" options={{ headerShown: false }} />
      <Stack.Screen name="coordinator/approvals" options={{ headerShown: false }} />
      <Stack.Screen name="notifications/index" options={{ headerShown: false }} />
      <Stack.Screen name="orders/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="artisan/task/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="artisan/camera" options={{ headerShown: false }} />
      <Stack.Screen name="artisan/voice" options={{ headerShown: false }} />
      <Stack.Screen name="artisan/review" options={{ headerShown: false }} />
      <Stack.Screen name="artisan/submission-status" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <StatusBar style="dark" />
          <RootNavigator />
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
