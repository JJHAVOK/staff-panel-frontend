'use client';

import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import {
  Title, Text, Button, Group, Table, Card, Badge,
  LoadingOverlay, Alert, Grid, Paper, Drawer
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconAlertCircle, IconBuildingSkyscraper, IconReceipt2 } from '@tabler/icons-react';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/authStore';
import { BillingManager } from '@/components/BillingManager'; 
// 👇 NEW IMPORT
import { DataActions } from '@/components/DataActions/DataActions';

export default function BillingPage() {
  const { user } = useAuthStore();
  const userPermissions = user?.permissions || [];
  const canManage = userPermissions.includes('manage:billing');

  const [orgs, setOrgs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedOrg, setSelectedOrg] = useState<any | null>(null);
  const [drawerOpened, { open, close }] = useDisclosure(false);

  const fetchOrgs = async () => {
    setLoading(true);
    try {
      const response = await api.get('/crm/organizations');
      setOrgs(response.data);
    } catch (err: any) {
      setError('Could not fetch organizations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrgs();
  }, []);

  const handleManageClick = (org: any) => {
    setSelectedOrg(org);
    open();
  };

  const rows = orgs.map((org) => (
    <Table.Tr key={org.id}>
      <Table.Td>
        <Group gap="sm" style={{ cursor: 'pointer' }} onClick={() => handleManageClick(org)}>
          <IconBuildingSkyscraper size={16} />
          <Text fw={500} c="blue">{org.name}</Text>
        </Group>
      </Table.Td>
      <Table.Td>{org.industry || '-'}</Table.Td>
      <Table.Td>
        {org.stripeCustomerId ? (
          <Badge color="green" variant="light">Active Customer</Badge>
        ) : (
          <Badge color="gray" variant="light">No Billing</Badge>
        )}
      </Table.Td>
      <Table.Td>
        <Button 
          size="xs" 
          variant="light" 
          onClick={() => handleManageClick(org)}
          leftSection={<IconReceipt2 size={14} />}
        >
          Manage
        </Button>
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <AdminLayout>
      <Drawer 
        opened={drawerOpened} 
        onClose={close} 
        title={selectedOrg ? `Billing: ${selectedOrg.name}` : 'Billing Details'}
        position="right"
        size="xl"
      >
        {selectedOrg && (
          <BillingManager organizationId={selectedOrg.id} canManage={canManage} />
        )}
      </Drawer>

      <Group justify="space-between" mb="xl">
          <Title order={2}>Billing & Invoices</Title>
          {/* 👇 ADDED EXPORT BUTTON (Export Organizations/Clients List) */}
          <DataActions entity="organizations" canImport={false} /> 
      </Group>

      <Grid mb="xl">
        <Grid.Col span={4}>
          <Card withBorder padding="lg">
            <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Total Organizations</Text>
            <Text fz="xl" fw={700}>{orgs.length}</Text>
          </Card>
        </Grid.Col>
      </Grid>

      <Paper withBorder p="md" radius="md" style={{ position: 'relative' }}>
        <LoadingOverlay visible={loading} />
        <Title order={4} mb="md">Client Accounts</Title>
        
        {error && <Alert icon={<IconAlertCircle size="1rem" />} title="Error" color="red">{error}</Alert>}

        {!error && (
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Organization</Table.Th>
                <Table.Th>Industry</Table.Th>
                <Table.Th>Billing Status</Table.Th>
                <Table.Th>Action</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>{rows}</Table.Tbody>
          </Table>
        )}
      </Paper>
    </AdminLayout>
  );
}