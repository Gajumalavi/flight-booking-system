import React from 'react';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import AppRouter from './AppRouter';
import NetworkStatusMonitor from './components/common/NetworkStatusMonitor';
import { AuthProvider } from './contexts/AuthContext';
import RazorpayProvider from './contexts/RazorpayContext';
import { NotificationProvider } from './contexts/NotificationContext';
import jwtDecode from 'jwt-decode';

// Define the type for JWT token payload
interface JwtPayload {
  exp: number;
}

// Check if token is expired and remove if it is
const token = localStorage.getItem('token');
if (token) {
  try {
    const decodedToken = jwtDecode<JwtPayload>(token);
    const currentTime = Date.now() / 1000;

    if (decodedToken.exp < currentTime) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  } catch (error) {
    console.error('Invalid token:', error);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }
}

// Create a theme instance
const theme = createTheme({
  palette: {
    primary: {
      main: '#9C27B0', // Purple
      light: '#BA68C8',
      dark: '#7B1FA2',
      contrastText: '#FFFFFF'
    },
    secondary: {
      main: '#FF7F23', // Orange accent for calls-to-action
      light: '#FFA256',
      dark: '#E67D2E'
    },
    background: {
      default: '#f7f8fa',
      paper: '#FFFFFF'
    },
    error: {
      main: '#f44336',
      light: '#ff7961',
      dark: '#ba000d'
    },
    warning: {
      main: '#ffc107',
      light: '#ffcd38',
      dark: '#c79100'
    },
    info: {
      main: '#2196f3',
      light: '#64b5f6',
      dark: '#0b7dda'
    },
    success: {
      main: '#4caf50',
      light: '#80e27e',
      dark: '#087f23'
    },
    text: {
      primary: '#263238',
      secondary: '#546e7a'
    }
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 700,
    },
    h2: {
      fontWeight: 600,
    },
    h3: {
      fontWeight: 600,
    },
    h4: {
      fontWeight: 600,
      fontSize: '1.75rem',
    },
    h5: {
      fontWeight: 600,
      fontSize: '1.4rem',
    },
    h6: {
      fontWeight: 600,
      fontSize: '1.1rem',
    },
    subtitle1: {
      fontWeight: 500,
      fontSize: '1rem',
    },
    subtitle2: {
      fontWeight: 500,
      fontSize: '0.875rem',
    },
    button: {
      textTransform: 'none',
      fontWeight: 600,
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.5,
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.5,
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          padding: '8px 20px',
          boxShadow: '0 3px 10px rgba(0, 0, 0, 0.1)',
          '&:hover': {
            boxShadow: '0 6px 15px rgba(0, 0, 0, 0.15)',
          },
        },
        contained: {
          '&.MuiButton-containedPrimary': {
            backgroundColor: '#FF7F23',
            '&:hover': {
              backgroundColor: '#E67D2E',
            },
          },
          '&.MuiButton-containedSecondary': {
            backgroundColor: '#FF7F23',
            '&:hover': {
              backgroundColor: '#E67D2E',
            },
          },
        },
        outlined: {
          borderWidth: '1.5px',
          '&:hover': {
            borderWidth: '1.5px',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 6px 18px rgba(0, 0, 0, 0.08)',
          borderRadius: 12,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          boxShadow: '0 6px 18px rgba(0, 0, 0, 0.08)',
          borderRadius: 12,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: {
          margin: '16px 0',
        },
      },
    },
    MuiListItem: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
    MuiAvatar: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        },
      },
    },
    MuiStepLabel: {
      styleOverrides: {
        root: {
          '&.Mui-completed': {
            color: '#4caf50',
          },
          '&.Mui-active': {
            color: '#FF7F23',
          },
        },
      },
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <AuthProvider>
        <NotificationProvider>
          <RazorpayProvider>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <CssBaseline />
              <AppRouter />
              <NetworkStatusMonitor />
            </LocalizationProvider>
          </RazorpayProvider>
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;