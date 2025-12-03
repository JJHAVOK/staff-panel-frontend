'use client';

import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import {
  Title, Text, Button, Group, Table, Modal, TextInput, Select,
  Loader, ActionIcon, Stack, Paper, LoadingOverlay, Alert,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconTrash, IconSend, IconAlertCircle } from '@tabler/icons-react';
import api from '@/lib/api';

interface Webhook {
  id: string;
  name: string;
  url: string;
  event: string;
  createdAt: string;
}

// You can expand this list as you add more events
const allEvents = [
  'user.create',
  'test.event',
  // e.g., 'contact.create', 'opportunity.update'
];

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpened, setModalOpened] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm({
    initialValues: {
      name: '',
      url: '',
      event: '',
    },
    validate: {
      name: (value) => (value.trim().length < 2 ? 'Name is required' : null),
      url: (value) => {
        try {
          new URL(value);
          return null;
        } catch (e) {
          return 'Must be a valid URL (e.g., https://...)';
        }
      },
      event: (value) => (value ? null : 'An event is required'),
    },
  });

  const fetchWebhooks = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/webhooks');
      setWebhooks(response.data);
    } catch (err: any) {
      if (err.response?.status === 403) {
        setError('You do not have permission to view webhooks.');
      } else {
        setError('Could not fetch webhooks.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWebhooks();
  }, []);

  const handleSubmit = async (values: typeof form.values) => {
    try {
      await api.post('/webhooks', values);
      notifications.show({
        title: 'Webhook Created',
        message: 'The new webhook is now active.',
        color: 'green',
      });
      setModalOpened(false);
      form.reset();
      fetchWebhooks();
    } catch (error) {
      notifications.show({
        title: 'Error',
        message: 'Could not create the webhook.',
        color: 'red',
      });
    }
  };

  const handleTriggerTest = async () => {
    try {
      await api.post('/webhooks/trigger/test', { message: 'This is a test from the admin panel' });
      notifications.show({
        title: 'Test Event Fired',
        message: 'All webhooks listening to "test.event" have been triggered.',
        color: 'blue',
      });
    } catch (error) {
       notifications.show({
        title: 'Error',
        message: 'Could not trigger test event.',
        color: 'red',
      });
    }
  };
  
  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this webhook?')) {
      try {
        await api.delete(`/webhooks/${id}`);
        notifications.show({
          title: 'Webhook Deleted',
          message: 'The webhook has been deleted.',
          color: 'green',
        });
        fetchWebhooks();
      } catch (error) {
        notifications.show({
          title: 'Error',
          message: 'Could not delete the webhook.',
          color: 'red',
        });
      }
    }
  };

  const rows = webhooks.map((hook) => (
    <Table.Tr key={hook.id}>
      <Table.Td>{hook.name}</Table.Td>
      <Table.Td>
        <Text ff="monospace" fz="xs">{hook.event}</Text>
      </Table.Td>
      <Table.Td>
        <Text ff="monospace" fz="xs">{hook.url}</Text>
      </Table.Td>
      <Table.Td>{new Date(hook.createdAt).toLocaleDateString()}</Table.Td>
      <Table.Td>
        <ActionIcon color="red" variant="subtle" onClick={() => handleDelete(hook.id)}>
          <IconTrash size={16} />
        </ActionIcon>
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <AdminLayout>
      <Modal opened={modalOpened} onClose={() => setModalOpened(false)} title="Create New Webhook">
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack>
            <TextInput
              label="Name"
              placeholder="e.g., 'n8n Contact Import'"
              required
              {...form.getInputProps('name')}
            />
            <TextInput
              label="Webhook URL"
              placeholder="https://n8n.example.com/webhook/..."
              required
              {...form.getInputProps('url')}
            />
            <Select
              label="Event"
              placeholder="Select an event to listen for"
              data={allEvents}
              required
              {...form.getInputProps('event')}
            />
            <Button type="submit" mt="md">
              Create Webhook
            </Button>
          </Stack>
        </form>
      </Modal>

      <Group justify="space-between" mb="xl">
        <Title order={2}>Webhook Management</Title>
        <Group>
          <Button variant="outline" color="blue" leftSection={<IconSend size={16} />} onClick={handleTriggerTest}>
            Fire Test Event
          </Button>
          <Button onClick={() => setModalOpened(true)}>
            Create New Webhook
          </Button>
        </Group>
      </Group>

      <Paper withBorder p="md" radius="md" style={{ position: 'relative' }}>
        <LoadingOverlay visible={loading} />
        
        {error && (
          <Alert icon={<IconAlertCircle size="1rem" />} title="Error" color="red">
            {error}
          </Alert>
        )}

        {!error && !loading && webhooks.length === 0 && (
          <Text>No webhooks configured yet.</Text>
        )}
        
        {!error && !loading && webhooks.length > 0 && (
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Name</Table.Th>
                <Table.Th>Event</Table.Th>
                <Table.Th>URL</Table.Th>
                <Table.Th>Created At</Table.Th>
                <Table.Th>Delete</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>{rows}</Table.Tbody>
          </Table>
        )}
      </Paper>
    </AdminLayout>
  );
}
