'use client';
import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { Title, Button, Group, Table, Modal, TextInput, Textarea, Select } from '@mantine/core';
import { useForm } from '@mantine/form';
import api from '@/lib/api';

export default function KnowledgeBase() {
  const [articles, setArticles] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [opened, setOpened] = useState(false);

  const form = useForm({
      initialValues: { title: '', slug: '', content: '', categoryId: '' }
  });

  const load = async () => {
      const [a, c] = await Promise.all([api.get('/knowledge-base/articles'), api.get('/knowledge-base/categories')]);
      setArticles(a.data);
      setCategories(c.data.map((x:any) => ({ value: x.id, label: x.name })));
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (values: typeof form.values) => {
      await api.post('/knowledge-base/articles', values);
      setOpened(false); load();
  };

  return (
    <AdminLayout>
      <Group justify="space-between" mb="lg"><Title>Knowledge Base</Title> <Button onClick={() => setOpened(true)}>New Article</Button></Group>
      <Table>
        <Table.Thead><Table.Tr><Table.Th>Title</Table.Th><Table.Th>Slug</Table.Th><Table.Th>Views</Table.Th></Table.Tr></Table.Thead>
        <Table.Tbody>{articles.map(a => <Table.Tr key={a.id}><Table.Td>{a.title}</Table.Td><Table.Td>{a.slug}</Table.Td><Table.Td>{a.views}</Table.Td></Table.Tr>)}</Table.Tbody>
      </Table>

      <Modal opened={opened} onClose={() => setOpened(false)} title="New Article">
          <form onSubmit={form.onSubmit(handleSubmit)}>
              <TextInput label="Title" {...form.getInputProps('title')} />
              <TextInput label="Slug" {...form.getInputProps('slug')} />
              <Select label="Category" data={categories} {...form.getInputProps('categoryId')} />
              <Textarea label="Content (Markdown)" minRows={5} {...form.getInputProps('content')} />
              <Button type="submit" mt="md">Save</Button>
          </form>
      </Modal>
    </AdminLayout>
  );
}
