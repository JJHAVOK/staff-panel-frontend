'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation'; // 👈 Added
import { useAuthStore } from '@/lib/authStore'; // 👈 Added
import { AdminLayout } from '@/components/AdminLayout';
import {
  Title, Text, Group, Paper, Grid, Badge, Table, ScrollArea, Button, Stack, 
  Progress, SimpleGrid, Tabs, TextInput, Select, ActionIcon, Alert, Drawer, Code, Card, RingProgress, Loader, Center, Divider, Accordion
} from '@mantine/core';
import { 
    IconShieldLock, IconActivity, IconWorld, IconTrash, IconPlus, IconServer, IconInfoCircle, 
    IconBook, IconUserMinus, IconAlertTriangle, IconLockAccess, IconFlame, IconEye
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import api from '@/lib/api';
import { useDisclosure } from '@mantine/hooks';

export default function SocDashboard() {
  const { user } = useAuthStore(); // 👈 Fixed: Defined user
  const router = useRouter();      // 👈 Fixed: Defined router
  
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [docOpened, { open: openDoc, close: closeDoc }] = useDisclosure(false);
  const [banForm, setBanForm] = useState({ ip: '', reason: '', days: 30 });

  // 🔒 RBAC CHECK
  useEffect(() => {
      if (user && !user.permissions.includes('security:read')) {
          router.replace('/'); // Kick out if no permission
      }
  }, [user, router]);

  const fetchIntel = async () => {
    try {
      const res = await api.get('/soc/dashboard');
      if (res.data) setData(res.data);
    } catch (e) { 
      if (!data) notifications.show({ title: 'Comm-Link Failure', message: 'Connecting to Sentinel...', color: 'orange' }); 
    } finally { setLoading(false); }
  };

  useEffect(() => { 
      fetchIntel();
      const interval = setInterval(fetchIntel, 10000); 
      return () => clearInterval(interval);
  }, []);

  const handleBan = async () => {
    if (!banForm.ip) return;
    try {
      await api.post('/soc/firewall/ban', banForm);
      notifications.show({ title: 'Neutralized', message: `Target IP ${banForm.ip} blacklisted.`, color: 'red' });
      fetchIntel();
      setBanForm({ ip: '', reason: '', days: 30 });
    } catch (e) { notifications.show({ title: 'Error', message: 'Command rejected.', color: 'red' }); }
  };

  const handleUnban = async (ip: string) => {
    try {
      await api.delete(`/soc/firewall/ban/${ip}`);
      notifications.show({ title: 'Released', message: `IP ${ip} restriction lifted.`, color: 'blue' });
      fetchIntel();
    } catch (e) { console.error(e); }
  };

  const toggleGeo = async (code: string, country: string, block: boolean) => {
      try {
          await api.post('/soc/firewall/geo', { code, country, block });
          fetchIntel();
          notifications.show({ title: 'Border Status Changed', message: `${country} is now ${block ? 'Blocked' : 'Allowed'}.`, color: block ? 'red' : 'green' });
      } catch (e) { console.error(e); }
  }

  const getThreatColor = (level: string) => {
      if (level === 'HIGH') return 'red';
      if (level === 'ELEVATED') return 'orange';
      return 'green';
  };

  if (!data) return <AdminLayout><Center h={400}><Stack align="center"><Loader color="red" type="bars"/><Text>Establishing Uplink...</Text></Stack></Center></AdminLayout>;

  // Safe Accessors
  const cpu = data.metrics?.cpuUsage || 0;
  const ramPercent = data.metrics?.ram?.percent || 0;
  const ramText = data.metrics?.ram ? `${data.metrics.ram.used} / ${data.metrics.ram.total}` : 'N/A';
  const bansCount = data.bans?.length || 0;
  const threatLevel = data.stats?.threatLevel || 'LOW';
  const blocks24h = data.stats?.blocks24h || 0;
  const failures24h = data.stats?.failures24h || 0;
  const logs = data.feed || [];
  const geos = data.geos || [];

  return (
    <AdminLayout>
      <Drawer opened={docOpened} onClose={closeDoc} title="🛡️ Security Operations Protocols (SOP)" size="xl" position="right">
          <ScrollArea h="calc(100vh - 80px)">
            <Stack gap="xl" p="md">
                
                <Alert icon={<IconAlertTriangle/>} title="Active Defense Doctrine" color="red" variant="filled">
                    PixelForge Sentinel operates on a "Zero Trust" model. All unauthorized traffic patterns are treated as hostile until proven otherwise.
                </Alert>

                <Divider label="INCIDENT RESPONSE" labelPosition="center" />

                <Accordion variant="separated">
                    <Accordion.Item value="ddos">
                        <Accordion.Control icon={<IconShieldLock color="red"/>}>Protocol: DDoS / Flood Attack</Accordion.Control>
                        <Accordion.Panel>
                            <Text size="sm" fw={700}>Triggers:</Text>
                            <Text size="sm" mb="xs">CPU Load {'>'} 80%, Request Rate {'>'} 500/min.</Text>
                            <Text size="sm" fw={700}>Response Actions:</Text>
                            <Code block>
                                1. Identify Source IP in Live Feed.
                                2. Execute Manual Ban (Permanent).
                                3. If distributed (Botnet), enable Geo-Fencing for high-risk regions (CN, RU, etc).
                                4. Contact Cloudflare Support if L7 attack persists.
                            </Code>
                        </Accordion.Panel>
                    </Accordion.Item>

                    <Accordion.Item value="brute">
                        <Accordion.Control icon={<IconLockAccess color="orange"/>}>Protocol: Credential Stuffing</Accordion.Control>
                        <Accordion.Panel>
                            <Text size="sm">If "Auth Failures" metric spikes:</Text>
                            <Code block>
                                1. Review Audit Logs for "LOGIN_FAILED".
                                2. If single target user: Force Password Reset & MFA.
                                3. If multiple users: Ban Source IP immediately.
                            </Code>
                        </Accordion.Panel>
                    </Accordion.Item>

                    <Accordion.Item value="honey">
                        <Accordion.Control icon={<IconFlame color="yellow"/>}>Protocol: Honeypot Traps</Accordion.Control>
                        <Accordion.Panel>
                            <Text size="sm">The system automatically bans IPs accessing:</Text>
                            <Code block>/wp-login.php, /admin/config.php, /.env, /xmlrpc.php</Code>
                            <Text size="sm" mt="xs">These bans are valid for 365 days. No manual intervention required unless a false positive occurs (unlikely).</Text>
                        </Accordion.Panel>
                    </Accordion.Item>
                </Accordion>

                <Divider label="SYSTEM HARDENING TIPS" labelPosition="center" />

                <SimpleGrid cols={2}>
                    <Paper withBorder p="sm" bg="gray.0">
                        <Text fw={700} size="sm" c="blue">Honeypots</Text>
                        <Text size="xs">Do not visit `/wp-login.php` yourself. You will be banned. Use a mobile hotspot to unban yourself if this happens.</Text>
                    </Paper>
                    <Paper withBorder p="sm" bg="gray.0">
                        <Text fw={700} size="sm" c="violet">Geo-Fencing</Text>
                        <Text size="xs">Only use Geo-Blocking for regions where you do no business. Blocking 'US' will kill traffic.</Text>
                    </Paper>
                    <Paper withBorder p="sm" bg="gray.0">
                        <Text fw={700} size="sm" c="green">Rate Limits</Text>
                        <Text size="xs">API allows 100 req/min per IP. Legitimate bulk operations should use API Keys.</Text>
                    </Paper>
                    <Paper withBorder p="sm" bg="gray.0">
                        <Text fw={700} size="sm" c="orange">User Agents</Text>
                        <Text size="xs">Sentinel logs User Agents. "HeadlessChrome" or "Python-requests" are bots.</Text>
                    </Paper>
                </SimpleGrid>

            </Stack>
          </ScrollArea>
      </Drawer>

      <Group justify="space-between" mb="xl">
        <Group>
          <IconShieldLock size={32} color="red" />
          <div>
              <Title order={2}>Command Center (SOC)</Title>
              <Text size="xs" c="dimmed" tt="uppercase" fw={700}>System Level: DEFCON 3</Text>
          </div>
        </Group>
        <Group>
            <Button variant="outline" leftSection={<IconBook size={16}/>} onClick={openDoc}>Protocols</Button>
            <Button variant="light" leftSection={<IconActivity size={16}/>} onClick={fetchIntel}>Sync</Button>
        </Group>
      </Group>

      <Grid>
          {/* --- ROW 1: HARDWARE SENTINEL --- */}
          <Grid.Col span={4}>
            <Paper withBorder p="md" radius="md">
              <Group justify="space-between" mb="xs"><Text size="xs" fw={700} c="dimmed">CPU LOAD</Text><IconActivity size={14}/></Group>
              <Text fw={900} size="xl">{cpu.toFixed(2)}</Text>
              <Progress value={cpu * 10} color="red" mt="sm" size="sm" />
            </Paper>
          </Grid.Col>
          <Grid.Col span={4}>
            <Paper withBorder p="md" radius="md">
              <Group justify="space-between" mb="xs"><Text size="xs" fw={700} c="dimmed">RAM USAGE</Text><IconServer size={14}/></Group>
              <Text fw={900} size="xl">{ramPercent}%</Text>
              <Text size="xs" c="dimmed">{ramText}</Text>
              <Progress value={parseFloat(ramPercent)} color="orange" mt="sm" size="sm" />
            </Paper>
          </Grid.Col>
          <Grid.Col span={4}>
            <Paper withBorder p="md" radius="md">
              <Group justify="space-between" mb="xs"><Text size="xs" fw={700} c="dimmed">ACTIVE BANS</Text><IconUserMinus size={14}/></Group>
              <Text fw={900} size="xl">{bansCount}</Text>
              <Badge color="red" mt="sm">HOSTILE ENTITIES</Badge>
            </Paper>
          </Grid.Col>

          {/* --- ROW 2: THREAT METRICS --- */}
          <Grid.Col span={4}>
              <Paper withBorder p="md" radius="md" h="100%">
                  <Group justify="space-between" mb="md">
                      <Text fw={700} c="dimmed" tt="uppercase">Threat Level</Text>
                      <IconShieldLock size={20} color={getThreatColor(threatLevel)} />
                  </Group>
                  <Group>
                      <RingProgress
                        size={80}
                        roundCaps
                        thickness={8}
                        sections={[{ value: threatLevel === 'HIGH' ? 100 : threatLevel === 'ELEVATED' ? 60 : 20, color: getThreatColor(threatLevel) }]}
                      />
                      <div>
                          <Text fw={900} size="xl" c={getThreatColor(threatLevel)}>
                              {threatLevel}
                          </Text>
                          <Text size="xs" c="dimmed">Global Index</Text>
                      </div>
                  </Group>
              </Paper>
          </Grid.Col>

          <Grid.Col span={4}>
              <Paper withBorder p="md" radius="md" h="100%">
                  <Group justify="space-between" mb="md">
                      <Text fw={700} c="dimmed" tt="uppercase">Iron Dome Blocks (24h)</Text>
                      <IconShieldLock size={20} color="blue" />
                  </Group>
                  <Text fw={900} size="3rem">{blocks24h}</Text>
                  <Badge color="blue" variant="light">Interceptions</Badge>
              </Paper>
          </Grid.Col>

          <Grid.Col span={4}>
              <Paper withBorder p="md" radius="md" h="100%">
                  <Group justify="space-between" mb="md">
                      <Text fw={700} c="dimmed" tt="uppercase">Auth Failures (24h)</Text>
                      <IconAlertTriangle size={20} color="orange" />
                  </Group>
                  <Text fw={900} size="3rem">{failures24h}</Text>
                  <Badge color="orange" variant="light">Brute Force</Badge>
              </Paper>
          </Grid.Col>

          {/* --- MAIN TABS --- */}
          <Grid.Col span={12}>
              <Tabs defaultValue="feed" variant="pills" color="red">
                  <Tabs.List mb="md">
                      <Tabs.Tab value="feed" leftSection={<IconActivity size={14}/>}>Live Intel Feed</Tabs.Tab>
                      <Tabs.Tab value="firewall" leftSection={<IconShieldLock size={14}/>}>Firewall Control</Tabs.Tab>
                      <Tabs.Tab value="geo" leftSection={<IconWorld size={14}/>}>Geo-Fencing</Tabs.Tab>
                  </Tabs.List>

                  <Tabs.Panel value="feed">
                    <Card withBorder radius="md">
                        <ScrollArea h={400}>
                            <Table verticalSpacing="xs">
                                <Table.Thead><Table.Tr><Table.Th>Timestamp</Table.Th><Table.Th>Target IP</Table.Th><Table.Th>Vector</Table.Th><Table.Th>Details</Table.Th><Table.Th>Status</Table.Th></Table.Tr></Table.Thead>
                                <Table.Tbody>
                                    {logs.map((log: any) => (
                                        <Table.Tr key={log.id}>
                                            <Table.Td><Text size="xs">{new Date(log.createdAt).toLocaleString()}</Text></Table.Td>
                                            <Table.Td><Code color="red">{log.targetId}</Code></Table.Td>
                                            <Table.Td><Badge variant="light" color={log.action.includes('HONEYPOT') ? 'orange' : 'blue'}>{log.action}</Badge></Table.Td>
                                            <Table.Td><Text size="xs" truncate>{log.payload?.path || log.payload?.endpoint || JSON.stringify(log.payload)}</Text></Table.Td>
                                            <Table.Td><Badge color="red">INTERCEPTED</Badge></Table.Td>
                                        </Table.Tr>
                                    ))}
                                </Table.Tbody>
                            </Table>
                        </ScrollArea>
                    </Card>
                  </Tabs.Panel>

                  <Tabs.Panel value="firewall">
                      <Grid>
                          <Grid.Col span={4}>
                              <Paper withBorder p="md" radius="md">
                                  <Title order={5} mb="md">Manual Restriction</Title>
                                  <Stack>
                                      <TextInput label="Target IP" placeholder="0.0.0.0" value={banForm.ip} onChange={(e) => setBanForm({...banForm, ip: e.target.value})} />
                                      <TextInput label="Reason" placeholder="Brute force suspected" value={banForm.reason} onChange={(e) => setBanForm({...banForm, reason: e.target.value})} />
                                      <Select label="Duration (Days)" value={banForm.days.toString()} onChange={(v) => setBanForm({...banForm, days: parseInt(v!)})} data={['1', '7', '30', '365']} />
                                      <Button color="red" onClick={handleBan}>Execute Restriction</Button>
                                  </Stack>
                              </Paper>
                          </Grid.Col>
                          <Grid.Col span={8}>
                              <Card withBorder radius="md">
                                  <Title order={5} mb="md">Global Blacklist</Title>
                                  <Table>
                                      <Table.Thead><Table.Tr><Table.Th>IP Address</Table.Th><Table.Th>Reason</Table.Th><Table.Th>Expires</Table.Th><Table.Th>Action</Table.Th></Table.Tr></Table.Thead>
                                      <Table.Tbody>
                                          {data.bans?.map((ban: any) => (
                                              <Table.Tr key={ban.id}>
                                                  <Table.Td><Code>{ban.ipAddress}</Code></Table.Td>
                                                  <Table.Td><Text size="sm">{ban.reason}</Text></Table.Td>
                                                  <Table.Td><Text size="xs">{ban.expiresAt ? new Date(ban.expiresAt).toLocaleDateString() : 'Permanent'}</Text></Table.Td>
                                                  <Table.Td><ActionIcon color="blue" variant="light" onClick={() => handleUnban(ban.ipAddress)}><IconTrash size={14}/></ActionIcon></Table.Td>
                                              </Table.Tr>
                                          ))}
                                      </Table.Tbody>
                                  </Table>
                              </Card>
                          </Grid.Col>
                      </Grid>
                  </Tabs.Panel>

                  <Tabs.Panel value="geo">
                      <Paper withBorder p="md" radius="md">
                          <Title order={5} mb="md">Regional Border Control</Title>
                          <SimpleGrid cols={4}>
                              {[
                                  { code: 'RU', name: 'Russia' },
                                  { code: 'CN', name: 'China' },
                                  { code: 'KP', name: 'North Korea' },
                                  { code: 'IR', name: 'Iran' },
                                  { code: 'UA', name: 'Ukraine' },
                                  { code: 'BR', name: 'Brazil' },
                                  { code: 'IN', name: 'India' },
                                  { code: 'US', name: 'United States' }
                              ].map((country) => {
                                  const isBlocked = geos.some((g: any) => g.code === country.code);
                                  return (
                                      <Paper key={country.code} withBorder p="sm">
                                          <Group justify="space-between">
                                              <Text fw={700}>{country.name}</Text>
                                              <Button size="xs" color={isBlocked ? 'green' : 'red'} onClick={() => toggleGeo(country.code, country.name, !isBlocked)}>
                                                  {isBlocked ? 'Allow' : 'Block'}
                                              </Button>
                                          </Group>
                                      </Paper>
                                  )
                              })}
                          </SimpleGrid>
                      </Paper>
                  </Tabs.Panel>
              </Tabs>
          </Grid.Col>
      </Grid>
    </AdminLayout>
  );
}