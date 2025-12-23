'use client';

import {
  AppShell, Burger, Group, Skeleton, Title, NavLink, TextInput,
  rem, Popover, Stack, Text, Anchor, Badge,
  Menu, Avatar, ScrollArea, ActionIcon, useMantineColorScheme, useComputedColorScheme, NavLinkProps
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useAuthStore } from '@/lib/authStore';
import { useSettingsStore } from '@/lib/settingsStore';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import {
  IconHome2, IconUsers, IconSettings, IconLogout, IconLock,
  IconSearch, IconBriefcase,
  IconReceipt2, IconBox, IconLifebuoy, IconMailForward,
  IconMail, IconShieldLock, IconHistory, IconScan, IconRobot, IconWebhook, IconClock, IconTicket, IconBook, IconChevronDown, IconUserCircle,
  IconSun, IconMoon, IconActivity,
} from '@tabler/icons-react';
import api from '@/lib/api'; // <--- Ensure this imports our updated api.ts
import Link from 'next/link';
import { GlobalClockWidget } from '@/components/GlobalClockWidget';
import { NotificationBell } from '@/components/NotificationBell';
import { UserAvatar } from '@/components/UserAvatar';

interface SearchResult {
  id: string; type: string; name?: string; firstName?: string; lastName?: string; email?: string; description?: string;
}

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [opened, { toggle }] = useDisclosure();
  const router = useRouter();
  const pathname = usePathname();
  const { user, token, clearAuth } = useAuthStore();
  const { siteName, fetchSettings, darkSidebar } = useSettingsStore();
  const { setColorScheme } = useMantineColorScheme();
  const computedColorScheme = useComputedColorScheme('dark', { getInitialValueInEffect: true });
  const userPermissions = user?.permissions || [];
  const [isHydrated, setIsHydrated] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [popoverOpened, setPopoverOpened] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // 1. HYDRATION & AUTH CHECK
  useEffect(() => { 
      const u = useAuthStore.persist.onFinishHydration(() => setIsHydrated(true)); 
      useAuthStore.persist.rehydrate(); 
      return () => u(); 
  }, []);

  // 2. ACTIVE SESSION VALIDATION (The Fix)
  useEffect(() => { 
      if (isHydrated) { 
          if (!useAuthStore.getState().token) {
              router.replace('/login');
          } else {
              // ⚡️ PULSE CHECK: Ask server "Am I still valid?"
              // If this returns 401, the api.ts interceptor will logout.
              api.get('/auth/profile').catch(() => {
                  // Error handled by interceptor, but we catch here to prevent React console errors
              });
              
              fetchSettings(); 
          }
      } 
  }, [isHydrated, router, fetchSettings]);

  const toggleColorScheme = () => { setColorScheme(computedColorScheme === 'dark' ? 'light' : 'dark'); };

  const fetchSearch = useCallback(async () => {
    if (searchTerm.length < 2) { setSearchResults([]); setPopoverOpened(false); return; }
    setSearchLoading(true); setPopoverOpened(true);
    try { const response = await api.get(`/search?q=${searchTerm}`); setSearchResults(response.data); } catch (error) { setSearchResults([]); } finally { setSearchLoading(false); }
  }, [searchTerm]);

  useEffect(() => { const t = setTimeout(() => { if (searchTerm.length > 1) { fetchSearch(); } }, 300); return () => clearTimeout(t); }, [searchTerm, fetchSearch]);

  const handleLogout = async () => { try { await api.post('/auth/logout'); } catch(e) {} clearAuth(); router.replace('/login'); };
  const hasPerm = (perm: string) => userPermissions.includes(perm) || userPermissions.includes('rbac:manage');

  const getLink = (result: any) => {
    switch(result.type) {
        case 'user': return `/users/${result.id}`;
        case 'contact': return `/crm/contacts/${result.id}`;
        case 'organization': return `/crm/organizations/${result.id}`;
        case 'opportunity': return `/crm/opportunities`;
        case 'order': return `/ecommerce/orders/${result.id}`;
        case 'product': return `/ecommerce/products/${result.id}`;
        case 'ticket': return `/helpdesk/${result.id}`;
        case 'project': return `/projects/${result.id}`;
        case 'article': return `/helpdesk/kb`;
        case 'inbox': return `/inbox`;
        case 'webhook': return `/system/webhooks`;
        case 'apikey': return `/api-keys`;
        case 'cron': return `/system/cron`;
        case 'vendor': return `/procurement/vendors/${result.id}`;
        case 'purchase_order': return `/procurement/orders/${result.id}`;
        case 'promotion': return `/ecommerce/promotions`;
        default: return '/';
    }
  };

  const isSidebarDark = computedColorScheme === 'dark' || darkSidebar;
  const sidebarBg = isSidebarDark ? '#1A1B1E' : 'var(--mantine-color-body)';
  const sidebarBorder = isSidebarDark ? '1px solid #2C2E33' : '1px solid var(--mantine-color-gray-3)';
  const navStyles: NavLinkProps = isSidebarDark ? {
    styles: {
        root: { color: '#C1C2C5', '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.05)' }, '&[data-active]': { backgroundColor: 'var(--mantine-primary-color-filled)', color: 'white' } },
        description: { color: '#909296' },
    }
  } : { variant: "light" };

  if (!isHydrated || !token) return <Skeleton height="100vh" />;

  return (
    <AppShell header={{ height: 60 }} navbar={{ width: 250, breakpoint: 'sm', collapsed: { mobile: !opened } }} padding="md" styles={{ main: { background: 'var(--mantine-color-body)' } }}>
      <AppShell.Header>
         <Group justify="space-between" align="center" h={60} px="md" style={{ backgroundColor: isSidebarDark ? '#1A1B1E' : 'white', borderBottom: sidebarBorder }}>
           <Group>
             <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
             {siteName ? <Title order={3} style={{ fontFamily: 'var(--mantine-font-headings)', letterSpacing: '-0.5px' }}>{siteName}</Title> : <Skeleton height={20} width={120} />}
           </Group>
         </Group>
      </AppShell.Header>
      <AppShell.Navbar p="md" style={{ background: sidebarBg, borderRight: sidebarBorder }}>
        <AppShell.Section grow component={ScrollArea}>
          <NavLink href="/" label="Dashboard" leftSection={<IconHome2 size="1rem" stroke={1.5} />} active={pathname === '/'} {...navStyles} />
          {(hasPerm('user:read') || hasPerm('rbac:read') || hasPerm('hr:read')) && (
            <NavLink label="HR & Staff" leftSection={<IconUsers size="1rem" stroke={1.5} />} {...navStyles}>
              {hasPerm('user:read') && <NavLink href="/users" label="Staff Directory" active={pathname === '/users'} {...navStyles} />}
              {hasPerm('rbac:read') && <NavLink href="/roles" label="Roles & Permissions" active={pathname === '/roles'} {...navStyles} />}
              {(hasPerm('hr:timesheet:own') || hasPerm('hr:timesheet:manage')) && <NavLink href="/timesheets" label="Timesheets" active={pathname === '/timesheets'} {...navStyles} />}
              {(hasPerm('hr:leave:own') || hasPerm('hr:leave:manage')) && <NavLink href="/leave" label="Leave Management" active={pathname === '/leave'} {...navStyles} />}
            </NavLink>
          )}
          {(hasPerm('crm:read')) && (
             <NavLink label="CRM & Sales" leftSection={<IconBriefcase size="1rem" stroke={1.5} />} {...navStyles}>
               {hasPerm('crm:orgs:read') && <NavLink href="/crm/organizations" label="Organizations" active={pathname === '/crm/organizations'} {...navStyles} />}
               {hasPerm('crm:contacts:read') && <NavLink href="/crm/contacts" label="Contacts" active={pathname === '/crm/contacts'} {...navStyles} />}
               {hasPerm('crm:deals:read') && <NavLink href="/crm/opportunities" label="Deals" active={pathname === '/crm/opportunities'} {...navStyles} />}
             </NavLink>
          )}
          {(hasPerm('ecommerce:read') || hasPerm('projects:read')) && (
            <NavLink label="E-commerce" leftSection={<IconBox size="1rem" stroke={1.5} />} {...navStyles}>
               {hasPerm('ecommerce:products:read') && <NavLink href="/ecommerce/products" label="Product Catalog" active={pathname === '/ecommerce/products'} {...navStyles} />}
               {hasPerm('ecommerce:promotions:read') && <NavLink href="/ecommerce/promotions" label="Coupons / Promo" leftSection={<IconTicket size="1rem" />} active={pathname === '/ecommerce/promotions'} {...navStyles} />}
               {hasPerm('ecommerce:products:read') && <NavLink href="/ecommerce/inventory" label="Scanner Tool" leftSection={<IconScan size="1rem" />} active={pathname === '/ecommerce/inventory'} {...navStyles} />}
               {hasPerm('ecommerce:orders:read') && <NavLink href="/ecommerce/orders" label="Orders" active={pathname === '/ecommerce/orders'} {...navStyles} />}
               {hasPerm('ecommerce:orders:read') && <NavLink href="/ecommerce/returns" label="Returns / RMA" active={pathname === '/ecommerce/returns'} {...navStyles} />}
               {hasPerm('projects:read') && <NavLink href="/projects" label="Projects (Kanban)" active={pathname === '/projects'} {...navStyles} />}
            </NavLink>
          )}
          {(hasPerm('finance:read') || hasPerm('procurement:vendors:read')) && (
            <NavLink label="Finance & Supply" leftSection={<IconReceipt2 size="1rem" stroke={1.5} />} {...navStyles}>
               {hasPerm('finance:billing:read') && <NavLink href="/billing" label="Billing & Invoices" active={pathname === '/billing'} {...navStyles} />}
               {hasPerm('procurement:vendors:read') && <NavLink href="/procurement/vendors" label="Vendors" active={pathname === '/procurement/vendors'} {...navStyles} />}
               {hasPerm('procurement:orders:read') && <NavLink href="/procurement/orders" label="Purchase Orders" active={pathname === '/procurement/orders'} {...navStyles} />}
            </NavLink>
          )}
          {hasPerm('marketing:campaigns:read') && <NavLink href="/marketing" label="Marketing" leftSection={<IconMailForward size="1rem" stroke={1.5} />} active={pathname === '/marketing'} {...navStyles} />}
          {hasPerm('helpdesk:read') && <NavLink label="Helpdesk" leftSection={<IconLifebuoy size="1rem" stroke={1.5} />} childrenOffset={28} {...navStyles}><NavLink href="/helpdesk" label="Tickets" active={pathname === '/helpdesk'} {...navStyles} />{hasPerm('helpdesk:kb:manage') && <NavLink href="/helpdesk/kb" label="Knowledge Base" active={pathname === '/helpdesk/kb'} {...navStyles} />}</NavLink>}
          {hasPerm('read:inbox') && <NavLink href="/inbox" label="Inbox" leftSection={<IconMail size="1rem" stroke={1.5} />} active={pathname === '/inbox'} {...navStyles} />}
          {(hasPerm('security:read') || hasPerm('system:audit:read')) && (
            <NavLink label="Security & Logs" leftSection={<IconShieldLock size="1rem" stroke={1.5} />} {...navStyles}>
                {hasPerm('security:read') && (
                    <NavLink
                        href="/system/soc"
                        label="SOC Dashboard"
                        leftSection={<IconActivity size="1rem" stroke={1.5} />}
                        active={pathname === '/system/soc'}
                        {...navStyles}
                    />
                )}
                {hasPerm('security:read') && <NavLink href="/security" label="Global Security" leftSection={<IconLock size="1rem" stroke={1.5} />} active={pathname === '/security'} {...navStyles} />}
                {hasPerm('system:audit:read') && <NavLink href="/audit" label="Audit Logs" leftSection={<IconHistory size="1rem" stroke={1.5} />} active={pathname === '/audit'} {...navStyles} />}
            </NavLink>
          )}
          <NavLink label="System" leftSection={<IconSettings size="1rem" stroke={1.5} />} {...navStyles}>
             {hasPerm('system:settings:manage') && (
                 <NavLink
                    href="/system/seo"
                    label="SEO Studio"
                    leftSection={<IconSearch size="1rem" stroke={1.5} />}
                    active={pathname === '/system/seo'}
                    {...navStyles}
                 />
             )}
             {hasPerm('system:settings:manage') && <NavLink href="/system/automation" label="Automation" leftSection={<IconRobot size="1rem" stroke={1.5} />} active={pathname.startsWith('/system/automation')} {...navStyles} />}
             {hasPerm('system:webhooks:read') && <NavLink href="/system/webhooks" label="Webhooks" leftSection={<IconWebhook size="1rem" stroke={1.5} />} active={pathname === '/system/webhooks'} {...navStyles} />}
             {hasPerm('system:cron:manage') && <NavLink href="/system/cron" label="Cron Jobs" leftSection={<IconClock size="1rem" stroke={1.5} />} active={pathname === '/system/cron'} {...navStyles} />}
             {hasPerm('doc:read') && <NavLink href="/system/documentation" label="System Documentation" leftSection={<IconBook size="1rem" stroke={1.5} />} active={pathname === '/system/documentation'} {...navStyles} />}
             {(hasPerm('settings:general:manage') || hasPerm('system:settings:read')) && <NavLink href="/settings" label="Platform Settings" active={pathname === '/settings'} {...navStyles} />}
             {hasPerm('system:monitoring:read') && <NavLink href="/status" label="System Health" active={pathname === '/status'} {...navStyles} />}
             {hasPerm('system:api:read') && <NavLink href="/api-keys" label="API Keys" active={pathname === '/api-keys'} {...navStyles} />}
          </NavLink>
        </AppShell.Section>
      </AppShell.Navbar>

      <AppShell.Main>
        <Group justify="space-between" align="center" h={60} px="md" mb="md" style={{ backgroundColor: 'var(--mantine-color-default)', borderRadius: 'var(--mantine-radius-md)', border: '1px solid var(--mantine-color-default-border)' }}>
          <Group>
            <Popover width={rem(400)} opened={popoverOpened && searchTerm.length > 1} onChange={setPopoverOpened} position="bottom-start" shadow="md" withArrow>
              <Popover.Target>
                <TextInput placeholder="Global Search (Press /)" leftSection={<IconSearch size="1rem" stroke={1.5} />} value={searchTerm} onChange={(event) => setSearchTerm(event.currentTarget.value)} onFocus={() => setIsSearchFocused(true)} onBlur={() => setTimeout(() => setIsSearchFocused(false), 150)} style={{ width: rem(400) }} variant="filled" />
              </Popover.Target>
              <Popover.Dropdown p={rem(5)}>
                <Stack gap={rem(2)}>
                  {searchLoading && <Text c="dimmed" p="sm">Searching...</Text>}
                  {!searchLoading && searchResults.length === 0 && searchTerm.length > 1 && <Text c="dimmed" p="sm">No results found.</Text>}
                  {!searchLoading && searchResults.length > 0 && searchResults.map((result) => (
                        <Anchor component={Link} href={getLink(result)} key={result.id} onClick={() => setIsSearchFocused(false)}>
                          <Group p="xs" style={{ cursor: 'pointer' }} styles={{ root: { '&:hover': { backgroundColor: 'var(--mantine-color-dark-6)' } } }} >
                            <Stack gap={0}><Text size="sm" fw={500}>{result.name || result.email || 'Unknown'}</Text><Group gap={6}><Badge size="xs" variant="light" color="blue">{result.type.replace('_', ' ').toUpperCase()}</Badge>{result.description && <Text size="xs" c="dimmed" lineClamp={1}>{result.description}</Text>}</Group></Stack>
                          </Group>
                        </Anchor>
                    ))}
                </Stack>
              </Popover.Dropdown>
            </Popover>
          </Group>

          <Group gap="sm">
             {isHydrated && userPermissions.includes('own:timesheets') && <GlobalClockWidget />}
             <ActionIcon onClick={toggleColorScheme} variant="default" size="lg" aria-label="Toggle color scheme" style={{ border: '1px solid var(--mantine-color-default-border)' }}>{computedColorScheme === 'dark' ? <IconSun size={18} /> : <IconMoon size={18} />}</ActionIcon>
             <NotificationBell />

             <Menu shadow="md" width={200} withArrow>
              <Menu.Target>
                <Group gap="xs" style={{ cursor: 'pointer', paddingLeft: 10 }}>
                  <UserAvatar user={user} size="md" />
                  <div style={{ flex: 1 }}>
                    <Text size="sm" fw={500} lh={1}>{user?.firstName || 'User'}</Text>
                    <Text size="xs" c="dimmed">Staff</Text>
                  </div>
                  <IconChevronDown size={14} />
                </Group>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Label>My Account</Menu.Label>
                <Menu.Item leftSection={<IconUserCircle size={14} />} component={Link} href={`/users/${user?.userId}`}>Profile</Menu.Item>
                <Menu.Item leftSection={<IconSettings size={14} />} component={Link} href="/settings">Settings</Menu.Item>
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