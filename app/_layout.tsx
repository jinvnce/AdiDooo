import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../src/lib/supabase';
import { setupNotifications } from '../src/notifications/reminders';
import { syncNow } from '../src/sync/sync';
import { colors } from '../src/theme';

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    setupNotifications();
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  // Sync on login and every time the app comes back to the foreground
  useEffect(() => {
    if (!session) return;
    syncNow();
    const listener = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        supabase.auth.startAutoRefresh();
        syncNow();
      } else {
        supabase.auth.stopAutoRefresh();
      }
    });
    return () => listener.remove();
  }, [session]);

  // Send logged-out users to login, logged-in users away from login/signup
  useEffect(() => {
    if (!ready) return;
    const onAuthScreen = segments[0] === 'login' || segments[0] === 'signup';
    if (!session && !onAuthScreen) router.replace('/login');
    else if (session && onAuthScreen) router.replace('/');
  }, [session, ready, segments]);

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.pinkDeep,
        headerTitleStyle: { color: colors.text, fontWeight: '800' },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="index" options={{ title: '🎀 My Tasks' }} />
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="signup" options={{ headerShown: false }} />
      <Stack.Screen name="task/[id]" options={{ title: 'Task', presentation: 'modal' }} />
    </Stack>
  );
}
