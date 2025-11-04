'use client';

import { AdminLayout } from '@/components/AdminLayout';
import api from '@/lib/api';
import {
  Title,
  Alert,
  LoadingOverlay,
  Paper,
  Text,
  Badge,
  Grid,
  Stack,
  Divider,
  Group,
  Button,
  Modal,
  TextInput,
  MultiSelect, // <-- NEW
  ActionIcon,  // <-- NEW
  Tooltip,     // <-- NEW
  rem,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import {
  IconAlertCircle,
  IconPlus,
  IconPencil, // <-- NEW
} from '@tabler/icons-react';
import { useEffect, useState, useCallback } from 'react';
import { notifications } from '@mantine/notifications';

// Define the types for our data
interface Permission {
  id: string;
  name: string;
  description: string;
}

interface Role {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
}

// --- NEW: Type for the MultiSelect data ---
interface SelectItem {
  value: string;
  label: string;
}

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- NEW: State for Edit Modal ---
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [permSelectData, setPermSelectData] = useState<SelectItem[]>([]);

  // Create Modal state
  const [createModalOpened, { open: openCreate, close: closeCreate }] = useDisclosure(false);
  // Edit Modal state
  const [editModalOpened, { open: openEdit, close: closeEdit }] = useDisclosure(false);

  // Create Form
  const createForm = useForm({
    initialValues: { name: '', description: '' },
    validate: { name: (val) => (val.trim().length > 0 ? null : 'Role name is required') },
  });

  // --- NEW: Edit Form ---
  const editForm = useForm({
    initialValues: {
      name: '',
      description: '',
      permissionIds: [] as string[], // Array of permission IDs
    },
    validate: { name: (val) => (val.trim().length > 0 ? null : 'Role name is required') },
  });

  // --- NEW: Function to open the edit modal ---
  const handleOpenEditModal = (role: Role) => {
    setSelectedRole(role);
    editForm.setValues({
      name: role.name,
      description: role.description || '',
      // Set the MultiSelect to have the IDs of the role's current permissions
      permissionIds: role.permissions.map((p) => p.id),
    });
    openEdit();
  };

  // Extracted fetch function
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [rolesResponse, permsResponse] = await Promise.all([
        api.get('/rbac/roles'),
        api.get('/rbac/permissions'),
      ]);

      setRoles(rolesResponse.data);
      setPermissions(permsResponse.data);

      // --- NEW: Format permissions for the MultiSelect ---
      const selectData = permsResponse.data.map((p: Permission) => ({
        value: p.id,
        label: p.name,
      }));
      setPermSelectData(selectData);

      setError(null);
    } catch (err: any) {
      if (err.response?.status === 403) {
        setError('You do not have permission to view roles.');
      } else {
        setError('Failed to fetch RBAC data.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Handle Create Role Submit
  const handleCreateRole = async (values: typeof createForm.values) => {
    try {
      await api.post('/rbac/role', values);
      notifications.show({ title: 'Success', message: 'Role created successfully!', color: 'green' });
      closeCreate();
      createForm.reset();
      fetchData();
    } catch (err: any) {
      notifications.show({ title: 'Error', message: 'Failed to create role. It may already exist.', color: 'red' });
    }
  };

  // --- NEW: Handle Edit Role Submit ---
  const handleEditRole = async (values: typeof editForm.values) => {
    if (!selectedRole) return;

    try {
      await api.patch(`/rbac/role/${selectedRole.id}`, values);
      notifications.show({ title: 'Success', message: 'Role updated successfully!', color: 'green' });
      closeEdit();
      editForm.reset();
      fetchData(); // Refresh the roles list
    } catch (err: any) {
      console.error(err);
      notifications.show({ title: 'Error', message: 'Failed to update role.', color: 'red' });
    }
  };

  return (
    <AdminLayout>
      {/* Create Role Modal */}
      <Modal opened={createModalOpened} onClose={closeCreate} title="Create New Role" centered>
        <form onSubmit={createForm.onSubmit(handleCreateRole)}>
          <Stack>
            <TextInput required label="Role Name" placeholder="e.g., Finance Manager" {...createForm.getInputProps('name')} />
            <TextInput label="Description" placeholder="e.g., Can access billing and invoices." {...createForm.getInputProps('description')} />
            <Button type="submit" loading={createForm.submitting} mt="md">
              Create Role
            </Button>
          </Stack>
        </form>
      </Modal>

      {/* --- NEW: Edit Role Modal --- */}
      <Modal opened={editModalOpened} onClose={closeEdit} title="Edit Role" centered size="md">
        <form onSubmit={editForm.onSubmit(handleEditRole)}>
          <Stack>
            <TextInput required label="Role Name" {...editForm.getInputProps('name')} />
            <TextInput label="Description" {...editForm.getInputProps('description')} />
            <MultiSelect
              label="Assign Permissions"
              placeholder="Select permissions"
              data={permSelectData}
              searchable
              clearable
              {...editForm.getInputProps('permissionIds')}
            />
            <Button type="submit" loading={editForm.submitting} mt="md">
              Save Changes
            </Button>
          </Stack>
        </form>
      </Modal>
      {/* --- END NEW --- */}

      <Group justify="space-between" mb="xl">
        <div>
          <Title order={2}>Role & Permission Management</Title>
          <Text c="dimmed">
            View all roles and available system permissions.
          </Text>
        </div>
        <Button leftSection={<IconPlus size={14} />} onClick={openCreate}>
          Create Role
        </Button>
      </Group>

      <Paper withBorder p="md" radius="md" style={{ position: 'relative' }}>
        <LoadingOverlay visible={loading} />

        {error && (
          <Alert icon={<IconAlertCircle size="1rem" />} title="Error" color="red">
            {error}
          </Alert>
        )}

        {!error && !loading && (
          <Grid>
            {/* Column 1: Roles */}
            <Grid.Col span={{ base: 12, md: 7 }}>
              <Title order={3} mb="md">Current Roles</Title>
              <Stack>
                {roles.map((role) => (
                  <Paper withBorder shadow="xs" p="md" key={role.id}>
                    {/* --- NEW: Edit Button --- */}
                    <Group justify="space-between" mb="xs">
                      <Text fw={700} size="lg">{role.name}</Text>
                      <Tooltip label="Edit Role">
                        <ActionIcon variant="default" onClick={() => handleOpenEditModal(role)}>
                          <IconPencil style={{ width: rem(16), height: rem(16) }} stroke={1.5} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                    {/* --- END NEW --- */}
                    <Text c="dimmed" size="sm" mb="md">{role.description}</Text>
                    <Title order={6} mb="xs">Permissions:</Title>
                    <Group gap="xs">
                      {role.permissions.length > 0 ? (
                        role.permissions.map((perm) => (
                          <Badge key={perm.id} variant="light" color="blue">
                            {perm.name}
                          </Badge>
                        ))
                      ) : (
                        <Text size="sm" c="dimmed">No permissions assigned.</Text>
                      )}
                    </Group>
                  </Paper>
                ))}
              </Stack>
            </Grid.Col>

            {/* Column 2: All Permissions */}
            <Grid.Col span={{ base: 12, md: 5 }}>
              <Title order={3} mb="md">Available Permissions</Title>
              <Paper withBorder shadow="xs" p="md">
                <Stack gap="sm">
                  {permissions.map((perm) => (
                    <div key={perm.id}>
                      <Text fw={500}>{perm.name}</Text>
                      <Text size="sm" c="dimmed">{perm.description}</Text>
                    </div>
                  ))}
                </Stack>
              </Paper>
            </Grid.Col>
          </Grid>
        )}
      </Paper>
    </AdminLayout>
  );
}