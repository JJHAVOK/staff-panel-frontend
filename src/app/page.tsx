'use client';
import { AdminLayout } from '@/components/AdminLayout';
import { Title, Grid, Paper, Text, Group, ThemeIcon, SimpleGrid } from '@mantine/core';
import { IconUsers, IconShoppingCart, IconCoin, IconPackage } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import api from '@/lib/api';

function StatCard({ title, value, icon, color }: any) {
  return (
    <Paper withBorder p="md" radius="md">
      <Group justify="space-between">
        <div>
          <Text c="dimmed" tt="uppercase" fw={700} size="xs">{title}</Text>
          <Text fw={700} size="xl">{value}</Text>
        </div>
        <ThemeIcon color={color} variant="light" size={38} radius="md">{icon}</ThemeIcon>
      </Group>
    </Paper>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState({ users: 0, orders: 0, revenue: 0, products: 0 });

  useEffect(() => {
    // This fetches stats. In a real production app, you'd make a specific /stats endpoint
    // to avoid fetching ALL data. For this demo, this works.
    const load = async () => {
      try {
        const [u, o, p] = await Promise.all([
           api.get('/user'),
           api.get('/ecommerce/orders'),
           api.get('/ecommerce/products')
        ]);
        
        // Calculate revenue from orders
        const revenue = o.data.reduce((acc: number, curr: any) => acc + curr.totalAmount, 0);
        
        setStats({
          users: u.data.length,
          orders: o.data.length,
          revenue: revenue,
          products: p.data.length
        });
      } catch(e) {}
    };
    load();
  }, []);

  return (
    <AdminLayout>
      <Title order={2} mb="lg">Dashboard Overview</Title>
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>
        <StatCard title="Total Staff" value={stats.users} icon={<IconUsers />} color="blue" />
        <StatCard title="Active Products" value={stats.products} icon={<IconPackage />} color="cyan" />
        <StatCard title="Total Orders" value={stats.orders} icon={<IconShoppingCart />} color="violet" />
        <StatCard title="Revenue" value={`$${stats.revenue.toFixed(2)}`} icon={<IconCoin />} color="green" />
      </SimpleGrid>
    </AdminLayout>
  );
}