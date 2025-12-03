'use client';

import { AdminLayout } from '@/components/AdminLayout';
import { Title, Paper, Text, Accordion } from '@mantine/core';

export default function FaqPage() {
  return (
    <AdminLayout>
      <Title order={2} mb="md">Frequently Asked Questions (FAQ)</Title>
      <Paper withBorder p="md" radius="md">
        <Accordion>
          <Accordion.Item value="what-is-this">
            <Accordion.Control>What is this panel?</Accordion.Control>
            <Accordion.Panel>This is the staff admin panel for managing company operations.</Accordion.Panel>
          </Accordion.Item>
          <Accordion.Item value="who-to-contact">
            <Accordion.Control>Who do I contact for help?</Accordion.Control>
            <Accordion.Panel>Please contact your direct manager or the system administrator.</Accordion.Panel>
          </Accordion.Item>
        </Accordion>
      </Paper>
    </AdminLayout>
  );
}
