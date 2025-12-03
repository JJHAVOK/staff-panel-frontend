'use client';

import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import {
  Title, Text, Button, Group, Table, Badge, Paper, LoadingOverlay, Alert, Modal, TextInput, Stack, Select, NumberInput, Menu, ActionIcon
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { 
  IconAlertCircle, IconPackage, IconTruck, IconPlus, IconDots, IconPencil, IconTrash, IconExternalLink 
} from '@tabler/icons-react';
import api from '@/lib/api';
import { useDisclosure } from '@mantine/hooks';
import { useAuthStore } from '@/lib/authStore';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Order {
  id: string;
  orderNumber: string;
  customerEmail: string;
  totalAmount: number;
  status: string;
  createdAt: string;
  shipments: { carrier: string; trackingNumber: string; trackingUrl?: string }[];
  _count: { items: number };
}

interface SelectOption {
  value: string;
  label: string;
  email?: string;
}

export default function OrdersPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const userPermissions = user?.permissions || [];
  const canManage = userPermissions.includes('manage:orders');

  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<SelectOption[]>([]);
  const [contacts, setContacts] = useState<SelectOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modals
  const [shipmentModalOpened, { open: openShipment, close: closeShipment }] = useDisclosure(false);
  const [createModalOpened, { open: openCreate, close: closeCreate }] = useDisclosure(false);
  const [editModalOpened, { open: openEdit, close: closeEdit }] = useDisclosure(false); // Edit Modal
  
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Forms
  const shipmentForm = useForm({
    initialValues: { carrier: '', trackingNumber: '', trackingUrl: '' },
    validate: {
      carrier: (val) => (val.length < 2 ? 'Carrier required' : null),
      trackingNumber: (val) => (val.length < 5 ? 'Tracking number too short' : null),
    },
  });

  const createOrderForm = useForm({
    initialValues: {
      customerEmail: '',
      customerName: '',
      productId: '', 
      quantity: 1,
      contactId: '',
    },
    validate: {
      customerEmail: (val) => (/^\S+@\S+$/.test(val) ? null : 'Invalid email'),
      productId: (val) => (val ? null : 'Product required'),
      quantity: (val) => (val > 0 ? null : 'Quantity must be > 0'),
    },
  });

  const editOrderForm = useForm({
    initialValues: { status: '', totalAmount: 0 },
  });

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await api.get('/ecommerce/orders');
      setOrders(res.data);
    } catch (e) {
      setError('Could not fetch orders.');
    } finally {
      setLoading(false);
    }
  };

  const loadDropdowns = async () => {
    try {
      const [prodRes, contactRes] = await Promise.all([
        api.get('/ecommerce/products'),
        api.get('/crm/contacts')
      ]);
      setProducts(prodRes.data.map((p: any) => ({ value: p.id, label: `${p.name} ($${p.price})`, })));
      setContacts(contactRes.data.map((c: any) => ({ value: c.id, label: `${c.firstName} ${c.lastName}`, email: c.email, })));
    } catch (e) {
      console.error('Failed to load form data');
    }
  };

  useEffect(() => {
    fetchOrders();
    loadDropdowns();
  }, []);

  const handleContactChange = (value: string | null) => {
    const contact = contacts.find(c => c.value === value);
    if (contact) {
      createOrderForm.setFieldValue('contactId', value || '');
      createOrderForm.setFieldValue('customerName', contact.label);
      if (contact.email) createOrderForm.setFieldValue('customerEmail', contact.email);
    }
  };

  // --- Handlers ---

  const handleCreateOrder = async (values: typeof createOrderForm.values) => {
    try {
      await api.post('/ecommerce/orders', {
        customerEmail: values.customerEmail,
        customerName: values.customerName,
        items: [ { productId: values.productId, quantity: values.quantity } ]
      });
      notifications.show({ title: 'Success', message: 'Order created.', color: 'green' });
      closeCreate();
      createOrderForm.reset();
      fetchOrders();
    } catch (e) {
      notifications.show({ title: 'Error', message: 'Failed to create order.', color: 'red' });
    }
  };

  const handleShipment = async (values: typeof shipmentForm.values) => {
    if (!selectedOrder) return;
    try {
      await api.post(`/ecommerce/orders/${selectedOrder.id}/shipments`, values);
      notifications.show({ title: 'Shipped', message: 'Order marked as shipped.', color: 'green' });
      closeShipment();
      shipmentForm.reset();
      fetchOrders();
    } catch (e) {
      notifications.show({ title: 'Error', message: 'Failed to create shipment.', color: 'red' });
    }
  };

  const handleEditOrder = async (values: typeof editOrderForm.values) => {
    if (!selectedOrder) return;
    try {
      await api.patch(`/ecommerce/orders/${selectedOrder.id}`, values);
      notifications.show({ title: 'Updated', message: 'Order updated successfully.', color: 'green' });
      closeEdit();
      fetchOrders();
    } catch (e) {
      notifications.show({ title: 'Error', message: 'Update failed.', color: 'red' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to PERMANENTLY delete this order?')) return;
    try {
      await api.delete(`/ecommerce/orders/${id}`);
      notifications.show({ title: 'Deleted', message: 'Order removed.', color: 'green' });
      fetchOrders();
    } catch (e) {
      notifications.show({ title: 'Error', message: 'Delete failed.', color: 'red' });
    }
  };

  const handleStatusUpdate = async (id: string, status: string) => {
    try {
      await api.patch(`/ecommerce/orders/${id}`, { status });
      notifications.show({ title: 'Updated', message: `Status changed to ${status}`, color: 'blue' });
      fetchOrders();
    } catch (e) {
      notifications.show({ title: 'Error', message: 'Update failed.', color: 'red' });
    }
  };

  // --- Modals Openers ---

  const openShipModal = (e: React.MouseEvent, order: Order) => {
    e.stopPropagation();
    setSelectedOrder(order);
    openShipment();
  };

  const openEditModal = (e: React.MouseEvent, order: Order) => {
    e.stopPropagation();
    setSelectedOrder(order);
    editOrderForm.setValues({
      status: order.status,
      totalAmount: order.totalAmount,
    });
    openEdit();
  };

  // --- Helper: Tracking Links ---
  const getTrackingLink = (carrier: string, trackingNumber: string) => {
    const c = carrier.toLowerCase();
    if (c.includes('ups')) return `https://www.ups.com/track?tracknum=${trackingNumber}`;
    if (c.includes('fedex')) return `https://www.fedex.com/fedextrack/?trknbr=${trackingNumber}`;
    if (c.includes('usps')) return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${trackingNumber}`;
    if (c.includes('dhl')) return `https://www.dhl.com/en/express/tracking.html?AWB=${trackingNumber}`;
    return `https://www.google.com/search?q=${trackingNumber}`;
  };

  const rows = orders.map((order) => (
    <Table.Tr 
      key={order.id} 
      style={{ cursor: 'pointer' }}
      onClick={() => router.push(`/ecommerce/orders/${order.id}`)}
    >
      <Table.Td fw={700} c="blue">{order.orderNumber}</Table.Td>
      <Table.Td>
        <Text size="sm">{order.customerEmail}</Text>
        <Text size="xs" c="dimmed">{order.createdAt ? new Date(order.createdAt).toLocaleDateString() : ''}</Text>
      </Table.Td>
      <Table.Td>${order.totalAmount.toFixed(2)}</Table.Td>
      <Table.Td>{order._count.items} Items</Table.Td>
      <Table.Td>
        <Badge color={order.status === 'SHIPPED' ? 'green' : order.status === 'PAID' ? 'blue' : 'gray'}>
          {order.status}
        </Badge>
      </Table.Td>
      <Table.Td>
        {order.status === 'SHIPPED' && order.shipments[0] ? (
           <Group gap="xs" onClick={(e) => e.stopPropagation()}>
             <Text size="xs" c="dimmed">{order.shipments[0].carrier}</Text>
             <ActionIcon 
               size="sm" variant="subtle" 
               component="a" 
               href={order.shipments[0].trackingUrl || getTrackingLink(order.shipments[0].carrier, order.shipments[0].trackingNumber)}
               target="_blank"
             >
               <IconExternalLink size={14} />
             </ActionIcon>
           </Group>
        ) : (
           canManage && order.status === 'PAID' && (
            <Button size="xs" variant="light" leftSection={<IconTruck size={14} />} onClick={(e) => openShipModal(e, order)}>
              Fulfill
            </Button>
          )
        )}
      </Table.Td>
      <Table.Td onClick={(e) => e.stopPropagation()}>
        {canManage && (
          <Menu shadow="md" width={200}>
            <Menu.Target>
              <ActionIcon variant="subtle"><IconDots size={16} /></ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Label>Manage</Menu.Label>
              <Menu.Item leftSection={<IconPencil size={14} />} onClick={(e) => openEditModal(e, order)}>
                Edit Order
              </Menu.Item>
              <Menu.Item leftSection={<IconTruck size={14} />} onClick={(e) => openShipModal(e, order)}>
                Update Shipping
              </Menu.Item>
              <Menu.Divider />
              <Menu.Label>Status</Menu.Label>
              <Menu.Item onClick={() => handleStatusUpdate(order.id, 'PAID')}>Mark Paid</Menu.Item>
              <Menu.Item onClick={() => handleStatusUpdate(order.id, 'CANCELLED')}>Mark Cancelled</Menu.Item>
              <Menu.Item onClick={() => handleStatusUpdate(order.id, 'REFUNDED')}>Mark Refunded</Menu.Item>
              <Menu.Divider />
              <Menu.Item color="red" leftSection={<IconTrash size={14} />} onClick={() => handleDelete(order.id)}>
                Delete Order
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        )}
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <AdminLayout>
      {/* --- Create Order Modal --- */}
      <Modal opened={createModalOpened} onClose={closeCreate} title="Create Manual Order">
        <form onSubmit={createOrderForm.onSubmit(handleCreateOrder)}>
          <Stack>
            <Select label="Select Customer" placeholder="Search contacts..." data={contacts} searchable {...createOrderForm.getInputProps('contactId')} onChange={handleContactChange} />
            <TextInput label="Customer Name" readOnly {...createOrderForm.getInputProps('customerName')} />
            <TextInput label="Customer Email" required readOnly {...createOrderForm.getInputProps('customerEmail')} />
            <Select label="Product" placeholder="Search products..." data={products} searchable required {...createOrderForm.getInputProps('productId')} />
            <NumberInput label="Quantity" min={1} required {...createOrderForm.getInputProps('quantity')} />
            <Button type="submit" mt="md">Create Order</Button>
          </Stack>
        </form>
      </Modal>

      {/* --- Edit Order Modal --- */}
      <Modal opened={editModalOpened} onClose={closeEdit} title="Edit Order">
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
            <Button type="submit" mt="md">Save Changes</Button>
          </Stack>
        </form>
      </Modal>

      {/* --- Fulfill Modal --- */}
      <Modal opened={shipmentModalOpened} onClose={closeShipment} title={`Fulfill Order: ${selectedOrder?.orderNumber}`}>
        <form onSubmit={shipmentForm.onSubmit(handleShipment)}>
          <Stack>
             <TextInput label="Carrier" placeholder="e.g. UPS, FedEx" required {...shipmentForm.getInputProps('carrier')} />
             <TextInput label="Tracking Number" placeholder="1Z999..." required {...shipmentForm.getInputProps('trackingNumber')} />
             <TextInput label="Tracking URL (Optional)" placeholder="https://..." {...shipmentForm.getInputProps('trackingUrl')} />
             <Button type="submit">Mark Shipped</Button>
          </Stack>
        </form>
      </Modal>

      <Group justify="space-between" mb="xl">
        <Group>
          <IconPackage size={32} />
          <Title order={2}>Orders & Logistics</Title>
        </Group>
        {canManage && (
          <Button onClick={openCreate} leftSection={<IconPlus size={16} />}>
            Create Order
          </Button>
        )}
      </Group>

      <Paper withBorder p="md" radius="md" style={{ position: 'relative' }}>
        <LoadingOverlay visible={loading} />
        {error && <Alert icon={<IconAlertCircle size="1rem" />} title="Error" color="red">{error}</Alert>}
        
        {!loading && orders.length === 0 ? (
          <Text c="dimmed" ta="center" py="xl">No orders found.</Text>
        ) : (
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Order #</Table.Th>
                <Table.Th>Customer</Table.Th>
                <Table.Th>Total</Table.Th>
                <Table.Th>Items</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Fulfillment</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>{rows}</Table.Tbody>
          </Table>
        )}
      </Paper>
    </AdminLayout>
  );
}