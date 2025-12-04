'use client';

import { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import {
  Title, Table, Paper, LoadingOverlay, Alert, TextInput, Group, Badge, Stack, Text
} from '@mantine/core';
import { IconSearch, IconShieldLock, IconFilter } from '@tabler/icons-react';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/authStore';

export default function AuditLogPage() {
  const { user } = useAuthStore();
  const canRead = user?.permissions?.includes('audit:read') || user?.permissions?.includes('system:audit:read');

  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterUser, setFilterUser] = useState('');
  const [filterAction, setFilterAction] = useState('');

  const fetchLogs = useCallback(async () => {
    if (!canRead) return;
    setLoading(true);
    try {
      const res = await api.get('/audit'); 
      setLogs(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [canRead]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const filteredLogs = logs.filter(log => {
    const userMatch = filterUser === '' || (log.user?.email || 'system').toLowerCase().includes(filterUser.toLowerCase());
    // Allow partial matching (e.g., "create" matches "user.create" and "project.create")
    const actionMatch = filterAction === '' || log.action.toLowerCase().includes(filterAction.toLowerCase());
    return userMatch && actionMatch;
  });

  const rows = filteredLogs.map((log) => (
    <Table.Tr key={log.id}>
      <Table.Td style={{ whiteSpace: 'nowrap' }}>{new Date(log.createdAt).toLocaleString()}</Table.Td>
      <Table.Td>
         <Group gap="xs">
            <IconShieldLock size={14} color="gray" />
            <Text size="sm" fw={500} style={{ textTransform: 'uppercase' }}>{log.action}</Text>
         </Group>
      </Table.Td>
      <Table.Td>{log.user?.email || <Badge color="gray">System</Badge>}</Table.Td>
      <Table.Td>
         <Badge variant="light" color="gray" style={{ textTransform: 'none' }}>
            {log.targetId || 'N/A'}
         </Badge>
      </Table.Td>
      <Table.Td>
         <Text size="xs" c="dimmed" lineClamp={1} style={{ maxWidth: 300, fontFamily: 'monospace' }}>
            {JSON.stringify(log.payload)}
         </Text>
      </Table.Td>
    </Table.Tr>
  ));

  if (!canRead) return <AdminLayout><Alert color="red">Access Denied</Alert></AdminLayout>;

  return (
    <AdminLayout>
      <Title order={2} mb="xl">Security Audit Log</Title>

      <Paper p="md" radius="md" mb="md" withBorder>
        <Group grow>
           <TextInput 
              label="Filter by User" 
              placeholder="admin@example.com" 
              leftSection={<IconSearch size={16}/>} 
              value={filterUser}
              onChange={(e) => setFilterUser(e.currentTarget.value)}
           />
           {/* Changed to TextInput for flexible searching */}
           <TextInput 
              label="Filter by Action" 
              placeholder="e.g. create, delete, product..." 
              leftSection={<IconFilter size={16}/>} 
              value={filterAction}
              onChange={(e) => setFilterAction(e.currentTarget.value)}
           />
        </Group>
      </Paper>

      <Paper withBorder radius="md">
        <LoadingOverlay visible={loading} />
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Date</Table.Th>
              <Table.Th>Action</Table.Th>
              <Table.Th>User</Table.Th>
              <Table.Th>Target ID</Table.Th>
              <Table.Th>Payload</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>{rows}</Table.Tbody>
        </Table>
      </Paper>
    </AdminLayout>
  );
}