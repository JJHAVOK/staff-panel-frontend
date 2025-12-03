'use client';

import { AdminLayout } from '@/components/AdminLayout';
import api from '@/lib/api';
import {
  Title, Alert, LoadingOverlay, Paper, Text, Badge, Grid, Stack, Avatar, Group, Table,
  Tabs, rem, List, ThemeIcon, Button, Modal, TextInput, Textarea, JsonInput,
  Checkbox, // For Notes
  ActionIcon, // For Notes
  Divider,
  Select, // For Salary
  NumberInput, // For Salary
  Skeleton,
} from '@mantine/core';
import { Dropzone, MIME_TYPES } from '@mantine/dropzone';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import {
  IconAlertCircle, IconUser, IconBriefcase, IconFileText, IconCurrencyDollar, IconLock,
  IconList, IconPencil,
  IconPlus, IconTrash, // For Notes
  IconCheck, IconCoin, IconActivity, IconNote,
  IconUpload, IconX, IconFile,
} from '@tabler/icons-react';
import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { notifications } from '@mantine/notifications';
import { useAuthStore } from '@/lib/authStore';

// --- Types (Unchanged) ---
interface UserProfile {
  id: string; email: string; firstName: string | null; lastName: string | null; status: string;
  roles: { id: string; name: string; permissions: { id: string; name: string }[]; }[];
  auditLogs: { id: string; action: string; createdAt: string; }[];
  personalNotes: { id: string; content: string; isTask: boolean; isDone: boolean; }[];
  profile: {
    phone: string | null; nationality: string | null; gender: string | null; birthDate: string | null;
    education: string | null; degree: string | null; hardSkills: any | null; softSkills: any | null;
    addressLine1: string | null; addressLine2: string | null; city: string | null; state: string | null;
    zipCode: string | null; country: string | null; taxInfo: any | null; salaryInfo: any | null;
    jobDescription: string | null;
  } | null;
}
const InfoField = ({ label, value }: { label: string; value: string | null | undefined }) => ( <div> <Text size="xs" tt="uppercase" c="dimmed">{label}</Text> <Text>{value || <Text c="dimmed" span>Not set</Text>}</Text> </div> );

// --- 👇 THIS IS THE FIX for the 'trim' crash 👇 ---
const InfoList = ({ label, value }: { label: string; value: any | null | undefined }) => {
  // Filter out null, undefined, or non-string items before mapping
  const validItems = Array.isArray(value) ? value.filter(item => typeof item === 'string' && item) : [];

  return (
    <div>
      <Text size="xs" tt="uppercase" c="dimmed">{label}</Text>
      {validItems.length > 0 ? (
        <Group gap="xs" mt={4}>
          {validItems.map((item: string) => <Badge key={item} variant="light">{item}</Badge>)}
        </Group>
      ) : <Text c="dimmed" span>Not set</Text>}
    </div>
  );
};
// --- 👆 END OF FIX 👆 ---

const getAge = (birthDate: string | null | undefined) => { if (!birthDate) return 'Not set'; const age = new Date().getFullYear() - new Date(birthDate).getFullYear(); return `${age} years old`; };

