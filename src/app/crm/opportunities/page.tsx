'use client';

import { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import {
  Title, Button, Group, Table, Modal, TextInput, Stack, Paper, LoadingOverlay, Alert, Select, Menu, ActionIcon, NumberInput, Anchor, Text, Badge
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconPlus, IconTrash, IconPencil, IconDots, IconCurrencyDollar } from '@tabler/icons-react';
import api from '@/lib/api';
import { useDisclosure } from '@mantine/hooks';
import { useAuthStore } from '@/lib/authStore';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { modals } from '@mantine/modals';
// 👇 NEW IMPORT
import { DataActions } from '@/components/DataActions/DataActions';

export default function OpportunitiesPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const userPermissions = user?.permissions || [];

  const canRead = userPermissions.includes('crm:deals:read');
  const canCreate = userPermissions.includes('crm:deals:create');
  const canUpdate = userPermissions.includes('crm:deals:update');
  const canDelete = userPermissions.includes('crm:deals:delete');

  const [opps, setOpps] = useState<any[]>([]);
  const [orgs, setOrgs] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [createModalOpen, { open: openCreate, close: closeCreate }] = useDisclosure(false);
  const [editModalOpen, { open: openEdit, close: closeEdit }] = useDisclosure(false);
  const [selectedOpp, setSelectedOpp] = useState<any>(null);

  const createForm = useForm({
    initialValues: { name: '', stage: 'Qualification', amount: 0, closeDate: new Date(), priority: 'Medium', organizationId: '', contactId: '' },
    validate: { name: (v) => (v.length < 1 ? 'Required' : null), organizationId: (v) => (v ? null : 'Required'), contactId: (v) => (v ? null : 'Required') },
  });

  const editForm = useForm({
    initialValues: { name: '', stage: 'Qualification', amount: 0, closeDate: new Date(), priority: 'Medium', organizationId: '', contactId: '' },
  });

  const fetchData = useCallback(async () => {
    if (!canRead) return;
    setLoading(true);
    try {
      const [oppsRes, orgsRes, contactsRes] = await Promise.all([
        api.get('/crm/opportunities'),
        api.get('/crm/organizations'),
        api.get('/crm/contacts'),
      ]);
      setOpps(oppsRes.data);
      setOrgs(orgsRes.data.map((o:any) => ({ value: o.id, label: o.name })));
      setContacts(contactsRes.data.map((c:any) => ({ value: c.id, label: `${c.firstName} ${c.lastName}` })));
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, [canRead]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreate = async (values: typeof createForm.values) => {
    try {
      const payload = { ...values, closeDate: values.closeDate.toISOString() };
      await api.post('/crm/opportunities', payload);
      notifications.show({ title: 'Success', message: 'Deal created.', color: 'green' });
      closeCreate(); createForm.reset(); fetchData();
    } catch (e) { notifications.show({ title: 'Error', message: 'Failed to create deal.', color: 'red' }); }
  };

  const handleUpdate = async (values: typeof editForm.values) => {
    try {
      const payload = { ...values, closeDate: values.closeDate.toISOString() };
      await api.patch(`/crm/opportunities/${selectedOpp.id}`, payload);
      notifications.show({ title: 'Success', message: 'Deal updated.', color: 'green' });
      closeEdit(); fetchData();
    } catch (e) { notifications.show({ title: 'Error', message: 'Update failed.', color: 'red' }); }
  };

  const handleDelete = (opp: any) => {
    modals.openConfirmModal({
      title: 'Delete Deal',
      children: <Text size="sm">Delete deal <b>{opp.name}</b>?</Text>,
      labels: { confirm: 'Delete', cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await api.delete(`/crm/opportunities/${opp.id}`);
          notifications.show({ title: 'Deleted', message: 'Deal removed.', color: 'green' });
          fetchData();
        } catch (e) { notifications.show({ title: 'Error', message: 'Delete failed.', color: 'red' }); }
      }
    });
  };

  const openEditModal = (opp: any) => {
    setSelectedOpp(opp);
    editForm.setValues({
      name: opp.name, stage: opp.stage, amount: opp.amount, priority: opp.priority,
      closeDate: new Date(opp.closeDate), organizationId: opp.organization.id, contactId: opp.contact.id
    });
    openEdit();
  };

  const rows = opps.map((o) => (
    <Table.Tr key={o.id} style={{ cursor: 'pointer' }} onClick={() => router.push(`/crm/opportunities/${o.id}`)}>
      <Table.Td fw={500}>{o.name}</Table.Td>
      <Table.Td>{o.organization.name}</Table.Td>
      <Table.Td><Badge>{o.stage}</Badge></Table.Td>
      <Table.Td>${o.amount.toLocaleString()}</Table.Td>
      <Table.Td>{new Date(o.closeDate).toLocaleDateString()}</Table.Td>
      <Table.Td onClick={(e) => e.stopPropagation()}>
        {(canUpdate || canDelete) && (
           <Menu shadow="md" width={200}>
             <Menu.Target><ActionIcon variant="subtle"><IconDots size={16} /></ActionIcon></Menu.Target>
             <Menu.Dropdown>
               <Menu.Label>Actions</Menu.Label>
               {canUpdate && <Menu.Item leftSection={<IconPencil size={14}/>} onClick={() => openEditModal(o)}>Edit Deal</Menu.Item>}
               {canDelete && <Menu.Item color="red" leftSection={<IconTrash size={14}/>} onClick={() => handleDelete(o)}>Delete Deal</Menu.Item>}
             </Menu.Dropdown>
           </Menu>
        )}
      </Table.Td>
    </Table.Tr>
  ));

  if (!canRead) return <AdminLayout><Alert color="red">Access Denied</Alert></AdminLayout>;

  return (
    <AdminLayout>
      <Modal opened={createModalOpen} onClose={closeCreate} title="Create Opportunity">
        <form onSubmit={createForm.onSubmit(handleCreate)}>
          <Stack>
            <TextInput label="Deal Name" required {...createForm.getInputProps('name')} />
            <Select label="Stage" data={['Qualification', 'Proposal', 'Negotiation', 'Won', 'Lost']} {...createForm.getInputProps('stage')} />
            <NumberInput label="Amount" prefix="$" thousandSeparator {...createForm.getInputProps('amount')} />
            <DateInput label="Close Date" {...createForm.getInputProps('closeDate')} />
            <Select label="Organization" data={orgs} searchable {...createForm.getInputProps('organizationId')} />
            <Select label="Primary Contact" data={contacts} searchable {...createForm.getInputProps('contactId')} />
            <Button type="submit">Create</Button>
          </Stack>
        </form>
      </Modal>

      <Modal opened={editModalOpen} onClose={closeEdit} title="Edit Opportunity">
        <form onSubmit={editForm.onSubmit(handleUpdate)}>
          <Stack>
            <TextInput label="Deal Name" required {...editForm.getInputProps('name')} />
            <Select label="Stage" data={['Qualification', 'Proposal', 'Negotiation', 'Won', 'Lost']} {...editForm.getInputProps('stage')} />
            <NumberInput label="Amount" prefix="$" thousandSeparator {...editForm.getInputProps('amount')} />
            <DateInput label="Close Date" {...editForm.getInputProps('closeDate')} />
            <Select label="Organization" data={orgs} searchable {...editForm.getInputProps('organizationId')} />
            <Select label="Primary Contact" data={contacts} searchable {...editForm.getInputProps('contactId')} />
            <Button type="submit">Save Changes</Button>
          </Stack>
        </form>
      </Modal>

      <Group justify="space-between" mb="xl">
        <Title order={2}>Opportunities</Title>
        <Group>
            {/* 👇 ADDED EXPORT BUTTON */}
            <DataActions entity="deals" canImport={false} />
            {canCreate && <Button leftSection={<IconPlus size={16}/>} onClick={openCreate}>Add Deal</Button>}
        </Group>
      </Group>

      <Paper withBorder radius="md">
        <LoadingOverlay visible={loading} />
        <Table striped highlightOnHover>
          <Table.Thead><Table.Tr><Table.Th>Name</Table.Th><Table.Th>Organization</Table.Th><Table.Th>Stage</Table.Th><Table.Th>Amount</Table.Th><Table.Th>Close Date</Table.Th><Table.Th>Actions</Table.Th></Table.Tr></Table.Thead>
          <Table.Tbody>{rows}</Table.Tbody>
        </Table>
      </Paper>
    </AdminLayout>
  );
}