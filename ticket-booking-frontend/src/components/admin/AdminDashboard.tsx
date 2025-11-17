import React, { useState } from 'react';
import { 
  Box, 
  Container, 
  Tab, 
  Tabs, 
  Typography, 
  Paper,
  Divider
} from '@mui/material';
import ApiManagement from './ApiManagement';
import UserManagement from './UserManagement';
import EmailIcon from '@mui/icons-material/Email';
import PeopleIcon from '@mui/icons-material/People';
import ApiIcon from '@mui/icons-material/Api';
import BookingReportTab from '../reports/BookingReportTab';
import FlightReportTab from '../reports/FlightReportTab';
import RevenueReportTab from '../reports/RevenueReportTab';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`admin-dashboard-tabpanel-${index}`}
      aria-labelledby={`admin-dashboard-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 2 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `admin-dashboard-tab-${index}`,
    'aria-controls': `admin-dashboard-tabpanel-${index}`,
  };
}

const AdminDashboard: React.FC = () => {
  const [value, setValue] = useState(0);

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Admin Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Manage your flight booking system settings and monitor system performance.
        </Typography>
        <Divider sx={{ my: 2 }} />
        
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs 
            value={value} 
            onChange={handleChange} 
            aria-label="admin dashboard tabs"
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab icon={<ApiIcon sx={{ mr: 1 }} />} iconPosition="start" label="API Management" {...a11yProps(0)} />
            <Tab icon={<PeopleIcon sx={{ mr: 1 }} />} iconPosition="start" label="User Management" {...a11yProps(1)} />
            <Tab label="Booking Reports" {...a11yProps(2)} />
            <Tab label="Flight Reports" {...a11yProps(3)} />
            <Tab label="Revenue Reports" {...a11yProps(4)} />
          </Tabs>
        </Box>
        
        <TabPanel value={value} index={0}>
          <ApiManagement />
        </TabPanel>
        
        <TabPanel value={value} index={1}>
          <UserManagement />
        </TabPanel>
        
        <TabPanel value={value} index={2}>
          <BookingReportTab />
        </TabPanel>
        
        <TabPanel value={value} index={3}>
          <FlightReportTab />
        </TabPanel>
        
        <TabPanel value={value} index={4}>
          <RevenueReportTab />
        </TabPanel>
      </Paper>
    </Container>
  );
};

export default AdminDashboard; 