// --- SALARY TAB COMPONENT (Unchanged) ---
function SalaryTabPanel({ userId, userPermissions }: { userId: string, userPermissions: string[] }) {
  const canRead = userPermissions.includes('read:salary');
  const canManage = userPermissions.includes('manage:salary');
  const salaryForm = useForm({ initialValues: { rate: 0, currency: 'USD', payCycle: 'SALARY' }, validate: { rate: (value) => (value <= 0 ? 'Rate must be greater than 0' : null), currency: (value) => (value ? null : 'Currency is required'), payCycle: (value) => (value ? null : 'Pay frequency is required') } });
  const [loading, setLoading] = useState(true);
  const fetchSalary = async () => { setLoading(true); try { const response = await api.get(`/user/${userId}/salary`); salaryForm.setValues(response.data); salaryForm.setInitialValues(response.data); } catch (e) { notifications.show({ title: 'Error', message: 'Could not fetch salary data.', color: 'red' }); } finally { setLoading(false); } };
  useEffect(() => { if (canRead) { fetchSalary(); } }, [canRead, userId]);
  const handleSubmit = async (values: typeof salaryForm.values) => {
    const initialValues = salaryForm.getInitialValues(); const dirtyValues: Record<string, any> = {};
    for (const key in values) { const typedKey = key as keyof typeof values; if (values[typedKey] !== initialValues[typedKey]) { dirtyValues[typedKey] = values[typedKey]; } }
    if (Object.keys(dirtyValues).length === 0) { notifications.show({ title: 'No Changes', message: 'No information was changed.' }); return; }
    try { const response = await api.patch(`/user/${userId}/salary`, { salaryInfo: dirtyValues }); notifications.show({ title: 'Success', message: 'Salary updated successfully.', color: 'green' }); salaryForm.setInitialValues(response.data); salaryForm.setValues(response.data); } catch (e) { notifications.show({ title: 'Error', message: 'Failed to update salary.', color: 'red' }); }
  };
  if (!canRead) { return ( <Alert icon={<IconAlertCircle size="1rem" />} title="Permission Denied" color="red"> You do not have permission to view salary information. </Alert> ); }
  return ( <Paper withBorder p="md" radius="md" style={{ position: 'relative' }}> <LoadingOverlay visible={loading} /> <form onSubmit={salaryForm.onSubmit(handleSubmit)}> <Stack> <Title order={4}>Compensation</Title> <Grid> <Grid.Col span={4}> <NumberInput label="Pay Rate" placeholder="e.g., 80000" min={0} {...salaryForm.getInputProps('rate')} disabled={!canManage} /> </Grid.Col> <Grid.Col span={4}> <Select label="Currency" data={['USD', 'EUR', 'GBP', 'CAD']} {...salaryForm.getInputProps('currency')} disabled={!canManage} /> </Grid.Col> <Grid.Col span={4}> <Select label="Pay Frequency" data={[{ value: 'HOURLY', label: 'Hourly' }, { value: 'SALARY', label: 'Salary (Annual)' }, { value: 'CONTRACT', label: 'Contract' }]} {...salaryForm.getInputProps('payCycle')} disabled={!canManage} /> </Grid.Col> </Grid> {canManage && ( <Group justify="flex-end" mt="md"> <Button type="submit" disabled={!salaryForm.isDirty()}> Save Salary Info </Button> </Group> )} {!canManage && ( <Text size="sm" c="dimmed">You have read-only access to compensation.</Text> )} </Stack> </form> </Paper> );
}

