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
} from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import { useEffect, useState } from 'react';

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

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch both sets of data in parallel
        const [rolesResponse, permsResponse] = await Promise.all([
          api.get('/rbac/roles'),
          api.get('/rbac/permissions'),
        ]);

        setRoles(rolesResponse.data);
        setPermissions(permsResponse.data);
      } catch (err: any) {
        if (err.response?.status === 403) {
          setError('You do not have permission to view roles.');
        } else {
          setError('Failed to fetch RBAC data.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <AdminLayout>
      <Title order={2}>Role & Permission Management</Title>
      <Text c="dimmed" mb="xl">
        View all roles and available system permissions.
      </Text>

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
