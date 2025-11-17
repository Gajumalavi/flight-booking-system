import React, { useState, useEffect } from 'react';
import {
  Container, Paper, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Button, IconButton, Box, TextField, Dialog,
  DialogActions, DialogContent, DialogContentText, DialogTitle,
  Grid, FormControl, InputLabel, Select, MenuItem, Alert, CircularProgress,
  Snackbar, SelectChangeEvent
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import axios from 'axios';

// Define user interface
interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  registrationDate: string;
}

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    password: '',
    role: 'CUSTOMER'
  });
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'info' | 'warning'
  });

  // Generate mock users for offline mode
  const getMockUsers = (): User[] => {
    return [
      {
        id: 'mock-1',
        email: 'admin@example.com',
        firstName: 'Admin',
        lastName: 'User',
        role: 'ADMIN',
        registrationDate: '2023-01-01T10:00:00Z'
      },
      {
        id: 'mock-2',
        email: 'john.doe@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'CUSTOMER',
        registrationDate: '2023-02-15T14:30:00Z'
      },
      {
        id: 'mock-3',
        email: 'jane.smith@example.com',
        firstName: 'Jane',
        lastName: 'Smith',
        role: 'CUSTOMER',
        registrationDate: '2023-03-22T09:15:00Z'
      }
    ];
  };

  // Check if server is available
  const isServerAvailable = async (): Promise<boolean> => {
    try {
      // Use the known working endpoint instead
      const response = await axios.get('http://localhost:8080/api/flights/test', { timeout: 5000 });
      return response.status === 200;
    } catch (error) {
      console.error('Server health check failed:', error);
      return false;
    }
  };

  // Fetch Users
  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Check if server is available
      const serverAvailable = await isServerAvailable();
      if (!serverAvailable) {
        throw new Error('Server is currently unavailable');
      }
      
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }
      
      const response = await axios.get('http://localhost:8080/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Convert backend format to frontend format
      const mappedUsers = response.data.map((user: any) => ({
        id: user.id.toString(),
        email: user.email,
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        role: user.role,
        registrationDate: user.registrationDate || new Date().toISOString()
      }));
      
      setUsers(mappedUsers);
    } catch (err: any) {
      console.error('Error fetching users:', err);
      
      // If the server is down, use mock data
      if (err.message === 'Server is currently unavailable') {
        setUsers(getMockUsers());
        setError('Server is offline. Showing mock data.');
      } else {
        setError(`Failed to fetch users: ${err.message || 'Unknown error'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // Add User
  const addUser = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }
      
      // Check if server is available
      const serverAvailable = await isServerAvailable();
      if (!serverAvailable) {
        // If server is down, just add to local state
        const mockUser: User = {
          id: `mock-${Date.now()}`,
          email: formData.email,
          firstName: formData.firstName,
          lastName: formData.lastName,
          role: formData.role,
          registrationDate: new Date().toISOString()
        };
        
        setUsers(prev => [...prev, mockUser]);
        showSnackbar('User added (mock - server offline)', 'warning');
        setOpenDialog(false);
        resetForm();
        return;
      }
      
      const response = await axios.post(
        'http://localhost:8080/api/admin/users',
        formData,
        { headers: { Authorization: `Bearer ${token}` }}
      );
      
      // Convert backend format to frontend format
      const newUser: User = {
        id: response.data.id.toString(),
        email: response.data.email,
        firstName: response.data.firstName || '',
        lastName: response.data.lastName || '',
        role: response.data.role,
        registrationDate: response.data.registrationDate || new Date().toISOString()
      };
      
      setUsers(prev => [...prev, newUser]);
      showSnackbar('User added successfully', 'success');
      setOpenDialog(false);
      resetForm();
    } catch (err: any) {
      console.error('Error adding user:', err);
      showSnackbar(`Failed to add user: ${err.message || 'Unknown error'}`, 'error');
    }
  };

  // Delete User
  const deleteUser = async () => {
    if (!selectedUserId) return;
    
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }
      
      // Check if server is available
      const serverAvailable = await isServerAvailable();
      if (!serverAvailable) {
        // If server is down, just remove from local state
        setUsers(prev => prev.filter(user => user.id !== selectedUserId));
        showSnackbar('User deleted (mock - server offline)', 'warning');
        setOpenDeleteDialog(false);
        setSelectedUserId(null);
        return;
      }
      
      const response = await axios.delete(
        `http://localhost:8080/api/admin/users/${selectedUserId}`,
        { headers: { Authorization: `Bearer ${token}` }}
      );
      
      // Check if we got a success response with details
      if (response.data && response.data.message) {
        const bookingsDeleted = response.data.bookingsDeleted || 0;
        let successMessage = 'User deleted successfully';
        
        if (bookingsDeleted > 0) {
          successMessage += `. ${bookingsDeleted} booking${bookingsDeleted > 1 ? 's were' : ' was'} also deleted.`;
        }
        
        showSnackbar(successMessage, 'success');
      } else {
        showSnackbar('User deleted successfully', 'success');
      }
      
      setUsers(prev => prev.filter(user => user.id !== selectedUserId));
      setOpenDeleteDialog(false);
      setSelectedUserId(null);
    } catch (err: any) {
      console.error('Error deleting user:', err);
      
      // Extract detailed error message if available
      let errorMessage = 'Failed to delete user';
      
      if (err.response && err.response.data) {
        if (err.response.data.message) {
          errorMessage += `: ${err.response.data.message}`;
        }
        
        if (err.response.data.details) {
          errorMessage += `. ${err.response.data.details}`;
        }
      } else if (err.message) {
        errorMessage += `: ${err.message}`;
      }
      
      showSnackbar(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Form handling
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const resetForm = () => {
    setFormData({
      email: '',
      firstName: '',
      lastName: '',
      password: '',
      role: 'CUSTOMER'
    });
  };

  // Dialog handling
  const handleOpenDialog = () => {
    resetForm();
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleOpenDeleteDialog = (userId: string) => {
    setSelectedUserId(userId);
    setOpenDeleteDialog(true);
  };

  const handleCloseDeleteDialog = () => {
    setOpenDeleteDialog(false);
    setSelectedUserId(null);
  };

  // Snackbar handling
  const showSnackbar = (message: string, severity: 'success' | 'error' | 'info' | 'warning') => {
    setSnackbar({
      open: true,
      message,
      severity
    });
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  // Initial fetch
  useEffect(() => {
    fetchUsers();
  }, []);

  // Render
  return (
    <Container maxWidth="xl" sx={{ mt: 3 }}>
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h5" component="h2">User Management</Typography>
          
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              startIcon={<RefreshIcon />}
              onClick={fetchUsers}
              disabled={loading}
            >
              Refresh
            </Button>
            
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={handleOpenDialog}
            >
              Add User
            </Button>
          </Box>
        </Box>

        <Paper sx={{ width: '100%', p: 2 }}>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : users.length > 0 ? (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>ID</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell>Role</TableCell>
                    <TableCell>Registered</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>{user.id}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{`${user.firstName} ${user.lastName}`.trim()}</TableCell>
                      <TableCell>{user.role}</TableCell>
                      <TableCell>
                        {new Date(user.registrationDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleOpenDeleteDialog(user.id)}
                          disabled={user.role === 'ADMIN'}
                          aria-label="delete user"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body1" gutterBottom>No users available</Typography>
              <Button 
                variant="outlined" 
                startIcon={<AddIcon />} 
                onClick={handleOpenDialog}
              >
                Add User
              </Button>
            </Box>
          )}
        </Paper>
      </Box>

      {/* Add User Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Add New User</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                label="Email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="First Name"
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Last Name"
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleInputChange}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel id="role-label">Role</InputLabel>
                <Select
                  labelId="role-label"
                  name="role"
                  value={formData.role}
                  label="Role"
                  onChange={handleInputChange}
                >
                  <MenuItem value="CUSTOMER">Customer</MenuItem>
                  <MenuItem value="ADMIN">Admin</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button 
            onClick={addUser} 
            variant="contained" 
            color="primary"
          >
            Add User
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={openDeleteDialog} onClose={handleCloseDeleteDialog}>
        <DialogTitle>Delete User</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this user? This action cannot be undone.
            {selectedUserId && (
              <Typography variant="caption" display="block" sx={{ mt: 2, color: 'text.secondary' }}>
                All bookings associated with this user will also be deleted.
              </Typography>
            )}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog} disabled={loading}>Cancel</Button>
          <Button 
            onClick={deleteUser} 
            color="error" 
            variant="contained"
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={6000} 
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default UserManagement; 