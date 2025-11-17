import React, { useState, useEffect } from 'react';
import { Snackbar, Alert } from '@mui/material';
import WifiOffIcon from '@mui/icons-material/WifiOff';
import WifiIcon from '@mui/icons-material/Wifi';

const NetworkStatusMonitor: React.FC = () => {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [showReconnected, setShowReconnected] = useState<boolean>(false);

  useEffect(() => {
    // Function to update online status
    const handleStatusChange = () => {
      const wasOffline = !isOnline;
      const status = navigator.onLine;
      setIsOnline(status);
      
      // If we're going from offline to online, show the reconnected message
      if (wasOffline && status) {
        setShowReconnected(true);
      }
    };

    // Add event listeners
    window.addEventListener('online', handleStatusChange);
    window.addEventListener('offline', handleStatusChange);

    // Cleanup event listeners
    return () => {
      window.removeEventListener('online', handleStatusChange);
      window.removeEventListener('offline', handleStatusChange);
    };
  }, [isOnline]);

  const handleCloseReconnected = () => {
    setShowReconnected(false);
  };

  return (
    <>
      {/* Offline alert */}
      <Snackbar
        open={!isOnline}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          severity="error" 
          icon={<WifiOffIcon />}
          sx={{ 
            width: '100%', 
            '& .MuiAlert-message': { 
              display: 'flex', 
              alignItems: 'center' 
            } 
          }}
        >
          You are offline. Some features may be unavailable.
        </Alert>
      </Snackbar>

      {/* Reconnected notification */}
      <Snackbar
        open={showReconnected}
        autoHideDuration={3000}
        onClose={handleCloseReconnected}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          severity="success" 
          icon={<WifiIcon />}
          onClose={handleCloseReconnected}
        >
          You're back online!
        </Alert>
      </Snackbar>
    </>
  );
};

export default NetworkStatusMonitor; 