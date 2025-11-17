/**
 * Utility functions for formatting data in the ticket booking system
 */

/**
 * Format price with Indian Rupee symbol and thousands separators
 * @param price - Price in numerical format
 * @returns Formatted price string with currency symbol
 */
export const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(price);
};

/**
 * Format date and time for display
 * @param dateString - ISO date string
 * @returns Formatted date and time string
 */
export const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(date);
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateString;
  }
};

/**
 * Format date only (no time)
 * @param dateString - ISO date string
 * @returns Formatted date string
 */
export const formatDateOnly = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-IN', {
      dateStyle: 'medium'
    }).format(date);
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateString;
  }
};

/**
 * Format time only (no date)
 * @param dateString - ISO date string
 * @returns Formatted time string
 */
export const formatTimeOnly = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-IN', {
      timeStyle: 'short'
    }).format(date);
  } catch (error) {
    console.error('Error formatting time:', error);
    return dateString;
  }
};

/**
 * Format flight duration from departure and arrival timestamps
 * @param departureTime - Departure ISO date string
 * @param arrivalTime - Arrival ISO date string
 * @returns Formatted duration string (e.g., "2h 15m")
 */
export const formatDuration = (departureTime: string, arrivalTime: string): string => {
  try {
    const departure = new Date(departureTime);
    const arrival = new Date(arrivalTime);
    
    // Calculate duration in minutes
    const durationInMinutes = (arrival.getTime() - departure.getTime()) / (1000 * 60);
    
    // Convert to hours and minutes
    const hours = Math.floor(durationInMinutes / 60);
    const minutes = Math.floor(durationInMinutes % 60);
    
    // Format the duration string
    if (hours > 0) {
      return `${hours}h ${minutes > 0 ? `${minutes}m` : ''}`;
    } else {
      return `${minutes}m`;
    }
  } catch (error) {
    console.error('Error calculating duration:', error);
    return 'N/A';
  }
};

/**
 * Format a flight number with airline code and number
 * @param flightNumber - Raw flight number
 * @returns Formatted flight number
 */
export const formatFlightNumber = (flightNumber: string): string => {
  // If the flight number already has a space, return as is
  if (flightNumber.includes(' ')) {
    return flightNumber;
  }
  
  // Try to separate airline code and flight number
  // Assuming airline code is 2 characters followed by numbers
  const match = flightNumber.match(/^([A-Z0-9]{2})(\d+)$/i);
  
  if (match) {
    return `${match[1]} ${match[2]}`;
  }
  
  return flightNumber;
};

export default {
  formatPrice,
  formatDate,
  formatDateOnly,
  formatTimeOnly,
  formatDuration,
  formatFlightNumber
}; 