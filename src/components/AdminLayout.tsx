'use client';

import {
  AppShell, Burger, Group, Skeleton, Title, NavLink, TextInput,
  rem, Popover, Stack, Text, ThemeIcon, Anchor,
  Menu, Avatar, ScrollArea
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
  IconReceipt2, IconBox, IconPackage, IconBuildingStore, IconLifebuoy, IconMailForward,
  IconMail, IconShieldLock, IconTicket, IconHistory, IconScan, IconRobot, IconWebhook
} from '@tabler/icons-react';
import api from '@/lib/api';
import Link from 'next/link';
import { GlobalClockWidget } from '@/components/GlobalClockWidget';
import { NotificationBell } from '@/components/NotificationBell';

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
  const [isHydrated, setIsHydrated] = useState(false);

  // Search State
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [popoverOpened, setPopoverOpened] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  useEffect(() => {
    const unsubscribe = useAuthStore.persist.onFinishHydration(() => setIsHydrated(true));
    useAuthStore.persist.rehydrate();
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (isHydrated) {
      if (!useAuthStore.getState().token) router.replace('/login');
      else fetchSettings();
    }
  }, [isHydrated, router, fetchSettings]);

  const fetchSearch = useCallback(async () => {
    if (searchTerm.length < 2) { setSearchResults([]); setPopoverOpened(false); return; }
    setSearchLoading(true); setPopoverOpened(true);
    try { const response = await api.get(`/search?q=${searchTerm}`); setSearchResults(response.data); } catch (error) { setSearchResults([]); } finally { setSearchLoading(false); }
  }, [searchTerm]);
  
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => { if (searchTerm.length > 1) { fetchSearch(); } }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, fetchSearch]);

  const handleLogout = async () => {
    try { await api.post('/auth/logout'); } catch(e) {}
    clearAuth();
    router.replace('/login');
  };

  if (!isHydrated || !token) return <Skeleton height="100vh" />;
  
  const hasPerm = (perm: string) => userPermissions.includes(perm);

  return (
    <AppShell
      header={{ height: 0 }}
      navbar={{ width: 250, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      padding="md"
    >
      <AppShell.Navbar p="md">
        <AppShell.Section>
          <Group px="md" mb="md" justify="space-between">
            {siteName ? <Title order={3}>{siteName}</Title> : <Skeleton height={20} width={120} />}
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
          </Group>
        </AppShell.Section>

        {/* --- SCROLLABLE SIDEBAR --- */}
        <AppShell.Section grow component={ScrollArea}>
          
          <NavLink href="/" label="Dashboard" leftSection={<IconHome2 size="1rem" stroke={1.5} />} active={pathname === '/'} />

          {/* HR & STAFF */}
          {(hasPerm('user:read') || hasPerm('rbac:read') || hasPerm('hr:timesheet:own') || hasPerm('hr:leave:own')) && (
            <NavLink label="HR & Staff" leftSection={<IconUsers size="1rem" stroke={1.5} />}>
              {hasPerm('user:read') && <NavLink href="/users" label="Staff Directory" active={pathname === '/users'} />}
              {hasPerm('rbac:read') && <NavLink href="/roles" label="Roles & Permissions" active={pathname === '/roles'} />}
              {(hasPerm('hr:timesheet:own') || hasPerm('hr:timesheet:manage')) && <NavLink href="/timesheets" label="Timesheets" active={pathname === '/timesheets'} />}
              {(hasPerm('hr:leave:own') || hasPerm('hr:leave:manage')) && <NavLink href="/leave" label="Leave Management" active={pathname === '/leave'} />}
            </NavLink>
          )}

          {/* CRM */}
          {(hasPerm('crm:orgs:read') || hasPerm('crm:contacts:read') || hasPerm('crm:deals:read')) && (
             <NavLink label="CRM & Sales" leftSection={<IconBriefcase size="1rem" stroke={1.5} />}>
               {hasPerm('crm:orgs:read') && <NavLink href="/crm/organizations" label="Organizations" active={pathname === '/crm/organizations'} />}
               {hasPerm('crm:contacts:read') && <NavLink href="/crm/contacts" label="Contacts" active={pathname === '/crm/contacts'} />}
               {hasPerm('crm:deals:read') && <NavLink href="/crm/opportunities" label="Deals" active={pathname === '/crm/opportunities'} />}
             </NavLink>
          )}

          {/* E-COMMERCE */}
          {(hasPerm('ecommerce:products:read') || hasPerm('ecommerce:orders:read') || hasPerm('projects:read')) && (
            <NavLink label="E-commerce" leftSection={<IconBox size="1rem" stroke={1.5} />}>
               {hasPerm('ecommerce:products:read') && <NavLink href="/ecommerce/products" label="Product Catalog" active={pathname === '/ecommerce/products'} />}
               {hasPerm('ecommerce:promotions:read') && <NavLink href="/ecommerce/promotions" label="Coupons / Promo" leftSection={<IconTicket size="1rem" />} active={pathname === '/ecommerce/promotions'} />}
               {hasPerm('ecommerce:products:read') && <NavLink href="/ecommerce/inventory" label="Scanner Tool" leftSection={<IconScan size="1rem" />} active={pathname === '/ecommerce/inventory'} />}
               {hasPerm('ecommerce:orders:read') && <NavLink href="/ecommerce/orders" label="Orders" active={pathname === '/ecommerce/orders'} />}
               {hasPerm('ecommerce:orders:read') && <NavLink href="/ecommerce/returns" label="Returns / RMA" active={pathname === '/ecommerce/returns'} />}
               {hasPerm('projects:read') && <NavLink href="/projects" label="Projects (Kanban)" active={pathname === '/projects'} />}
            </NavLink>
          )}

          {/* FINANCE */}
          {(hasPerm('finance:billing:read') || hasPerm('procurement:vendors:read') || hasPerm('procurement:orders:read')) && (
            <NavLink label="Finance & Supply" leftSection={<IconReceipt2 size="1rem" stroke={1.5} />}>
               {hasPerm('finance:billing:read') && <NavLink href="/billing" label="Billing & Invoices" active={pathname === '/billing'} />}
               {hasPerm('procurement:vendors:read') && <NavLink href="/procurement/vendors" label="Vendors" active={pathname === '/procurement/vendors'} />}
               {hasPerm('procurement:orders:read') && <NavLink href="/procurement/orders" label="Purchase Orders" active={pathname === '/procurement/orders'} />}
            </NavLink>
          )}
          
          {/* MARKETING */}
          {hasPerm('marketing:campaigns:read') && (
             <NavLink href="/marketing" label="Marketing" leftSection={<IconMailForward size="1rem" stroke={1.5} />} active={pathname === '/marketing'} />
          )}

          {/* SUPPORT */}
          {hasPerm('helpdesk:read') && (
             <NavLink href="/helpdesk" label="Helpdesk" leftSection={<IconLifebuoy size="1rem" stroke={1.5} />} active={pathname === '/helpdesk'} />
          )}

          {/* INBOX */}
          {userPermissions.includes('read:inbox') && (
             <NavLink href="/inbox" label="Inbox" leftSection={<IconMail size="1rem" stroke={1.5} />} active={pathname === '/inbox'} />
          )}

          {/* SECURITY & LOGS */}
          <NavLink label="Security & Logs" leftSection={<IconShieldLock size="1rem" stroke={1.5} />}>
             {hasPerm('security:read') && <NavLink href="/security" label="Global Security" leftSection={<IconLock size="1rem" stroke={1.5} />} active={pathname === '/security'} />}
             {hasPerm('system:audit:read') && <NavLink href="/audit" label="Audit Logs" leftSection={<IconHistory size="1rem" stroke={1.5} />} active={pathname === '/audit'} />}
          </NavLink>

          {/* SYSTEM */}
          <NavLink label="System" leftSection={<IconSettings size="1rem" stroke={1.5} />}>
             {hasPerm('system:settings:manage') && <NavLink href="/system/automation" label="Automation" leftSection={<IconRobot size="1rem" stroke={1.5} />} active={pathname.startsWith('/system/automation')} />}
             
             {/* --- 👇 FIXED: Updated to /system/webhooks --- */}
             {hasPerm('system:webhooks:read') && <NavLink href="/system/webhooks" label="Webhooks" leftSection={<IconWebhook size="1rem" stroke={1.5} />} active={pathname === '/system/webhooks'} />}
             
             {/* --- 👇 NEW: Added Scheduler/Cron --- */}
             {hasPerm('system:settings:manage') && <NavLink href="/system/cron" label="Cron Jobs" leftSection={<IconClock size="1rem" stroke={1.5} />} active={pathname === '/system/cron'} />}
             {/* --- 👆 END NEW --- */}

             {hasPerm('system:settings:read') && <NavLink href="/settings" label="Platform Settings" active={pathname === '/settings'} />}
             {hasPerm('system:monitoring:read') && <NavLink href="/status" label="System Health" active={pathname === '/status'} />}
             {hasPerm('system:api:read') && <NavLink href="/api-keys" label="API Keys" active={pathname === '/api-keys'} />}
          </NavLink>
        </AppShell.Section>
      </AppShell.Navbar>

      <AppShell.Main>
        <Group justify="space-between" align="center" h={60} px="md" mb="md" style={{ backgroundColor: 'var(--mantine-color-body)', borderRadius: 'var(--mantine-radius-md)', border: '1px solid var(--mantine-color-dark-4)' }}>
          {/* Search */}
          <Group>
            <Popover width={rem(400)} opened={popoverOpened && searchTerm.length > 1} onChange={setPopoverOpened} position="bottom-start" shadow="md" withArrow>
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
                    searchResults.map((result) => (
                        <Anchor component={Link} href={`/${result.type === 'user' ? 'users' : result.type === 'organization' ? 'crm/organizations' : 'crm/contacts'}/${result.id}`} key={result.id} onClick={() => setIsSearchFocused(false)}>
                          <Group p="xs" style={{ cursor: 'pointer' }} styles={{ root: { '&:hover': { backgroundColor: 'var(--mantine-color-dark-6)' } } }} >
                            <Text size="sm">{result.name || `${result.firstName} ${result.lastName}`}</Text>
                          </Group>
                        </Anchor>
                    ))}
                </Stack>
              </Popover.Dropdown>
            </Popover>
          </Group>

          {/* Right Side */}
          <Group>
             {isHydrated && userPermissions.includes('own:timesheets') && <GlobalClockWidget />}
             <NotificationBell />
             <Menu shadow="md" width={200}>
              <Menu.Target>
                <Group gap="xs" style={{ cursor: 'pointer' }}>
                  <Avatar color="cyan" radius="xl">{user?.email?.charAt(0).toUpperCase() || 'U'}</Avatar>
                  <Text size="sm" fw={500}>{user?.email || 'User'}</Text>
                  <IconChevronDown size={14} />
                </Group>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Label>Application</Menu.Label>
                <Menu.Item leftSection={<IconUserCircle size={14} />} component={Link} href={`/users/${user?.userId}`}>My Profile</Menu.Item>
                <Menu.Item leftSection={<IconSettings size={14} />} component={Link} href="/user-settings">Settings</Menu.Item>
                <Menu.Divider />
                <Menu.Item color="red" leftSection={<IconLogout size={14} />} onClick={handleLogout}>Logout</Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Group>
        
        {children}
      </AppShell.Main>
    </AppShell>
  );
}