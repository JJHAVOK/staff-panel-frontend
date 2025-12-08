'use client';

import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { Title, Paper, Text, Button, Group, Table, Badge, Modal, Stack, TextInput, Image, Tabs } from '@mantine/core';
import { IconShieldCheck, IconDeviceDesktop, IconUser, IconCheck } from '@tabler/icons-react';
import api from '@/lib/api';
import { notifications } from '@mantine/notifications';
import { useAuthStore } from '@/lib/authStore';

export default function UserSettingsPage() {
  const { user } = useAuthStore();
  const [history, setHistory] = useState<any[]>([]);
  const [activeSessions, setActiveSessions] = useState<any[]>([]); // <-- NEW
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [mfaData, setMfaData] = useState<{ qrCodeUrl: string, secret: string } | null>(null);
  const [mfaToken, setMfaToken] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
     api.get('/security/history/me').then(res => setHistory(res.data)).catch(()=>{});
     api.get('/security/mfa/status').then(res => setMfaEnabled(res.data.enabled)).catch(()=>{});
     // Fetch Sessions
     api.get('/auth/sessions').then(res => setActiveSessions(res.data)).catch(()=>{});
  }, []);

  const handleSetupMfa = async () => {
     try {
        const res = await api.post('/security/mfa/setup');
        setMfaData(res.data);
        setModalOpen(true);
     } catch(e) { notifications.show({ title: 'Error', message: 'Failed to start MFA', color: 'red' }); }
  };

  const handleVerifyMfa = async () => {
     try {
        await api.post('/security/mfa/verify', { token: mfaToken });
        notifications.show({ title: 'Success', message: 'MFA Enabled!', color: 'green' });
        setMfaEnabled(true);
        setModalOpen(false);
     } catch(e) { notifications.show({ title: 'Error', message: 'Invalid Code', color: 'red' }); }
  };

  const handleRevoke = async (id: string) => {
     try {
         await api.delete(`/auth/sessions/${id}`);
         setActiveSessions(prev => prev.filter(s => s.id !== id));
         notifications.show({ title: 'Success', message: 'Session revoked', color: 'green' });
     } catch(e) { notifications.show({ title: 'Error', message: 'Failed to revoke', color: 'red' }); }
  };

  return (
    <AdminLayout>
      <Title order={2} mb="xl">My Settings</Title>
      
      <Tabs defaultValue="profile">
         <Tabs.List mb="lg">
            <Tabs.Tab value="profile" leftSection={<IconUser size={14}/>}>Profile</Tabs.Tab>
            <Tabs.Tab value="security" leftSection={<IconShieldCheck size={14}/>}>Security</Tabs.Tab>
         </Tabs.List>

         <Tabs.Panel value="profile">
             <Paper p="xl" withBorder>
                 <Title order={4}>Personal Details</Title>
                 <Text>Name: {user?.firstName} {user?.lastName}</Text>
                 <Text>Email: {user?.email}</Text>
             </Paper>
         </Tabs.Panel>

         <Tabs.Panel value="security">
            <Paper p="md" radius="md" withBorder mb="lg">
               <Group justify="space-between">
                  <div>
                     <Title order={4}>Two-Factor Authentication</Title>
                     <Text c="dimmed" size="sm">Secure your staff account.</Text>
                  </div>
                  {mfaEnabled ? (
                      <Badge size="lg" color="green" leftSection={<IconCheck size={14}/>}>Enabled</Badge>
                  ) : (
                      <Button leftSection={<IconShieldCheck size={16}/>} onClick={handleSetupMfa}>Setup MFA</Button>
                  )}
               </Group>
            </Paper>

            <Paper p="md" radius="md" withBorder mb="lg">
               <Title order={4} mb="md">Active Sessions</Title>
               <Stack>
                  {activeSessions.map((s) => (
                      <Group key={s.id} justify="space-between" p="sm" bg="gray.0" style={{ borderRadius: '8px' }}>
                          <div>
                              <Group gap="xs"><IconDeviceDesktop size={14}/> <Text size="sm" fw={500}>{s.device?.name || 'Unknown'}</Text></Group>
                              <Text size="xs" c="dimmed">{s.ipAddress} • {new Date(s.createdAt).toLocaleDateString()}</Text>
                          </div>
                          <Button color="red" variant="subtle" size="xs" onClick={() => handleRevoke(s.id)}>Revoke</Button>
                      </Group>
                  ))}
               </Stack>
            </Paper>

            <Paper p="md" radius="md" withBorder>
               <Title order={4} mb="md">My Login History</Title>
               <Table>
                  <Table.Thead><Table.Tr><Table.Th>Date</Table.Th><Table.Th>Device</Table.Th><Table.Th>IP</Table.Th><Table.Th>Status</Table.Th></Table.Tr></Table.Thead>
                  <Table.Tbody>
                     {history.map((log: any) => (
                        <Table.Tr key={log.id}>
                           <Table.Td>{new Date(log.createdAt).toLocaleString()}</Table.Td>
                           <Table.Td><Group gap="xs"><IconDeviceDesktop size={14}/> {log.device || 'Unknown'}</Group></Table.Td>
                           <Table.Td>{log.ipAddress}</Table.Td>
                           <Table.Td><Badge color={log.status === 'SUCCESS' ? 'green' : 'gray'}>{log.status}</Badge></Table.Td>
                        </Table.Tr>
                     ))}
                  </Table.Tbody>
               </Table>
            </Paper>
         </Tabs.Panel>
      </Tabs>

      <Modal opened={modalOpen} onClose={() => setModalOpen(false)} title="Setup Authenticator">
         <Stack align="center">
            {mfaData && <Image src={mfaData.qrCodeUrl} w={200} />}
            <Text size="sm" ta="center">Scan this QR code with Google Authenticator</Text>
            <TextInput placeholder="Enter 6-digit code" value={mfaToken} onChange={(e) => setMfaToken(e.currentTarget.value)} />
            <Button fullWidth onClick={handleVerifyMfa}>Verify & Enable</Button>
         </Stack>
      </Modal>
    </AdminLayout>
  );
}