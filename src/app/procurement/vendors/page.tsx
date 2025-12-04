'use client';

import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import {
  Title, Button, Group, Table, Modal, TextInput, Stack, Paper, LoadingOverlay, ActionIcon, Menu, Text
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconPlus, IconTrash, IconBuildingStore, IconDots, IconPencil } from '@tabler/icons-react';
import api from '@/lib/api';
import { useDisclosure } from '@mantine/hooks';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/authStore';

export default function VendorsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const userPermissions = user?.permissions || [];

  // Permissions
  const canRead = userPermissions.includes('procurement:vendors:read');
  const canCreate = userPermissions.includes('procurement:vendors:create');
  const canUpdate = userPermissions.includes('procurement:vendors:update');
  const canDelete = userPermissions.includes('procurement:vendors:delete');

  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, { open, close }] = useDisclosure(false);
  const [editingVendor, setEditingVendor] = useState<any>(null);

  const form = useForm({
    initialValues: { name: '', email: '', phone: '', website: '' },
    validate: { name: (val) => (val.length < 2 ? 'Name required' : null) },
  });

  const fetchData = async () => {
    if (!canRead) return;
    setLoading(true);
    try {
      const res = await api.get('/procurement/vendors');
      setVendors(res.data);
    } catch (e) {} finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [canRead]);

  const handleSubmit = async (values: typeof form.values) => {
    try {
      if (editingVendor) {
        await api.patch(`/procurement/vendors/${editingVendor.id}`, values);
        notifications.show({ title: 'Success', message: 'Vendor updated.', color: 'green' });
      } else {
        await api.post('/procurement/vendors', values);
        notifications.show({ title: 'Success', message: 'Vendor created.', color: 'green' });
      }
      close(); form.reset(); setEditingVendor(null); fetchData();
    } catch (e) { notifications.show({ title: 'Error', message: 'Operation failed.', color: 'red' }); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete vendor?')) return;
    try { await api.delete(`/procurement/vendors/${id}`); fetchData(); } catch(e) {}
  };

  const openModal = (vendor: any = null) => {
    setEditingVendor(vendor);
    if (vendor) form.setValues(vendor);
    else form.reset();
    open();
  };

  const rows = vendors.map((v) => (
    <Table.Tr key={v.id} style={{ cursor: 'pointer' }} onClick={() => router.push(`/procurement/vendors/${v.id}`)}>
      <Table.Td fw={500}>{v.name}</Table.Td>
      <Table.Td>{v.email || '-'}</Table.Td>
      <Table.Td>{v.phone || '-'}</Table.Td>
      <Table.Td onClick={(e) => e.stopPropagation()}>
        {(canUpdate || canDelete) && (
          <Menu shadow="md" width={200}>
            <Menu.Target><ActionIcon variant="subtle"><IconDots size={16}/></ActionIcon></Menu.Target>
            <Menu.Dropdown>
              {canUpdate && <Menu.Item leftSection={<IconPencil size={14}/>} onClick={() => openModal(v)}>Edit Vendor</Menu.Item>}
              {canDelete && <Menu.Item color="red" leftSection={<IconTrash size={14}/>} onClick={() => handleDelete(v.id)}>Delete Vendor</Menu.Item>}
            </Menu.Dropdown>
          </Menu>
        )}
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <AdminLayout>
      <Modal opened={modalOpen} onClose={close} title={editingVendor ? "Edit Vendor" : "Add Vendor"}>
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack>
            <TextInput label="Company Name" required {...form.getInputProps('name')} />
            <TextInput label="Email" {...form.getInputProps('email')} />
            <TextInput label="Phone" {...form.getInputProps('phone')} />
            <TextInput label="Website" {...form.getInputProps('website')} />
            <Button type="submit">Save</Button>
          </Stack>
        </form>
      </Modal>

      <Group justify="space-between" mb="xl">
        <Group><IconBuildingStore size={32}/><Title order={2}>Vendors</Title></Group>
        {canCreate && <Button leftSection={<IconPlus size={16}/>} onClick={() => openModal()}>Add Vendor</Button>}
      </Group>

      <Paper withBorder radius="md">
        <LoadingOverlay visible={loading} />
        <Table striped highlightOnHover>
          <Table.Thead><Table.Tr><Table.Th>Name</Table.Th><Table.Th>Email</Table.Th><Table.Th>Phone</Table.Th><Table.Th>Action</Table.Th></Table.Tr></Table.Thead>
          <Table.Tbody>{rows}</Table.Tbody>
        </Table>
      </Paper>
    </AdminLayout>
  );
}
