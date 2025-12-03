'use client';

import { AdminLayout } from '@/components/AdminLayout';
import { Title, Paper, Text } from '@mantine/core';

export default function UserSettingsPage() {
  return (
    <AdminLayout>
      <Title order={2} mb="md">User Settings</Title>
      <Paper withBorder p="md" radius="md">
        <Text>User-specific settings (like theme, language, etc.) will go here.</Text>
      </Paper>
    </AdminLayout>
  );
}
