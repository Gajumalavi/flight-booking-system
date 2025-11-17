/**
 * Airport and airline data for the flight booking system
 */

export interface Airport {
  code: string;
  name: string;
  city: string;
  state?: string;
}

export interface Airline {
  code: string;
  name: string;
  country: string;
  logo?: string;
}

// List of major Indian airports
export const airports: Airport[] = [
  { code: 'DEL', name: 'Indira Gandhi International Airport', city: 'Delhi', state: 'Delhi' },
  { code: 'BOM', name: 'Chhatrapati Shivaji Maharaj International Airport', city: 'Mumbai', state: 'Maharashtra' },
  { code: 'BLR', name: 'Kempegowda International Airport', city: 'Bangalore', state: 'Karnataka' },
  { code: 'MAA', name: 'Chennai International Airport', city: 'Chennai', state: 'Tamil Nadu' },
  { code: 'HYD', name: 'Rajiv Gandhi International Airport', city: 'Hyderabad', state: 'Telangana' },
  { code: 'CCU', name: 'Netaji Subhas Chandra Bose International Airport', city: 'Kolkata', state: 'West Bengal' },
  { code: 'COK', name: 'Cochin International Airport', city: 'Kochi', state: 'Kerala' },
  { code: 'AMD', name: 'Sardar Vallabhbhai Patel International Airport', city: 'Ahmedabad', state: 'Gujarat' },
  { code: 'PNQ', name: 'Pune Airport', city: 'Pune', state: 'Maharashtra' },
  { code: 'GOI', name: 'Goa International Airport', city: 'Goa', state: 'Goa' },
  { code: 'GOX', name: 'Manohar International Airport', city: 'Goa', state: 'Goa' },
  { code: 'LKO', name: 'Chaudhary Charan Singh International Airport', city: 'Lucknow', state: 'Uttar Pradesh' },
  { code: 'JAI', name: 'Jaipur International Airport', city: 'Jaipur', state: 'Rajasthan' },
  { code: 'IXC', name: 'Chandigarh International Airport', city: 'Chandigarh', state: 'Chandigarh' },
  { code: 'PAT', name: 'Jay Prakash Narayan International Airport', city: 'Patna', state: 'Bihar' },
  { code: 'BBI', name: 'Biju Patnaik International Airport', city: 'Bhubaneswar', state: 'Odisha' },
  { code: 'IXB', name: 'Bagdogra Airport', city: 'Siliguri', state: 'West Bengal' },
  { code: 'GAU', name: 'Lokpriya Gopinath Bordoloi International Airport', city: 'Guwahati', state: 'Assam' },
  { code: 'IDR', name: 'Devi Ahilya Bai Holkar Airport', city: 'Indore', state: 'Madhya Pradesh' },
  { code: 'ATQ', name: 'Sri Guru Ram Dass Jee International Airport', city: 'Amritsar', state: 'Punjab' },
  { code: 'SXR', name: 'Sheikh ul-Alam International Airport', city: 'Srinagar', state: 'Jammu and Kashmir' },
  { code: 'TRV', name: 'Trivandrum International Airport', city: 'Thiruvananthapuram', state: 'Kerala' },
  { code: 'IXZ', name: 'Veer Savarkar International Airport', city: 'Port Blair', state: 'Andaman and Nicobar Islands' },
  { code: 'VTZ', name: 'Visakhapatnam Airport', city: 'Visakhapatnam', state: 'Andhra Pradesh' },
  { code: 'IXM', name: 'Madurai Airport', city: 'Madurai', state: 'Tamil Nadu' },
  { code: 'IXE', name: 'Mangalore International Airport', city: 'Mangalore', state: 'Karnataka' },
  // Additional airports
  { code: 'AGR', name: 'Agra Airport', city: 'Agra', state: 'Uttar Pradesh' },
  { code: 'IXA', name: 'Agartala Airport', city: 'Agartala', state: 'Tripura' },
  { code: 'IXD', name: 'Allahabad Airport', city: 'Allahabad', state: 'Uttar Pradesh' },
  { code: 'IXV', name: 'Along Airport', city: 'Along', state: 'Arunachal Pradesh' },
  { code: 'IXU', name: 'Aurangabad Airport', city: 'Aurangabad', state: 'Maharashtra' },
  { code: 'RGH', name: 'Balurghat Airport', city: 'Balurghat', state: 'West Bengal' },
  { code: 'BDQ', name: 'Vadodara Airport', city: 'Vadodara', state: 'Gujarat' },
  { code: 'IXG', name: 'Belgaum Airport', city: 'Belgaum', state: 'Karnataka' },
  { code: 'BUP', name: 'Bhatinda Airport', city: 'Bhatinda', state: 'Punjab' },
  { code: 'BHU', name: 'Bhavnagar Airport', city: 'Bhavnagar', state: 'Gujarat' },
  { code: 'BHO', name: 'Raja Bhoj Airport', city: 'Bhopal', state: 'Madhya Pradesh' },
  { code: 'BJP', name: 'Biju Patnaik Airport', city: 'Bhubaneswar', state: 'Odisha' },
  { code: 'IXR', name: 'Birsa Munda Airport', city: 'Ranchi', state: 'Jharkhand' },
  { code: 'CBD', name: 'Car Nicobar Airport', city: 'Car Nicobar', state: 'Andaman and Nicobar Islands' },
  { code: 'IXJ', name: 'Satwari Airport', city: 'Jammu', state: 'Jammu and Kashmir' },
  { code: 'JRH', name: 'Jorhat Airport', city: 'Jorhat', state: 'Assam' },
  { code: 'IXH', name: 'Kailashahar Airport', city: 'Kailashahar', state: 'Tripura' },
  { code: 'KNU', name: 'Kanpur Airport', city: 'Kanpur', state: 'Uttar Pradesh' },
  { code: 'KLH', name: 'Kolhapur Airport', city: 'Kolhapur', state: 'Maharashtra' },
  { code: 'KTU', name: 'Kota Airport', city: 'Kota', state: 'Rajasthan' },
  { code: 'CNN', name: 'Kannur International Airport', city: 'Kannur', state: 'Kerala' },
  { code: 'NAG', name: 'Dr. Babasaheb Ambedkar International Airport', city: 'Nagpur', state: 'Maharashtra' },
  { code: 'RPR', name: 'Swami Vivekananda Airport', city: 'Raipur', state: 'Chhattisgarh' },
  { code: 'RAJ', name: 'Rajkot Airport', city: 'Rajkot', state: 'Gujarat' },
  { code: 'RJA', name: 'Rajahmundry Airport', city: 'Rajahmundry', state: 'Andhra Pradesh' },
  { code: 'STV', name: 'Surat Airport', city: 'Surat', state: 'Gujarat' },
  { code: 'TEZ', name: 'Tezpur Airport', city: 'Tezpur', state: 'Assam' },
  { code: 'TIR', name: 'Tirupati Airport', city: 'Tirupati', state: 'Andhra Pradesh' },
  { code: 'TCR', name: 'Tuticorin Airport', city: 'Tuticorin', state: 'Tamil Nadu' },
  { code: 'UDR', name: 'Maharana Pratap Airport', city: 'Udaipur', state: 'Rajasthan' },
  { code: 'BDI', name: 'Vadodara Airport', city: 'Vadodara', state: 'Gujarat' },
  { code: 'VNS', name: 'Lal Bahadur Shastri Airport', city: 'Varanasi', state: 'Uttar Pradesh' },
  
  // International airports
  { code: 'JFK', name: 'John F. Kennedy International Airport', city: 'New York', state: 'New York' },
  { code: 'LHR', name: 'Heathrow Airport', city: 'London', state: 'England' },
  { code: 'CDG', name: 'Charles de Gaulle Airport', city: 'Paris', state: 'Île-de-France' },
  { code: 'DXB', name: 'Dubai International Airport', city: 'Dubai', state: 'Dubai' },
  { code: 'SIN', name: 'Singapore Changi Airport', city: 'Singapore', state: 'Singapore' },
  { code: 'HND', name: 'Haneda Airport', city: 'Tokyo', state: 'Tokyo' },
  { code: 'SYD', name: 'Sydney Airport', city: 'Sydney', state: 'New South Wales' },
  { code: 'HKG', name: 'Hong Kong International Airport', city: 'Hong Kong', state: 'Hong Kong' },
  { code: 'FRA', name: 'Frankfurt Airport', city: 'Frankfurt', state: 'Hesse' },
  { code: 'AMS', name: 'Amsterdam Airport Schiphol', city: 'Amsterdam', state: 'North Holland' },
  { code: 'MAD', name: 'Adolfo Suárez Madrid–Barajas Airport', city: 'Madrid', state: 'Madrid' },
  { code: 'FCO', name: 'Leonardo da Vinci International Airport', city: 'Rome', state: 'Lazio' },
  { code: 'ZRH', name: 'Zurich Airport', city: 'Zurich', state: 'Zurich' },
  { code: 'IST', name: 'Istanbul Airport', city: 'Istanbul', state: 'Istanbul' },
  { code: 'DOH', name: 'Hamad International Airport', city: 'Doha', state: 'Doha' },
  { code: 'AUH', name: 'Abu Dhabi International Airport', city: 'Abu Dhabi', state: 'Abu Dhabi' },
  { code: 'BKK', name: 'Suvarnabhumi Airport', city: 'Bangkok', state: 'Bangkok' },
  { code: 'KUL', name: 'Kuala Lumpur International Airport', city: 'Kuala Lumpur', state: 'Selangor' },
  { code: 'MNL', name: 'Ninoy Aquino International Airport', city: 'Manila', state: 'Metro Manila' },
  { code: 'CGK', name: 'Soekarno–Hatta International Airport', city: 'Jakarta', state: 'Jakarta' },
  { code: 'PEK', name: 'Beijing Capital International Airport', city: 'Beijing', state: 'Beijing' },
  { code: 'PVG', name: 'Shanghai Pudong International Airport', city: 'Shanghai', state: 'Shanghai' },
  { code: 'ICN', name: 'Incheon International Airport', city: 'Seoul', state: 'Incheon' },
  { code: 'MEL', name: 'Melbourne Airport', city: 'Melbourne', state: 'Victoria' },
  { code: 'AKL', name: 'Auckland Airport', city: 'Auckland', state: 'Auckland' },
  { code: 'YVR', name: 'Vancouver International Airport', city: 'Vancouver', state: 'British Columbia' },
  { code: 'YYZ', name: 'Toronto Pearson International Airport', city: 'Toronto', state: 'Ontario' },
  { code: 'GRU', name: 'São Paulo/Guarulhos International Airport', city: 'São Paulo', state: 'São Paulo' },
  { code: 'EZE', name: 'Ministro Pistarini International Airport', city: 'Buenos Aires', state: 'Buenos Aires' },
  { code: 'CPT', name: 'Cape Town International Airport', city: 'Cape Town', state: 'Western Cape' },
  { code: 'JNB', name: 'O.R. Tambo International Airport', city: 'Johannesburg', state: 'Gauteng' }
];

