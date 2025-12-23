import { useState } from 'react';
import { Button, Menu, FileButton, Group } from '@mantine/core';
import { IconDownload, IconUpload, IconFileTypeCsv, IconFileSpreadsheet } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import api from '@/lib/api';

interface DataActionsProps {
  entity: 'contacts' | 'deals' | 'timesheets' | 'staff' | 'invoices' | 'products' | 'organizations' | 'orders'; // Added orders/orgs
  onImportSuccess?: () => void;
  canImport?: boolean;
  exportParams?: Record<string, string>; // 👈 NEW: Allow custom params
}

export function DataActions({ entity, onImportSuccess, canImport = true, exportParams = {} }: DataActionsProps) {
  const [uploading, setUploading] = useState(false);

  const handleExport = async (format: 'csv' | 'xlsx') => {
    try {
      notifications.show({ id: 'export', title: 'Exporting...', message: 'Generating file...', loading: true });
      
      const response = await api.get(`/data/export/${entity}`, {
        params: { format, ...exportParams }, // 👈 Pass params here
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      // Handle "scope" in filename if present
      const suffix = exportParams.scope ? `_${exportParams.scope}` : '';
      link.setAttribute('download', `${entity}${suffix}_export_${new Date().toISOString().split('T')[0]}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      notifications.update({ id: 'export', title: 'Success', message: 'Download started.', color: 'green', loading: false });
    } catch (e) {
      notifications.update({ id: 'export', title: 'Error', message: 'Export failed.', color: 'red', loading: false });
    }
  };

  const handleImport = async (file: File | null) => {
    if (!file) return;
    setUploading(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post(`/data/import/${entity}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const { imported, failed, errors } = res.data;

      notifications.show({
        title: 'Import Complete',
        message: `Imported: ${imported}, Failed: ${failed}`,
        color: failed > 0 ? 'orange' : 'green',
      });

      if (failed > 0) console.error('Import Errors:', errors);
      if (onImportSuccess) onImportSuccess();
    } catch (e: any) {
      notifications.show({ title: 'Error', message: e.response?.data?.message || 'Import failed.', color: 'red' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Group>
      <Menu shadow="md" width={200}>
        <Menu.Target>
          <Button variant="light" leftSection={<IconDownload size={16} />}>Export</Button>
        </Menu.Target>
        <Menu.Dropdown>
          <Menu.Label>Format</Menu.Label>
          <Menu.Item leftSection={<IconFileTypeCsv size={14}/>} onClick={() => handleExport('csv')}>CSV</Menu.Item>
          <Menu.Item leftSection={<IconFileSpreadsheet size={14}/>} onClick={() => handleExport('xlsx')}>Excel</Menu.Item>
        </Menu.Dropdown>
      </Menu>

      {canImport && (
        <FileButton onChange={handleImport} accept=".csv">
          {(props) => (
            <Button {...props} variant="default" leftSection={<IconUpload size={16} />} loading={uploading}>
              Import CSV
            </Button>
          )}
        </FileButton>
      )}
    </Group>
  );
}