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
  Button, // <-- NEW
  Modal,  // <-- NEW
  TextInput, // <-- NEW
} from '@mantine/core';
import { useForm } from '@mantine/form'; // <-- NEW
import { useDisclosure } from '@mantine/hooks'; // <-- NEW
import { IconAlertCircle, IconPlus } from '@tabler/icons-react'; // <-- NEW
import { useEffect, useState, useCallback } from 'react'; // <-- NEW
import { notifications } from '@mantine/notifications'; // <-- NEW

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

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- NEW: Modal State ---
  const [opened, { open, close }] = useDisclosure(false);

  // --- NEW: Form State ---
  const createForm = useForm({
    initialValues: {
      name: '',
      description: '',
    },
    validate: {
      name: (val) => (val.trim().length > 0 ? null : 'Role name is required'),
    },
  });

  // --- NEW: Extracted fetch function ---
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [rolesResponse, permsResponse] = await Promise.all([
        api.get('/rbac/roles'),
        api.get('/rbac/permissions'),
      ]);
      setRoles(rolesResponse.data);
      setPermissions(permsResponse.data);
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
  }, []); // Empty dependency array, it's stable

  // Fetch data on initial load
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- NEW: Handle Create Role Submit ---
  const handleCreateRole = async (values: typeof createForm.values) => {
    try {
      // Use the backend endpoint we already built
      await api.post('/rbac/role', values);

      notifications.show({
        title: 'Success',
        message: 'Role created successfully!',
        color: 'green',
      });

      close(); // Close the modal
      createForm.reset(); // Reset the form
      fetchData(); // Refresh the roles list
    } catch (err: any) {
      console.error(err);
      notifications.show({
        title: 'Error',
        message: 'Failed to create role. It may already exist.',
        color: 'red',
      });
    }
  };

  return (
    <AdminLayout>
      {/* --- NEW: Create Role Modal --- */}
      <Modal opened={opened} onClose={close} title="Create New Role" centered>
        <form onSubmit={createForm.onSubmit(handleCreateRole)}>
          <Stack>
            <TextInput
              required
              label="Role Name"
              placeholder="e.g., Finance Manager"
              {...createForm.getInputProps('name')}
            />
            <TextInput
              label="Description"
              placeholder="e.g., Can access billing and invoices."
              {...createForm.getInputProps('description')}
            />
            <Button type="submit" loading={createForm.submitting} mt="md">
              Create Role
            </Button>
          </Stack>
        </form>
      </Modal>
      {/* --- END NEW --- */}

      {/* --- NEW: Title with Button --- */}
      <Group justify="space-between" mb="xl">
        <div>
          <Title order={2}>Role & Permission Management</Title>
          <Text c="dimmed">
            View all roles and available system permissions.
          </Text>
        </div>
        <Button leftSection={<IconPlus size={14} />} onClick={open}>
          Create Role
        </Button>
      </Group>
      {/* --- END NEW --- */}

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
                    <Text fw={700} size="lg">{role.name}</Text>
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