'use client';

import { useState, useEffect, useRef } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import {
  Title, Text, Button, Group, Paper, LoadingOverlay, Alert, Stack,
  Badge, ActionIcon, Textarea, Avatar, Divider, Drawer, Loader,
  SimpleGrid, ThemeIcon, rem, Menu, Grid, Checkbox, ScrollArea, Blockquote
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { 
  IconArrowLeft, IconSend, IconPaperclip, IconX, IconFile, 
  IconCheck, IconUser, IconTag, IconPackage, IconDots, 
  IconUserCircle, IconTrash, IconMail, IconFlame, IconLock, IconBan, 
  IconShieldLock, IconMoodSmile, IconMoodAngry, IconRobot, IconSparkles, IconCopy, IconThumbUp
} from '@tabler/icons-react';
import api from '@/lib/api';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/authStore';
import { io, Socket } from 'socket.io-client';

export default function TicketDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user, token } = useAuthStore();
  const userPermissions = user?.permissions || [];
  
  const canManage = userPermissions.includes('manage:helpdesk');
  const userId = user?.userId;

  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const viewport = useRef<HTMLDivElement>(null);
  
  // AI State
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<{sentiment: string, draft: string} | null>(null);
  
  const messageForm = useForm({ initialValues: { content: '', isInternal: false } });

  const fetchTicket = async () => {
    try {
      const res = await api.get(`/helpdesk/${id}`);
      setTicket(res.data);
      scrollToBottom();
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { if(id) fetchTicket(); }, [id]);

  useEffect(() => {
    if (!token || !id) return;
    const newSocket = io('https://api.pixelforgedeveloper.com/chat', {
        auth: { token: `Bearer ${token}` },
        transports: ['websocket']
    });
    newSocket.on('connect', () => { newSocket.emit('join_ticket', id); });
    
    newSocket.on('new_message', (msg: any) => {
        setTicket((prev: any) => {
            if (!prev) return prev;
            if (prev.messages.some((m: any) => m.id === msg.id)) return prev;
            return {
                ...prev,
                messages: [...prev.messages, {
                    ...msg,
                    staffUser: msg.sender === 'STAFF' ? { firstName: msg.senderName } : null,
                    isAi: msg.senderName === 'PixelMind AI'
                }]
            };
        });
        scrollToBottom();
    });
    
    // System Event Handler
    const handleSys = (content: string) => {
        setTicket((prev: any) => ({
            ...prev,
            messages: [...prev.messages, {
                id: 'sys-' + Date.now(),
                content,
                sender: 'SYSTEM',
                createdAt: new Date().toISOString()
            }]
        }));
        scrollToBottom();
    };
    newSocket.on('request_pin', () => handleSys('🔒 PIN Verification Requested'));

    setSocket(newSocket);
    return () => { newSocket.disconnect(); };
  }, [token, id]);

  const scrollToBottom = () => {
    setTimeout(() => viewport.current?.scrollTo({ top: viewport.current.scrollHeight, behavior: 'smooth' }), 100);
  };

  const isAssignedToMe = ticket?.assignedTo?.id === userId;
  const isUnassigned = !ticket?.assignedTo;
  const canReply = canManage || isAssignedToMe || isUnassigned; 

  const handleSendMessage = async (values: typeof messageForm.values) => {
    setUploading(true);
    try {
      const messageResponse = await api.post(`/helpdesk/${id}/messages`, values);
      notifications.show({ title: 'Sent', message: 'Message sent.', color: 'green' });
      messageForm.reset();
      setFiles([]);
    } catch (e) { notifications.show({ title: 'Error', message: 'Failed to send.', color: 'red' }); } finally { setUploading(false); }
  };

  const handleAskAi = async () => {
      setAiDrawerOpen(true);
      setAiLoading(true);
      setAiResult(null);
      try {
          const res = await api.post(`/ai/analyze/${id}`);
          if (res.data.error) throw new Error(res.data.error);
          setAiResult(res.data);
      } catch(e) {
          notifications.show({ title: 'AI Error', message: 'Could not generate analysis.', color: 'red' });
          setAiDrawerOpen(false);
      } finally {
          setAiLoading(false);
      }
  };

  const handleUseDraft = () => {
      if (aiResult?.draft) {
          messageForm.setFieldValue('content', aiResult.draft);
          setAiDrawerOpen(false);
      }
  };

  const requestPin = () => { 
      socket?.emit('request_pin', { ticketId: id }); 
      notifications.show({ title: 'Requested', message: 'User prompted.', color: 'blue' }); 
  };
  
  const requestResolution = () => {
      socket?.emit('request_resolution', { ticketId: id });
      notifications.show({ title: 'Prompt Sent', message: 'User asked to confirm resolution.', color: 'teal' });
  }

  // UPDATED: EMIT SOCKET EVENT ON CLOSE
  const handleStatusChange = async (status: string) => { 
      try { 
          await api.patch(`/helpdesk/${id}`, { status }); 
          fetchTicket(); 
          
          if (status === 'CLOSED' || status === 'RESOLVED') {
              socket?.emit('admin_close_ticket', { ticketId: id });
          }
      } catch (e) {} 
  };
  
  const handleAssignmentChange = async (assignedToId: string | null) => { try { await api.patch(`/helpdesk/${id}`, { assignedToId }); fetchTicket(); } catch (e) {} };
  const handleEscalate = async () => { try { await api.patch(`/helpdesk/${id}`, { isEscalated: !ticket.isEscalated }); fetchTicket(); } catch(e) {} };
  const handleDelete = async (type: 'SOFT' | 'HARD') => { if(!confirm('Sure?')) return; try { await api.delete(`/helpdesk/${id}?type=${type}`); router.push('/helpdesk'); } catch(e) {} };

  if (loading) return <AdminLayout><LoadingOverlay visible /></AdminLayout>;
  if (!ticket) return <AdminLayout><Alert color="red">Ticket not found</Alert></AdminLayout>;

  // Detect Sentiment
  const sentiment = ticket.sentiment || 'NEUTRAL'; 
  const sentimentColor = sentiment === 'HAPPY' || sentiment === 'POSITIVE' ? 'green' : sentiment === 'ANGRY' || sentiment === 'NEGATIVE' ? 'red' : 'gray';
  const SentimentIcon = sentiment === 'HAPPY' || sentiment === 'POSITIVE' ? IconMoodSmile : sentiment === 'ANGRY' || sentiment === 'NEGATIVE' ? IconMoodAngry : IconUser;

  return (
    <AdminLayout>
      <Group mb="lg" justify="space-between">
        <Button variant="subtle" leftSection={<IconArrowLeft size={16} />} component={Link} href="/helpdesk">Back to Tickets</Button>
        <Button variant="gradient" gradient={{ from: 'violet', to: 'indigo', deg: 90 }} leftSection={<IconSparkles size={16} />} onClick={handleAskAi}>
            Ask AI Assistant
        </Button>
      </Group>

      {/* --- AI DRAWER --- */}
      <Drawer opened={aiDrawerOpen} onClose={() => setAiDrawerOpen(false)} title="PixelMind Intelligence" position="right" size="md">
          {aiLoading ? (
              <Stack align="center" mt={50}><Loader type="bars" color="violet" /><Text c="dimmed">Analyzing conversation...</Text></Stack>
          ) : aiResult ? (
              <Stack>
                  <Paper withBorder p="md" bg="gray.0">
                      <Text size="xs" tt="uppercase" fw={700} c="dimmed">Customer Sentiment</Text>
                      <Group mt={5}>
                          {aiResult.sentiment === 'HAPPY' ? <IconMoodSmile color="green"/> : <IconMoodAngry color="red"/>}
                          <Text fw={700} size="lg">{aiResult.sentiment}</Text>
                      </Group>
                  </Paper>
                  <Blockquote color="violet" icon={<IconRobot size={20}/>} mt="sm">
                      {aiResult.draft}
                  </Blockquote>
                  <Button fullWidth onClick={handleUseDraft} leftSection={<IconCopy size={16}/>}>Use This Reply</Button>
              </Stack>
          ) : <Text>No data.</Text>}
      </Drawer>

      <Paper withBorder p="md" radius="md" mb="lg">
        <Group justify="space-between" mb="xs">
            <Group>
              <Title order={3}>{ticket.subject}</Title>
              {ticket.isEscalated && <Badge color="red" leftSection={<IconFlame size={12} />}>ESCALATED</Badge>}
              <Badge color={sentimentColor} variant="outline" leftSection={<SentimentIcon size={12} />}>
                  AI: {sentiment}
              </Badge>
            </Group>
            
            <Menu shadow="md" width={200}>
              <Menu.Target><Button variant="default" leftSection={<IconDots size={16} />}>Actions</Button></Menu.Target>
              <Menu.Dropdown>
                <Menu.Item onClick={() => handleStatusChange('RESOLVED')} leftSection={<IconCheck size={14} />}>Mark Resolved</Menu.Item>
                <Menu.Item onClick={() => handleStatusChange('CLOSED')} leftSection={<IconBan size={14} />}>Mark Closed</Menu.Item>
                <Menu.Divider />
                <Menu.Item onClick={handleEscalate} leftSection={<IconFlame size={14} />}>{ticket.isEscalated ? 'De-Escalate' : 'Escalate'}</Menu.Item>
                {(!isAssignedToMe && (canManage || isUnassigned)) && <Menu.Item leftSection={<IconUserCircle size={14}/>} onClick={() => handleAssignmentChange(userId || null)}>Assign to Me</Menu.Item>}
                <Menu.Divider />
                <Menu.Item color="red" leftSection={<IconTrash size={14} />} onClick={() => handleDelete('HARD')}>Delete</Menu.Item>
              </Menu.Dropdown>
            </Menu>
        </Group>
        <Group gap="xs"><Badge color={ticket.status === 'OPEN' ? 'blue' : 'gray'}>{ticket.status}</Badge><Text c="dimmed" size="sm">{ticket.requesterEmail}</Text></Group>
      </Paper>

      <Grid>
        <Grid.Col span={{ base: 12, md: 8 }}>
          <ScrollArea h={500} viewportRef={viewport} style={{ border: '1px solid #dee2e6', borderRadius: '8px', padding: '10px', background: 'var(--mantine-color-body)' }}>
            <Stack gap="md" mb="md">
              {ticket.messages.map((msg: any) => {
                const isMe = msg.staffUser?.email === user?.email;
                const isInternal = msg.isInternal;
                const isAi = msg.content.includes('🤖') || msg.senderName === 'PixelMind AI';
                const displayName = msg.senderName || msg.staffUser?.firstName || 'Staff';

                // System / Verified Messages
                if (msg.sender === 'SYSTEM' || msg.content.includes('Identity Verified')) {
                    return (
                        <Group key={msg.id} justify="center">
                            <Badge variant="light" color="green" size="lg" leftSection={<IconCheck size={12}/>}>
                                {msg.content}
                            </Badge>
                        </Group>
                    );
                }

                return (
                  <Group key={msg.id} justify={isAi ? 'center' : (isMe ? 'flex-end' : 'flex-start')} align="flex-start">
                    {!isMe && !isAi && <Avatar color="orange" radius="xl">{displayName[0]}</Avatar>}
                    <Paper 
                        withBorder p="sm" radius="md" 
                        bg={isAi ? 'violet.0' : (isInternal ? 'yellow.0' : (isMe ? 'blue.1' : 'gray.0'))}
                        style={{ maxWidth: '85%', borderColor: isAi ? 'violet' : undefined }}
                    >
                        {isInternal && !isAi && <Text size="xs" c="orange" fw={700}><IconLock size={10}/> INTERNAL</Text>}
                        {isAi && <Text size="xs" c="violet" fw={700}><IconRobot size={10}/> AI</Text>}
                        <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</Text>
                        <Text size="xs" c="dimmed" mt={4} ta="right">{new Date(msg.createdAt).toLocaleString()}</Text>
                    </Paper>
                    {(isMe || isAi) && <Avatar color={isAi ? 'violet' : 'blue'} radius="xl">{isAi ? <IconRobot size={14}/> : 'Me'}</Avatar>}
                  </Group>
                );
              })}
            </Stack>
          </ScrollArea>

          <Paper withBorder p="md" radius="md" mt="xl">
                <form onSubmit={messageForm.onSubmit(handleSendMessage)}>
                  <Stack gap="xs">
                    <Textarea placeholder="Reply..." minRows={3} {...messageForm.getInputProps('content')} disabled={uploading} />
                    <Group justify="space-between">
                        <Checkbox label="Internal Note" color="orange" {...messageForm.getInputProps('isInternal', { type: 'checkbox' })} />
                        <Button type="submit" rightSection={<IconSend size={16} />} disabled={uploading}>Send</Button>
                    </Group>
                  </Stack>
                </form>
          </Paper>
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 4 }}>
           <Paper withBorder p="md" radius="md" style={{ position: 'sticky', top: 20 }}>
             <Title order={4} mb="sm">Context</Title>
             <Divider />
             <Stack gap="xs" mt="sm">
                <Text fw={600} size="sm">Requester Info</Text>
                <Group gap="xs"><IconUser size={16} /> <Text size="sm">{ticket.requesterName}</Text></Group>
                <Group gap="xs"><IconMail size={16} /> <Text size="sm">{ticket.requesterEmail}</Text></Group>
                
                <Group grow>
                    <Button variant="light" color="violet" size="xs" onClick={requestPin} leftSection={<IconShieldLock size={14}/>}>Verify ID</Button>
                    <Button variant="light" color="teal" size="xs" onClick={requestResolution} leftSection={<IconThumbUp size={14}/>}>Confirm Resolve</Button>
                </Group>
                
                <Divider />
                <Text fw={600} size="sm">Associated Order</Text>
                {ticket.orderId ? (
                  <Button component={Link} href={`/ecommerce/orders/${ticket.orderId}`} size="xs" variant="light" leftSection={<IconPackage size={14}/>}>View Order</Button>
                ) : <Text c="dimmed" size="sm">No Order Linked</Text>}
             </Stack>
           </Paper>
        </Grid.Col>
      </Grid>
    </AdminLayout>
  );
}