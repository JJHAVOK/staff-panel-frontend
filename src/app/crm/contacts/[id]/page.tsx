'use client';

import { AdminLayout } from '@/components/AdminLayout';
import api from '@/lib/api';
import { Title, Paper, Text, Grid, Stack, Group, LoadingOverlay, Alert, Tabs, Table, Badge, Button, Menu, ActionIcon, Modal, TextInput, Select, RingProgress, Divider } from '@mantine/core';
import { IconArrowLeft, IconDots, IconPencil, IconTrash, IconFlame, IconSnowflake, IconTicket, IconUser, IconReceipt2, IconPackage } from '@tabler/icons-react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { BillingManager } from '@/components/BillingManager';
import { useAuthStore } from '@/lib/authStore';
import Link from 'next/link';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { modals } from '@mantine/modals';

function ContactOrdersTab({ email }: { email: string }) {
  const [orders, setOrders] = useState<any[]>([]);
  useEffect(() => { api.post('/ecommerce/orders/search/email', { email }).then(res => setOrders(res.data)).catch(()=>{}); }, [email]);
  if (orders.length === 0) return <Text c="dimmed">No orders.</Text>;
  return <Table>{orders.map(o => <tr key={o.id}><td>{o.orderNumber}</td><td>{o.status}</td></tr>)}</Table>;
}

function ContactTicketsTab({ email }: { email: string }) {
    const [tickets, setTickets] = useState<any[]>([]);
    useEffect(() => {
        api.get('/helpdesk').then(res => {
            setTickets(res.data.filter((t: any) => t.requesterEmail === email));
        }).catch(()=>{});
    }, [email]);

    if (tickets.length === 0) return <Text c="dimmed">No tickets found.</Text>;
    return (
        <Table striped highlightOnHover>
            <Table.Thead><Table.Tr><Table.Th>Subject</Table.Th><Table.Th>Status</Table.Th></Table.Tr></Table.Thead>
            <Table.Tbody>{tickets.map(t => <Table.Tr key={t.id}>
                <Table.Td><Link href={`/helpdesk/${t.id}`}>{t.subject}</Link></Table.Td>
                <Table.Td><Badge>{t.status}</Badge></Table.Td>
            </Table.Tr>)}</Table.Tbody>
        </Table>
    );
}

export default function ContactProfilePage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { id } = useParams();
  const [contact, setContact] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editOpened, { open: openEdit, close: closeEdit }] = useDisclosure(false);
  const editForm = useForm({ initialValues: { firstName: '', lastName: '', email: '' } });

  const fetchContact = async () => {
    try { setLoading(true); const res = await api.get(`/crm/contacts/${id}`); setContact(res.data); editForm.setValues(res.data); } catch(e){} finally { setLoading(false); }
  };
  useEffect(() => { if (id) fetchContact(); }, [id]);

  const handleUpdate = async (val: typeof editForm.values) => { await api.patch(`/crm/contacts/${id}`, val); closeEdit(); fetchContact(); };
  const handleDelete = () => { if(confirm('Delete?')) { api.delete(`/crm/contacts/${id}`).then(()=>router.push('/crm/contacts')); } };

  if(!contact) return <AdminLayout><LoadingOverlay visible /></AdminLayout>;

  return (
    <AdminLayout>
      <Modal opened={editOpened} onClose={closeEdit} title="Edit"><form onSubmit={editForm.onSubmit(handleUpdate)}><Stack><TextInput label="First" {...editForm.getInputProps('firstName')}/><Button type="submit">Save</Button></Stack></form></Modal>
      
      <Group justify="space-between" mb="md"><Button variant="subtle" leftSection={<IconArrowLeft size={16}/>} onClick={()=>router.back()}>Back</Button>
      <Menu><Menu.Target><Button>Actions</Button></Menu.Target><Menu.Dropdown><Menu.Item onClick={openEdit}>Edit</Menu.Item><Menu.Item color="red" onClick={handleDelete}>Delete</Menu.Item></Menu.Dropdown></Menu>
      </Group>
      
      <Group align="flex-start" mb="lg">
          <Stack gap={0}>
              <Title order={2}>{contact.firstName} {contact.lastName}</Title>
              <Text c="dimmed">{contact.email}</Text>
          </Stack>
          
          <Paper p="sm" withBorder radius="md" style={{marginLeft: 'auto'}}>
              <Group>
                  <Stack align="center" gap={0}>
                      <RingProgress size={70} thickness={6} roundCaps sections={[{ value: contact.leadScore||0, color: 'violet' }]} label={<Text ta="center" fw={700} size="xs">{contact.leadScore}</Text>} />
                      <Text size="xs" c="dimmed">Score</Text>
                  </Stack>
                  <Divider orientation="vertical" />
                  <Stack align="center" gap={0}>
                      <Badge size="lg" color={contact.sentiment==='HAPPY'?'green':contact.sentiment==='ANGRY'?'red':'gray'}>{contact.sentiment||'N/A'}</Badge>
                      <Text size="xs" c="dimmed">Sentiment</Text>
                  </Stack>
              </Group>
          </Paper>
      </Group>

      <Tabs defaultValue="overview">
        <Tabs.List>
            <Tabs.Tab value="overview" leftSection={<IconUser size={14}/>}>Overview</Tabs.Tab>
            <Tabs.Tab value="tickets" leftSection={<IconTicket size={14}/>}>Tickets</Tabs.Tab>
            <Tabs.Tab value="orders" leftSection={<IconPackage size={14}/>}>Orders</Tabs.Tab>
            <Tabs.Tab value="billing" leftSection={<IconReceipt2 size={14}/>}>Billing</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="overview" pt="md"><Paper p="md" withBorder><Text><b>Title:</b> {contact.title}</Text><Text><b>Phone:</b> {contact.phone}</Text></Paper></Tabs.Panel>
        <Tabs.Panel value="tickets" pt="md"><ContactTicketsTab email={contact.email}/></Tabs.Panel>
        <Tabs.Panel value="orders" pt="md"><ContactOrdersTab email={contact.email}/></Tabs.Panel>
        <Tabs.Panel value="billing" pt="md">{contact.organizationId ? <BillingManager organizationId={contact.organizationId} canManage={true}/> : <Alert>No Org</Alert>}</Tabs.Panel>
      </Tabs>
    </AdminLayout>
  );
}