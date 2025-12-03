'use client';

import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import api from '@/lib/api';
import {
  Title, Text, Paper, LoadingOverlay, Alert, Group,
  Badge, ThemeIcon, Stack, Button,
} from '@mantine/core';
import { IconAlertCircle, IconCheck, IconX, IconHeartbeat } from '@tabler/icons-react';

interface ServiceStatus {
  name: string;
  status: 'online' | 'offline';
  message: string;
}

export default function StatusPage() {
  const [statuses, setStatuses] = useState<ServiceStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/monitoring/status');
      setStatuses(response.data);
    } catch (err: any) {
      if (err.response?.status === 403) {
        setError('You do not have permission to view system status.');
      } else {
        setError('Failed to fetch system status.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const getStatusIcon = (status: 'online' | 'offline') => {
    if (status === 'online') {
      return <ThemeIcon color="teal" size={24} radius="xl"><IconCheck size={16} /></ThemeIcon>;
    }
    return <ThemeIcon color="red" size={24} radius="xl"><IconX size={16} /></ThemeIcon>;
  };

  return (
    <AdminLayout>
      <Group justify="space-between" mb="xl">
        <Group>
          <IconHeartbeat size={32} />
          <Title order={2}>System Status</Title>
        </Group>
        <Button onClick={fetchStatus} loading={loading}>
          Refresh Status
        </Button>
      </Group>
      <Text c="dimmed" mb="xl">
        Live status of all critical infrastructure services. Checks run every 5 minutes.
      </Text>

      <Paper withBorder p="md" radius="md" style={{ position: 'relative' }}>
        <LoadingOverlay visible={loading} />

        {error && (
          <Alert icon={<IconAlertCircle size="1rem" />} title="Error" color="red">
            {error}
          </Alert>
        )}

        {!error && !loading && (
          <Stack gap="lg">
            {statuses.map((service) => (
              <Paper key={service.name} withBorder p="lg" radius="md" bg="dark.7">
                <Group justify="space-between">
                  <Group>
                    {getStatusIcon(service.status)}
                    <Text fz="lg" fw={700}>{service.name}</Text>
                  </Group>
                  <Badge color={service.status === 'online' ? 'teal' : 'red'} size="lg">
                    {service.status.toUpperCase()}
                  </Badge>
                </Group>
                <Text c="dimmed" size="sm" mt="sm" ff="monospace">
                  {service.message}
                </Text>
              </Paper>
            ))}
          </Stack>
        )}
      </Paper>
    </AdminLayout>
  );
}
