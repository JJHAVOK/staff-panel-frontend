'use client';

import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { Title, Button, Group, Table, Badge, Paper, LoadingOverlay, Modal, TextInput, Stack, Text, Code, ActionIcon } from '@mantine/core';
import { IconPlus, IconClock, IconTrash } from '@tabler/icons-react';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import api from '@/lib/api';

export default function CronPage() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const form = useForm({
    initialValues: { name: '', cron: '0 9 * * *', triggerEvent: '' },
    validate: { name: (v) => v.length < 2 ? 'Required' : null, triggerEvent: (v) => v.length < 2 ? 'Required' : null }
  });

  const fetchJobs = async () => {
    setLoading(true);
    try { const res = await api.get('/scheduler'); setJobs(res.data); } catch(e) {} finally { setLoading(false); }
  };

  useEffect(() => { fetchJobs(); }, []);

  const handleCreate = async (values: typeof form.values) => {
    try {
        await api.post('/scheduler', values);
        notifications.show({ title: 'Success', message: 'Job scheduled', color: 'green' });
        setModalOpen(false); form.reset(); fetchJobs();
    } catch(e) { notifications.show({ title: 'Error', message: 'Failed to create job', color: 'red' }); }
  };

  const handleDelete = async (id: string) => {
      if(!confirm('Delete job?')) return;
      await api.delete(`/scheduler/${id}`);
      fetchJobs();
      notifications.show({ title: 'Deleted', message: 'Job removed', color: 'green' });
  };

  return (
    <AdminLayout>
      <Group justify="space-between" mb="xl">
         <Group><IconClock size={32}/><Title order={2}>Scheduled Jobs (Cron)</Title></Group>
         <Button leftSection={<IconPlus size={16}/>} onClick={() => setModalOpen(true)}>Schedule Job</Button>
      </Group>

      <Paper withBorder radius="md">
         <LoadingOverlay visible={loading} />
         <Table striped>
            <Table.Thead><Table.Tr><Table.Th>Name</Table.Th><Table.Th>Schedule</Table.Th><Table.Th>Event Trigger</Table.Th><Table.Th>Last Run</Table.Th><Table.Th>Actions</Table.Th></Table.Tr></Table.Thead>
            <Table.Tbody>
                {jobs.length === 0 ? <Table.Tr><Table.Td colSpan={5} align="center">No scheduled jobs.</Table.Td></Table.Tr> : (
                    jobs.map(j => (
                        <Table.Tr key={j.id}>
                            <Table.Td fw={500}>{j.name}</Table.Td>
                            <Table.Td><Code>{j.cron}</Code></Table.Td>
                            <Table.Td>{j.triggerEvent}</Table.Td>
                            <Table.Td>{j.lastRun ? new Date(j.lastRun).toLocaleString() : 'Never'}</Table.Td>
                            <Table.Td>
                                <ActionIcon color="red" variant="light" onClick={() => handleDelete(j.id)}><IconTrash size={16}/></ActionIcon>
                            </Table.Td>
                        </Table.Tr>
                    ))
                )}
            </Table.Tbody>
         </Table>
      </Paper>

      <Modal opened={modalOpen} onClose={() => setModalOpen(false)} title="New Scheduled Job">
          <form onSubmit={form.onSubmit(handleCreate)}>
              <Stack>
                  <TextInput label="Job Name" placeholder="e.g. Daily Report" required {...form.getInputProps('name')} />
                  <TextInput label="Cron Expression" placeholder="e.g. 0 9 * * *" description="Min Hour Day Month DayOfWeek" required {...form.getInputProps('cron')} />
                  <TextInput label="Event Name" placeholder="e.g. DAILY_REPORT" description="The event ID to fire in the system" required {...form.getInputProps('triggerEvent')} />
                  <Button type="submit">Schedule</Button>
              </Stack>
          </form>
      </Modal>
    </AdminLayout>
  );
}