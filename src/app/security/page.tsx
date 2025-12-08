'use client';

import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { Title, Table, Badge, Paper, LoadingOverlay, Tabs, Group, Text } from '@mantine/core';
import { IconDeviceDesktop, IconShieldLock } from '@tabler/icons-react';
import api from '@/lib/api';

export default function GlobalSecurityPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string | null>('STAFF');

  useEffect(() => {
     if(!activeTab) return;
     setLoading(true);
     setLogs([]); 
     
     api.get(`/security/history/all?type=${activeTab}`)
       .then(res => setLogs(res.data))
       .catch(console.error)
       .finally(() => setLoading(false));
  }, [activeTab]);

  const rows = logs.map((log) => (
    <Table.Tr key={log.id}>
      <Table.Td>{new Date(log.createdAt).toLocaleString()}</Table.Td>
      <Table.Td>
          {activeTab === 'STAFF' ? (
              <div>
                  <Text size="sm" fw={500}>{log.staffUser?.firstName || 'Unknown'} {log.staffUser?.lastName || ''}</Text>
                  <Text size="xs" c="dimmed">{log.staffUser?.email}</Text>
              </div>
          ) : (
              <div>
                  <Text size="sm" fw={500}>{log.contact?.firstName || 'Unknown'} {log.contact?.lastName || ''}</Text>
                  <Text size="xs" c="dimmed">{log.contact?.email}</Text>
              </div>
          )}
      </Table.Td>
      <Table.Td>
          <Group gap="xs">
              <IconDeviceDesktop size={14}/> 
              <Text size="sm">{log.device || 'Unknown'}</Text>
          </Group>
      </Table.Td>
      <Table.Td>{log.ipAddress}</Table.Td>
      <Table.Td>
        <Badge 
            color={log.status === 'SUCCESS' ? 'green' : log.status === 'LOGOUT' ? 'gray' : 'red'}
        >
            {log.status}
        </Badge>
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <AdminLayout>
      <Title order={2} mb="xl">Security Center</Title>

      <Paper p="md" radius="md" withBorder>
         <Group mb="md">
            <IconShieldLock size={24} color="gray" />
            <Title order={4}>Global Access Logs</Title>
         </Group>
         
         <Tabs value={activeTab} onChange={setActiveTab}>
            <Tabs.List mb="md">
               <Tabs.Tab value="STAFF">Staff Panel Logs</Tabs.Tab>
               <Tabs.Tab value="CUSTOMER">Storefront Logs</Tabs.Tab>
            </Tabs.List>

            {/* STAFF TAB */}
            <Tabs.Panel value="STAFF">
                <div style={{ position: 'relative', minHeight: '200px' }}>
                    <LoadingOverlay visible={loading} />
                    <Table striped highlightOnHover>
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th>Date</Table.Th>
                                <Table.Th>User</Table.Th>
                                <Table.Th>Device</Table.Th>
                                <Table.Th>IP</Table.Th>
                                <Table.Th>Status</Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {logs.length === 0 && !loading ? (
                                <Table.Tr><Table.Td colSpan={5} align="center" c="dimmed">No logs found.</Table.Td></Table.Tr>
                            ) : rows}
                        </Table.Tbody>
                    </Table>
                </div>
            </Tabs.Panel>

            {/* CUSTOMER TAB */}
            <Tabs.Panel value="CUSTOMER">
                <div style={{ position: 'relative', minHeight: '200px' }}>
                    <LoadingOverlay visible={loading} />
                    <Table striped highlightOnHover>
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th>Date</Table.Th>
                                <Table.Th>Customer</Table.Th>
                                <Table.Th>Device</Table.Th>
                                <Table.Th>IP</Table.Th>
                                <Table.Th>Status</Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {logs.length === 0 && !loading ? (
                                <Table.Tr><Table.Td colSpan={5} align="center" c="dimmed">No logs found.</Table.Td></Table.Tr>
                            ) : rows}
                        </Table.Tbody>
                    </Table>
                </div>
            </Tabs.Panel>
         </Tabs>
      </Paper>
    </AdminLayout>
  );
}