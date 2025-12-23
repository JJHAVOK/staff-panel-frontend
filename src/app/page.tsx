'use client';

import { AdminLayout } from '@/components/AdminLayout';
import { Title, Grid, Paper, Text, Group, ThemeIcon, SimpleGrid, Stack, RingProgress, Loader, Center } from '@mantine/core';
import { IconUsers, IconShoppingCart, IconCoin, IconPackage, IconTicket, IconMoodSmile, IconMoodSad, IconRobot } from '@tabler/icons-react';
import { AreaChart } from '@mantine/charts';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/authStore';

function StatCard({ title, value, icon, color, subtext }: any) {
  return (
    <Paper withBorder p="md" radius="md">
      <Group justify="space-between">
        <div>
          <Text c="dimmed" tt="uppercase" fw={700} size="xs">{title}</Text>
          <Text fw={700} size="xl">{value}</Text>
        </div>
        <ThemeIcon color={color} variant="light" size={38} radius="md">{icon}</ThemeIcon>
      </Group>
      {subtext && <Text c="dimmed" size="xs" mt="sm">{subtext}</Text>}
    </Paper>
  );
}

export default function Dashboard() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<any>(null);
  const [aiStats, setAiStats] = useState<any>({ happy: 0, angry: 0, neutral: 0 }); // New AI State
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
        try {
            // 1. Load your existing analytics
            const res = await api.get('/analytics/dashboard');
            setStats(res.data);

            // 2. Load Ticket Sentiment (Helper fetch)
            const ticketsRes = await api.get('/helpdesk');
            const tickets = ticketsRes.data || [];
            const happy = tickets.filter((t: any) => t.sentimentLabel === 'HAPPY').length;
            const angry = tickets.filter((t: any) => t.sentimentLabel === 'ANGRY').length;
            const neutral = tickets.length - happy - angry;
            setAiStats({ happy, angry, neutral });

        } catch(e) { console.error(e); } 
        finally { setLoading(false); }
    };
    load();
  }, []);

  if (loading) return <AdminLayout><Loader /></AdminLayout>;
  if (!stats) return <AdminLayout><Text>No data available.</Text></AdminLayout>;

  return (
    <AdminLayout>
      <Title order={2} mb="lg">Dashboard Overview</Title>
      
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} mb="lg">
        {/* --- EXISTING STATS --- */}
        {stats.totalStaff !== undefined && (
          <StatCard 
            title="Total Staff" 
            value={stats.totalStaff} 
            icon={<IconUsers />} 
            color="blue"
            subtext={`${stats.newStaffLast30Days} new this month`}
          />
        )}
        
        {stats.totalRevenue !== undefined && (
          <StatCard 
            title="Total Revenue" 
            value={`$${stats.totalRevenue.toLocaleString()}`} 
            icon={<IconCoin />} 
            color="green" 
          />
        )}

        {stats.totalOrders !== undefined && (
          <StatCard 
            title="Total Orders" 
            value={stats.totalOrders} 
            icon={<IconShoppingCart />} 
            color="violet" 
          />
        )}

        {stats.activeProducts !== undefined && (
          <StatCard 
            title="Active Products" 
            value={stats.activeProducts} 
            icon={<IconPackage />} 
            color="cyan" 
            subtext={stats.lowStockCount > 0 ? `${stats.lowStockCount} Low Stock Items` : 'Stock Healthy'}
          />
        )}
      </SimpleGrid>
      
      <Grid>
        {/* Revenue Chart (Existing) */}
        {stats.revenueChart && (
          <Grid.Col span={{ base: 12, md: 8 }}>
             <Paper withBorder p="md" radius="md">
                <Title order={4} mb="md">Revenue (Last 7 Days)</Title>
                <AreaChart
                  h={300}
                  data={stats.revenueChart}
                  dataKey="date"
                  series={[{ name: 'value', color: 'indigo.6', label: 'Sales' }]}
                  curveType="linear"
                />
             </Paper>
          </Grid.Col>
        )}
        
        {/* Support / AI Widget (Merged) */}
        <Grid.Col span={{ base: 12, md: 4 }}>
           <Stack>
             {/* Ticket Status */}
             {stats.openTickets !== undefined && (
               <Paper withBorder p="md" radius="md">
                  <Title order={4} mb="md">Support Status</Title>
                  <Group>
                    <RingProgress 
                       size={80} 
                       thickness={8} 
                       roundCaps 
                       sections={[{ value: 100, color: stats.urgentTickets > 0 ? 'red' : 'blue' }]} 
                       label={<ThemeIcon color={stats.urgentTickets > 0 ? 'red' : 'blue'} variant="light" radius="xl"><IconTicket size={20}/></ThemeIcon>}
                    />
                    <div>
                      <Text fw={700} size="xl">{stats.openTickets}</Text>
                      <Text size="xs" c="dimmed">Open Tickets</Text>
                      {stats.urgentTickets > 0 && <Text size="xs" c="red" fw={700}>{stats.urgentTickets} Urgent</Text>}
                    </div>
                  </Group>
               </Paper>
             )}

             {/* --- 👇 NEW AI SENTIMENT WIDGET 👇 --- */}
             <Paper withBorder p="md" radius="md">
                  <Title order={4} mb="md">Customer Sentiment (AI)</Title>
                  <Group>
                      <RingProgress
                        size={100}
                        thickness={8}
                        sections={[
                            { value: (aiStats.happy / (stats.openTickets || 1)) * 100, color: 'green' },
                            { value: (aiStats.angry / (stats.openTickets || 1)) * 100, color: 'red' },
                            { value: (aiStats.neutral / (stats.openTickets || 1)) * 100, color: 'gray' },
                        ]}
                        label={<Center><IconRobot size={20} /></Center>}
                      />
                      <Stack gap={0}>
                          <Group gap="xs"><IconMoodSmile size={14} color="green"/><Text size="xs">Happy: {aiStats.happy}</Text></Group>
                          <Group gap="xs"><IconMoodSad size={14} color="red"/><Text size="xs">Angry: {aiStats.angry}</Text></Group>
                      </Stack>
                  </Group>
             </Paper>
             {/* --- 👆 END NEW --- */}
           </Stack>
        </Grid.Col>
      </Grid>
    </AdminLayout>
  );
}