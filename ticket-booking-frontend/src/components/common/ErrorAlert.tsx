import React from 'react';
import { Alert, AlertTitle, Box, Collapse, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

interface ErrorAlertProps {
  error: string | null;
  severity?: 'error' | 'warning' | 'info' | 'success';
  title?: string;
  onClose?: () => void;
  action?: React.ReactNode;
  sx?: any;
}

const ErrorAlert: React.FC<ErrorAlertProps> = ({
  error,
  severity = 'error',
  title,
  onClose,
  action,
  sx = {}
}) => {
  if (!error) return null;

  return (
    <Box sx={{ width: '100%', mb: 2, ...sx }}>
      <Collapse in={!!error}>
        <Alert
          severity={severity}
          action={
            onClose ? (
              <IconButton
                aria-label="close"
                color="inherit"
                size="small"
                onClick={onClose}
              >
                <CloseIcon fontSize="inherit" />
              </IconButton>
            ) : action
          }
        >
          {title && <AlertTitle>{title}</AlertTitle>}
          {error}
        </Alert>
      </Collapse>
    </Box>
  );
};

export default ErrorAlert; 