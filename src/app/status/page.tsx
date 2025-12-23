'use client';

import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import api from '@/lib/api';
import {
  Title, Text, Paper, LoadingOverlay, Alert, Group,
  Badge, ThemeIcon, Stack, Button, SimpleGrid
} from '@mantine/core';
import { IconAlertCircle, IconCheck, IconX, IconHeartbeat, IconServer, IconDatabase, IconBrandOpenai, IconSearch } from '@tabler/icons-react';

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
      // Ensure we always have an array, even if API fails partially
      setStatuses(Array.isArray(response.data) ? response.data : []);
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

  const getServiceIcon = (name: string) => {
      const lower = name.toLowerCase();
      if (lower.includes('database') || lower.includes('postgres')) return <IconDatabase size={20}/>;
      if (lower.includes('redis') || lower.includes('cache')) return <IconServer size={20}/>;
      if (lower.includes('openai') || lower.includes('ai')) return <IconBrandOpenai size={20}/>;
      if (lower.includes('elastic') || lower.includes('search')) return <IconSearch size={20}/>;
      return <IconServer size={20}/>;
  };

  const getStatusColor = (status: string) => status === 'online' ? 'teal' : 'red';

  return (
    <AdminLayout>
      <Group justify="space-between" mb="xl">
        <Group>
          <ThemeIcon size={40} radius="md" variant="light" color="blue"><IconHeartbeat size={24} /></ThemeIcon>
          <div>
              <Title order={2}>System Status</Title>
              <Text c="dimmed" size="sm">Real-time infrastructure monitoring</Text>
          </div>
        </Group>
        <Button onClick={fetchStatus} loading={loading} variant="light">
          Refresh Status
        </Button>
      </Group>

      <Paper withBorder p="md" radius="md" style={{ position: 'relative', minHeight: '200px' }}>
        <LoadingOverlay visible={loading} />

        {error && (
          <Alert icon={<IconAlertCircle size="1rem" />} title="Error" color="red">
            {error}
          </Alert>
        )}

        {!error && !loading && (
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
            {statuses.map((service) => (
              <Paper key={service.name} withBorder p="lg" radius="md" style={{ borderColor: service.status === 'online' ? 'var(--mantine-color-teal-3)' : 'var(--mantine-color-red-3)' }}>
                <Group justify="space-between" mb="xs">
                  <Group>
                    <ThemeIcon color={getStatusColor(service.status)} variant="light" size="lg" radius="md">
                        {getServiceIcon(service.name)}
                    </ThemeIcon>
                    <Text fw={700} size="lg">{service.name}</Text>
                  </Group>
                  <Badge color={getStatusColor(service.status)} variant="dot" size="lg">
                    {service.status.toUpperCase()}
                  </Badge>
                </Group>
                <Text c="dimmed" size="sm" mt="md" ff="monospace" bg="gray.0" p="xs" style={{ borderRadius: '4px' }}>
                  {service.message}
                </Text>
              </Paper>
            ))}
          </SimpleGrid>
        )}
        
        {!loading && statuses.length === 0 && !error && (
            <Alert color="orange" title="No Data">No monitoring services configured.</Alert>
        )}
      </Paper>
    </AdminLayout>
  );
}