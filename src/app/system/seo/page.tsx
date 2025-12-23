'use client';

import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import {
  Title, Text, Group, Paper, Button, Table, ScrollArea, Drawer, Stack, TextInput, 
  Textarea, Switch, Badge, ActionIcon, Grid, Card, Divider, NumberInput, Tabs, TagsInput, Code
} from '@mantine/core';
import { 
    IconSearch, IconBrandGoogle, IconEdit, IconTrash, IconPlus, IconWorld, IconEye 
} from '@tabler/icons-react';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useDisclosure } from '@mantine/hooks';
import { useRouter } from 'next/navigation'; // 👈 Import Router
import { useAuthStore } from '@/lib/authStore'; // 👈 Import AuthStore
import api from '@/lib/api';

export default function SeoStudio() {
  const { user } = useAuthStore(); // 👈 THIS WAS MISSING
  const router = useRouter();      // 👈 THIS WAS MISSING
  
  const [data, setData] = useState<any[]>([]);
  const [opened, { open, close }] = useDisclosure(false);
  const [loading, setLoading] = useState(false);
    
  // 🔒 RBAC CHECK
  useEffect(() => {
      if (user && !user.permissions.includes('system:seo:manage')) { 
          router.replace('/');
      }
  }, [user, router]);

  // Form handling
  const form = useForm({
    initialValues: {
      route: '/',
      title: '',
      description: '',
      keywords: [],
      ogImage: '',
      noIndex: false,
      priority: 0.8
    },
  });

  const fetchData = async () => {
    try {
      const res = await api.get('/seo/admin/list');
      setData(res.data);
    } catch (e) {
      notifications.show({ title: 'Error', message: 'Failed to load SEO data', color: 'red' });
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleEdit = (item: any) => {
    form.setValues({
        route: item.route,
        title: item.title,
        description: item.description,
        keywords: item.keywords,
        ogImage: item.ogImage || '',
        noIndex: item.noIndex,
        priority: item.priority
    });
    open();
  };

  const handleCreate = () => {
    form.reset();
    open();
  };

  const handleSave = async () => {
    setLoading(true);
    try {
        await api.post('/seo/admin/save', form.values);
        notifications.show({ title: 'Saved', message: 'Metadata updated successfully.', color: 'green' });
        fetchData();
        close();
    } catch (e) {
        notifications.show({ title: 'Error', message: 'Save failed.', color: 'red' });
    } finally {
        setLoading(false);
    }
  };

  const handleDelete = async (route: string) => {
      if(!confirm('Are you sure? This will revert the page to default auto-generated tags.')) return;
      try {
          await api.delete(`/seo/admin/delete?route=${encodeURIComponent(route)}`);
          notifications.show({ title: 'Deleted', message: 'Override removed.', color: 'blue' });
          fetchData();
      } catch (e) { console.error(e); }
  };

  return (
    <AdminLayout>
      {/* --- DRAWER: THE EDITOR --- */}
      <Drawer opened={opened} onClose={close} title="SEO Metadata Editor" position="right" size="xl">
        <Grid gutter="xl">
            {/* LEFT: INPUTS */}
            <Grid.Col span={6}>
                <Stack>
                    <TextInput label="Route Path" placeholder="/store/products/1" description="The URL path to override." required {...form.getInputProps('route')} />
                    <TextInput label="Page Title" placeholder="PixelForge - Best Web Dev" data-autofocus required {...form.getInputProps('title')} />
                    <Textarea label="Meta Description" placeholder="Summarize the page content..." minRows={3} {...form.getInputProps('description')} />
                    <TagsInput label="Keywords" placeholder="Press Enter to add tag" {...form.getInputProps('keywords')} />
                    
                    <Divider label="Advanced" />
                    
                    <TextInput label="Open Graph Image URL" placeholder="https://..." {...form.getInputProps('ogImage')} />
                    <NumberInput label="Sitemap Priority (0.0 - 1.0)" step={0.1} min={0} max={1} {...form.getInputProps('priority')} />
                    <Switch label="Hide from Google (noindex)" {...form.getInputProps('noIndex', { type: 'checkbox' })} />
                    
                    <Button fullWidth onClick={handleSave} loading={loading} mt="md">Save Metadata</Button>
                </Stack>
            </Grid.Col>

            {/* RIGHT: LIVE PREVIEW */}
            <Grid.Col span={6}>
                <Title order={5} mb="md">Live Search Preview</Title>
                
                {/* GOOGLE PREVIEW */}
                <Paper withBorder p="md" radius="md" bg="white">
                    <Group mb={5} gap={5}>
                        <div style={{ padding: 6, borderRadius: '50%', background: '#f1f3f4' }}>
                            <IconWorld size={14} color="#555" />
                        </div>
                        <Stack gap={0}>
                            <Text size="xs" c="dimmed">pixelforgedeveloper.com</Text>
                            <Text size="xs" c="dimmed">https://pixelforgedeveloper.com{form.values.route}</Text>
                        </Stack>
                    </Group>
                    <Text size="lg" c="#1a0dab" style={{ lineHeight: 1.2, cursor: 'pointer' }} td="hover">
                        {form.values.title || 'Page Title Placeholder'}
                    </Text>
                    <Text size="sm" c="#4d5156" mt={4} lineClamp={2}>
                        {form.values.description || 'This is how your description will appear in search results. Keep it punchy and relevant to improve CTR.'}
                    </Text>
                </Paper>

                <Title order={5} mt="xl" mb="md">Social Share Preview</Title>
                
                {/* SOCIAL CARD PREVIEW */}
                <Card withBorder radius="md" padding="0">
                    <div style={{ 
                        height: 140, 
                        background: form.values.ogImage ? `url(${form.values.ogImage}) center/cover` : '#e9ecef', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center' 
                    }}>
                        {!form.values.ogImage && <Text c="dimmed">No Image Set</Text>}
                    </div>
                    <Stack gap={5} p="md" bg="#f0f2f5">
                        <Text size="xs" tt="uppercase" c="dimmed">PIXELFORGEDEVELOPER.COM</Text>
                        <Text fw={700} lineClamp={1}>{form.values.title}</Text>
                        <Text size="sm" c="dimmed" lineClamp={1}>{form.values.description}</Text>
                    </Stack>
                </Card>

            </Grid.Col>
        </Grid>
      </Drawer>

      {/* --- MAIN PAGE --- */}
      <Group justify="space-between" mb="xl">
        <Group>
            <IconSearch size={32} stroke={1.5} />
            <div>
                <Title order={2}>SEO Studio</Title>
                <Text c="dimmed">Manage search engine visibility and social appearance.</Text>
            </div>
        </Group>
        <Button leftSection={<IconPlus size={16}/>} onClick={handleCreate}>New Override</Button>
      </Group>

      <Paper withBorder radius="md">
          <ScrollArea>
            <Table verticalSpacing="sm">
                <Table.Thead>
                    <Table.Tr>
                        <Table.Th>Route</Table.Th>
                        <Table.Th>Title Tag</Table.Th>
                        <Table.Th>Priority</Table.Th>
                        <Table.Th>Status</Table.Th>
                        <Table.Th>Actions</Table.Th>
                    </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                    {data.length === 0 && (
                        <Table.Tr><Table.Td colSpan={5} align="center"><Text c="dimmed" py="xl">No custom overrides defined yet.</Text></Table.Td></Table.Tr>
                    )}
                    {data.map((item) => (
                        <Table.Tr key={item.id}>
                            <Table.Td><Code>{item.route}</Code></Table.Td>
                            <Table.Td style={{ maxWidth: 300 }}><Text truncate>{item.title}</Text></Table.Td>
                            <Table.Td>{item.priority}</Table.Td>
                            <Table.Td>
                                {item.noIndex ? <Badge color="red">Hidden</Badge> : <Badge color="green">Indexed</Badge>}
                            </Table.Td>
                            <Table.Td>
                                <Group gap="xs">
                                    <ActionIcon variant="light" onClick={() => handleEdit(item)}><IconEdit size={16}/></ActionIcon>
                                    <ActionIcon variant="light" color="red" onClick={() => handleDelete(item.route)}><IconTrash size={16}/></ActionIcon>
                                </Group>
                            </Table.Td>
                        </Table.Tr>
                    ))}
                </Table.Tbody>
            </Table>
          </ScrollArea>
      </Paper>
    </AdminLayout>
  );
}