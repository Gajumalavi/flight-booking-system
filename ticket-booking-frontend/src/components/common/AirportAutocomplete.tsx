import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  TextField,
  Box,
  Typography,
  Popper,
  Paper,
  ClickAwayListener,
  CircularProgress,
  InputAdornment,
  IconButton,
  Divider,
  styled
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import HighlightText from './HighlightText';
import { searchAirports as apiSearchAirports, Airport as ApiAirport } from '../../services/api';

// API base URL
const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8080';

// Re-export Airport interface for compatibility
export interface Airport extends ApiAirport {}

interface AirportAutocompleteProps {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (value: string, airport?: Airport) => void;
  disabled?: boolean;
  required?: boolean;
  error?: boolean;
  helperText?: string;
}

// Styled components
const CodePill = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: '48px',
  height: '32px',
  backgroundColor: '#f0f0f0',
  borderRadius: '4px',
  marginRight: theme.spacing(1.5),
  padding: theme.spacing(0, 1),
  fontWeight: 'bold'
}));

const ResultItem = styled(Box)(({ theme }) => ({
  padding: theme.spacing(1.5),
  display: 'flex',
  alignItems: 'flex-start',
  cursor: 'pointer',
  '&:hover': {
    backgroundColor: theme.palette.action.hover
  }
}));

const AirportAutocomplete: React.FC<AirportAutocompleteProps> = ({
  label,
  placeholder,
  value,
  onChange,
  disabled = false,
  required = false,
  error = false,
  helperText,
}) => {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<Airport[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [displayValue, setDisplayValue] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const anchorRef = useRef<HTMLDivElement>(null);
  
  // Set initial display value based on input value
  useEffect(() => {
    if (!value) {
      setDisplayValue('');
      setSearchText('');
    }
  }, [value]);
  
  // Search airports function
  const searchAirports = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setOptions([]);
      setOpen(false);
      setErrorMessage(null);
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    
    try {
      const results = await apiSearchAirports(query);
      
      if (results.length > 0) {
        setOptions(results);
        setOpen(true);
      } else {
        setOptions([]);
        setOpen(false);
        setErrorMessage('No airports found matching your search');
      }
    } catch (error) {
      setOptions([]);
      setOpen(false);
      
      // Check if the error is an auth error
      if (error instanceof Error && 'status' in error && error.status === 403) {
        setErrorMessage('Authentication required. Please login again.');
      } else {
        setErrorMessage('Error searching airports. Please try again.');
      }
      console.error('Airport search error:', error);
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Handle input change
  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;
    setSearchText(newValue);
    setDisplayValue(newValue);
    searchAirports(newValue);
  };
  
  // Handle option selection
  const handleOptionSelect = (airport: Airport) => {
    const formattedValue = `${airport.code} - ${airport.city}`;
    setDisplayValue(formattedValue);
    setSearchText(formattedValue);
    setOpen(false);
    onChange(airport.code, airport);
  };
  
  // Handle clearing the input
  const handleClear = () => {
    setDisplayValue('');
    setSearchText('');
    setOpen(false);
    onChange('');
  };
  
  // Close dropdown when clicking away
  const handleClickAway = () => {
    setOpen(false);
  };
  
  // Format location display
  const getLocationDisplay = (airport: Airport) => {
    const parts = [];
    if (airport.city) parts.push(airport.city);
    if (airport.state) parts.push(airport.state);
    if (airport.country) parts.push(airport.country);
    return parts.join(', ');
  };
  
  return (
    <ClickAwayListener onClickAway={handleClickAway}>
      <Box ref={anchorRef} sx={{ position: 'relative', width: '100%' }}>
        <TextField
          fullWidth
          label={label}
          placeholder={placeholder || 'Enter city, airport name, or code'}
          value={displayValue}
          onChange={handleInputChange}
          onFocus={() => searchText.length >= 2 && searchAirports(searchText)}
          disabled={disabled}
          required={required}
          error={!!errorMessage || error}
          helperText={errorMessage || helperText}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
            endAdornment: displayValue ? (
              <InputAdornment position="end">
                <IconButton 
                  aria-label="clear input"
                  onClick={handleClear}
                  edge="end"
                  size="small"
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ) : null
          }}
        />
        
        <Popper
          open={open}
          anchorEl={anchorRef.current}
          placement="bottom-start"
          style={{ width: anchorRef.current?.clientWidth, zIndex: 1301 }}
        >
          <Paper elevation={3} sx={{ maxHeight: 300, overflow: 'auto' }}>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                <CircularProgress size={24} />
              </Box>
            ) : (
              options.map((airport) => (
                <React.Fragment key={airport.id}>
                  <ResultItem onClick={() => handleOptionSelect(airport)}>
                    <CodePill>{airport.code}</CodePill>
                    <Box sx={{ overflow: 'hidden' }}>
                      <Typography variant="body1" noWrap>
                        <HighlightText 
                          text={`${airport.city}${airport.state ? ', ' + airport.state : ''}, ${airport.country}`} 
                          highlight={searchText} 
                        />
                      </Typography>
                      <Typography 
                        variant="body2" 
                        color="text.secondary" 
                        noWrap
                        sx={{ mt: 0.5 }}
                      >
                        <HighlightText 
                          text={airport.name} 
                          highlight={searchText} 
                        />
                      </Typography>
                    </Box>
                  </ResultItem>
                  <Divider />
                </React.Fragment>
              ))
            )}
          </Paper>
        </Popper>
      </Box>
    </ClickAwayListener>
  );
};

export default AirportAutocomplete; 