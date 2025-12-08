'use client';

import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { Title, Button, Group, Table, Modal, TextInput, Select, NumberInput, Badge, ActionIcon, Stack } from '@mantine/core'; // <-- Stack is here
import { useForm } from '@mantine/form';
import { IconPlus, IconTrash, IconTicket } from '@tabler/icons-react';
import api from '@/lib/api';
import { notifications } from '@mantine/notifications';
import { useDisclosure } from '@mantine/hooks';

export default function PromotionsPage() {
  const [coupons, setCoupons] = useState<any[]>([]);
  const [opened, { open, close }] = useDisclosure(false);
  
  const form = useForm({
    initialValues: {
      code: '',
      type: 'PERCENTAGE',
      value: 10,
      minOrderValue: 0,
      usageLimit: 0,
    },
    validate: {
      code: (val) => val.length < 3 ? 'Code too short' : null,
    }
  });

  const fetchCoupons = async () => {
    try {
      const res = await api.get('/ecommerce/promotions');
      setCoupons(res.data);
    } catch(e) {}
  };

  useEffect(() => { fetchCoupons(); }, []);

  const handleCreate = async (values: typeof form.values) => {
    try {
      const payload = { ...values, code: values.code.toUpperCase() };
      await api.post('/ecommerce/promotions', payload);
      notifications.show({ title: 'Success', message: 'Coupon created', color: 'green' });
      close();
      form.reset();
      fetchCoupons();
    } catch(e) { notifications.show({ title: 'Error', message: 'Failed to create', color: 'red' }); }
  };

  const handleDelete = async (id: string) => {
    if(!confirm('Delete coupon?')) return;
    try {
      await api.delete(`/ecommerce/promotions/${id}`);
      fetchCoupons();
    } catch(e) {}
  };

  const rows = coupons.map((c) => (
    <Table.Tr key={c.id}>
      <Table.Td fw={700}>{c.code}</Table.Td>
      <Table.Td><Badge>{c.type}</Badge></Table.Td>
      <Table.Td>{c.type === 'PERCENTAGE' ? `${c.value}%` : `$${c.value}`}</Table.Td>
      <Table.Td>{c.usageCount} / {c.usageLimit || '∞'}</Table.Td>
      <Table.Td>
         <ActionIcon color="red" variant="subtle" onClick={() => handleDelete(c.id)}><IconTrash size={16}/></ActionIcon>
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <AdminLayout>
      <Group justify="space-between" mb="xl">
         <Group><IconTicket size={32}/><Title order={2}>Coupons & Promotions</Title></Group>
         <Button leftSection={<IconPlus size={16}/>} onClick={open}>Create Coupon</Button>
      </Group>

      <Table striped highlightOnHover withTableBorder>
         <Table.Thead><Table.Tr><Table.Th>Code</Table.Th><Table.Th>Type</Table.Th><Table.Th>Value</Table.Th><Table.Th>Usage</Table.Th><Table.Th>Action</Table.Th></Table.Tr></Table.Thead>
         <Table.Tbody>{rows}</Table.Tbody>
      </Table>

      <Modal opened={opened} onClose={close} title="Create New Coupon">
         <form onSubmit={form.onSubmit(handleCreate)}>
            <Stack>
               {/* Use styles instead of invalid 'uppercase' prop */}
               <TextInput 
                  label="Code" 
                  placeholder="SUMMER2025" 
                  styles={{ input: { textTransform: 'uppercase' } }} 
                  {...form.getInputProps('code')} 
               />
               <Group grow>
                  <Select label="Type" data={['PERCENTAGE', 'FIXED']} {...form.getInputProps('type')} />
                  <NumberInput label="Value" {...form.getInputProps('value')} />
               </Group>
               <Group grow>
                  <NumberInput label="Min Order ($)" {...form.getInputProps('minOrderValue')} />
                  <NumberInput label="Usage Limit" description="0 for unlimited" {...form.getInputProps('usageLimit')} />
               </Group>
               <Button type="submit" mt="md">Create Coupon</Button>
            </Stack>
         </form>
      </Modal>
    </AdminLayout>
  );
}