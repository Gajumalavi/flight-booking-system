import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  TextField,
  Switch,
  FormControlLabel,
  Button,
  Divider,
  CircularProgress,
  Snackbar,
  Alert,
  Card,
  CardContent,
  CardHeader,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction
} from '@mui/material';
import axios from 'axios';

interface SystemSettings {
  maintenanceMode: boolean;
  seatReservationTimeout: number;
  emailNotifications: boolean;
  maxBookingsPerUser: number;
  allowMultiCityBookings: boolean;
  allowGuestCheckout: boolean;
  systemVersion: string;
}

const initialSettings: SystemSettings = {
  maintenanceMode: false,
  seatReservationTimeout: 10,
  emailNotifications: true,
  maxBookingsPerUser: 5,
  allowMultiCityBookings: true,
  allowGuestCheckout: false,
  systemVersion: '1.0.0'
};

const SystemSettings: React.FC = () => {
  const [settings, setSettings] = useState<SystemSettings>(initialSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'info' | 'warning'
  });

  // System information
  const [systemInfo, setSystemInfo] = useState({
    uptime: '3 days, 4 hours, 12 minutes',
    activeSessions: 42,
    databaseSize: '128 MB',
    cachedQueries: 156,
    lastBackup: '2024-05-28 03:00:00'
  });

  useEffect(() => {
    fetchSystemSettings();
  }, []);

  const fetchSystemSettings = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/admin/system-settings');
      setSettings(response.data);
      setError('');
    } catch (err) {
      console.error('Error fetching system settings:', err);
      setError('Failed to fetch system settings. Please try again later.');
      // Keep the initialSettings for demo
    } finally {
      setLoading(false);
    }
  };

  const handleTextInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    if (name === 'seatReservationTimeout' || name === 'maxBookingsPerUser') {
      // Convert string to number for numeric fields
      setSettings({
        ...settings,
        [name]: parseInt(value, 10) || 0
      });
    } else {
      setSettings({
        ...settings,
        [name]: value
      });
    }
  };

  const handleSwitchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setSettings({
      ...settings,
      [name]: checked
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.post('/api/admin/system-settings', settings);
      setSnackbar({
        open: true,
        message: 'System settings updated successfully',
        severity: 'success'
      });
    } catch (err) {
      console.error('Error saving system settings:', err);
      setSnackbar({
        open: true,
        message: 'Failed to update system settings. Please try again.',
        severity: 'error'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleBackupDatabase = async () => {
    try {
      await axios.post('/api/admin/database/backup');
      setSnackbar({
        open: true,
        message: 'Database backup initiated successfully',
        severity: 'success'
      });
    } catch (err) {
      console.error('Error initiating backup:', err);
      setSnackbar({
        open: true,
        message: 'Failed to initiate database backup. Please try again.',
        severity: 'error'
      });
    }
  };

  const handleClearCache = async () => {
    try {
      await axios.post('/api/admin/cache/clear');
      setSnackbar({
        open: true,
        message: 'Cache cleared successfully',
        severity: 'success'
      });
    } catch (err) {
      console.error('Error clearing cache:', err);
      setSnackbar({
        open: true,
        message: 'Failed to clear cache. Please try again.',
        severity: 'error'
      });
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" component="h2" gutterBottom>
        System Settings
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      <Grid container spacing={3}>
        {/* Main Settings */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              General Settings
            </Typography>
            <Divider sx={{ mb: 3 }} />
            
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.maintenanceMode}
                      onChange={handleSwitchChange}
                      name="maintenanceMode"
                      color="primary"
                    />
                  }
                  label="Maintenance Mode"
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Seat Reservation Timeout (minutes)"
                  type="number"
                  fullWidth
                  name="seatReservationTimeout"
                  value={settings.seatReservationTimeout}
                  onChange={handleTextInputChange}
                  inputProps={{ min: 1, max: 60 }}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Max Bookings Per User"
                  type="number"
                  fullWidth
                  name="maxBookingsPerUser"
                  value={settings.maxBookingsPerUser}
                  onChange={handleTextInputChange}
                  inputProps={{ min: 1, max: 20 }}
                />
              </Grid>
              
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.emailNotifications}
                      onChange={handleSwitchChange}
                      name="emailNotifications"
                      color="primary"
                    />
                  }
                  label="Email Notifications"
                />
              </Grid>
              
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.allowMultiCityBookings}
                      onChange={handleSwitchChange}
                      name="allowMultiCityBookings"
                      color="primary"
                    />
                  }
                  label="Allow Multi-City Bookings"
                />
              </Grid>
              
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.allowGuestCheckout}
                      onChange={handleSwitchChange}
                      name="allowGuestCheckout"
                      color="primary"
                    />
                  }
                  label="Allow Guest Checkout"
                />
              </Grid>
            </Grid>
            
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Settings'}
              </Button>
            </Box>
          </Paper>
          
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              System Maintenance
            </Typography>
            <Divider sx={{ mb: 3 }} />
            
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Button
                  variant="outlined"
                  color="primary"
                  fullWidth
                  onClick={handleBackupDatabase}
                >
                  Backup Database
                </Button>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Button
                  variant="outlined"
                  color="secondary"
                  fullWidth
                  onClick={handleClearCache}
                >
                  Clear System Cache
                </Button>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
        
        {/* System Information */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardHeader title="System Information" />
            <CardContent>
              <List dense>
                <ListItem>
                  <ListItemText primary="System Version" />
                  <ListItemSecondaryAction>
                    <Typography variant="body2">{settings.systemVersion}</Typography>
                  </ListItemSecondaryAction>
                </ListItem>
                <Divider component="li" />
                <ListItem>
                  <ListItemText primary="Uptime" />
                  <ListItemSecondaryAction>
                    <Typography variant="body2">{systemInfo.uptime}</Typography>
                  </ListItemSecondaryAction>
                </ListItem>
                <Divider component="li" />
                <ListItem>
                  <ListItemText primary="Active Sessions" />
                  <ListItemSecondaryAction>
                    <Typography variant="body2">{systemInfo.activeSessions}</Typography>
                  </ListItemSecondaryAction>
                </ListItem>
                <Divider component="li" />
                <ListItem>
                  <ListItemText primary="Database Size" />
                  <ListItemSecondaryAction>
                    <Typography variant="body2">{systemInfo.databaseSize}</Typography>
                  </ListItemSecondaryAction>
                </ListItem>
                <Divider component="li" />
                <ListItem>
                  <ListItemText primary="Cached Queries" />
                  <ListItemSecondaryAction>
                    <Typography variant="body2">{systemInfo.cachedQueries}</Typography>
                  </ListItemSecondaryAction>
                </ListItem>
                <Divider component="li" />
                <ListItem>
                  <ListItemText primary="Last Backup" />
                  <ListItemSecondaryAction>
                    <Typography variant="body2">{systemInfo.lastBackup}</Typography>
                  </ListItemSecondaryAction>
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={6000} 
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default SystemSettings; 