import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { CircularProgress, Box, Typography } from '@mui/material';

interface AdminRouteProps {
  children: React.ReactNode;
}

const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const { user, loading, checkAuth } = useAuth();
  const [isVerifying, setIsVerifying] = useState<boolean>(true);
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);

  useEffect(() => {
    const verifyAdmin = async () => {
      setIsVerifying(true);

      // Check if authenticated and has admin role
      const isValid = checkAuth();
      const isAdmin = isValid && user?.role === 'ADMIN';
      
      console.log('AdminRoute auth check:', { 
        isValid,
        isAdmin, 
        userRole: user?.role || 'none' 
      });
      
      setIsAuthorized(isAdmin);
      setIsVerifying(false);
    };

    verifyAdmin();
  }, [user, checkAuth]);

  // Show loading indicator while verifying
  if (loading || isVerifying) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
        <Typography variant="body1" sx={{ ml: 2 }}>
          Verifying admin access...
        </Typography>
      </Box>
    );
  }

  // Check if the user is authenticated
  const isUserAuthenticated = checkAuth();

  // If not authenticated, redirect to login
  if (!isUserAuthenticated) {
    console.log('User not authenticated, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  // If authenticated but not admin, redirect to home
  if (!isAuthorized) {
    console.log('User not authorized as admin, redirecting to home');
    return <Navigate to="/" replace />;
  }

  // If admin, render children
  console.log('Admin access granted, rendering admin dashboard');
  return <>{children}</>;
};

export default AdminRoute; 