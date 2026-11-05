import React, { useEffect } from 'react';
import { AppState, StatusBar } from 'react-native';
import {
  focusManager,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});

function App() {
  // RN has no window focus event: tell React Query when the app returns to foreground
  useEffect(() => {
    const sub = AppState.addEventListener('change', status => {
      focusManager.setFocused(status === 'active');
    });
    return () => sub.remove();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <StatusBar
          barStyle="light-content"
          translucent
          backgroundColor="transparent"
        />
        <AppNavigator />
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}

export default App;
