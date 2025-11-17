import axios from 'axios';
import { Flight } from './api';
import moment from 'moment';

// Mocked data for development
let mockFlights: any[] = [
  {
    id: 1,
    flightNumber: 'AI101',
    airline: 'Air India',
    departureCity: 'Delhi',
    arrivalCity: 'Mumbai',
    departureTime: moment().add(1, 'day').hour(10).minute(30).toISOString(),
    arrivalTime: moment().add(1, 'day').hour(12).minute(30).toISOString(),
    price: 5500,
    availableSeats: 42,
    apiSourced: false
  },
  {
    id: 2,
    flightNumber: 'SG202',
    airline: 'SpiceJet',
    departureCity: 'Bangalore',
    arrivalCity: 'Chennai',
    departureTime: moment().add(1, 'day').hour(14).minute(45).toISOString(),
    arrivalTime: moment().add(1, 'day').hour(16).minute(0).toISOString(),
    price: 3200,
    availableSeats: 30,
    apiSourced: false
  },
  {
    id: 3,
    flightNumber: 'UK303',
    airline: 'Vistara',
    departureCity: 'Mumbai',
    arrivalCity: 'Kolkata',
    departureTime: moment().add(2, 'day').hour(9).minute(15).toISOString(),
    arrivalTime: moment().add(2, 'day').hour(11).minute(45).toISOString(),
    price: 6800,
    availableSeats: 18,
    apiSourced: false
  }
];

let mockApiStatus = {
  enabled: false
};

const mockApiFlights = [
  {
    id: 101,
    flightNumber: 'BA456',
    airline: 'British Airways',
    departureCity: 'London',
    arrivalCity: 'Paris',
    departureTime: moment().add(3, 'day').hour(7).minute(30).toISOString(),
    arrivalTime: moment().add(3, 'day').hour(9).minute(0).toISOString(),
    price: 12000,
    availableSeats: 45,
    apiSourced: true
  },
  {
    id: 102,
    flightNumber: 'LH789',
    airline: 'Lufthansa',
    departureCity: 'Berlin',
    arrivalCity: 'Amsterdam',
    departureTime: moment().add(4, 'day').hour(11).minute(0).toISOString(),
    arrivalTime: moment().add(4, 'day').hour(12).minute(15).toISOString(),
    price: 9500,
    availableSeats: 32,
    apiSourced: true
  }
];

const mockApiStatistics = {
  callsThisMonth: 1245,
  maxCallsPerMonth: 2000,
  successRate: 98.3,
  responseTimeMs: 321,
  lastUpdated: moment().subtract(2, 'hours').toISOString()
};

// AXIOS INTERCEPTOR DISABLED - Using real backend API
/* 
// Intercept admin API calls
axios.interceptors.request.use(
  async config => {
    // Check if the request is for the admin API
    if (config.url?.includes('/api/admin/')) {
      // Mock the admin API
      const mockResponse = await mockAdminApi(config.url, config.method, config.data);
      
      // Create a custom error to stop the actual request and return our mock data
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
    
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);
*/

// Mock admin API handler
const mockAdminApi = async (url: string, method: string | undefined, data: any) => {
  // Extract the specific endpoint from the URL
  const endpoint = url.split('/api/admin/')[1];
  
  // Define your mock endpoints and their responses
  switch (true) {
    // GET /api/admin/flights
    case endpoint === 'flights' && method?.toLowerCase() === 'get':
      return {
        status: 200,
        data: mockFlights
      };
    
    // POST /api/admin/flights (create new flight)
    case endpoint === 'flights' && method?.toLowerCase() === 'post':
      const newFlight = {
        ...data,
        id: Math.max(...mockFlights.map(f => f.id)) + 1,
        apiSourced: false
      };
      mockFlights.push(newFlight);
      return {
        status: 201,
        data: newFlight
      };
    
    // PUT /api/admin/flights/{id} (update flight)
    case /^flights\/\d+$/.test(endpoint) && method?.toLowerCase() === 'put':
      const flightIdToUpdate = parseInt(endpoint.split('/')[1]);
      const flightIndex = mockFlights.findIndex(f => f.id === flightIdToUpdate);
      
      if (flightIndex === -1) {
        return {
          status: 404,
          data: { message: 'Flight not found' }
        };
      }
      
      mockFlights[flightIndex] = {
        ...mockFlights[flightIndex],
        ...data,
        id: flightIdToUpdate
      };
      
      return {
        status: 200,
        data: mockFlights[flightIndex]
      };
    
    // DELETE /api/admin/flights/{id}
    case /^flights\/\d+$/.test(endpoint) && method?.toLowerCase() === 'delete':
      const flightIdToDelete = parseInt(endpoint.split('/')[1]);
      const initialLength = mockFlights.length;
      mockFlights = mockFlights.filter(f => f.id !== flightIdToDelete);
      
      if (mockFlights.length === initialLength) {
        return {
          status: 404,
          data: { message: 'Flight not found' }
        };
      }
      
      return {
        status: 200,
        data: { message: 'Flight deleted successfully' }
      };
    
    // GET /api/admin/api-status
    case endpoint === 'api-status' && method?.toLowerCase() === 'get':
      return {
        status: 200,
        data: mockApiStatus
      };
    
    // POST /api/admin/api-toggle
    case endpoint === 'api-toggle' && method?.toLowerCase() === 'post':
      if (data && 'enabled' in data) {
        mockApiStatus.enabled = data.enabled;
      }
      
      return {
        status: 200,
        data: { message: `API ${mockApiStatus.enabled ? 'enabled' : 'disabled'} successfully` }
      };
    
    // GET /api/admin/api-flights
    case endpoint === 'api-flights' && method?.toLowerCase() === 'get':
      if (!mockApiStatus.enabled) {
        return {
          status: 400,
          data: { message: 'API is currently disabled' }
        };
      }
      
      return {
        status: 200,
        data: mockApiFlights
      };
    
    // POST /api/admin/flights/save-api-flight
    case endpoint === 'flights/save-api-flight' && method?.toLowerCase() === 'post':
      if (!data.apiSourced) {
        return {
          status: 400,
          data: { message: 'Only API-sourced flights can be saved with this endpoint' }
        };
      }
      
      const savedFlight = {
        ...data,
        id: Math.max(...mockFlights.map(f => f.id)) + 1
      };
      
      mockFlights.push(savedFlight);
      
      return {
        status: 200,
        data: savedFlight
      };
      
    // GET /api/admin/api-statistics
    case endpoint === 'api-statistics' && method?.toLowerCase() === 'get':
      return {
        status: 200,
        data: mockApiStatistics
      };
    
    default:
      console.warn(`Unhandled mock admin endpoint: ${method} ${endpoint}`);
      return {
        status: 404,
        data: { message: 'Endpoint not found' }
      };
  }
};

export default {
  mockFlights,
  mockApiStatus,
  mockApiFlights,
  mockApiStatistics
}; 