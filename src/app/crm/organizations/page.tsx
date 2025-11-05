'use client';

import { AdminLayout } from '@/components/AdminLayout';
import api from '@/lib/api';
import {
  Title, Alert, Table, LoadingOverlay, Paper, Text, Badge, Button,
  Group, Modal, TextInput, Stack, Tabs, Select,
  ActionIcon, Tooltip, rem,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import { IconAlertCircle, IconPlus, IconPencil, IconTrash } from '@tabler/icons-react';
import { useEffect, useState, useCallback } from 'react';
import { notifications } from '@mantine/notifications';
import { useAuthStore } from '@/lib/authStore';
import { modals } from '@mantine/modals';

// --- Data Structures ---
interface Organization {
  id: string;
  name: string;
  industry: string | null;
  website: string | null;
  phone: string | null;
  address: string | null;
  _count: {
    contacts: number;
    opportunities: number;
  };
}

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  title: string | null;
  organization: { id: string; name: string } | null;
}

interface OrgSelectItem {
  value: string;
  label: string;
}
// --- End Data Structures ---

export default function CrmPage() {
  // --- States ---
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [orgSelect, setOrgSelect] = useState<OrgSelectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuthStore();

  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);

  // --- Modals and Forms ---
  const [orgCreateModal, { open: openOrgCreate, close: closeOrgCreate }] = useDisclosure(false);
  const [contactModalOpened, { open: openContact, close: closeContact }] = useDisclosure(false);
  const [orgEditModal, { open: openOrgEdit, close: closeOrgEdit }] = useDisclosure(false);

  const orgForm = useForm({
    initialValues: { name: '', industry: '', website: '', phone: '', address: '' },
    validate: {
      name: (val) => (val.trim().length > 0 ? null : 'Name is required'),
      website: (val) => (val === '' || new RegExp('^https?://').test(val) ? null : 'Website must start with http:// or https://'),
    },
  });

  const contactForm = useForm({
    initialValues: { firstName: '', lastName: '', email: '', title: '', phone: '', organizationId: '' },
    validate: {
      firstName: (val) => (val.trim().length > 0 ? null : 'First name is required'),
      lastName: (val) => (val.trim().length > 0 ? null : 'Last name is required'),
      email: (val) => (/^\S+@\S+$/.test(val) ? null : 'Invalid email'),
    },
  });

  const editOrgForm = useForm({
    initialValues: { name: '', industry: '', website: '', phone: '', address: '' },
    validate: {
      name: (val) => (val.trim().length > 0 ? null : 'Name is required'),
      website: (val) => (val === '' || new RegExp('^https?://').test(val) ? null : 'Website must start with http:// or https://'),
    },
  });

  // --- THIS FUNCTION IS NOW FIXED ---
  const handleOpenEditOrg = (org: Organization) => {
    setSelectedOrg(org);
    // Set the values for the form
    const currentValues = {
      name: org.name,
      industry: org.industry || '',
      website: org.website || '',
      phone: org.phone || '',
      address: org.address || '',
    };
    editOrgForm.setValues(currentValues);
    // Set the "initial values" for dirty checking
    editOrgForm.setInitialValues(currentValues); 
    openOrgEdit();
  };

  const canCreate = user?.permissions.includes('crm:create');
  const canDelete = user?.permissions.includes('crm:delete');
  const canUpdate = user?.permissions.includes('crm:update');

  // --- Data Fetching ---
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [orgsResponse, contactsResponse] = await Promise.all([
        api.get('/crm/organizations'),
        api.get('/crm/contacts'),
      ]);

      setOrgs(orgsResponse.data);
      setContacts(contactsResponse.data);

      const orgSelectData = orgsResponse.data.map((org: Organization) => ({
        value: org.id,
        label: org.name,
      }));
      setOrgSelect(orgSelectData);

    } catch (err: any) {
      if (err.response?.status === 403) {
        setError('You do not have permission to view CRM data.');
      } else {
        setError('Failed to fetch data.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);
  // --- End Data Fetching ---

  // --- Submit Handlers ---
  const handleCreateOrg = async (values: typeof orgForm.values) => {
    try {
      await api.post('/crm/organizations', values);
      notifications.show({ title: 'Success', message: 'Organization created!', color: 'green' });
      closeOrgCreate();
      orgForm.reset();
      fetchData();
    } catch (err) {
      notifications.show({ title: 'Error', message: 'Failed to create organization.', color: 'red' });
    }
  };

  const handleCreateContact = async (values: typeof contactForm.values) => {
    try {
      await api.post('/crm/contacts', values);
      notifications.show({ title: 'Success', message: 'Contact created!', color: 'green' });
      closeContact();
      contactForm.reset();
      fetchData();
    } catch (err) {
      notifications.show({ title: 'Error', message: 'Failed to create contact.', color: 'red' });
    }
  };

  // --- THIS FUNCTION IS NOW FIXED ---
  const handleUpdateOrg = async (values: typeof editOrgForm.values) => {
    if (!selectedOrg) return;

    // 1. Manually calculate dirty values
    const dirtyValues: Partial<typeof values> = {};
    const initialValues = editOrgForm.getInitialValues();

    for (const key in values) {
      const typedKey = key as keyof typeof values;
      if (values[typedKey] !== initialValues[typedKey]) {
        dirtyValues[typedKey] = values[typedKey];
      }
    }

    // 2. Check if there's anything to update
    if (Object.keys(dirtyValues).length === 0) {
      closeOrgEdit(); // No changes, just close
      return;
    }

    try {
      // 3. Send ONLY the dirty values to the API
      await api.patch(`/crm/organizations/${selectedOrg.id}`, dirtyValues);

      notifications.show({ title: 'Success', message: 'Organization updated!', color: 'green' });
      closeOrgEdit();
      fetchData();
    } catch (err) {
      notifications.show({ title: 'Error', message: 'Failed to update organization.', color: 'red' });
    }
  };
  // --- END OF CORRECTED FUNCTION ---

  const openDeleteOrgModal = (org: Organization) => {
    modals.openConfirmModal({
      title: 'Delete Organization',
      centered: true,
      children: (
        <Text size="sm">
          Are you sure you want to delete **{org.name}**? This action is irreversible.
        </Text>
      ),
      labels: { confirm: 'Delete', cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await api.delete(`/crm/organizations/${org.id}`);
          notifications.show({ title: 'Success', message: 'Organization deleted.', color: 'green' });
          fetchData();
        } catch (err) {
          notifications.show({ title: 'Error', message: 'Failed to delete organization.', color: 'red' });
        }
      },
    });
  };
  // --- End Submit Handlers ---

  // --- Table Rows ---
  const orgRows = orgs.map((org) => (
    <Table.Tr key={org.id}>
      <Table.Td><Text fw={700}>{org.name}</Text></Table.Td>
      <Table.Td>{org.industry || 'N/A'}</Table.Td>
      <Table.Td>{org._count.contacts}</Table.Td>
      <Table.Td>{org._count.opportunities}</Table.Td>
      <Table.Td>
        <Group gap="xs" justify="flex-end">
          <Tooltip label="Edit Organization">
            <ActionIcon variant="default" onClick={() => handleOpenEditOrg(org)} disabled={!canUpdate}>
              <IconPencil style={{ width: rem(16), height: rem(16) }} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Delete Organization">
            <ActionIcon variant="default" color="red" onClick={() => openDeleteOrgModal(org)} disabled={!canDelete}>
              <IconTrash style={{ width: rem(16), height: rem(16) }} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Table.Td>
    </Table.Tr>
  ));

  const contactRows = contacts.map((contact) => (
    <Table.Tr key={contact.id}>
      <Table.Td><Text fw={700}>{contact.firstName} {contact.lastName}</Text></Table.Td>
      <Table.Td>{contact.email}</Table.Td>
      <Table.Td>{contact.title || 'N/A'}</Table.Td>
      <Table.Td>{contact.organization?.name || 'N/A'}</Table.Td>
      <Table.Td>
        <Group gap="xs" justify="flex-end">
          <Button variant="default" size="xs">View</Button>
        </Group>
      </Table.Td>
    </Table.Tr>
  ));
  // --- End Table Rows ---

  return (
    <AdminLayout>
      {/* --- Create Organization Modal --- */}
      <Modal opened={orgCreateModal} onClose={closeOrgCreate} title="Create Organization" centered>
        <form onSubmit={orgForm.onSubmit(handleCreateOrg)}>
          <Stack>
            <TextInput required label="Organization Name" {...orgForm.getInputProps('name')} />
            <TextInput label="Industry" {...orgForm.getInputProps('industry')} />
            <TextInput label="Website" {...orgForm.getInputProps('website')} />
            <TextInput label="Phone" {...orgForm.getInputProps('phone')} />
            <TextInput label="Address" {...orgForm.getInputProps('address')} />
            <Button type="submit" loading={orgForm.submitting} mt="md">Create</Button>
          </Stack>
        </form>
      </Modal>

      {/* --- Edit Organization Modal --- */}
      <Modal opened={orgEditModal} onClose={closeOrgEdit} title="Edit Organization" centered>
        <form onSubmit={editOrgForm.onSubmit(handleUpdateOrg)}>
          <Stack>
            <TextInput required label="Organization Name" {...editOrgForm.getInputProps('name')} />
            <TextInput label="Industry" {...editOrgForm.getInputProps('industry')} />
            <TextInput label="Website" {...editOrgForm.getInputProps('website')} />
            <TextInput label="Phone" {...editOrgForm.getInputProps('phone')} />
            <TextInput label="Address" {...editOrgForm.getInputProps('address')} />
            <Button type="submit" loading={editOrgForm.submitting} mt="md">Save Changes</Button>
          </Stack>
        </form>
      </Modal>

      {/* --- Create Contact Modal --- */}
      <Modal opened={contactModalOpened} onClose={closeContact} title="Create Contact" centered>
        <form onSubmit={contactForm.onSubmit(handleCreateContact)}>
          <Stack>
            <Group grow>
              <TextInput required label="First Name" {...contactForm.getInputProps('firstName')} />
              <TextInput required label="Last Name" {...contactForm.getInputProps('lastName')} />
            </Group>
            <TextInput required label="Email" {...contactForm.getInputProps('email')} />
            <TextInput label="Title" placeholder="e.g., CEO" {...contactForm.getInputProps('title')} />
            <TextInput label="Phone" {...contactForm.getInputProps('phone')} />
            <Select
              label="Organization"
              placeholder="Link to an organization"
              data={orgSelect}
              searchable
              clearable
              {...contactForm.getInputProps('organizationId')}
            />
            <Button type="submit" loading={contactForm.submitting} mt="md">Create</Button>
          </Stack>
        </form>
      </Modal>

      <Group justify="space-between" mb="xl">
        <div>
          <Title order={2}>CRM</Title>
          <Text c="dimmed">Manage all organizations and contacts.</Text>
        </div>
      </Group>

      <Tabs defaultValue="organizations">
        <Tabs.List>
          <Tabs.Tab value="organizations">Organizations</Tabs.Tab>
          <Tabs.Tab value="contacts">Contacts</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="organizations" pt="md">
          <Button
            leftSection={<IconPlus size={14} />}
            onClick={openOrgCreate}
            disabled={!canCreate}
            mb="md"
          >
            Create Organization
          </Button>
          <Paper withBorder radius="md" style={{ position: 'relative' }}>
            <LoadingOverlay visible={loading} />
            {error && <Alert icon={<IconAlertCircle size="1rem" />} title="Error" color="red">{error}</Alert>}
            {!error && !loading && (
              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Name</Table.Th>
                    <Table.Th>Industry</Table.Th>
                    <Table.Th>Contacts</Table.Th>
                    <Table.Th>Deals</Table.Th>
                    <Table.Th> </Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>{orgRows}</Table.Tbody>
              </Table>
            )}
          </Paper>
        </Tabs.Panel>

        <Tabs.Panel value="contacts" pt="md">
          <Button
            leftSection={<IconPlus size={14} />}
            onClick={openContact}
            disabled={!canCreate}
            mb="md"
          >
            Create Contact
          </Button>
          <Paper withBorder radius="md" style={{ position: 'relative' }}>
            <LoadingOverlay visible={loading} />
            {error && <Alert icon={<IconAlertCircle size="1rem" />} title="Error" color="red">{error}</Alert>}
            {!error && !loading && (
              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Name</Table.Th>
                    <Table.Th>Email</Table.Th>
                    <Table.Th>Title</Table.Th>
                    <Table.Th>Organization</Table.Th>
                    <Table.Th> </Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>{contactRows}</Table.Tbody>
              </Table>
            )}
          </Paper>
        </Tabs.Panel>
      </Tabs>
    </AdminLayout>
  );
}