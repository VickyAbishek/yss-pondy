import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { Colors } from '../constants/Colors';
import { AuthProvider } from '../lib/auth';
import { LanguageProvider } from '../lib/language';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: 'index',
};

export default function RootLayout() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <RootLayoutNav />
      </AuthProvider>
    </LanguageProvider>
  );
}

function RootLayoutNav() {
  return (
    <ThemeProvider value={DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
      </Stack>
      <StatusBar style="dark" backgroundColor={Colors.yss.cream} />
    </ThemeProvider>
  );
}
