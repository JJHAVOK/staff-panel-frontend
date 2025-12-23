'use client';

import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import {
  Title, Text, Button, Group, Table, Modal, TextInput, Select,
  Loader, ActionIcon, Stack, Paper, LoadingOverlay, Alert, Tabs,
  Badge, Textarea, Card,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconAlertCircle, IconClockPlay, IconClockOff, IconNotes } from '@tabler/icons-react';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/authStore';
import { useDisclosure } from '@mantine/hooks';
import { DataActions } from '@/components/DataActions/DataActions';

interface Timesheet {
  id: string;
  clockIn: string;
  clockOut: string | null;
  notes: string | null;
  staffUser?: { firstName: string | null; lastName: string | null; email: string; };
}

const formatDuration = (clockIn: string, clockOut: string | null): string => {
  if (!clockOut) return 'Active';
  const inTime = new Date(clockIn).getTime();
  const outTime = new Date(clockOut).getTime();
  const diffMs = outTime - inTime;
  const hours = Math.floor(diffMs / 3600000);
  const minutes = Math.floor((diffMs % 3600000) / 60000);
  return `${hours}h ${minutes}m`;
};

const formatTime = (date: string) => new Date(date).toLocaleString();

function ClockWidget({ onUpdate }: { onUpdate: () => void }) {
  const [currentSheet, setCurrentSheet] = useState<Timesheet | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpened, { open, close }] = useDisclosure(false);

  const form = useForm({ initialValues: { notes: '' } });

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await api.get('/timesheets/status');
      setCurrentSheet(res.data);
    } catch (e) {
      notifications.show({ title: 'Error', message: 'Could not fetch status.', color: 'red' });
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchStatus(); }, []);

  const handleClockIn = async () => {
    setLoading(true);
    try {
      await api.post('/timesheets/clock-in');
      notifications.show({ title: 'Clocked In', message: 'Shift started.', color: 'green' });
      fetchStatus(); onUpdate();
    } catch (e: any) {
      notifications.show({ title: 'Error', message: e.response?.data?.message || 'Failed.', color: 'red' });
    } finally { setLoading(false); }
  };

  const handleClockOut = async (values: { notes: string }) => {
    setLoading(true);
    try {
      await api.post('/timesheets/clock-out', { notes: values.notes });
      notifications.show({ title: 'Clocked Out', message: 'Shift ended.', color: 'blue' });
      close(); form.reset(); fetchStatus(); onUpdate();
    } catch (e: any) {
      notifications.show({ title: 'Error', message: e.response?.data?.message || 'Failed.', color: 'red' });
    } finally { setLoading(false); }
  };

  return (
    <>
      <Modal opened={modalOpened} onClose={close} title="Clock Out">
        <form onSubmit={form.onSubmit(handleClockOut)}>
          <Stack>
            <Textarea label="Shift Notes" placeholder="What did you work on?" {...form.getInputProps('notes')} />
            <Button type="submit" loading={loading} color="blue">Confirm Clock Out</Button>
          </Stack>
        </form>
      </Modal>
      <Card withBorder radius="md" p="lg" mb="xl">
        <Group justify="space-between">
          {currentSheet ? (
            <Stack gap="xs"><Title order={3}>You are clocked in!</Title><Text c="dimmed">Started: {formatTime(currentSheet.clockIn)}</Text></Stack>
          ) : (
            <Title order={3}>You are currently clocked out.</Title>
          )}
          {currentSheet ? (
            <Button color="orange" leftSection={<IconClockOff size={16} />} onClick={open} loading={loading}>Clock Out</Button>
          ) : (
            <Button color="green" leftSection={<IconClockPlay size={16} />} onClick={handleClockIn} loading={loading}>Clock In</Button>
          )}
        </Group>
      </Card>
    </>
  );
}

