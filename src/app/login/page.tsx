'use client';

import { useState } from 'react';
import { TextInput, PasswordInput, Button, Paper, Title, Container, Alert, LoadingOverlay, PinInput, Group, Text, Stack } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/authStore';
import api from '@/lib/api';
import { IconLock } from '@tabler/icons-react';

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // MFA State
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaCode, setMfaCode] = useState('');

  const form = useForm({
    initialValues: { email: '', password: '' },
    validate: {
      email: (value) => (/^\S+@\S+$/.test(value) ? null : 'Invalid email'),
    },
  });

  const handleLogin = async (values: typeof form.values) => {
    setLoading(true);
    setError(null);
    try {
      // Send login request (with MFA code if we have it)
      const payload = { ...values, code: mfaRequired ? mfaCode : undefined };
      const response = await api.post('/auth/login', payload);
      
      const { access_token, user } = response.data;
      
      // Decode JWT to get user details if not provided in body
      // Assuming backend returns token. We will fetch /profile next.
      // Let's just set token for now and redirect.
      
      // Fetch user profile to get permissions for store
      api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      const profileRes = await api.get('/auth/profile'); // Assuming this exists, or use /user/me
      
      setAuth(access_token, profileRes.data);
      router.push('/');
      
    } catch (err: any) {
      // Check for MFA Requirement
      if (err.response?.data?.message === 'MFA_REQUIRED') {
          setMfaRequired(true);
          setError(null); // Clear error, show input
      } else {
          setError('Invalid email or password');
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle the MFA specific submit
  const handleMfaSubmit = () => {
      if (mfaCode.length !== 6) return;
      handleLogin(form.values);
  };

  return (
    <Container size={420} my={40}>
      <Title ta="center">Staff Portal</Title>

      <Paper withBorder shadow="md" p={30} mt={30} radius="md" style={{ position: 'relative' }}>
        <LoadingOverlay visible={loading} />
        
        {error && <Alert color="red" mb="md">{error}</Alert>}

        {!mfaRequired ? (
            <form onSubmit={form.onSubmit(handleLogin)}>
              <TextInput label="Email" placeholder="you@pixelforgedeveloper.com" required {...form.getInputProps('email')} />
              <PasswordInput label="Password" placeholder="Your password" required mt="md" {...form.getInputProps('password')} />
              <Button fullWidth mt="xl" type="submit">Sign in</Button>
            </form>
        ) : (
            <Stack align="center">
                <IconLock size={48} color="blue" />
                <Text fw={500}>Two-Factor Authentication</Text>
                <Text size="sm" c="dimmed" ta="center">Enter the 6-digit code from your authenticator app.</Text>
                
                <PinInput length={6} type="number" size="lg" value={mfaCode} onChange={setMfaCode} onComplete={handleMfaSubmit} autoFocus />
                
                <Button fullWidth mt="md" onClick={handleMfaSubmit} disabled={mfaCode.length !== 6}>Verify</Button>
                <Button variant="subtle" size="xs" onClick={() => setMfaRequired(false)}>Back to Login</Button>
            </Stack>
        )}
      </Paper>
    </Container>
  );
}