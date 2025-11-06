'use client';

import { AdminLayout } from '@/components/AdminLayout';
import api from '@/lib/api';
import { Title, Paper, Text, Stack, LoadingOverlay, Alert, Anchor, Badge, Group } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';

// Define the type for the detailed opp data
interface OpportunityProfile {
  id: string;
  name: string;
  stage: string;
  amount: number;
  priority: string;
  closeDate: string;
  organization: { id: string; name: string };
  contact: { id: string; firstName: string; lastName: string };
}

// Helper: Render a profile field safely
const InfoField = ({ label, value }: { label: string; value: string | number | null | undefined }) => (
  <div>
    <Text size="xs" tt="uppercase" c="dimmed">{label}</Text>
    <Text>{value || <Text c="dimmed" span>Not set</Text>}</Text>
  </div>
);

export default function OpportunityProfilePage() {
  const [opp, setOpp] = useState<OpportunityProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const params = useParams();
  const { id } = params;

  useEffect(() => {
    if (id) {
      const fetchOpp = async () => {
        try {
          setLoading(true);
          const response = await api.get(`/crm/opportunities/${id}`);
          setOpp(response.data);
        } catch (err) {
          setError('Failed to fetch opportunity profile.');
        } finally {
          setLoading(false);
        }
      };
      fetchOpp();
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

      {opp && (
        <Stack>
          <Paper withBorder p="md" radius="md">
            <Group justify="space-between">
              <Title order={2}>{opp.name}</Title>
              <Badge size="lg">{opp.stage}</Badge>
            </Group>
            <Title order={1} c="green.4" mt="xs">
              ${opp.amount.toLocaleString()}
            </Title>

            <Stack mt="xl">
              <InfoField label="Priority" value={opp.priority} />
              <InfoField label="Close Date" value={new Date(opp.closeDate).toLocaleDateString()} />
              <div>
                <Text size="xs" tt="uppercase" c="dimmed">Organization</Text>
                <Anchor component={Link} href={`/crm/organizations/${opp.organization.id}`}>
                  {opp.organization.name}
                </Anchor>
              </div>
              <div>
                <Text size="xs" tt="uppercase" c="dimmed">Primary Contact</Text>
                <Anchor component={Link} href={`/crm/contacts/${opp.contact.id}`}>
                  {opp.contact.firstName} {opp.contact.lastName}
                </Anchor>
              </div>
            </Stack>
          </Paper>
        </Stack>
      )}
    </AdminLayout>
  );
}
