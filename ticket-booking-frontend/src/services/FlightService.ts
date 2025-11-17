import axios from 'axios';

interface Flight {
  id: number;
  flightNumber: string;
  airline: string;
  origin: string;
  destination: string;
  departureTime: string;
  arrivalTime: string;
  price: number;
  availableSeats: number;
  status: string;
}

interface FlightSearchParams {
  origin?: string;
  destination?: string;
  departureDate?: string;
  returnDate?: string;
  passengers?: number;
}

class FlightService {
  private baseUrl = '/api/flights';
  
  public async getFlights(): Promise<Flight[]> {
    try {
      const response = await axios.get(this.baseUrl);
      return response.data;
    } catch (error) {
      console.error('Error fetching flights:', error);
      throw error;
    }
  }
  
  public async getFlight(id: number): Promise<Flight> {
    try {
      const response = await axios.get(`${this.baseUrl}/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching flight with ID ${id}:`, error);
      throw error;
    }
  }
  
  public async createFlight(flightData: Omit<Flight, 'id'>): Promise<Flight> {
    try {
      const response = await axios.post(this.baseUrl, flightData);
      return response.data;
    } catch (error) {
      console.error('Error creating flight:', error);
      throw error;
    }
  }
  
  public async updateFlight(id: number, flightData: Partial<Flight>): Promise<Flight> {
    try {
      const response = await axios.put(`${this.baseUrl}/${id}`, flightData);
      return response.data;
    } catch (error) {
      console.error(`Error updating flight with ID ${id}:`, error);
      throw error;
    }
  }
  
  public async deleteFlight(id: number): Promise<void> {
    try {
      await axios.delete(`${this.baseUrl}/${id}`);
    } catch (error) {
      console.error(`Error deleting flight with ID ${id}:`, error);
      throw error;
    }
  }

  public async searchFlights(params: FlightSearchParams): Promise<Flight[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/search`, { params });
      return response.data;
    } catch (error) {
      console.error('Error searching flights:', error);
      throw error;
    }
  }
  
  public async getApiStatistics(): Promise<any> {
    try {
      const response = await axios.get('/api/admin/flight-api/statistics');
      return response.data;
    } catch (error) {
      console.error('Error fetching API statistics:', error);
      throw error;
    }
  }
  
  public async toggleApiMode(useApi: boolean): Promise<void> {
    try {
      await axios.post('/api/admin/flight-api/toggle', { useApi });
    } catch (error) {
      console.error('Error toggling API mode:', error);
      throw error;
    }
  }
  
  public async getApiStatus(): Promise<{ useApi: boolean }> {
    try {
      const response = await axios.get('/api/admin/flight-api/status');
      return response.data;
    } catch (error) {
      console.error('Error fetching API status:', error);
      throw error;
    }
  }
}

export default new FlightService();
export type { Flight, FlightSearchParams }; 