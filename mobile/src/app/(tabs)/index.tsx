import { Redirect } from 'expo-router';
import { useAuth } from '@/hooks/use-auth';

export default function TabsIndex() {
  const { role } = useAuth();

  if (role === 'coordinator') {
    return <Redirect href="/coordinator" />;
  }
  if (role === 'artisan') {
    return <Redirect href="/artisan" />;
  }
  return <Redirect href="/shopper" />;
}

