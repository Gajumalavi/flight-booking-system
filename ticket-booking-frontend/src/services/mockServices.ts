import axios from 'axios';
import moment from 'moment';
import { isServerAvailable } from './serverStatus';

// Server status - initialize as false until we check
let serverOnline = false;

// Check server status immediately and then every 30 seconds
const checkServerStatus = async () => {
  serverOnline = await isServerAvailable();
  setTimeout(checkServerStatus, 30000); // Check every 30s
};
checkServerStatus();

// Mock data for flights
const demoFlights = [
  {
    id: 1001,
    flightNumber: 'AI101',
    airline: 'Air India',
    origin: 'Delhi',
    destination: 'Mumbai',
    departureTime: moment().add(1, 'day').set({ hour: 10, minute: 30 }).format(),
    arrivalTime: moment().add(1, 'day').set({ hour: 12, minute: 30 }).format(),
    price: 5500,
    availableSeats: 40,
    apiSourced: false
  },
  {
    id: 1002,
    flightNumber: 'SG202',
    airline: 'SpiceJet',
    origin: 'Bangalore',
    destination: 'Chennai',
    departureTime: moment().add(1, 'day').set({ hour: 14, minute: 45 }).format(),
    arrivalTime: moment().add(1, 'day').set({ hour: 16, minute: 0 }).format(),
    price: 3200,
    availableSeats: 27,
    apiSourced: false
  },
  {
    id: 1003,
    flightNumber: 'UK303',
    airline: 'Vistara',
    origin: 'Mumbai',
    destination: 'Kolkata',
    departureTime: moment().add(2, 'day').set({ hour: 9, minute: 15 }).format(),
    arrivalTime: moment().add(2, 'day').set({ hour: 11, minute: 45 }).format(),
    price: 6800,
    availableSeats: 17,
    apiSourced: false
  },
  {
    id: 1004,
    flightNumber: 'DM130',
    airline: 'Demo Air',
    origin: 'BOM',
    destination: 'BLR',
    departureTime: moment().add(3, 'day').set({ hour: 8, minute: 17 }).format(),
    arrivalTime: moment().add(3, 'day').set({ hour: 9, minute: 17 }).format(),
    price: 5656,
    availableSeats: 35,
    apiSourced: false
  }
];

// Mock data for user profile
const mockUserProfile = {
  id: 1,
  email: "user@example.com",
  firstName: "John",
  lastName: "Doe",
  phone: "555-123-4567",
  address: "123 Main St, Anywhere, USA",
  role: "USER"
};

// Mock data for admin dashboard
const mockApiStatistics = {
  totalCalls: 12458,
  successRate: 94.7,
  failureRate: 5.3,
  avgResponseTime: 231,
  callsByEndpoint: {
    '/flights/search': 7834,
    '/flights/details': 2304,
    '/pricing': 1562,
    '/availability': 758
  },
  callsByDay: Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    
    return {
      date: date.toISOString().split('T')[0],
      calls: Math.floor(Math.random() * 300) + 100,
      successRate: 90 + Math.random() * 10
    };
  })
};

const mockUsers = [
  {
    id: 1,
    email: "admin@example.com",
    firstName: "Admin",
    lastName: "User",
    role: "ADMIN",
    status: "ACTIVE",
    createdAt: moment().subtract(30, 'days').format(),
    lastLogin: moment().subtract(1, 'day').format()
  },
  {
    id: 2,
    email: "user@example.com",
    firstName: "John",
    lastName: "Doe",
    role: "USER",
    status: "ACTIVE",
    createdAt: moment().subtract(15, 'days').format(),
    lastLogin: moment().format()
  },
  {
    id: 3,
    email: "jane.doe@example.com",
    firstName: "Jane",
    lastName: "Doe",
    role: "USER",
    status: "ACTIVE",
    createdAt: moment().subtract(10, 'days').format(),
    lastLogin: moment().subtract(2, 'days').format()
  }
];

