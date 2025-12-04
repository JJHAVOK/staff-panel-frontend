'use client';

import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import {
  Title, Text, Button, Group, Table, Badge, Paper, LoadingOverlay, Alert, Modal, TextInput, Stack, Textarea, Tabs, ActionIcon
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconPlus, IconAlertCircle, IconMailForward, IconUsers, IconSend, IconTemplate, IconTrash } from '@tabler/icons-react';
import api from '@/lib/api';
import { useDisclosure } from '@mantine/hooks';

export default function MarketingPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [subscribers, setSubscribers] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modals
  const [campaignModalOpen, { open: openCampaign, close: closeCampaign }] = useDisclosure(false);
  const [subModalOpen, { open: openSub, close: closeSub }] = useDisclosure(false);

  const campaignForm = useForm({
    initialValues: { name: '', subject: '', content: '' },
    validate: { name: (v) => (v.length < 3 ? 'Name too short' : null) },
  });

  const subForm = useForm({
    initialValues: { email: '', firstName: '', lastName: '' },
    validate: { email: (v) => (/^\S+@\S+$/.test(v) ? null : 'Invalid email') },
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [campRes, subRes, tempRes] = await Promise.all([
        api.get('/marketing/campaigns'),
        api.get('/marketing/subscribers'),
        api.get('/marketing/templates'),
      ]);
      setCampaigns(campRes.data);
      setSubscribers(subRes.data);
      setTemplates(tempRes.data);
    } catch (e) {
      console.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreateCampaign = async (values: typeof campaignForm.values) => {
    try {
      await api.post('/marketing/campaigns', values);
      notifications.show({ title: 'Success', message: 'Campaign draft created.', color: 'green' });
      closeCampaign();
      campaignForm.reset();
      fetchData();
    } catch (e) { notifications.show({ title: 'Error', message: 'Failed.', color: 'red' }); }
  };

  const handleCreateSubscriber = async (values: typeof subForm.values) => {
    try {
      await api.post('/marketing/subscribers', values);
      notifications.show({ title: 'Success', message: 'Subscriber added.', color: 'green' });
      closeSub();
      subForm.reset();
      fetchData();
    } catch (e) { notifications.show({ title: 'Error', message: 'Failed.', color: 'red' }); }
  };

  const handleSendCampaign = async (id: string) => {
    if (!confirm('Are you sure you want to BLAST this email to all subscribers?')) return;
    try {
      await api.post(`/marketing/campaigns/${id}/send`);
      notifications.show({ title: 'Sent', message: 'Campaign started.', color: 'green' });
      fetchData();
    } catch(e) { notifications.show({ title: 'Error', message: 'Send failed.', color: 'red' }); }
  };

  const handleDeleteCampaign = async (id: string) => {
    if (!confirm('Delete campaign?')) return;
    try { await api.delete(`/marketing/campaigns/${id}`); fetchData(); } catch(e) {}
  };

  const handleDeleteSubscriber = async (id: string) => {
     if (!confirm('Delete subscriber?')) return;
     try { await api.delete(`/marketing/subscribers/${id}`); fetchData(); } catch(e) {}
  };

  return (
    <AdminLayout>
      <Title order={2} mb="xl">Marketing Automation</Title>

      {/* --- MODALS --- */}
      <Modal opened={campaignModalOpen} onClose={closeCampaign} title="Create Campaign" size="xl">
        <form onSubmit={campaignForm.onSubmit(handleCreateCampaign)}>
          <Stack>
            <TextInput label="Internal Name" required {...campaignForm.getInputProps('name')} />
            <TextInput label="Subject Line" required {...campaignForm.getInputProps('subject')} />
            <Textarea label="Content (HTML)" minRows={8} {...campaignForm.getInputProps('content')} />
            <Button type="submit">Save Draft</Button>
          </Stack>
        </form>
      </Modal>

      <Modal opened={subModalOpen} onClose={closeSub} title="Add Subscriber">
        <form onSubmit={subForm.onSubmit(handleCreateSubscriber)}>
          <Stack>
            <TextInput label="Email" required {...subForm.getInputProps('email')} />
            <Group grow>
               <TextInput label="First Name" {...subForm.getInputProps('firstName')} />
               <TextInput label="Last Name" {...subForm.getInputProps('lastName')} />
            </Group>
            <Button type="submit">Add Subscriber</Button>
          </Stack>
        </form>
      </Modal>

      <Tabs defaultValue="campaigns">
        <Tabs.List>
          <Tabs.Tab value="campaigns" leftSection={<IconSend size={14} />}>Campaigns</Tabs.Tab>
          <Tabs.Tab value="subscribers" leftSection={<IconUsers size={14} />}>Audience</Tabs.Tab>
          <Tabs.Tab value="templates" leftSection={<IconTemplate size={14} />}>Templates</Tabs.Tab>
        </Tabs.List>

        {/* --- CAMPAIGNS TAB --- */}
        <Tabs.Panel value="campaigns" pt="md">
          <Group justify="flex-end" mb="md">
             <Button leftSection={<IconPlus size={16} />} onClick={openCampaign}>New Campaign</Button>
          </Group>
          <Paper withBorder radius="md">
            <LoadingOverlay visible={loading} />
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr><Table.Th>Name</Table.Th><Table.Th>Subject</Table.Th><Table.Th>Status</Table.Th><Table.Th>Stats</Table.Th><Table.Th>Actions</Table.Th></Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {campaigns.map((c) => (
                  <Table.Tr key={c.id}>
                    <Table.Td fw={500}>{c.name}</Table.Td>
                    <Table.Td>{c.subject}</Table.Td>
                    <Table.Td>
                      <Badge color={c.status === 'COMPLETED' ? 'green' : c.status === 'DRAFT' ? 'gray' : 'blue'}>{c.status}</Badge>
                    </Table.Td>
                    <Table.Td>
                        {c.stats ? `${c.stats.sent} Sent` : '-'}
                    </Table.Td>
                    <Table.Td>
                      <Group gap={4}>
                        {c.status === 'DRAFT' && (
                          <Button size="xs" color="blue" onClick={() => handleSendCampaign(c.id)}>Send</Button>
                        )}
                        <ActionIcon color="red" variant="subtle" onClick={() => handleDeleteCampaign(c.id)}><IconTrash size={16}/></ActionIcon>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Paper>
        </Tabs.Panel>

        {/* --- SUBSCRIBERS TAB --- */}
        <Tabs.Panel value="subscribers" pt="md">
          <Group justify="flex-end" mb="md">
             <Button leftSection={<IconPlus size={16} />} onClick={openSub}>Add Subscriber</Button>
          </Group>
          <Paper withBorder radius="md">
            <LoadingOverlay visible={loading} />
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr><Table.Th>Email</Table.Th><Table.Th>Name</Table.Th><Table.Th>Tags</Table.Th><Table.Th>Status</Table.Th><Table.Th>Actions</Table.Th></Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {subscribers.map((s) => (
                  <Table.Tr key={s.id}>
                    <Table.Td fw={500}>{s.email}</Table.Td>
                    <Table.Td>{s.firstName} {s.lastName}</Table.Td>
                    <Table.Td>{s.tags?.map((t:string) => <Badge key={t} size="xs" mr={4}>{t}</Badge>)}</Table.Td>
                    <Table.Td><Badge color={s.isSubscribed ? 'green' : 'red'}>{s.isSubscribed ? 'Active' : 'Unsubscribed'}</Badge></Table.Td>
                    <Table.Td>
                        <ActionIcon color="red" variant="subtle" onClick={() => handleDeleteSubscriber(s.id)}><IconTrash size={16}/></ActionIcon>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Paper>
        </Tabs.Panel>

        <Tabs.Panel value="templates" pt="md">
           <Alert color="blue">Email Design Builder coming in Phase 5 (CMS).</Alert>
        </Tabs.Panel>

      </Tabs>
    </AdminLayout>
  );
}
