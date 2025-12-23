'use client';

import { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import {
  Title, Button, Group, Table, Badge, Paper, LoadingOverlay, Alert, Modal, TextInput, Stack, Select, Menu, ActionIcon, Text, Avatar, PasswordInput, MultiSelect
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconPlus, IconTrash, IconPencil, IconDots, IconBan, IconCheck } from '@tabler/icons-react';
import api from '@/lib/api';
import { useDisclosure } from '@mantine/hooks';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/authStore';
import { modals } from '@mantine/modals';

export default function UsersPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const perms = user?.permissions || [];
  const canRead = perms.includes('user:read');
  const canCreate = perms.includes('user:create');
  
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpened, { open: openCreate, close: closeCreate }] = useDisclosure(false);
  
  const createForm = useForm({ initialValues: { email: '', firstName: '', lastName: '', password: '', roleIds: [] as string[] } });

  const fetchData = useCallback(async () => {
    if(!canRead) return;
    setLoading(true);
    try {
        const [u, r] = await Promise.all([api.get('/users'), api.get('/rbac/roles')]);
        setUsers(u.data);
        setRoles(r.data.map((x:any) => ({ value: x.id, label: x.name })));
    } catch(e) {} finally { setLoading(false); }
  }, [canRead]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreate = async (vals: typeof createForm.values) => {
      try { await api.post('/users', { ...vals, roleId: vals.roleIds[0] }); notifications.show({title:'Success',color:'green',message:'Created'}); closeCreate(); fetchData(); } catch(e){ notifications.show({title:'Error',color:'red',message:'Failed'}); }
  };

  const rows = users.map((u) => {
      const isOnline = u.lastActiveAt && (new Date().getTime() - new Date(u.lastActiveAt).getTime() < 5 * 60 * 1000);
      return (
        <Table.Tr key={u.id} onClick={() => router.push(`/users/${u.id}`)} style={{cursor:'pointer'}}>
            <Table.Td><Group gap="sm"><Avatar radius="xl" color="blue">{u.firstName?.[0]}</Avatar><div><Text size="sm" fw={500}>{u.firstName} {u.lastName}</Text><Text size="xs" c="dimmed">{u.email}</Text></div></Group></Table.Td>
            <Table.Td>{u.roles.map((r:any) => <Badge key={r.id} variant="light" mr={4}>{r.name}</Badge>)}</Table.Td>
            <Table.Td><Badge color={u.status==='ACTIVE'?'green':'red'}>{u.status}</Badge></Table.Td>
            {/* NEW STATUS COLUMN */}
            <Table.Td><Badge variant="dot" color={isOnline?'green':'gray'}>{isOnline?'Online':'Offline'}</Badge></Table.Td>
            <Table.Td onClick={e=>e.stopPropagation()}><Menu><Menu.Target><ActionIcon variant="subtle"><IconDots size={16}/></ActionIcon></Menu.Target><Menu.Dropdown><Menu.Item leftSection={<IconPencil size={14}/>}>Edit</Menu.Item></Menu.Dropdown></Menu></Table.Td>
        </Table.Tr>
      );
  });

  if(!canRead) return <AdminLayout><Alert color="red">Access Denied</Alert></AdminLayout>;

  return (
    <AdminLayout>
      <Modal opened={createOpened} onClose={closeCreate} title="Add Staff"><form onSubmit={createForm.onSubmit(handleCreate)}><Stack><TextInput label="Email" required {...createForm.getInputProps('email')}/><PasswordInput label="Password" required {...createForm.getInputProps('password')}/><MultiSelect label="Roles" data={roles} required {...createForm.getInputProps('roleIds')}/><Button type="submit">Create</Button></Stack></form></Modal>
      <Group justify="space-between" mb="xl"><Title order={2}>Staff Directory</Title>{canCreate && <Button leftSection={<IconPlus size={16}/>} onClick={openCreate}>Add Staff</Button>}</Group>
      <Paper withBorder radius="md"><LoadingOverlay visible={loading} /><Table striped highlightOnHover><Table.Thead><Table.Tr><Table.Th>User</Table.Th><Table.Th>Role</Table.Th><Table.Th>Status</Table.Th><Table.Th>Active</Table.Th><Table.Th>Actions</Table.Th></Table.Tr></Table.Thead><Table.Tbody>{rows}</Table.Tbody></Table></Paper>
    </AdminLayout>
  );
}