'use client';

import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import {
  Title, Button, Group, Table, Badge, Paper, LoadingOverlay, Alert, Modal, TextInput, Stack, Textarea, Select, SegmentedControl, Menu, ActionIcon, Tooltip, Text
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { 
  IconPlus, IconLifebuoy, IconFilter, IconUser, IconUsers, IconDots, IconCheck, IconTrash, IconUserCircle, IconFlame
} from '@tabler/icons-react';
import api from '@/lib/api';
import { useDisclosure } from '@mantine/hooks';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/authStore';

export default function HelpdeskPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const userPermissions = user?.permissions || [];
  
  const canRead = userPermissions.includes('read:helpdesk');
  const canCreate = userPermissions.includes('create:helpdesk');
  const canManage = userPermissions.includes('manage:helpdesk');
  
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpened, { open, close }] = useDisclosure(false);

  // --- FILTERS ---
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [scopeFilter, setScopeFilter] = useState('ALL'); // ALL vs MINE

  const form = useForm({
    initialValues: { subject: '', message: '', priority: 'MEDIUM' },
    validate: { subject: (v) => (v.length < 5 ? 'Subject too short' : null) },
  });

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const res = await api.get('/helpdesk');
      setTickets(res.data);
    } catch (e) {
      if (canRead) console.error('Failed to load tickets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if(canRead) fetchTickets(); }, [canRead]);

  const handleSubmit = async (values: typeof form.values) => {
    try {
      await api.post('/helpdesk', values);
      notifications.show({ title: 'Success', message: 'Ticket created.', color: 'green' });
      close();
      form.reset();
      fetchTickets();
    } catch (e) {
      notifications.show({ title: 'Error', message: 'Failed to create ticket.', color: 'red' });
    }
  };

  // Actions
  const handleStatusChange = async (e: React.MouseEvent, id: string, status: string) => {
    e.stopPropagation();
    try {
      await api.patch(`/helpdesk/${id}`, { status });
      notifications.show({ title: 'Updated', message: 'Status updated.', color: 'green' });
      fetchTickets();
    } catch (e) { notifications.show({ title: 'Error', message: 'Update failed.', color: 'red' }); }
  };

  const handleAssignmentChange = async (e: React.MouseEvent, id: string, assignedToId: string | null) => {
    e.stopPropagation();
    try {
      await api.patch(`/helpdesk/${id}`, { assignedToId });
      notifications.show({ title: 'Updated', message: 'Assignment saved.', color: 'green' });
      fetchTickets();
    } catch (e) { notifications.show({ title: 'Error', message: 'Assignment failed.', color: 'red' }); }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Delete this ticket?')) return;
    // Simulate delete by closing for now if no delete endpoint
    handleStatusChange(e, id, 'CLOSED');
  };

  // --- FILTER LOGIC ---
  const filteredTickets = tickets.filter(t => {
    const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
    const matchesScope = scopeFilter === 'ALL' || (scopeFilter === 'MINE' && t.assignedToId === user?.userId);
    return matchesStatus && matchesScope;
  });

  const rows = filteredTickets.map((t) => (
    <Table.Tr key={t.id} style={{ cursor: 'pointer' }} onClick={() => router.push(`/helpdesk/${t.id}`)}>
      <Table.Td>#{t.ticketNumber}</Table.Td>
      <Table.Td>
         <Group gap="xs">
            {t.isEscalated && <Tooltip label="Escalated"><IconFlame size={16} color="red" fill="currentColor" /></Tooltip>}
            <Text size="sm" fw={500}>{t.subject}</Text>
         </Group>
      </Table.Td>
      <Table.Td><Badge color={t.status === 'OPEN' ? 'blue' : t.status === 'RESOLVED' ? 'green' : 'gray'}>{t.status}</Badge></Table.Td>
      <Table.Td><Badge variant="outline" color={t.priority === 'URGENT' ? 'red' : 'gray'}>{t.priority}</Badge></Table.Td>
      <Table.Td>{t.requesterName}</Table.Td>
      <Table.Td>
         {t.assignedTo ? (
            <Badge variant="light" color="cyan" leftSection={<IconUser size={10}/>}>
                {t.assignedTo.firstName}
            </Badge>
         ) : <Text size="xs" c="dimmed">Unassigned</Text>}
      </Table.Td>
      <Table.Td onClick={(e) => e.stopPropagation()}>
        {canManage && (
             <Menu shadow="md" width={200}>
               <Menu.Target>
                 <ActionIcon variant="subtle"><IconDots size={16} /></ActionIcon>
               </Menu.Target>
               <Menu.Dropdown>
                 <Menu.Label>Status</Menu.Label>
                 <Menu.Item onClick={(e) => handleStatusChange(e, t.id, 'IN_PROGRESS')}>Mark In Progress</Menu.Item>
                 <Menu.Item onClick={(e) => handleStatusChange(e, t.id, 'RESOLVED')} leftSection={<IconCheck size={14} />}>Mark Resolved</Menu.Item>
                 <Menu.Item onClick={(e) => handleStatusChange(e, t.id, 'CLOSED')}>Mark Closed</Menu.Item>
                 <Menu.Divider />
                 <Menu.Label>Assignment</Menu.Label>
                 <Menu.Item 
                   onClick={(e) => handleAssignmentChange(e, t.id, user?.userId ?? null)}
                   leftSection={<IconUserCircle size={14} />}
                 >
                   Assign to Me
                 </Menu.Item>
                 <Menu.Item onClick={(e) => handleAssignmentChange(e, t.id, null)}>Unassign</Menu.Item>
               </Menu.Dropdown>
             </Menu>
        )}
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <AdminLayout>
      <Modal opened={modalOpened} onClose={close} title="Create Support Ticket">
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack>
            <TextInput label="Subject" required {...form.getInputProps('subject')} />
            <Select label="Priority" data={['LOW', 'MEDIUM', 'HIGH', 'URGENT']} {...form.getInputProps('priority')} />
            <Textarea label="Message" minRows={4} required {...form.getInputProps('message')} />
            <Button type="submit">Submit Ticket</Button>
          </Stack>
        </form>
      </Modal>

      <Group justify="space-between" mb="xl">
        <Group>
            <IconLifebuoy size={32} />
            <div>
                <Title order={2}>Support Helpdesk</Title>
                <Text size="sm" c="dimmed">Manage customer and internal requests</Text>
            </div>
        </Group>
        {canCreate && <Button leftSection={<IconPlus size={16} />} onClick={open}>New Ticket</Button>}
      </Group>

      {/* --- FILTERS --- */}
      <Paper withBorder p="md" radius="md" mb="md">
        <Group justify="space-between">
            <Group>
                <IconFilter size={16} color="gray" />
                <Text size="sm" fw={500}>Filter By:</Text>
                <Select 
                    data={['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']}
                    value={statusFilter}
                    onChange={(v) => setStatusFilter(v || 'ALL')}
                    size="sm"
                    w={150}
                />
            </Group>
            <SegmentedControl 
                value={scopeFilter}
                onChange={setScopeFilter}
                // --- 👇 FIX: Moved icons into the label ---
                data={[
                    { 
                      value: 'ALL', 
                      label: (
                        <Group gap={5} align="center" wrap="nowrap">
                          <IconUsers size={16} />
                          <span>All Tickets</span>
                        </Group>
                      ) 
                    },
                    { 
                      value: 'MINE', 
                      label: (
                        <Group gap={5} align="center" wrap="nowrap">
                          <IconUser size={16} />
                          <span>My Claims</span>
                        </Group>
                      ) 
                    }
                ]}
                // --- 👆 END FIX ---
            />
        </Group>
      </Paper>

      <Paper withBorder radius="md">
        <LoadingOverlay visible={loading} />
        {!canRead && <Alert color="red" title="Access Denied">You do not have permission to view the Helpdesk list.</Alert>}

        {canRead && (
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>ID</Table.Th>
                <Table.Th>Subject</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Priority</Table.Th>
                <Table.Th>Requester</Table.Th>
                <Table.Th>Assignee</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>{rows}</Table.Tbody>
          </Table>
        )}
      </Paper>
    </AdminLayout>
  );
}