'use client';

import { AdminLayout } from '@/components/AdminLayout';
import api from '@/lib/api';
import { Title, Paper, Text, Grid, Stack, Group, LoadingOverlay, Alert, Tabs, Table, Badge } from '@mantine/core';
import { IconAlertCircle, IconUser, IconReceipt2, IconPackage } from '@tabler/icons-react';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { BillingManager } from '@/components/BillingManager';
import { useAuthStore } from '@/lib/authStore';
import Link from 'next/link';

// --- NEW ORDERS TAB COMPONENT ---
function ContactOrdersTab({ email }: { email: string }) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.post('/ecommerce/orders/search/email', { email })
      .then(res => setOrders(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [email]);

  if (loading) return <LoadingOverlay visible />;
  if (orders.length === 0) return <Text c="dimmed">No orders found for this email.</Text>;

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

export default function ContactProfilePage() {
  const { user } = useAuthStore();
  const userPermissions = user?.permissions || [];
  const [contact, setContact] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { id } = useParams();

  useEffect(() => {
    if (id) {
      api.get(`/crm/contacts/${id}`)
        .then(res => setContact(res.data))
        .catch(() => setError('Failed to fetch contact.'))
        .finally(() => setLoading(false));
    }
  }, [id]);

  return (
    <AdminLayout>
      <LoadingOverlay visible={loading} />
      {error && <Alert color="red">{error}</Alert>}

      {contact && (
        <Stack>
          <Title order={2}>{contact.firstName} {contact.lastName}</Title>
          
          <Tabs defaultValue="overview">
            <Tabs.List>
              <Tabs.Tab value="overview" leftSection={<IconUser size={14} />}>Overview</Tabs.Tab>
              {userPermissions.includes('read:billing') && (
                <Tabs.Tab value="billing" leftSection={<IconReceipt2 size={14} />}>Billing</Tabs.Tab>
              )}
              {userPermissions.includes('read:orders') && (
                <Tabs.Tab value="orders" leftSection={<IconPackage size={14} />}>Orders</Tabs.Tab>
              )}
            </Tabs.List>

            <Tabs.Panel value="overview" pt="md">
               <Paper withBorder p="md" radius="md">
                 <Group>
                   <Text fw={700}>Email:</Text><Text>{contact.email}</Text>
                 </Group>
                 <Group mt="xs">
                   <Text fw={700}>Phone:</Text><Text>{contact.phone || '-'}</Text>
                 </Group>
                 {/* Add more contact details here */}
               </Paper>
            </Tabs.Panel>

            {userPermissions.includes('read:billing') && (
              <Tabs.Panel value="billing" pt="md">
                {contact.organizationId ? (
                  <BillingManager organizationId={contact.organizationId} canManage={userPermissions.includes('manage:billing')} />
                ) : (
                  <Alert color="blue" title="No Organization">
                    Billing is linked to Organizations. This contact is not linked to one.
                  </Alert>
                )}
              </Tabs.Panel>
            )}

            {userPermissions.includes('read:orders') && (
              <Tabs.Panel value="orders" pt="md">
                 <ContactOrdersTab email={contact.email} />
              </Tabs.Panel>
            )}
          </Tabs>
        </Stack>
      )}
    </AdminLayout>
  );
}