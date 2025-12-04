'use client';

import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import {
  Title, Text, Button, Group, Paper, LoadingOverlay, Alert, Stack,
  Badge, ActionIcon, Textarea, Avatar, Select, Divider, Box,
  Modal, SimpleGrid, ThemeIcon, rem, Menu, Grid, Checkbox
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { 
  IconArrowLeft, IconSend, IconPaperclip, IconUpload, IconX, IconFile, 
  IconCheck, IconUser, IconTag, IconAlertCircle, IconPackage, IconDots, 
  IconUserCircle, IconTrash, IconPencil, IconMail, IconPlus, IconFlame, IconLock, IconBan
} from '@tabler/icons-react';
import api from '@/lib/api';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/authStore';
import { Dropzone, MIME_TYPES } from '@mantine/dropzone';

export default function TicketDetailPage() {
  const { id } = useParams();
  const { user } = useAuthStore();
  const userPermissions = user?.permissions || [];
  const canManage = userPermissions.includes('manage:helpdesk');
  const isManager = canManage; 

  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  
  const messageForm = useForm({ initialValues: { content: '', isInternal: false } });

  const fetchTicket = async () => {
    try {
      const res = await api.get(`/helpdesk/${id}`);
      setTicket(res.data);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { if(id) fetchTicket(); }, [id]);

  const isAssignedToOthers = ticket?.assignedToId && ticket?.assignedToId !== user?.userId;
  const canReply = isManager || !isAssignedToOthers; 

  const handleSendMessage = async (values: typeof messageForm.values) => {
    setUploading(true);
    try {
      const messageResponse = await api.post(`/helpdesk/${id}/messages`, { 
        content: values.content, 
        isInternal: values.isInternal 
      });
      const messageId = messageResponse.data.id;

      if (files.length > 0) {
        for (const file of files) {
          const formData = new FormData();
          formData.append('file', file);
          await api.post(`/documents/upload/ticket-message/${messageId}`, formData, {
            headers: { 'Content-Type': 'multipart/form-formdata' },
          });
        }
      }

      notifications.show({ title: 'Sent', message: 'Message sent.', color: 'green' });
      messageForm.reset();
      setFiles([]);
      fetchTicket();
    } catch (e) {
      notifications.show({ title: 'Error', message: 'Failed to send. Check assignment.', color: 'red' });
    } finally {
      setUploading(false);
    }
  };

  const handleStatusChange = async (status: string) => {
    try { await api.patch(`/helpdesk/${id}`, { status }); fetchTicket(); } catch (e) {}
  };
  
  const handleAssignmentChange = async (assignedToId: string | null) => {
    try { await api.patch(`/helpdesk/${id}`, { assignedToId }); fetchTicket(); } catch (e) { notifications.show({ title: 'Error', message: 'Assignment failed.', color: 'red' }); }
  };

  const handleEscalate = async () => {
     try { 
        await api.patch(`/helpdesk/${id}`, { isEscalated: !ticket.isEscalated }); 
        fetchTicket();
        notifications.show({ title: 'Updated', message: 'Escalation status changed.', color: 'blue' });
     } catch(e) {}
  };
  
  const handleDelete = async () => {
    if(!confirm('Delete ticket?')) return;
    // Assuming delete endpoint exists or handled via status
    try { await api.patch(`/helpdesk/${id}`, { status: 'CLOSED' }); notifications.show({ title: 'Closed', message: 'Ticket closed (soft delete).', color: 'green' }); } catch(e) {}
  };

  if (loading) return <AdminLayout><LoadingOverlay visible /></AdminLayout>;
  if (!ticket) return <AdminLayout><Alert color="red">Ticket not found</Alert></AdminLayout>;

  return (
    <AdminLayout>
      <Group mb="lg" justify="space-between">
        <Button variant="subtle" leftSection={<IconArrowLeft size={16} />} component={Link} href="/helpdesk">Back to Tickets</Button>
      </Group>

      <Paper withBorder p="md" radius="md" mb="lg">
        <Group justify="space-between" mb="xs">
           <Group>
              <Title order={3}>{ticket.subject}</Title>
              {ticket.isEscalated && <Badge color="red" leftSection={<IconFlame size={12} />}>ESCALATED</Badge>}
           </Group>
           
           {canManage && (
             <Menu shadow="md" width={200}>
               <Menu.Target>
                 <Button variant="default" leftSection={<IconDots size={16} />}>Actions</Button>
               </Menu.Target>
               <Menu.Dropdown>
                 <Menu.Label>Status</Menu.Label>
                 <Menu.Item onClick={() => handleStatusChange('IN_PROGRESS')}>Mark In Progress</Menu.Item>
                 <Menu.Item onClick={() => handleStatusChange('RESOLVED')} leftSection={<IconCheck size={14} />}>Mark Resolved</Menu.Item>
                 
                 {/* --- 👇 ADDED MISSING CLOSE OPTION 👇 --- */}
                 <Menu.Item onClick={() => handleStatusChange('CLOSED')} leftSection={<IconBan size={14} />}>Mark Closed</Menu.Item>
                 {/* --- 👆 END ADD 👆 --- */}
                 
                 <Menu.Divider />
                 <Menu.Label>Management</Menu.Label>
                 <Menu.Item onClick={handleEscalate} leftSection={<IconFlame size={14} />}>
                    {ticket.isEscalated ? 'De-Escalate' : 'Escalate Ticket'}
                 </Menu.Item>
                 <Menu.Item 
                   onClick={() => handleAssignmentChange(user?.userId ?? null)} 
                   leftSection={<IconUserCircle size={14} />}
                 >
                   Assign to Me
                 </Menu.Item>
                 <Menu.Item onClick={() => handleAssignmentChange(null)}>Unassign</Menu.Item>
                 <Menu.Divider />
                 <Menu.Item color="red" leftSection={<IconTrash size={14} />} onClick={handleDelete}>Delete Ticket</Menu.Item>
               </Menu.Dropdown>
             </Menu>
           )}
        </Group>
        
        <Group gap="xs">
           <Text c="dimmed" size="sm">Priority: {ticket.priority}</Text>
           <Text c="dimmed" size="sm">•</Text>
           <Text c="dimmed" size="sm">From: {ticket.requesterName} ({ticket.requesterEmail})</Text>
           <Text c="dimmed" size="sm">•</Text>
           <Text c="dimmed" size="sm">Status: <Badge color={ticket.status === 'OPEN' ? 'blue' : 'gray'}>{ticket.status}</Badge></Text>
           
           {/* --- 👇 IMPROVED AGENT VISIBILITY 👇 --- */}
           {ticket.assignedTo && (
              <>
                 <Text c="dimmed" size="sm">•</Text>
                 <Badge 
                    size="md" 
                    variant="filled" 
                    color="cyan" 
                    leftSection={<IconUserCircle size={14} />}
                 >
                    Agent: {ticket.assignedTo.firstName}
                 </Badge>
              </>
           )}
           {/* --- 👆 END IMPROVEMENT 👆 --- */}
        </Group>
      </Paper>

      <Grid>
        <Grid.Col span={{ base: 12, md: 8 }}>
          <Stack gap="md" mb="md">
            {ticket.messages.map((msg: any) => {
              const isMe = msg.staffUser?.email === user?.email;
              const isInternal = msg.isInternal;
              
              return (
                <Group key={msg.id} justify={isMe ? 'flex-end' : 'flex-start'} align="flex-start">
                  {!isMe && <Avatar color={!msg.staffUser ? 'blue' : 'orange'} radius="xl">{!msg.staffUser ? 'C' : 'S'}</Avatar>}
                  
                  <Paper 
                    withBorder 
                    p="sm" 
                    radius="md" 
                    bg={isInternal ? 'yellow.0' : isMe ? 'blue.1' : 'gray.0'}
                    style={{ maxWidth: '85%', borderColor: isInternal ? 'orange' : undefined }}
                  >
                    {isInternal && <Text size="xs" c="orange" fw={700} mb={4}><IconLock size={10}/> INTERNAL NOTE</Text>}
                    
                    <Text size="sm">{msg.content}</Text>
                    
                    {msg.documents && msg.documents.length > 0 && (
                        <SimpleGrid cols={3} spacing="xs" mt="sm">
                          {msg.documents.map((doc: any) => (
                            <Paper key={doc.id} withBorder p={4} style={{ cursor: 'pointer' }}>
                                <Group justify="space-between" gap={4}>
                                  <ThemeIcon variant="light" color="gray" size="sm"><IconPaperclip size={12}/></ThemeIcon>
                                  <Text size="xs" lineClamp={1}>{doc.name}</Text>
                                </Group>
                            </Paper>
                          ))}
                        </SimpleGrid>
                    )}

                    <Text size="xs" c="dimmed" mt={4} ta="right">
                       {msg.staffUser ? msg.staffUser.firstName : ticket.requesterName} • {new Date(msg.createdAt).toLocaleString()}
                    </Text>
                  </Paper>
                  {isMe && <Avatar color="blue" radius="xl">Me</Avatar>}
                </Group>
              );
            })}
          </Stack>

          <Paper withBorder p="md" radius="md" mt="xl" bg={!canReply ? 'gray.1' : undefined}>
            {!canReply ? (
               <Alert color="orange" icon={<IconLock size={16} />}>
                 This ticket is assigned to another agent. You cannot reply.
               </Alert>
            ) : (
                <form onSubmit={messageForm.onSubmit(handleSendMessage)}>
                  <Stack gap="xs">
                    {files.length > 0 && (
                        <Group mt="xs">
                          {files.map((file, index) => (
                            <Badge key={index} size="sm" variant="outline" rightSection={<IconX size={10} style={{cursor: 'pointer'}} onClick={() => setFiles(files.filter((_, i) => i !== index))} />}>
                              {file.name}
                            </Badge>
                          ))}
                        </Group>
                    )}
                    <Group align="flex-start" gap="xs">
                      <Stack gap={4} style={{ flex: 1 }}>
                         <Textarea 
                              placeholder="Type your reply..." 
                              minRows={3} 
                              {...messageForm.getInputProps('content')}
                              disabled={uploading}
                          />
                          <Checkbox 
                             label="Internal Note (Staff only)" 
                             size="xs" 
                             color="orange"
                             {...messageForm.getInputProps('isInternal', { type: 'checkbox' })} 
                          />
                      </Stack>

                      <Stack gap="xs">
                        <Button type="submit" rightSection={<IconSend size={16} />} disabled={uploading || !messageForm.values.content}>Send</Button>
                        <Dropzone
                          onDrop={setFiles}
                          onReject={() => notifications.show({ title: 'Error', message: 'File rejected', color: 'red' })}
                          maxSize={5 * 1024 ** 2}
                          accept={[MIME_TYPES.png, MIME_TYPES.jpeg, MIME_TYPES.pdf]}
                          style={{ height: 40, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed var(--mantine-color-gray-4)' }}
                          loading={uploading}
                        >
                          <IconPaperclip size={20} color="gray" />
                        </Dropzone>
                      </Stack>
                    </Group>
                  </Stack>
                </form>
            )}
          </Paper>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 4 }}>
           <Paper withBorder p="md" radius="md" style={{ position: 'sticky', top: 20 }}>
             <Title order={4} mb="sm">Context & Links</Title>
             <Divider />
             <Stack gap="xs" mt="sm">
                <Text fw={600} size="sm">Requester Info</Text>
                <Group gap="xs">
                   <IconUser size={16} /> <Text size="sm">{ticket.requesterName}</Text>
                </Group>
                <Group gap="xs">
                   <IconMail size={16} /> <Text size="sm">{ticket.requesterEmail}</Text>
                </Group>
                <Group gap="xs">
                   <IconTag size={16} /> <Text size="sm">ID: {ticket.requesterEmail.length > 10 ? ticket.requesterEmail.substring(0, 10) + '...' : 'N/A'}</Text>
                </Group>
                <Divider />
                <Text fw={600} size="sm">Associated Order</Text>
                {ticket.orderId ? (
                  <Button component={Link} href={`/ecommerce/orders/${ticket.orderId}`} size="xs" variant="light" leftSection={<IconPackage size={14}/>}>
                    View Order
                  </Button>
                ) : (
                  <Text c="dimmed" size="sm">No Order Linked</Text>
                )}
             </Stack>
           </Paper>
        </Grid.Col>
      </Grid>
    </AdminLayout>
  );
}