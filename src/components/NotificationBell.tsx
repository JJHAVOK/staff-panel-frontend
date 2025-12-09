'use client';

import { useState, useEffect } from 'react';
import { Popover, Indicator, ActionIcon, ScrollArea, Stack, Text, Group, Button, Box, ThemeIcon } from '@mantine/core';
import { IconBell, IconCheck, IconInfoCircle, IconAlertTriangle, IconCircleCheck } from '@tabler/icons-react';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/authStore';
import { io } from 'socket.io-client'; // <-- Import

export function NotificationBell() {
  const router = useRouter();
  const { token } = useAuthStore();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [opened, setOpened] = useState(false);

  const fetchNotifs = () => {
    api.get('/notifications').then(res => setNotifications(res.data)).catch(() => {});
  };

  useEffect(() => {
    // 1. Initial Fetch
    fetchNotifs();
    
    if (!token) return;

    // 2. Connect WebSocket
    const socket = io('https://api.pixelforgedeveloper.com', {
        auth: { token: `Bearer ${token}` }
    });

    // 3. Listen for events
    socket.on('notification', (newNotif) => {
        // Add to top of list
        setNotifications(prev => [newNotif, ...prev]);
    });

    return () => {
        socket.disconnect();
    };
  }, [token]);

  const unreadCount = notifications.filter(n => !n.readAt).length;

  const handleMarkRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
        await api.patch(`/notifications/${id}/read`);
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, readAt: new Date() } : n));
    } catch(e) {}
  };

  const handleMarkAllRead = async () => {
      const unread = notifications.filter(n => !n.readAt);
      for(const n of unread) {
          await api.patch(`/notifications/${n.id}/read`);
      }
      fetchNotifs();
  };

  const handleClick = (n: any) => {
      if (!n.readAt) handleMarkRead(n.id);
      if (n.link) {
          router.push(n.link);
          setOpened(false);
      }
  };

  const getIcon = (type: string) => {
      switch(type) {
          case 'SUCCESS': return <IconCircleCheck size={16} />;
          case 'WARNING': return <IconAlertTriangle size={16} />;
          default: return <IconInfoCircle size={16} />;
      }
  };
  
  const getColor = (type: string) => {
      switch(type) {
          case 'SUCCESS': return 'green';
          case 'WARNING': return 'yellow';
          case 'ERROR': return 'red';
          default: return 'blue';
      }
  };

  return (
    <Popover opened={opened} onChange={setOpened} width={350} position="bottom-end" shadow="md">
      <Popover.Target>
        <Indicator disabled={unreadCount === 0} color="red" size={16} offset={4} label={unreadCount > 0 ? unreadCount : null}>
          <ActionIcon variant="subtle" color="gray" size="lg" onClick={() => setOpened((o) => !o)}>
            <IconBell size={20} />
          </ActionIcon>
        </Indicator>
      </Popover.Target>

      <Popover.Dropdown p={0}>
        <Box p="sm" bg="gray.1" style={{ borderBottom: '1px solid var(--mantine-color-gray-3)' }}>
            <Group justify="space-between">
                <Text size="sm" fw={700}>Notifications</Text>
                {unreadCount > 0 && (
                    <Button variant="subtle" size="xs" onClick={handleMarkAllRead}>Mark all read</Button>
                )}
            </Group>
        </Box>

        <ScrollArea h={350}>
            {notifications.length === 0 ? (
                <Text c="dimmed" size="sm" ta="center" py="xl">No notifications</Text>
            ) : (
                <Stack gap={0}>
                    {notifications.map((n) => (
                        <Box 
                            key={n.id} 
                            p="sm" 
                            style={{ 
                                cursor: 'pointer', 
                                borderBottom: '1px solid var(--mantine-color-gray-2)',
                                backgroundColor: n.readAt ? 'transparent' : 'var(--mantine-color-blue-0)' 
                            }}
                            onClick={() => handleClick(n)}
                        >
                            <Group align="start" wrap="nowrap">
                                <ThemeIcon variant="light" size="md" radius="xl" color={getColor(n.type)}>
                                    {getIcon(n.type)}
                                </ThemeIcon>
                                <div style={{ flex: 1 }}>
                                    <Text size="sm" fw={n.readAt ? 500 : 700} lh={1.2} mb={4}>{n.title}</Text>
                                    <Text size="xs" c="dimmed" lh={1.4}>{n.message}</Text>
                                    <Group justify="space-between" mt={4}>
                                        <Text size="10px" c="dimmed">{new Date(n.createdAt).toLocaleString()}</Text>
                                        {!n.readAt && (
                                            <ActionIcon size="xs" variant="transparent" onClick={(e) => handleMarkRead(n.id, e)}>
                                                <IconCheck size={12} />
                                            </ActionIcon>
                                        )}
                                    </Group>
                                </div>
                            </Group>
                        </Box>
                    ))}
                </Stack>
            )}
        </ScrollArea>
      </Popover.Dropdown>
    </Popover>
  );
}