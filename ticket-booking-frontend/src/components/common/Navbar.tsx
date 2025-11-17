import React, { useState, useEffect } from 'react';
import {
    AppBar,
    Toolbar,
    Typography,
    Button,
    IconButton,
    Menu,
    MenuItem,
    Divider,
    Avatar,
    Tooltip
} from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import MenuIcon from '@mui/icons-material/Menu';
import HomeIcon from '@mui/icons-material/Home';
import AirplaneTicketIcon from '@mui/icons-material/AirplaneTicket';
import PersonIcon from '@mui/icons-material/Person';
import HistoryIcon from '@mui/icons-material/History';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import { useAuth } from '../../contexts/AuthContext';

const Navbar = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { isAuthenticated, user, logout, checkAuth } = useAuth();
    
    // Auth status with loading state
    const [authStatus, setAuthStatus] = useState({
        isAuthenticated: false,
        isAdmin: false,
        checked: false
    });
    
    // Check auth status on mount and path change
    useEffect(() => {
        const updateAuthStatus = () => {
            const isAuth = checkAuth();
            const isAdminUser = user?.role === 'ADMIN';
            
            console.log('Navbar auth check:', { isAuth, user, isAdmin: isAdminUser });
            
            setAuthStatus({
                isAuthenticated: isAuth,
                isAdmin: isAdminUser,
                checked: true
            });
        };
        
        updateAuthStatus();
    }, [checkAuth, user, location.pathname]);
    
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const open = Boolean(anchorEl);
    
    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        setAnchorEl(event.currentTarget);
    };
    
    const handleClose = () => {
        setAnchorEl(null);
    };

    const handleLogout = () => {
        logout();
        handleClose();
        navigate('/');
    };

    return (
        <AppBar 
            position="static" 
            sx={{ 
                background: 'linear-gradient(45deg, #E33069 30%, #9C27B0 90%)',
                boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.1)',
                borderRadius: 0
            }}
        >
            <Toolbar>
                <IconButton
                    size="large"
                    edge="start"
                    color="inherit"
                    aria-label="menu"
                    sx={{ mr: 2 }}
                    onClick={() => navigate('/')}
                >
                    <HomeIcon />
                </IconButton>
                
                <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                    Flight Booking System
                </Typography>
                
                <Button color="inherit" onClick={() => navigate('/flights')} startIcon={<AirplaneTicketIcon />}>
                    Flights
                </Button>
                
                {authStatus.isAuthenticated && (
                    <>
                        <Button color="inherit" onClick={() => navigate('/profile')} startIcon={<PersonIcon />}>
                            Profile
                        </Button>
                        
                        <Button color="inherit" onClick={() => navigate('/bookings')} startIcon={<HistoryIcon />}>
                            Bookings
                        </Button>
                        
                        {authStatus.isAdmin && (
                            <Button 
                                color="inherit" 
                                onClick={() => {
                                    console.log('Admin button clicked, navigating to /admin');
                                    navigate('/admin');
                                }} 
                                startIcon={<AdminPanelSettingsIcon />}
                            >
                                Admin
                            </Button>
                        )}
                    </>
                )}
                
                {authStatus.isAuthenticated ? (
                    <>
                        <Tooltip title={user?.email || 'User'}>
                            <IconButton
                                onClick={handleClick}
                                size="small"
                                aria-controls={open ? 'account-menu' : undefined}
                                aria-haspopup="true"
                                aria-expanded={open ? 'true' : undefined}
                                sx={{ ml: 2 }}
                            >
                                <Avatar sx={{ width: 32, height: 32, bgcolor: '#FF7F23' }}>
                                    {user?.email?.charAt(0).toUpperCase() || 'U'}
                                </Avatar>
                            </IconButton>
                        </Tooltip>
                        
                        <Menu
                            id="basic-menu"
                            anchorEl={anchorEl}
                            open={open}
                            onClose={handleClose}
                            MenuListProps={{
                                'aria-labelledby': 'basic-button',
                            }}
                            PaperProps={{
                                sx: {
                                    borderRadius: '8px',
                                    boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.1)'
                                }
                            }}
                        >
                            <MenuItem onClick={() => { handleClose(); navigate('/profile'); }}>Profile</MenuItem>
                            <MenuItem onClick={() => { handleClose(); navigate('/bookings'); }}>My Bookings</MenuItem>
                            
                            {authStatus.isAdmin && (
                                <>
                                    <Divider />
                                    <MenuItem onClick={() => { 
                                        handleClose(); 
                                        console.log('Admin menu item clicked, navigating to /admin');
                                        navigate('/admin'); 
                                    }}>
                                        Admin Dashboard
                                    </MenuItem>
                                </>
                            )}
                            
                            <Divider />
                            <MenuItem onClick={handleLogout}>Logout</MenuItem>
                        </Menu>
                    </>
                ) : (
                    <>
                        <Button 
                            color="inherit" 
                            onClick={() => navigate('/login')}
                            sx={{ borderRadius: '8px' }}
                        >
                            Login
                        </Button>
                        <Button 
                            color="inherit" 
                            onClick={() => navigate('/register')}
                            sx={{ 
                                ml: 1, 
                                bgcolor: 'rgba(255, 255, 255, 0.15)',
                                borderRadius: '8px',
                                '&:hover': {
                                    bgcolor: 'rgba(255, 255, 255, 0.25)',
                                }
                            }}
                        >
                            Register
                        </Button>
                    </>
                )}
            </Toolbar>
        </AppBar>
    );
};

export default Navbar;