'use client';

import { AdminLayout } from '@/components/AdminLayout';
import api from '@/lib/api';
import { Title, Paper, Text, Stack, LoadingOverlay, Alert } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

// Define the type for the detailed contact data
interface ContactProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  title: string | null;
  phone: string | null;
  organization: { id: string; name: string } | null;
  opportunities: { id: string; name: string; stage: string; amount: number }[];
}

// Helper: Render a profile field safely
const InfoField = ({ label, value }: { label: string; value: string | null | undefined }) => (
  <div>
    <Text size="xs" tt="uppercase" c="dimmed">{label}</Text>
    <Text>{value || <Text c="dimmed" span>Not set</Text>}</Text>
  </div>
);

export default function ContactProfilePage() {
  const [contact, setContact] = useState<ContactProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const params = useParams();
  const { id } = params;

  useEffect(() => {
    if (id) {
      const fetchContact = async () => {
        try {
          setLoading(true);
          const response = await api.get(`/crm/contacts/${id}`);
          setContact(response.data);
        } catch (err) {
          setError('Failed to fetch contact profile.');
        } finally {
          setLoading(false);
        }
      };
      fetchContact();
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

      {contact && (
        <Stack>
          <Paper withBorder p="md" radius="md">
            <Title order={2}>{contact.firstName} {contact.lastName}</Title>
            <Text c="dimmed">{contact.title || 'No title'}</Text>
            <Stack mt="md">
              <InfoField label="Email" value={contact.email} />
              <InfoField label="Phone" value={contact.phone} />
              <InfoField label="Organization" value={contact.organization?.name} />
            </Stack>
          </Paper>

          <Paper withBorder p="md" radius="md">
            <Title order={4}>Opportunities ({contact.opportunities.length})</Title>
            {/* List opportunities here */}
          </Paper>
        </Stack>
      )}
    </AdminLayout>
  );
}
