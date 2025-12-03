'use client';

import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import {
  Title, Text, Button, Group, Table, Modal, TextInput, Select,
  Loader, ActionIcon, Stack, Paper, LoadingOverlay, Alert, Tabs,
  Badge, Textarea,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconAlertCircle, IconPlus, IconCheck, IconX } from '@tabler/icons-react';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/authStore';
import { DatePickerInput } from '@mantine/dates'; // Import DatePicker

// --- Types ---
interface LeaveRequest {
  id: string;
  type: string;
  status: 'PENDING' | 'APPROVED' | 'DENIED';
  startDate: string;
  endDate: string;
  reason: string | null;
  createdAt: string;
  // For 'own' requests
  reviewer?: { firstName: string | null; lastName: string | null; };
  // For 'all' requests (admin)
  staffUser?: { firstName: string | null; lastName: string | null; email: string; };
}

// --- Helper Components ---
const statusColors = {
  PENDING: 'yellow',
  APPROVED: 'green',
  DENIED: 'red',
};

// --- Main Page Component ---
export default function LeavePage() {
  const { user } = useAuthStore();
  const userPermissions = user?.permissions || [];
  const canManage = userPermissions.includes('manage:leave');

  const [myRequests, setMyRequests] = useState<LeaveRequest[]>([]);
  const [allRequests, setAllRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpened, setModalOpened] = useState(false);

  const form = useForm({
    initialValues: {
      type: '',
      startDate: null as Date | null,
      endDate: null as Date | null,
      reason: '',
    },
    validate: {
      type: (val) => (val ? null : 'Request type is required'),
      startDate: (val) => (val ? null : 'Start date is required'),
      endDate: (val) => (val ? null : 'End date is required'),
    },
  });

  // --- Data Fetching ---
  const fetchAllRequests = async () => {
    if (!canManage) return;
    try {
      const res = await api.get('/leave/all');
      setAllRequests(res.data);
    } catch (e) {
      setError('Could not load all requests.');
    }
  };

  const fetchMyRequests = async () => {
    try {
      const res = await api.get('/leave/own');
      setMyRequests(res.data);
    } catch (e) {
      setError('Could not load your requests.');
    }
  };

  const loadData = () => {
    setLoading(true);
    setError(null);
    Promise.all([fetchMyRequests(), fetchAllRequests()]).finally(() => {
      setLoading(false);
    });
  };

  useEffect(() => {
    loadData();
  }, [canManage]);

  // --- Handlers ---
  const handleSubmitRequest = async (values: typeof form.values) => {
    try {
      await api.post('/leave/own', {
        ...values,
        startDate: values.startDate?.toISOString(),
        endDate: values.endDate?.toISOString(),
      });
      notifications.show({ title: 'Request Submitted', message: 'Your time off request has been submitted for review.', color: 'green' });
      setModalOpened(false);
      form.reset();
      loadData(); // Refresh list
    } catch (e) {
      notifications.show({ title: 'Error', message: 'Could not submit request.', color: 'red' });
    }
  };

  const handleUpdateStatus = async (id: string, status: 'APPROVED' | 'DENIED') => {
    try {
      await api.patch(`/leave/${id}/status`, { status });
      notifications.show({ title: 'Request Updated', message: `Request has been ${status.toLowerCase()}.`, color: 'blue' });
      loadData(); // Refresh list
    } catch (e) {
      notifications.show({ title: 'Error', message: 'Could not update request status.', color: 'red' });
    }
  };

  // --- Render Functions for Tables ---
  const myRequestsRows = myRequests.map((req) => (
    <Table.Tr key={req.id}>
      <Table.Td><Badge color={statusColors[req.status]}>{req.status}</Badge></Table.Td>
      <Table.Td>{req.type}</Table.Td>
      <Table.Td>{new Date(req.startDate).toLocaleDateString()}</Table.Td>
      <Table.Td>{new Date(req.endDate).toLocaleDateString()}</Table.Td>
      <Table.Td>{req.reason || '-'}</Table.Td>
      <Table.Td>{req.reviewer ? `${req.reviewer.firstName} ${req.reviewer.lastName}` : '-'}</Table.Td>
    </Table.Tr>
  ));

  const allRequestsRows = allRequests.map((req) => (
    <Table.Tr key={req.id}>
      <Table.Td><Badge color={statusColors[req.status]}>{req.status}</Badge></Table.Td>
      <Table.Td>{req.staffUser?.firstName} {req.staffUser?.lastName}</Table.Td>
      <Table.Td>{req.type}</Table.Td>
      <Table.Td>{new Date(req.startDate).toLocaleDateString()}</Table.Td>
      <Table.Td>{new Date(req.endDate).toLocaleDateString()}</Table.Td>
      <Table.Td>
        {req.status === 'PENDING' && (
          <Group gap="xs">
            <ActionIcon color="green" onClick={() => handleUpdateStatus(req.id, 'APPROVED')}>
              <IconCheck size={16} />
            </ActionIcon>
            <ActionIcon color="red" onClick={() => handleUpdateStatus(req.id, 'DENIED')}>
              <IconX size={16} />
            </ActionIcon>
          </Group>
        )}
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <AdminLayout>
      {/* --- Request Modal --- */}
      <Modal opened={modalOpened} onClose={() => setModalOpened(false)} title="Request Time Off">
        <form onSubmit={form.onSubmit(handleSubmitRequest)}>
          <Stack>
            <Select
              label="Request Type"
              placeholder="Select a type"
              data={['VACATION', 'SICK', 'PERSONAL', 'BEREAVEMENT']}
              required
              {...form.getInputProps('type')}
            />
            <DatePickerInput
              label="Start Date"
              placeholder="Select start date"
              required
              {...form.getInputProps('startDate')}
            />
            <DatePickerInput
              label="End Date"
              placeholder="Select end date"
              required
              {...form.getInputProps('endDate')}
            />
            <Textarea
              label="Reason (Optional)"
              placeholder="e.g., Family vacation"
              {...form.getInputProps('reason')}
            />
            <Button type="submit" mt="md">
              Submit Request
            </Button>
          </Stack>
        </form>
      </Modal>

      {/* --- Page Header --- */}
      <Group justify="space-between" mb="xl">
        <Title order={2}>Leave Management</Title>
        <Button onClick={() => setModalOpened(true)} leftSection={<IconPlus size={16} />}>
          Request Time Off
        </Button>
      </Group>

      {/* --- Page Content --- */}
      <Paper withBorder p="md" radius="md" style={{ position: 'relative' }}>
        <LoadingOverlay visible={loading} />
        
        {error && (
          <Alert icon={<IconAlertCircle size="1rem" />} title="Error" color="red">
            {error}
          </Alert>
        )}

        <Tabs defaultValue="my-requests">
          <Tabs.List>
            <Tabs.Tab value="my-requests">My Requests</Tabs.Tab>
            {canManage && <Tabs.Tab value="all-requests">All Requests</Tabs.Tab>}
          </Tabs.List>

          <Tabs.Panel value="my-requests" pt="md">
            <Table striped>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Status</Table.Th>
                  <Table.Th>Type</Table.Th>
                  <Table.Th>Start Date</Table.Th>
                  <Table.Th>End Date</Table.Th>
                  <Table.Th>Reason</Table.Th>
                  <Table.Th>Reviewed By</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>{myRequestsRows}</Table.Tbody>
            </Table>
          </Tabs.Panel>

          {canManage && (
            <Tabs.Panel value="all-requests" pt="md">
              <Table striped>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Status</Table.Th>
                    <Table.Th>Employee</Table.Th>
                    <Table.Th>Type</Table.Th>
                    <Table.Th>Start Date</Table.Th>
                    <Table.Th>End Date</Table.Th>
                    <Table.Th>Actions</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>{allRequestsRows}</Table.Tbody>
              </Table>
            </Tabs.Panel> // <-- THIS WAS THE TYPO (was </Table.Panel>)
          )}
        </Tabs>
      </Paper>
    </AdminLayout>
  );
}