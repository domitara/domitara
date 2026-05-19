import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useColorScheme } from '@/components/useColorScheme';
import { AuthProvider, useAuth } from '@/context/auth';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <RootLayoutNav />
      </AuthProvider>
    </GestureHandlerRootView>
  );
}

function AuthGuard() {
  const { token } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    const isLoginRoute = segments[0] === 'login';
    if (!token && !isLoginRoute) {
      router.replace('/login');
    } else if (token && isLoginRoute) {
      router.replace('/');
    }
  }, [token, segments]);

  return null;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AuthGuard />
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen
          name="menu"
          options={{
            headerShown: false,
            presentation: 'transparentModal',
            animation: 'slide_from_left',
          }}
        />
        <Stack.Screen name="home-detail" options={{ title: 'Home' }} />
        <Stack.Screen name="item-detail" options={{ title: 'Item' }} />
        <Stack.Screen name="maintenance" options={{ title: 'Maintenance' }} />
        <Stack.Screen name="asset-ids" options={{ title: 'Asset IDs' }} />
        <Stack.Screen name="electrical-panels" options={{ title: 'Electrical Panels' }} />
        <Stack.Screen name="+not-found" />
      </Stack>
    </ThemeProvider>
  );
}
