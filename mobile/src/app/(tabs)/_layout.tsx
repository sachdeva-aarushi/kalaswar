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
        tabBarActiveTintColor: Palette.primary,
        tabBarInactiveTintColor: Palette.outline,
        tabBarStyle: {
          backgroundColor: Palette.surface,
          borderTopColor: Palette.surfaceContainerHighest,
          borderTopWidth: 1,
          height: 72,
          paddingBottom: 10,
          paddingTop: 8,
        },
        tabBarItemStyle: {
          minHeight: 56,
          justifyContent: 'center',
          alignItems: 'center',
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
        },
      }}
    >
      <Tabs.Screen name="index" options={{ href: null }} />

      {/* Coordinator Tabs */}
      <Tabs.Screen
        name="coordinator/index"
        options={{
          title: t('tabs.coordinator.overview') || 'Overview',
          href: role === 'coordinator' ? '/coordinator' : null,
          tabBarIcon: ({ color, size }) => renderIcon('grid', color, size),
        }}
      />
      <Tabs.Screen
        name="coordinator/orders"
        options={{
          title: t('tabs.coordinator.orders') || 'Orders',
          href: role === 'coordinator' ? '/coordinator/orders' : null,
          tabBarIcon: ({ color, size }) => renderIcon('documents', color, size),
        }}
      />
      <Tabs.Screen
        name="coordinator/inventory"
        options={{
          title: t('tabs.coordinator.inventory') || 'Inventory',
          href: role === 'coordinator' ? '/coordinator/inventory' : null,
          tabBarIcon: ({ color, size }) => renderIcon('cube', color, size),
        }}
      />
      <Tabs.Screen
        name="coordinator/profile"
        options={{
          title: t('tabs.coordinator.profile') || 'Profile',
          href: role === 'coordinator' ? '/coordinator/profile' : null,
          tabBarIcon: ({ color, size }) => renderIcon('person', color, size),
        }}
      />

      {/* Artisan Tabs */}
      <Tabs.Screen
        name="artisan/index"
        options={{
          title: 'Home',
          href: role === 'artisan' ? '/artisan' : null,
          tabBarIcon: ({ color, size }) => renderIcon('home', color, size),
        }}
      />
      <Tabs.Screen
        name="artisan/work"
        options={{
          title: 'Work',
          href: role === 'artisan' ? '/artisan/work' : null,
          tabBarIcon: ({ color, size }) => renderIcon('construct', color, size),
        }}
      />
      <Tabs.Screen
        name="artisan/products"
        options={{
          title: 'Products',
          href: role === 'artisan' ? '/artisan/products' : null,
          tabBarIcon: ({ color, size }) => renderIcon('cube', color, size),
        }}
      />
      <Tabs.Screen
        name="artisan/earnings"
        options={{
          title: 'Earnings',
          href: role === 'artisan' ? '/artisan/earnings' : null,
          tabBarIcon: ({ color, size }) => renderIcon('wallet', color, size),
        }}
      />
      <Tabs.Screen
        name="artisan/profile"
        options={{
          title: 'Profile',
          href: role === 'artisan' ? '/artisan/profile' : null,
          tabBarIcon: ({ color, size }) => renderIcon('person', color, size),
        }}
      />
      <Tabs.Screen
        name="artisan/camera"
        options={{
          href: null,
        }}
      />

      {/* Shopper Tabs */}
      <Tabs.Screen
        name="shopper/index"
        options={{
          title: t('tabs.shopper.explore') || 'Explore',
          href: role === 'shopper' ? '/shopper' : null,
          tabBarIcon: ({ color, size }) => renderIcon('compass', color, size),
        }}
      />
      <Tabs.Screen
        name="shopper/concierge"
        options={{
          title: t('tabs.shopper.concierge') || 'Concierge',
          href: role === 'shopper' ? '/shopper/concierge' : null,
          tabBarIcon: ({ color, size }) => renderIcon('sparkles', color, size),
        }}
      />
      <Tabs.Screen
        name="shopper/orders"
        options={{
          title: t('tabs.shopper.orders') || 'Orders',
          href: role === 'shopper' ? '/shopper/orders' : null,
          tabBarIcon: ({ color, size }) => renderIcon('receipt', color, size),
        }}
      />
      <Tabs.Screen
        name="shopper/profile"
        options={{
          title: t('tabs.shopper.profile') || 'Profile',
          href: role === 'shopper' ? '/shopper/profile' : null,
          tabBarIcon: ({ color, size }) => renderIcon('person', color, size),
        }}
      />
    </Tabs>
  );
}
