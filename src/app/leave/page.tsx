'use client';

import { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import {
  Title, Text, Button, Group, Table, Modal, TextInput, Stack, Paper, LoadingOverlay, 
  Alert, Tabs, Select, Badge, Menu, ActionIcon, Textarea
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { 
  IconPlus, IconTrash, IconDots, IconCheck, IconX, IconCalendarTime 
} from '@tabler/icons-react';
import api from '@/lib/api';
import { useDisclosure } from '@mantine/hooks';
import { useAuthStore } from '@/lib/authStore';

export default function LeavePage() {
  const { user } = useAuthStore();
  const userPermissions = user?.permissions || [];
  
  const canCreate = userPermissions.includes('hr:leave:own');
  const canManage = userPermissions.includes('hr:leave:manage');

  const [myRequests, setMyRequests] = useState<any[]>([]);
  const [allRequests, setAllRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [createModalOpen, { open: openCreate, close: closeCreate }] = useDisclosure(false);

  const form = useForm({
    initialValues: { type: 'VACATION', startDate: new Date(), endDate: new Date(), reason: '' },
    validate: { reason: (v) => (v.length < 3 ? 'Reason required' : null) },
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch My Requests (Fixed Endpoint: /leave/mine)
      if (canCreate) {
        const res = await api.get('/leave/mine');
        setMyRequests(res.data);
      }
      
      // 2. Fetch All Requests (If Manager)
      if (canManage) {
        const res = await api.get('/leave');
        setAllRequests(res.data);
      }
    } catch (e) {
      console.error(e);
      notifications.show({ title: 'Error', message: 'Could not load requests.', color: 'red' });
    } finally {
      setLoading(false);
    }
  }, [canCreate, canManage]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreate = async (values: typeof form.values) => {
    try {
      await api.post('/leave', values);
      notifications.show({ title: 'Submitted', message: 'Leave request sent.', color: 'green' });
      closeCreate();
      form.reset();
      fetchData();
    } catch (e) {
      notifications.show({ title: 'Error', message: 'Failed to submit request.', color: 'red' });
    }
  };

  const handleStatusUpdate = async (id: string, status: string) => {
    try {
      await api.patch(`/leave/${id}/status`, { status });
      notifications.show({ title: 'Updated', message: `Request ${status.toLowerCase()}.`, color: 'blue' });
      fetchData();
    } catch (e) {
      notifications.show({ title: 'Error', message: 'Update failed.', color: 'red' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Cancel this request?')) return;
    try {
      await api.delete(`/leave/${id}`);
      notifications.show({ title: 'Deleted', message: 'Request cancelled.', color: 'gray' });
      fetchData();
    } catch (e) {
      notifications.show({ title: 'Error', message: 'Delete failed.', color: 'red' });
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === 'APPROVED') return <Badge color="green">Approved</Badge>;
    if (status === 'DENIED') return <Badge color="red">Denied</Badge>;
    return <Badge color="yellow">Pending</Badge>;
  };

  // --- Render Rows ---
  const renderRows = (requests: any[], showUser: boolean) => requests.map((req) => (
    <Table.Tr key={req.id}>
      {showUser && <Table.Td>{req.staffUser?.firstName} {req.staffUser?.lastName}</Table.Td>}
      <Table.Td><Badge variant="outline">{req.type}</Badge></Table.Td>
      <Table.Td>{new Date(req.startDate).toLocaleDateString()} - {new Date(req.endDate).toLocaleDateString()}</Table.Td>
      <Table.Td style={{ maxWidth: 200 }}><Text truncate size="sm">{req.reason}</Text></Table.Td>
      <Table.Td>{getStatusBadge(req.status)}</Table.Td>
      <Table.Td>
        <Menu shadow="md" width={200}>
          <Menu.Target>
            <ActionIcon variant="subtle"><IconDots size={16} /></ActionIcon>
          </Menu.Target>
          <Menu.Dropdown>
            {/* Manager Actions */}
            {canManage && req.status === 'PENDING' && (
              <>
                <Menu.Label>Review</Menu.Label>
                <Menu.Item leftSection={<IconCheck size={14} />} color="green" onClick={() => handleStatusUpdate(req.id, 'APPROVED')}>Approve</Menu.Item>
                <Menu.Item leftSection={<IconX size={14} />} color="red" onClick={() => handleStatusUpdate(req.id, 'DENIED')}>Deny</Menu.Item>
                <Menu.Divider />
              </>
            )}
            
            {/* Owner Actions */}
            <Menu.Label>Manage</Menu.Label>
            <Menu.Item leftSection={<IconTrash size={14} />} color="red" onClick={() => handleDelete(req.id)}>
              {req.status === 'PENDING' ? 'Cancel Request' : 'Delete Record'}
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <AdminLayout>
      <Modal opened={createModalOpen} onClose={closeCreate} title="Request Time Off">
        <form onSubmit={form.onSubmit(handleCreate)}>
          <Stack>
            <Select label="Type" data={['VACATION', 'SICK', 'PERSONAL']} required {...form.getInputProps('type')} />
            <Group grow>
               <DateInput label="Start Date" required {...form.getInputProps('startDate')} />
               <DateInput label="End Date" required {...form.getInputProps('endDate')} />
            </Group>
            <Textarea label="Reason" required {...form.getInputProps('reason')} />
            <Button type="submit">Submit Request</Button>
          </Stack>
        </form>
      </Modal>

      <Group justify="space-between" mb="xl">
        <Group>
           <IconCalendarTime size={32} />
           <Title order={2}>Leave Management</Title>
        </Group>
        {canCreate && <Button leftSection={<IconPlus size={16} />} onClick={openCreate}>Request Time Off</Button>}
      </Group>

      <Paper withBorder radius="md" style={{ position: 'relative', minHeight: 200 }}>
        <LoadingOverlay visible={loading} />
        
        <Tabs defaultValue="mine">
          <Tabs.List>
            {canCreate && <Tabs.Tab value="mine">My Requests</Tabs.Tab>}
            {canManage && <Tabs.Tab value="all">All Requests (Admin)</Tabs.Tab>}
          </Tabs.List>

          {canCreate && (
            <Tabs.Panel value="mine" pt="md">
               {myRequests.length === 0 ? (
                 <Text c="dimmed" ta="center" py="xl">No leave requests found.</Text>
               ) : (
                 <Table striped highlightOnHover>
                   <Table.Thead><Table.Tr><Table.Th>Type</Table.Th><Table.Th>Dates</Table.Th><Table.Th>Reason</Table.Th><Table.Th>Status</Table.Th><Table.Th>Actions</Table.Th></Table.Tr></Table.Thead>
                   <Table.Tbody>{renderRows(myRequests, false)}</Table.Tbody>
                 </Table>
               )}
            </Tabs.Panel>
          )}

          {canManage && (
            <Tabs.Panel value="all" pt="md">
               <Table striped highlightOnHover>
                 <Table.Thead><Table.Tr><Table.Th>Staff</Table.Th><Table.Th>Type</Table.Th><Table.Th>Dates</Table.Th><Table.Th>Reason</Table.Th><Table.Th>Status</Table.Th><Table.Th>Actions</Table.Th></Table.Tr></Table.Thead>
                 <Table.Tbody>{renderRows(allRequests, true)}</Table.Tbody>
               </Table>
            </Tabs.Panel>
          )}
        </Tabs>
      </Paper>
    </AdminLayout>
  );
}