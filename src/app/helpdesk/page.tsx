'use client';

import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import {
  Title, Button, Group, Table, Badge, Paper, LoadingOverlay, Alert, Modal, TextInput, Stack, Textarea, Select, SegmentedControl, Menu, ActionIcon, Tooltip, Text
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { 
  IconPlus, IconLifebuoy, IconFilter, IconUser, IconUsers, IconDots, IconCheck, IconTrash, IconUserCircle, IconFlame, IconEye
} from '@tabler/icons-react';
import api from '@/lib/api';
import { useDisclosure } from '@mantine/hooks';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/authStore';

export default function HelpdeskPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const userPermissions = user?.permissions || [];
  
  const canRead = userPermissions.includes('helpdesk:read');
  const canCreate = userPermissions.includes('helpdesk:create');
  const canManage = userPermissions.includes('helpdesk:manage');
  const userId = user?.userId;
  
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

  // --- UPDATED DELETE HANDLER ---
  const handleDelete = async (e: React.MouseEvent, id: string, type: 'SOFT' | 'HARD') => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to ${type === 'HARD' ? 'permanently' : 'archive'} this ticket?`)) return;
    try {
        await api.delete(`/helpdesk/${id}?type=${type}`);
        notifications.show({ title: 'Deleted', message: `Ticket ${type === 'HARD' ? 'deleted' : 'archived'}.`, color: 'green' });
        fetchTickets();
    } catch (e) { notifications.show({ title: 'Error', message: 'Delete failed.', color: 'red' }); }
  };

  // --- FILTER LOGIC ---
  const filteredTickets = tickets.filter(t => {
    const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
    const matchesScope = scopeFilter === 'ALL' || (scopeFilter === 'MINE' && t.assignedTo?.id === userId);
    return matchesStatus && matchesScope;
  });

  const rows = filteredTickets.map((t) => {
      const isAssignedToMe = t.assignedTo?.id === userId;
      const isUnassigned = !t.assignedTo;

      return (
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
            <Menu shadow="md" width={200}>
                <Menu.Target>
                  <ActionIcon variant="subtle"><IconDots size={16} /></ActionIcon>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Item leftSection={<IconEye size={14}/>} onClick={() => router.push(`/helpdesk/${t.id}`)}>View Details</Menu.Item>
                  
                  <Menu.Divider />
                  <Menu.Label>Assignment</Menu.Label>
                  {/* Logic: Assign to me if I have perms. Unassign only if mine OR if I am manager */}
                  {(!isAssignedToMe && (canManage || isUnassigned)) && (
                      // FIX: Ensure userId is not undefined
                      <Menu.Item leftSection={<IconUserCircle size={14}/>} onClick={(e) => handleAssignmentChange(e, t.id, userId || null)}>Assign to Me</Menu.Item>
                  )}
                  {(isAssignedToMe || canManage) && !isUnassigned && (
                      <Menu.Item color="orange" onClick={(e) => handleAssignmentChange(e, t.id, null)}>Unassign</Menu.Item>
                  )}

                  <Menu.Divider />
                  <Menu.Label>Status</Menu.Label>
                  <Menu.Item onClick={(e) => handleStatusChange(e, t.id, 'IN_PROGRESS')}>Mark In Progress</Menu.Item>
                  <Menu.Item onClick={(e) => handleStatusChange(e, t.id, 'RESOLVED')} leftSection={<IconCheck size={14} />}>Mark Resolved</Menu.Item>
                  <Menu.Item onClick={(e) => handleStatusChange(e, t.id, 'CLOSED')}>Mark Closed</Menu.Item>

                  <Menu.Divider />
                  <Menu.Label>Danger Zone</Menu.Label>
                  {/* Soft Delete (Everyone with manage perm) */}
                  <Menu.Item color="orange" leftSection={<IconTrash size={14}/>} onClick={(e) => handleDelete(e, t.id, 'SOFT')}>Archive (Soft Delete)</Menu.Item>
                  {/* Hard Delete (Managers Only) */}
                  {canManage && <Menu.Item color="red" leftSection={<IconTrash size={14}/>} onClick={(e) => handleDelete(e, t.id, 'HARD')}>Permanently Delete</Menu.Item>}
                </Menu.Dropdown>
             </Menu>
          </Table.Td>
        </Table.Tr>
      );
  });

  return (
    <AdminLayout>
      <Group justify="space-between" mb="xl">
         <Title order={2}>Helpdesk Tickets</Title>
         <Button onClick={() => router.push('/helpdesk/new')}>New Ticket</Button>
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
                data={[
                    { value: 'ALL', label: <Group gap={5} align="center" wrap="nowrap"><IconUsers size={16} /><span>All Tickets</span></Group> },
                    { value: 'MINE', label: <Group gap={5} align="center" wrap="nowrap"><IconUser size={16} /><span>My Claims</span></Group> }
                ]}
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
            <Table.Tbody>
                {filteredTickets.length === 0 && <Table.Tr><Table.Td colSpan={7} align="center" c="dimmed">No tickets found.</Table.Td></Table.Tr>}
                {rows}
            </Table.Tbody>
          </Table>
        )}
      </Paper>
    </AdminLayout>
  );
}