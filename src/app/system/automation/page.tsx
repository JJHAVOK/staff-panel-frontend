'use client';

import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { Title, Button, Group, Table, Badge, Paper, LoadingOverlay, ActionIcon, Menu, Modal, Text } from '@mantine/core';
import { IconPlus, IconRobot, IconDots, IconTrash, IconPencil, IconHistory } from '@tabler/icons-react';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';
import { notifications } from '@mantine/notifications';

export default function AutomationPage() {
  const router = useRouter();
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Logs Modal
  const [logsOpen, setLogsOpen] = useState(false);
  const [currentLogs, setCurrentLogs] = useState<any[]>([]);

  const fetchWorkflows = async () => {
    setLoading(true);
    try {
        const res = await api.get('/automation');
        setWorkflows(res.data);
    } catch(e) { console.error(e); } 
    finally { setLoading(false); }
  };

  useEffect(() => { fetchWorkflows(); }, []);

  const handleDelete = async (id: string) => {
      if(!confirm('Delete this workflow?')) return;
      try {
          await api.delete(`/automation/${id}`);
          notifications.show({ title: 'Deleted', message: 'Workflow removed.', color: 'green' });
          fetchWorkflows();
      } catch(e) { notifications.show({ title: 'Error', message: 'Delete failed.', color: 'red' }); }
  };

  const handleViewLogs = async (id: string) => {
      // Assuming GET /automation/:id includes logs, or we fetch separate
      // For now, let's use what we have or add endpoint. 
      // Simplified: Just showing alert for now until we add log viewer endpoint
      alert("Log viewer coming in next update. Check console for now.");
  };

  const rows = workflows.map((wf) => (
    <Table.Tr key={wf.id}>
      <Table.Td fw={700}>{wf.name}</Table.Td>
      <Table.Td><Badge>{wf.triggerType}</Badge></Table.Td>
      <Table.Td>{wf.actions.length} Steps</Table.Td>
      <Table.Td>{wf.isActive ? <Badge color="green">Active</Badge> : <Badge color="gray">Paused</Badge>}</Table.Td>
      <Table.Td>
         <Menu shadow="md" width={200}>
            <Menu.Target><ActionIcon variant="subtle"><IconDots size={16}/></ActionIcon></Menu.Target>
            <Menu.Dropdown>
                <Menu.Item leftSection={<IconPencil size={14}/>} onClick={() => router.push(`/system/automation/editor/${wf.id}`)}>Edit</Menu.Item>
                <Menu.Divider />
                <Menu.Item color="red" leftSection={<IconTrash size={14}/>} onClick={() => handleDelete(wf.id)}>Delete</Menu.Item>
            </Menu.Dropdown>
         </Menu>
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <AdminLayout>
      <Group justify="space-between" mb="xl">
         <Group><IconRobot size={32}/><Title order={2}>Automation Workflows</Title></Group>
         <Button leftSection={<IconPlus size={16}/>} onClick={() => router.push('/system/automation/editor/new')}>Create Workflow</Button>
      </Group>

      <Paper withBorder p="md" radius="md">
         <LoadingOverlay visible={loading} />
         <Table striped highlightOnHover>
            <Table.Thead><Table.Tr><Table.Th>Name</Table.Th><Table.Th>Trigger</Table.Th><Table.Th>Steps</Table.Th><Table.Th>Status</Table.Th><Table.Th>Actions</Table.Th></Table.Tr></Table.Thead>
            <Table.Tbody>
                {workflows.length === 0 ? <Table.Tr><Table.Td colSpan={5} align="center">No workflows found.</Table.Td></Table.Tr> : rows}
            </Table.Tbody>
         </Table>
      </Paper>
    </AdminLayout>
  );
}