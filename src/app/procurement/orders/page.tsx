'use client';

import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { Title, Button, Group, Table, Modal, Stack, Paper, LoadingOverlay, Select, NumberInput, Badge, Divider, Text, ActionIcon, Menu } from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconPlus, IconTruckDelivery, IconTrash, IconBox, IconDots } from '@tabler/icons-react';
import api from '@/lib/api';
import { useDisclosure } from '@mantine/hooks';
import { useAuthStore } from '@/lib/authStore';

export default function POPage() {
  const { user } = useAuthStore();
  const userPermissions = user?.permissions || [];
  const canRead = userPermissions.includes('procurement:orders:read');
  const canCreate = userPermissions.includes('procurement:orders:create');
  const canDelete = userPermissions.includes('procurement:orders:delete');

  const [pos, setPos] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, { open, close }] = useDisclosure(false);

  const [poItems, setPoItems] = useState<{ variantId: string, quantity: number, unitCost: number }[]>([]);
  const [poVendor, setPoVendor] = useState<string | null>(null);
  const [tempProduct, setTempProduct] = useState<string | null>(null);
  const [tempQty, setTempQty] = useState<number>(1);
  const [tempCost, setTempCost] = useState<number>(0);

  const fetchData = async () => {
    if (!canRead) return;
    setLoading(true);
    try {
      const [poRes, vRes, pRes] = await Promise.all([
        api.get('/procurement/orders'),
        api.get('/procurement/vendors'),
        api.get('/ecommerce/products')
      ]);
      setPos(poRes.data);
      setVendors(vRes.data.map((v:any) => ({ value: v.id, label: v.name })));
      
      const opts: any[] = [];
      pRes.data.forEach((p: any) => {
        if (p.type === 'PHYSICAL') {
           p.variants.forEach((v: any) => opts.push({ value: v.id, label: `${p.name} (${v.sku})`, price: v.price }));
        }
      });
      setProducts(opts);
    } catch (e) {} finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [canRead]);

  const addPoItem = () => {
    if (!tempProduct || tempQty <= 0 || tempCost < 0) return;
    setPoItems([...poItems, { variantId: tempProduct, quantity: tempQty, unitCost: tempCost }]);
    setTempProduct(null);
  };

  const handleCreatePO = async () => {
    if (!poVendor || poItems.length === 0) return;
    try {
      await api.post('/procurement/orders', { vendorId: poVendor, items: poItems });
      notifications.show({ title: 'Success', message: 'PO created.', color: 'green' });
      close(); setPoItems([]); setPoVendor(null); fetchData();
    } catch(e) { notifications.show({ title: 'Error', message: 'Failed.', color: 'red' }); }
  };

  const handleDeletePO = async (id: string) => {
    if (!confirm('Delete PO?')) return;
    try { await api.delete(`/procurement/orders/${id}`); fetchData(); } catch(e) {}
  };

  const handleReceivePO = async (id: string) => {
    if (!confirm('Receive Stock?')) return;
    try { await api.post(`/procurement/orders/${id}/receive`); fetchData(); notifications.show({ title: 'Received', message: 'Stock updated.', color: 'green' }); } catch(e) {}
  };

  const rows = pos.map((po) => (
    <Table.Tr key={po.id}>
      <Table.Td fw={700}>{po.poNumber}</Table.Td>
      <Table.Td>{po.vendor?.name}</Table.Td>
      <Table.Td>${po.totalCost.toFixed(2)}</Table.Td>
      <Table.Td>{po._count?.items || 0} Items</Table.Td>
      <Table.Td><Badge color={po.status === 'RECEIVED' ? 'green' : 'blue'}>{po.status}</Badge></Table.Td>
      <Table.Td>
        <Group gap="xs">
           {po.status !== 'RECEIVED' && canCreate && (
             <Button size="xs" color="green" leftSection={<IconBox size={14} />} onClick={() => handleReceivePO(po.id)}>
               Receive
             </Button>
           )}
           {canDelete && (
              <ActionIcon color="red" variant="subtle" onClick={() => handleDeletePO(po.id)}><IconTrash size={16}/></ActionIcon>
           )}
        </Group>
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <AdminLayout>
      <Modal opened={modalOpen} onClose={close} title="New Purchase Order" size="lg">
        <Stack>
           <Select label="Vendor" data={vendors} value={poVendor} onChange={setPoVendor} searchable />
           <Divider label="Items" />
           <Group align="flex-end">
              <Select label="Product" data={products} style={{ flex: 1 }} searchable value={tempProduct} onChange={(v) => { setTempProduct(v); const p = products.find(x => x.value === v); if(p) setTempCost(p.price || 0); }} />
              <NumberInput label="Qty" w={80} min={1} value={tempQty} onChange={(v) => setTempQty(Number(v))} />
              <NumberInput label="Cost" w={100} min={0} decimalScale={2} fixedDecimalScale value={tempCost} onChange={(v) => setTempCost(Number(v))} />
              <Button onClick={addPoItem}>Add</Button>
           </Group>
           {poItems.length > 0 && (
             <Paper withBorder p="sm" bg="gray.0">
               {poItems.map((i, idx) => <Text key={idx} size="sm">{products.find(p=>p.value===i.variantId)?.label} x{i.quantity}</Text>)}
             </Paper>
           )}
           <Button size="lg" onClick={handleCreatePO} disabled={!poVendor || poItems.length === 0}>Generate PO</Button>
        </Stack>
      </Modal>

      <Group justify="space-between" mb="xl">
        <Group><IconTruckDelivery size={32}/><Title order={2}>Purchase Orders</Title></Group>
        {canCreate && <Button leftSection={<IconPlus size={16}/>} onClick={open}>New PO</Button>}
      </Group>

      <Paper withBorder radius="md">
         <LoadingOverlay visible={loading} />
         <Table striped highlightOnHover>
           <Table.Thead><Table.Tr><Table.Th>PO #</Table.Th><Table.Th>Vendor</Table.Th><Table.Th>Cost</Table.Th><Table.Th>Items</Table.Th><Table.Th>Status</Table.Th><Table.Th>Actions</Table.Th></Table.Tr></Table.Thead>
           <Table.Tbody>{rows}</Table.Tbody>
         </Table>
      </Paper>
    </AdminLayout>
  );
}
