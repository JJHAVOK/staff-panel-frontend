'use client';

import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import {
  Title, Text, Button, Group, Table, Modal, TextInput, NumberInput,
  Textarea, Stack, Paper, LoadingOverlay, Badge, ActionIcon,
  Switch, Select, Tooltip, Tabs, Image, SimpleGrid, rem, Menu
} from '@mantine/core';
import { Dropzone, MIME_TYPES } from '@mantine/dropzone';
import { useForm } from '@mantine/form';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { 
  IconAlertTriangle, IconPlus, IconTrash, IconBox, 
  IconPhoto, IconUpload, IconX, IconPencil, IconDots, 
  IconQrcode, IconPrinter
} from '@tabler/icons-react';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/authStore';
import { useRouter } from 'next/navigation';
// 👇 NEW IMPORT
import { DataActions } from '@/components/DataActions/DataActions';

interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  type: string;
  isActive: boolean;
  description?: string | null;
  variants: { stock: number; sku: string }[];
  documents: { id: string; name: string; }[];
}

function ProductImagesTab({ productId }: { productId: string }) {
  const [images, setImages] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
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
    } finally { setUploading(false); }
  };
  return (
    <Stack>
      <Dropzone onDrop={handleUpload} maxSize={5 * 1024 ** 2} accept={[MIME_TYPES.png, MIME_TYPES.jpeg]} loading={uploading}>
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
  const router = useRouter();
  const userPermissions = user?.permissions || [];
  const canManage = userPermissions.includes('ecommerce:products:update'); 
  const canDelete = userPermissions.includes('ecommerce:products:delete');

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpened, { open, close }] = useDisclosure(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrData, setQrData] = useState<{ productName: string, sku: string, qrCodeUrl: string } | null>(null);

  const form = useForm({
    initialValues: { name: '', slug: '', price: 0, description: '', isActive: true, type: 'PHYSICAL', sku: '', initialStock: 0 },
    validate: { name: (val) => (val.length < 2 ? 'Name too short' : null), sku: (val) => (val.length < 2 ? 'SKU is required' : null) },
  });

  const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const name = event.currentTarget.value;
    form.setFieldValue('name', name);
    if (!editingProduct) { 
      if (!form.isDirty('slug')) form.setFieldValue('slug', name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''));
      if (!form.isDirty('sku')) form.setFieldValue('sku', name.toUpperCase().replace(/\s+/g, '').substring(0, 6) + '-001');
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await api.get('/ecommerce/products');
      setProducts(res.data);
    } catch (e) { notifications.show({ title: 'Error', message: 'Could not fetch products.', color: 'red' }); } 
    finally { setLoading(false); }
  };

  useEffect(() => { fetchProducts(); }, []);

  const handleOpenCreate = () => { setEditingProduct(null); form.reset(); open(); };

  const handleOpenEdit = (product: Product) => {
    setEditingProduct(product);
    const variant = product.variants[0];
    form.setValues({
      name: product.name, slug: product.slug, price: product.price, description: product.description || '',
      isActive: product.isActive, type: product.type, sku: variant?.sku || '', initialStock: variant?.stock || 0, 
    });
    open();
  };

  const handleSubmit = async (values: typeof form.values) => {
    try {
      if (editingProduct) {
        await api.patch(`/ecommerce/products/${editingProduct.id}`, values);
        notifications.show({ title: 'Success', message: 'Product updated.', color: 'green' });
      } else {
        await api.post('/ecommerce/products', values);
        notifications.show({ title: 'Success', message: 'Product created.', color: 'green' });
      }
      close(); form.reset(); setEditingProduct(null); fetchProducts();
    } catch (e: any) { notifications.show({ title: 'Error', message: e.response?.data?.message || 'Failed.', color: 'red' }); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this product?')) return;
    try {
      await api.delete(`/ecommerce/products/${id}`);
      notifications.show({ title: 'Deleted', message: 'Product removed.', color: 'green' });
      fetchProducts();
    } catch (e) { notifications.show({ title: 'Error', message: 'Could not delete product.', color: 'red' }); }
  };

  const handleViewQr = async (id: string) => {
      try {
          const res = await api.get(`/ecommerce/products/${id}/barcode`);
          setQrData(res.data);
          setQrModalOpen(true);
      } catch(e) { notifications.show({ title: 'Error', message: 'Failed to generate QR', color: 'red' }); }
  };

  const handlePrint = () => {
      const printWindow = window.open('', '_blank');
      if (printWindow && qrData) {
          printWindow.document.write(`<html><head><title>Label</title></head><body style="text-align: center; font-family: sans-serif;"><h2>${qrData.productName}</h2><p>SKU: ${qrData.sku}</p><img src="${qrData.qrCodeUrl}" width="300" /><script>window.print();</script></body></html>`);
          printWindow.document.close();
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
            <div><Text fw={500}>{product.name}</Text><Text size="xs" c="dimmed">{product.type} • {sku}</Text></div>
          </Group>
        </Table.Td>
        <Table.Td>${product.price.toFixed(2)}</Table.Td>
        <Table.Td>
          {product.type === 'PHYSICAL' ? <Group gap={4}><Text>{stock}</Text>{isLowStock && <IconAlertTriangle size={14} color="orange" />}</Group> : <Text c="dimmed">-</Text>}
        </Table.Td>
        <Table.Td>{product.isActive ? <Badge color="green" variant="dot">Active</Badge> : <Badge color="gray">Draft</Badge>}</Table.Td>
        <Table.Td>
          <Menu shadow="md" width={200}>
            <Menu.Target><ActionIcon variant="subtle"><IconDots size={16}/></ActionIcon></Menu.Target>
            <Menu.Dropdown>
              {canManage && <Menu.Item leftSection={<IconPencil size={14}/>} onClick={() => handleOpenEdit(product)}>Edit Product</Menu.Item>}
              <Menu.Item leftSection={<IconQrcode size={14}/>} onClick={() => handleViewQr(product.id)}>Barcode / Label</Menu.Item>
              <Menu.Divider />
              {canDelete && <Menu.Item color="red" leftSection={<IconTrash size={14}/>} onClick={() => handleDelete(product.id)}>Delete Product</Menu.Item>}
            </Menu.Dropdown>
          </Menu>
        </Table.Td>
      </Table.Tr>
    );
  });

  return (
    <AdminLayout>
      <Group justify="space-between" mb="xl">
        <Title order={2}>Product Catalog</Title>
        <Group>
            {/* 👇 ADDED IMPORT/EXPORT BUTTONS */}
            <DataActions entity="products" onImportSuccess={fetchProducts} />
            {canManage && <Button leftSection={<IconPlus size={16} />} onClick={handleOpenCreate}>Add Product</Button>}
        </Group>
      </Group>

      <Paper withBorder radius="md">
        <LoadingOverlay visible={loading} />
        <Table striped highlightOnHover>
          <Table.Thead><Table.Tr><Table.Th>Name / SKU</Table.Th><Table.Th>Price</Table.Th><Table.Th>Stock</Table.Th><Table.Th>Status</Table.Th><Table.Th>Actions</Table.Th></Table.Tr></Table.Thead>
          <Table.Tbody>{rows}</Table.Tbody>
        </Table>
      </Paper>

      {/* --- QR MODAL --- */}
      <Modal opened={qrModalOpen} onClose={() => setQrModalOpen(false)} title="Product Label" centered>
          {qrData && (
              <Stack align="center">
                  <Title order={4}>{qrData.productName}</Title>
                  <Badge variant="outline">{qrData.sku}</Badge>
                  <Image src={qrData.qrCodeUrl} w={200} />
                  <Group>
                      <Button leftSection={<IconPrinter size={16}/>} onClick={handlePrint}>Print Label</Button>
                      <Button variant="default" onClick={() => setQrModalOpen(false)}>Close</Button>
                  </Group>
              </Stack>
          )}
      </Modal>

      {/* CREATE/EDIT MODAL */}
      <Modal opened={modalOpened} onClose={close} title={editingProduct ? "Edit Product" : "Add New Product"} size="lg">
         <Tabs defaultValue="details">
            <Tabs.List>
               <Tabs.Tab value="details">Details</Tabs.Tab>
               {editingProduct && <Tabs.Tab value="images">Images</Tabs.Tab>}
            </Tabs.List>
            <Tabs.Panel value="details" pt="md">
                <form onSubmit={form.onSubmit(handleSubmit)}>
                   <Stack>
                      <TextInput label="Product Name" placeholder="e.g. Custom Website" required {...form.getInputProps('name')} onChange={handleNameChange} />
                      <TextInput label="Slug" placeholder="custom-website" required {...form.getInputProps('slug')} />
                      <Group grow>
                         <Select label="Type" data={['PHYSICAL', 'SERVICE', 'CUSTOM', 'DIGITAL']} required {...form.getInputProps('type')} />
                         <NumberInput label="Base Price" prefix="$" min={0} decimalScale={2} fixedDecimalScale required {...form.getInputProps('price')} />
                      </Group>
                      <Group grow>
                         <TextInput label="SKU" required {...form.getInputProps('sku')} />
                         {form.values.type === 'PHYSICAL' && <NumberInput label="Stock" min={0} {...form.getInputProps('initialStock')} />}
                      </Group>
                      <Textarea label="Description" minRows={3} {...form.getInputProps('description')} />
                      <Switch label="Active (Visible in store)" {...form.getInputProps('isActive', { type: 'checkbox' })} />
                      <Button type="submit" mt="md">{editingProduct ? "Update" : "Create"} Product</Button>
                   </Stack>
                </form>
            </Tabs.Panel>
            {editingProduct && (
               <Tabs.Panel value="images" pt="md"><ProductImagesTab productId={editingProduct.id} /></Tabs.Panel>
            )}
         </Tabs>
      </Modal>
    </AdminLayout>
  );
}