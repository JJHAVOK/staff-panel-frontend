'use client';

import { AdminLayout } from '@/components/AdminLayout';
import api from '@/lib/api';
import {
  Title,
  Alert,
  Table,
  LoadingOverlay,
  Paper,
  Text,
  Badge,
  Button,
  Group,
  Modal,
  Stack,
  TextInput,
  PasswordInput,
  ActionIcon,
  Tooltip,
  rem,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import { modals } from '@mantine/modals';
import {
  IconAlertCircle,
  IconPlus,
  IconPencil,
  IconTrash,
  IconUserOff, // <-- NEW ICON
} from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { notifications } from '@mantine/notifications';

interface StaffUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  status: string;
  roles: { name: string }[];
  password?: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedUser, setSelectedUser] = useState<StaffUser | null>(null);
  const [createModalOpened, { open: openCreate, close: closeCreate }] = useDisclosure(false);
  const [editModalOpened, { open: openEdit, close: closeEdit }] = useDisclosure(false);

  const createForm = useForm({
    initialValues: { email: '', password: '', firstName: '', lastName: '' },
    validate: {
      email: (val) => (/^\S+@\S+$/.test(val) ? null : 'Invalid email'),
      password: (val) => (val.length < 8 ? 'Password must be at least 8 characters' : null),
      firstName: (val) => (val.trim().length > 0 ? null : 'First name is required'),
      lastName: (val) => (val.trim().length > 0 ? null : 'Last name is required'),
    },
  });

  const editForm = useForm({
    initialValues: { email: '', firstName: '', lastName: '', password: '' },
    validate: {
      email: (val) => (/^\S+@\S+$/.test(val) ? null : 'Invalid email'),
      password: (val) =>
        val.length === 0 || val.length >= 8 ? null : 'Password must be at least 8 characters',
      firstName: (val) => (val.trim().length > 0 ? null : 'First name is required'),
      lastName: (val) => (val.trim().length > 0 ? null : 'Last name is required'),
    },
  });

  const handleOpenEditModal = (user: StaffUser) => {
    setSelectedUser(user);
    editForm.setValues({
      email: user.email,
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      password: '',
    });
    openEdit();
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/user');
      setUsers(response.data);
    } catch (err: any) {
      if (err.response?.status === 403) {
        setError('You do not have permission to view users.');
      } else { setError('Failed to fetch staff data.'); }
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleCreateUser = async (values: typeof createForm.values) => {
    try {
      await api.post('/user', values);
      notifications.show({ title: 'Success', message: 'User created successfully!', color: 'green' });
      closeCreate();
      createForm.reset();
      fetchUsers();
    } catch (err: any) {
      notifications.show({ title: 'Error', message: 'Failed to create user. They may already exist.', color: 'red' });
    }
  };

  const handleEditUser = async (values: typeof editForm.values) => {
    if (!selectedUser) return;
    const updateData: any = { ...values };
    if (!updateData.password || updateData.password.trim() === '') {
      delete updateData.password;
    }
    try {
      await api.patch(`/user/${selectedUser.id}`, updateData);
      notifications.show({ title: 'Success', message: 'User updated successfully!', color: 'green' });
      closeEdit();
      editForm.reset();
      fetchUsers();
    } catch (err: any) {
      notifications.show({ title: 'Error', message: 'Failed to update user.', color: 'red' });
    }
  };

  // --- UPDATED DEACTIVATE FUNCTION ---
  const openDeactivateModal = (user: StaffUser) =>
    modals.openConfirmModal({
      title: 'Deactivate User',
      centered: true,
      children: (
        <Text size="sm">
          Are you sure you want to deactivate {user.email}? This action is
          reversible.
        </Text>
      ),
      labels: { confirm: 'Deactivate User', cancel: 'Cancel' },
      confirmProps: { color: 'yellow' }, // Changed color
      onConfirm: async () => {
        try {
          // --- UPDATED API CALL ---
          await api.patch(`/user/${user.id}/deactivate`);
          notifications.show({ title: 'Success', message: 'User deactivated!', color: 'green' });
          fetchUsers();
        } catch (err) {
          notifications.show({ title: 'Error', message: 'Failed to deactivate user.', color: 'red' });
        }
      },
    });
  // --- END OF UPDATE ---

  // --- NEW DELETE FUNCTION ---
  const openDeleteModal = (user: StaffUser) =>
    modals.openConfirmModal({
      title: 'PERMANENTLY DELETE USER',
      centered: true,
      children: (
        <Text size="sm" c="red" fw={700}>
          Are you absolutely sure you want to permanently delete {user.email}?
          This action cannot be undone.
        </Text>
      ),
      labels: { confirm: 'Delete User Permanently', cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await api.delete(`/user/${user.id}`);
          notifications.show({ title: 'Success', message: 'User permanently deleted!', color: 'green' });
          fetchUsers();
        } catch (err) {
          notifications.show({ title: 'Error', message: 'Failed to delete user.', color: 'red' });
        }
      },
    });
  // --- END OF NEW FUNCTION ---

  const rows = users.map((user) => (
    <Table.Tr key={user.id}>
      <Table.Td>{user.firstName || 'N/A'}</Table.Td>
      <Table.Td>{user.lastName || 'N/A'}</Table.Td>
      <Table.Td>{user.email}</Table.Td>
      <Table.Td>
        {user.roles.map((role) => (
          <Badge key={role.name} color="blue" variant="light">{role.name}</Badge>
        ))}
      </Table.Td>
      <Table.Td>
        <Badge color={user.status === 'ACTIVE' ? 'green' : 'gray'}>
          {user.status}
        </Badge>
      </Table.Td>
      <Table.Td>
        <Group gap="xs" justify="flex-end">
          <Tooltip label="Edit user">
            <ActionIcon variant="default" onClick={() => handleOpenEditModal(user)}>
              <IconPencil style={{ width: rem(16), height: rem(16) }} stroke={1.5} />
            </ActionIcon>
          </Tooltip>
          {/* --- UPDATED DEACTIVATE BUTTON --- */}
          <Tooltip label="Deactivate user (Soft Delete)">
            <ActionIcon variant="default" color="yellow" onClick={() => openDeactivateModal(user)}>
              <IconUserOff style={{ width: rem(16), height: rem(16) }} stroke={1.5} />
            </ActionIcon>
          </Tooltip>
          {/* --- NEW DELETE BUTTON --- */}
          <Tooltip label="Delete user (Permanent)">
            <ActionIcon variant="default" color="red" onClick={() => openDeleteModal(user)}>
              <IconTrash style={{ width: rem(16), height: rem(16) }} stroke={1.5} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <AdminLayout>
      {/* Create User Modal */}
      <Modal opened={createModalOpened} onClose={closeCreate} title="Create New Staff User" centered>
        <form onSubmit={createForm.onSubmit(handleCreateUser)}>
          <Stack>
            <TextInput required label="First Name" placeholder="Jane" {...createForm.getInputProps('firstName')} />
            <TextInput required label="Last Name" placeholder="Doe" {...createForm.getInputProps('lastName')} />
            <TextInput required label="Email" placeholder="jane.doe@example.com" {...createForm.getInputProps('email')} />
            <PasswordInput required label="Password" placeholder="8+ characters" {...createForm.getInputProps('password')} />
            <Button type="submit" loading={createForm.submitting} mt="md">
              Create User
            </Button>
          </Stack>
        </form>
      </Modal>

      {/* Edit User Modal */}
      <Modal opened={editModalOpened} onClose={closeEdit} title="Edit User" centered>
        <form onSubmit={editForm.onSubmit(handleEditUser)}>
          <Stack>
            <TextInput required label="First Name" {...editForm.getInputProps('firstName')} />
            <TextInput required label="Last Name" {...editForm.getInputProps('lastName')} />
            <TextInput required label="Email" {...editForm.getInputProps('email')} />
            <PasswordInput label="New Password" placeholder="Leave blank to keep unchanged" {...editForm.getInputProps('password')} />
            <Button type="submit" loading={editForm.submitting} mt="md">
              Save Changes
            </Button>
          </Stack>
        </form>
      </Modal>

      <Group justify="space-between" mb="xl">
        <div>
          <Title order={2}>Staff Management</Title>
          <Text c="dimmed">View and manage all staff accounts.</Text>
        </div>
        <Button leftSection={<IconPlus size={14} />} onClick={openCreate}>
          Create User
        </Button>
      </Group>

      <Paper withBorder p="md" radius="md" style={{ position: 'relative' }}>
        <LoadingOverlay visible={loading} />
        {error && (
          <Alert icon={<IconAlertCircle size="1rem" />} title="Error" color="red">{error}</Alert>
        )}
        {!error && !loading && (
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>First Name</Table.Th>
                <Table.Th>Last Name</Table.Th>
                <Table.Th>Email</Table.Th>
                <Table.Th>Roles</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th> </Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>{rows}</Table.Tbody>
          </Table>
        )}
      </Paper>
    </AdminLayout>
  );
}