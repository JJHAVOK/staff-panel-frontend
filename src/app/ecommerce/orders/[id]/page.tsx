'use client';

import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import {
  Title, Text, Button, Group, Table, Badge, Paper, LoadingOverlay, Alert, Stack,
  Grid, Card, ThemeIcon, Menu, TextInput, NumberInput, Select, Modal
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { 
  IconTruck, IconTrash, IconArrowLeft, IconDots, IconUser, IconAlertCircle, IconPencil 
} from '@tabler/icons-react';
import api from '@/lib/api';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/authStore';
import Link from 'next/link';

export default function OrderDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { id } = params;
  
  const { user } = useAuthStore();
  const userPermissions = user?.permissions || [];
  const canManage = userPermissions.includes('manage:orders');

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [editModalOpened, { open: openEdit, close: closeEdit }] = useDisclosure(false);
  const [shipmentModalOpened, { open: openShipment, close: closeShipment }] = useDisclosure(false);

  // Forms
  const editOrderForm = useForm({
    initialValues: { status: '', totalAmount: 0 },
  });

  const shipmentForm = useForm({
    initialValues: { carrier: '', trackingNumber: '', trackingUrl: '' },
    validate: {
      carrier: (val) => (val.length < 2 ? 'Carrier required' : null),
      trackingNumber: (val) => (val.length < 5 ? 'Tracking number too short' : null),
    },
  });

  const fetchOrder = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/ecommerce/orders/${id}`);
      setOrder(res.data);
    } catch (e) {
      setError('Could not fetch order details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchOrder();
  }, [id]);

  // --- Handlers ---

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to PERMANENTLY delete this order?')) return;
    try {
      await api.delete(`/ecommerce/orders/${id}`);
      notifications.show({ title: 'Deleted', message: 'Order removed.', color: 'green' });
      router.push('/ecommerce/orders');
    } catch (e) {
      notifications.show({ title: 'Error', message: 'Delete failed.', color: 'red' });
    }
  };

  const handleStatusUpdate = async (status: string) => {
    try {
      await api.patch(`/ecommerce/orders/${id}`, { status });
      notifications.show({ title: 'Updated', message: `Status changed to ${status}`, color: 'blue' });
      fetchOrder();
    } catch (e) {
      notifications.show({ title: 'Error', message: 'Update failed.', color: 'red' });
    }
  };

  const handleEditOrder = async (values: typeof editOrderForm.values) => {
    try {
      await api.patch(`/ecommerce/orders/${id}`, values);
      notifications.show({ title: 'Updated', message: 'Order details updated.', color: 'green' });
      closeEdit();
      fetchOrder();
    } catch (e) {
      notifications.show({ title: 'Error', message: 'Update failed.', color: 'red' });
    }
  };

  const handleShipment = async (values: typeof shipmentForm.values) => {
    try {
      await api.post(`/ecommerce/orders/${id}/shipments`, values);
      notifications.show({ title: 'Shipped', message: 'Shipment added.', color: 'green' });
      closeShipment();
      shipmentForm.reset();
      fetchOrder();
    } catch (e) {
      notifications.show({ title: 'Error', message: 'Failed to add shipment.', color: 'red' });
    }
  };

  // Openers
  const openEditModal = () => {
    if (order) {
      editOrderForm.setValues({
        status: order.status,
        totalAmount: order.totalAmount,
      });
      openEdit();
    }
  };

  if (loading) return <AdminLayout><LoadingOverlay visible /></AdminLayout>;
  if (error || !order) return <AdminLayout><Alert color="red">{error || 'Not found'}</Alert></AdminLayout>;

  return (
    <AdminLayout>
      {/* --- Edit Modal --- */}
      <Modal opened={editModalOpened} onClose={closeEdit} title="Edit Order Details">
        <form onSubmit={editOrderForm.onSubmit(handleEditOrder)}>
          <Stack>
            <Select 
              label="Status" 
              data={['PENDING', 'PAID', 'PROCESSING', 'SHIPPED', 'FULFILLED', 'CANCELLED', 'REFUNDED']}
              {...editOrderForm.getInputProps('status')} 
            />
            <NumberInput 
               label="Total Amount" 
               prefix="$" 
               decimalScale={2}
               fixedDecimalScale
               {...editOrderForm.getInputProps('totalAmount')} 
            />
            <Button type="submit">Save Changes</Button>
          </Stack>
        </form>
      </Modal>

      {/* --- Shipment Modal --- */}
      <Modal opened={shipmentModalOpened} onClose={closeShipment} title="Add Shipment Info">
        <form onSubmit={shipmentForm.onSubmit(handleShipment)}>
          <Stack>
             <TextInput label="Carrier" placeholder="e.g. UPS, FedEx" required {...shipmentForm.getInputProps('carrier')} />
             <TextInput label="Tracking Number" placeholder="1Z999..." required {...shipmentForm.getInputProps('trackingNumber')} />
             <TextInput label="Tracking URL (Optional)" placeholder="https://..." {...shipmentForm.getInputProps('trackingUrl')} />
             <Button type="submit">Mark Shipped</Button>
          </Stack>
        </form>
      </Modal>

      <Group mb="lg">
        <Button variant="subtle" leftSection={<IconArrowLeft size={16} />} component={Link} href="/ecommerce/orders">
          Back to Orders
        </Button>
      </Group>

      <Group justify="space-between" mb="xl">
        <div>
          <Group>
            <Title order={2}>Order {order.orderNumber}</Title>
            <Badge size="lg" color={order.status === 'PAID' ? 'green' : 'gray'}>{order.status}</Badge>
          </Group>
          <Text c="dimmed">{new Date(order.createdAt).toLocaleString()}</Text>
        </div>
        
        {canManage && (
          <Menu shadow="md" width={200}>
            <Menu.Target>
              <Button variant="default" leftSection={<IconDots size={16} />}>Actions</Button>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Label>Manage</Menu.Label>
              {/* --- NEW ACTIONS --- */}
              <Menu.Item leftSection={<IconPencil size={14} />} onClick={openEditModal}>
                Edit Details
              </Menu.Item>
              <Menu.Item leftSection={<IconTruck size={14} />} onClick={openShipment}>
                Update Shipping
              </Menu.Item>
              {/* --- END NEW ACTIONS --- */}
              
              <Menu.Divider />
              <Menu.Label>Status</Menu.Label>
              <Menu.Item onClick={() => handleStatusUpdate('PAID')}>Mark Paid</Menu.Item>
              <Menu.Item onClick={() => handleStatusUpdate('CANCELLED')}>Mark Cancelled</Menu.Item>
              <Menu.Item onClick={() => handleStatusUpdate('REFUNDED')}>Mark Refunded</Menu.Item>
              <Menu.Divider />
              <Menu.Label>Danger Zone</Menu.Label>
              <Menu.Item color="red" leftSection={<IconTrash size={14} />} onClick={handleDelete}>
                Delete Order
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        )}
      </Group>

      <Grid>
        <Grid.Col span={{ base: 12, md: 8 }}>
          <Paper withBorder p="md" radius="md" mb="md">
            <Title order={4} mb="md">Items</Title>
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Product</Table.Th>
                  <Table.Th>SKU</Table.Th>
                  <Table.Th>Qty</Table.Th>
                  <Table.Th>Price</Table.Th>
                  <Table.Th>Total</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {order.items.map((item: any) => (
                  <Table.Tr key={item.id}>
                    <Table.Td>{item.productName}</Table.Td>
                    <Table.Td>{item.productSku}</Table.Td>
                    <Table.Td>{item.quantity}</Table.Td>
                    <Table.Td>${item.unitPrice.toFixed(2)}</Table.Td>
                    <Table.Td>${(item.unitPrice * item.quantity).toFixed(2)}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
            <Group justify="flex-end" mt="md">
              <Text fw={700} size="xl">Total: ${order.totalAmount.toFixed(2)}</Text>
            </Group>
          </Paper>

          <Paper withBorder p="md" radius="md">
            <Title order={4} mb="md">Shipments</Title>
            {order.shipments.length === 0 ? (
              <Text c="dimmed">No shipments created.</Text>
            ) : (
              <Stack>
                {order.shipments.map((ship: any) => (
                  <Card key={ship.id} withBorder padding="sm">
                    <Group justify="space-between">
                      <Group>
                        <ThemeIcon color="blue" variant="light"><IconTruck size={16} /></ThemeIcon>
                        <Text fw={500}>{ship.carrier}</Text>
                        <Text>{ship.trackingNumber}</Text>
                      </Group>
                      <Badge>{ship.status}</Badge>
                    </Group>
                  </Card>
                ))}
              </Stack>
            )}
          </Paper>
        </Grid.Col>
        
        <Grid.Col span={{ base: 12, md: 4 }}>
          <Paper withBorder p="md" radius="md">
            <Title order={4} mb="md">Customer</Title>
            <Group mb="xs">
              <ThemeIcon variant="light" color="gray"><IconUser size={16} /></ThemeIcon>
              <Text>{order.customerName || 'Guest'}</Text>
            </Group>
            <Group>
              <ThemeIcon variant="light" color="gray"><IconAlertCircle size={16} /></ThemeIcon>
              <Text>{order.customerEmail}</Text>
            </Group>
          </Paper>
        </Grid.Col>
      </Grid>
    </AdminLayout>
  );
}