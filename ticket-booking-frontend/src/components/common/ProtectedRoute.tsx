import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { CircularProgress, Box } from '@mui/material';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const location = useLocation();
  const { isAuthenticated, loading, checkAuth } = useAuth();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Quick check for authentication state
    const timer = setTimeout(() => {
      const isValid = checkAuth(); 
      console.log('ProtectedRoute - Auth state:', { 
        isAuthenticated, 
        isValid,
        path: location.pathname,
        token: localStorage.getItem('token') ? 'exists' : 'none'
      });
      setIsChecking(false);
    }, 300); // Short timeout to ensure auth state is processed
    
    return () => clearTimeout(timer);
  }, [isAuthenticated, checkAuth, location.pathname]);

  // Only show loading briefly if auth system is still initializing 
  if (loading && isChecking) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  // Don't wait forever - use whatever auth state we have after checking
  if (!isAuthenticated) {
    console.log('ProtectedRoute - User not authenticated, redirecting to login');
    // Save the location they tried to access for redirecting after login
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute; 