import { createTheme } from '@mantine/core';

export const theme = createTheme({
  // 1. Typography: Clean and Professional
  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
  headings: {
    fontFamily: 'Inter, sans-serif',
    fontWeight: '700',
  },

  // 2. "Expensive" Radius & Shadows
  defaultRadius: 'md',
  shadows: {
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  },

  // 3. Primary Brand Color
  primaryColor: 'blue',
  primaryShade: 6,

  // 4. Component Defaults
  components: {
    Paper: {
      defaultProps: {
        withBorder: true,
        shadow: 'sm',
      },
    },
    Card: {
      defaultProps: {
        withBorder: true,
        shadow: 'sm',
        padding: 'lg',
      },
    },
    Button: {
      defaultProps: {
        fw: 500,
      },
    },
    // FIX: 'styles' must be an object, not a function, for Next.js serialization
    TextInput: {
      styles: {
        input: {
          backgroundColor: 'var(--mantine-color-body)',
        },
      },
    },
    Select: {
      styles: {
        input: {
          backgroundColor: 'var(--mantine-color-body)',
        },
      },
    },
    Textarea: {
      styles: {
        input: {
          backgroundColor: 'var(--mantine-color-body)',
        },
      },
    },
  },
});