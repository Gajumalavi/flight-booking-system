import React, { useState, useEffect } from 'react';
import {
    Container,
    Paper,
    Typography,
    Box,
    TextField,
    Button,
    Grid,
    Avatar,
    Divider,
    CircularProgress,
    Alert,
    FormHelperText
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import { getUserProfile, updateUserProfile } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import jwt_decode from 'jwt-decode';
import axios from 'axios';

interface UserProfile {
    firstName?: string;
    lastName?: string;
    email: string;
    phone?: string;
    address?: string;
}

interface JwtPayload {
    sub: string;
    email: string;
    role: string;
    exp: number;
    iat: number;
}

const Profile = () => {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [apiAvailable, setApiAvailable] = useState(true);
    const [emailChanged, setEmailChanged] = useState(false);
    const { user, logout } = useAuth();

    useEffect(() => {
        const fetchProfile = async () => {
            setError('');
            setSuccess('');
            setLoading(true);
            try {
                const token = localStorage.getItem('token');
                if (!token) {
                    throw new Error('User not authenticated.');
                }

                try {
                    // Try to get profile from API with correct URL and headers
                    const userData = await axios.get('http://localhost:8080/api/user/profile', {
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        }
                    });
                    setProfile(userData.data);
                    setApiAvailable(true);
                } catch (apiError) {
                    console.error('❌ Error fetching profile:', apiError);
                    
                    // Fallback to localStorage data if API fails
                    setApiAvailable(false);
                    
                    // Get all user data available in localStorage
                    const userEmail = localStorage.getItem('userEmail');
                    const userFirstName = localStorage.getItem('userFirstName');
                    const userLastName = localStorage.getItem('userLastName');
                    const userPhone = localStorage.getItem('userPhone');
                    const userAddress = localStorage.getItem('userAddress');
                    
                    // Create a profile object with all available data
                    setProfile({
                        email: userEmail || (user ? user.email : ''),
                        firstName: userFirstName || (user ? user.firstName : ''),
                        lastName: userLastName || (user ? user.lastName : ''),
                        phone: userPhone || '',
                        address: userAddress || ''
                    });
                }
            } catch (error) {
                console.error('❌ Error in profile component:', error);
                setError('Failed to load profile.');
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, [user]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (profile) {
            const { name, value } = e.target;
            if (name === 'email' && value !== profile.email) {
                setEmailChanged(true);
            }
            setProfile({
                ...profile,
                [name]: value
            });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        // Validate phone number if present
        if (profile?.phone) {
            // Remove all non-digit characters to count actual digits
            const digitsOnly = profile.phone.replace(/\D/g, '');
            if (digitsOnly.length !== 10) {
                setError('Phone number must be exactly 10 digits');
                setLoading(false);
                return;
            }
            
            const phoneRegex = /^[0-9+\-\s()]{10,15}$/;
            if (!phoneRegex.test(profile.phone.trim())) {
                setError('Please enter a valid phone number');
                setLoading(false);
                return;
            }
        }
        
        // If API is not available, just simulate success
        if (!apiAvailable) {
            setTimeout(() => {
                // Even though backend update failed, update localStorage for consistent experience
                if (profile) {
                    localStorage.setItem('userFirstName', profile.firstName || '');
                    localStorage.setItem('userLastName', profile.lastName || '');
                    localStorage.setItem('userPhone', profile.phone || '');
                    localStorage.setItem('userAddress', profile.address || '');
                    
                    if (emailChanged) {
                        localStorage.setItem('userEmail', profile.email);
                        // Show warning about email change without backend update
                        setSuccess('Profile updated locally. Note: Email change won\'t take effect without backend connection.');
                    } else {
                        setSuccess('Profile updated in local storage! (Note: Changes are not saved to the server)');
                    }
                }
                
                setIsEditing(false);
                setLoading(false);
            }, 500);
            return;
        }

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('User not authenticated.');
            }
            
            // Use axios instead of the updateUserProfile function
            const response = await axios.put('http://localhost:8080/api/user/update', profile, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (emailChanged) {
                setSuccess('Email updated successfully! You will be logged out to apply changes.');
                // Set a timeout to allow the user to see the success message before logout
                setTimeout(() => {
                    // Update localStorage with new email
                    localStorage.setItem('userEmail', profile?.email || '');
                    // Log the user out to refresh the token
                    logout();
                }, 3000);
            } else {
                // Update all profile data in localStorage for consistency
                if (profile) {
                    localStorage.setItem('userFirstName', profile.firstName || '');
                    localStorage.setItem('userLastName', profile.lastName || '');
                    localStorage.setItem('userPhone', profile.phone || '');
                    localStorage.setItem('userAddress', profile.address || '');
                }
                
                setSuccess('Profile updated successfully!');
                setIsEditing(false);
            }
        } catch (error: any) {
            console.error('❌ Error updating profile:', error);
            
            // Check for specific error message about email already in use
            if (error.response && error.response.data && error.response.data.message) {
                setError(error.response.data.message);
            } else {
                setError('Failed to update profile. The API endpoint may not be available.');
                setApiAvailable(false);
            }
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" height="80vh">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Container maxWidth="md" sx={{ mt: 4 }}>
            <Paper elevation={3} sx={{ p: 4 }}>
                <Box display="flex" alignItems="center" mb={4}>
                    <Avatar sx={{ width: 80, height: 80, mr: 2, bgcolor: 'primary.main' }}>
                        <PersonIcon sx={{ fontSize: 40 }} />
                    </Avatar>
                    <Typography variant="h4">My Profile</Typography>
                </Box>

                <Divider sx={{ mb: 4 }} />

                {!apiAvailable && (
                    <Alert severity="warning" sx={{ mb: 3 }}>
                        Profile API is not available. Displaying information from your login credentials. 
                        Changes may not be saved to the backend.
                    </Alert>
                )}
                
                {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
                {success && <Alert severity="success" sx={{ mb: 3 }}>{success}</Alert>}

                <Box component="form" onSubmit={handleSubmit}>
                    <Grid container spacing={3}>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="First Name"
                                name="firstName"
                                value={profile?.firstName || ''}
                                onChange={handleChange}
                                disabled={!isEditing}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Last Name"
                                name="lastName"
                                value={profile?.lastName || ''}
                                onChange={handleChange}
                                disabled={!isEditing}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Email"
                                name="email"
                                type="email"
                                value={profile?.email || ''}
                                onChange={handleChange}
                                disabled={!isEditing}
                                required
                                error={emailChanged}
                            />
                            {isEditing && emailChanged && (
                                <FormHelperText sx={{ color: 'warning.main' }}>
                                    Changing your email will require you to log in again.
                                </FormHelperText>
                            )}
                            {isEditing && (
                                <FormHelperText>
                                    This email will be used for ticket notifications and account recovery.
                                </FormHelperText>
                            )}
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Phone"
                                name="phone"
                                value={profile?.phone || ''}
                                onChange={handleChange}
                                disabled={!isEditing}
                                inputProps={{ 
                                    maxLength: 15,
                                    pattern: '[0-9+\\-\\s()]{10,15}'
                                }}
                                helperText={isEditing ? "Phone number must be exactly 10 digits" : ""}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Address"
                                name="address"
                                multiline
                                rows={3}
                                value={profile?.address || ''}
                                onChange={handleChange}
                                disabled={!isEditing}
                            />
                        </Grid>
                    </Grid>

                    <Box sx={{ mt: 4, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                        {isEditing ? (
                            <>
                                <Button variant="outlined" onClick={() => {
                                    setIsEditing(false);
                                    setEmailChanged(false);
                                }}>Cancel</Button>
                                <Button type="submit" variant="contained">Save Changes</Button>
                            </>
                        ) : (
                            <Button variant="contained" onClick={() => setIsEditing(true)}>Edit Profile</Button>
                        )}
                    </Box>
                </Box>
            </Paper>
        </Container>
    );
};

export default Profile;