// List of major airlines operating in India
export const airlines: Airline[] = [
  { code: 'AI', name: 'Air India', country: 'India' },
  { code: 'UK', name: 'Vistara', country: 'India' },
  { code: 'SG', name: 'SpiceJet', country: 'India' },
  { code: 'G8', name: 'GoAir', country: 'India' },
  { code: '6E', name: 'IndiGo', country: 'India' },
  { code: 'I5', name: 'AirAsia India', country: 'India' },
  { code: 'IX', name: 'Air India Express', country: 'India' },
  { code: 'QP', name: 'Akasa Air', country: 'India' },
  { code: 'EK', name: 'Emirates', country: 'United Arab Emirates' },
  { code: 'EY', name: 'Etihad Airways', country: 'United Arab Emirates' },
  { code: 'QR', name: 'Qatar Airways', country: 'Qatar' },
  { code: 'BA', name: 'British Airways', country: 'United Kingdom' },
  { code: 'LH', name: 'Lufthansa', country: 'Germany' },
  { code: 'SQ', name: 'Singapore Airlines', country: 'Singapore' },
  { code: 'TG', name: 'Thai Airways', country: 'Thailand' },
  { code: 'CX', name: 'Cathay Pacific', country: 'Hong Kong' }
];

/**
 * Get a list of all cities with airports
 * @returns Array of city names
 */
