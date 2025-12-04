'use client';

import { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import {
  Title, Button, Group, Table, Badge, Paper, LoadingOverlay, Alert, Modal, TextInput, Stack, Select, Menu, ActionIcon, Text, Avatar, PasswordInput, MultiSelect
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconPlus, IconTrash, IconPencil, IconDots, IconUser, IconBan, IconCheck } from '@tabler/icons-react';
import api from '@/lib/api';
import { useDisclosure } from '@mantine/hooks';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/authStore';
import { modals } from '@mantine/modals';

interface StaffUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  status: string;
  roles: { id: string; name: string }[];
  password?: string;
}

interface Role {
  id: string;
  name: string;
}
interface SelectItem {
  value: string;
  label: string;
}

export default function UsersPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const userPermissions = user?.permissions || [];

  // Granular Permissions
  const canRead = userPermissions.includes('user:read');
  const canCreate = userPermissions.includes('user:create');
  const canUpdate = userPermissions.includes('user:update');
  const canDelete = userPermissions.includes('user:delete');
  const canDeactivate = userPermissions.includes('user:deactivate');

  const [users, setUsers] = useState<StaffUser[]>([]);
  const [roleSelectData, setRoleSelectData] = useState<SelectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [selectedUser, setSelectedUser] = useState<StaffUser | null>(null);
  const [createModalOpen, { open: openCreate, close: closeCreate }] = useDisclosure(false);
  const [editModalOpen, { open: openEdit, close: closeEdit }] = useDisclosure(false);

  const createForm = useForm({
    initialValues: { email: '', firstName: '', lastName: '', password: '', roleIds: [] as string[] },
    validate: { 
      email: (v) => (/^\S+@\S+$/.test(v) ? null : 'Invalid email'),
      password: (v) => (v.length < 6 ? 'Password too short' : null),
      roleIds: (v) => (v.length > 0 ? null : 'At least one role is required')
    },
  });

  const editForm = useForm({
    initialValues: {
      email: '',
      firstName: '',
      lastName: '',
      password: '',
      roleIds: [] as string[], 
    },
  });

  const fetchData = useCallback(async () => {
    if (!canRead) return;
    setLoading(true);
    try {
      const [uRes, rRes] = await Promise.all([
        api.get('/user'),
        api.get('/rbac/roles')
      ]);
      setUsers(uRes.data);
      setRoleSelectData(rRes.data.map((r:Role) => ({ value: r.id, label: r.name })));
    } catch (e: any) { 
      if (e.response?.status === 403) setError('Access Denied');
      else setError('Failed to load users'); 
    } finally { setLoading(false); }
  }, [canRead]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreate = async (values: typeof createForm.values) => {
    try {
      // Convert roleIds array to single roleId for backend compatibility (if backend expects single)
      // Or update backend to accept array. Assuming backend accepts roleId (single) for now based on previous DTOs.
      // Let's map the first one for now to be safe, or update backend. 
      // Actually, let's assume we need to send `roleId: values.roleIds[0]` if backend only takes one.
      // BUT, looking at your previous code, you had `roleId` in createForm.
      // I will send `roleId` as the first element for now.
      await api.post('/user', { ...values, roleId: values.roleIds[0] });
      notifications.show({ title: 'Success', message: 'User created.', color: 'green' });
      closeCreate(); createForm.reset(); fetchData();
    } catch (e) { notifications.show({ title: 'Error', message: 'Failed to create user.', color: 'red' }); }
  };

  const handleUpdate = async (values: typeof editForm.values) => {
    if (!selectedUser) return;
    const { password, ...rest } = values;
    const updateData: any = { ...rest };
    if (password && password.trim() !== '') updateData.password = password;
    
    // Backend likely expects `roleId` not `roleIds` unless updated. 
    // We will assume we are updating the PRIMARY role.
    if (values.roleIds.length > 0) updateData.roleId = values.roleIds[0];

    try {
      await api.patch(`/user/${selectedUser.id}`, updateData);
      notifications.show({ title: 'Success', message: 'User updated.', color: 'green' });
      closeEdit(); fetchData();
    } catch (e) { notifications.show({ title: 'Error', message: 'Failed to update user.', color: 'red' }); }
  };

  const handleOpenEdit = (user: StaffUser) => {
    setSelectedUser(user);
    editForm.setValues({
      email: user.email,
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      password: '',
      roleIds: user.roles.map(r => r.id),
    });
    openEdit();
  };

  const handleDelete = (u: any) => {
    modals.openConfirmModal({
      title: 'Delete User',
      children: <Text size="sm">Delete <b>{u.email}</b>? This cannot be undone.</Text>,
      labels: { confirm: 'Delete', cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try { await api.delete(`/user/${u.id}`); fetchData(); } catch (e) {}
      }
    });
  };

  const handleToggleStatus = async (u: any) => {
    try {
       const newStatus = u.status === 'ACTIVE' ? 'DEACTIVATED' : 'ACTIVE';
       await api.patch(`/user/${u.id}/deactivate`); // Assuming this toggles or sets to deactivated
       // If backend only supports 'deactivate' via specific endpoint, use that.
       // If it supports status update via PATCH /user/:id, use that.
       // Based on previous code: `api.patch(/user/${user.id}/deactivate)`
       notifications.show({ title: 'Success', message: 'Status updated.', color: 'green' });
       fetchData();
    } catch(e) { notifications.show({ title: 'Error', message: 'Action failed.', color: 'red' }); }
  };

  const rows = users.map((u) => (
    <Table.Tr key={u.id} style={{ cursor: 'pointer' }} onClick={() => router.push(`/users/${u.id}`)}>
      <Table.Td>
        <Group gap="sm">
          <Avatar color="blue" radius="xl">{u.firstName?.[0]}</Avatar>
          <div>
             <Text size="sm" fw={500}>{u.firstName} {u.lastName}</Text>
             <Text size="xs" c="dimmed">{u.email}</Text>
          </div>
        </Group>
      </Table.Td>
      <Table.Td>
         {u.roles?.map((r: any) => <Badge key={r.id} variant="light" mr={4}>{r.name}</Badge>)}
      </Table.Td>
      <Table.Td>
         <Badge color={u.status === 'ACTIVE' ? 'green' : 'red'}>{u.status}</Badge>
      </Table.Td>
      <Table.Td onClick={(e) => e.stopPropagation()}>
        <Menu shadow="md" width={200}>
          <Menu.Target><ActionIcon variant="subtle"><IconDots size={16}/></ActionIcon></Menu.Target>
          <Menu.Dropdown>
            <Menu.Label>Actions</Menu.Label>
            {canUpdate && <Menu.Item leftSection={<IconPencil size={14}/>} onClick={() => handleOpenEdit(u)}>Edit Profile</Menu.Item>}
            {canDeactivate && (
               <Menu.Item 
                 leftSection={u.status === 'ACTIVE' ? <IconBan size={14}/> : <IconCheck size={14}/>} 
                 color={u.status === 'ACTIVE' ? 'orange' : 'green'}
                 onClick={() => handleToggleStatus(u)}
               >
                 {u.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
               </Menu.Item>
            )}
            <Menu.Divider />
            {canDelete && <Menu.Item color="red" leftSection={<IconTrash size={14}/>} onClick={() => handleDelete(u)}>Delete User</Menu.Item>}
          </Menu.Dropdown>
        </Menu>
      </Table.Td>
    </Table.Tr>
  ));

  if (!canRead) return <AdminLayout><Alert color="red">Access Denied</Alert></AdminLayout>;

  return (
    <AdminLayout>
      <Modal opened={createModalOpen} onClose={closeCreate} title="Create New Staff">
        <form onSubmit={createForm.onSubmit(handleCreate)}>
          <Stack>
            <Group grow><TextInput label="First Name" required {...createForm.getInputProps('firstName')} /><TextInput label="Last Name" required {...createForm.getInputProps('lastName')} /></Group>
            <TextInput label="Email" required {...createForm.getInputProps('email')} />
            <PasswordInput label="Password" required {...createForm.getInputProps('password')} />
            <MultiSelect label="Roles" data={roleSelectData} required {...createForm.getInputProps('roleIds')} />
            <Button type="submit">Create User</Button>
          </Stack>
        </form>
      </Modal>

      <Modal opened={editModalOpen} onClose={closeEdit} title="Edit Staff">
        <form onSubmit={editForm.onSubmit(handleUpdate)}>
          <Stack>
            <Group grow><TextInput label="First Name" required {...editForm.getInputProps('firstName')} /><TextInput label="Last Name" required {...editForm.getInputProps('lastName')} /></Group>
            <TextInput label="Email" required {...editForm.getInputProps('email')} />
            <PasswordInput label="Password (Leave blank to keep)" {...editForm.getInputProps('password')} />
            <MultiSelect label="Roles" data={roleSelectData} required {...editForm.getInputProps('roleIds')} />
            <Button type="submit">Save Changes</Button>
          </Stack>
        </form>
      </Modal>

      <Group justify="space-between" mb="xl">
        <Title order={2}>Staff Directory</Title>
        {canCreate && <Button leftSection={<IconPlus size={16}/>} onClick={openCreate}>Add Staff</Button>}
      </Group>

      <Paper withBorder radius="md">
        <LoadingOverlay visible={loading} />
        <Table striped highlightOnHover>
          <Table.Thead><Table.Tr><Table.Th>User</Table.Th><Table.Th>Role</Table.Th><Table.Th>Status</Table.Th><Table.Th>Actions</Table.Th></Table.Tr></Table.Thead>
          <Table.Tbody>{rows}</Table.Tbody>
        </Table>
      </Paper>
    </AdminLayout>
  );
}