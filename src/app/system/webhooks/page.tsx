'use client';

import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { 
  Title, Text, Button, Table, Modal, TextInput, MultiSelect, 
  Group, ActionIcon, Paper, LoadingOverlay, Drawer, Code, Stack, Badge, Alert 
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconTrash, IconWebhook, IconPlus, IconBook, IconBolt } from '@tabler/icons-react';
import api from '@/lib/api';
import { useDisclosure } from '@mantine/hooks';

const EVENTS = [
  { value: 'ORDER_CREATED', label: 'Order Created' },
  { value: 'ORDER_PAID', label: 'Order Paid' },
  { value: 'TICKET_CREATED', label: 'Ticket Created' },
  { value: 'TICKET_REPLIED', label: 'Ticket Reply' },
  { value: 'USER_REGISTERED', label: 'New User Signup' },
  { value: 'CONTACT_CREATED', label: 'CRM Contact Created' }
];

export default function WebhooksPage() {
  const [hooks, setHooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [createOpened, { open: openCreate, close: closeCreate }] = useDisclosure(false);
  const [docsOpened, { open: openDocs, close: closeDocs }] = useDisclosure(false);

  const form = useForm({
    initialValues: { name: '', url: '', events: [] as string[] },
    validate: {
      name: (v) => (v.length < 2 ? 'Name required' : null),
      url: (v) => (/^https?:\/\/.+/.test(v) ? null : 'Valid URL required'),
      events: (v) => (v.length === 0 ? 'Select at least one event' : null),
    },
  });

  const fetchHooks = async () => {
    setLoading(true);
    try {
      const res = await api.get('/scheduler/webhooks'); // Assuming backend endpoint exists
      setHooks(res.data || []);
    } catch (e) {
      console.error(e);
      // Fallback for demo if backend route missing
      setHooks([]); 
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchHooks(); }, []);

  const handleCreate = async (values: typeof form.values) => {
    try {
      await api.post('/scheduler/webhooks', values);
      notifications.show({ title: 'Success', message: 'Webhook registered.', color: 'green' });
      fetchHooks(); closeCreate(); form.reset();
    } catch (e) { notifications.show({ title: 'Error', message: 'Failed to create webhook.', color: 'red' }); }
  };

  const handleDelete = async (id: string) => {
    if(!confirm('Delete this webhook?')) return;
    try {
      await api.delete(`/scheduler/webhooks/${id}`);
      notifications.show({ title: 'Deleted', message: 'Webhook removed.', color: 'blue' });
      fetchHooks();
    } catch(e) { notifications.show({ title: 'Error', message: 'Failed to delete.', color: 'red' }); }
  };

  return (
    <AdminLayout>
      <Group justify="space-between" mb="xl">
          <Group>
              <IconWebhook size={32} stroke={1.5} />
              <div>
                  <Group>
                    <Title order={2}>Webhooks</Title>
                    <Button variant="light" size="xs" leftSection={<IconBook size={14}/>} onClick={openDocs}>Documentation</Button>
                  </Group>
                  <Text c="dimmed">Real-time event subscriptions.</Text>
              </div>
          </Group>
          <Button leftSection={<IconPlus size={16}/>} onClick={openCreate}>Add Webhook</Button>
      </Group>

      {/* --- CREATE MODAL --- */}
      <Modal opened={createOpened} onClose={closeCreate} title="Register Webhook">
          <form onSubmit={form.onSubmit(handleCreate)}>
              <Stack>
                  <TextInput label="Name" placeholder="e.g. Slack Notification" required {...form.getInputProps('name')} />
                  <TextInput label="Target URL" placeholder="https://api.mysite.com/webhook" required {...form.getInputProps('url')} />
                  <MultiSelect label="Events" data={EVENTS} placeholder="Select events" required {...form.getInputProps('events')} />
                  <Button type="submit" mt="md">Register</Button>
              </Stack>
          </form>
      </Modal>

      {/* --- DOCS DRAWER --- */}
      <Drawer opened={docsOpened} onClose={closeDocs} title="Webhook Reference" position="right" size="lg">
          <Stack gap="lg">
              <Alert icon={<IconBolt/>} color="violet">
                  Webhooks are sent as <b>POST</b> requests with a JSON payload.
              </Alert>
              
              <div>
                  <Title order={5} mb="xs">Payload Format</Title>
                  <Code block>{`
{
  "event": "ORDER_CREATED",
  "timestamp": "2025-10-12T10:00:00Z",
  "data": {
    "id": "ord_123",
    "total": 59.99,
    ...
  }
}
                  `}</Code>
              </div>

              <Title order={5}>Event Catalog</Title>
              <Table withTableBorder>
                  <Table.Thead><Table.Tr><Table.Th>Event</Table.Th><Table.Th>Description</Table.Th></Table.Tr></Table.Thead>
                  <Table.Tbody>
                      {EVENTS.map(e => (
                          <Table.Tr key={e.value}>
                              <Table.Td><Code>{e.value}</Code></Table.Td>
                              <Table.Td>{e.label}</Table.Td>
                          </Table.Tr>
                      ))}
                  </Table.Tbody>
              </Table>
          </Stack>
      </Drawer>

      <Paper withBorder p="md" radius="md">
          <LoadingOverlay visible={loading} />
          <Table striped highlightOnHover>
              <Table.Thead>
                  <Table.Tr><Table.Th>Name</Table.Th><Table.Th>URL</Table.Th><Table.Th>Events</Table.Th><Table.Th>Action</Table.Th></Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                  {hooks.map(hook => (
                      <Table.Tr key={hook.id}>
                          <Table.Td fw={500}>{hook.name}</Table.Td>
                          <Table.Td style={{maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis'}}>{hook.url}</Table.Td>
                          <Table.Td>
                              <Group gap={4}>
                                  {hook.events.slice(0, 2).map((e: string) => <Badge key={e} size="sm" variant="outline">{e}</Badge>)}
                                  {hook.events.length > 2 && <Badge size="sm" variant="outline">+{hook.events.length - 2}</Badge>}
                              </Group>
                          </Table.Td>
                          <Table.Td>
                              <ActionIcon color="red" variant="subtle" onClick={() => handleDelete(hook.id)}><IconTrash size={16}/></ActionIcon>
                          </Table.Td>
                      </Table.Tr>
                  ))}
                  {!loading && hooks.length === 0 && <Table.Tr><Table.Td colSpan={4} align="center"><Text c="dimmed">No webhooks configured.</Text></Table.Td></Table.Tr>}
              </Table.Tbody>
          </Table>
      </Paper>
    </AdminLayout>
  );
}