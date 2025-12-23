'use client';

import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { 
  Title, Button, Group, Table, Badge, Paper, LoadingOverlay, Modal, TextInput, Stack, Text, Code, ActionIcon, Select, Drawer, ScrollArea, Divider, Switch, Tooltip, Menu, Alert 
} from '@mantine/core';
import { 
  IconPlus, IconClock, IconTrash, IconRobot, IconBook, IconDots, IconEdit, IconPlayerPause, IconPlayerPlay, IconAlertTriangle, IconInfoCircle, IconCloudUpload 
} from '@tabler/icons-react';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useDisclosure } from '@mantine/hooks';
import api from '@/lib/api';

// --- CONFIGURATION PRESETS ---
const CRON_OPTIONS = [
    { value: '0 * * * *', label: 'Hourly (Top of every hour)' },
    { value: '30 * * * *', label: 'Hourly (Bottom of every hour)' },
    { value: '0 0 * * *', label: 'Daily: Midnight (00:00)' },
    { value: '0 7 * * *', label: 'Daily: Morning (07:00)' },
    { value: '0 9 * * *', label: 'Daily: Start Business (09:00)' },
    { value: '0 12 * * *', label: 'Daily: Lunch (12:00)' },
    { value: '0 17 * * *', label: 'Daily: End Business (17:00)' },
    { value: '0 0 * * 0', label: 'Weekly: Sunday Midnight' },
    { value: '0 9 * * 1', label: 'Weekly: Monday Morning' },
    { value: '0 0 1 * *', label: 'Monthly: 1st of Month' },
];

const EVENT_OPTIONS = [
    { value: 'RUN_BACKUP', label: 'System: Full Backup (DB + Uploads) to R2' }, // <--- NEW
    { value: 'RUN_CLEANUP_LOGS', label: 'Maintenance: Cleanup Old Logs' },
    { value: 'RUN_SLA_CHECK', label: 'Support: SLA Monitor (Auto-Escalate)' },
    { value: 'RUN_INVENTORY_CHECK', label: 'Store: Low Stock Alert' },
    { value: 'RUN_OVERDUE_INVOICES', label: 'Finance: Overdue Payment Reminders' },
    { value: 'RUN_ABANDONED_CART', label: 'Marketing: Abandoned Cart Recovery' },
    { value: 'RUN_LEAD_SCORING', label: 'AI: Lead Scoring & Sentiment Analysis' },
];