// --- DOCUMENTS TAB COMPONENT (Unchanged) ---
interface Document {
  id: string;
  name: string;
  fileType: string;
  fileSize: number;
  createdAt: string;
}
function DocumentsTabPanel({ userId, userPermissions }: { userId: string, userPermissions: string[] }) {
  const canRead = userPermissions.includes('read:documents');
  const canManage = userPermissions.includes('manage:documents');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchDocuments = useCallback(async () => {
    setLoading(true); setError(null);
    try { const response = await api.get(`/documents/staff/${userId}`); setDocuments(response.data); } catch (e: any) { if (e.response?.status === 403) { setError('You do not have permission to read documents.'); } else { setError('Could not fetch documents.'); } } finally { setLoading(false); }
  }, [userId]);
  useEffect(() => { if (canRead) { fetchDocuments(); } }, [canRead, fetchDocuments]);
  const handleUpload = async (files: File[]) => {
    if (files.length === 0) return;
    setUploading(true); const file = files[0]; const formData = new FormData(); formData.append('file', file);
    try { await api.post(`/documents/upload/staff/${userId}`, formData, { headers: { 'Content-Type': 'multipart/form-data' }, }); notifications.show({ title: 'Upload Successful', message: 'File has been attached to this user.', color: 'green' }); fetchDocuments(); } catch (e: any) { notifications.show({ title: 'Upload Failed', message: e.response?.data?.message || 'Could not upload file.', color: 'red' }); } finally { setUploading(false); }
  };
  const handleDelete = async (docId: string) => {
    if (confirm('Are you sure you want to delete this document?')) {
      try { await api.delete(`/documents/${docId}`); notifications.show({ title: 'Success', message: 'Document deleted.', color: 'green' }); fetchDocuments(); } catch (e) { notifications.show({ title: 'Error', message: 'Could not delete document.', color: 'red' }); }
    }
  };
  if (!canRead) { return ( <Alert icon={<IconAlertCircle size="1rem" />} title="Permission Denied" color="red"> You do not have permission to view documents. </Alert> ); }
  const formatBytes = (bytes: number, decimals = 2) => { if (bytes === 0) return '0 Bytes'; const k = 1024; const dm = decimals < 0 ? 0 : decimals; const sizes = ['Bytes', 'KB', 'MB', 'GB']; const i = Math.floor(Math.log(bytes) / Math.log(k)); return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]; };
  const rows = documents.map((doc) => ( <Table.Tr key={doc.id}> <Table.Td><IconFile size={16} /></Table.Td> <Table.Td>{doc.name}</Table.Td> <Table.Td>{doc.fileType}</Table.Td> <Table.Td>{formatBytes(doc.fileSize)}</Table.Td> <Table.Td>{new Date(doc.createdAt).toLocaleDateString()}</Table.Td> <Table.Td> {canManage && ( <ActionIcon color="red" variant="subtle" onClick={() => handleDelete(doc.id)}> <IconTrash size={16} /> </ActionIcon> )} </Table.Td> </Table.Tr> ));
  return ( <Stack> {canManage && ( <Paper withBorder p="md" radius="md"> <Title order={4} mb="md">Upload New Document</Title> <Dropzone onDrop={handleUpload} onReject={(files) => notifications.show({ title: 'File Rejected', message: 'File is over 5MB or invalid type.', color: 'red' })} maxSize={5 * 1024 ** 2} loading={uploading} > <Group justify="center" gap="xl" style={{ minHeight: rem(100), pointerEvents: 'none' }}> <Dropzone.Accept> <IconUpload size={50} stroke={1.5} /> </Dropzone.Accept> <Dropzone.Reject> <IconX size={50} stroke={1.5} /> </Dropzone.Reject> <Dropzone.Idle> <IconFile size={50} stroke={1.5} /> </Dropzone.Idle> <div> <Text size="xl" inline> Drag files here or click to select </Text> <Text size="sm" c="dimmed" inline mt={7}> Attach a file (max 5MB) </Text> </div> </Group> </Dropzone> </Paper> )} <Paper withBorder p="md" radius="md" style={{ position: 'relative' }}> <LoadingOverlay visible={loading} /> <Title order={4} mb="md">Uploaded Documents</Title> {error && <Alert icon={<IconAlertCircle size="1rem" />} title="Error" color="red">{error}</Alert>} {!error && documents.length === 0 && ( <Text c="dimmed">No documents found for this user.</Text> )} {!error && documents.length > 0 && ( <Table striped> <Table.Thead> <Table.Tr> <Table.Th></Table.Th> <Table.Th>File Name</Table.Th> <Table.Th>Type</Table.Th> <Table.Th>Size</Table.Th> <Table.Th>Uploaded At</Table.Th> <Table.Th>Actions</Table.Th> </Table.Tr> </Table.Thead> <Table.Tbody>{rows}</Table.Tbody> </Table> )} </Paper> </Stack> );
}
// --- END OF DOCUMENTS TAB COMPONENT ---


