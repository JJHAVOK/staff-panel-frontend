'use client';

import {
  AppShell, Burger, Group, Skeleton, Title, NavLink, TextInput,
  rem, Popover, Stack, Text, ThemeIcon, Anchor,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useAuthStore } from '@/lib/authStore';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react'; // Corrected import
import {
  IconHome2, IconUsers, IconSettings, IconLogout, IconLock,
  IconFileText, IconSearch, IconUser, IconBriefcase,
} from '@tabler/icons-react';
import api from '@/lib/api';

// Search result interface
interface SearchResult {
  id: string;
  type: 'user' | 'organization';
  // User fields
  email?: string;
  firstName?: string;
  lastName?: string;
  // Org fields
  name?: string;
}

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [opened, { toggle }] = useDisclosure();
  const router = useRouter();
  const pathname = usePathname();
  const { user, token, clearAuth } = useAuthStore();

  // --- THIS IS THE FIX FOR THE FLICKER ---
  // We wait for the auth store to confirm it has loaded from storage
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    // Zustand's 'onFinishHydration' is the correct listener
    const unsubscribe = useAuthStore.persist.onFinishHydration(() => {
      setIsHydrated(true); // Now we know the token is loaded (or not)
    });

    // Manually trigger the rehydration
    useAuthStore.persist.rehydrate();

    return () => {
      unsubscribe(); // Clean up subscription
    };
  }, []);

  // This effect now safely handles authentication
  useEffect(() => {
    // Wait until the store is hydrated (isHydrated is true)
    if (isHydrated) {
      // If hydration is done and we STILL have no token, redirect.
      if (!useAuthStore.getState().token) {
        router.replace('/login');
      }
    }
  }, [isHydrated, router]); // Re-check if hydration status changes
  // --- END OF FIX ---


  // --- Search State & Logic (unchanged) ---
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [popoverOpened, setPopoverOpened] = useState(false);

  const fetchSearch = useCallback(async () => {
  if (searchTerm.length < 3) {
    setSearchResults([]);
    setPopoverOpened(false);
    return;
  }
  setSearchLoading(true);
  setPopoverOpened(true);
  try {
    const response = await api.get(`/search?q=${searchTerm}`);
    setSearchResults(response.data); // Backend now sends full objects
  } catch (error) {
    setSearchResults([]);
  } finally {
    setSearchLoading(false);
  }
}, [searchTerm]);

  const handleLogout = () => {
    clearAuth();
    router.replace('/login');
  };

  // Show the loading skeleton UNTIL the store is hydrated
  if (!isHydrated) {
    return <Skeleton height="100vh" />;
  }

  // If hydrated and no token (should be redirecting), show skeleton
  if (!token) {
    return <Skeleton height="100vh" />;
  }

  // If hydrated AND we have a token, show the app
  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ width: 250, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between" wrap="nowrap">
          <Group>
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <Title order={3}>PixelForge Staff</Title>
          </Group>
          <Popover
            width={rem(450)}
            opened={popoverOpened && searchTerm.length >= 3}
            onChange={setPopoverOpened}
            position="bottom"
            shadow="md"
          >
            <Popover.Target>
              <TextInput
                placeholder="Global Search..."
                leftSection={<IconSearch size="1rem" stroke={1.5} />}
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.currentTarget.value)}
                style={{ width: rem(400) }}
              />
            </Popover.Target>
            <Popover.Dropdown p={rem(5)}>
              <Stack gap={rem(2)}>
                {searchLoading && <Text c="dimmed" p="sm">Searching...</Text>}
                {!searchLoading && searchResults.length === 0 && searchTerm.length >= 3 && (
                  <Text c="dimmed" p="sm">No results found for "{searchTerm}".</Text>
                )}
                {searchResults.length > 0 &&
  searchResults.map((result) => {
    if (result.type === 'user') {
      return (
        <Anchor href={`/users/${result.id}`} key={result.id} onClick={() => setPopoverOpened(false)}>
          <Group p="xs" style={{ cursor: 'pointer' }}>
            <ThemeIcon size="sm" color="blue"><IconUser size="1rem" /></ThemeIcon>
            <Stack gap={0}>
              <Text size="sm">{result.firstName} {result.lastName}</Text>
              <Text size="xs" c="dimmed">{result.email}</Text>
            </Stack>
          </Group>
        </Anchor>
      );
    }
    if (result.type === 'organization') {
      return (
        <Anchor href={`/crm/organizations/${result.id}`} key={result.id} onClick={() => setPopoverOpened(false)}>
          <Group p="xs" style={{ cursor: 'pointer' }}>
            <ThemeIcon size="sm" color="gray"><IconBriefcase size="1rem" /></ThemeIcon>
            <Stack gap={0}>
              <Text size="sm">{result.name}</Text>
              <Text size="xs" c="dimmed">Organization</Text>
            </Stack>
          </Group>
        </Anchor>
      );
    }
    return null;
  })}
              </Stack>
            </Popover.Dropdown>
          </Popover>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <NavLink href="/" label="Dashboard" leftSection={<IconHome2 size="1rem" stroke={1.5} />} active={pathname === '/'} />
        <NavLink href="/users" label="Staff Management" leftSection={<IconUsers size="1rem" stroke={1.5} />} active={pathname === '/users'} />
        <NavLink href="/crm/organizations"  label="CRM"  leftSection={<IconBriefcase size="1rem" stroke={1.5} />}  active={pathname.startsWith('/crm')}/>
        <NavLink href="/roles" label="Role Management" leftSection={<IconLock size="1rem" stroke={1.5} />} active={pathname === '/roles'} />
        <NavLink href="/audit" label="Audit Log" leftSection={<IconFileText size="1rem" stroke={1.5} />} active={pathname === '/audit'} />
        <NavLink href="/settings" label="Settings" leftSection={<IconSettings size="1rem" stroke={1.5} />} active={pathname === '/settings'} />
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