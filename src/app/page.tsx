'use client'; // This page now needs to be a client component to work with the layout

import { AdminLayout } from '@/components/AdminLayout';
import { Title, Text, Paper } from '@mantine/core';
import { useAuthStore } from '@/lib/authStore';

export default function HomePage() {
  // Get the user's data from the auth store
  const { user } = useAuthStore();

  return (
    <AdminLayout>
      <Title order={2}>Welcome, {user?.email || 'Admin'}!</Title>
      <Text c="dimmed" size="lg">
        You are successfully logged in.
      </Text>

      <Paper withBorder p="md" mt="xl">
        <Title order={4}>Your Permissions:</Title>
        {user?.permissions?.length ? (
          <ul>
            {user.permissions.map((perm) => (
              <li key={perm}>{perm}</li>
            ))}
          </ul>
        ) : (
          <Text>You have no permissions assigned.</Text>
        )}
      </Paper>
    </AdminLayout>
  );
}