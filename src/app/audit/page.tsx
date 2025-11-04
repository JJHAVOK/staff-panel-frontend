'use client';

import { AdminLayout } from '@/components/AdminLayout';
import api from '@/lib/api';
import {
  Title,
  Alert,
  LoadingOverlay,
  Paper,
  Text,
  Table,
} from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import { useEffect, useState } from 'react';

// Define the type for our log data
interface AuditLog {
  id: string;
  action: string;
  targetId: string | null;
  createdAt: string;
  user: {
    email: string;
  };
}

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setLoading(true);
        const response = await api.get('/audit');
        setLogs(response.data);
      } catch (err: any) {
        if (err.response?.status === 403) {
          setError('You do not have permission to view the audit log.');
        } else {
          setError('Failed to fetch audit log data.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, []);

  const rows = logs.map((log) => (
    <Table.Tr key={log.id}>
      <Table.Td>
        {new Date(log.createdAt).toLocaleString()}
      </Table.Td>
      <Table.Td>{log.user?.email || 'System'}</Table.Td>
      <Table.Td>
        <Text fw={700}>{log.action}</Text>
      </Table.Td>
      <Table.Td>
        <Text fz="xs" ff="monospace">{log.targetId || 'N/A'}</Text>
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <AdminLayout>
      <Title order={2}>System Audit Log</Title>
      <Text c="dimmed" mb="xl">
        A chronological log of all important actions taken in the system.
      </Text>

      <Paper withBorder p="md" radius="md" style={{ position: 'relative' }}>
        <LoadingOverlay visible={loading} />

        {error && (
          <Alert icon={<IconAlertCircle size="1rem" />} title="Error" color="red">
            {error}
          </Alert>
        )}

        {!error && !loading && (
          <Table striped>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Timestamp</Table.Th>
                <Table.Th>User</Table.Th>
                <Table.Th>Action</Table.Th>
                <Table.Th>Target ID</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>{rows}</Table.Tbody>
          </Table>
        )}
      </Paper>
    </AdminLayout>
  );
}
