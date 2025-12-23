'use client';

import { MantineProvider, createTheme } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { ModalsProvider } from '@mantine/modals';
import { useSettingsStore } from '@/lib/settingsStore';
import { useEffect, useState } from 'react';

export function DynamicThemeProvider({ children }: { children: React.ReactNode }) {
  const { brandColor, fetchSettings } = useSettingsStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    fetchSettings(); // Load settings from DB on mount
    setMounted(true);
  }, []);

  // Create theme based on settings
  const dynamicTheme = createTheme({
    primaryColor: 'brand',
    colors: {
      // 10-shade palette generated from brand color (or default blue)
      brand: [
        '#e7f5ff', '#d0ebff', '#a5d8ff', '#74c0fc', '#4dabf7',
        '#339af0', brandColor || '#228be6', '#1c7ed6', '#1971c2', '#1864ab'
      ],
    },
    primaryShade: 6,
    defaultRadius: 'md',
    fontFamily: 'Inter, sans-serif',
    components: {
      Paper: { defaultProps: { withBorder: true, shadow: 'sm' } },
      Card: { defaultProps: { withBorder: true, shadow: 'sm' } },
      Button: { defaultProps: { fw: 500 } },
      // Objects only (No functions) to prevent Next.js serialization errors
      TextInput: { styles: { input: { backgroundColor: 'var(--mantine-color-body)' } } },
      Select: { styles: { input: { backgroundColor: 'var(--mantine-color-body)' } } },
      Textarea: { styles: { input: { backgroundColor: 'var(--mantine-color-body)' } } },
    }
  });

  // Prevent hydration mismatch
  if (!mounted) return null;

  return (
    <MantineProvider theme={dynamicTheme} defaultColorScheme="dark">
      <ModalsProvider>
        <Notifications position="top-right" />
        {children}
      </ModalsProvider>
    </MantineProvider>
  );
}