'use client';

import { AdminLayout } from '@/components/AdminLayout';
import api from '@/lib/api';
import { Title, Paper, Text, Grid, Stack, Group, Badge, LoadingOverlay, Alert } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

// Define the type for the detailed org data
interface OrgProfile {
  id: string;
  name: string;
  industry: string | null;
  website: string | null;
  phone: string | null;
  address: string | null;
  contacts: { id: string; firstName: string; lastName: string; email: string }[];
  opportunities: { id: string; name: string; stage: string; amount: number }[];
}

// Helper: Render a profile field safely
const InfoField = ({ label, value }: { label: string; value: string | null | undefined }) => (
  <div>
    <Text size="xs" tt="uppercase" c="dimmed">{label}</Text>
    <Text>{value || <Text c="dimmed" span>Not set</Text>}</Text>
  </div>
);

export default function OrganizationProfilePage() {
  const [org, setOrg] = useState<OrgProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const params = useParams();
  const { id } = params;

  useEffect(() => {
    if (id) {
      const fetchOrg = async () => {
        try {
          setLoading(true);
          const response = await api.get(`/crm/organizations/${id}`);
          setOrg(response.data);
        } catch (err) {
          setError('Failed to fetch organization profile.');
        } finally {
          setLoading(false);
        }
      };
      fetchOrg();
    }
  }, [id]);

  return (
    <AdminLayout>
      <LoadingOverlay visible={loading} />
      {error && (
        <Alert icon={<IconAlertCircle size="1rem" />} title="Error" color="red">
          {error}
        </Alert>
      )}

      {org && (
        <Stack>
          <Paper withBorder p="md" radius="md">
            <Title order={2}>{org.name}</Title>
            <Group mt="md">
              <InfoField label="Industry" value={org.industry} />
              <InfoField label="Phone" value={org.phone} />
              <InfoField label="Website" value={org.website} />
            </Group>
            <InfoField label="Address" value={org.address} />
          </Paper>

          <Grid>
            <Grid.Col span={6}>
              <Paper withBorder p="md" radius="md">
                <Title order={4}>Contacts ({org.contacts.length})</Title>
                {/* List contacts here */}
              </Paper>
            </Grid.Col>
            <Grid.Col span={6}>
              <Paper withBorder p="md" radius="md">
                <Title order={4}>Opportunities ({org.opportunities.length})</Title>
                {/* List opportunities here */}
              </Paper>
            </Grid.Col>
          </Grid>
        </Stack>
      )}
    </AdminLayout>
  );
}