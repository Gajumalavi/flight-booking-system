// Session timeout handling
const SESSION_TIMEOUT_KEY = 'session_timeout';
const SESSION_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

/**
 * Initialize the session timeout
 */
export const initializeSession = (): void => {
  resetSessionTimeout();
  window.addEventListener('mousemove', resetSessionTimeout);
  window.addEventListener('mousedown', resetSessionTimeout);
  window.addEventListener('keypress', resetSessionTimeout);
  window.addEventListener('touchmove', resetSessionTimeout);
  window.addEventListener('scroll', resetSessionTimeout);
};

/**
 * Reset the session timeout
 */
export const resetSessionTimeout = (): void => {
  const expiryTime = Date.now() + SESSION_DURATION;
  localStorage.setItem(SESSION_TIMEOUT_KEY, expiryTime.toString());
};

/**
 * Check if the session is expired
 */
export const isSessionExpired = (): boolean => {
  const expiryTimeStr = localStorage.getItem(SESSION_TIMEOUT_KEY);
  if (!expiryTimeStr) return true;
  
  const expiryTime = parseInt(expiryTimeStr, 10);
  return Date.now() > expiryTime;
};

/**
 * Handle session expiration
 * @param navigateFunction - React Router's navigate function
 */
export const handleSessionExpiration = (navigateFunction: (path: string) => void): void => {
  if (isSessionExpired()) {
    // Clear all user data
    clearSession();
    
    // Redirect to login page with message
    navigateFunction('/login?expired=true');
  }
};

/**
 * Clear session data on logout
 */
export const clearSession = (): void => {
  // Clear authentication data
  localStorage.removeItem('token');
  localStorage.removeItem(SESSION_TIMEOUT_KEY);
  
  // Clear user information
  localStorage.removeItem('userId');
  localStorage.removeItem('userEmail');
  localStorage.removeItem('userRole');
  localStorage.removeItem('userFirstName');
  localStorage.removeItem('userLastName');
  
  // Remove event listeners
  window.removeEventListener('mousemove', resetSessionTimeout);
  window.removeEventListener('mousedown', resetSessionTimeout);
  window.removeEventListener('keypress', resetSessionTimeout);
  window.removeEventListener('touchmove', resetSessionTimeout);
  window.removeEventListener('scroll', resetSessionTimeout);
}; 