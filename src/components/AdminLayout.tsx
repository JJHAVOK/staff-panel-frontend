'use client';

import {
  AppShell, Burger, Group, Skeleton, Title, NavLink, TextInput,
  rem, Popover, Stack, Text, ThemeIcon, Anchor,
  Menu, Avatar,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useAuthStore } from '@/lib/authStore';
import { useSettingsStore } from '@/lib/settingsStore';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import {
  IconHome2, IconUsers, IconSettings, IconLogout, IconLock,
  IconFileText, IconSearch, IconUser, IconBriefcase, IconAddressBook,
  IconDiamond, IconKey, IconHeartbeat, IconSend,
  IconCalendarTime, IconChevronDown, IconUserCircle, IconHelp, IconClock,
  IconReceipt2, IconBox, IconPackage, IconBuildingStore, IconLifebuoy, IconMailForward
} from '@tabler/icons-react';
import api from '@/lib/api';
import Link from 'next/link';
import { GlobalClockWidget } from '@/components/GlobalClockWidget';
import { NotificationBell } from '@/components/NotificationBell';

// Search result interface
interface SearchResult {
  id: string;
  type: 'user' | 'organization' | 'contact' | 'opportunity';
  email?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  stage?: string;
}

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [opened, { toggle }] = useDisclosure();
  const router = useRouter();
  const pathname = usePathname();
  const { user, token, clearAuth } = useAuthStore();
  
  const { siteName, fetchSettings } = useSettingsStore();
  const userPermissions = user?.permissions || [];

  // --- FLICKER FIX ---
  const [isHydrated, setIsHydrated] = useState(false);
  useEffect(() => {
    const unsubscribe = useAuthStore.persist.onFinishHydration(() => {
      setIsHydrated(true);
    });
    useAuthStore.persist.rehydrate();
    return () => { unsubscribe(); };
  }, []);

  useEffect(() => {
    if (isHydrated) {
      if (!useAuthStore.getState().token) {
        router.replace('/login');
      } else {
        fetchSettings();
      }
    }
  }, [isHydrated, router, fetchSettings]);
  // --- END OF FIX ---

  // --- Search State & Logic ---
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [popoverOpened, setPopoverOpened] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  
  const fetchSearch = useCallback(async () => {
    if (searchTerm.length < 2) { setSearchResults([]); setPopoverOpened(false); return; }
    setSearchLoading(true); setPopoverOpened(true);
    try { const response = await api.get(`/search?q=${searchTerm}`); setSearchResults(response.data); } catch (error) { setSearchResults([]); } finally { setSearchLoading(false); }
  }, [searchTerm]);
  
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => { if (searchTerm.length > 1) { fetchSearch(); } }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, fetchSearch]);

  const handleLogout = () => {
    clearAuth();
    router.replace('/login');
  };

  if (!isHydrated || !token) {
    return <Skeleton height="100vh" />;
  }
  
  // --- HELPER FOR PERMISSIONS ---
  const hasPerm = (perm: string) => userPermissions.includes(perm);

  return (
    <AppShell
      header={{ height: 0 }}
      navbar={{ width: 250, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      padding="md"
    >
      {/* --- SIDEBAR (Navbar) --- */}
      <AppShell.Navbar p="md">
        <Group px="md" mb="md" justify="space-between">
          {siteName ? (
            <Title order={3}>{siteName}</Title>
          ) : (
            <Skeleton height={20} width={120} />
          )}
          <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
        </Group>

        <NavLink href="/" label="Dashboard" leftSection={<IconHome2 size="1rem" stroke={1.5} />} active={pathname === '/'} />
        
        {/* --- HR & STAFF --- */}
        {(hasPerm('user:read') || hasPerm('rbac:read') || hasPerm('hr:timesheet:own') || hasPerm('hr:leave:own')) && (
          <NavLink label="HR & Staff" leftSection={<IconUsers size="1rem" stroke={1.5} />} defaultOpened>
            {hasPerm('user:read') && <NavLink href="/users" label="Staff Directory" active={pathname === '/users'} />}
            {hasPerm('rbac:read') && <NavLink href="/roles" label="Roles & Permissions" active={pathname === '/roles'} />}
            {(hasPerm('hr:timesheet:own') || hasPerm('hr:timesheet:manage')) && <NavLink href="/timesheets" label="Timesheets" active={pathname === '/timesheets'} />}
            {(hasPerm('hr:leave:own') || hasPerm('hr:leave:manage')) && <NavLink href="/leave" label="Leave Management" active={pathname === '/leave'} />}
          </NavLink>
        )}

        {/* --- CRM & SALES --- */}
        {(hasPerm('crm:orgs:read') || hasPerm('crm:contacts:read') || hasPerm('crm:deals:read')) && (
           <NavLink label="CRM & Sales" leftSection={<IconBriefcase size="1rem" stroke={1.5} />} defaultOpened>
             {hasPerm('crm:orgs:read') && <NavLink href="/crm/organizations" label="Organizations" active={pathname === '/crm/organizations'} />}
             {/* NEW: Separate Pages */}
             {hasPerm('crm:contacts:read') && <NavLink href="/crm/contacts" label="Contacts" active={pathname === '/crm/contacts'} />}
             {hasPerm('crm:deals:read') && <NavLink href="/crm/opportunities" label="Deals" active={pathname === '/crm/opportunities'} />}
           </NavLink>
        )}

        {/* --- E-COMMERCE --- */}
        {(hasPerm('ecommerce:products:read') || hasPerm('ecommerce:orders:read') || hasPerm('projects:read')) && (
          <NavLink label="E-commerce" leftSection={<IconBox size="1rem" stroke={1.5} />} defaultOpened>
             {hasPerm('ecommerce:products:read') && <NavLink href="/ecommerce/products" label="Product Catalog" active={pathname === '/ecommerce/products'} />}
             {hasPerm('ecommerce:orders:read') && <NavLink href="/ecommerce/orders" label="Orders" active={pathname === '/ecommerce/orders'} />}
             {hasPerm('projects:read') && <NavLink href="/projects" label="Projects (Kanban)" active={pathname === '/projects'} />}
          </NavLink>
        )}

        {/* --- FINANCE & SUPPLY --- */}
        {(hasPerm('finance:billing:read') || hasPerm('procurement:vendors:read') || hasPerm('procurement:orders:read')) && (
          <NavLink label="Finance & Supply" leftSection={<IconReceipt2 size="1rem" stroke={1.5} />}>
             {hasPerm('finance:billing:read') && <NavLink href="/billing" label="Billing & Invoices" active={pathname === '/billing'} />}
             
             {/* --- PROCUREMENT SEPARATED --- */}
             {hasPerm('procurement:vendors:read') && <NavLink href="/procurement/vendors" label="Vendors" active={pathname === '/procurement/vendors'} />}
             {hasPerm('procurement:orders:read') && <NavLink href="/procurement/orders" label="Purchase Orders" active={pathname === '/procurement/orders'} />}
          </NavLink>
        )}
        
        {/* --- MARKETING --- */}
        {hasPerm('marketing:campaigns:read') && (
           <NavLink href="/marketing" label="Marketing" leftSection={<IconMailForward size="1rem" stroke={1.5} />} active={pathname === '/marketing'} />
        )}

        {/* --- SUPPORT --- */}
        {hasPerm('helpdesk:read') && (
           <NavLink href="/helpdesk" label="Helpdesk" leftSection={<IconLifebuoy size="1rem" stroke={1.5} />} active={pathname === '/helpdesk'} />
        )}

        {/* --- SYSTEM --- */}
        <NavLink label="System" leftSection={<IconSettings size="1rem" stroke={1.5} />}>
           {hasPerm('system:audit:read') && <NavLink href="/audit" label="Audit Logs" active={pathname === '/audit'} />}
           {hasPerm('system:settings:read') && <NavLink href="/settings" label="Platform Settings" active={pathname === '/settings'} />}
           {hasPerm('system:monitoring:read') && <NavLink href="/status" label="System Health" active={pathname === '/status'} />}
           {hasPerm('system:webhooks:read') && <NavLink href="/webhooks" label="Webhooks" active={pathname === '/webhooks'} />}
           {hasPerm('system:api:read') && <NavLink href="/api-keys" label="API Keys" active={pathname === '/api-keys'} />}
        </NavLink>

      </AppShell.Navbar>

      {/* --- MAIN CONTENT AREA --- */}
      <AppShell.Main>
        {/* --- FLOATING TOPBAR --- */}
        <Group
          justify="space-between"
          align="center"
          wrap="nowrap"
          h={60}
          px="md"
          mb="md"
          style={{
            backgroundColor: 'var(--mantine-color-body)',
            borderRadius: 'var(--mantine-radius-md)',
            border: '1px solid var(--mantine-color-dark-4)',
          }}
        >
          {/* Left Side: Global Search Bar */}
          <Group>
            <Popover
              width={rem(400)}
              opened={popoverOpened && searchTerm.length > 1}
              onChange={setPopoverOpened}
              position="bottom-start"
              shadow="md"
              withArrow
            >
              <Popover.Target>
                <TextInput
                  placeholder="Global Search..."
                  leftSection={<IconSearch size="1rem" stroke={1.5} />}
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.currentTarget.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setTimeout(() => setIsSearchFocused(false), 150)}
                  style={{ width: rem(400) }}
                />
              </Popover.Target>
              <Popover.Dropdown p={rem(5)}>
                <Stack gap={rem(2)}>
                  {searchLoading && <Text c="dimmed" p="sm">Searching...</Text>}
                  {!searchLoading && searchResults.length === 0 && searchTerm.length > 1 && (
                    <Text c="dimmed" p="sm">No results found for "{searchTerm}".</Text>
                  )}
                  {!searchLoading && searchResults.length > 0 &&
                    searchResults.map((result) => {
                      if (result.type === 'user') {
                        return (
                          <Anchor component={Link} href={`/users/${result.id}`} key={result.id} onClick={() => setIsSearchFocused(false)}>
                            <Group p="xs" style={{ cursor: 'pointer' }} styles={{ root: { '&:hover': { backgroundColor: 'var(--mantine-color-dark-6)' } } }} >
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
                          <Anchor component={Link} href={`/crm/organizations/${result.id}`} key={result.id} onClick={() => setIsSearchFocused(false)}>
                            <Group p="xs" style={{ cursor: 'pointer' }} styles={{ root: { '&:hover': { backgroundColor: 'var(--mantine-color-dark-6)' } } }} >
                              <ThemeIcon size="sm" color="gray"><IconBriefcase size="1rem" /></ThemeIcon>
                              <Stack gap={0}>
                                <Text size="sm">{result.name}</Text>
                                <Text size="xs" c="dimmed">Organization</Text>
                              </Stack>
                            </Group>
                          </Anchor>
                        );
                      }
                      if (result.type === 'contact') {
                        return (
                          <Anchor component={Link} href={`/crm/contacts/${result.id}`} key={result.id} onClick={() => setIsSearchFocused(false)}>
                            <Group p="xs" style={{ cursor: 'pointer' }} styles={{ root: { '&:hover': { backgroundColor: 'var(--mantine-color-dark-6)' } } }} >
                              <ThemeIcon size="sm" color="green"><IconAddressBook size="1rem" /></ThemeIcon>
                              <Stack gap={0}>
                                <Text size="sm">{result.firstName} {result.lastName}</Text>
                                <Text size="xs" c="dimmed">{result.email}</Text>
                              </Stack>
                            </Group>
                          </Anchor>
                        );
                      }
                      if (result.type === 'opportunity') {
                        return (
                          <Anchor component={Link} href={`/crm/opportunities/${result.id}`} key={result.id} onClick={() => setIsSearchFocused(false)}>
                            <Group p="xs" style={{ cursor: 'pointer' }} styles={{ root: { '&:hover': { backgroundColor: 'var(--mantine-color-dark-6)' } } }} >
                              <ThemeIcon size="sm" color="teal"><IconDiamond size="1rem" /></ThemeIcon>
                              <Stack gap={0}>
                                <Text size="sm">{result.name}</Text>
                                <Text size="xs" c="dimmed">Opportunity ({result.stage})</Text>
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

          {/* Right Side: Clock Widget, Notifications, Profile */}
          <Group>
             {/* Clock Widget */}
             {isHydrated && userPermissions.includes('own:timesheets') && (
              <GlobalClockWidget />
            )}
            
            {/* Notification Bell */}
            <NotificationBell />
            
            {/* Profile Menu */}
            <Menu shadow="md" width={200}>
              <Menu.Target>
                <Group gap="xs" style={{ cursor: 'pointer' }}>
                  <Avatar color="cyan" radius="xl">
                    {user?.email?.charAt(0).toUpperCase() || 'U'}
                  </Avatar>
                  <Text size="sm" fw={500}>
                    {user?.email || 'User'}
                  </Text>
                  <IconChevronDown size={14} />
                </Group>
              </Menu.Target>

              <Menu.Dropdown>
                <Menu.Label>Application</Menu.Label>
                <Menu.Item
                  leftSection={<IconUserCircle size={14} />}
                  component={Link}
                  href={`/users/${user?.userId}`}
                >
                  My Profile
                </Menu.Item>
                <Menu.Item
                  leftSection={<IconSettings size={14} />}
                  component={Link}
                  href="/user-settings"
                >
                  Settings
                </Menu.Item>
                <Menu.Item
                  leftSection={<IconHelp size={14} />}
                  component={Link}
                  href="/faq"
                >
                  FAQ
                </Menu.Item>
                
                <Menu.Divider />
                
                <Menu.Item
                  color="red"
                  leftSection={<IconLogout size={14} />}
                  onClick={handleLogout}
                >
                  Logout
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Group>
        
        {/* --- CONTENT --- */}
        {children}
      </AppShell.Main>
    </AppShell>
  );
}