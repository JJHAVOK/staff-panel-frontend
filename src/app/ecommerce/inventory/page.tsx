'use client';

import { useState } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { Title, Paper, TextInput, Group, Button, Card, Text, Badge } from '@mantine/core';
import { IconScan, IconSearch } from '@tabler/icons-react';
import api from '@/lib/api';

export default function InventoryScannerPage() {
  const [scanInput, setScanInput] = useState('');
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleScan = async (e: React.FormEvent) => {
      e.preventDefault();
      if(!scanInput) return;
      setLoading(true);
      setProduct(null);
      
      try {
          let idToFetch = scanInput;
          try {
             // Handle QR JSON payload
             const parsed = JSON.parse(scanInput);
             if (parsed.id) idToFetch = parsed.id;
          } catch(e) {}

          const res = await api.get(`/ecommerce/products/${idToFetch}`);
          setProduct(res.data);
      } catch(err) {
          alert('Product not found or invalid code.');
      } finally {
          setLoading(false);
          setScanInput(''); 
      }
  };

  return (
    <AdminLayout>
       <Title order={2} mb="xl">Inventory Scanner</Title>
       
       <Paper p="xl" withBorder radius="md" mb="xl">
          <form onSubmit={handleScan}>
              <Group align="end">
                  <TextInput 
                     label="Scan Barcode / Enter ID" 
                     placeholder="Click here and scan..." 
                     value={scanInput} 
                     onChange={(e) => setScanInput(e.target.value)}
                     leftSection={<IconScan size={16}/>}
                     style={{ flex: 1 }}
                     autoFocus
                  />
                  <Button type="submit" loading={loading} leftSection={<IconSearch size={16}/>}>Lookup</Button>
              </Group>
          </form>
       </Paper>

       {product && (
           <Card withBorder padding="lg" radius="md">
               <Group justify="space-between" mt="md" mb="xs">
                  <Text fw={500}>{product.name}</Text>
                  <Badge color={product.isActive ? 'green' : 'pink'}>{product.isActive ? 'Active' : 'Inactive'}</Badge>
               </Group>
               <Text size="sm" c="dimmed">{product.description}</Text>
               <Text mt="md" size="xl" fw={700}>${product.price}</Text>
               
               <Group mt="md">
                   <Button variant="light">Adjust Stock</Button>
                   <Button variant="outline">View Details</Button>
               </Group>
           </Card>
       )}
    </AdminLayout>
  );
}