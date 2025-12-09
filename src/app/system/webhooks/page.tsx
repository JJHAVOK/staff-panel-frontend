'use client';

import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { Title, Button, Group, Table, Badge, Paper, LoadingOverlay, Modal, TextInput, MultiSelect, Stack, Text, Code, Switch, ActionIcon } from '@mantine/core';
import { IconPlus, IconWebhook, IconRefresh, IconTrash, IconEye } from '@tabler/icons-react';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import api from '@/lib/api';

const EVENT_OPTIONS = [
  'ORDER_CREATED', 'ORDER_PAID', 'ORDER_SHIPPED',
  'USER_REGISTERED', 'CONTACT_CREATED',
  'TICKET_CREATED', 'TICKET_UPDATED'
];

export default function WebhooksPage() {
  const [hooks, setHooks] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [logsOpen, setLogsOpen] = useState(false);
  const [selectedHook, setSelectedHook] = useState<any>(null);

  const form = useForm({
    initialValues: { name: '', url: '', secret: '', events: [], isActive: true },
    validate: { 
        name: (v) => v.length < 2 ? 'Required' : null,
        url: (v) => v.includes('http') ? null : 'Invalid URL'
    }
  });

  const fetchHooks = async () => {
    setLoading(true);
    try { const res = await api.get('/webhooks'); setHooks(res.data); } catch(e) {} finally { setLoading(false); }
  };

  useEffect(() => { fetchHooks(); }, []);

  const handleCreate = async (values: typeof form.values) => {
    try {
        await api.post('/webhooks', values);
        notifications.show({ title: 'Success', message: 'Webhook created', color: 'green' });
        setModalOpen(false); form.reset(); fetchHooks();
    } catch(e) { notifications.show({ title: 'Error', message: 'Failed to create', color: 'red' }); }
  };

  const handleTest = async (id: string) => {
    try {
        await api.post(`/webhooks/${id}/test`);
        notifications.show({ title: 'Test Sent', message: 'Check your endpoint', color: 'blue' });
    } catch(e) { notifications.show({ title: 'Error', message: 'Test failed', color: 'red' }); }
  };

  const handleDelete = async (id: string) => {
      if(!confirm('Delete webhook?')) return;
      await api.delete(`/webhooks/${id}`);
      fetchHooks();
  };

  const viewLogs = async (hook: any) => {
      setSelectedHook(hook);
      try {
          const res = await api.get(`/webhooks/${hook.id}/logs`);
          setLogs(res.data);
          setLogsOpen(true);
      } catch(e) {}
  };

  return (
    <AdminLayout>
      <Group justify="space-between" mb="xl">
         <Group><IconWebhook size={32}/><Title order={2}>Webhooks</Title></Group>
         <Button leftSection={<IconPlus size={16}/>} onClick={() => setModalOpen(true)}>Add Webhook</Button>
      </Group>

      <Paper withBorder radius="md">
         <LoadingOverlay visible={loading} />
         <Table striped>
            <Table.Thead><Table.Tr><Table.Th>Name</Table.Th><Table.Th>Events</Table.Th><Table.Th>Status</Table.Th><Table.Th>Actions</Table.Th></Table.Tr></Table.Thead>
            <Table.Tbody>
                {hooks.map(h => (
                    <Table.Tr key={h.id}>
                        <Table.Td fw={500}>{h.name}<br/><Text size="xs" c="dimmed">{h.url}</Text></Table.Td>
                        <Table.Td>{h.events.map((e:string) => <Badge key={e} size="xs" mr={4}>{e}</Badge>)}</Table.Td>
                        <Table.Td><Badge color={h.isActive ? 'green' : 'gray'}>{h.isActive ? 'Active' : 'Paused'}</Badge></Table.Td>
                        <Table.Td>
                            <Group gap="xs">
                                <ActionIcon variant="light" onClick={() => handleTest(h.id)} title="Test"><IconRefresh size={16}/></ActionIcon>
                                <ActionIcon variant="light" color="blue" onClick={() => viewLogs(h)} title="Logs"><IconEye size={16}/></ActionIcon>
                                <ActionIcon variant="light" color="red" onClick={() => handleDelete(h.id)}><IconTrash size={16}/></ActionIcon>
                            </Group>
                        </Table.Td>
                    </Table.Tr>
                ))}
            </Table.Tbody>
         </Table>
      </Paper>

      <Modal opened={modalOpen} onClose={() => setModalOpen(false)} title="New Webhook">
          <form onSubmit={form.onSubmit(handleCreate)}>
              <Stack>
                  <TextInput label="Name" placeholder="e.g. ERP Sync" {...form.getInputProps('name')} />
                  <TextInput label="Payload URL" placeholder="https://..." {...form.getInputProps('url')} />
                  <TextInput label="Secret Key (Optional)" placeholder="For HMAC signature" {...form.getInputProps('secret')} />
                  <MultiSelect label="Events" data={EVENT_OPTIONS} {...form.getInputProps('events')} />
                  <Switch label="Active" {...form.getInputProps('isActive', { type: 'checkbox' })} />
                  <Button type="submit">Create Webhook</Button>
              </Stack>
          </form>
      </Modal>

      <Modal opened={logsOpen} onClose={() => setLogsOpen(false)} title={`Delivery Logs: ${selectedHook?.name}`} size="lg">
          <Stack>
              {logs.map(log => (
                  <Paper key={log.id} withBorder p="xs">
                      <Group justify="space-between">
                          <Badge color={log.success ? 'green' : 'red'}>{log.statusCode}</Badge>
                          <Text size="xs">{new Date(log.createdAt).toLocaleString()}</Text>
                      </Group>
                      <Text size="xs" mt={4} c="dimmed">Event: {log.event}</Text>
                      <Code block mt="xs" fz="xs">{log.response || 'No response body'}</Code>
                  </Paper>
              ))}
              {logs.length === 0 && <Text c="dimmed">No logs found.</Text>}
          </Stack>
      </Modal>
    </AdminLayout>
  );
}