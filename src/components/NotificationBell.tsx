'use client';
import { useState, useEffect } from 'react';
import { ActionIcon, Indicator, Menu, Text, ScrollArea, Group, Button, ThemeIcon } from '@mantine/core';
import { IconBell, IconInfoCircle } from '@tabler/icons-react';
import api from '@/lib/api';
import Link from 'next/link';

export function NotificationBell() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const unreadCount = notifications.filter(n => !n.readAt).length;

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data);
    } catch (e) {}
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000); // Poll every minute
    return () => clearInterval(interval);
  }, []);

  const markRead = async (id: string) => {
    await api.patch(`/notifications/${id}/read`);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, readAt: new Date() } : n));
  };

  const markAllRead = async () => {
    await api.post('/notifications/read-all');
    setNotifications(prev => prev.map(n => ({ ...n, readAt: new Date() })));
  };

  return (
    <Menu shadow="md" width={350} position="bottom-end">
      <Menu.Target>
        <Indicator label={unreadCount} size={16} disabled={unreadCount === 0} color="red" offset={4}>
          <ActionIcon variant="subtle" size="lg" radius="xl">
            <IconBell size={20} />
          </ActionIcon>
        </Indicator>
      </Menu.Target>
      <Menu.Dropdown>
        <Group justify="space-between" p="xs" pb={0}>
          <Text size="sm" fw={700}>Notifications</Text>
          {unreadCount > 0 && (
             <Button size="xs" variant="subtle" onClick={markAllRead}>Mark all read</Button>
          )}
        </Group>
        <ScrollArea.Autosize mah={300} type="scroll">
          {notifications.length === 0 ? (
             <Text c="dimmed" size="sm" ta="center" py="md">No notifications</Text>
          ) : (
             notifications.map(n => (
               <Menu.Item 
                 key={n.id} 
                 onClick={() => !n.readAt && markRead(n.id)}
                 style={{ opacity: n.readAt ? 0.6 : 1 }}
                 // --- 👇 FIX: Added 'as any' to silence TS error ---
                 component={(n.link ? Link : 'button') as any}
                 href={n.link || '#'}
               >
                 <Group wrap="nowrap" align="flex-start">
                   <ThemeIcon size="sm" variant="light" color={n.readAt ? 'gray' : 'blue'} mt={2}>
                     <IconInfoCircle size={12} />
                   </ThemeIcon>
                   <div>
                     <Text size="sm" fw={n.readAt ? 400 : 600}>{n.title}</Text>
                     <Text size="xs" c="dimmed" lineClamp={2}>{n.message}</Text>
                     <Text size="xs" c="dimmed" mt={4}>{new Date(n.createdAt).toLocaleString()}</Text>
                   </div>
                 </Group>
               </Menu.Item>
             ))
          )}
        </ScrollArea.Autosize>
      </Menu.Dropdown>
    </Menu>
  );
}