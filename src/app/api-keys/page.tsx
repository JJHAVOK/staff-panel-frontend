'use client';

import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { 
  Title, Text, Button, Group, Table, Modal, TextInput, MultiSelect,
  ActionIcon, CopyButton, Tooltip, Stack, Paper, LoadingOverlay,
  Alert, Drawer, Code, Divider, Badge, ScrollArea, Accordion
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconTrash, IconCheck, IconCopy, IconKey, IconAlertCircle, IconBook, IconApi, IconPlus } from '@tabler/icons-react';
import api from '@/lib/api';
import { useDisclosure } from '@mantine/hooks';

interface ApiKey {
  id: string;
  name: string;
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  permissions: string[];
}

interface NewApiKey extends ApiKey {
  key: string;
}

const PERMISSION_OPTIONS = [
  { group: 'CRM', items: [
      { value: 'crm:read', label: 'Read Contacts & Orgs' },
      { value: 'crm:manage', label: 'Create/Edit Contacts' }
  ]},
  { group: 'E-Commerce', items: [
      { value: 'ecommerce:orders:read', label: 'Read Orders' },
      { value: 'ecommerce:orders:create', label: 'Create Orders' },
      { value: 'ecommerce:products:read', label: 'Read Products' },
      { value: 'ecommerce:products:update', label: 'Update Inventory' }
  ]},
  { group: 'Helpdesk', items: [
      { value: 'helpdesk:read', label: 'Read Tickets' },
      { value: 'helpdesk:create', label: 'Open Ticket' },
      { value: 'helpdesk:reply', label: 'Reply to Ticket' }
  ]}
];