export default function CronPage() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modals & Drawers
  const [modalOpen, { open: openModal, close: closeModal }] = useDisclosure(false);
  const [docsOpen, { open: openDocs, close: closeDocs }] = useDisclosure(false);
  const [editingJob, setEditingJob] = useState<any>(null);

  const form = useForm({
    initialValues: { name: '', cron: '', triggerEvent: '', isActive: true },
    validate: { 
        name: (v) => v.length < 2 ? 'Required' : null, 
        cron: (v) => v.length < 5 ? 'Required' : null,
        triggerEvent: (v) => v.length < 2 ? 'Required' : null 
    }
  });

  const fetchJobs = async () => {
    setLoading(true);
    try { const res = await api.get('/scheduler'); setJobs(res.data); } catch(e) {} finally { setLoading(false); }
  };

  useEffect(() => { fetchJobs(); }, []);

  // --- HANDLERS ---

  const handleSave = async (values: typeof form.values) => {
    try {
        if (editingJob) {
            await api.patch(`/scheduler/${editingJob.id}`, values);
            notifications.show({ title: 'Updated', message: 'Job updated successfully', color: 'blue' });
        } else {
            await api.post('/scheduler', values);
            notifications.show({ title: 'Success', message: 'Job scheduled successfully', color: 'green' });
        }
        closeModal();
        form.reset();
        setEditingJob(null);
        fetchJobs();
    } catch(e) { notifications.show({ title: 'Error', message: 'Operation failed', color: 'red' }); }
  };

  const openCreate = () => {
      setEditingJob(null);
      form.reset();
      openModal();
  };

  const openEdit = (job: any) => {
      setEditingJob(job);
      form.setValues({
          name: job.name,
          cron: job.cron,
          triggerEvent: job.triggerEvent,
          isActive: job.isActive
      });
      openModal();
  };

  const handleToggleActive = async (e: React.MouseEvent, job: any) => {
      e.stopPropagation();
      try {
          await api.patch(`/scheduler/${job.id}`, { isActive: !job.isActive });
          notifications.show({ title: job.isActive ? 'Paused' : 'Resumed', message: `Job ${job.isActive ? 'deactivated' : 'activated'}.`, color: job.isActive ? 'gray' : 'green' });
          fetchJobs();
      } catch(e) { notifications.show({ title: 'Error', message: 'Failed to toggle status', color: 'red' }); }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      if(!confirm('Are you sure you want to PERMANENTLY delete this job? This cannot be undone.')) return;
      try {
          await api.delete(`/scheduler/${id}`);
          notifications.show({ title: 'Deleted', message: 'Job removed permanently', color: 'red' });
          fetchJobs();
      } catch(e) { notifications.show({ title: 'Error', message: 'Delete failed', color: 'red' }); }
  };
    
  const handleRunNow = async (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      try {
          await api.post(`/scheduler/${id}/run`);
          notifications.show({ title: 'Triggered', message: 'Job executed successfully', color: 'green' });
          fetchJobs();
      } catch(e) { notifications.show({ title: 'Error', message: 'Failed to run job', color: 'red' }); }
  };

  return (
    <AdminLayout>
      <Group justify="space-between" mb="xl">
         <Group>
             <IconClock size={32} stroke={1.5} />
             <Title order={2}>Cron Scheduler</Title>
             <Button variant="light" leftSection={<IconBook size={16}/>} onClick={openDocs}>Documentation</Button>
         </Group>
         <Button leftSection={<IconPlus size={16}/>} onClick={openCreate}>Schedule Job</Button>
      </Group>

      <Paper withBorder radius="md">
         <LoadingOverlay visible={loading} />
         <Table striped highlightOnHover>
            <Table.Thead><Table.Tr><Table.Th>Status</Table.Th><Table.Th>Job Name</Table.Th><Table.Th>Schedule</Table.Th><Table.Th>Trigger Event</Table.Th><Table.Th>Last Run</Table.Th><Table.Th align="right">Actions</Table.Th></Table.Tr></Table.Thead>
            <Table.Tbody>
                {jobs.length === 0 ? <Table.Tr><Table.Td colSpan={6} align="center" c="dimmed" p="xl">No automated jobs scheduled.</Table.Td></Table.Tr> : (
                    jobs.map(j => (
                        <Table.Tr key={j.id} style={{ cursor: 'pointer' }} onClick={() => openEdit(j)}>
                            <Table.Td>
                                <Badge color={j.isActive ? 'green' : 'gray'} variant="dot">
                                    {j.isActive ? 'Active' : 'Paused'}
                                </Badge>
                            </Table.Td>
                            <Table.Td fw={600}>{j.name}</Table.Td>
                            <Table.Td>
                                <Group gap="xs">
                                    <Code color="blue">{j.cron}</Code>
                                    <Text size="xs" c="dimmed">
                                        {CRON_OPTIONS.find(c => c.value === j.cron)?.label || 'Custom'}
                                    </Text>
                                </Group>
                            </Table.Td>
                            <Table.Td>
                                <Badge variant="outline" color={j.triggerEvent === 'RUN_BACKUP' ? 'violet' : 'blue'} leftSection={j.triggerEvent === 'RUN_BACKUP' ? <IconCloudUpload size={10}/> : <IconRobot size={10}/>}>
                                    {EVENT_OPTIONS.find(e => e.value === j.triggerEvent)?.label || j.triggerEvent}
                                </Badge>
                            </Table.Td>
                            <Table.Td>{j.lastRun ? new Date(j.lastRun).toLocaleString() : 'Never'}</Table.Td>
                            <Table.Td align="right" onClick={(e) => e.stopPropagation()}>
                                <Menu shadow="md" width={200}>
                                    <Menu.Target>
                                        <ActionIcon variant="subtle"><IconDots size={16} /></ActionIcon>
                                    </Menu.Target>
                                    <Menu.Dropdown>
                                        <Menu.Label>Manage</Menu.Label>
                                        <Menu.Item 
                                            leftSection={<IconPlayerPlay size={14}/>} 
                                            onClick={(e) => handleRunNow(e, j.id)}
                                        >
                                            Run Now
                                        </Menu.Item>
                                        <Menu.Item leftSection={<IconEdit size={14}/>} onClick={() => openEdit(j)}>
                                            Edit Details
                                        </Menu.Item>
                                        <Menu.Item 
                                            leftSection={j.isActive ? <IconPlayerPause size={14}/> : <IconPlayerPlay size={14}/>} 
                                            onClick={(e) => handleToggleActive(e, j)}
                                            color={j.isActive ? 'orange' : 'green'}
                                        >
                                            {j.isActive ? 'Pause (Soft Delete)' : 'Resume Job'}
                                        </Menu.Item>
                                        <Menu.Divider />
                                        <Menu.Label>Danger Zone</Menu.Label>
                                        <Menu.Item color="red" leftSection={<IconTrash size={14}/>} onClick={(e) => handleDelete(e, j.id)}>
                                            Delete Permanently
                                        </Menu.Item>
                                    </Menu.Dropdown>
                                </Menu>
                            </Table.Td>
                        </Table.Tr>
                    ))
                )}
            </Table.Tbody>
         </Table>
      </Paper>

      {/* --- EDIT/CREATE MODAL --- */}
      <Modal opened={modalOpen} onClose={closeModal} title={editingJob ? `Edit: ${editingJob.name}` : "Schedule New Job"} centered>
          <form onSubmit={form.onSubmit(handleSave)}>
              <Stack>
                  <TextInput 
                      label="Job Name" 
                      placeholder="e.g. Weekly Cleanup" 
                      required 
                      {...form.getInputProps('name')} 
                  />
                  
                  <Select 
                      label="Frequency" 
                      placeholder="Select a schedule..."
                      data={CRON_OPTIONS}
                      required
                      searchable
                      allowDeselect={false}
                      {...form.getInputProps('cron')}
                  />
                  <Text size="xs" c="dimmed" mt={-8}>You can also type a custom cron expression (e.g. "*/5 * * * *")</Text>

                  <Select 
                      label="System Event" 
                      placeholder="Select an action..."
                      data={EVENT_OPTIONS}
                      required
                      searchable
                      allowDeselect={false}
                      {...form.getInputProps('triggerEvent')}
                  />

                  <Switch 
                      label="Job Active" 
                      description="If disabled, the job will not run."
                      {...form.getInputProps('isActive', { type: 'checkbox' })}
                      mt="md"
                  />

                  <Button type="submit" fullWidth mt="md">{editingJob ? 'Save Changes' : 'Activate Schedule'}</Button>
              </Stack>
          </form>
      </Modal>

      {/* --- DOCUMENTATION DRAWER --- */}
      <Drawer opened={docsOpen} onClose={closeDocs} title="Cron System Documentation" position="right" size="xl">
          <ScrollArea h="calc(100vh - 80px)">
              <Stack gap="lg" p="md">
                  <Alert icon={<IconInfoCircle size={16}/>} title="System Overview" color="blue">
                      The PixelForge Scheduler executes internal system events at specific time intervals defined by the <b>Cron Expression</b>.
                  </Alert>

                  <div>
                      <Title order={4} mb="sm">1. Standard Cron Syntax</Title>
                      <Paper withBorder p="md" bg="gray.0">
                          <Code block fz="lg" mb="sm">
                              * * * * *
                              ┬    ┬    ┬    ┬    ┬
                              │    │    │    │    │
                              │    │    │    │    └── Day of Week (0 - 7) (0 or 7 is Sunday)
                              │    │    │    └─────── Month (1 - 12)
                              │    │    └──────────── Day of Month (1 - 31)
                              │    └───────────────── Hour (0 - 23)
                              └────────────────────── Minute (0 - 59)
                          </Code>
                          <Text size="sm" mt="sm"><b>Tip:</b> Use 0 for "At the start of". Example: <Code>0 9 * * *</Code> is 9:00 AM.</Text>
                      </Paper>
                  </div>

                  <div>
                      <Title order={4} mb="xs">2. Available System Events</Title>
                      <Table withTableBorder withColumnBorders>
                          <Table.Thead><Table.Tr><Table.Th>Event ID</Table.Th><Table.Th>Function</Table.Th></Table.Tr></Table.Thead>
                          <Table.Tbody>
                              <Table.Tr><Table.Td><Code>RUN_BACKUP</Code></Table.Td><Table.Td>Dumps Postgres DB, Zips Uploads, Uploads encrypted archive to Cloudflare R2.</Table.Td></Table.Tr>
                              <Table.Tr><Table.Td><Code>RUN_CLEANUP_LOGS</Code></Table.Td><Table.Td>Deletes Audit & Security logs older than 90 days to save database space.</Table.Td></Table.Tr>
                              <Table.Tr><Table.Td><Code>RUN_SLA_CHECK</Code></Table.Td><Table.Td>Scans for OPEN tickets with no activity for 24h. Marks them 'Escalated' and notifies admins.</Table.Td></Table.Tr>
                              <Table.Tr><Table.Td><Code>RUN_INVENTORY_CHECK</Code></Table.Td><Table.Td>Scans for products with Stock &lt; 5. Sends a "Low Stock" alert to admins.</Table.Td></Table.Tr>
                              <Table.Tr><Table.Td><Code>RUN_OVERDUE_INVOICES</Code></Table.Td><Table.Td>Finds pending orders older than 7 days. Sends a payment reminder email to the customer.</Table.Td></Table.Tr>
                              <Table.Tr><Table.Td><Code>RUN_ABANDONED_CART</Code></Table.Td><Table.Td>Checks for carts abandoned for &gt; 24h and emails recovery link (Marketing Module).</Table.Td></Table.Tr>
                              <Table.Tr><Table.Td><Code>RUN_LEAD_SCORING</Code></Table.Td><Table.Td>AI Engine: Updates Contact Lead Scores and Ticket Sentiment.</Table.Td></Table.Tr>
                          </Table.Tbody>
                      </Table>
                  </div>

                  <div>
                      <Title order={4} mb="xs">3. Common Schedule Examples</Title>
                      <Table withTableBorder>
                          <Table.Tbody>
                              <Table.Tr><Table.Td><Code>0 * * * *</Code></Table.Td><Table.Td>Hourly (On the dot)</Table.Td></Table.Tr>
                              <Table.Tr><Table.Td><Code>*/15 * * * *</Code></Table.Td><Table.Td>Every 15 Minutes</Table.Td></Table.Tr>
                              <Table.Tr><Table.Td><Code>0 9 * * *</Code></Table.Td><Table.Td>Daily at 9:00 AM</Table.Td></Table.Tr>
                              <Table.Tr><Table.Td><Code>0 0 * * 1</Code></Table.Td><Table.Td>Weekly on Monday (Midnight)</Table.Td></Table.Tr>
                              <Table.Tr><Table.Td><Code>0 0 1 * *</Code></Table.Td><Table.Td>Monthly on the 1st</Table.Td></Table.Tr>
                          </Table.Tbody>
                      </Table>
                  </div>

                  <Divider />
                  
                  <Alert icon={<IconAlertTriangle size={16}/>} title="Managing Jobs" color="orange">
                      <b>Pause:</b> Temporarily stops the job without deleting configuration. Use this for maintenance.<br/>
                      <b>Delete:</b> Permanently removes the job. History is not preserved.
                  </Alert>
              </Stack>
          </ScrollArea>
      </Drawer>
    </AdminLayout>
  );
}