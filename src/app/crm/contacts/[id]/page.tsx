'use client';

import { AdminLayout } from '@/components/AdminLayout';
import api from '@/lib/api';
import { Title, Paper, Text, Grid, Stack, Group, LoadingOverlay, Alert, Tabs, Table, Badge, Button, Menu, ActionIcon, Modal, TextInput, Select } from '@mantine/core';
import { IconAlertCircle, IconUser, IconReceipt2, IconPackage, IconArrowLeft, IconDots, IconPencil, IconTrash } from '@tabler/icons-react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { BillingManager } from '@/components/BillingManager';
import { useAuthStore } from '@/lib/authStore';
import Link from 'next/link';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { modals } from '@mantine/modals';

function ContactOrdersTab({ email }: { email: string }) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api.post('/ecommerce/orders/search/email', { email }).then(res => setOrders(res.data)).catch(() => {}).finally(() => setLoading(false));
  }, [email]);
  if (loading) return <LoadingOverlay visible />;
  if (orders.length === 0) return <Text c="dimmed">No orders found for this email.</Text>;
  return (
    <Table striped highlightOnHover>
      <Table.Thead><Table.Tr><Table.Th>Order #</Table.Th><Table.Th>Date</Table.Th><Table.Th>Total</Table.Th><Table.Th>Status</Table.Th></Table.Tr></Table.Thead>
      <Table.Tbody>{orders.map(order => (<Table.Tr key={order.id}><Table.Td><Link href={`/ecommerce/orders/${order.id}`}>{order.orderNumber}</Link></Table.Td><Table.Td>{new Date(order.createdAt).toLocaleDateString()}</Table.Td><Table.Td>${order.totalAmount.toFixed(2)}</Table.Td><Table.Td><Badge>{order.status}</Badge></Table.Td></Table.Tr>))}</Table.Tbody>
    </Table>
  );
}

export default function ContactProfilePage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const userPermissions = user?.permissions || [];
  const { id } = useParams();

  const [contact, setContact] = useState<any>(null);
  const [orgs, setOrgs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editModalOpen, { open: openEdit, close: closeEdit }] = useDisclosure(false);
  
  const editForm = useForm({
    initialValues: { firstName: '', lastName: '', email: '', title: '', phone: '', organizationId: '' },
  });

  const canUpdate = userPermissions.includes('crm:contacts:update');
  const canDelete = userPermissions.includes('crm:contacts:delete');

  const fetchContact = async () => {
    try {
      setLoading(true);
      const [cRes, oRes] = await Promise.all([
         api.get(`/crm/contacts/${id}`),
         api.get('/crm/organizations')
      ]);
      setContact(cRes.data);
      setOrgs(oRes.data.map((o:any) => ({ value: o.id, label: o.name })));
      
      editForm.setValues({
        firstName: cRes.data.firstName, lastName: cRes.data.lastName, email: cRes.data.email,
        title: cRes.data.title || '', phone: cRes.data.phone || '', 
        organizationId: cRes.data.organizationId || ''
      });
    } catch (err) { setError('Failed to fetch contact.'); } finally { setLoading(false); }
  };

  useEffect(() => { if (id) fetchContact(); }, [id]);

  const handleUpdate = async (values: typeof editForm.values) => {
    try {
      await api.patch(`/crm/contacts/${id}`, values);
      notifications.show({ title: 'Success', message: 'Contact updated.', color: 'green' });
      closeEdit(); fetchContact();
    } catch (e) { notifications.show({ title: 'Error', message: 'Update failed.', color: 'red' }); }
  };

  const handleDelete = () => {
    modals.openConfirmModal({
      title: 'Delete Contact',
      children: <Text size="sm">Are you sure you want to delete <b>{contact.firstName}</b>?</Text>,
      labels: { confirm: 'Delete', cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await api.delete(`/crm/contacts/${id}`);
          notifications.show({ title: 'Deleted', message: 'Contact removed.', color: 'green' });
          router.push('/crm/contacts');
        } catch (e) { notifications.show({ title: 'Error', message: 'Delete failed.', color: 'red' }); }
      }
    });
  };

  return (
    <AdminLayout>
      <LoadingOverlay visible={loading} />
      {error && <Alert color="red">{error}</Alert>}

      <Modal opened={editModalOpen} onClose={closeEdit} title="Edit Contact">
        <form onSubmit={editForm.onSubmit(handleUpdate)}>
          <Stack>
            <Group grow><TextInput label="First Name" {...editForm.getInputProps('firstName')} /><TextInput label="Last Name" {...editForm.getInputProps('lastName')} /></Group>
            <TextInput label="Email" {...editForm.getInputProps('email')} />
            <TextInput label="Title" {...editForm.getInputProps('title')} />
            <TextInput label="Phone" {...editForm.getInputProps('phone')} />
            <Select label="Organization" data={orgs} searchable clearable {...editForm.getInputProps('organizationId')} />
            <Button type="submit">Save Changes</Button>
          </Stack>
        </form>
      </Modal>

      {contact && (
        <Stack>
          <Group justify="space-between">
             <Button variant="subtle" leftSection={<IconArrowLeft size={16} />} onClick={() => router.back()}>Back</Button>
             {(canUpdate || canDelete) && (
               <Menu shadow="md" width={200}>
                 <Menu.Target><Button variant="default" leftSection={<IconDots size={16} />}>Actions</Button></Menu.Target>
                 <Menu.Dropdown>
                   {canUpdate && <Menu.Item leftSection={<IconPencil size={14} />} onClick={openEdit}>Edit Details</Menu.Item>}
                   {canDelete && <Menu.Item color="red" leftSection={<IconTrash size={14} />} onClick={handleDelete}>Delete Contact</Menu.Item>}
                 </Menu.Dropdown>
               </Menu>
             )}
          </Group>

          <Title order={2}>{contact.firstName} {contact.lastName}</Title>
          
          <Tabs defaultValue="overview">
            <Tabs.List>
              <Tabs.Tab value="overview" leftSection={<IconUser size={14} />}>Overview</Tabs.Tab>
              {userPermissions.includes('read:billing') && <Tabs.Tab value="billing" leftSection={<IconReceipt2 size={14} />}>Billing</Tabs.Tab>}
              {userPermissions.includes('read:orders') && <Tabs.Tab value="orders" leftSection={<IconPackage size={14} />}>Orders</Tabs.Tab>}
            </Tabs.List>

            <Tabs.Panel value="overview" pt="md">
               <Paper withBorder p="md" radius="md">
                 <Group><Text fw={700}>Email:</Text><Text>{contact.email}</Text></Group>
                 <Group mt="xs"><Text fw={700}>Phone:</Text><Text>{contact.phone || '-'}</Text></Group>
                 <Group mt="xs"><Text fw={700}>Org:</Text><Text>{contact.organization?.name || '-'}</Text></Group>
               </Paper>
            </Tabs.Panel>

            {userPermissions.includes('read:billing') && (
              <Tabs.Panel value="billing" pt="md">
                {contact.organizationId ? <BillingManager organizationId={contact.organizationId} canManage={userPermissions.includes('manage:billing')} /> : <Alert>No Organization Linked</Alert>}
              </Tabs.Panel>
            )}

            {userPermissions.includes('read:orders') && (
              <Tabs.Panel value="orders" pt="md"><ContactOrdersTab email={contact.email} /></Tabs.Panel>
            )}
          </Tabs>
        </Stack>
      )}
    </AdminLayout>
  );
}