// Flatten for MultiSelect
const FLATTENED_PERMISSIONS = PERMISSION_OPTIONS.flatMap(g => g.items);

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [createOpened, { open: openCreate, close: closeCreate }] = useDisclosure(false);
  const [docsOpened, { open: openDocs, close: closeDocs }] = useDisclosure(false);
  const [newKeyModalOpened, setNewKeyModalOpened] = useState(false);
  
  const [newKey, setNewKey] = useState<NewApiKey | null>(null);
  const [error, setError] = useState<string | null>(null);

  const form = useForm({
    initialValues: { name: '', permissions: [] as string[], expiresAt: '' },
    validate: {
      name: (v) => (v.trim().length < 2 ? 'Name is too short' : null),
      permissions: (v) => (v.length === 0 ? 'Select at least one permission' : null),
    },
  });

  const fetchKeys = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api-keys');
      setKeys(response.data);
    } catch (err: any) {
      setError(err.response?.status === 403 ? 'Access Denied' : 'Failed to fetch keys');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchKeys(); }, []);

  const handleSubmit = async (values: typeof form.values) => {
    try {
      const response = await api.post('/api-keys', values);
      setNewKey(response.data);
      setNewKeyModalOpened(true);
      closeCreate();
      form.reset();
      fetchKeys();
      notifications.show({ title: 'Success', message: 'API Key created.', color: 'green' });
    } catch (error) {
      notifications.show({ title: 'Error', message: 'Could not create key.', color: 'red' });
    }
  };

  const handleRevoke = async (id: string) => {
    if (confirm('Revoke this key? This action is permanent.')) {
      try {
        await api.delete(`/api-keys/${id}`);
        notifications.show({ title: 'Revoked', message: 'Key deleted.', color: 'green' });
        fetchKeys();
      } catch (error) {
        notifications.show({ title: 'Error', message: 'Could not revoke key.', color: 'red' });
      }
    }
  };

  const rows = keys.map((key) => (
    <Table.Tr key={key.id}>
      <Table.Td fw={500}>{key.name}</Table.Td>
      <Table.Td>
          <Group gap={4}>
            {key.permissions.slice(0, 2).map(p => <Badge key={p} size="sm" variant="outline">{p}</Badge>)}
            {key.permissions.length > 2 && <Badge size="sm" variant="outline">+{key.permissions.length - 2}</Badge>}
          </Group>
      </Table.Td>
      <Table.Td>{new Date(key.createdAt).toLocaleDateString()}</Table.Td>
      <Table.Td>{key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleDateString() : 'Never'}</Table.Td>
      <Table.Td>
        <ActionIcon color="red" variant="subtle" onClick={() => handleRevoke(key.id)}><IconTrash size={16} /></ActionIcon>
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <AdminLayout>
      <Group justify="space-between" mb="xl">
        <Group>
            <IconKey size={32} stroke={1.5} />
            <div>
                <Group>
                    <Title order={2}>API Access</Title>
                    <Button variant="light" size="xs" leftSection={<IconBook size={14}/>} onClick={openDocs}>Documentation</Button>
                </Group>
                <Text c="dimmed">Manage external access tokens.</Text>
            </div>
        </Group>
        <Button leftSection={<IconPlus size={16}/>} onClick={openCreate}>Create Key</Button>
      </Group>

      {/* --- CREATE MODAL --- */}
      <Modal opened={createOpened} onClose={closeCreate} title="Generate New API Key">
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack>
            <TextInput label="Key Name" placeholder="e.g. Zapier Integration" required {...form.getInputProps('name')} />
            <MultiSelect 
                label="Permissions" 
                placeholder="Select scopes" 
                data={FLATTENED_PERMISSIONS} 
                searchable 
                required 
                {...form.getInputProps('permissions')} 
            />
            <TextInput label="Expires At (Optional)" type="date" {...form.getInputProps('expiresAt')} />
            <Button type="submit" mt="md">Generate Key</Button>
          </Stack>
        </form>
      </Modal>

      {/* --- SUCCESS MODAL --- */}
      <Modal opened={newKeyModalOpened} onClose={() => setNewKeyModalOpened(false)} title="API Key Generated" size="lg" centered>
        <Alert color="green" icon={<IconCheck/>} title="Success">This key will <b>never</b> be shown again.</Alert>
        <Group align="center" mt="md" p="md" bg="dark.8" style={{ borderRadius: 'var(--mantine-radius-md)' }}>
          <IconKey size={20} color="white" />
          <Code block style={{ flex: 1, fontSize: '1rem', fontWeight: 'bold' }}>{newKey?.key}</Code>
          <CopyButton value={newKey?.key || ''} timeout={2000}>
            {({ copied, copy }) => (
              <Tooltip label={copied ? 'Copied' : 'Copy'} withArrow>
                <ActionIcon color={copied ? 'teal' : 'gray'} onClick={copy} variant="subtle">
                  {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
                </ActionIcon>
              </Tooltip>
            )}
          </CopyButton>
        </Group>
        <Button fullWidth mt="lg" onClick={() => setNewKeyModalOpened(false)}>I have saved it</Button>
      </Modal>

      {/* --- DOCS DRAWER --- */}
      <Drawer opened={docsOpened} onClose={closeDocs} title="API Reference" position="right" size="xl">
         <ScrollArea h="calc(100vh - 80px)">
             <Stack gap="xl">
                 <Alert color="blue" icon={<IconApi/>}>
                     Requests must include the header: <Code>Authorization: Bearer &lt;KEY&gt;</Code>
                 </Alert>

                 <div>
                     <Title order={4} mb="sm">Available Endpoints</Title>
                     <Accordion variant="separated">
                         <Accordion.Item value="crm">
                             <Accordion.Control icon={<IconBook size={16}/>}>CRM Endpoints</Accordion.Control>
                             <Accordion.Panel>
                                 <Stack gap="xs">
                                     <Group><Badge>GET</Badge><Code>/crm/contacts</Code> List contacts</Group>
                                     <Group><Badge>POST</Badge><Code>/crm/contacts</Code> Create contact</Group>
                                     <Group><Badge>GET</Badge><Code>/crm/organizations</Code> List organizations</Group>
                                     <Text size="xs" c="dimmed">Required Scope: `crm:read` or `crm:manage`</Text>
                                 </Stack>
                             </Accordion.Panel>
                         </Accordion.Item>

                         <Accordion.Item value="store">
                             <Accordion.Control icon={<IconBook size={16}/>}>E-Commerce Endpoints</Accordion.Control>
                             <Accordion.Panel>
                                 <Stack gap="xs">
                                     <Group><Badge>GET</Badge><Code>/ecommerce/orders</Code> List orders</Group>
                                     <Group><Badge>POST</Badge><Code>/ecommerce/orders</Code> Create order</Group>
                                     <Group><Badge>GET</Badge><Code>/ecommerce/products</Code> List products</Group>
                                     <Text size="xs" c="dimmed">Required Scope: `ecommerce:orders:read`, `ecommerce:products:read`</Text>
                                 </Stack>
                             </Accordion.Panel>
                         </Accordion.Item>

                         <Accordion.Item value="support">
                             <Accordion.Control icon={<IconBook size={16}/>}>Support Endpoints</Accordion.Control>
                             <Accordion.Panel>
                                 <Stack gap="xs">
                                     <Group><Badge>GET</Badge><Code>/helpdesk/tickets</Code> List tickets</Group>
                                     <Group><Badge>POST</Badge><Code>/helpdesk/tickets</Code> Create ticket</Group>
                                     <Text size="xs" c="dimmed">Required Scope: `helpdesk:read`, `helpdesk:create`</Text>
                                 </Stack>
                             </Accordion.Panel>
                         </Accordion.Item>
                     </Accordion>
                 </div>
                 
                 <div>
                     <Title order={4} mb="sm">Permission Scopes</Title>
                     <Table withTableBorder>
                         <Table.Thead><Table.Tr><Table.Th>Scope</Table.Th><Table.Th>Description</Table.Th></Table.Tr></Table.Thead>
                         <Table.Tbody>
                             {FLATTENED_PERMISSIONS.map(p => (
                                 <Table.Tr key={p.value}>
                                     <Table.Td><Code>{p.value}</Code></Table.Td>
                                     <Table.Td>{p.label}</Table.Td>
                                 </Table.Tr>
                             ))}
                         </Table.Tbody>
                     </Table>
                 </div>
             </Stack>
         </ScrollArea>
      </Drawer>

      <Paper withBorder p="md" radius="md">
         <LoadingOverlay visible={loading} />
         <Table striped highlightOnHover>
            <Table.Thead>
                <Table.Tr><Table.Th>Name</Table.Th><Table.Th>Permissions</Table.Th><Table.Th>Created</Table.Th><Table.Th>Last Used</Table.Th><Table.Th>Revoke</Table.Th></Table.Tr>
            </Table.Thead>
            <Table.Tbody>
                {keys.map((key) => (
                    <Table.Tr key={key.id}>
                        <Table.Td fw={500}>{key.name}</Table.Td>
                        <Table.Td>
                            <Group gap={4}>
                                {key.permissions.slice(0, 2).map((p: string) => <Badge key={p} size="sm" variant="outline">{p}</Badge>)}
                                {key.permissions.length > 2 && <Badge size="sm" variant="outline">+{key.permissions.length - 2}</Badge>}
                            </Group>
                        </Table.Td>
                        <Table.Td>{new Date(key.createdAt).toLocaleDateString()}</Table.Td>
                        <Table.Td>
                            <ActionIcon color="red" variant="subtle" onClick={() => handleRevoke(key.id)}>
                                <IconTrash size={16} />
                            </ActionIcon>
                        </Table.Td>
                    </Table.Tr>
                ))}
                {!loading && keys.length === 0 && <Table.Tr><Table.Td colSpan={5} align="center"><Text c="dimmed">No active API keys found.</Text></Table.Td></Table.Tr>}
            </Table.Tbody>
         </Table>
      </Paper>
    </AdminLayout>
  );
}