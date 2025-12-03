'use client';

import { useState, useEffect } from 'react';
import {
  Button, Modal, Stack, Textarea, Tooltip, Select, Text
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconClockPlay, IconClockOff } from '@tabler/icons-react';
import api from '@/lib/api';
import { useDisclosure } from '@mantine/hooks';

interface Timesheet {
  id: string;
  clockIn: string;
  clockOut: string | null;
  project?: { name: string };
}

export function GlobalClockWidget() {
  const [currentSheet, setCurrentSheet] = useState<Timesheet | null>(null);
  const [projects, setProjects] = useState<{ value: string; label: string }[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modals
  const [outModalOpened, { open: openOut, close: closeOut }] = useDisclosure(false);
  const [inModalOpened, { open: openIn, close: closeIn }] = useDisclosure(false);

  const form = useForm({
    initialValues: { notes: '', projectId: '' },
  });

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await api.get('/timesheets/status');
      setCurrentSheet(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const res = await api.get('/projects');
      setProjects(res.data.map((p: any) => ({ value: p.id, label: p.name })));
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchStatus();
    fetchProjects();
  }, []);

  const handleClockIn = async (values: typeof form.values) => {
    setLoading(true);
    try {
      await api.post('/timesheets/clock-in', { projectId: values.projectId || undefined });
      notifications.show({ title: 'Clocked In', message: 'Shift started.', color: 'green' });
      closeIn();
      fetchStatus();
    } catch (e: any) {
      notifications.show({ title: 'Error', message: e.response?.data?.message || 'Failed.', color: 'red' });
    } finally {
      setLoading(false);
    }
  };

  const handleClockOut = async (values: typeof form.values) => {
    setLoading(true);
    try {
      await api.post('/timesheets/clock-out', { notes: values.notes });
      notifications.show({ title: 'Clocked Out', message: 'Shift ended.', color: 'blue' });
      closeOut();
      form.reset();
      fetchStatus();
    } catch (e: any) {
      notifications.show({ title: 'Error', message: 'Failed.', color: 'red' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Clock IN Modal */}
      <Modal opened={inModalOpened} onClose={closeIn} title="Start Shift">
        <form onSubmit={form.onSubmit(handleClockIn)}>
          <Stack>
            <Select 
              label="Project (Optional)" 
              placeholder="Select project..." 
              data={projects} 
              searchable 
              clearable
              {...form.getInputProps('projectId')} 
            />
            <Button type="submit" color="green">Start Clock</Button>
          </Stack>
        </form>
      </Modal>

      {/* Clock OUT Modal */}
      <Modal opened={outModalOpened} onClose={closeOut} title="End Shift">
        <form onSubmit={form.onSubmit(handleClockOut)}>
          <Stack>
            <Textarea
              label="Shift Notes"
              placeholder="What did you work on?"
              {...form.getInputProps('notes')}
            />
            <Button type="submit" color="blue">End Clock</Button>
          </Stack>
        </form>
      </Modal>

      {currentSheet ? (
        <Tooltip label={`Working on: ${currentSheet.project?.name || 'General'}`}>
          <Button
            color="orange"
            variant="light"
            leftSection={<IconClockOff size={16} />}
            onClick={openOut}
            loading={loading}
          >
            Clock Out
          </Button>
        </Tooltip>
      ) : (
        <Button
          color="green"
          variant="light"
          leftSection={<IconClockPlay size={16} />}
          onClick={openIn}
          loading={loading}
        >
          Clock In
        </Button>
      )}
    </>
  );
}