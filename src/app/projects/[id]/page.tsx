'use client';

import { useState, useEffect, useMemo } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import {
  Title, Text, Button, Group, Paper, LoadingOverlay, Alert, Stack,
  Badge, ActionIcon, Modal, TextInput, Textarea, Select, NumberInput, Switch,
  Tabs, Grid, Card, Progress, ThemeIcon, Divider, Menu, TagsInput
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { 
  IconPlus, IconTrash, IconPencil, IconArrowLeft, IconEye, IconEyeOff, 
  IconLayoutKanban, IconChartPie, IconSettings, IconBuildingSkyscraper, 
  IconUser, IconReceipt2, IconClock, IconDots
} from '@tabler/icons-react';
import api from '@/lib/api';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

function InfoCard({ icon, label, value, subValue }: any) {
  return (
    <Paper withBorder p="md" radius="md" style={{ flex: 1 }}>
      <Group>
        <ThemeIcon size="xl" radius="md" variant="light" color="blue">
          {icon}
        </ThemeIcon>
        <div>
          <Text c="dimmed" tt="uppercase" fw={700} size="xs">{label}</Text>
          <Text fw={700} size="lg">{value || '-'}</Text>
          {subValue && <Text c="dimmed" size="xs">{subValue}</Text>}
        </div>
      </Group>
    </Paper>
  );
}

export default function ProjectDashboard() {
  const { id } = useParams();
  const router = useRouter();
  
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modals
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [columnModalOpen, setColumnModalOpen] = useState(false);
  const [activeColumnId, setActiveColumnId] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [editingColumn, setEditingColumn] = useState<any>(null);

  // View Mode
  const [viewMode, setViewMode] = useState<'admin' | 'client'>('admin');
  const [data, setData] = useState<string[]>(['Feature', 'Bug', 'Enhancement', 'Design', 'Urgent']);

  // Forms
  const taskForm = useForm({
    initialValues: { title: '', description: '', priority: 'Medium', estimatedHours: 0, isPublic: false, tags: [] as string[] },
    validate: { title: (val) => (val.length < 2 ? 'Title too short' : null) },
  });

  const columnForm = useForm({
    initialValues: { name: '', isPublic: true },
    validate: { name: (val) => (val.length < 2 ? 'Name required' : null) },
  });
  
  const settingsForm = useForm({
    initialValues: { name: '', description: '', status: '' },
  });

  // --- FETCH ---
  const fetchProject = async () => {
    try {
      const res = await api.get(`/projects/${id}`);
      setProject(res.data);
      
      // Init settings form
      settingsForm.setValues({
        name: res.data.name,
        description: res.data.description || '',
        status: res.data.status,
      });

      // Collect tags
      const usedTags = new Set<string>(data);
      res.data.columns.forEach((col: any) => {
        col.tasks.forEach((task: any) => {
          if (Array.isArray(task.tags)) task.tags.forEach((tag: string) => usedTags.add(tag));
        });
      });
      setData(Array.from(usedTags));

    } catch (e) {
      setError('Could not load project.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (id) fetchProject(); }, [id]);

  // --- CALCULATIONS ---
  const calculateStats = () => {
    if (!project) return { totalTasks: 0, totalHours: 0, estHours: 0 };
    let totalTasks = 0;
    let estHours = 0;
    
    project.columns.forEach((c: any) => {
      c.tasks.forEach((t: any) => {
        totalTasks++;
        estHours += (t.estimatedHours || 0);
      });
    });

    let totalHours = 0;
    if (project.timesheets) {
      project.timesheets.forEach((sheet: any) => {
        if (sheet.clockIn && sheet.clockOut) {
          const diff = new Date(sheet.clockOut).getTime() - new Date(sheet.clockIn).getTime();
          totalHours += diff / 3600000;
        }
      });
    }

    return { totalTasks, totalHours: Math.round(totalHours * 100) / 100, estHours };
  };
  const stats = calculateStats();

  // --- HANDLERS ---
  const onDragEnd = async (result: any) => {
    if (!result.destination) return;
    const { source, destination, draggableId } = result;
    const newColumns = [...project.columns];
    const sourceCol = newColumns.find(c => c.id === source.droppableId);
    const destCol = newColumns.find(c => c.id === destination.droppableId);
    const [movedTask] = sourceCol.tasks.splice(source.index, 1);
    if (source.droppableId === destination.droppableId) {
      sourceCol.tasks.splice(destination.index, 0, movedTask);
    } else {
      destCol.tasks.splice(destination.index, 0, movedTask);
    }
    setProject({ ...project, columns: newColumns });
    try {
      await api.patch(`/projects/tasks/${draggableId}`, { columnId: destination.droppableId, order: destination.index });
    } catch (e) { fetchProject(); }
  };

  const handleSaveTask = async (values: typeof taskForm.values) => {
    try {
      if (editingTask) await api.patch(`/projects/tasks/${editingTask.id}`, values);
      else await api.post(`/projects/columns/${activeColumnId}/tasks`, { ...values, order: 0 });
      setTaskModalOpen(false); fetchProject();
      notifications.show({ title: 'Success', message: 'Task saved.', color: 'green' });
    } catch (e) { notifications.show({ title: 'Error', message: 'Failed.', color: 'red' }); }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Delete task?')) return;
    try { await api.delete(`/projects/tasks/${taskId}`); fetchProject(); } catch (e) { notifications.show({ title: 'Error', message: 'Failed.', color: 'red' }); }
  };

  const handleSaveColumn = async (values: typeof columnForm.values) => {
    try {
      if (editingColumn) await api.patch(`/projects/columns/${editingColumn.id}`, values);
      else {
        const order = project.columns.length;
        await api.post(`/projects/${id}/columns`, { ...values, order });
      }
      setColumnModalOpen(false); fetchProject();
      notifications.show({ title: 'Success', message: 'Stage saved.', color: 'green' });
    } catch (e) { notifications.show({ title: 'Error', message: 'Failed.', color: 'red' }); }
  };

  const handleDeleteColumn = async (colId: string) => {
    if (!confirm('Delete stage? Tasks inside will be deleted.')) return;
    try { await api.delete(`/projects/columns/${colId}`); fetchProject(); } catch (e) { notifications.show({ title: 'Error', message: 'Failed.', color: 'red' }); }
  };
  
  const handleUpdateSettings = async (values: typeof settingsForm.values) => {
     try {
        await api.patch(`/projects/${id}`, values);
        notifications.show({ title: 'Updated', message: 'Project settings updated.', color: 'green' });
        fetchProject();
     } catch (e) { notifications.show({ title: 'Error', message: 'Update failed.', color: 'red' }); }
  };

  const handleDeleteProject = async () => {
     if (!confirm('PERMANENTLY delete this project? This cannot be undone.')) return;
     try {
        await api.delete(`/projects/${id}`);
        notifications.show({ title: 'Deleted', message: 'Project removed.', color: 'green' });
        router.push('/projects');
     } catch (e) { notifications.show({ title: 'Error', message: 'Delete failed.', color: 'red' }); }
  };

  const openTaskModal = (columnId: string, task: any = null) => {
    setActiveColumnId(columnId);
    setEditingTask(task);
    if (task) {
      taskForm.setValues({
        title: task.title, description: task.description || '',
        priority: task.priority, estimatedHours: task.estimatedHours || 0, isPublic: task.isPublic,
        tags: Array.isArray(task.tags) ? task.tags : [],
      });
    } else { taskForm.reset(); }
    setTaskModalOpen(true);
  };

  const openColumnModal = (col: any = null) => {
    setEditingColumn(col);
    if (col) columnForm.setValues({ name: col.name, isPublic: col.isPublic });
    else columnForm.reset();
    setColumnModalOpen(true);
  };

  if (loading) return <AdminLayout><LoadingOverlay visible /></AdminLayout>;
  if (error) return <AdminLayout><Alert color="red">{error}</Alert></AdminLayout>;

  return (
    <AdminLayout>
      {/* Task Modal */}
      <Modal opened={taskModalOpen} onClose={() => setTaskModalOpen(false)} title={editingTask ? 'Edit Task' : 'New Task'} size="lg">
        <form onSubmit={taskForm.onSubmit(handleSaveTask)}>
          <Stack>
            <TextInput label="Title" required {...taskForm.getInputProps('title')} />
            <Textarea label="Description" {...taskForm.getInputProps('description')} />
            <Group grow>
              <Select label="Priority" data={['Low', 'Medium', 'High', 'Critical']} {...taskForm.getInputProps('priority')} />
              <NumberInput label="Est. Hours" min={0} {...taskForm.getInputProps('estimatedHours')} />
            </Group>
            
            {/* --- 👇 REPLACED MultiSelect WITH TagsInput 👇 --- */}
            <TagsInput
              label="Tags"
              placeholder="Select or type new tags..."
              data={data}
              {...taskForm.getInputProps('tags')}
            />
            {/* --- 👆 END OF FIX 👆 --- */}

            <Switch label="Visible to Client" {...taskForm.getInputProps('isPublic', { type: 'checkbox' })} />
            <Button type="submit">Save</Button>
          </Stack>
        </form>
      </Modal>

      {/* Column Modal */}
      <Modal opened={columnModalOpen} onClose={() => setColumnModalOpen(false)} title={editingColumn ? 'Edit Stage' : 'New Stage'}>
        <form onSubmit={columnForm.onSubmit(handleSaveColumn)}>
          <Stack>
            <TextInput label="Stage Name" required {...columnForm.getInputProps('name')} />
            <Switch label="Visible to Client" {...columnForm.getInputProps('isPublic', { type: 'checkbox' })} />
            <Button type="submit">Save</Button>
          </Stack>
        </form>
      </Modal>

      <Group mb="lg" justify="space-between">
        <Group>
          <Button variant="subtle" leftSection={<IconArrowLeft size={16} />} component={Link} href="/projects">Back</Button>
          <div>
            <Title order={2}>{project.name}</Title>
            <Text size="sm" c="dimmed">Project Dashboard</Text>
          </div>
        </Group>
        <Group>
           <Text size="sm" fw={500}>View Mode:</Text>
           <Button.Group>
             <Button variant={viewMode === 'admin' ? 'filled' : 'default'} onClick={() => setViewMode('admin')} size="xs">Admin</Button>
             <Button variant={viewMode === 'client' ? 'filled' : 'default'} onClick={() => setViewMode('client')} size="xs" color="cyan" leftSection={<IconEye size={14} />}>Client Portal</Button>
           </Button.Group>
        </Group>
      </Group>

      <Tabs defaultValue="overview">
        <Tabs.List>
          <Tabs.Tab value="overview" leftSection={<IconChartPie size={14} />}>Overview</Tabs.Tab>
          <Tabs.Tab value="features" leftSection={<IconLayoutKanban size={14} />}>Features (Board)</Tabs.Tab>
          <Tabs.Tab value="settings" leftSection={<IconSettings size={14} />}>Settings</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="overview" pt="md">
          <Grid>
            <Grid.Col span={{ base: 12, md: 8 }}>
               <Group grow mb="md">
                 <InfoCard icon={<IconLayoutKanban />} label="Total Tasks" value={stats.totalTasks} />
                 <InfoCard icon={<IconClock />} label="Est. Hours" value={stats.estHours} />
                 <InfoCard icon={<IconClock />} label="Actual Hours" value={stats.totalHours} />
               </Group>
               <Paper withBorder p="md" radius="md" mb="md">
                 <Text fw={700} mb="xs">Project Progress (Hours Burned)</Text>
                 <Progress value={stats.estHours > 0 ? (stats.totalHours / stats.estHours) * 100 : 0} size="xl" radius="xl" striped animated />
               </Paper>
               <Paper withBorder p="md" radius="md">
                 <Title order={4} mb="sm">Description</Title>
                 <Text>{project.description || 'No description.'}</Text>
               </Paper>
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 4 }}>
               <Stack>
                 <Paper withBorder p="md" radius="md">
                   <Title order={5} mb="sm">Client</Title>
                   {project.organization ? (
                      <Group><IconBuildingSkyscraper size={20} color="gray" /><Text>{project.organization.name}</Text></Group>
                   ) : <Text c="dimmed">No Organization</Text>}
                   <Divider my="sm" />
                   {project.contact ? (
                      <Group><IconUser size={20} color="gray" /><Text>{project.contact.firstName} {project.contact.lastName}</Text></Group>
                   ) : <Text c="dimmed">No Contact</Text>}
                 </Paper>
                 <Paper withBorder p="md" radius="md">
                     <Title order={5} mb="sm">Status</Title>
                     <Badge size="xl" color={project.status === 'Active' ? 'blue' : project.status === 'Completed' ? 'green' : 'gray'}>{project.status}</Badge>
                 </Paper>
               </Stack>
            </Grid.Col>
          </Grid>
        </Tabs.Panel>

        <Tabs.Panel value="features" pt="md">
          <Group justify="flex-end" mb="md">
             <Button variant="default" leftSection={<IconPlus size={16} />} onClick={() => openColumnModal()}>Add Stage</Button>
          </Group>
          <DragDropContext onDragEnd={onDragEnd}>
            <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '1rem', minHeight: '60vh' }}>
              {project.columns.map((col: any) => {
                if (viewMode === 'client' && !col.isPublic) return null;
                return (
                  <Paper key={col.id} withBorder p="sm" radius="md" style={{ minWidth: 320, width: 320, background: '#f8f9fa', display: 'flex', flexDirection: 'column' }}>
                    <Group justify="space-between" mb="md">
                      <Group gap="xs">
                        <Text fw={700} size="sm" tt="uppercase" c="dimmed">{col.name}</Text>
                        <Badge size="xs" variant="light" color="gray">{col.tasks.length}</Badge>
                        {col.isPublic && <IconEye size={14} color="teal" />}
                      </Group>
                      <Menu shadow="md" width={200}>
                        <Menu.Target><ActionIcon size="sm" variant="subtle"><IconDots size={16} /></ActionIcon></Menu.Target>
                        <Menu.Dropdown>
                          <Menu.Item leftSection={<IconPlus size={14} />} onClick={() => openTaskModal(col.id)}>Add Task</Menu.Item>
                          <Menu.Item leftSection={<IconPencil size={14} />} onClick={() => openColumnModal(col)}>Edit Stage</Menu.Item>
                          <Menu.Divider />
                          <Menu.Item color="red" leftSection={<IconTrash size={14} />} onClick={() => handleDeleteColumn(col.id)}>Delete Stage</Menu.Item>
                        </Menu.Dropdown>
                      </Menu>
                    </Group>
                    <Droppable droppableId={col.id}>
                      {(provided) => (
                        <Stack ref={provided.innerRef} {...provided.droppableProps} style={{ flex: 1, minHeight: 100 }}>
                          {col.tasks.map((task: any, index: number) => {
                            if (viewMode === 'client' && !task.isPublic) return null;
                            return (
                              <Draggable key={task.id} draggableId={task.id} index={index} isDragDisabled={viewMode === 'client'}>
                                {(provided) => (
                                  <Paper ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} withBorder p="sm" radius="sm" shadow="xs" style={{ ...provided.draggableProps.style }}>
                                    <Group justify="space-between" mb={4} align="flex-start">
                                      <Text size="sm" fw={600} style={{ flex: 1, lineHeight: 1.3 }}>{task.title}</Text>
                                      {viewMode === 'admin' && (task.isPublic ? <IconEye size={14} color="teal" /> : <IconEyeOff size={14} color="gray" />)}
                                    </Group>
                                    {Array.isArray(task.tags) && task.tags.length > 0 && (
                                       <Group gap={4} mb={8}>{task.tags.map((t: string) => <Badge key={t} size="xs" variant="outline" color="gray">{t}</Badge>)}</Group>
                                    )}
                                    <Group justify="space-between" mt="xs">
                                      <Badge size="xs" variant="dot" color={task.priority === 'High' ? 'red' : 'blue'}>{task.priority}</Badge>
                                      {viewMode === 'admin' && (
                                        <Group gap={2}>
                                          <ActionIcon size="xs" variant="subtle" color="gray" onClick={() => openTaskModal(col.id, task)}><IconPencil size={12} /></ActionIcon>
                                          <ActionIcon size="xs" variant="subtle" color="red" onClick={() => handleDeleteTask(task.id)}><IconTrash size={12} /></ActionIcon>
                                        </Group>
                                      )}
                                    </Group>
                                  </Paper>
                                )}
                              </Draggable>
                            );
                          })}
                          {provided.placeholder}
                        </Stack>
                      )}
                    </Droppable>
                  </Paper>
                );
              })}
            </div>
          </DragDropContext>
        </Tabs.Panel>

        <Tabs.Panel value="settings" pt="md">
          <Paper withBorder p="md" radius="md">
            <Title order={4} mb="md">Project Settings</Title>
            <form onSubmit={settingsForm.onSubmit(handleUpdateSettings)}>
              <Stack>
                <TextInput label="Project Name" {...settingsForm.getInputProps('name')} />
                <Textarea label="Description" minRows={3} {...settingsForm.getInputProps('description')} />
                <Select 
                  label="Status" 
                  data={['Planning', 'Preparing', 'In Progress', 'Reviewing', 'Finalizing', 'Completed', 'Delivered', 'Sold', 'Active', 'Archived']} 
                  {...settingsForm.getInputProps('status')} 
                />
                <Group justify="flex-end">
                   <Button type="submit">Save Changes</Button>
                </Group>
              </Stack>
            </form>
            <Divider my="xl" />
            <Title order={4} c="red" mb="md">Danger Zone</Title>
            <Button color="red" variant="outline" onClick={handleDeleteProject}>Delete Project</Button>
          </Paper>
        </Tabs.Panel>
      </Tabs>
    </AdminLayout>
  );
}