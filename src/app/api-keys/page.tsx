'use client';

import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/AdminLayout'; // <-- 1. IMPORT LAYOUT
import {
  Title, Text, Button, Group, Table, Modal, TextInput, MultiSelect,
  Loader, ActionIcon, CopyButton, Tooltip, Stack, Paper, LoadingOverlay,
  Alert, // <-- Added for errors
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconTrash, IconCheck, IconCopy, IconKey, IconAlertCircle } from '@tabler/icons-react';
import api from '@/lib/api';

interface ApiKey {
  id: string;
  name: string;
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  permissions: string[];
}

interface NewApiKey extends ApiKey {
  key: string;
}

// For the MultiSelect dropdown
interface PermissionItem {
  value: string; // e.g., 'read:api-keys'
  label: string; // e.g., 'Read API Keys'
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpened, setModalOpened] = useState(false);
  const [newKeyModalOpened, setNewKeyModalOpened] = useState(false);
  const [newKey, setNewKey] = useState<NewApiKey | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // This will hold permissions for the dropdown
  const [allPermissions, setAllPermissions] = useState<PermissionItem[]>([]);

  const form = useForm({
    initialValues: {
      name: '',
      permissions: [] as string[],
      expiresAt: '',
    },
    validate: {
      name: (value) => (value.trim().length < 2 ? 'Name is too short' : null),
      permissions: (value) => (value.length === 0 ? 'Select at least one permission' : null),
    },
  });

  // --- 2. FETCH ALL PERMISSIONS FOR THE DROPDOWN ---
  const fetchPermissions = async () => {
    try {
      // This endpoint is assumed from your RBAC module
      const response = await api.get('/rbac/permissions'); 
      const permissionData = response.data.map((p: { id: string, name: string }) => ({
        value: p.id,
        label: p.name,
      }));
      setAllPermissions(permissionData);
    } catch (err) {
      notifications.show({
        title: 'Error',
        message: 'Could not load permissions list for dropdown.',
        color: 'red',
      });
    }
  };

  const fetchKeys = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/api-keys');
      setKeys(response.data);
    } catch (err: any) {
      if (err.response?.status === 403) {
        setError('You do not have permission to view API keys.');
      } else {
        setError('Could not fetch API keys.');
      }
      notifications.show({
        title: 'Error loading keys',
        message: error || 'An unknown error occurred.',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKeys();
    fetchPermissions(); // Fetch permissions when page loads
  }, []);

  const handleSubmit = async (values: typeof form.values) => {
    try {
      const response = await api.post('/api-keys', values);
      setNewKey(response.data);
      setNewKeyModalOpened(true);
      setModalOpened(false);
      form.reset();
      fetchKeys();
    } catch (error) {
      notifications.show({
        title: 'Error creating key',
        message: 'Could not create the API key.',
        color: 'red',
      });
    }
  };

  const handleRevoke = async (id: string) => {
    if (confirm('Are you sure you want to revoke this key? This action is permanent.')) {
      try {
        await api.delete(`/api-keys/${id}`);
        notifications.show({
          title: 'Key Revoked',
          message: 'The API key has been permanently deleted.',
          color: 'green',
        });
        fetchKeys();
      } catch (error) {
        notifications.show({
          title: 'Error',
          message: 'Could not revoke the key.',
          color: 'red',
        });
      }
    }
  };

  const rows = keys.map((key) => (
    <Table.Tr key={key.id}>
      <Table.Td>{key.name}</Table.Td>
      <Table.Td>{key.permissions.join(', ')}</Table.Td>
      <Table.Td>{new Date(key.createdAt).toLocaleDateString()}</Table.Td>
      <Table.Td>{key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleDateString() : 'Never'}</Table.Td>
      <Table.Td>
        <ActionIcon color="red" variant="subtle" onClick={() => handleRevoke(key.id)}>
          <IconTrash size={16} />
        </ActionIcon>
      </Table.Td>
    </Table.Tr>
  ));

  return (
    // --- 3. WRAP EVERYTHING IN ADMINLAYOUT ---
    <AdminLayout>
      {/* Modal for Creating a new key */}
      <Modal opened={modalOpened} onClose={() => setModalOpened(false)} title="Create New API Key">
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack>
            <TextInput
              label="Key Name"
              placeholder="e.g., 'My Next.js App'"
              required
              {...form.getInputProps('name')}
            />
            <MultiSelect
              label="Permissions"
              placeholder="Select permissions"
              data={allPermissions} // Use fetched permissions
              searchable
              required
              {...form.getInputProps('permissions')}
            />
            <TextInput
              label="Expires At (Optional)"
              type="date"
              {...form.getInputProps('expiresAt')}
            />
            <Button type="submit" mt="md">
              Create Key
            </Button>
          </Stack>
        </form>
      </Modal>

      {/* Modal for showing the new key ONCE */}
      <Modal
        opened={newKeyModalOpened}
        onClose={() => setNewKeyModalOpened(false)}
        title="API Key Created Successfully!"
        size="lg"
      >
        <Text c="dimmed" size="sm">
          This is the only time you will see this key. Please copy it and store it somewhere safe.
        </Text>
        <Group align="center" mt="md" p="md" bg="dark.8" style={{ borderRadius: 'var(--mantine-radius-md)' }}>
          <IconKey size={20} />
          <Text ff="monospace" fz="sm" fw={700} style={{ wordBreak: 'break-all' }}>
            {newKey?.key}
          </Text>
          <CopyButton value={newKey?.key || ''} timeout={2000}>
            {({ copied, copy }) => (
              <Tooltip label={copied ? 'Copied' : 'Copy'} withArrow>
                <ActionIcon color={copied ? 'teal' : 'gray'} onClick={copy} variant="subtle">
                  {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
                </ActionIcon>
              </Tooltip>
            )}
          </CopyButton>
        </Group>
        <Button fullWidth mt="lg" onClick={() => setNewKeyModalOpened(false)}>
          Done
        </Button>
      </Modal>

      <Group justify="space-between" mb="xl">
        <Title order={2}>API Key Management</Title>
        <Button onClick={() => setModalOpened(true)}>
          Create New Key
        </Button>
      </Group>

      {/* --- 4. USE PAPER AND OVERLAY LIKE AUDIT PAGE --- */}
      <Paper withBorder p="md" radius="md" style={{ position: 'relative' }}>
        <LoadingOverlay visible={loading} />
        
        {error && (
          <Alert icon={<IconAlertCircle size="1rem" />} title="Error" color="red">
            {error}
          </Alert>
        )}

        {!error && !loading && keys.length === 0 && (
          <Text>No API keys created yet.</Text>
        )}
        
        {!error && !loading && keys.length > 0 && (
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Name</Table.Th>
                <Table.Th>Permissions</Table.Th>
                <Table.Th>Created At</Table.Th>
                <Table.Th>Last Used</Table.Th>
                <Table.Th>Revoke</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>{rows}</Table.Tbody>
          </Table>
        )}
      </Paper>
    </AdminLayout>
  );
}