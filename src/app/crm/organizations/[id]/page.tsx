'use client';

import { AdminLayout } from '@/components/AdminLayout';
import api from '@/lib/api';
import { 
  Title, Paper, Text, Grid, Stack, Group, Badge, LoadingOverlay, Alert, Tabs, 
  Table, Button, Menu, ActionIcon, Modal, TextInput 
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { 
  IconAlertCircle, IconBuildingSkyscraper, IconReceipt2, IconLayoutDashboard, 
  IconPackage, IconArrowLeft, IconDots, IconPencil, IconTrash 
} from '@tabler/icons-react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { BillingManager } from '@/components/BillingManager';
import { useAuthStore } from '@/lib/authStore';
import Link from 'next/link';
import { modals } from '@mantine/modals';

// --- COMPONENTS ---
function OrgOrdersTab({ email }: { email: string | null }) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!email) { setLoading(false); return; }
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

const InfoField = ({ label, value }: { label: string; value: string | null | undefined }) => (
  <div>
    <Text size="xs" tt="uppercase" c="dimmed">{label}</Text>
    <Text>{value || <Text c="dimmed" span>Not set</Text>}</Text>
  </div>
);

export default function OrganizationProfilePage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const userPermissions = user?.permissions || [];
  
  const [org, setOrg] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const params = useParams();
  const { id } = params;

  // Modals
  const [editModalOpen, { open: openEdit, close: closeEdit }] = useDisclosure(false);

  const editForm = useForm({
    initialValues: { name: '', industry: '', website: '', phone: '', address: '' },
    validate: { name: (val) => (val.length < 1 ? 'Name required' : null) },
  });

  const canUpdate = userPermissions.includes('crm:orgs:update');
  const canDelete = userPermissions.includes('crm:orgs:delete');
  const canReadBilling = userPermissions.includes('read:billing');
  const canManageBilling = userPermissions.includes('manage:billing');
  const canReadOrders = userPermissions.includes('read:orders');

  const fetchOrg = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/crm/organizations/${id}`);
      setOrg(response.data);
      // Set form values
      editForm.setValues({
        name: response.data.name,
        industry: response.data.industry || '',
        website: response.data.website || '',
        phone: response.data.phone || '',
        address: response.data.address || '',
      });
    } catch (err) {
      setError('Failed to fetch organization profile.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (id) fetchOrg(); }, [id]);

  // Actions
  const handleUpdate = async (values: typeof editForm.values) => {
    try {
      await api.patch(`/crm/organizations/${id}`, values);
      notifications.show({ title: 'Success', message: 'Organization updated.', color: 'green' });
      closeEdit();
      fetchOrg();
    } catch (e) {
      notifications.show({ title: 'Error', message: 'Update failed.', color: 'red' });
    }
  };

  const handleDelete = () => {
    modals.openConfirmModal({
      title: 'Delete Organization',
      children: <Text size="sm">Are you sure you want to delete <b>{org.name}</b>?</Text>,
      labels: { confirm: 'Delete', cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await api.delete(`/crm/organizations/${id}`);
          notifications.show({ title: 'Deleted', message: 'Organization removed.', color: 'green' });
          router.push('/crm/organizations');
        } catch (e) { notifications.show({ title: 'Error', message: 'Delete failed.', color: 'red' }); }
      }
    });
  };

  return (
    <AdminLayout>
      <LoadingOverlay visible={loading} />
      {error && <Alert icon={<IconAlertCircle size="1rem" />} title="Error" color="red">{error}</Alert>}

      {/* Edit Modal */}
      <Modal opened={editModalOpen} onClose={closeEdit} title="Edit Organization">
        <form onSubmit={editForm.onSubmit(handleUpdate)}>
          <Stack>
            <TextInput label="Name" required {...editForm.getInputProps('name')} />
            <TextInput label="Industry" {...editForm.getInputProps('industry')} />
            <TextInput label="Website" {...editForm.getInputProps('website')} />
            <TextInput label="Phone" {...editForm.getInputProps('phone')} />
            <TextInput label="Address" {...editForm.getInputProps('address')} />
            <Button type="submit">Save Changes</Button>
          </Stack>
        </form>
      </Modal>

      {org && (
        <Stack>
          {/* --- HEADER WITH BACK BUTTON & ACTIONS --- */}
          <Group justify="space-between" mb="md">
            <Button variant="subtle" leftSection={<IconArrowLeft size={16} />} onClick={() => router.back()}>
               Back
            </Button>
            {(canUpdate || canDelete) && (
               <Menu shadow="md" width={200}>
                 <Menu.Target>
                   <Button variant="default" leftSection={<IconDots size={16} />}>Actions</Button>
                 </Menu.Target>
                 <Menu.Dropdown>
                   {canUpdate && <Menu.Item leftSection={<IconPencil size={14} />} onClick={openEdit}>Edit Details</Menu.Item>}
                   <Menu.Divider />
                   {canDelete && <Menu.Item color="red" leftSection={<IconTrash size={14} />} onClick={handleDelete}>Delete Organization</Menu.Item>}
                 </Menu.Dropdown>
               </Menu>
            )}
          </Group>

          <Title order={2}>{org.name}</Title>
          
          <Tabs defaultValue="overview">
            <Tabs.List>
              <Tabs.Tab value="overview" leftSection={<IconLayoutDashboard size={14} />}>Overview</Tabs.Tab>
              {canReadBilling && (
                <Tabs.Tab value="billing" leftSection={<IconReceipt2 size={14} />}>Billing & Invoices</Tabs.Tab>
              )}
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
                      {/* --- CLICKABLE CONTACTS --- */}
                      <Stack gap="xs" mt="sm">
                        {org.contacts.map((c: any) => (
                          <Paper 
                            key={c.id} withBorder p="xs" 
                            style={{ cursor: 'pointer' }}
                            onClick={() => router.push(`/crm/contacts/${c.id}`)} // Link to Contact Page
                          >
                            <Text size="sm" fw={500}>{c.firstName} {c.lastName}</Text>
                            <Text size="xs" c="dimmed">{c.email}</Text>
                          </Paper>
                        ))}
                      </Stack>
                    </Paper>
                  </Grid.Col>
                  <Grid.Col span={6}>
                    <Paper withBorder p="md" radius="md">
                      <Title order={4}>Opportunities ({org.opportunities.length})</Title>
                      {org.opportunities.length === 0 && <Text c="dimmed">No deals found.</Text>}
                      {/* --- CLICKABLE OPPORTUNITIES --- */}
                      <Stack gap="xs" mt="sm">
                        {org.opportunities.map((o: any) => (
                          <Paper 
                             key={o.id} withBorder p="xs"
                             style={{ cursor: 'pointer' }}
                             onClick={() => router.push(`/crm/opportunities/${o.id}`)} // Link to Deal Page
                          >
                            <Group justify="space-between">
                               <Text size="sm" fw={500}>{o.name}</Text>
                               <Badge size="xs">{o.stage}</Badge>
                            </Group>
                            <Text size="xs" c="dimmed">${o.amount.toLocaleString()}</Text>
                          </Paper>
                        ))}
                      </Stack>
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

            {canReadOrders && (
              <Tabs.Panel value="orders" pt="md">
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