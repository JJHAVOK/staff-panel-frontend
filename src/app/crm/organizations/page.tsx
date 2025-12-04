'use client';

import { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import {
  Title, Button, Group, Table, Modal, TextInput, Stack, Paper, LoadingOverlay, Alert, Menu, ActionIcon, Anchor, Text
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconPlus, IconTrash, IconPencil, IconDots, IconBuildingSkyscraper } from '@tabler/icons-react';
import api from '@/lib/api';
import { useDisclosure } from '@mantine/hooks';
import { useAuthStore } from '@/lib/authStore';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { modals } from '@mantine/modals';

export default function OrganizationsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const userPermissions = user?.permissions || [];

  const canRead = userPermissions.includes('crm:orgs:read');
  const canCreate = userPermissions.includes('crm:orgs:create');
  const canUpdate = userPermissions.includes('crm:orgs:update');
  const canDelete = userPermissions.includes('crm:orgs:delete');

  const [orgs, setOrgs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [createModalOpen, { open: openCreate, close: closeCreate }] = useDisclosure(false);
  const [editModalOpen, { open: openEdit, close: closeEdit }] = useDisclosure(false);
  const [selectedOrg, setSelectedOrg] = useState<any>(null);

  const createForm = useForm({
    initialValues: { name: '', industry: '', website: '', phone: '', address: '' },
    validate: { name: (v) => (v.trim().length > 0 ? null : 'Name required') },
  });

  const editForm = useForm({
    initialValues: { name: '', industry: '', website: '', phone: '', address: '' },
  });

  const fetchData = useCallback(async () => {
    if (!canRead) return;
    setLoading(true);
    try {
      const res = await api.get('/crm/organizations');
      setOrgs(res.data);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, [canRead]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreate = async (values: typeof createForm.values) => {
    try {
      await api.post('/crm/organizations', values);
      notifications.show({ title: 'Success', message: 'Organization created.', color: 'green' });
      closeCreate(); createForm.reset(); fetchData();
    } catch (e) { notifications.show({ title: 'Error', message: 'Failed to create organization.', color: 'red' }); }
  };

  const handleUpdate = async (values: typeof editForm.values) => {
    try {
      await api.patch(`/crm/organizations/${selectedOrg.id}`, values);
      notifications.show({ title: 'Success', message: 'Organization updated.', color: 'green' });
      closeEdit(); fetchData();
    } catch (e) { notifications.show({ title: 'Error', message: 'Update failed.', color: 'red' }); }
  };

  const handleDelete = (org: any) => {
    modals.openConfirmModal({
      title: 'Delete Organization',
      children: <Text size="sm">Delete <b>{org.name}</b>? This action is irreversible.</Text>,
      labels: { confirm: 'Delete', cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await api.delete(`/crm/organizations/${org.id}`);
          notifications.show({ title: 'Deleted', message: 'Organization removed.', color: 'green' });
          fetchData();
        } catch (e) { notifications.show({ title: 'Error', message: 'Delete failed.', color: 'red' }); }
      }
    });
  };

  const openEditModal = (org: any) => {
    setSelectedOrg(org);
    editForm.setValues({
      name: org.name, industry: org.industry || '', website: org.website || '', phone: org.phone || '', address: org.address || ''
    });
    openEdit();
  };

  const rows = orgs.map((org) => (
    <Table.Tr key={org.id} style={{ cursor: 'pointer' }} onClick={() => router.push(`/crm/organizations/${org.id}`)}>
      <Table.Td fw={500}>{org.name}</Table.Td>
      <Table.Td>{org.industry || '-'}</Table.Td>
      <Table.Td>{org._count?.contacts || 0}</Table.Td>
      <Table.Td>{org._count?.opportunities || 0}</Table.Td>
      <Table.Td onClick={(e) => e.stopPropagation()}>
        {(canUpdate || canDelete) && (
           <Menu shadow="md" width={200}>
             <Menu.Target><ActionIcon variant="subtle"><IconDots size={16} /></ActionIcon></Menu.Target>
             <Menu.Dropdown>
               <Menu.Label>Actions</Menu.Label>
               {canUpdate && <Menu.Item leftSection={<IconPencil size={14}/>} onClick={() => openEditModal(org)}>Edit Organization</Menu.Item>}
               {canDelete && <Menu.Item color="red" leftSection={<IconTrash size={14}/>} onClick={() => handleDelete(org)}>Delete Organization</Menu.Item>}
             </Menu.Dropdown>
           </Menu>
        )}
      </Table.Td>
    </Table.Tr>
  ));

  if (!canRead) return <AdminLayout><Alert color="red">Access Denied</Alert></AdminLayout>;

  return (
    <AdminLayout>
      <Modal opened={createModalOpen} onClose={closeCreate} title="Create Organization">
        <form onSubmit={createForm.onSubmit(handleCreate)}>
          <Stack>
            <TextInput label="Name" required {...createForm.getInputProps('name')} />
            <TextInput label="Industry" {...createForm.getInputProps('industry')} />
            <TextInput label="Website" {...createForm.getInputProps('website')} />
            <TextInput label="Phone" {...createForm.getInputProps('phone')} />
            <TextInput label="Address" {...createForm.getInputProps('address')} />
            <Button type="submit">Create</Button>
          </Stack>
        </form>
      </Modal>

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

      <Group justify="space-between" mb="xl">
        <Group>
           <IconBuildingSkyscraper size={32} />
           <Title order={2}>Organizations</Title>
        </Group>
        {canCreate && <Button leftSection={<IconPlus size={16}/>} onClick={openCreate}>New Organization</Button>}
      </Group>

      <Paper withBorder radius="md">
        <LoadingOverlay visible={loading} />
        <Table striped highlightOnHover>
          <Table.Thead><Table.Tr><Table.Th>Name</Table.Th><Table.Th>Industry</Table.Th><Table.Th>Contacts</Table.Th><Table.Th>Deals</Table.Th><Table.Th>Actions</Table.Th></Table.Tr></Table.Thead>
          <Table.Tbody>{rows}</Table.Tbody>
        </Table>
      </Paper>
    </AdminLayout>
  );
}