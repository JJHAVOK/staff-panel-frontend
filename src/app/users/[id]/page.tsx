'use client';

import { AdminLayout } from '@/components/AdminLayout';
import api from '@/lib/api';
import {
  Title, Alert, LoadingOverlay, Paper, Text, Badge, Grid, Stack, Avatar, Group, Table,
  Tabs, rem, List, ThemeIcon, Button, Modal, TextInput, Textarea, JsonInput,
  Checkbox, // For Notes
  ActionIcon, // For Notes
  Divider,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import {
  IconAlertCircle, IconUser, IconBriefcase, IconFileText, IconCurrencyDollar, IconLock,
  IconList, IconPencil,
  IconPlus, IconTrash, // For Notes
} from '@tabler/icons-react';
import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { notifications } from '@mantine/notifications';
import { useAuthStore } from '@/lib/authStore'; // For Notes

// --- Types ---
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
const InfoList = ({ label, value }: { label: string; value: any | null | undefined }) => ( <div> <Text size="xs" tt="uppercase" c="dimmed">{label}</Text> {Array.isArray(value) && value.length > 0 ? ( <Group gap="xs" mt={4}> {value.map((item: string) => <Badge key={item} variant="light">{item}</Badge>)} </Group> ) : <Text c="dimmed" span>Not set</Text>} </div> );
const getAge = (birthDate: string | null | undefined) => { if (!birthDate) return 'Not set'; const age = new Date().getFullYear() - new Date(birthDate).getFullYear(); return `${age} years old`; };


export default function UserProfilePage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const params = useParams();
  const { id } = params;

  const { user: adminUser } = useAuthStore();
  const [opened, { open, close }] = useDisclosure(false);

  const form = useForm({
    initialValues: {
      firstName: '', lastName: '', phone: '', nationality: '', gender: '', birthDate: '',
      education: '', degree: '', hardSkills: '[]', softSkills: '[]',
      addressLine1: '', addressLine2: '', city: '', state: '', zipCode: '', country: '',
      jobDescription: '', taxInfo: '{}', salaryInfo: '{}',
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

        const profile = response.data.profile || {};
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
          salaryInfo: JSON.stringify(profile.salaryInfo || {}, null, 2),
        });
        form.resetDirty(); 

      } catch (err: any) {
        setError('Failed to fetch user profile.');
      } finally {
        setLoading(false);
      }
    }
  }, [id]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser, id]); 

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
      {/* --- Edit Profile Modal --- */}
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
                <JsonInput label="Salary Info" description='Enter as JSON object, e.g., {"rate": 80000}' {...form.getInputProps('salaryInfo')} minRows={4} />
              </Stack>
            </Tabs.Panel>
          </Tabs>
          <Button type="submit" loading={form.submitting} mt="xl" disabled={!form.isDirty()}>
            Save Changes
          </Button>
        </form>
      </Modal>
      {/* --- END OF MODAL --- */}

      <LoadingOverlay visible={loading} />

      {error && <Alert icon={<IconAlertCircle size="1rem" />} title="Error" color="red" my="xl">{error}</Alert>}

      {user && (
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

          {/* --- RIGHT SIDE: TABS --- */}
          <Grid.Col span={{ base: 12, md: 8, lg: 9 }}>
            <Tabs defaultValue="activity">
              <Tabs.List>
                <Tabs.Tab value="activity" leftSection={<IconFileText size={14} />}>Activity</Tabs.Tab>
                <Tabs.Tab value="personal" leftSection={<IconUser size={14} />}>Personal Info</Tabs.Tab>
                <Tabs.Tab value="job" leftSection={<IconBriefcase size={14} />}>Job Info</Tabs.Tab>
                <Tabs.Tab value="salary" leftSection={<IconCurrencyDollar size={14} />}>Salary</Tabs.Tab>
                <Tabs.Tab value="documents" leftSection={<IconFileText size={14} />}>Documents</Tabs.Tab>
                <Tabs.Tab value="notes" leftSection={<IconList size={14} />}>Personal Notes</Tabs.Tab>
              </Tabs.List>

              {/* --- ACTIVITY TAB (Fixed) --- */}
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

              {/* --- PERSONAL INFO TAB (Fixed) --- */}
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

              {/* --- JOB INFO TAB (Fixed) --- */}
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

              {/* --- SALARY TAB (Fixed) --- */}
              <Tabs.Panel value="salary" pt="md">
                <Paper p="md" radius="md" withBorder>
                  <Title order={4} mb="md">Salary Information</Title>
                  {user.profile?.salaryInfo ? <Text ff="monospace" fz="xs" bg="dark.6" p="xs">{JSON.stringify(user.profile.salaryInfo)}</Text> : <Text c="dimmed">Not set</Text>}
                </Paper>
              </Tabs.Panel>

              {/* --- DOCUMENTS TAB (Placeholder) --- */}
              <Tabs.Panel value="documents" pt="md"><Text c="dimmed">Documents module pending.</Text></Tabs.Panel>

              {/* --- PERSONAL NOTES TAB (NOW FUNCTIONAL) --- */}
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