// Setup axios interceptor to mock API calls
axios.interceptors.request.use(
  async (config) => {
    if (!config.url) return config;
    
    // Only mock if server is offline
    if (serverOnline) return config;
    
    // Process if URL is from our backend (handle both URL formats)
    const isBackendUrl = config.url.includes('localhost:8080') || 
                         config.url.startsWith('/api/') || 
                         config.url.startsWith('/user/') || 
                         config.url.startsWith('/auth/');
                         
    if (isBackendUrl) {
      console.log(`Mocking API call to ${config.url} because server is offline`);
      
      // Mock response based on the URL
      const mockResponse = await mockApiCall(config.url, config.method, config.data);
      
      if (mockResponse) {
        // Create a mock error to cancel the real request and return our mock data
        const error = new Error('Mock API response');
        // @ts-ignore
        error.response = {
          status: mockResponse.status,
          data: mockResponse.data,
          headers: { 'content-type': 'application/json' },
          config: config
        };
        
        return Promise.reject(error);
      }
    }
    
    return config;
  },
  error => Promise.reject(error)
);

// Mock API call handler
const mockApiCall = async (url: string, method: string | undefined, data: any) => {
  console.log('Mocking API call:', method, url);
  
  // Normalize URL to handle both absolute and relative paths
  const normalizedUrl = url.includes('localhost:8080') 
    ? url.split('localhost:8080')[1] 
    : url;
  
  // Flight endpoints
  if (normalizedUrl.includes('/api/flights')) {
    // GET all flights
    if (normalizedUrl.endsWith('/api/flights') && method?.toLowerCase() === 'get') {
      return {
        status: 200,
        data: demoFlights
      };
    }
    
    // Flight search
    if (normalizedUrl.includes('/api/flights/search') && method?.toLowerCase() === 'get') {
      // Extract search parameters
      const params = new URL(`http://example.com${normalizedUrl}`).searchParams;
      const origin = params.get('origin')?.toLowerCase();
      const destination = params.get('destination')?.toLowerCase();
      const date = params.get('departureDate');
      
      // Filter flights based on search criteria
      let filteredFlights = [...demoFlights];
      
      if (origin) {
        filteredFlights = filteredFlights.filter(f => 
          f.origin.toLowerCase().includes(origin)
        );
      }
      
      if (destination) {
        filteredFlights = filteredFlights.filter(f => 
          f.destination.toLowerCase().includes(destination)
        );
      }
      
      if (date) {
        const searchDate = moment(date);
        filteredFlights = filteredFlights.filter(f => 
          moment(f.departureTime).isSame(searchDate, 'day')
        );
      }
      
      return {
        status: 200,
        data: filteredFlights
      };
    }
    
    // Test endpoint for health check
    if (normalizedUrl.includes('/api/flights/test') && method?.toLowerCase() === 'get') {
      return {
        status: 200,
        data: "Flight controller is working"
      };
    }
  }
  
  // User profile endpoints
  if (normalizedUrl.includes('/api/user/profile') && method?.toLowerCase() === 'get') {
    return {
      status: 200,
      data: mockUserProfile
    };
  }
  
  // Admin endpoints
  if (normalizedUrl.includes('/api/admin/')) {
    // API settings
    if (normalizedUrl.includes('/api/admin/api-settings') && method?.toLowerCase() === 'get') {
      return {
        status: 200,
        data: { enabled: true }
      };
    }
    
    // API statistics
    if (normalizedUrl.includes('/api/admin/api-statistics') && method?.toLowerCase() === 'get') {
      return {
        status: 200,
        data: mockApiStatistics
      };
    }
    
    // Users list
    if (normalizedUrl.includes('/api/admin/users') && method?.toLowerCase() === 'get') {
      return {
        status: 200,
        data: mockUsers
      };
    }
  }
  
  // Auth endpoints
  if (normalizedUrl.includes('/auth/login') && method?.toLowerCase() === 'post') {
    const mockToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiZW1haWwiOiJ1c2VyQGV4YW1wbGUuY29tIiwicm9sZSI6IkFETUlOIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE3MTYyMzkwMjJ9.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
    return {
      status: 200,
      data: { token: mockToken }
    };
  }
  
  // Return null if no mock is defined - will let the real request go through
  return null;
};

export default mockApiCall; 