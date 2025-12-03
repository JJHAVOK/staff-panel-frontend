'use client';

import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import {
  Title, Button, Group, Table, Modal, TextInput, Stack, Paper, LoadingOverlay, Select, Badge
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconLayoutKanban, IconPlus } from '@tabler/icons-react';
import api from '@/lib/api';
import { useDisclosure } from '@mantine/hooks';
import { useAuthStore } from '@/lib/authStore';
import { useRouter } from 'next/navigation';

export default function ProjectsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const userPermissions = user?.permissions || [];
  const canManage = userPermissions.includes('manage:projects');

  const [projects, setProjects] = useState<any[]>([]);
  const [orgs, setOrgs] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpened, { open, close }] = useDisclosure(false);

  const form = useForm({
    initialValues: { name: '', description: '', organizationId: '', contactId: '', orderId: '' },
    validate: { name: (val) => (val.length < 2 ? 'Name required' : null) },
  });

  const fetchData = async () => {
    setLoading(true);
    
    // Use allSettled so one failure doesn't break the page
    const results = await Promise.allSettled([
      api.get('/projects'),
      api.get('/crm/organizations'),
      api.get('/crm/contacts'),
      api.get('/ecommerce/orders'),
    ]);

    // 0: Projects
    if (results[0].status === 'fulfilled') {
      setProjects(results[0].value.data);
    } else {
      console.error('Projects failed:', results[0].reason);
      notifications.show({ title: 'Error', message: 'Failed to load Projects list.', color: 'red' });
    }

    // 1: Orgs
    if (results[1].status === 'fulfilled') {
      setOrgs(results[1].value.data.map((o: any) => ({ value: o.id, label: o.name })));
    }

    // 2: Contacts
    if (results[2].status === 'fulfilled') {
      setContacts(results[2].value.data.map((c: any) => ({ value: c.id, label: `${c.firstName} ${c.lastName} (${c.email})` })));
    }

    // 3: Orders
    if (results[3].status === 'fulfilled') {
      setOrders(results[3].value.data.map((o: any) => ({ value: o.id, label: `${o.orderNumber} - ${o.customerEmail}` })));
    }

    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (values: typeof form.values) => {
    try {
      const payload = {
        ...values,
        organizationId: values.organizationId || undefined,
        contactId: values.contactId || undefined,
        orderId: values.orderId || undefined,
      };

      await api.post('/projects', payload);
      notifications.show({ title: 'Success', message: 'Project created.', color: 'green' });
      close();
      form.reset();
      fetchData();
    } catch (e) {
      notifications.show({ title: 'Error', message: 'Failed to create project.', color: 'red' });
    }
  };

  const rows = projects.map((proj) => (
    <Table.Tr key={proj.id} style={{ cursor: 'pointer' }} onClick={() => router.push(`/projects/${proj.id}`)}>
      <Table.Td fw={500}>{proj.name}</Table.Td>
      <Table.Td>
          {proj.organization ? <Badge color="blue">{proj.organization.name}</Badge> : 
           proj.contact ? <Badge color="cyan">{proj.contact.firstName}</Badge> : 
           '-'}
      </Table.Td>
      <Table.Td>{proj.status}</Table.Td>
      <Table.Td>{new Date(proj.updatedAt).toLocaleDateString()}</Table.Td>
    </Table.Tr>
  ));

  return (
    <AdminLayout>
      <Modal opened={modalOpened} onClose={close} title="Create New Project">
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack>
            <TextInput label="Project Name" required {...form.getInputProps('name')} />
            <TextInput label="Description" {...form.getInputProps('description')} />
            
            <Select 
                label="Link Organization (Optional)" 
                data={orgs} 
                searchable 
                clearable
                {...form.getInputProps('organizationId')} 
            />
            
            <Select 
                label="Link Contact (Optional)" 
                data={contacts} 
                searchable 
                clearable
                {...form.getInputProps('contactId')} 
            />

            <Select 
                label="Link Order (Optional)" 
                data={orders} 
                searchable 
                clearable
                {...form.getInputProps('orderId')} 
            />

            <Button type="submit" mt="md">Create Project</Button>
          </Stack>
        </form>
      </Modal>

      <Group justify="space-between" mb="xl">
        <Group>
          <IconLayoutKanban size={32} />
          <Title order={2}>Projects</Title>
        </Group>
        {canManage && <Button onClick={open} leftSection={<IconPlus size={16} />}>New Project</Button>}
      </Group>

      <Paper withBorder p="md" radius="md" style={{ position: 'relative' }}>
        <LoadingOverlay visible={loading} />
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Name</Table.Th>
              <Table.Th>Client</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th>Last Updated</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>{rows}</Table.Tbody>
        </Table>
      </Paper>
    </AdminLayout>
  );
}