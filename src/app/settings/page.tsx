'use client';

import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { 
  Title, Text, Button, Group, Tabs, TextInput, Textarea, 
  Paper, ColorInput, Stack, Divider, Switch, Alert, NumberInput, SimpleGrid, Badge, LoadingOverlay
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconSettings, IconPalette, IconShieldLock, IconBrain, IconRobot, IconDeviceFloppy, IconAlertCircle } from '@tabler/icons-react';
import api from '@/lib/api';
import { useSettingsStore } from '@/lib/settingsStore';
import { useAuthStore } from '@/lib/authStore';

interface Settings {
  siteName: string; siteDescription: string; siteEmail: string; supportPhone: string;
  brandColor: string; logoUrl: string; darkSidebar: boolean;
  forceMfa: boolean; sessionTimeout: number; allowedDomains: string;
  aiEnabled: boolean; aiSmartDraft: boolean; aiSentiment: boolean; aiLeadScoring: boolean; aiModel: string;
}

export default function SettingsPage() {
  const { user } = useAuthStore();
  const { fetchSettings: reloadGlobalSettings } = useSettingsStore();
  const perms = user?.permissions || [];
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string | null>('general');

  const form = useForm<Settings>({
    initialValues: {
      siteName: '', siteDescription: '', siteEmail: '', supportPhone: '',
      brandColor: '#228be6', logoUrl: '', darkSidebar: false,
      forceMfa: false, sessionTimeout: 60, allowedDomains: '',
      aiEnabled: false, aiSmartDraft: false, aiSentiment: false, aiLeadScoring: false, aiModel: 'gpt-3.5-turbo'
    },
  });

  const canGen = perms.includes('settings:general:manage') || perms.includes('rbac:manage');
  const canApp = perms.includes('settings:appearance:manage') || perms.includes('rbac:manage');
  const canSec = perms.includes('settings:security:manage') || perms.includes('rbac:manage');
  const canAi  = perms.includes('settings:ai:manage') || perms.includes('rbac:manage');

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const res = await api.get('/settings');
        if (res.data) {
             const cleanData = { ...res.data };
             ['aiEnabled', 'aiSmartDraft', 'aiSentiment', 'aiLeadScoring', 'darkSidebar', 'forceMfa'].forEach(k => {
                 // @ts-ignore
                 if (cleanData[k] === 'true') cleanData[k] = true;
                 // @ts-ignore
                 if (cleanData[k] === 'false') cleanData[k] = false;
             });
             if (cleanData.sessionTimeout) cleanData.sessionTimeout = Number(cleanData.sessionTimeout);
             form.setValues((prev) => ({ ...prev, ...cleanData }));
             form.resetDirty();
        }
      } catch (err: any) {
        setError(err.response?.status === 403 ? 'You do not have permission to view settings.' : 'Failed to fetch settings data.');
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSubmit = async (values: typeof form.values) => {
    try {
      setLoading(true);
      await api.patch('/settings', values); 
      notifications.show({ title: 'Success', message: 'Configuration saved successfully.', color: 'green' });
      await reloadGlobalSettings();
      form.setInitialValues(values);
      form.resetDirty();
    } catch (err) {
      notifications.show({ title: 'Error', message: 'Failed to save configuration.', color: 'red' });
    } finally {
      setLoading(false);
    }
  };
    
  const handleReindex = async () => {
      if(!confirm('This will wipe and rebuild the search index. Continue?')) return;
      try {
          setLoading(true);
          await api.post('/search/sync'); 
          notifications.show({ title: 'Sync Complete', message: 'Elasticsearch is now up to date.', color: 'blue' });
      } catch(e) { 
          notifications.show({ title: 'Error', message: 'Failed to sync search.', color: 'red' }); 
      } finally { 
          setLoading(false); 
      }
  };

  if (!canGen && !canApp && !canSec && !canAi) return <AdminLayout><Alert color="red">Access Denied</Alert></AdminLayout>;

  return (
    <AdminLayout>
      <Title order={2}>Platform Configuration</Title>
      <Text c="dimmed" mb="xl">Manage global parameters, branding, security policies, and intelligence.</Text>

      <Paper withBorder p="md" radius="md" style={{ position: 'relative' }}>
        <LoadingOverlay visible={loading} />

        {error && <Alert icon={<IconAlertCircle size="1rem" />} title="Error" color="red" mb="md">{error}</Alert>}

        {!error && !loading && (
          <Tabs value={activeTab} onChange={setActiveTab} variant="pills" radius="md">
            <Tabs.List mb="lg" grow>
                {canGen && <Tabs.Tab value="general" leftSection={<IconSettings size={18}/>}>General</Tabs.Tab>}
                {canApp && <Tabs.Tab value="appearance" leftSection={<IconPalette size={18}/>}>Appearance</Tabs.Tab>}
                {canSec && <Tabs.Tab value="security" leftSection={<IconShieldLock size={18}/>}>Security</Tabs.Tab>}
                {canAi && <Tabs.Tab value="ai" leftSection={<IconBrain size={18}/>} color="violet">
                    <Group gap="xs" align="center">
                        <span>AI Intelligence</span>
                        {form.values.aiEnabled && <Badge size="xs" circle color="green" variant="filled" />}
                    </Group>
                </Tabs.Tab>}
            </Tabs.List>

            <form onSubmit={form.onSubmit(handleSubmit)}>
                
                {/* --- GENERAL TAB --- */}
                {canGen && <Tabs.Panel value="general">
                    <Stack gap="lg" maw={600}>
                      <Paper p="md" withBorder>
                          <Title order={5} mb="md">Identity</Title>
                          <Stack gap="sm">
                              <TextInput label="Site Name" description="Appears in browser title." {...form.getInputProps('siteName')} />
                              <Textarea label="Description" {...form.getInputProps('siteDescription')} />
                          </Stack>
                      </Paper>

                      <Paper p="md" withBorder>
                          <Title order={5} mb="md">Contact Info</Title>
                          <Group grow>
                              <TextInput label="Admin Email" {...form.getInputProps('siteEmail')} />
                              <TextInput label="Support Phone" {...form.getInputProps('supportPhone')} />
                          </Group>
                      </Paper>
                      
                      <Paper p="md" withBorder bg="gray.0">
                          <Title order={5} mb="sm">System Maintenance</Title>
                          <Group justify="space-between">
                              <div>
                                  <Text fw={500}>Search Index</Text>
                                  <Text size="xs" c="dimmed">Rebuilds the Elasticsearch index for all modules.</Text>
                              </div>
                              <Button variant="outline" color="orange" onClick={handleReindex} loading={loading}>Re-Index Search</Button>
                          </Group>
                      </Paper>
                    </Stack>
                </Tabs.Panel>}

                {/* --- APPEARANCE TAB --- */}
                {canApp && <Tabs.Panel value="appearance">
                    <Paper p="md" withBorder maw={600}>
                        <Title order={5} mb="md">Theme & Branding</Title>
                        <Stack gap="md">
                            <ColorInput 
                                label="Brand Color" 
                                description="Primary color used for buttons, links, and highlights."
                                {...form.getInputProps('brandColor')} 
                            />
                            
                            <TextInput 
                                label="Logo URL" 
                                placeholder="https://example.com/logo.png"
                                description="Public URL for your dashboard logo (Top Left)."
                                {...form.getInputProps('logoUrl')} 
                            />

                            <Switch 
                                label="Dark Sidebar" 
                                description="Forces the sidebar to be dark even in Light Mode."
                                size="md" 
                                mt="xs"
                                {...form.getInputProps('darkSidebar', { type: 'checkbox' })} 
                            />
                            
                            <Divider my="sm" />
                            
                            <Text size="sm" c="dimmed">
                                The Brand Color is applied instantly. Use the toggle in the top-right to switch between Light and Dark modes.
                            </Text>
                        </Stack>
                    </Paper>
                </Tabs.Panel>}

                {/* --- SECURITY TAB --- */}
                {canSec && <Tabs.Panel value="security">
                    <Stack gap="lg" maw={600}>
                        <Alert color="orange" icon={<IconShieldLock/>}>
                            Changing these settings affects all staff members immediately.
                        </Alert>
                        <Switch label="Enforce 2FA" description="Require Two-Factor Authentication for all staff accounts." size="md" {...form.getInputProps('forceMfa', { type: 'checkbox' })} />
                        <NumberInput label="Session Timeout (Minutes)" description="Auto-logout inactive users." min={5} max={1440} {...form.getInputProps('sessionTimeout')} />
                        <TextInput label="Allowed Email Domains" placeholder="example.com, pixel.com" description="Restrict registration to specific domains (comma separated)." {...form.getInputProps('allowedDomains')} />
                    </Stack>
                </Tabs.Panel>}

                {/* --- AI TAB --- */}
                {canAi && <Tabs.Panel value="ai">
                    <Stack gap="lg" maw={800}>
                        <Alert variant="light" color="violet" title="PixelMind Engine" icon={<IconRobot size={20}/>}>
                            The AI Engine runs in the background to assist staff. Ensure your OpenAI API Key is valid in the backend configuration.
                        </Alert>

                        <Group justify="space-between" p="md" bg="gray.0" style={{ borderRadius: 8 }}>
                            <div>
                                <Text fw={700}>Master AI Switch</Text>
                                <Text size="sm" c="dimmed">Toggle to completely enable/disable all AI processors.</Text>
                            </div>
                            <Switch size="xl" color="violet" onLabel="ON" offLabel="OFF" {...form.getInputProps('aiEnabled', { type: 'checkbox' })} />
                        </Group>

                        <SimpleGrid cols={3} spacing="lg">
                            <Paper withBorder p="md">
                                <Switch label="Smart Drafts" mb="xs" disabled={!form.values.aiEnabled} {...form.getInputProps('aiSmartDraft', { type: 'checkbox' })} />
                                <Text size="xs" c="dimmed">Auto-generates reply suggestions based on KB and history.</Text>
                            </Paper>
                            <Paper withBorder p="md">
                                <Switch label="Sentiment Analysis" mb="xs" disabled={!form.values.aiEnabled} {...form.getInputProps('aiSentiment', { type: 'checkbox' })} />
                                <Text size="xs" c="dimmed">Detects customer mood (Angry/Happy) on every message.</Text>
                            </Paper>
                            <Paper withBorder p="md">
                                <Switch label="Lead Scoring" mb="xs" disabled={!form.values.aiEnabled} {...form.getInputProps('aiLeadScoring', { type: 'checkbox' })} />
                                <Text size="xs" c="dimmed">Ranks contacts based on engagement and spend.</Text>
                            </Paper>
                        </SimpleGrid>

                        <TextInput label="LLM Model" description="Advanced users only. Default: gpt-3.5-turbo" disabled={!form.values.aiEnabled} {...form.getInputProps('aiModel')} />
                    </Stack>
                </Tabs.Panel>}

                <Divider my="xl" />

                <Group justify="flex-end">
                    <Button leftSection={<IconDeviceFloppy size={18}/>} size="md" type="submit" loading={form.submitting} disabled={!form.isDirty()}>
                        Save Configuration
                    </Button>
                </Group>
            </form>
          </Tabs>
        )}
      </Paper>
    </AdminLayout>
  );
}