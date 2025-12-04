'use client';

import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import {
  Title, Text, Button, Group, Table, Modal, TextInput, Stack, Paper, LoadingOverlay, 
  Alert, Tabs, Select, NumberInput, Badge, ActionIcon, Card, Divider, SimpleGrid
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { 
  IconPlus, IconTrash, IconBuildingStore, IconTruckDelivery, IconAlertCircle, IconBox 
} from '@tabler/icons-react';
import api from '@/lib/api';
import { useDisclosure } from '@mantine/hooks';
import { useAuthStore } from '@/lib/authStore';
import { useRouter } from 'next/navigation'; // <-- Import Router

export default function ProcurementPage() {
  const router = useRouter(); // <-- Use Router
  const { user } = useAuthStore();
  const userPermissions = user?.permissions || [];
  const canManage = userPermissions.includes('manage:procurement');

  const [vendors, setVendors] = useState<any[]>([]);
  const [pos, setPos] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]); 
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modals
  const [vendorModalOpen, { open: openVendor, close: closeVendor }] = useDisclosure(false);
  const [poModalOpen, { open: openPO, close: closePO }] = useDisclosure(false);

  // Forms
  const vendorForm = useForm({
    initialValues: { name: '', email: '', phone: '', website: '' },
    validate: { name: (val) => (val.length < 2 ? 'Name required' : null) },
  });

  const [poItems, setPoItems] = useState<{ variantId: string, quantity: number, unitCost: number }[]>([]);
  const [poVendor, setPoVendor] = useState<string | null>(null);
  
  const [tempProduct, setTempProduct] = useState<string | null>(null);
  const [tempQty, setTempQty] = useState<number>(1);
  const [tempCost, setTempCost] = useState<number>(0);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [vRes, poRes, pRes] = await Promise.all([
        api.get('/procurement/vendors'),
        api.get('/procurement/orders'),
        api.get('/ecommerce/products'),
      ]);
      setVendors(vRes.data);
      setPos(poRes.data);
      
      const prodOptions: any[] = [];
      pRes.data.forEach((p: any) => {
        if (p.type === 'PHYSICAL') {
           p.variants.forEach((v: any) => {
             prodOptions.push({
               value: v.id,
               label: `${p.name} (${v.sku})`,
               price: v.price 
             });
           });
        }
      });
      setProducts(prodOptions);
      
    } catch (e) {
      setError('Failed to load procurement data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreateVendor = async (values: typeof vendorForm.values) => {
    try {
      await api.post('/procurement/vendors', values);
      notifications.show({ title: 'Success', message: 'Vendor created.', color: 'green' });
      closeVendor();
      vendorForm.reset();
      fetchData();
    } catch (e) {
      notifications.show({ title: 'Error', message: 'Failed to create vendor.', color: 'red' });
    }
  };

  const handleDeleteVendor = async (id: string) => {
    if (!confirm('Delete vendor?')) return;
    try {
      await api.delete(`/procurement/vendors/${id}`);
      fetchData();
    } catch (e) {
      notifications.show({ title: 'Error', message: 'Delete failed.', color: 'red' });
    }
  };

  const addPoItem = () => {
    if (!tempProduct || tempQty <= 0 || tempCost < 0) return;
    setPoItems([...poItems, { variantId: tempProduct, quantity: tempQty, unitCost: tempCost }]);
    setTempProduct(null);
  };

  const removePoItem = (index: number) => {
    setPoItems(poItems.filter((_, i) => i !== index));
  };

  const handleCreatePO = async () => {
    if (!poVendor || poItems.length === 0) {
      notifications.show({ title: 'Error', message: 'Select a vendor and add items.', color: 'red' });
      return;
    }
    try {
      await api.post('/procurement/orders', {
        vendorId: poVendor,
        items: poItems
      });
      notifications.show({ title: 'Success', message: 'Purchase Order created.', color: 'green' });
      closePO();
      setPoItems([]);
      setPoVendor(null);
      fetchData();
    } catch (e) {
      notifications.show({ title: 'Error', message: 'Failed to create PO.', color: 'red' });
    }
  };

  const handleReceivePO = async (id: string) => {
    if (!confirm('Receive this PO? This will increase inventory stock.')) return;
    try {
      await api.post(`/procurement/orders/${id}/receive`);
      notifications.show({ title: 'Received', message: 'Stock updated successfully.', color: 'green' });
      fetchData();
    } catch (e) {
      notifications.show({ title: 'Error', message: 'Failed to receive PO.', color: 'red' });
    }
  };

  const vendorOptions = vendors.map(v => ({ value: v.id, label: v.name }));

  const vendorRows = vendors.map((v) => (
    <Table.Tr 
      key={v.id} 
      style={{ cursor: 'pointer' }} 
      onClick={() => router.push(`/procurement/vendors/${v.id}`)} // <-- Added Click Handler
    >
      <Table.Td fw={500}>{v.name}</Table.Td>
      <Table.Td>{v.email || '-'}</Table.Td>
      <Table.Td>{v.phone || '-'}</Table.Td>
      <Table.Td>
        {canManage && (
          <ActionIcon color="red" variant="subtle" onClick={(e) => { e.stopPropagation(); handleDeleteVendor(v.id); }}><IconTrash size={16}/></ActionIcon>
        )}
      </Table.Td>
    </Table.Tr>
  ));

  const poRows = pos.map((po) => (
    <Table.Tr key={po.id}>
      <Table.Td fw={700}>{po.poNumber}</Table.Td>
      <Table.Td>{po.vendor?.name}</Table.Td>
      <Table.Td>${po.totalCost.toFixed(2)}</Table.Td>
      <Table.Td>{po._count.items} Items</Table.Td>
      <Table.Td>
        <Badge color={po.status === 'RECEIVED' ? 'green' : po.status === 'SENT' ? 'blue' : 'gray'}>{po.status}</Badge>
      </Table.Td>
      <Table.Td>
        {po.status !== 'RECEIVED' && canManage && (
          <Button size="xs" color="green" leftSection={<IconBox size={14} />} onClick={() => handleReceivePO(po.id)}>
            Receive Stock
          </Button>
        )}
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <AdminLayout>
      <LoadingOverlay visible={loading} />
      
      <Modal opened={vendorModalOpen} onClose={closeVendor} title="Add Vendor">
        <form onSubmit={vendorForm.onSubmit(handleCreateVendor)}>
          <Stack>
            <TextInput label="Company Name" required {...vendorForm.getInputProps('name')} />
            <TextInput label="Email" {...vendorForm.getInputProps('email')} />
            <TextInput label="Phone" {...vendorForm.getInputProps('phone')} />
            <TextInput label="Website" {...vendorForm.getInputProps('website')} />
            <Button type="submit">Add Vendor</Button>
          </Stack>
        </form>
      </Modal>

      <Modal opened={poModalOpen} onClose={closePO} title="Create Purchase Order" size="lg">
        <Stack>
           <Select label="Select Vendor" data={vendorOptions} value={poVendor} onChange={setPoVendor} searchable />
           <Divider label="Add Items" />
           <Group align="flex-end">
              <Select 
                label="Product Variant" 
                data={products} 
                style={{ flex: 1 }} 
                searchable 
                value={tempProduct}
                onChange={(val) => {
                    setTempProduct(val);
                    const p = products.find(x => x.value === val);
                    if(p) setTempCost(p.price || 0);
                }}
              />
              <NumberInput label="Qty" w={80} min={1} value={tempQty} onChange={(v) => setTempQty(Number(v))} />
              {/* --- 👇 FIX: decimalScale 👇 --- */}
              <NumberInput 
                label="Cost ($)" 
                w={100} 
                min={0} 
                decimalScale={2} 
                fixedDecimalScale
                value={tempCost} 
                onChange={(v) => setTempCost(Number(v))} 
              />
              {/* --- 👆 END FIX 👆 --- */}
              <Button onClick={addPoItem}>Add</Button>
           </Group>
           
           {poItems.length > 0 && (
             <Paper withBorder p="sm" bg="gray.0">
               <Stack gap="xs">
                 {poItems.map((item, idx) => {
                    const pName = products.find(p => p.value === item.variantId)?.label;
                    return (
                      <Group key={idx} justify="space-between">
                        <Text size="sm">{pName} (x{item.quantity})</Text>
                        <Group gap="xs">
                          <Text size="sm" fw={500}>${(item.quantity * item.unitCost).toFixed(2)}</Text>
                          <ActionIcon size="xs" color="red" variant="transparent" onClick={() => removePoItem(idx)}><IconTrash size={12}/></ActionIcon>
                        </Group>
                      </Group>
                    );
                 })}
                 <Divider />
                 <Group justify="space-between">
                   <Text fw={700}>Total Estimated Cost:</Text>
                   <Text fw={700} size="lg">${poItems.reduce((acc, i) => acc + (i.quantity * i.unitCost), 0).toFixed(2)}</Text>
                 </Group>
               </Stack>
             </Paper>
           )}

           <Button size="lg" onClick={handleCreatePO} disabled={!poVendor || poItems.length === 0}>Generate PO</Button>
        </Stack>
      </Modal>

      <Group justify="space-between" mb="xl">
        <Title order={2}>Procurement</Title>
      </Group>

      {error && <Alert color="red" mb="md">{error}</Alert>}

      <Tabs defaultValue="pos">
        <Tabs.List>
          <Tabs.Tab value="pos" leftSection={<IconTruckDelivery size={14} />}>Purchase Orders</Tabs.Tab>
          <Tabs.Tab value="vendors" leftSection={<IconBuildingStore size={14} />}>Vendors</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="pos" pt="md">
          <Group justify="flex-end" mb="md">
             {canManage && <Button leftSection={<IconPlus size={16} />} onClick={openPO}>New Purchase Order</Button>}
          </Group>
          <Paper withBorder radius="md">
             <Table striped highlightOnHover>
               <Table.Thead>
                 <Table.Tr>
                   <Table.Th>PO Number</Table.Th>
                   <Table.Th>Vendor</Table.Th>
                   <Table.Th>Total Cost</Table.Th>
                   <Table.Th>Items</Table.Th>
                   <Table.Th>Status</Table.Th>
                   <Table.Th>Actions</Table.Th>
                 </Table.Tr>
               </Table.Thead>
               <Table.Tbody>{poRows}</Table.Tbody>
             </Table>
          </Paper>
        </Tabs.Panel>

        <Tabs.Panel value="vendors" pt="md">
          <Group justify="flex-end" mb="md">
             {canManage && <Button leftSection={<IconPlus size={16} />} onClick={openVendor}>Add Vendor</Button>}
          </Group>
          <Paper withBorder radius="md">
             <Table striped highlightOnHover>
               <Table.Thead>
                 <Table.Tr>
                   <Table.Th>Name</Table.Th>
                   <Table.Th>Email</Table.Th>
                   <Table.Th>Phone</Table.Th>
                   <Table.Th>Action</Table.Th>
                 </Table.Tr>
               </Table.Thead>
               <Table.Tbody>{vendorRows}</Table.Tbody>
             </Table>
          </Paper>
        </Tabs.Panel>
      </Tabs>
    </AdminLayout>
  );
}