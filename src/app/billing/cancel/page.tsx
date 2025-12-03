'use client';

import { AdminLayout } from '@/components/AdminLayout';
import { Paper, Title, Text, Button, Center, Stack, ThemeIcon } from '@mantine/core';
import { IconX } from '@tabler/icons-react';
import Link from 'next/link';

export default function BillingCancelPage() {
  return (
    <AdminLayout>
      <Center h="60vh">
        <Paper p="xl" radius="md" withBorder style={{ textAlign: 'center' }}>
          <Stack align="center" gap="lg">
            <ThemeIcon color="red" size={80} radius="50%">
              <IconX size={50} />
            </ThemeIcon>
            <Title order={2}>Payment Cancelled</Title>
            <Text c="dimmed">
              The checkout process was cancelled. No charges were made.
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
