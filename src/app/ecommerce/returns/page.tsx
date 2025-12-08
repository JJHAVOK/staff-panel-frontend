'use client';

import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { Title, Table, Badge, Paper, LoadingOverlay, Select, Button, Group, Text } from '@mantine/core';
import api from '@/lib/api';
import { notifications } from '@mantine/notifications';

export default function ReturnsPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReturns = async () => {
    try {
      const res = await api.get('/ecommerce/returns');
      setRequests(res.data);
    } catch(e) {} finally { setLoading(false); }
  };

  useEffect(() => { fetchReturns(); }, []);

  const handleUpdate = async (id: string, status: string) => {
     try {
        await api.patch(`/ecommerce/returns/${id}`, { status });
        notifications.show({ title: 'Success', message: `Marked as ${status}`, color: 'green' });
        fetchReturns();
     } catch(e) { notifications.show({ title: 'Error', message: 'Failed to update', color: 'red' }); }
  };

  const rows = requests.map((r) => (
    <Table.Tr key={r.id}>
      <Table.Td>{r.order.orderNumber}</Table.Td>
      <Table.Td>
         <Text size="sm" fw={500}>{r.orderItem.productName}</Text>
         <Text size="xs" c="dimmed">Reason: {r.reason}</Text>
      </Table.Td>
      <Table.Td>{r.customer.firstName} {r.customer.lastName}</Table.Td>
      <Table.Td>
         <Badge color={r.status === 'PENDING' ? 'yellow' : r.status === 'APPROVED' ? 'green' : 'gray'}>{r.status}</Badge>
      </Table.Td>
      <Table.Td>
         {r.status === 'PENDING' && (
             <Group gap="xs">
                <Button size="xs" color="green" onClick={() => handleUpdate(r.id, 'APPROVED')}>Approve</Button>
                <Button size="xs" color="red" variant="outline" onClick={() => handleUpdate(r.id, 'REJECTED')}>Reject</Button>
             </Group>
         )}
         {r.status === 'APPROVED' && (
             <Button size="xs" color="blue" onClick={() => handleUpdate(r.id, 'REFUNDED')}>Mark Refunded</Button>
         )}
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <AdminLayout>
      <Title order={2} mb="xl">Returns & RMA</Title>
      <Paper p="md" radius="md" withBorder>
         <LoadingOverlay visible={loading} />
         <Table striped highlightOnHover>
            <Table.Thead><Table.Tr><Table.Th>Order</Table.Th><Table.Th>Item & Reason</Table.Th><Table.Th>Customer</Table.Th><Table.Th>Status</Table.Th><Table.Th>Actions</Table.Th></Table.Tr></Table.Thead>
            <Table.Tbody>{rows.length > 0 ? rows : <Table.Tr><Table.Td colSpan={5} align="center">No returns found.</Table.Td></Table.Tr>}</Table.Tbody>
         </Table>
      </Paper>
    </AdminLayout>
  );
}
