'use client';

import { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import {
  Title, Button, Group, Table, Modal, TextInput, Stack, Paper, LoadingOverlay, Alert, Select, Menu, ActionIcon, Anchor, Text
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconPlus, IconTrash, IconPencil, IconDots, IconUser } from '@tabler/icons-react';
import api from '@/lib/api';
import { useDisclosure } from '@mantine/hooks';
import { useAuthStore } from '@/lib/authStore';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { modals } from '@mantine/modals';

export default function ContactsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const userPermissions = user?.permissions || [];

  // Granular Permissions
  const canRead = userPermissions.includes('crm:contacts:read');
  const canCreate = userPermissions.includes('crm:contacts:create');
  const canUpdate = userPermissions.includes('crm:contacts:update');
  const canDelete = userPermissions.includes('crm:contacts:delete');

  const [contacts, setContacts] = useState<any[]>([]);
  const [orgs, setOrgs] = useState<any[]>([]); // For dropdown
  const [loading, setLoading] = useState(true);
  
  // Modals
  const [createModalOpen, { open: openCreate, close: closeCreate }] = useDisclosure(false);
  const [editModalOpen, { open: openEdit, close: closeEdit }] = useDisclosure(false);
  const [selectedContact, setSelectedContact] = useState<any>(null);

  // Forms
  const createForm = useForm({
    initialValues: { firstName: '', lastName: '', email: '', title: '', phone: '', organizationId: '' },
    validate: { 
      firstName: (v) => (v.length < 1 ? 'Required' : null),
      email: (v) => (/^\S+@\S+$/.test(v) ? null : 'Invalid email')
    },
  });

  const editForm = useForm({
    initialValues: { firstName: '', lastName: '', email: '', title: '', phone: '', organizationId: '' },
  });

  const fetchData = useCallback(async () => {
    if (!canRead) return;
    setLoading(true);
    try {
      const [contactsRes, orgsRes] = await Promise.all([
        api.get('/crm/contacts'),
        api.get('/crm/organizations'),
      ]);
      setContacts(contactsRes.data);
      setOrgs(orgsRes.data.map((o:any) => ({ value: o.id, label: o.name })));
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, [canRead]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreate = async (values: typeof createForm.values) => {
    try {
      await api.post('/crm/contacts', values);
      notifications.show({ title: 'Success', message: 'Contact created.', color: 'green' });
      closeCreate(); createForm.reset(); fetchData();
    } catch (e) { notifications.show({ title: 'Error', message: 'Failed to create contact.', color: 'red' }); }
  };

  const handleUpdate = async (values: typeof editForm.values) => {
    try {
      // Handle unlinking organization if empty
      const payload = { ...values, organizationId: values.organizationId || null };
      await api.patch(`/crm/contacts/${selectedContact.id}`, payload);
      notifications.show({ title: 'Success', message: 'Contact updated.', color: 'green' });
      closeEdit(); fetchData();
    } catch (e) { notifications.show({ title: 'Error', message: 'Update failed.', color: 'red' }); }
  };

  const handleDelete = (contact: any) => {
    modals.openConfirmModal({
      title: 'Delete Contact',
      children: <Text size="sm">Are you sure you want to delete <b>{contact.firstName} {contact.lastName}</b>?</Text>,
      labels: { confirm: 'Delete', cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await api.delete(`/crm/contacts/${contact.id}`);
          notifications.show({ title: 'Deleted', message: 'Contact removed.', color: 'green' });
          fetchData();
        } catch (e) { notifications.show({ title: 'Error', message: 'Delete failed.', color: 'red' }); }
      }
    });
  };

  const openEditModal = (contact: any) => {
    setSelectedContact(contact);
    editForm.setValues({
      firstName: contact.firstName, lastName: contact.lastName, email: contact.email,
      title: contact.title || '', phone: contact.phone || '', 
      organizationId: contact.organization?.id || ''
    });
    openEdit();
  };

  const rows = contacts.map((c) => (
    <Table.Tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => router.push(`/crm/contacts/${c.id}`)}>
      <Table.Td fw={500}>{c.firstName} {c.lastName}</Table.Td>
      <Table.Td>{c.email}</Table.Td>
      <Table.Td>{c.title || '-'}</Table.Td>
      <Table.Td>{c.organization ? <Anchor component={Link} href={`/crm/organizations/${c.organization.id}`} onClick={(e) => e.stopPropagation()}>{c.organization.name}</Anchor> : '-'}</Table.Td>
      <Table.Td onClick={(e) => e.stopPropagation()}>
        {(canUpdate || canDelete) && (
           <Menu shadow="md" width={200}>
             <Menu.Target><ActionIcon variant="subtle"><IconDots size={16} /></ActionIcon></Menu.Target>
             <Menu.Dropdown>
               <Menu.Label>Actions</Menu.Label>
               {canUpdate && <Menu.Item leftSection={<IconPencil size={14}/>} onClick={() => openEditModal(c)}>Edit Contact</Menu.Item>}
               {canDelete && <Menu.Item color="red" leftSection={<IconTrash size={14}/>} onClick={() => handleDelete(c)}>Delete Contact</Menu.Item>}
             </Menu.Dropdown>
           </Menu>
        )}
      </Table.Td>
    </Table.Tr>
  ));

  if (!canRead) return <AdminLayout><Alert color="red">Access Denied</Alert></AdminLayout>;

  return (
    <AdminLayout>
      <Modal opened={createModalOpen} onClose={closeCreate} title="Create Contact">
        <form onSubmit={createForm.onSubmit(handleCreate)}>
          <Stack>
            <Group grow><TextInput label="First Name" required {...createForm.getInputProps('firstName')} /><TextInput label="Last Name" required {...createForm.getInputProps('lastName')} /></Group>
            <TextInput label="Email" required {...createForm.getInputProps('email')} />
            <TextInput label="Title" {...createForm.getInputProps('title')} />
            <Select label="Organization" data={orgs} searchable clearable {...createForm.getInputProps('organizationId')} />
            <Button type="submit">Create</Button>
          </Stack>
        </form>
      </Modal>

      <Modal opened={editModalOpen} onClose={closeEdit} title="Edit Contact">
        <form onSubmit={editForm.onSubmit(handleUpdate)}>
          <Stack>
            <Group grow><TextInput label="First Name" required {...editForm.getInputProps('firstName')} /><TextInput label="Last Name" required {...editForm.getInputProps('lastName')} /></Group>
            <TextInput label="Email" required {...editForm.getInputProps('email')} />
            <TextInput label="Title" {...editForm.getInputProps('title')} />
            <Select label="Organization" data={orgs} searchable clearable {...editForm.getInputProps('organizationId')} />
            <Button type="submit">Save Changes</Button>
          </Stack>
        </form>
      </Modal>

      <Group justify="space-between" mb="xl">
        <Title order={2}>Contacts</Title>
        {canCreate && <Button leftSection={<IconPlus size={16}/>} onClick={openCreate}>Add Contact</Button>}
      </Group>

      <Paper withBorder radius="md">
        <LoadingOverlay visible={loading} />
        <Table striped highlightOnHover>
          <Table.Thead><Table.Tr><Table.Th>Name</Table.Th><Table.Th>Email</Table.Th><Table.Th>Title</Table.Th><Table.Th>Organization</Table.Th><Table.Th>Actions</Table.Th></Table.Tr></Table.Thead>
          <Table.Tbody>{rows}</Table.Tbody>
        </Table>
      </Paper>
    </AdminLayout>
  );
}