export default function TimesheetsPage() {
  const { user } = useAuthStore();
  const userPermissions = user?.permissions || [];
  // 👇 UPDATED PERMISSION CHECK TO MATCH SEED.TS
  const canManage = userPermissions.includes('hr:timesheet:manage');

  const [mySheets, setMySheets] = useState<Timesheet[]>([]);
  const [allSheets, setAllSheets] = useState<Timesheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string | null>('my-timesheets');

  const fetchAllSheets = async () => {
    if (!canManage) return;
    try { const res = await api.get('/timesheets/all'); setAllSheets(res.data); } catch (e) { setError('Could not load all timesheets.'); }
  };

  const fetchMySheets = async () => {
    try { const res = await api.get('/timesheets/own'); setMySheets(res.data); } catch (e) { setError('Could not load your timesheets.'); }
  };

  const loadData = () => {
    setLoading(true); setError(null);
    Promise.all([fetchMySheets(), fetchAllSheets()]).finally(() => { setLoading(false); });
  };

  useEffect(() => { loadData(); }, [canManage]);

  const myRows = mySheets.map((sheet) => (
    <Table.Tr key={sheet.id}>
      <Table.Td>{formatTime(sheet.clockIn)}</Table.Td>
      <Table.Td>{sheet.clockOut ? formatTime(sheet.clockOut) : <Badge color="green">Active</Badge>}</Table.Td>
      <Table.Td>{formatDuration(sheet.clockIn, sheet.clockOut)}</Table.Td>
      <Table.Td>{sheet.notes || '-'}</Table.Td>
    </Table.Tr>
  ));

  const allRows = allSheets.map((sheet) => (
    <Table.Tr key={sheet.id}>
      <Table.Td>{sheet.staffUser?.firstName} {sheet.staffUser?.lastName}</Table.Td>
      <Table.Td>{formatTime(sheet.clockIn)}</Table.Td>
      <Table.Td>{sheet.clockOut ? formatTime(sheet.clockOut) : <Badge color="green">Active</Badge>}</Table.Td>
      <Table.Td>{formatDuration(sheet.clockIn, sheet.clockOut)}</Table.Td>
    </Table.Tr>
  ));

  return (
    <AdminLayout>
      <Group justify="space-between" mb="xl">
          <Title order={2}>Timesheets & Attendance</Title>
          <DataActions 
             entity="timesheets" 
             canImport={false} 
             exportParams={{ scope: activeTab === 'all-timesheets' ? 'all' : 'own' }} 
          />
      </Group>

      <ClockWidget onUpdate={loadData} />

      <Paper withBorder p="md" radius="md">
        <LoadingOverlay visible={loading} />
        {error && <Alert icon={<IconAlertCircle size="1rem" />} title="Error" color="red">{error}</Alert>}

        <Tabs value={activeTab} onChange={setActiveTab}>
          <Tabs.List>
            <Tabs.Tab value="my-timesheets">My Timesheets</Tabs.Tab>
            {canManage && <Tabs.Tab value="all-timesheets">All Timesheets</Tabs.Tab>}
          </Tabs.List>

          <Tabs.Panel value="my-timesheets" pt="md">
            <Table striped>
              <Table.Thead><Table.Tr><Table.Th>Clock In</Table.Th><Table.Th>Clock Out</Table.Th><Table.Th>Duration</Table.Th><Table.Th>Notes</Table.Th></Table.Tr></Table.Thead>
              <Table.Tbody>{myRows}</Table.Tbody>
            </Table>
          </Tabs.Panel>

          {canManage && (
            <Tabs.Panel value="all-timesheets" pt="md">
              <Table striped>
                <Table.Thead><Table.Tr><Table.Th>Employee</Table.Th><Table.Th>Clock In</Table.Th><Table.Th>Clock Out</Table.Th><Table.Th>Duration</Table.Th></Table.Tr></Table.Thead>
                <Table.Tbody>{allRows}</Table.Tbody>
              </Table>
            </Tabs.Panel>
          )}
        </Tabs>
      </Paper>
    </AdminLayout>
  );
}