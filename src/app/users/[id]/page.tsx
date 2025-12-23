'use client';

import { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import api from '@/lib/api';
import {
  Title, Alert, LoadingOverlay, Paper, Text, Badge, Grid, Stack, Avatar, Group, Table,
  Tabs, rem, List, ThemeIcon, Button, Modal, TextInput, Textarea, JsonInput,
  Checkbox, ActionIcon, Divider, Select, NumberInput, FileButton
} from '@mantine/core';
import { Dropzone } from '@mantine/dropzone';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import {
  IconAlertCircle, IconUser, IconBriefcase, IconFileText, IconCurrencyDollar, IconLock,
  IconList, IconPencil, IconPlus, IconTrash, IconUpload, IconX, IconFile, IconCamera, IconTicket
} from '@tabler/icons-react';
import { useParams, useRouter } from 'next/navigation';
import { notifications } from '@mantine/notifications';
import { useAuthStore } from '@/lib/authStore';
import { UserAvatar } from '@/components/UserAvatar';

interface UserProfile {
  id: string; email: string; firstName: string | null; lastName: string | null; status: string;
  avatarUrl?: string; lastActiveAt?: string;
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
const InfoList = ({ label, value }: { label: string; value: any | null | undefined }) => { const validItems = Array.isArray(value) ? value.filter(item => typeof item === 'string' && item) : []; return ( <div> <Text size="xs" tt="uppercase" c="dimmed">{label}</Text> {validItems.length > 0 ? ( <Group gap="xs" mt={4}> {validItems.map((item: string) => <Badge key={item} variant="light">{item}</Badge>)} </Group> ) : <Text c="dimmed" span>Not set</Text>} </div> ); };
const getAge = (birthDate: string | null | undefined) => { if (!birthDate) return 'Not set'; const age = new Date().getFullYear() - new Date(birthDate).getFullYear(); return `${age} years old`; };

function SalaryTabPanel({ userId, userPermissions }: { userId: string, userPermissions: string[] }) {
  const canRead = userPermissions.includes('read:salary');
  const canManage = userPermissions.includes('manage:salary');
  const salaryForm = useForm({ initialValues: { rate: 0, currency: 'USD', payCycle: 'SALARY' } });
  const [loading, setLoading] = useState(true);
  useEffect(() => { if (canRead) { setLoading(true); api.get(`/users/${userId}/salary`).then(res => salaryForm.setValues(res.data)).catch(()=>{}).finally(()=>setLoading(false)); } }, [canRead, userId]);
  const handleSubmit = async (values: typeof salaryForm.values) => { try { await api.patch(`/users/${userId}/salary`, { salaryInfo: values }); notifications.show({ title: 'Success', message: 'Salary updated.', color: 'green' }); } catch (e) { notifications.show({ title: 'Error', message: 'Update failed.', color: 'red' }); } };
  if (!canRead) return <Alert color="red">Access Denied</Alert>;
  return ( <Paper p="md" withBorder style={{position:'relative'}}><LoadingOverlay visible={loading} /><form onSubmit={salaryForm.onSubmit(handleSubmit)}><Stack><NumberInput label="Pay Rate" {...salaryForm.getInputProps('rate')} disabled={!canManage}/><Select label="Currency" data={['USD','EUR','GBP','CAD']} {...salaryForm.getInputProps('currency')} disabled={!canManage}/><Select label="Frequency" data={['HOURLY','SALARY','CONTRACT']} {...salaryForm.getInputProps('payCycle')} disabled={!canManage}/>{canManage && <Group justify="flex-end"><Button type="submit" disabled={!salaryForm.isDirty()}>Save Salary Info</Button></Group>}</Stack></form></Paper> );
}

function DocumentsTabPanel({ userId, userPermissions }: { userId: string, userPermissions: string[] }) {
  const canRead = userPermissions.includes('read:documents');
  const canManage = userPermissions.includes('manage:documents');
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fetchDocs = useCallback(async () => { setLoading(true); try { const res = await api.get(`/documents/staff/${userId}`); setDocs(res.data); } catch(e){} finally { setLoading(false); } }, [userId]);
  useEffect(() => { if(canRead) fetchDocs(); }, [canRead, fetchDocs]);
  const handleUpload = async (files: File[]) => { if(files.length===0) return; setUploading(true); const formData = new FormData(); formData.append('file', files[0]); try { await api.post(`/documents/upload/staff/${userId}`, formData, { headers: { 'Content-Type': 'multipart/form-data' }}); notifications.show({ title: 'Uploaded', color: 'green', message: 'Success' }); fetchDocs(); } catch(e) { notifications.show({ title: 'Error', color: 'red', message: 'Upload failed' }); } finally { setUploading(false); } };
  const handleDelete = async (id: string) => { if(confirm('Delete?')) { try{ await api.delete(`/documents/${id}`); notifications.show({title:'Deleted',color:'green',message:'Doc deleted'}); fetchDocs(); } catch(e){} } };
  if(!canRead) return <Alert color="red">Access Denied</Alert>;
  const formatBytes = (bytes: number) => { if(bytes===0) return '0 B'; const k=1024; const s=['B','KB','MB']; const i=Math.floor(Math.log(bytes)/Math.log(k)); return parseFloat((bytes/Math.pow(k,i)).toFixed(2))+' '+s[i]; };
  return ( <Stack>{canManage && <Paper p="md" withBorder><Title order={4} mb="md">Upload New Document</Title><Dropzone onDrop={handleUpload} loading={uploading}><Group justify="center"><IconUpload size={30}/><Text>Drag file here or click</Text></Group></Dropzone></Paper>}<Paper p="md" withBorder style={{position:'relative'}}><LoadingOverlay visible={loading} /><Title order={4} mb="md">Uploaded Documents</Title>{docs.length === 0 ? <Text c="dimmed">No documents found.</Text> : (<Table striped><Table.Thead><Table.Tr><Table.Th>Name</Table.Th><Table.Th>Size</Table.Th><Table.Th>Date</Table.Th><Table.Th></Table.Th></Table.Tr></Table.Thead><Table.Tbody>{docs.map(d => (<Table.Tr key={d.id}><Table.Td><Group gap="xs"><IconFile size={16}/><Text size="sm">{d.name}</Text></Group></Table.Td><Table.Td>{formatBytes(d.fileSize)}</Table.Td><Table.Td>{new Date(d.createdAt).toLocaleDateString()}</Table.Td><Table.Td>{canManage && <ActionIcon color="red" variant="subtle" onClick={()=>handleDelete(d.id)}><IconTrash size={16}/></ActionIcon>}</Table.Td></Table.Tr>))}</Table.Tbody></Table>)}</Paper></Stack> );
}

function TicketsTabPanel({ userId }: { userId: string }) {
    const [tickets, setTickets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    useEffect(() => { setLoading(true); api.get('/helpdesk').then(res => { setTickets(res.data.filter((t: any) => t.assignedTo?.id === userId)); }).catch(()=>{}).finally(() => setLoading(false)); }, [userId]);
    return ( <Paper p="md" withBorder style={{position:'relative'}}><LoadingOverlay visible={loading} /><Title order={4} mb="md">Assigned Tickets</Title>{tickets.length === 0 ? <Text c="dimmed">No tickets assigned to this user.</Text> : (<Table striped highlightOnHover><Table.Thead><Table.Tr><Table.Th>Subject</Table.Th><Table.Th>Status</Table.Th><Table.Th>Priority</Table.Th></Table.Tr></Table.Thead><Table.Tbody>{tickets.map(t => (<Table.Tr key={t.id} style={{cursor: 'pointer'}} onClick={() => router.push(`/helpdesk/${t.id}`)}><Table.Td>{t.subject}</Table.Td><Table.Td><Badge color={t.status === 'OPEN' ? 'blue' : 'gray'}>{t.status}</Badge></Table.Td><Table.Td><Badge variant="outline" color={t.priority === 'URGENT' ? 'red' : 'gray'}>{t.priority}</Badge></Table.Td></Table.Tr>))}</Table.Tbody></Table>)}</Paper> );
}

export default function UserProfilePage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const params = useParams();
  const { id } = params;
  const [isHydrated, setIsHydrated] = useState(false);
  const { user: adminUser, setUser: setAuthUser } = useAuthStore();
  const userPermissions = adminUser?.permissions || [];
  const [opened, { open, close }] = useDisclosure(false);
  const form = useForm({ initialValues: { firstName: '', lastName: '', phone: '', nationality: '', gender: '', birthDate: '', education: '', degree: '', hardSkills: '[]', softSkills: '[]', addressLine1: '', addressLine2: '', city: '', state: '', zipCode: '', country: '', jobDescription: '', taxInfo: '{}' } });
  const noteForm = useForm({ initialValues: { content: '', isTask: false } });

  const fetchUser = useCallback(async () => {
    if (id) {
      try {
        setLoading(true);
        const response = await api.get(`/users/${id}`);
        setUser(response.data);
        const profile = response.data.profile || {};
        form.setValues({
          firstName: response.data.firstName || '', lastName: response.data.lastName || '', phone: profile.phone || '', nationality: profile.nationality || '', gender: profile.gender || '',
          birthDate: profile.birthDate ? new Date(profile.birthDate).toISOString().split('T')[0] : '',
          education: profile.education || '', degree: profile.degree || '', hardSkills: JSON.stringify(profile.hardSkills || [], null, 2), softSkills: JSON.stringify(profile.softSkills || [], null, 2),
          addressLine1: profile.addressLine1 || '', addressLine2: profile.addressLine2 || '', city: profile.city || '', state: profile.state || '', zipCode: profile.zipCode || '', country: profile.country || '',
          jobDescription: profile.jobDescription || '', taxInfo: JSON.stringify(profile.taxInfo || {}, null, 2),
        });
        form.resetDirty();
      } catch (err: any) { setError('Failed to fetch user profile.'); } finally { setLoading(false); }
    }
  }, [id]);

  useEffect(() => { const u = useAuthStore.persist.onFinishHydration(() => setIsHydrated(true)); useAuthStore.persist.rehydrate(); return () => u(); }, []);
  useEffect(() => { if (isHydrated) fetchUser(); }, [fetchUser, id, isHydrated]);

  const handleProfileUpdate = async (values: typeof form.values) => {
    try {
      const cleanValues = { ...values };
      if (cleanValues.birthDate === '') cleanValues.birthDate = undefined as any;
      await api.patch(`/users/${user!.id}`, cleanValues);
      notifications.show({ title: 'Success', message: 'Profile updated!', color: 'green' });
      close(); fetchUser();
      if (isOwnProfile && adminUser) setAuthUser({ ...adminUser, firstName: values.firstName, lastName: values.lastName });
    } catch (err) { notifications.show({ title: 'Error', message: 'Failed to update.', color: 'red' }); }
  };

  const handleAvatarUpload = async (payload: File | null) => {
      if (!payload) return;
      const file = payload;
      const fd = new FormData(); fd.append('file', file);
      
      try {
          // 1. Upload
          const res = await api.post(`/users/${user!.id}/avatar`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
          const updatedUser = res.data;
          
          notifications.show({ title: 'Success', color: 'green', message: 'Avatar updated.' });
          
          // 2. Cache Busting (Timestamp)
          const timestamp = Date.now();
          // Ensure we handle case where avatarUrl might be null in response (unlikely on success)
          const rawUrl = updatedUser.avatarUrl || user!.avatarUrl; 
          const newUrl = `${rawUrl}?t=${timestamp}`;
          
          // 3. Update Local State (Profile) - CRITICAL: Don't call fetchUser() here
          setUser((prev: any) => ({ ...prev, avatarUrl: newUrl }));
          
          // 4. Update Global Store (Navbar)
          if(isOwnProfile && adminUser) {
             const newData = { ...adminUser, avatarUrl: newUrl };
             setAuthUser(newData as any);
          }
      } catch(e) { notifications.show({ title: 'Error', color: 'red', message: 'Upload failed' }); }
  };

  const handleCreateNote = async (values: typeof noteForm.values) => { try { await api.post('/notes', { ...values, userId: user!.id }); notifications.show({ title: 'Success', color: 'green', message: 'Note added!' }); noteForm.reset(); fetchUser(); } catch (err) { notifications.show({ title: 'Error', message: 'Failed.', color: 'red' }); } };
  const handleToggleNote = async (note: any) => { try { await api.patch(`/notes/${note.id}`, { isDone: !note.isDone }); fetchUser(); } catch (err) {} };
  const handleDeleteNote = async (id: string) => { try { await api.delete(`/notes/${id}`); fetchUser(); } catch (err) {} };

  const isOwnProfile = adminUser?.userId === user?.id;
  const isOnline = user?.lastActiveAt ? (new Date().getTime() - new Date(user.lastActiveAt).getTime() < 5 * 60 * 1000) : false;

  return (
    <AdminLayout>
      <LoadingOverlay visible={!isHydrated || loading} />
      <Modal opened={opened} onClose={close} title="Edit Profile" size="xl" centered>
        <form onSubmit={form.onSubmit(handleProfileUpdate)}>
          <Tabs defaultValue="basic">
            <Tabs.List><Tabs.Tab value="basic">Basic Info</Tabs.Tab><Tabs.Tab value="professional">Professional</Tabs.Tab><Tabs.Tab value="address">Address</Tabs.Tab><Tabs.Tab value="job">Job</Tabs.Tab><Tabs.Tab value="sensitive">Sensitive</Tabs.Tab></Tabs.List>
            <Tabs.Panel value="basic" pt="md"><Stack><Group grow><TextInput label="First Name" {...form.getInputProps('firstName')}/><TextInput label="Last Name" {...form.getInputProps('lastName')}/></Group><TextInput label="Mobile" {...form.getInputProps('phone')}/><TextInput label="Nationality" {...form.getInputProps('nationality')}/><TextInput label="Gender" {...form.getInputProps('gender')}/><TextInput type="date" label="Birth Date" {...form.getInputProps('birthDate')}/></Stack></Tabs.Panel>
            <Tabs.Panel value="professional" pt="md"><Stack><TextInput label="Education" {...form.getInputProps('education')}/><TextInput label="Degree" {...form.getInputProps('degree')}/><JsonInput label="Hard Skills" {...form.getInputProps('hardSkills')} minRows={3}/><JsonInput label="Soft Skills" {...form.getInputProps('softSkills')} minRows={3}/></Stack></Tabs.Panel>
            <Tabs.Panel value="address" pt="md"><Stack><TextInput label="Address Line 1" {...form.getInputProps('addressLine1')}/><TextInput label="Address Line 2" {...form.getInputProps('addressLine2')}/><Group grow><TextInput label="City" {...form.getInputProps('city')}/><TextInput label="State" {...form.getInputProps('state')}/></Group><Group grow><TextInput label="Zip Code" {...form.getInputProps('zipCode')}/><TextInput label="Country" {...form.getInputProps('country')}/></Group></Stack></Tabs.Panel>
            <Tabs.Panel value="job" pt="md"><Textarea label="Job Description" {...form.getInputProps('jobDescription')} minRows={5}/></Tabs.Panel>
            <Tabs.Panel value="sensitive" pt="md"><JsonInput label="Tax Info" {...form.getInputProps('taxInfo')} minRows={4}/></Tabs.Panel>
          </Tabs>
          <Button type="submit" loading={form.submitting} mt="xl" disabled={!form.isDirty()}>Save Changes</Button>
        </form>
      </Modal>

      {!loading && isHydrated && user && (
        <Grid>
          <Grid.Col span={{ base: 12, md: 4, lg: 3 }}>
            <Paper p="md" radius="md" withBorder>
              <Stack align="center">
                <FileButton onChange={handleAvatarUpload} accept="image/png,image/jpeg">
                    {(props) => (
                        <div style={{ position: 'relative', cursor: 'pointer' }} {...props}>
                            {/* Key prop ensures re-render when URL changes */}
                            <UserAvatar user={user} size={rem(120)} />
                            <ActionIcon variant="filled" color="blue" radius="xl" size="lg" style={{ position: 'absolute', bottom: 0, right: 0, pointerEvents: 'none' }}><IconCamera size={18} /></ActionIcon>
                        </div>
                    )}
                </FileButton>
                <Title order={3} ta="center">{user.firstName} {user.lastName}</Title>
                <Text c="dimmed" size="sm">{user.email}</Text>
                <Badge color={user.status === 'ACTIVE' ? 'green' : 'gray'} size="lg">{user.status}</Badge>
              </Stack>
              <Stack mt="xl" gap="md">
                <InfoField label="Role" value={user.roles.map(r => r.name).join(', ')} />
                <InfoField label="Mobile" value={user.profile?.phone} />
                <InfoField label="Nationality" value={user.profile?.nationality} />
                <InfoField label="Gender" value={user.profile?.gender} />
                <InfoField label="Age" value={getAge(user.profile?.birthDate)} />
                <Divider />
                <Group justify="space-between"><Text size="xs" tt="uppercase" c="dimmed">Status</Text><Badge variant="dot" color={isOnline ? 'green' : 'gray'}>{isOnline ? 'Online' : 'Offline'}</Badge></Group>
              </Stack>
            </Paper>
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 8, lg: 9 }}>
            <Tabs defaultValue="activity">
              <Tabs.List><Tabs.Tab value="activity" leftSection={<IconFileText size={14} />}>Activity</Tabs.Tab><Tabs.Tab value="personal" leftSection={<IconUser size={14} />}>Personal Info</Tabs.Tab><Tabs.Tab value="job" leftSection={<IconBriefcase size={14} />}>Job Info</Tabs.Tab><Tabs.Tab value="tickets" leftSection={<IconTicket size={14} />}>Tickets</Tabs.Tab>{userPermissions.includes('read:salary') && <Tabs.Tab value="salary" leftSection={<IconCurrencyDollar size={14} />}>Salary</Tabs.Tab>}{userPermissions.includes('read:documents') && <Tabs.Tab value="documents" leftSection={<IconFileText size={14} />}>Documents</Tabs.Tab>}<Tabs.Tab value="notes" leftSection={<IconList size={14} />}>Notes</Tabs.Tab></Tabs.List>
              <Tabs.Panel value="activity" pt="md"><Paper p="md" radius="md" withBorder><Title order={4} mb="md">Recent Activity</Title><Table striped><Table.Thead><Table.Tr><Table.Th>Action</Table.Th><Table.Th>Date</Table.Th></Table.Tr></Table.Thead><Table.Tbody>{user.auditLogs.map((log) => (<Table.Tr key={log.id}><Table.Td>{log.action}</Table.Td><Table.Td>{new Date(log.createdAt).toLocaleString()}</Table.Td></Table.Tr>))}</Table.Tbody></Table></Paper></Tabs.Panel>
              <Tabs.Panel value="personal" pt="md"><Paper p="md" radius="md" withBorder><Group justify="space-between" mb="md"><Title order={4}>Personal Information</Title><Button variant="default" size="xs" onClick={open} leftSection={<IconPencil size={14}/>}>Edit</Button></Group><Stack gap="md"><InfoField label="Education" value={user.profile?.education} /><InfoField label="Degree" value={user.profile?.degree} /><InfoList label="Hard Skills" value={user.profile?.hardSkills} /><InfoList label="Soft Skills" value={user.profile?.softSkills} /><Divider /><Title order={5}>Address</Title><InfoField label="Address Line 1" value={user.profile?.addressLine1} /><InfoField label="Address Line 2" value={user.profile?.addressLine2} /><Group grow><InfoField label="City" value={user.profile?.city} /><InfoField label="State" value={user.profile?.state} /></Group><Group grow><InfoField label="Zip Code" value={user.profile?.zipCode} /><InfoField label="Country" value={user.profile?.country} /></Group></Stack></Paper></Tabs.Panel>
              <Tabs.Panel value="job" pt="md"><Paper p="md" radius="md" withBorder><Group justify="space-between" mb="md"><Title order={4}>Job Information</Title><Button variant="default" size="xs" onClick={open} leftSection={<IconPencil size={14}/>}>Edit</Button></Group><InfoField label="Description" value={user.profile?.jobDescription} /><Title order={5} mt="md">Roles</Title><Group gap="xs">{user.roles.map(r => <Badge key={r.id}>{r.name}</Badge>)}</Group><Title order={5} mt="md">Permissions</Title><List icon={<ThemeIcon size={16} radius="xl"><IconLock size={12} /></ThemeIcon>} mt="xs">{user.roles.flatMap(r => r.permissions).map(p => <List.Item key={p.id}>{p.name}</List.Item>)}</List></Paper></Tabs.Panel>
              <Tabs.Panel value="tickets" pt="md"><TicketsTabPanel userId={user.id}/></Tabs.Panel>
              {userPermissions.includes('read:salary') && <Tabs.Panel value="salary" pt="md"><SalaryTabPanel userId={user.id} userPermissions={userPermissions} /></Tabs.Panel>}
              {userPermissions.includes('read:documents') && <Tabs.Panel value="documents" pt="md"><DocumentsTabPanel userId={user.id} userPermissions={userPermissions} /></Tabs.Panel>}
              <Tabs.Panel value="notes" pt="md"><Paper p="md" radius="md" withBorder><Title order={4} mb="md">Personal Notes</Title>{!isOwnProfile ? <Text c="dimmed">Private.</Text> : (<Stack><form onSubmit={noteForm.onSubmit(handleCreateNote)}><Group><TextInput placeholder="New note..." style={{flex:1}} {...noteForm.getInputProps('content')}/><Checkbox label="Task" {...noteForm.getInputProps('isTask', {type:'checkbox'})}/><Button type="submit">Add</Button></Group></form><Divider my="md"/><Stack>{user.personalNotes.map(n => <Paper key={n.id} p="xs" withBorder><Group justify="space-between"><Checkbox label={n.content} checked={n.isDone} onChange={()=>handleToggleNote(n)}/><ActionIcon color="red" variant="subtle" onClick={()=>handleDeleteNote(n.id)}><IconTrash size={16}/></ActionIcon></Group></Paper>)}</Stack></Stack>)}</Paper></Tabs.Panel>
            </Tabs>
          </Grid.Col>
        </Grid>
      )}
    </AdminLayout>
  );
}