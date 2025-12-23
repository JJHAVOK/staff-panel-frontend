'use client';

import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import {
  Title, Text, Button, Group, Table, Badge, Paper, LoadingOverlay, Alert, Modal, TextInput, Stack, Select, NumberInput, Menu, ActionIcon, Radio
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { 
  IconAlertCircle, IconPackage, IconTruck, IconPlus, IconDots, IconPencil, IconTrash, IconExternalLink 
} from '@tabler/icons-react';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/authStore';
// 👇 NEW IMPORT
import { DataActions } from '@/components/DataActions/DataActions';

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
  const canManage = userPermissions.includes('ecommerce:orders:update');
  const canDelete = userPermissions.includes('ecommerce:orders:delete');

  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<SelectOption[]>([]);
  const [contacts, setContacts] = useState<SelectOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modals
  const [shipmentModalOpened, { open: openShipment, close: closeShipment }] = useDisclosure(false);
  const [createModalOpened, { open: openCreate, close: closeCreate }] = useDisclosure(false);
  const [editModalOpened, { open: openEdit, close: closeEdit }] = useDisclosure(false);
  
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null); // Track edit target

  // Shipping State (New)
  const [shipRates, setShipRates] = useState<any[]>([]);
  const [selectedRate, setSelectedRate] = useState<string>('');
  const [buyingLabel, setBuyingLabel] = useState(false);

  // Forms
  const createOrderForm = useForm({
    initialValues: { customerEmail: '', customerName: '', productId: '', quantity: 1, contactId: '' },
    validate: { customerEmail: (val) => (/^\S+@\S+$/.test(val) ? null : 'Invalid email'), productId: (val) => (val ? null : 'Product required'), quantity: (val) => (val > 0 ? null : 'Quantity > 0') },
  });

  const editOrderForm = useForm({ initialValues: { status: '', totalAmount: 0 } });

  const fetchOrders = async () => {
    setLoading(true);
    try { const res = await api.get('/ecommerce/orders'); setOrders(res.data); } 
    catch (e) { setError('Could not fetch orders.'); } 
    finally { setLoading(false); }
  };

  const loadDropdowns = async () => {
    try {
      const [prodRes, contactRes] = await Promise.all([api.get('/ecommerce/products'), api.get('/crm/contacts')]);
      setProducts(prodRes.data.map((p: any) => ({ value: p.id, label: `${p.name} ($${p.price})`, })));
      setContacts(contactRes.data.map((c: any) => ({ value: c.id, label: `${c.firstName} ${c.lastName}`, email: c.email, })));
    } catch (e) { console.error('Failed to load form data'); }
  };

  useEffect(() => { fetchOrders(); loadDropdowns(); }, []);

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
      await api.post('/ecommerce/orders', { customerEmail: values.customerEmail, customerName: values.customerName, items: [ { productId: values.productId, quantity: values.quantity } ] });
      notifications.show({ title: 'Success', message: 'Order created.', color: 'green' });
      closeCreate(); createOrderForm.reset(); fetchOrders();
    } catch (e) { notifications.show({ title: 'Error', message: 'Failed to create order.', color: 'red' }); }
  };

  const handleEditOrder = async (values: typeof editOrderForm.values) => {
    if (!editingOrder) return;
    try {
      await api.patch(`/ecommerce/orders/${editingOrder.id}`, values);
      notifications.show({ title: 'Updated', message: 'Order updated.', color: 'green' });
      closeEdit(); fetchOrders();
    } catch (e) { notifications.show({ title: 'Error', message: 'Update failed.', color: 'red' }); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Permanently delete this order?')) return;
    try {
      await api.delete(`/ecommerce/orders/${id}`);
      notifications.show({ title: 'Deleted', message: 'Order removed.', color: 'green' });
      fetchOrders();
    } catch (e) { notifications.show({ title: 'Error', message: 'Delete failed.', color: 'red' }); }
  };

  const handleStatusUpdate = async (id: string, status: string) => {
    try {
      await api.patch(`/ecommerce/orders/${id}`, { status });
      notifications.show({ title: 'Updated', message: `Status: ${status}`, color: 'blue' });
      fetchOrders();
    } catch (e) { notifications.show({ title: 'Error', message: 'Update failed.', color: 'red' }); }
  };

  // --- NEW SHIPPING LOGIC ---
  const handleOpenShip = async (e: React.MouseEvent, order: Order) => {
      e.stopPropagation();
      setSelectedOrder(order);
      setShipRates([]);
      setSelectedRate('');
      openShipment();
      try {
          const res = await api.get(`/ecommerce/shipping/rates/${order.id}`);
          setShipRates(res.data);
      } catch(err) { notifications.show({ title: 'Error', message: 'Failed to fetch rates', color: 'red' }); }
  };

  const handleBuyLabel = async () => {
      if(!selectedRate || !selectedOrder) return;
      setBuyingLabel(true);
      const rate = shipRates.find(r => r.id === selectedRate);
      try {
          await api.post('/ecommerce/shipping/buy', { 
              orderId: selectedOrder.id, 
              rateId: rate.id, 
              carrier: rate.carrier 
          });
          notifications.show({ title: 'Success', message: 'Label Purchased!', color: 'green' });
          closeShipment();
          fetchOrders();
      } catch(e) { notifications.show({ title: 'Error', message: 'Purchase failed', color: 'red' }); }
      finally { setBuyingLabel(false); }
  };

  const openEditModal = (e: React.MouseEvent, order: Order) => {
    e.stopPropagation();
    setEditingOrder(order);
    editOrderForm.setValues({ status: order.status, totalAmount: order.totalAmount });
    openEdit();
  };

  const rows = orders.map((order) => (
    <Table.Tr key={order.id} style={{ cursor: 'pointer' }} onClick={() => router.push(`/ecommerce/orders/${order.id}`)}>
      <Table.Td fw={700} c="blue">{order.orderNumber}</Table.Td>
      <Table.Td><Text size="sm">{order.customerEmail}</Text><Text size="xs" c="dimmed">{new Date(order.createdAt).toLocaleDateString()}</Text></Table.Td>
      <Table.Td>${order.totalAmount.toFixed(2)}</Table.Td>
      <Table.Td>{order._count.items} Items</Table.Td>
      <Table.Td><Badge color={order.status === 'SHIPPED' ? 'green' : 'blue'}>{order.status}</Badge></Table.Td>
      <Table.Td>
        {order.status === 'SHIPPED' && order.shipments[0] ? (
           <Group gap="xs" onClick={(e) => e.stopPropagation()}>
             <Text size="xs">{order.shipments[0].carrier}</Text>
             <ActionIcon size="sm" variant="subtle" component="a" href={order.shipments[0].trackingUrl || '#'} target="_blank"><IconExternalLink size={14}/></ActionIcon>
           </Group>
        ) : (
           canManage && order.status !== 'SHIPPED' && (
            <Button size="xs" variant="light" leftSection={<IconTruck size={14}/>} onClick={(e) => handleOpenShip(e, order)}>Ship</Button>
          )
        )}
      </Table.Td>
      <Table.Td onClick={(e) => e.stopPropagation()}>
        {canManage && (
          <Menu shadow="md" width={200}>
            <Menu.Target><ActionIcon variant="subtle"><IconDots size={16}/></ActionIcon></Menu.Target>
            <Menu.Dropdown>
              <Menu.Item leftSection={<IconPencil size={14}/>} onClick={(e) => openEditModal(e, order)}>Edit Order</Menu.Item>
              {order.status !== 'SHIPPED' && <Menu.Item leftSection={<IconTruck size={14}/>} onClick={(e) => handleOpenShip(e, order)}>Ship Order</Menu.Item>}
              <Menu.Divider />
              <Menu.Item onClick={() => handleStatusUpdate(order.id, 'PAID')}>Mark Paid</Menu.Item>
              <Menu.Item onClick={() => handleStatusUpdate(order.id, 'CANCELLED')}>Mark Cancelled</Menu.Item>
              <Menu.Item color="red" leftSection={<IconTrash size={14}/>} onClick={() => handleDelete(order.id)}>Delete</Menu.Item>
            </Menu.Dropdown>
          </Menu>
        )}
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <AdminLayout>
      <Modal opened={createModalOpened} onClose={closeCreate} title="Create Manual Order">
        <form onSubmit={createOrderForm.onSubmit(handleCreateOrder)}>
          <Stack>
            <Select label="Select Customer" data={contacts} searchable {...createOrderForm.getInputProps('contactId')} onChange={handleContactChange} />
            <TextInput label="Customer Email" readOnly {...createOrderForm.getInputProps('customerEmail')} />
            <Select label="Product" data={products} searchable {...createOrderForm.getInputProps('productId')} />
            <NumberInput label="Quantity" min={1} {...createOrderForm.getInputProps('quantity')} />
            <Button type="submit">Create Order</Button>
          </Stack>
        </form>
      </Modal>

      <Modal opened={editModalOpened} onClose={closeEdit} title="Edit Order">
        <form onSubmit={editOrderForm.onSubmit(handleEditOrder)}>
          <Stack>
            <Select label="Status" data={['PENDING', 'PAID', 'SHIPPED', 'CANCELLED', 'REFUNDED']} {...editOrderForm.getInputProps('status')} />
            <NumberInput label="Total Amount" prefix="$" decimalScale={2} fixedDecimalScale {...editOrderForm.getInputProps('totalAmount')} />
            <Button type="submit">Save Changes</Button>
          </Stack>
        </form>
      </Modal>

      {/* --- SHIPPING MODAL --- */}
      <Modal opened={shipmentModalOpened} onClose={closeShipment} title={`Ship Order #${selectedOrder?.orderNumber}`}>
           <Stack>
               <Text size="sm">Select a rate for this package:</Text>
               {shipRates.length === 0 ? <Text c="dimmed">Fetching rates...</Text> : (
                 <Radio.Group value={selectedRate} onChange={setSelectedRate}>
                     <Stack gap="xs">
                         {shipRates.map((rate: any) => (
                             <Paper key={rate.id} withBorder p="sm" radius="sm">
                                 <Radio 
                                     value={rate.id} 
                                     label={
                                         <Group justify="space-between" w="100%">
                                             <Text size="sm">{rate.carrier} {rate.service}</Text>
                                             <Text fw={700}>${rate.price.toFixed(2)}</Text>
                                         </Group>
                                     } 
                                  />
                             </Paper>
                         ))}
                     </Stack>
                 </Radio.Group>
               )}
               <Button onClick={handleBuyLabel} loading={buyingLabel} disabled={!selectedRate} mt="md">Buy Label</Button>
           </Stack>
      </Modal>

      <Group justify="space-between" mb="xl">
        <Group><IconPackage size={32}/><Title order={2}>Orders</Title></Group>
        <Group>
            {/* 👇 ADDED EXPORT BUTTON */}
            <DataActions entity="orders" canImport={false} />
            {canManage && <Button onClick={openCreate} leftSection={<IconPlus size={16} />}>Create Order</Button>}
        </Group>
      </Group>

      <Paper withBorder p="md" radius="md">
        <LoadingOverlay visible={loading} />
        <Table striped highlightOnHover>
          <Table.Thead><Table.Tr><Table.Th>Order #</Table.Th><Table.Th>Customer</Table.Th><Table.Th>Total</Table.Th><Table.Th>Items</Table.Th><Table.Th>Status</Table.Th><Table.Th>Fulfillment</Table.Th><Table.Th>Actions</Table.Th></Table.Tr></Table.Thead>
          <Table.Tbody>{rows}</Table.Tbody>
        </Table>
      </Paper>
    </AdminLayout>
  );
}