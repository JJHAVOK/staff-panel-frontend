'use client';

import { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import {
  Title, Text, Button, Group, Table, Modal, TextInput, NumberInput,
  Textarea, Stack, Paper, LoadingOverlay, Alert, Badge, ActionIcon,
  Switch, Select, Tooltip, Tabs, Image, SimpleGrid, rem
} from '@mantine/core';
import { Dropzone, MIME_TYPES } from '@mantine/dropzone';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { 
  IconAlertCircle, IconPlus, IconTrash, IconBox, IconAlertTriangle, 
  IconPhoto, IconUpload, IconX, IconPencil
} from '@tabler/icons-react';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/authStore';

interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  type: string;
  isActive: boolean;
  description?: string | null;
  variants: { stock: number; sku: string }[];
  documents: { id: string; name: string; }[]; // Images
}

// --- NEW COMPONENT: Product Images Tab ---
function ProductImagesTab({ productId }: { productId: string }) {
  const [images, setImages] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);

  const fetchImages = useCallback(async () => {
    // In a real app, you'd have a specific endpoint or include 'documents' in product fetch
    // For now, we will just refresh the main list to see changes
  }, []);

  const handleUpload = async (files: File[]) => {
    setUploading(true);
    const formData = new FormData();
    formData.append('file', files[0]);

    try {
      await api.post(`/documents/upload/product/${productId}`, formData, {
         headers: { 'Content-Type': 'multipart/form-data' },
      });
      notifications.show({ title: 'Uploaded', message: 'Product image added.', color: 'green' });
    } catch (e) {
      notifications.show({ title: 'Error', message: 'Upload failed.', color: 'red' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Stack>
      <Dropzone
        onDrop={handleUpload}
        maxSize={5 * 1024 ** 2}
        accept={[MIME_TYPES.png, MIME_TYPES.jpeg]}
        loading={uploading}
      >
        <Group justify="center" gap="xl" style={{ minHeight: rem(100), pointerEvents: 'none' }}>
          <Dropzone.Accept><IconUpload size={50} stroke={1.5} /></Dropzone.Accept>
          <Dropzone.Reject><IconX size={50} stroke={1.5} /></Dropzone.Reject>
          <Dropzone.Idle><IconPhoto size={50} stroke={1.5} /></Dropzone.Idle>
          <div>
            <Text size="xl" inline>Drag images here</Text>
            <Text size="sm" c="dimmed" inline mt={7}>Max 5MB per file</Text>
          </div>
        </Group>
      </Dropzone>
      <Text size="sm" c="dimmed">Images uploaded here will appear in the customer store gallery.</Text>
    </Stack>
  );
}

export default function ProductsPage() {
  const { user } = useAuthStore();
  const userPermissions = user?.permissions || [];
  const canManage = userPermissions.includes('manage:products');

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal State
  const [modalOpened, { open, close }] = useDisclosure(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const form = useForm({
    initialValues: {
      name: '',
      slug: '',
      price: 0,
      description: '',
      isActive: true,
      type: 'PHYSICAL',
      sku: '', 
      initialStock: 0,
    },
    validate: {
      name: (val) => (val.length < 2 ? 'Name too short' : null),
      slug: (val) => (val.length < 2 ? 'Slug too short' : null),
      sku: (val) => (val.length < 2 ? 'SKU is required' : null),
    },
  });

  const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const name = event.currentTarget.value;
    form.setFieldValue('name', name);
    if (!editingProduct) { // Only auto-gen on create
      if (!form.isDirty('slug')) form.setFieldValue('slug', name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''));
      if (!form.isDirty('sku')) form.setFieldValue('sku', name.toUpperCase().replace(/\s+/g, '').substring(0, 6) + '-001');
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await api.get('/ecommerce/products');
      setProducts(res.data);
    } catch (e) {
      setError('Could not fetch products.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleOpenCreate = () => {
    setEditingProduct(null);
    form.reset();
    open();
  };

  const handleOpenEdit = (product: Product) => {
    setEditingProduct(product);
    const variant = product.variants[0];
    form.setValues({
      name: product.name,
      slug: product.slug,
      price: product.price,
      description: product.description || '',
      isActive: product.isActive,
      type: product.type,
      sku: variant?.sku || '',
      initialStock: variant?.stock || 0, // Ensure this is set
    });
    open();
  };

  const handleSubmit = async (values: typeof form.values) => {
    try {
      if (editingProduct) {
        // --- UPDATE LOGIC ---
        await api.patch(`/ecommerce/products/${editingProduct.id}`, values);
        notifications.show({ title: 'Success', message: 'Product updated.', color: 'green' });
      } else {
        // --- CREATE LOGIC ---
        await api.post('/ecommerce/products', values);
        notifications.show({ title: 'Success', message: 'Product created.', color: 'green' });
      }
      close();
      form.reset();
      setEditingProduct(null); // Clear editing state
      fetchProducts();
    } catch (e: any) {
      notifications.show({ title: 'Error', message: e.response?.data?.message || 'Failed.', color: 'red' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this product?')) return;
    try {
      await api.delete(`/ecommerce/products/${id}`);
      notifications.show({ title: 'Deleted', message: 'Product removed.', color: 'green' });
      fetchProducts();
    } catch (e) {
      notifications.show({ title: 'Error', message: 'Could not delete product.', color: 'red' });
    }
  };

  const rows = products.map((product) => {
    const stock = product.variants[0]?.stock || 0;
    const sku = product.variants[0]?.sku || 'N/A';
    const isLowStock = product.type === 'PHYSICAL' && stock < 10;

    return (
      <Table.Tr key={product.id}>
        <Table.Td>
          <Group gap="sm">
            <IconBox size={16} />
            <div>
               <Text fw={500}>{product.name}</Text>
               <Text size="xs" c="dimmed">{product.type} • {sku}</Text>
            </div>
          </Group>
        </Table.Td>
        <Table.Td>${product.price.toFixed(2)}</Table.Td>
        <Table.Td>
          {product.type === 'PHYSICAL' ? (
             <Group gap={4}>
               <Text>{stock}</Text>
               {isLowStock && <Tooltip label="Low Stock"><IconAlertTriangle size={14} color="orange" /></Tooltip>}
             </Group>
          ) : (
            <Text c="dimmed">-</Text>
          )}
        </Table.Td>
        <Table.Td>
          {product.isActive ? <Badge color="green" variant="dot">Active</Badge> : <Badge color="gray">Draft</Badge>}
        </Table.Td>
        <Table.Td>
          {canManage && (
            <Group gap="xs">
              {/* Edit Button (Opens Modal with Tabs) */}
              <ActionIcon variant="subtle" onClick={() => handleOpenEdit(product)}>
                <IconPencil size={16} />
              </ActionIcon>
              <ActionIcon color="red" variant="subtle" onClick={() => handleDelete(product.id)}>
                <IconTrash size={16} />
              </ActionIcon>
            </Group>
          )}
        </Table.Td>
      </Table.Tr>
    );
  });

  return (
    <AdminLayout>
      <Modal opened={modalOpened} onClose={close} title={editingProduct ? "Edit Product" : "Add New Product"} size="lg">
        <Tabs defaultValue="details">
          <Tabs.List>
            <Tabs.Tab value="details">Details</Tabs.Tab>
            {editingProduct && <Tabs.Tab value="images">Images</Tabs.Tab>}
          </Tabs.List>

          <Tabs.Panel value="details" pt="md">
            <form onSubmit={form.onSubmit(handleSubmit)}>
              <Stack>
                <TextInput 
                  label="Product Name" 
                  placeholder="e.g. Custom Website" 
                  required 
                  {...form.getInputProps('name')}
                  onChange={handleNameChange}
                />
                <TextInput label="Slug" placeholder="custom-website" required {...form.getInputProps('slug')} />
                
                <Group grow>
                  <Select 
                    label="Type" 
                    data={['PHYSICAL', 'SERVICE', 'CUSTOM', 'DIGITAL']}
                    required
                    {...form.getInputProps('type')}
                  />
                   <NumberInput label="Base Price" prefix="$" min={0} decimalScale={2} required {...form.getInputProps('price')} />
                </Group>

                {/* --- 👇 SKU IS NOW ALWAYS VISIBLE 👇 --- */}
                <Group grow>
                  <TextInput label="SKU" required {...form.getInputProps('sku')} />
                  {/* --- 👇 STOCK IS CONDITIONAL 👇 --- */}
                  {form.values.type === 'PHYSICAL' && (
                    <NumberInput label="Stock" min={0} {...form.getInputProps('initialStock')} />
                  )}
                </Group>

                <Textarea label="Description" minRows={3} {...form.getInputProps('description')} />
                <Switch label="Active (Visible in store)" {...form.getInputProps('isActive', { type: 'checkbox' })} />
                <Button type="submit" mt="md">{editingProduct ? "Update" : "Create"} Product</Button>
              </Stack>
            </form>
          </Tabs.Panel>

          {editingProduct && (
            <Tabs.Panel value="images" pt="md">
              <ProductImagesTab productId={editingProduct.id} />
            </Tabs.Panel>
          )}
        </Tabs>
      </Modal>

      <Group justify="space-between" mb="xl">
        <Group>
          <IconBox size={32} />
          <Title order={2}>Product Catalog</Title>
        </Group>
        {canManage && (
          <Button leftSection={<IconPlus size={16} />} onClick={handleOpenCreate}>
            Add Product
          </Button>
        )}
      </Group>

      <Paper withBorder p="md" radius="md" style={{ position: 'relative' }}>
        <LoadingOverlay visible={loading} />
        {error && <Alert icon={<IconAlertCircle size="1rem" />} title="Error" color="red">{error}</Alert>}
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Name / SKU</Table.Th>
              <Table.Th>Price</Table.Th>
              <Table.Th>Stock</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>{rows}</Table.Tbody>
        </Table>
      </Paper>
    </AdminLayout>
  );
}