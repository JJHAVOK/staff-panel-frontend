'use client';

import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { Title, Table, Badge, Paper, LoadingOverlay, Alert, ActionIcon, Text } from '@mantine/core';
import { IconTrash, IconMailOpened, IconMail } from '@tabler/icons-react';
import api from '@/lib/api';
// --- 👇 ADDED IMPORT 👇 ---
import { useRouter } from 'next/navigation';

export default function InboxPage() {
  const router = useRouter(); // --- 👇 ADDED HOOK 👇 ---
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMessages = async () => {
    try {
      const res = await api.get('/inbox');
      setMessages(res.data);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { fetchMessages(); }, []);

  const handleDelete = async (id: string, e: any) => {
     e.stopPropagation(); // Prevent row click
     if(!confirm('Delete message?')) return;
     await api.delete(`/inbox/${id}`);
     fetchMessages();
  };

  const handleRead = async (id: string, e: any) => {
     e.stopPropagation(); // Prevent row click
     await api.patch(`/inbox/${id}/read`);
     fetchMessages();
  };

  return (
    <AdminLayout>
      <Title order={2} mb="xl">Inbox</Title>
      <Paper withBorder radius="md">
        <LoadingOverlay visible={loading} />
        <Table striped highlightOnHover>
          <Table.Thead><Table.Tr><Table.Th>Status</Table.Th><Table.Th>Name</Table.Th><Table.Th>Service</Table.Th><Table.Th>Message</Table.Th><Table.Th>Date</Table.Th><Table.Th>Actions</Table.Th></Table.Tr></Table.Thead>
          <Table.Tbody>
            {messages.map(msg => (
              <Table.Tr 
                 key={msg.id} 
                 style={{ fontWeight: msg.status === 'UNREAD' ? 'bold' : 'normal', cursor: 'pointer' }}
                 onClick={() => router.push(`/inbox/${msg.id}`)}
              >
                 <Table.Td>{msg.status === 'UNREAD' ? <Badge color="blue">New</Badge> : <Badge color="gray">Read</Badge>}</Table.Td>
                 <Table.Td>
                    <div>{msg.name}</div>
                    <Text size="xs" c="dimmed">{msg.email}</Text>
                 </Table.Td>
                 <Table.Td>{msg.subject}</Table.Td>
                 <Table.Td style={{ maxWidth: '300px' }}><Text truncate>{msg.message}</Text></Table.Td>
                 <Table.Td>{new Date(msg.createdAt).toLocaleDateString()}</Table.Td>
                 <Table.Td>
                    <ActionIcon variant="subtle" onClick={(e) => handleRead(msg.id, e)}>{msg.status==='UNREAD' ? <IconMail size={16}/> : <IconMailOpened size={16}/>}</ActionIcon>
                    <ActionIcon variant="subtle" color="red" onClick={(e) => handleDelete(msg.id, e)}><IconTrash size={16}/></ActionIcon>
                 </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Paper>
    </AdminLayout>
  );
}