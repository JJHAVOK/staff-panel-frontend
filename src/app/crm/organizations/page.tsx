'use client';

import { AdminLayout } from '@/components/AdminLayout';
import api from '@/lib/api';
import {
  Title, Alert, Table, LoadingOverlay, Paper, Text, Badge, Button,
  Group, Modal, TextInput, Stack, Tabs, Select,
  ActionIcon, Tooltip, rem,
  Anchor, // <-- IMPORTED
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import { IconAlertCircle, IconPlus, IconPencil, IconTrash } from '@tabler/icons-react';
import { useEffect, useState, useCallback } from 'react';
import { notifications } from '@mantine/notifications';
import { useAuthStore } from '@/lib/authStore';
import { modals } from '@mantine/modals';
import Link from 'next/link'; // <-- IMPORTED

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
  phone: string | null; // <-- Added
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
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

  // --- Modals and Forms ---
  const [orgCreateModal, { open: openOrgCreate, close: closeOrgCreate }] = useDisclosure(false);
  const [contactModalOpened, { open: openContact, close: closeContact }] = useDisclosure(false); // Renamed
  const [orgEditModal, { open: openOrgEdit, close: closeOrgEdit }] = useDisclosure(false);
  const [contactEditModal, { open: openContactEdit, close: closeContactEdit }] = useDisclosure(false);

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

  const editContactForm = useForm({
    initialValues: {
      firstName: '', lastName: '', email: '', title: '', phone: '', organizationId: '',
    },
    validate: {
      firstName: (val) => (val.trim().length > 0 ? null : 'First name is required'),
      lastName: (val) => (val.trim().length > 0 ? null : 'Last name is required'),
      email: (val) => (/^\S+@\S+$/.test(val) ? null : 'Invalid email'),
    },
  });

  // --- handleOpenEditOrg (FIXED and WORKING) ---
  const handleOpenEditOrg = (org: Organization) => {
    setSelectedOrg(org);
    const currentValues = {
      name: org.name,
      industry: org.industry || '',
      website: org.website || '',
      phone: org.phone || '',
      address: org.address || '',
    };
    editOrgForm.setValues(currentValues);
    editOrgForm.setInitialValues(currentValues);
    openOrgEdit();
  };

  // --- Function to open Edit Contact Modal (WORKING) ---
  const handleOpenEditContact = (contact: Contact) => {
    setSelectedContact(contact);
    const currentValues = {
      firstName: contact.firstName,
      lastName: contact.lastName,
      email: contact.email,
      title: contact.title || '',
      phone: contact.phone || '',
      organizationId: contact.organization?.id || '',
    };
    editContactForm.setValues(currentValues);
    editContactForm.setInitialValues(currentValues);
    openContactEdit();
  };

  const canCreate = user?.permissions.includes('crm:create');
  const canDelete = user?.permissions.includes('crm:delete');
  const canUpdate = user?.permissions.includes('crm:update');

  // --- Data Fetching (Unchanged) ---
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

  // --- Submit Handlers (All Working) ---
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
  const handleUpdateOrg = async (values: typeof editOrgForm.values) => {
    if (!selectedOrg) return;
    const dirtyValues: Partial<typeof values> = {};
    const initialValues = editOrgForm.getInitialValues();
    for (const key in values) {
      const typedKey = key as keyof typeof values;
      if (values[typedKey] !== initialValues[typedKey]) {
        dirtyValues[typedKey] = values[typedKey];
      }
    }
    if (Object.keys(dirtyValues).length === 0) {
      closeOrgEdit();
      return;
    }
    try {
      await api.patch(`/crm/organizations/${selectedOrg.id}`, dirtyValues);
      notifications.show({ title: 'Success', message: 'Organization updated!', color: 'green' });
      closeOrgEdit();
      fetchData();
    } catch (err) {
      notifications.show({ title: 'Error', message: 'Failed to update organization.', color: 'red' });
    }
  };
  const openDeleteOrgModal = (org: Organization) => {
    modals.openConfirmModal({
      title: 'Delete Organization',
      centered: true,
      children: ( <Text size="sm"> Are you sure you want to delete **{org.name}**? This action is irreversible. </Text> ),
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
  const handleUpdateContact = async (values: typeof editContactForm.values) => {
    if (!selectedContact) return;
    const dirtyValues: Partial<typeof values> = {};
    const initialValues = editContactForm.getInitialValues();
    for (const key in values) {
      const typedKey = key as keyof typeof values;
      if (values[typedKey] !== initialValues[typedKey]) {
        dirtyValues[typedKey] = values[typedKey];
      }
    }
    if (Object.keys(dirtyValues).length === 0) {
      closeContactEdit();
      return;
    }
    if (Object.prototype.hasOwnProperty.call(dirtyValues, 'organizationId') && dirtyValues.organizationId === '') {
      dirtyValues.organizationId = null as any;
    }
    try {
      await api.patch(`/crm/contacts/${selectedContact.id}`, dirtyValues);
      notifications.show({ title: 'Success', message: 'Contact updated!', color: 'green' });
      closeContactEdit();
      fetchData();
    } catch (err) {
      notifications.show({ title: 'Error', message: 'Failed to update contact.', color: 'red' });
    }
  };
  const openDeleteContactModal = (contact: Contact) => {
    modals.openConfirmModal({
      title: 'Delete Contact',
      centered: true,
      children: ( <Text size="sm"> Are you sure you want to delete **{contact.firstName} {contact.lastName}**? </Text> ),
      labels: { confirm: 'Delete', cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await api.delete(`/crm/contacts/${contact.id}`);
          notifications.show({ title: 'Success', message: 'Contact deleted.', color: 'green' });
          fetchData();
        } catch (err) {
          notifications.show({ title: 'Error', message: 'Failed to delete contact.', color: 'red' });
        }
      },
    });
  };
  // --- End Submit Handlers ---

  // --- Table Rows ---
  const orgRows = orgs.map((org) => (
    <Table.Tr key={org.id}>
      <Table.Td>
        {/* --- FIX 1: Link Organization Name to Profile Page --- */}
        <Anchor component={Link} href={`/crm/organizations/${org.id}`} fw={700}>
          {org.name}
        </Anchor>
      </Table.Td>
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
      <Table.Td>
        {/* --- FIX 2: Link Contact Name to Profile Page --- */}
        <Anchor component={Link} href={`/crm/contacts/${contact.id}`} fw={700}>
          {contact.firstName} {contact.lastName}
        </Anchor>
      </Table.Td>
      <Table.Td>{contact.email}</Table.Td>
      <Table.Td>{contact.title || 'N/A'}</Table.Td>
      <Table.Td>{contact.organization?.name || 'N/A'}</Table.Td>
      <Table.Td>
        <Group gap="xs" justify="flex-end">
          <Tooltip label="Edit Contact">
            <ActionIcon variant="default" onClick={() => handleOpenEditContact(contact)} disabled={!canUpdate}>
              <IconPencil style={{ width: rem(16), height: rem(16) }} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Delete Contact">
            <ActionIcon variant="default" color="red" onClick={() => openDeleteContactModal(contact)} disabled={!canDelete}>
              <IconTrash style={{ width: rem(16), height: rem(16) }} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Table.Td>
    </Table.Tr>
  ));
  // --- End Table Rows ---

  return (
    <AdminLayout>
      {/* --- All Modals (Unchanged) --- */}
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

      <Modal opened={contactEditModal} onClose={closeContactEdit} title="Edit Contact" centered>
        <form onSubmit={editContactForm.onSubmit(handleUpdateContact)}>
          <Stack>
            <Group grow>
              <TextInput required label="First Name" {...editContactForm.getInputProps('firstName')} />
              <TextInput required label="Last Name" {...editContactForm.getInputProps('lastName')} />
            </Group>
            <TextInput required label="Email" {...editContactForm.getInputProps('email')} />
            <TextInput label="Title" {...editContactForm.getInputProps('title')} />
            <TextInput label="Phone" {...editContactForm.getInputProps('phone')} />
            <Select
              label="Organization"
              placeholder="Link to an organization"
              data={orgSelect}
              searchable
              clearable
              {...editContactForm.getInputProps('organizationId')}
            />
            <Button type="submit" loading={editContactForm.submitting} mt="md">Save Changes</Button>
          </Stack>
        </form>
      </Modal>
      {/* --- End Modals --- */}
      
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
          <Button leftSection={<IconPlus size={14} />} onClick={openOrgCreate} disabled={!canCreate} mb="md">
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
          <Button leftSection={<IconPlus size={14} />} onClick={openContact} disabled={!canCreate} mb="md">
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