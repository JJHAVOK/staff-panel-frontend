'use client';

import { AdminLayout } from '@/components/AdminLayout';
import { Paper, Title, Text, Button, Center, Stack, ThemeIcon } from '@mantine/core';
import { IconCheck } from '@tabler/icons-react';
import Link from 'next/link';

export default function BillingSuccessPage() {
  return (
    <AdminLayout>
      <Center h="60vh">
        <Paper p="xl" radius="md" withBorder style={{ textAlign: 'center' }}>
          <Stack align="center" gap="lg">
            <ThemeIcon color="green" size={80} radius="50%">
              <IconCheck size={50} />
            </ThemeIcon>
            <Title order={2}>Payment Successful!</Title>
            <Text c="dimmed">
              The subscription has been successfully created or updated.
            </Text>
            <Button component={Link} href="/billing" variant="outline">
              Return to Billing Dashboard
            </Button>
          </Stack>
        </Paper>
      </Center>
    </AdminLayout>
  );
}
