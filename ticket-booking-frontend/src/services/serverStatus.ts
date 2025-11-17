import axios from 'axios';

const BACKEND_URL = 'http://localhost:8080';

/**
 * Checks if the backend server is available by making a lightweight request
 * @returns {Promise<boolean>} true if server is available, false otherwise
 */
export const isServerAvailable = async (): Promise<boolean> => {
  try {
    // Try to access a lightweight endpoint
    await axios.get(`${BACKEND_URL}/api/flights/test`, { 
      timeout: 2000  // Short timeout to fail fast
    });
    console.log('Backend server is available');
    return true;
  } catch (error) {
    console.log('Backend server is not available');
    return false;
  }
};

/**
 * Checks if the API mode is enabled on the backend
 * @returns {Promise<boolean>} true if API mode is enabled, false otherwise
 */
export const isApiEnabled = async (token: string): Promise<boolean> => {
  try {
    const response = await axios.get(`${BACKEND_URL}/api/flights/api-status`, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      timeout: 2000
    });
    return response.data.enabled;
  } catch (error) {
    console.error('Could not check API status:', error);
    return false;
  }
};

export default { isServerAvailable, isApiEnabled }; 