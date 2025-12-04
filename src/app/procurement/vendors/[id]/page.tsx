'use client';

import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import {
  Title, Text, Button, Group, Table, Modal, TextInput, Stack, Paper, LoadingOverlay, 
  Alert, Tabs, Badge, ActionIcon, Grid
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { 
  IconTrash, IconPencil, IconArrowLeft, IconUser, IconPhone, IconMail, IconTruckDelivery, IconPlus // <-- ADDED IconPlus
} from '@tabler/icons-react';
import api from '@/lib/api';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useDisclosure } from '@mantine/hooks';

export default function VendorProfile() {
  const { id } = useParams();
  const [vendor, setVendor] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Edit Vendor
  const [editModalOpen, { open: openEdit, close: closeEdit }] = useDisclosure(false);
  const editForm = useForm({ initialValues: { name: '', email: '', phone: '', website: '' } });

  // Add Contact
  const [contactModalOpen, { open: openContact, close: closeContact }] = useDisclosure(false);
  const contactForm = useForm({ initialValues: { name: '', email: '', phone: '', role: '' } });

  const fetchVendor = async () => {
    try {
      const res = await api.get(`/procurement/vendors/${id}`);
      setVendor(res.data);
      editForm.setValues(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if(id) fetchVendor(); }, [id]);

  const handleUpdateVendor = async (values: typeof editForm.values) => {
    try {
      await api.patch(`/procurement/vendors/${id}`, values);
      notifications.show({ title: 'Success', message: 'Vendor updated', color: 'green' });
      closeEdit();
      fetchVendor();
    } catch (e) {
      notifications.show({ title: 'Error', message: 'Update failed', color: 'red' });
    }
  };

  const handleAddContact = async (values: typeof contactForm.values) => {
    try {
      await api.post(`/procurement/vendors/${id}/contacts`, values);
      notifications.show({ title: 'Success', message: 'Contact added', color: 'green' });
      closeContact();
      contactForm.reset();
      fetchVendor();
    } catch (e) {
      notifications.show({ title: 'Error', message: 'Failed to add contact', color: 'red' });
    }
  };

  const handleDeleteContact = async (contactId: string) => {
    if(!confirm('Delete contact?')) return;
    try {
      await api.delete(`/procurement/contacts/${contactId}`);
      fetchVendor();
    } catch(e) {}
  };

  if (loading) return <AdminLayout><LoadingOverlay visible /></AdminLayout>;
  if (!vendor) return <AdminLayout><Alert color="red">Vendor not found</Alert></AdminLayout>;

  return (
    <AdminLayout>
      {/* Edit Modal */}
      <Modal opened={editModalOpen} onClose={closeEdit} title="Edit Vendor Details">
        <form onSubmit={editForm.onSubmit(handleUpdateVendor)}>
          <Stack>
             <TextInput label="Name" {...editForm.getInputProps('name')} />
             <TextInput label="Email" {...editForm.getInputProps('email')} />
             <TextInput label="Phone" {...editForm.getInputProps('phone')} />
             <TextInput label="Website" {...editForm.getInputProps('website')} />
             <Button type="submit">Save</Button>
          </Stack>
        </form>
      </Modal>

      {/* Contact Modal */}
      <Modal opened={contactModalOpen} onClose={closeContact} title="Add Vendor Contact">
        <form onSubmit={contactForm.onSubmit(handleAddContact)}>
          <Stack>
             <TextInput label="Name" required {...contactForm.getInputProps('name')} />
             <TextInput label="Role" placeholder="e.g. Account Manager" {...contactForm.getInputProps('role')} />
             <TextInput label="Email" {...contactForm.getInputProps('email')} />
             <TextInput label="Phone" {...contactForm.getInputProps('phone')} />
             <Button type="submit">Add Contact</Button>
          </Stack>
        </form>
      </Modal>

      <Button variant="subtle" leftSection={<IconArrowLeft size={16}/>} component={Link} href="/procurement" mb="md">Back</Button>

      <Group justify="space-between" mb="xl">
         <Title order={2}>{vendor.name}</Title>
         <Button variant="outline" leftSection={<IconPencil size={16}/>} onClick={openEdit}>Edit Details</Button>
      </Group>

      <Grid>
        <Grid.Col span={8}>
           <Paper withBorder p="md" radius="md" mb="md">
             <Title order={4} mb="md">Purchase Orders</Title>
             {vendor.purchaseOrders.length === 0 ? <Text c="dimmed">No orders yet.</Text> : (
               <Table striped>
                 <Table.Thead><Table.Tr><Table.Th>PO #</Table.Th><Table.Th>Cost</Table.Th><Table.Th>Status</Table.Th><Table.Th>Date</Table.Th></Table.Tr></Table.Thead>
                 <Table.Tbody>
                   {vendor.purchaseOrders.map((po: any) => (
                     <Table.Tr key={po.id}>
                       <Table.Td>{po.poNumber}</Table.Td>
                       <Table.Td>${po.totalCost.toFixed(2)}</Table.Td>
                       <Table.Td><Badge>{po.status}</Badge></Table.Td>
                       <Table.Td>{new Date(po.createdAt).toLocaleDateString()}</Table.Td>
                     </Table.Tr>
                   ))}
                 </Table.Tbody>
               </Table>
             )}
           </Paper>
        </Grid.Col>

        <Grid.Col span={4}>
           <Paper withBorder p="md" radius="md">
             <Group justify="space-between" mb="md">
               <Title order={4}>Contacts</Title>
               <ActionIcon variant="subtle" onClick={openContact}><IconPlus size={16}/></ActionIcon>
             </Group>
             <Stack>
               {vendor.contacts.map((c: any) => (
                 <Paper key={c.id} withBorder p="xs">
                    <Group justify="space-between">
                       <div>
                         <Text fw={500} size="sm">{c.name}</Text>
                         <Text c="dimmed" size="xs">{c.role}</Text>
                         <Group gap="xs" mt={4}>
                            {c.email && <Group gap={4}><IconMail size={12}/><Text size="xs">{c.email}</Text></Group>}
                         </Group>
                       </div>
                       <ActionIcon color="red" variant="subtle" size="xs" onClick={() => handleDeleteContact(c.id)}><IconTrash size={12}/></ActionIcon>
                    </Group>
                 </Paper>
               ))}
               {vendor.contacts.length === 0 && <Text c="dimmed" size="sm">No contacts added.</Text>}
             </Stack>
           </Paper>
        </Grid.Col>
      </Grid>
    </AdminLayout>
  );
}