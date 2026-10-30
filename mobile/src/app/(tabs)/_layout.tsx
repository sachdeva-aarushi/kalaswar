import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Palette } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';

function renderIcon(name: keyof typeof Ionicons.glyphMap, color: unknown, size: number) {
  const iconColor = typeof color === 'string' ? color : Palette.primaryContainer;
  return <Ionicons name={name} size={size} color={iconColor} />;
}

export default function TabLayout() {
  const { role } = useAuth();
  const { t } = useTranslation();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Palette.primaryContainer,
        tabBarInactiveTintColor: Palette.outline,
        tabBarStyle: {
          backgroundColor: Palette.surface,
          borderTopColor: Palette.borderNeutral,
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen name="index" options={{ href: null }} />

      {/* Coordinator Tabs */}
      <Tabs.Screen
        name="coordinator/index"
        options={{
          title: t('tabs.coordinator.overview'),
          href: role === 'coordinator' ? '/coordinator' : null,
          tabBarIcon: ({ color, size }) => renderIcon('grid', color, size),
        }}
      />
      <Tabs.Screen
        name="coordinator/orders"
        options={{
          title: t('tabs.coordinator.orders'),
          href: role === 'coordinator' ? '/coordinator/orders' : null,
          tabBarIcon: ({ color, size }) => renderIcon('documents', color, size),
        }}
      />
      <Tabs.Screen
        name="coordinator/inventory"
        options={{
          title: t('tabs.coordinator.inventory'),
          href: role === 'coordinator' ? '/coordinator/inventory' : null,
          tabBarIcon: ({ color, size }) => renderIcon('cube', color, size),
        }}
      />
      <Tabs.Screen
        name="coordinator/profile"
        options={{
          title: t('tabs.coordinator.profile'),
          href: role === 'coordinator' ? '/coordinator/profile' : null,
          tabBarIcon: ({ color, size }) => renderIcon('person', color, size),
        }}
      />

      {/* Artisan Tabs */}
      <Tabs.Screen
        name="artisan/index"
        options={{
          title: t('tabs.artisan.home'),
          href: role === 'artisan' ? '/artisan' : null,
          tabBarIcon: ({ color, size }) => renderIcon('hammer', color, size),
        }}
      />
      <Tabs.Screen
        name="artisan/camera"
        options={{
          title: t('tabs.artisan.camera'),
          href: role === 'artisan' ? '/artisan/camera' : null,
          tabBarIcon: ({ color, size }) => renderIcon('mic', color, size),
        }}
      />
      <Tabs.Screen
        name="artisan/earnings"
        options={{
          title: t('tabs.artisan.earnings'),
          href: role === 'artisan' ? '/artisan/earnings' : null,
          tabBarIcon: ({ color, size }) => renderIcon('wallet', color, size),
        }}
      />
      <Tabs.Screen
        name="artisan/profile"
        options={{
          title: t('tabs.artisan.profile'),
          href: role === 'artisan' ? '/artisan/profile' : null,
          tabBarIcon: ({ color, size }) => renderIcon('person', color, size),
        }}
      />

      {/* Shopper Tabs */}
      <Tabs.Screen
        name="shopper/index"
        options={{
          title: t('tabs.shopper.explore'),
          href: role === 'shopper' ? '/shopper' : null,
          tabBarIcon: ({ color, size }) => renderIcon('compass', color, size),
        }}
      />
      <Tabs.Screen
        name="shopper/concierge"
        options={{
          title: t('tabs.shopper.concierge'),
          href: role === 'shopper' ? '/shopper/concierge' : null,
          tabBarIcon: ({ color, size }) => renderIcon('gift', color, size),
        }}
      />
      <Tabs.Screen
        name="shopper/orders"
        options={{
          title: t('tabs.shopper.orders'),
          href: role === 'shopper' ? '/shopper/orders' : null,
          tabBarIcon: ({ color, size }) => renderIcon('receipt', color, size),
        }}
      />
      <Tabs.Screen
        name="shopper/profile"
        options={{
          title: t('tabs.shopper.profile'),
          href: role === 'shopper' ? '/shopper/profile' : null,
          tabBarIcon: ({ color, size }) => renderIcon('person', color, size),
        }}
      />
    </Tabs>
  );
}
