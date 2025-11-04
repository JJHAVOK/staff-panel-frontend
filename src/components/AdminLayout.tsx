'use client';

import {
  AppShell,
  Burger,
  Group,
  Skeleton,
  Title,
  NavLink,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useAuthStore } from '@/lib/authStore';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

// Import icons
import {
  IconHome2,
  IconUsers,
  IconSettings,
  IconLogout,
} from '@tabler/icons-react';

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [opened, { toggle }] = useDisclosure();
  const router = useRouter();
  const pathname = usePathname();
  const { user, token, clearAuth } = useAuthStore();

  // This state will track if we are on the client
  const [isClient, setIsClient] = useState(false);

  // When the component mounts on the client, set isClient to true
  useEffect(() => {
    setIsClient(true);
  }, []);

  // This effect handles the authentication check
  useEffect(() => {
    // Only run this check if we are on the client
    if (isClient) {
      // If we are on the client and there is STILL no token, redirect
      if (!token) {
        router.replace('/login');
      }
    }
  }, [isClient, token, router]); // Dependencies

  const handleLogout = () => {
    clearAuth();
    router.replace('/login');
  };

  // --- THIS IS THE FIX ---
  // While we are not on the client OR we have no token,
  // show a loading skeleton.
  // This prevents the dashboard from "flickering" before the
  // redirect or before the user data is loaded.
  if (!isClient || !token) {
    return <Skeleton height="100vh" />;
  }

  // Once auth is confirmed (isClient is true AND token exists),
  // show the real dashboard.
  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ width: 250, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md">
          <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
          <Title order={3}>PixelForge Staff</Title>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <NavLink
          href="/"
          label="Dashboard"
          leftSection={<IconHome2 size="1rem" stroke={1.5} />}
          active={pathname === '/'}
        />
        <NavLink
          href="/users"
          label="Staff Management"
          leftSection={<IconUsers size="1rem" stroke={1.5} />}
          active={pathname === '/users'}
        />
        <NavLink
          href="/settings"
          label="Settings"
          leftSection={<IconSettings size="1rem" stroke={1.5} />}
          active={pathname === '/settings'}
        />

        {/* Logout Button */}
        <NavLink
          label="Logout"
          leftSection={<IconLogout size="1rem" stroke={1.5} />}
          onClick={handleLogout}
          style={{ marginTop: 'auto' }}
        />
      </AppShell.Navbar>

      <AppShell.Main>{children}</AppShell.Main>
    </AppShell>
  );
}