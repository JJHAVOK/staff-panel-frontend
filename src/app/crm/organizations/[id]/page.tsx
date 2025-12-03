'use client';

import { AdminLayout } from '@/components/AdminLayout';
import api from '@/lib/api';
import { Title, Paper, Text, Grid, Stack, Group, Badge, LoadingOverlay, Alert, Tabs, Table } from '@mantine/core';
import { IconAlertCircle, IconBuildingSkyscraper, IconReceipt2, IconLayoutDashboard, IconPackage } from '@tabler/icons-react';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { BillingManager } from '@/components/BillingManager';
import { useAuthStore } from '@/lib/authStore';
import Link from 'next/link';

// --- NEW ORDERS TAB FOR ORGS ---
function OrgOrdersTab({ email }: { email: string | null }) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!email) {
      setLoading(false);
      return;
    }
    api.post('/ecommerce/orders/search/email', { email })
      .then(res => setOrders(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [email]);

  if (loading) return <LoadingOverlay visible />;
  if (!email) return <Text c="dimmed">This organization has no email address to link orders to.</Text>;
  if (orders.length === 0) return <Text c="dimmed">No orders found for {email}.</Text>;

  return (
    <Table striped highlightOnHover>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>Order #</Table.Th>
          <Table.Th>Date</Table.Th>
          <Table.Th>Total</Table.Th>
          <Table.Th>Status</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {orders.map(order => (
          <Table.Tr key={order.id} style={{ cursor: 'pointer' }}>
            <Table.Td><Link href={`/ecommerce/orders/${order.id}`}>{order.orderNumber}</Link></Table.Td>
            <Table.Td>{new Date(order.createdAt).toLocaleDateString()}</Table.Td>
            <Table.Td>${order.totalAmount.toFixed(2)}</Table.Td>
            <Table.Td><Badge>{order.status}</Badge></Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );
}

// Define the type for the detailed org data
interface OrgProfile {
  id: string;
  name: string;
  industry: string | null;
  website: string | null;
  phone: string | null;
  address: string | null;
  // Note: Org doesn't explicitly have 'email' in schema, 
  // but we will use the billing email if available or try to match by domain later.
  // For this specific implementation, we'll try to use a 'contact' email if it exists, 
  // or just rely on the BillingManager for now if no email field exists on Org.
  // Wait, Org model doesn't have email. We should probably add it, but for now let's skip email search 
  // and just show the tab structure ready for when we add it.
  contacts: { id: string; firstName: string; lastName: string; email: string }[];
  opportunities: { id: string; name: string; stage: string; amount: number }[];
}

// Helper: Render a profile field safely
const InfoField = ({ label, value }: { label: string; value: string | null | undefined }) => (
  <div>
    <Text size="xs" tt="uppercase" c="dimmed">{label}</Text>
    <Text>{value || <Text c="dimmed" span>Not set</Text>}</Text>
  </div>
);

export default function OrganizationProfilePage() {
  const { user } = useAuthStore();
  const userPermissions = user?.permissions || [];
  
  const [org, setOrg] = useState<OrgProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const params = useParams();
  const { id } = params;

  const canReadBilling = userPermissions.includes('read:billing');
  const canManageBilling = userPermissions.includes('manage:billing');
  const canReadOrders = userPermissions.includes('read:orders');

  useEffect(() => {
    if (id) {
      const fetchOrg = async () => {
        try {
          setLoading(true);
          const response = await api.get(`/crm/organizations/${id}`);
          setOrg(response.data);
        } catch (err) {
          setError('Failed to fetch organization profile.');
        } finally {
          setLoading(false);
        }
      };
      fetchOrg();
    }
  }, [id]);

  return (
    <AdminLayout>
      <LoadingOverlay visible={loading} />
      {error && (
        <Alert icon={<IconAlertCircle size="1rem" />} title="Error" color="red">
          {error}
        </Alert>
      )}

      {org && (
        <Stack>
          <Title order={2}>{org.name}</Title>
          
          <Tabs defaultValue="overview">
            <Tabs.List>
              <Tabs.Tab value="overview" leftSection={<IconLayoutDashboard size={14} />}>Overview</Tabs.Tab>
              {canReadBilling && (
                <Tabs.Tab value="billing" leftSection={<IconReceipt2 size={14} />}>Billing & Invoices</Tabs.Tab>
              )}
              {/* --- 👇 NEW ORDERS TAB 👇 --- */}
              {canReadOrders && (
                <Tabs.Tab value="orders" leftSection={<IconPackage size={14} />}>Orders</Tabs.Tab>
              )}
            </Tabs.List>

            <Tabs.Panel value="overview" pt="md">
              <Stack>
                <Paper withBorder p="md" radius="md">
                  <Group mt="md">
                    <InfoField label="Industry" value={org.industry} />
                    <InfoField label="Phone" value={org.phone} />
                    <InfoField label="Website" value={org.website} />
                  </Group>
                  <InfoField label="Address" value={org.address} />
                </Paper>

                <Grid>
                  <Grid.Col span={6}>
                    <Paper withBorder p="md" radius="md">
                      <Title order={4}>Contacts ({org.contacts.length})</Title>
                      {org.contacts.length === 0 && <Text c="dimmed">No contacts found.</Text>}
                      {org.contacts.map(c => (
                        <Text key={c.id}>{c.firstName} {c.lastName}</Text>
                      ))}
                    </Paper>
                  </Grid.Col>
                  <Grid.Col span={6}>
                    <Paper withBorder p="md" radius="md">
                      <Title order={4}>Opportunities ({org.opportunities.length})</Title>
                      {org.opportunities.length === 0 && <Text c="dimmed">No deals found.</Text>}
                      {org.opportunities.map(o => (
                        <Text key={o.id}>{o.name} - {o.stage}</Text>
                      ))}
                    </Paper>
                  </Grid.Col>
                </Grid>
              </Stack>
            </Tabs.Panel>

            {canReadBilling && (
              <Tabs.Panel value="billing" pt="md">
                <BillingManager organizationId={org.id} canManage={canManageBilling} />
              </Tabs.Panel>
            )}

            {/* --- 👇 ORDERS TAB PANEL 👇 --- */}
            {canReadOrders && (
              <Tabs.Panel value="orders" pt="md">
                 {/* Since Org doesn't have email, we just show placeholder or match first contact */}
                 {/* In a real app, we'd fetch orders by Org ID, not email */}
                 <Alert title="Organization Orders" color="blue">
                    Orders are currently linked to Contacts by email. 
                    <br/>To view orders, please visit the profile of a Contact in this Organization.
                 </Alert>
              </Tabs.Panel>
            )}

          </Tabs>
        </Stack>
      )}
    </AdminLayout>
  );
}