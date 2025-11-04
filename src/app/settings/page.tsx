'use client';

import { AdminLayout } from '@/components/AdminLayout';
import api from '@/lib/api';
import {
  Title,
  Alert,
  LoadingOverlay,
  Paper,
  Text,
  Stack,
  TextInput,
  Button,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconAlertCircle } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { notifications } from '@mantine/notifications';

// Define the type for our settings object
interface Settings {
  siteName: string;
  siteEmail: string;
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const form = useForm({
    initialValues: {
      siteName: '',
      siteEmail: '',
    },
    validate: {
      siteEmail: (val) => (/^\S+@\S+$/.test(val) ? null : 'Invalid email'),
    },
  });

  // Fetch settings on page load
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const response = await api.get('/settings');
        // Set the form values with data from the API
        form.setValues(response.data);
      } catch (err: any) {
        if (err.response?.status === 403) {
          setError('You do not have permission to view settings.');
        } else {
          setError('Failed to fetch settings data.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle form submit
  const handleSubmit = async (values: Settings) => {
    // Manually filter for changed/dirty values
    const dirtyData: Partial<Settings> = {};
    
    // Loop over the form's current values
    for (const key in values) {
      // Check if the current value is different from the original value
      const initialValue = form.getInitialValues()[key as keyof Settings];
      
      if (values[key as keyof Settings] !== initialValue) {
        // If it's different, add it to the payload
        dirtyData[key as keyof Settings] = values[key as keyof Settings];
      }
    }
    
    try {
      // Send only the changed values
      await api.patch('/settings', dirtyData); 
      
      notifications.show({
        title: 'Success',
        message: 'Settings saved successfully!',
        color: 'green',
      });
      // Reset form 'dirty' state to match the new saved data
      form.setInitialValues(values);
      form.resetDirty();
    } catch (err) {
      console.error(err);
      notifications.show({
        title: 'Error',
        message: 'Failed to save settings.',
        color: 'red',
      });
    }
  };

  return (
    <AdminLayout>
      <Title order={2}>Platform Settings</Title>
      <Text c="dimmed" mb="xl">
        Manage global settings for the entire application.
      </Text>

      <Paper withBorder p="md" radius="md" style={{ position: 'relative' }}>
        <LoadingOverlay visible={loading} />

        {error && (
          <Alert icon={<IconAlertCircle size="1rem" />} title="Error" color="red">
            {error}
          </Alert>
        )}

        {!error && !loading && (
          <form onSubmit={form.onSubmit(handleSubmit)}>
            <Stack>
              <TextInput
                label="Site Name"
                description="The public name of your application."
                {...form.getInputProps('siteName')}
              />
              <TextInput
                label="Site Admin Email"
                description="The main contact email for administrators."
                {...form.getInputProps('siteEmail')}
              />
              <Button
                type="submit"
                loading={form.submitting}
                disabled={!form.isDirty()}
                mt="md"
                style={{ alignSelf: 'flex-start' }}
              >
                Save Settings
              </Button>
            </Stack>
          </form>
        )}
      </Paper>
    </AdminLayout>
  );
}
