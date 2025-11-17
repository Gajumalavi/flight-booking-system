# Amadeus API Integration Guide

This document provides information on how the Amadeus Flight API is integrated into the ticket booking system.

## Configuration

The Amadeus API is configured in the following files:

1. `application.properties` - Contains API keys, URLs, and feature flags
2. `AmadeusApiConfig.java` - Configuration properties class for Amadeus API settings
3. `AppFeatureConfig.java` - Feature flag configuration for enabling/disabling API
4. `ApiQuotaConfig.java` - Configuration for tracking API usage quota

## API Access

The application uses the Amadeus Test API with the following credentials:

- API Key: LR5jqXyQf22xB3cOqtvLqPKCQ1YgFJ9H
- Secret Key: vyeJQ99hs4BdvIXF

## Implementation Details

### Client Implementation

The `AmadeusApiClient` class handles all direct interactions with the Amadeus API:

- Authentication using OAuth2 client credentials flow
- Token management (requesting new tokens, caching, expiry handling)
- Flight search requests
- Error handling and logging
- API quota tracking

### Data Mapping

The `FlightMapperService` handles mapping between Amadeus API responses and our internal Flight model:

- Maps API flight offers to our Flight model
- Generates temporary IDs for API-sourced flights
- Handles date/time parsing
- Creates seat data for API flights

### DTO Classes

Several DTO classes handle the Amadeus API data structure:

- `AmadeusTokenResponse` - Response from the OAuth2 token endpoint
- `AmadeusFlightOffersResponse` - Wrapper for flight search results
- `AmadeusFlightOffer` - Individual flight offer with details
- `AmadeusFlightSearchRequest` - For constructing flight search requests

### Integration with Existing System

The system integrates with the existing flight booking flow:

1. `FlightService` is enhanced to first try the API when the feature is enabled
2. If API fails or returns no results, it falls back to the database
3. API flights can be saved to the database when booked
4. A feature flag controls whether to use the API or database

## Admin Controls

Admin users have special controls for the API integration:

- Toggle API/Database mode on/off
- View API usage statistics
- Monitor quota usage

## API Usage Optimization

To stay within the monthly quota limit of 2000 calls:

1. API calls are tracked in the `ApiQuotaConfig`
2. The system falls back to database when quota is exceeded
3. API flights are saved to the database when booked to reduce future API calls
4. Admin can disable the API feature if quota is running low

## Error Handling

The implementation includes robust error handling:

1. Connection errors fall back to database gracefully
2. Token expiry is handled automatically
3. Response parsing errors are caught and logged
4. Quota exceeded conditions are properly managed

## Testing the API

To test the API integration:

1. Ensure the feature flag `app.features.use-api=true` is set in application.properties
2. Use the flight search endpoint with valid IATA airport codes
3. Check the logs for API interaction details
4. Admin users can toggle API mode with POST to `/api/flights/toggle-api-mode`

## Limitations

Current limitations of the API integration:

1. Only supports flight search, not booking through the API
2. Limited to what the Amadeus test API provides
3. Requires valid IATA airport codes for origin/destination
4. Monthly call limit of 2000 requests

## Future Enhancements

Planned enhancements for the API integration:

1. Enhanced error reporting in the UI
2. Caching frequently searched routes
3. More sophisticated quota management
4. Full integration with the Amadeus booking APIs 