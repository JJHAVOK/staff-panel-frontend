'use client';

import { AdminLayout } from '@/components/AdminLayout';
import api from '@/lib/api';
import { Title, Paper, Text, Stack, LoadingOverlay, Alert, Anchor, Badge, Group, Button, Menu, ActionIcon, Modal, TextInput, Select, NumberInput } from '@mantine/core';
import { IconAlertCircle, IconArrowLeft, IconDots, IconPencil, IconTrash } from '@tabler/icons-react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/lib/authStore';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { DateInput } from '@mantine/dates';
import { modals } from '@mantine/modals';

export default function OpportunityProfilePage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const userPermissions = user?.permissions || [];
  const { id } = useParams();

  const [opp, setOpp] = useState<any>(null);
  const [orgs, setOrgs] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [editModalOpen, { open: openEdit, close: closeEdit }] = useDisclosure(false);
  
  const editForm = useForm({
    initialValues: { name: '', stage: '', amount: 0, closeDate: new Date(), priority: '', organizationId: '', contactId: '' },
  });

  const canUpdate = userPermissions.includes('crm:deals:update');
  const canDelete = userPermissions.includes('crm:deals:delete');

  const fetchOpp = async () => {
    try {
      setLoading(true);
      const [oppRes, orgRes, conRes] = await Promise.all([
          api.get(`/crm/opportunities/${id}`),
          api.get('/crm/organizations'),
          api.get('/crm/contacts'),
      ]);
      setOpp(oppRes.data);
      setOrgs(orgRes.data.map((o:any) => ({ value: o.id, label: o.name })));
      setContacts(conRes.data.map((c:any) => ({ value: c.id, label: `${c.firstName} ${c.lastName}` })));

      editForm.setValues({
         name: oppRes.data.name,
         stage: oppRes.data.stage,
         amount: oppRes.data.amount,
         priority: oppRes.data.priority,
         closeDate: new Date(oppRes.data.closeDate),
         organizationId: oppRes.data.organizationId,
         contactId: oppRes.data.contactId,
      });
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => { if(id) fetchOpp(); }, [id]);

  const handleUpdate = async (values: typeof editForm.values) => {
    try {
      const payload = { ...values, closeDate: values.closeDate.toISOString() };
      await api.patch(`/crm/opportunities/${id}`, payload);
      notifications.show({ title: 'Success', message: 'Deal updated.', color: 'green' });
      closeEdit(); fetchOpp();
    } catch (e) { notifications.show({ title: 'Error', message: 'Update failed.', color: 'red' }); }
  };

  const handleDelete = () => {
    modals.openConfirmModal({
      title: 'Delete Deal',
      children: <Text size="sm">Are you sure?</Text>,
      labels: { confirm: 'Delete', cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await api.delete(`/crm/opportunities/${id}`);
          notifications.show({ title: 'Deleted', message: 'Deal removed.', color: 'green' });
          router.push('/crm/opportunities');
        } catch (e) { notifications.show({ title: 'Error', message: 'Delete failed.', color: 'red' }); }
      }
    });
  };

  return (
    <AdminLayout>
      <LoadingOverlay visible={loading} />
      
      <Modal opened={editModalOpen} onClose={closeEdit} title="Edit Opportunity">
        <form onSubmit={editForm.onSubmit(handleUpdate)}>
          <Stack>
            <TextInput label="Deal Name" required {...editForm.getInputProps('name')} />
            <Select label="Stage" data={['Qualification', 'Proposal', 'Negotiation', 'Won', 'Lost']} {...editForm.getInputProps('stage')} />
            <NumberInput label="Amount" prefix="$" thousandSeparator {...editForm.getInputProps('amount')} />
            <DateInput label="Close Date" {...editForm.getInputProps('closeDate')} />
            <Select label="Organization" data={orgs} searchable {...editForm.getInputProps('organizationId')} />
            <Select label="Contact" data={contacts} searchable {...editForm.getInputProps('contactId')} />
            <Button type="submit">Save Changes</Button>
          </Stack>
        </form>
      </Modal>

      {opp && (
        <Stack>
          <Group justify="space-between">
             <Button variant="subtle" leftSection={<IconArrowLeft size={16} />} onClick={() => router.back()}>Back</Button>
             {(canUpdate || canDelete) && (
               <Menu shadow="md" width={200}>
                 <Menu.Target><Button variant="default" leftSection={<IconDots size={16} />}>Actions</Button></Menu.Target>
                 <Menu.Dropdown>
                   {canUpdate && <Menu.Item leftSection={<IconPencil size={14} />} onClick={openEdit}>Edit Details</Menu.Item>}
                   {canDelete && <Menu.Item color="red" leftSection={<IconTrash size={14} />} onClick={handleDelete}>Delete Deal</Menu.Item>}
                 </Menu.Dropdown>
               </Menu>
             )}
          </Group>

          <Paper withBorder p="md" radius="md">
            <Group justify="space-between">
              <Title order={2}>{opp.name}</Title>
              <Badge size="lg">{opp.stage}</Badge>
            </Group>
            <Title order={1} c="green.4" mt="xs">${opp.amount.toLocaleString()}</Title>
            <Stack mt="xl">
              <Text c="dimmed">Priority: {opp.priority}</Text>
              <Text c="dimmed">Close Date: {new Date(opp.closeDate).toLocaleDateString()}</Text>
              <Text c="dimmed">Org: <Anchor component={Link} href={`/crm/organizations/${opp.organization.id}`}>{opp.organization.name}</Anchor></Text>
              <Text c="dimmed">Contact: <Anchor component={Link} href={`/crm/contacts/${opp.contact.id}`}>{opp.contact.firstName} {opp.contact.lastName}</Anchor></Text>
            </Stack>
          </Paper>
        </Stack>
      )}
    </AdminLayout>
  );
}