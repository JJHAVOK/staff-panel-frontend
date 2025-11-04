'use client'; // <-- This is required for interactive components

import {
  TextInput,
  PasswordInput,
  Paper,
  Title,
  Container,
  Button,
  Stack,
  Alert,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/authStore';
import { jwtDecode } from 'jwt-decode'; // <-- We need to install this!

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { setAuth } = useAuthStore();

  const form = useForm({
    initialValues: {
      email: 'admin@pixelforgedeveloper.com',
      password: '9698SuperAdminPass123', // <-- Make sure this matches your seed script
    },
    validate: {
      email: (val) => (/^\S+@\S+$/.test(val) ? null : 'Invalid email'),
      password: (val) =>
        val.length < 6 ? 'Password must be at least 6 characters' : null,
    },
  });

  const handleSubmit = async (values: typeof form.values) => {
    setError(null);
    try {
      // 1. Call the backend API
      const response = await api.post('/auth/login', {
        email: values.email,
        password: values.password,
      });

      const { access_token } = response.data;

      // 2. Decode the token to get user info
      const decoded: {
        email: string;
        roles: string[];
        permissions: string[];
      } = jwtDecode(access_token);

      // 3. Save the token and user info in our global store
      setAuth(access_token, {
        email: decoded.email,
        roles: decoded.roles,
        permissions: decoded.permissions,
      });

      // 4. Redirect to the dashboard
      router.push('/');
    } catch (err) {
      console.error(err);
      setError('Invalid email or password. Please try again.');
    }
  };

  return (
    <Container size={420} my={40}>
      <Title ta="center">Staff Panel Login</Title>
      <Paper withBorder shadow="md" p={30} mt={30} radius="md">
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack>
            <TextInput
              required
              label="Email"
              placeholder="admin@pixelforgedeveloper.com"
              {...form.getInputProps('email')}
            />
            <PasswordInput
              required
              label="Password"
              placeholder="Your password"
              {...form.getInputProps('password')}
            />
            {error && (
              <Alert title="Login Failed" color="red" withCloseButton
                onClose={() => setError(null)}
              >
                {error}
              </Alert>
            )}
            <Button type="submit" loading={form.submitting} fullWidth mt="xl">
              Sign in
            </Button>
          </Stack>
        </form>
      </Paper>
    </Container>
  );
}
