'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Paper, Title, Text, Group, Button, Table, Badge, Stack,
  Card, LoadingOverlay, Modal, NumberInput, TextInput,
  ActionIcon, Tooltip
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconExternalLink, IconCreditCard, IconReceipt2, IconPlus, IconEye } from '@tabler/icons-react';
import api from '@/lib/api';

interface BillingManagerProps {
  organizationId: string;
  canManage: boolean;
}

export function BillingManager({ organizationId, canManage }: BillingManagerProps) {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);

  // Form for creating manual invoice
  const invoiceForm = useForm({
    initialValues: { amount: 0, description: '' },
    validate: {
      amount: (val) => (val > 0 ? null : 'Amount must be positive'),
      description: (val) => (val.length > 3 ? null : 'Description required'),
    },
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [subRes, invRes] = await Promise.all([
        api.get(`/billing/subscription/${organizationId}`),
        api.get(`/billing/invoices/${organizationId}`),
      ]);
      setSubscription(subRes.data);
      setInvoices(invRes.data);
    } catch (e) {
      console.error(e);
      notifications.show({ title: 'Error', message: 'Could not fetch billing data.', color: 'red' });
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Open Stripe Customer Portal
  const handleOpenPortal = async () => {
    try {
      const res = await api.post('/billing/portal', { organizationId });
      window.location.href = res.data.url;
    } catch (e) {
      notifications.show({ title: 'Error', message: 'Could not open billing portal.', color: 'red' });
    }
  };

  // Create Manual Invoice
  const handleCreateInvoice = async (values: typeof invoiceForm.values) => {
    try {
      await api.post('/billing/invoice', {
        organizationId,
        ...values,
      });
      notifications.show({ title: 'Sent', message: 'Invoice created successfully.', color: 'green' });
      setInvoiceModalOpen(false);
      invoiceForm.reset();
      fetchData(); // Refresh list
    } catch (e) {
      notifications.show({ title: 'Error', message: 'Failed to create invoice.', color: 'red' });
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase() }).format(amount / 100);
  };

  return (
    <Stack>
      <Modal opened={invoiceModalOpen} onClose={() => setInvoiceModalOpen(false)} title="Create One-Off Invoice">
        <form onSubmit={invoiceForm.onSubmit(handleCreateInvoice)}>
          <Stack>
            {/* --- 👇 FIXED PROP HERE (decimalScale instead of precision) 👇 --- */}
            <NumberInput 
              label="Amount ($)" 
              placeholder="100.00" 
              decimalScale={2} 
              fixedDecimalScale
              {...invoiceForm.getInputProps('amount')} 
            />
            {/* --- 👆 END OF FIX 👆 --- */}
            <TextInput label="Description" placeholder="Consulting hours..." {...invoiceForm.getInputProps('description')} />
            <Button type="submit" color="blue">Send Invoice</Button>
          </Stack>
        </form>
      </Modal>

      {/* --- STATUS CARD --- */}
      <Card withBorder padding="lg" radius="md">
        <Group justify="space-between">
          <div>
            <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Current Status</Text>
            {subscription ? (
              <Badge color="green" size="lg" mt="xs">ACTIVE SUBSCRIPTION</Badge>
            ) : (
              <Badge color="gray" size="lg" mt="xs">NO ACTIVE SUBSCRIPTION</Badge>
            )}
          </div>
          {canManage && (
            <Button variant="light" leftSection={<IconExternalLink size={14} />} onClick={handleOpenPortal}>
              Manage Cards & Billing
            </Button>
          )}
        </Group>
        
        {subscription && (
          <Group mt="md">
            <Text size="sm">Plan: <b>{(subscription.items.data[0].price.unit_amount / 100).toFixed(2)} / {subscription.items.data[0].price.recurring.interval}</b></Text>
            <Text size="sm">Next Billing: <b>{new Date(subscription.current_period_end * 1000).toLocaleDateString()}</b></Text>
          </Group>
        )}
      </Card>

      {/* --- INVOICE HISTORY --- */}
      <Paper withBorder p="md" radius="md" style={{ position: 'relative' }}>
        <LoadingOverlay visible={loading} />
        <Group justify="space-between" mb="md">
          <Title order={4}>Transaction History</Title>
          {canManage && (
            <Button size="xs" leftSection={<IconPlus size={14} />} onClick={() => setInvoiceModalOpen(true)}>
              Create Invoice
            </Button>
          )}
        </Group>

        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Date</Table.Th>
              <Table.Th>Amount</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th>Number</Table.Th>
              <Table.Th>View</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {invoices.map((inv) => (
              <Table.Tr key={inv.id}>
                <Table.Td>{new Date(inv.created * 1000).toLocaleDateString()}</Table.Td>
                <Table.Td>{formatCurrency(inv.total, inv.currency)}</Table.Td>
                <Table.Td>
                  <Badge color={inv.status === 'paid' ? 'green' : inv.status === 'open' ? 'blue' : 'gray'}>
                    {inv.status}
                  </Badge>
                </Table.Td>
                <Table.Td>{inv.number}</Table.Td>
                <Table.Td>
                  {inv.hosted_invoice_url && (
                    <Tooltip label="View Invoice on Stripe">
                      <ActionIcon component="a" href={inv.hosted_invoice_url} target="_blank" variant="subtle">
                        <IconEye size={16} />
                      </ActionIcon>
                    </Tooltip>
                  )}
                </Table.Td>
              </Table.Tr>
            ))}
            {invoices.length === 0 && (
              <Table.Tr><Table.Td colSpan={5} align="center">No invoices found.</Table.Td></Table.Tr>
            )}
          </Table.Tbody>
        </Table>
      </Paper>
    </Stack>
  );
}