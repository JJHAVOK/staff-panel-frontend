'use client';

import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { Title, Paper, Text, Group, Button, LoadingOverlay, Badge, Divider, Stack } from '@mantine/core';
import { IconArrowLeft, IconMail, IconTrash, IconCheck } from '@tabler/icons-react';
import api from '@/lib/api';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function InboxDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [msg, setMsg] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if(id) {
        api.get(`/inbox/${id}`)
           .then(res => {
               setMsg(res.data);
               if (res.data.status === 'UNREAD') {
                   api.patch(`/inbox/${id}/read`); // Auto mark read
               }
           })
           .finally(() => setLoading(false));
    }
  }, [id]);

  const handleDelete = async () => {
     if(!confirm('Delete?')) return;
     await api.delete(`/inbox/${id}`);
     router.push('/inbox');
  };

  if (loading) return <AdminLayout><LoadingOverlay visible /></AdminLayout>;
  if (!msg) return <AdminLayout><Text>Message not found</Text></AdminLayout>;

  return (
    <AdminLayout>
      <Button variant="subtle" leftSection={<IconArrowLeft size={16} />} component={Link} href="/inbox" mb="lg">Back</Button>

      <Paper withBorder p="xl" radius="md">
         <Group justify="space-between" mb="md">
            <Group>
               <Title order={3}>{msg.subject}</Title>
               <Badge>{msg.status}</Badge>
            </Group>
            <Button color="red" variant="outline" leftSection={<IconTrash size={16}/>} onClick={handleDelete}>Delete</Button>
         </Group>
         
         <Group mb="xl" gap="xs">
            <IconMail size={16} color="gray" />
            <Text fw={500}>{msg.name}</Text>
            <Text c="dimmed">&lt;{msg.email}&gt;</Text>
            <Text c="dimmed">•</Text>
            <Text c="dimmed">{new Date(msg.createdAt).toLocaleString()}</Text>
         </Group>

         <Divider mb="xl" />

         <Text style={{ whiteSpace: 'pre-wrap' }}>{msg.message}</Text>
         
         <Group mt={50}>
            <Button component="a" href={`mailto:${msg.email}?subject=Re: ${msg.subject}`} leftSection={<IconMail size={16} />}>
               Reply via Email
            </Button>
         </Group>
      </Paper>
    </AdminLayout>
  );
}
