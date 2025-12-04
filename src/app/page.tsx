'use client';

import { AdminLayout } from '@/components/AdminLayout';
import { Title, Grid, Paper, Text, Group, ThemeIcon, SimpleGrid, Stack, RingProgress, Loader } from '@mantine/core';
import { IconUsers, IconShoppingCart, IconCoin, IconPackage, IconTicket, IconAlertTriangle } from '@tabler/icons-react';
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/analytics/dashboard')
      .then(res => setStats(res.data))
      .catch(() => console.error('Failed to load stats'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <AdminLayout><Loader /></AdminLayout>;
  if (!stats) return <AdminLayout><Text>No data available.</Text></AdminLayout>;

  return (
    <AdminLayout>
      <Title order={2} mb="lg">Dashboard Overview</Title>
      
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} mb="lg">
        {/* HR Stats */}
        {stats.totalStaff !== undefined && (
          <StatCard 
            title="Total Staff" 
            value={stats.totalStaff} 
            icon={<IconUsers />} 
            color="blue"
            subtext={`${stats.newStaffLast30Days} new this month`}
          />
        )}
        
        {/* Finance Stats */}
        {stats.totalRevenue !== undefined && (
          <StatCard 
            title="Total Revenue" 
            value={`$${stats.totalRevenue.toLocaleString()}`} 
            icon={<IconCoin />} 
            color="green" 
          />
        )}

        {/* E-commerce Stats */}
        {stats.totalOrders !== undefined && (
          <StatCard 
            title="Total Orders" 
            value={stats.totalOrders} 
            icon={<IconShoppingCart />} 
            color="violet" 
          />
        )}

        {/* Product Stats */}
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
        {/* Revenue Chart */}
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
        
        {/* Support / Health Widgets */}
        <Grid.Col span={{ base: 12, md: 4 }}>
           <Stack>
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

             {/* Add more widgets here later */}
           </Stack>
        </Grid.Col>
      </Grid>
    </AdminLayout>
  );
}