// --- This is the main page component ---
export default function UserProfilePage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const params = useParams();
  const { id } = params;

  const [isHydrated, setIsHydrated] = useState(false);
  const { user: adminUser } = useAuthStore();
  const userPermissions = adminUser?.permissions || [];

  const [opened, { open, close }] = useDisclosure(false);

  const form = useForm({
    initialValues: {
      firstName: '', lastName: '', phone: '', nationality: '', gender: '', birthDate: '',
      education: '', degree: '', hardSkills: '[]', softSkills: '[]',
      addressLine1: '', addressLine2: '', city: '', state: '', zipCode: '', country: '',
      jobDescription: '', taxInfo: '{}',
    }
  });

  const noteForm = useForm({
    initialValues: { content: '', isTask: false }
  });

  const fetchUser = useCallback(async () => {
    if (id) {
      try {
        setLoading(true);
        const response = await api.get(`/user/${id}`);
        setUser(response.data);

        // --- 👇 THIS IS THE FIX for the '..profile' typo 👇 ---
        const profile = response.data.profile || {};
        // --- 👆 END OF FIX 👆 ---
        
        form.setValues({
          firstName: response.data.firstName || '',
          lastName: response.data.lastName || '',
          phone: profile.phone || '',
          nationality: profile.nationality || '',
          gender: profile.gender || '',
          birthDate: profile.birthDate ? new Date(profile.birthDate).toISOString().split('T')[0] : '',
          education: profile.education || '',
          degree: profile.degree || '',
          hardSkills: JSON.stringify(profile.hardSkills || [], null, 2),
          softSkills: JSON.stringify(profile.softSkills || [], null, 2),
          addressLine1: profile.addressLine1 || '',
          addressLine2: profile.addressLine2 || '',
          city: profile.city || '',
          state: profile.state || '',
          zipCode: profile.zipCode || '',
          country: profile.country || '',
          jobDescription: profile.jobDescription || '',
          taxInfo: JSON.stringify(profile.taxInfo || {}, null, 2),
        });
        form.resetDirty(); 

      } catch (err: any) {
        setError('Failed to fetch user profile.');
      } finally {
        setLoading(false);
      }
    }
  }, [id]); // --- 👈 THIS IS THE FIX for the infinite loop (removed 'form')

  // --- HYDRATION FLICKER FIX ---
  useEffect(() => {
    const unsubscribe = useAuthStore.persist.onFinishHydration(() => {
      setIsHydrated(true); 
    });
    useAuthStore.persist.rehydrate();
    return () => { unsubscribe(); };
  }, []);

  useEffect(() => {
    if (isHydrated) {
      fetchUser();
    }
  }, [fetchUser, id, isHydrated]); 
  // --- END OF FIX ---

  const handleProfileUpdate = async (values: typeof form.values) => {
    try {
      await api.patch(`/user/${user!.id}`, values);
      notifications.show({ title: 'Success', message: 'Profile updated successfully!', color: 'green' });
      close();
      fetchUser();
    } catch (err) {
      notifications.show({ title: 'Error', message: 'Failed to update profile.', color: 'red' });
    }
  };

  const handleCreateNote = async (values: typeof noteForm.values) => {
    try {
      await api.post('/notes', { ...values, userId: user!.id });
      notifications.show({ title: 'Success', message: 'Note added!', color: 'green' });
      noteForm.reset();
      fetchUser();
    } catch (err) {
      notifications.show({ title: 'Error', message: 'Failed to add note.', color: 'red' });
    }
  };

  const handleToggleNote = async (note: UserProfile['personalNotes'][0]) => {
    try {
      await api.patch(`/notes/${note.id}`, { isDone: !note.isDone });
      notifications.show({ title: 'Success', message: 'Note updated!', color: 'green' });
      fetchUser();
    } catch (err) {
      notifications.show({ title: 'Error', message: 'Failed to update note.', color: 'red' });
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      await api.delete(`/notes/${noteId}`);
      notifications.show({ title: 'Success', message: 'Note deleted!', color: 'green' });
      fetchUser();
    } catch (err) {
      notifications.show({ title: 'Error', message: 'Failed to delete note.', color: 'red' });
    }
  };

  const isOwnProfile = adminUser?.userId === user?.id;

  return (
    <AdminLayout>
      <LoadingOverlay visible={!isHydrated || loading} />

      {/* --- Edit Profile Modal (Unchanged) --- */}
      <Modal opened={opened} onClose={close} title="Edit Profile" size="xl" centered>
        <form onSubmit={form.onSubmit(handleProfileUpdate)}>
          <Tabs defaultValue="basic">
            <Tabs.List>
              <Tabs.Tab value="basic">Basic Info</Tabs.Tab>
              <Tabs.Tab value="professional">Professional</Tabs.Tab>
              <Tabs.Tab value="address">Address</Tabs.Tab>
              <Tabs.Tab value="job">Job</Tabs.Tab>
              <Tabs.Tab value="sensitive">Sensitive</Tabs.Tab>
            </Tabs.List>
            <Tabs.Panel value="basic" pt="md">
              <Stack>
                <Group grow>
                  <TextInput label="First Name" {...form.getInputProps('firstName')} />
                  <TextInput label="Last Name" {...form.getInputProps('lastName')} />
                </Group>
                <TextInput label="Mobile Number" {...form.getInputProps('phone')} />
                <TextInput label="Nationality" {...form.getInputProps('nationality')} />
                <TextInput label="Gender" {...form.getInputProps('gender')} />
                <TextInput type="date" label="Birth Date" {...form.getInputProps('birthDate')} />
              </Stack>
            </Tabs.Panel>
            <Tabs.Panel value="professional" pt="md">
              <Stack>
                <TextInput label="Education" {...form.getInputProps('education')} />
                <TextInput label="Degree" {...form.getInputProps('degree')} />
                <JsonInput label="Hard Skills" description='Enter as JSON array, e.g., ["React", "SQL"]' {...form.getInputProps('hardSkills')} minRows={4} />
                <JsonInput label="Soft Skills" description='Enter as JSON array, e.g., ["Communication"]' {...form.getInputProps('softSkills')} minRows={4} />
              </Stack>
            </Tabs.Panel>
            <Tabs.Panel value="address" pt="md">
              <Stack>
                <TextInput label="Address Line 1" {...form.getInputProps('addressLine1')} />
                <TextInput label="Address Line 2" {...form.getInputProps('addressLine2')} />
                <Group grow>
                  <TextInput label="City" {...form.getInputProps('city')} />
                  <TextInput label="State" {...form.getInputProps('state')} />
                </Group>
                <Group grow>
                  <TextInput label="Zip Code" {...form.getInputProps('zipCode')} />
                  <TextInput label="Country" {...form.getInputProps('country')} />
                </Group>
              </Stack>
            </Tabs.Panel>
            <Tabs.Panel value="job" pt="md">
              <Textarea label="Job Description" {...form.getInputProps('jobDescription')} minRows={5} />
            </Tabs.Panel>
            <Tabs.Panel value="sensitive" pt="md">
              <Stack>
                <JsonInput label="Tax Info" description='Enter as JSON object, e.g., {"ssn": "..."}' {...form.getInputProps('taxInfo')} minRows={4} />
              </Stack>
            </Tabs.Panel>
          </Tabs>
          <Button type="submit" loading={form.submitting} mt="xl" disabled={!form.isDirty()}>
            Save Changes
          </Button>
        </form>
      </Modal>
      {/* --- END OF MODAL --- */}

      {!loading && isHydrated && error && <Alert icon={<IconAlertCircle size="1rem" />} title="Error" color="red" my="xl">{error}</Alert>}

      {!loading && isHydrated && user && (
        <Grid>
          {/* --- LEFT SIDEBAR (Unchanged) --- */}
          <Grid.Col span={{ base: 12, md: 4, lg: 3 }}>
            <Paper p="md" radius="md" withBorder>
              <Stack align="center">
                <Avatar size={rem(120)} radius="50%" />
                <Title order={3} ta="center">{user.firstName} {user.lastName}</Title>
                <Text c="dimmed" size="sm">{user.email}</Text>
                <Badge color={user.status === 'ACTIVE' ? 'green' : 'gray'} size="lg">{user.status}</Badge>
              </Stack>
              <Stack mt="xl" gap="md">
                <InfoField label="Role" value={user.roles.map(r => r.name).join(', ')} />
                <InfoField label="Mobile Number" value={user.profile?.phone} />
                <InfoField label="Nationality" value={user.profile?.nationality} />
                <InfoField label="Gender" value={user.profile?.gender} />
                <InfoField label="Age" value={getAge(user.profile?.birthDate)} />
                <InfoField label="Status" value="Online" /> 
              </Stack>
            </Paper>
          </Grid.Col>

          {/* --- RIGHT SIDE: TABS (Unchanged) --- */}
          <Grid.Col span={{ base: 12, md: 8, lg: 9 }}>
            <Tabs defaultValue="activity">
              <Tabs.List>
                <Tabs.Tab value="activity" leftSection={<IconFileText size={14} />}>Activity</Tabs.Tab>
                <Tabs.Tab value="personal" leftSection={<IconUser size={14} />}>Personal Info</Tabs.Tab>
                <Tabs.Tab value="job" leftSection={<IconBriefcase size={14} />}>Job Info</Tabs.Tab>
                
                {userPermissions.includes('read:salary') && (
                  <Tabs.Tab value="salary" leftSection={<IconCurrencyDollar size={14} />}>Salary</Tabs.Tab>
                )}

                {userPermissions.includes('read:documents') && (
                  <Tabs.Tab value="documents" leftSection={<IconFileText size={14} />}>Documents</Tabs.Tab>
                )}
                
                <Tabs.Tab value="notes" leftSection={<IconList size={14} />}>Personal Notes</Tabs.Tab>
              </Tabs.List>

              {/* --- ACTIVITY TAB (Unchanged) --- */}
              <Tabs.Panel value="activity" pt="md">
                <Paper p="md" radius="md" withBorder>
                  <Title order={4} mb="md">Recent Activity</Title>
                  <Table striped>
                    <Table.Thead><Table.Tr><Table.Th>Action</Table.Th><Table.Th>Date</Table.Th></Table.Tr></Table.Thead>
                    <Table.Tbody>
                      {user.auditLogs.length > 0 ? (
                        user.auditLogs.map((log) => (
                          <Table.Tr key={log.id}><Table.Td>{log.action}</Table.Td><Table.Td>{new Date(log.createdAt).toLocaleString()}</Table.Td></Table.Tr>
                        ))
                      ) : (
                        <Table.Tr><Table.Td colSpan={2}><Text c="dimmed" ta="center">No activity found.</Text></Table.Td></Table.Tr>
                      )}
                    </Table.Tbody>
                  </Table>
                </Paper>
              </Tabs.Panel>

              {/* --- PERSONAL INFO TAB (Unchanged) --- */}
              <Tabs.Panel value="personal" pt="md">
                <Paper p="md" radius="md" withBorder>
                  <Group justify="space-between" align="center" mb="md">
                    <Title order={4}>Personal Information</Title>
                    <Button variant="default" size="xs" leftSection={<IconPencil size={14} />} onClick={open}>
                      Edit
                    </Button>
                  </Group>
                  <Stack>
                    <Title order={5}>Professional</Title>
                    <InfoField label="Education" value={user.profile?.education} />
                    <InfoField label="Degree" value={user.profile?.degree} />
                    <InfoList label="Hard Skills" value={user.profile?.hardSkills} />
                    <InfoList label="Soft Skills" value={user.profile?.softSkills} />
                    <Title order={5} mt="md">Home Address</Title>
                    <InfoField label="Address" value={user.profile?.addressLine1} />
                    {user.profile?.addressLine2 && <InfoField label="Address 2" value={user.profile.addressLine2} />}
                    <InfoField label="City" value={user.profile?.city} />
                    <InfoField label="State" value={user.profile?.state} />
                    <InfoField label="Zip Code" value={user.profile?.zipCode} />
                    <InfoField label="Country" value={user.profile?.country} />
                    <Title order={5} mt="md">Tax Information</Title>
                    {user.profile?.taxInfo ? <Text ff="monospace" fz="xs" bg="dark.6" p="xs">{JSON.stringify(user.profile.taxInfo)}</Text> : <Text c="dimmed">Not set</Text>}
                  </Stack>
                </Paper>
              </Tabs.Panel>

              {/* --- JOB INFO TAB (Unchanged) --- */}
              <Tabs.Panel value="job" pt="md">
                <Paper p="md" radius="md" withBorder>
                  <Group justify="space-between" align="center" mb="md">
                    <Title order={4}>Job Information</Title>
                    <Button variant="default" size="xs" leftSection={<IconPencil size={14} />} onClick={open}>
                      Edit
                    </Button>
                  </Group>
                  <InfoField label="Job Description" value={user.profile?.jobDescription} />
                  <Title order={5} mt="md">Roles</Title>
                  <Group gap="xs" mt="xs">
                    {user.roles.map(role => <Badge key={role.id}>{role.name}</Badge>)}
                  </Group>
                  <Title order={5} mt="md">Permissions</Title>
                  <List icon={<ThemeIcon size={16} radius="xl"><IconLock size={12} /></ThemeIcon>} mt="xs">
                    {user.roles.flatMap(r => r.permissions).map(p => <List.Item key={p.id}>{p.name}</List.Item>)}
                  </List>
                </Paper>
              </Tabs.Panel>

              {/* --- SALARY TAB (Unchanged) --- */}
              {userPermissions.includes('read:salary') && (
                <Tabs.Panel value="salary" pt="md">
                  <SalaryTabPanel userId={user.id} userPermissions={userPermissions} />
                </Tabs.Panel>
              )}

              {/* --- DOCUMENTS TAB (Replaced) --- */}
              {userPermissions.includes('read:documents') && (
                <Tabs.Panel value="documents" pt="md">
                  <DocumentsTabPanel userId={user.id} userPermissions={userPermissions} />
                </Tabs.Panel>
              )}

              {/* --- PERSONAL NOTES TAB (Unchanged) --- */}
              <Tabs.Panel value="notes" pt="md">
                <Paper p="md" radius="md" withBorder>
                  <Title order={4} mb="md">Personal Notes & Tasks</Title>

                  {!isOwnProfile && (
                    <Text c="dimmed">You can only view your own personal notes.</Text>
                  )}

                  {isOwnProfile && (
                    <Stack>
                      {/* Add Note Form */}
                      <form onSubmit={noteForm.onSubmit(handleCreateNote)}>
                        <Group>
                          <TextInput
                            placeholder="Add a new note or task..."
                            style={{ flex: 1 }}
                            {...noteForm.getInputProps('content')}
                          />
                          <Checkbox
                            label="Is a task?"
                            {...noteForm.getInputProps('isTask', { type: 'checkbox' })}
                          />
                          <Button type="submit" leftSection={<IconPlus size={14} />} loading={noteForm.submitting}>
                            Add
                          </Button>
                        </Group>
                      </form>

                      <Divider my="md" />

                      {/* Note List */}
                      <Stack gap="sm">
                        {user.personalNotes.length === 0 && (
                          <Text c="dimmed" ta="center">No notes yet.</Text>
                        )}
                        {user.personalNotes.map((note) => (
                          <Paper key={note.id} p="xs" withBorder radius="sm" bg="dark.6">
                            <Group justify="space-between">
                              {note.isTask ? (
                                <Checkbox
                                  label={note.content}
                                  checked={note.isDone}
                                  onChange={() => handleToggleNote(note)}
                                  styles={{ label: { textDecoration: note.isDone ? 'line-through' : 'none' } }}
                                />
                              ) : (
                                <Text>{note.content}</Text>
                              )}
                              <ActionIcon color="red" variant="subtle" onClick={() => handleDeleteNote(note.id)}>
                                <IconTrash size={16} />
                              </ActionIcon>
                            </Group>
                          </Paper>
                        ))}
                      </Stack>
                    </Stack>
                  )}
                </Paper>
              </Tabs.Panel>
            </Tabs>
          </Grid.Col>
        </Grid>
      )}
    </AdminLayout>
  );
}