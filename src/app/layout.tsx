import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import '@mantine/notifications/styles.css';
import '@mantine/charts/styles.css';

import React from 'react';
import { ColorSchemeScript } from '@mantine/core';
import { DynamicThemeProvider } from '@/components/DynamicThemeProvider'; // <-- The Wrapper

export const metadata = {
  title: 'Staff Admin Panel',
  description: 'PixelForge Developer Staff Panel',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <ColorSchemeScript defaultColorScheme="dark" />
        <link rel="shortcut icon" href="/favicon.svg" />
        <meta
          name="viewport"
          content="minimum-scale=1, initial-scale=1, width=device-width, user-scalable=no"
        />
      </head>
      <body>
        {/* DynamicThemeProvider handles Theme, Modals, and Notifications internally */}
        <DynamicThemeProvider>
          {children}
        </DynamicThemeProvider>
      </body>
    </html>
  );
}