export const getCities = (): string[] => {
  // Create a Set of cities to remove duplicates
  const citySet = new Set<string>(airports.map(airport => airport.city));
  // Convert Set to Array using Array.from() instead of spread operator
  return Array.from(citySet).sort();
};

/**
 * Get airport code by city name
 * @param city - City name
 * @returns Airport code (e.g., DEL for Delhi)
 */
export const getAirportCodeByCity = (city: string): string | undefined => {
  const airport = airports.find(a => a.city.toLowerCase() === city.toLowerCase());
  return airport?.code;
};

/**
 * Get city by airport code
 * @param code - Airport code
 * @returns City name
 */
export const getCityByAirportCode = (code: string): string | undefined => {
  const airport = airports.find(a => a.code === code);
  return airport?.city;
};

/**
 * Get airline by code
 * @param code - Airline code
 * @returns Airline object
 */
export const getAirlineByCode = (code: string): Airline | undefined => {
  return airlines.find(a => a.code === code);
};

/**
 * Get airline name by code
 * @param code - Airline code
 * @returns Airline name
 */
export const getAirlineNameByCode = (code: string): string => {
  const airline = getAirlineByCode(code);
  return airline ? airline.name : code;
};

export default {
  airports,
  airlines,
  getCities,
  getAirportCodeByCity,
  getCityByAirportCode,
  getAirlineByCode,
  getAirlineNameByCode
}; 