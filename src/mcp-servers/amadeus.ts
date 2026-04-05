/**
 * Amadeus MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official Amadeus MCP server was found on GitHub. Multiple community servers
// exist (donghyun-chae/mcp-amadeus, privilegemendes/amadeus-mcp-server-standalone,
// fiqcodes/amadeus-mcp-server) but none are published or maintained by Amadeus IT Group.
// We build a full REST wrapper covering flights, hotels, airport data, and travel analytics.
//
// Base URL: https://test.api.amadeus.com (test) / https://api.amadeus.com (production)
// Auth: OAuth2 client credentials — POST /v1/security/oauth2/token → Bearer token
//   Body: grant_type=client_credentials&client_id=KEY&client_secret=SECRET
// Docs: https://developers.amadeus.com/self-service/apis-docs/guides/developer-guides/
// Rate limits: Self-service sandbox free — 1 req/100ms soft; production varies by plan

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface AmadeusConfig {
  clientId: string;
  clientSecret: string;
  baseUrl?: string;   // default: https://test.api.amadeus.com (sandbox)
}

export class AmadeusMCPServer extends MCPAdapterBase {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly baseUrl: string;

  private bearerToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: AmadeusConfig) {
    super();
    this.clientId     = config.clientId;
    this.clientSecret = config.clientSecret;
    this.baseUrl      = config.baseUrl || 'https://test.api.amadeus.com';
  }

  static catalog() {
    return {
      name: 'amadeus',
      displayName: 'Amadeus',
      version: '1.0.0',
      category: 'misc',
      keywords: [
        'amadeus', 'travel', 'flight', 'airline', 'booking', 'hotel', 'airport',
        'itinerary', 'fares', 'seat', 'baggage', 'transfer', 'destination',
        'tourist attractions', 'points of interest', 'gds', 'travelport',
        'roundtrip', 'one-way', 'flight search', 'hotel search', 'activities',
      ],
      toolNames: [
        'search_flights',
        'price_flight_offer',
        'get_flight_price_analysis',
        'get_flight_cheapest_dates',
        'get_flight_inspiration',
        'get_flight_availability',
        'get_airline_info',
        'search_airports',
        'get_airport_routes',
        'search_hotels',
        'get_hotel_offers',
        'get_hotel_ratings',
        'search_activities',
        'get_points_of_interest',
        'get_location_score',
        'get_most_booked_destinations',
        'get_most_traveled_destinations',
        'search_transfers',
      ],
      description: 'Amadeus travel platform: search flights and prices, hotel availability, airport data, destination inspiration, tourist activities, and travel analytics.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Flights ────────────────────────────────────────────────────────────
      {
        name: 'search_flights',
        description: 'Search for available flight offers by origin, destination, and date — returns itineraries with prices, airlines, and stops',
        inputSchema: {
          type: 'object',
          properties: {
            originLocationCode: {
              type: 'string',
              description: 'Departure airport IATA code (e.g. JFK, LAX, LHR)',
            },
            destinationLocationCode: {
              type: 'string',
              description: 'Arrival airport IATA code (e.g. CDG, NRT, DXB)',
            },
            departureDate: {
              type: 'string',
              description: 'Departure date in YYYY-MM-DD format (e.g. 2026-06-15)',
            },
            returnDate: {
              type: 'string',
              description: 'Return date in YYYY-MM-DD format for round trips (omit for one-way)',
            },
            adults: {
              type: 'number',
              description: 'Number of adult passengers (default: 1)',
            },
            children: {
              type: 'number',
              description: 'Number of child passengers aged 2-11 (default: 0)',
            },
            infants: {
              type: 'number',
              description: 'Number of infant passengers under 2 years (default: 0)',
            },
            travelClass: {
              type: 'string',
              description: 'Cabin class: ECONOMY, PREMIUM_ECONOMY, BUSINESS, or FIRST (default: ECONOMY)',
            },
            nonStop: {
              type: 'boolean',
              description: 'Return only non-stop direct flights (default: false)',
            },
            currencyCode: {
              type: 'string',
              description: 'Currency for prices (ISO 4217 code, e.g. USD, EUR, GBP — default: USD)',
            },
            maxPrice: {
              type: 'number',
              description: 'Maximum total price per traveler in the specified currency',
            },
            max: {
              type: 'number',
              description: 'Maximum number of flight offers to return (max: 250, default: 10)',
            },
          },
          required: ['originLocationCode', 'destinationLocationCode', 'departureDate'],
        },
      },
      {
        name: 'price_flight_offer',
        description: 'Confirm the real-time price and availability for a flight offer returned by search_flights — required before booking',
        inputSchema: {
          type: 'object',
          properties: {
            flight_offer: {
              type: 'object',
              description: 'A single flight offer object as returned by search_flights (the full JSON object)',
            },
            include_bags: {
              type: 'boolean',
              description: 'Include available baggage options in the pricing response (default: false)',
            },
          },
          required: ['flight_offer'],
        },
      },
      {
        name: 'get_flight_price_analysis',
        description: 'Get historical price analysis for a route — assess whether a current price is cheap, typical, or expensive',
        inputSchema: {
          type: 'object',
          properties: {
            originIataCode: {
              type: 'string',
              description: 'Departure airport IATA code (e.g. JFK)',
            },
            destinationIataCode: {
              type: 'string',
              description: 'Arrival airport IATA code (e.g. CDG)',
            },
            departureDate: {
              type: 'string',
              description: 'Departure date in YYYY-MM-DD format',
            },
            currencyCode: {
              type: 'string',
              description: 'Currency for price display (ISO 4217 code, default: USD)',
            },
            oneWay: {
              type: 'boolean',
              description: 'Analyze one-way fares (true) or round-trip fares (false, default: false)',
            },
          },
          required: ['originIataCode', 'destinationIataCode', 'departureDate'],
        },
      },
      {
        name: 'get_flight_cheapest_dates',
        description: 'Find the cheapest travel dates for a route within a 1-month window — returns dates with lowest prices',
        inputSchema: {
          type: 'object',
          properties: {
            origin: {
              type: 'string',
              description: 'Departure airport or city IATA code (e.g. JFK)',
            },
            destination: {
              type: 'string',
              description: 'Arrival airport or city IATA code (e.g. CDG)',
            },
            departureDate: {
              type: 'string',
              description: 'Starting month to search in YYYY-MM format (e.g. 2026-06)',
            },
            duration: {
              type: 'string',
              description: 'Trip duration in days as a range (e.g. "1,15" for 1 to 15 day trips)',
            },
            nonStop: {
              type: 'boolean',
              description: 'Only show non-stop flights (default: false)',
            },
            currencyCode: {
              type: 'string',
              description: 'Currency code for prices (default: USD)',
            },
          },
          required: ['origin', 'destination'],
        },
      },
      {
        name: 'get_flight_inspiration',
        description: 'Get destination inspiration from an origin airport — returns destinations with lowest available fares',
        inputSchema: {
          type: 'object',
          properties: {
            origin: {
              type: 'string',
              description: 'Departure airport IATA code (e.g. JFK, LAX)',
            },
            departureDate: {
              type: 'string',
              description: 'Departure date or month (YYYY-MM-DD or YYYY-MM)',
            },
            maxPrice: {
              type: 'number',
              description: 'Maximum price filter in USD',
            },
            currencyCode: {
              type: 'string',
              description: 'Currency code for prices (default: USD)',
            },
          },
          required: ['origin'],
        },
      },
      {
        name: 'get_flight_availability',
        description: 'Check seat class availability for specific flights by origin, destination, date, and cabin class',
        inputSchema: {
          type: 'object',
          properties: {
            originLocationCode: {
              type: 'string',
              description: 'Departure airport IATA code',
            },
            destinationLocationCode: {
              type: 'string',
              description: 'Arrival airport IATA code',
            },
            departureDate: {
              type: 'string',
              description: 'Departure date in YYYY-MM-DD format',
            },
            adults: {
              type: 'number',
              description: 'Number of adult passengers (default: 1)',
            },
            travelClass: {
              type: 'string',
              description: 'Cabin class to check: ECONOMY, PREMIUM_ECONOMY, BUSINESS, FIRST',
            },
          },
          required: ['originLocationCode', 'destinationLocationCode', 'departureDate'],
        },
      },
      // ── Airlines & Airports ────────────────────────────────────────────────
      {
        name: 'get_airline_info',
        description: 'Get airline details by IATA or ICAO airline code — name, business name, and code type',
        inputSchema: {
          type: 'object',
          properties: {
            airlineCodes: {
              type: 'string',
              description: 'Comma-separated airline IATA or ICAO codes (e.g. "AA,UA,DL" or "BA,LH")',
            },
          },
          required: ['airlineCodes'],
        },
      },
      {
        name: 'search_airports',
        description: 'Search for airports and cities by keyword — returns IATA codes, names, and geographic coordinates',
        inputSchema: {
          type: 'object',
          properties: {
            keyword: {
              type: 'string',
              description: 'Airport or city name to search for (e.g. "New York", "London", "CDG")',
            },
            subType: {
              type: 'string',
              description: 'Filter by type: AIRPORT, CITY, or both (comma-separated, default: AIRPORT,CITY)',
            },
            countryCode: {
              type: 'string',
              description: 'ISO 2-letter country code to limit results (e.g. US, GB, DE)',
            },
            page_limit: {
              type: 'number',
              description: 'Maximum results to return (default: 10)',
            },
          },
          required: ['keyword'],
        },
      },
      {
        name: 'get_airport_routes',
        description: 'Get the list of direct flight destinations available from a specific airport',
        inputSchema: {
          type: 'object',
          properties: {
            departureAirportCode: {
              type: 'string',
              description: 'Departure airport IATA code (e.g. JFK, LHR)',
            },
            arrivalCountryCode: {
              type: 'string',
              description: 'Optional ISO 2-letter country code to filter by destination country',
            },
            max: {
              type: 'number',
              description: 'Maximum number of routes to return (default: 20)',
            },
          },
          required: ['departureAirportCode'],
        },
      },
      // ── Hotels ─────────────────────────────────────────────────────────────
      {
        name: 'search_hotels',
        description: 'Search for hotels in a city or near coordinates — returns hotel IDs, names, and locations',
        inputSchema: {
          type: 'object',
          properties: {
            cityCode: {
              type: 'string',
              description: 'IATA city code to search hotels in (e.g. PAR for Paris, NYC for New York)',
            },
            latitude: {
              type: 'number',
              description: 'Latitude for geo-based hotel search (use with longitude and radius)',
            },
            longitude: {
              type: 'number',
              description: 'Longitude for geo-based hotel search (use with latitude and radius)',
            },
            radius: {
              type: 'number',
              description: 'Search radius in km when using latitude/longitude (default: 5)',
            },
            amenities: {
              type: 'string',
              description: 'Comma-separated amenity filters: SWIMMING_POOL, SPA, FITNESS_CENTER, AIR_CONDITIONING, RESTAURANT, PARKING, PETS_ALLOWED, AIRPORT_SHUTTLE, WIFI',
            },
            ratings: {
              type: 'string',
              description: 'Comma-separated star ratings to filter by (e.g. "4,5" for 4 and 5-star hotels)',
            },
            hotelSource: {
              type: 'string',
              description: 'Data source: BEDBANK, DIRECTCHAIN, or ALL (default: ALL)',
            },
          },
        },
      },
      {
        name: 'get_hotel_offers',
        description: 'Get available room offers and real-time prices for specific hotels by hotel IDs, check-in/check-out dates',
        inputSchema: {
          type: 'object',
          properties: {
            hotelIds: {
              type: 'string',
              description: 'Comma-separated Amadeus hotel IDs from search_hotels (e.g. "MCLONGHM,MCLONGBW")',
            },
            checkInDate: {
              type: 'string',
              description: 'Check-in date in YYYY-MM-DD format',
            },
            checkOutDate: {
              type: 'string',
              description: 'Check-out date in YYYY-MM-DD format',
            },
            adults: {
              type: 'number',
              description: 'Number of adult guests (default: 1)',
            },
            roomQuantity: {
              type: 'number',
              description: 'Number of rooms required (default: 1)',
            },
            priceRange: {
              type: 'string',
              description: 'Price range in format MIN-MAX (e.g. "100-300" for $100-$300 per night)',
            },
            currency: {
              type: 'string',
              description: 'Currency code for prices (ISO 4217, default: USD)',
            },
            boardType: {
              type: 'string',
              description: 'Meal plan: ROOM_ONLY, BREAKFAST, HALF_BOARD, FULL_BOARD, ALL_INCLUSIVE',
            },
          },
          required: ['hotelIds', 'checkInDate', 'checkOutDate'],
        },
      },
      {
        name: 'get_hotel_ratings',
        description: 'Get traveler sentiment scores and review summaries for hotels by hotel IDs',
        inputSchema: {
          type: 'object',
          properties: {
            hotelIds: {
              type: 'string',
              description: 'Comma-separated Amadeus hotel IDs to get ratings for',
            },
          },
          required: ['hotelIds'],
        },
      },
      // ── Destination Experiences ────────────────────────────────────────────
      {
        name: 'search_activities',
        description: 'Search for tours, activities, and experiences near a location by coordinates',
        inputSchema: {
          type: 'object',
          properties: {
            latitude: {
              type: 'number',
              description: 'Latitude of the search center point',
            },
            longitude: {
              type: 'number',
              description: 'Longitude of the search center point',
            },
            radius: {
              type: 'number',
              description: 'Search radius in km (default: 1)',
            },
          },
          required: ['latitude', 'longitude'],
        },
      },
      {
        name: 'get_points_of_interest',
        description: 'Find tourist attractions and points of interest near a location — museums, landmarks, restaurants, parks',
        inputSchema: {
          type: 'object',
          properties: {
            latitude: {
              type: 'number',
              description: 'Latitude of the search center point',
            },
            longitude: {
              type: 'number',
              description: 'Longitude of the search center point',
            },
            radius: {
              type: 'number',
              description: 'Search radius in km (default: 2)',
            },
            categories: {
              type: 'string',
              description: 'Comma-separated category filters: SIGHTS_MUSEUMS, BEACH_PARK, HISTORICAL, NIGHTLIFE, RESTAURANT, SHOPPING',
            },
            page_limit: {
              type: 'number',
              description: 'Maximum results to return (default: 10)',
            },
          },
          required: ['latitude', 'longitude'],
        },
      },
      // ── Market Insights ────────────────────────────────────────────────────
      {
        name: 'get_location_score',
        description: 'Get safety, transportation, and neighborhood scores for a city or location (useful for travel planning)',
        inputSchema: {
          type: 'object',
          properties: {
            latitude: {
              type: 'number',
              description: 'Latitude of the location to score',
            },
            longitude: {
              type: 'number',
              description: 'Longitude of the location to score',
            },
          },
          required: ['latitude', 'longitude'],
        },
      },
      {
        name: 'get_most_booked_destinations',
        description: 'Get the top flight destinations booked from an origin airport in a given period — useful for travel market insights',
        inputSchema: {
          type: 'object',
          properties: {
            originCityCode: {
              type: 'string',
              description: 'Origin city IATA code (e.g. NYC, LON, PAR)',
            },
            period: {
              type: 'string',
              description: 'Year and month period in YYYY-MM format (e.g. 2025-06)',
            },
            max: {
              type: 'number',
              description: 'Maximum number of destinations to return (default: 10)',
            },
          },
          required: ['originCityCode', 'period'],
        },
      },
      {
        name: 'get_most_traveled_destinations',
        description: 'Get the top destinations by passenger volume from an origin airport in a given period',
        inputSchema: {
          type: 'object',
          properties: {
            originCityCode: {
              type: 'string',
              description: 'Origin city IATA code (e.g. NYC, LON)',
            },
            period: {
              type: 'string',
              description: 'Year and month period in YYYY-MM format (e.g. 2025-06)',
            },
            max: {
              type: 'number',
              description: 'Maximum number of destinations to return (default: 10)',
            },
          },
          required: ['originCityCode', 'period'],
        },
      },
      // ── Transfers ──────────────────────────────────────────────────────────
      {
        name: 'search_transfers',
        description: 'Search for airport transfers and private car services between two locations with date, passengers, and currency',
        inputSchema: {
          type: 'object',
          properties: {
            startLocationCode: {
              type: 'string',
              description: 'Origin airport IATA code or address (e.g. CDG)',
            },
            endAddressLine: {
              type: 'string',
              description: 'Destination address or hotel name',
            },
            endCityName: {
              type: 'string',
              description: 'Destination city name',
            },
            endZipCode: {
              type: 'string',
              description: 'Destination postal/zip code',
            },
            endCountryCode: {
              type: 'string',
              description: 'Destination country ISO 2-letter code',
            },
            transferType: {
              type: 'string',
              description: 'Transfer type: PRIVATE, SHARED, TAXI, HOURLY, AIRPORT_EXPRESS, HELICOPTER (default: PRIVATE)',
            },
            startDateTime: {
              type: 'string',
              description: 'Pickup date and time in ISO 8601 format (e.g. 2026-06-15T10:30:00)',
            },
            passengers: {
              type: 'number',
              description: 'Number of passengers (default: 1)',
            },
            currencyCode: {
              type: 'string',
              description: 'Currency for prices (default: USD)',
            },
          },
          required: ['startLocationCode', 'startDateTime'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'search_flights':                return this.searchFlights(args);
        case 'price_flight_offer':            return this.priceFlightOffer(args);
        case 'get_flight_price_analysis':     return this.getFlightPriceAnalysis(args);
        case 'get_flight_cheapest_dates':     return this.getFlightCheapestDates(args);
        case 'get_flight_inspiration':        return this.getFlightInspiration(args);
        case 'get_flight_availability':       return this.getFlightAvailability(args);
        case 'get_airline_info':              return this.getAirlineInfo(args);
        case 'search_airports':               return this.searchAirports(args);
        case 'get_airport_routes':            return this.getAirportRoutes(args);
        case 'search_hotels':                 return this.searchHotels(args);
        case 'get_hotel_offers':              return this.getHotelOffers(args);
        case 'get_hotel_ratings':             return this.getHotelRatings(args);
        case 'search_activities':             return this.searchActivities(args);
        case 'get_points_of_interest':        return this.getPointsOfInterest(args);
        case 'get_location_score':            return this.getLocationScore(args);
        case 'get_most_booked_destinations':  return this.getMostBookedDestinations(args);
        case 'get_most_traveled_destinations':return this.getMostTraveledDestinations(args);
        case 'search_transfers':              return this.searchTransfers(args);
        default:
          return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
      }
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Tool execution failed: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      };
    }
  }

  // ── OAuth2 token management ────────────────────────────────────────────────

  private async getOrRefreshToken(): Promise<string> {
    const now = Date.now();
    if (this.bearerToken && this.tokenExpiry > now) {
      return this.bearerToken;
    }
    const response = await this.fetchWithRetry(`${this.baseUrl}/v1/security/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.clientId,
        client_secret: this.clientSecret,
      }).toString(),
    });
    if (!response.ok) {
      throw new Error(`OAuth2 token request failed: ${response.status} ${response.statusText}`);
    }
    const data = await response.json() as { access_token: string; expires_in: number };
    this.bearerToken = data.access_token;
    this.tokenExpiry = now + (data.expires_in - 60) * 1000; // refresh 60s early
    return this.bearerToken;
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private async get(path: string, params: Record<string, string> = {}): Promise<ToolResult> {
    const token = await this.getOrRefreshToken();
    const qs = Object.keys(params).length > 0 ? '?' + new URLSearchParams(params).toString() : '';
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}${qs}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });
    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async post(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const token = await this.getOrRefreshToken();
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  // ── Flight methods ─────────────────────────────────────────────────────────

  private async searchFlights(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.originLocationCode || !args.destinationLocationCode || !args.departureDate) {
      return { content: [{ type: 'text', text: 'originLocationCode, destinationLocationCode, and departureDate are required' }], isError: true };
    }
    const params: Record<string, string> = {
      originLocationCode:      args.originLocationCode as string,
      destinationLocationCode: args.destinationLocationCode as string,
      departureDate:           args.departureDate as string,
      adults:                  String((args.adults as number) ?? 1),
      max:                     String((args.max as number) ?? 10),
    };
    if (args.returnDate)    params.returnDate    = args.returnDate as string;
    if (args.children)      params.children      = String(args.children);
    if (args.infants)       params.infants       = String(args.infants);
    if (args.travelClass)   params.travelClass   = args.travelClass as string;
    if (args.nonStop)       params.nonStop       = String(args.nonStop);
    if (args.currencyCode)  params.currencyCode  = args.currencyCode as string;
    if (args.maxPrice)      params.maxPrice      = String(args.maxPrice);
    return this.get('/v2/shopping/flight-offers', params);
  }

  private async priceFlightOffer(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.flight_offer) {
      return { content: [{ type: 'text', text: 'flight_offer is required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      data: {
        type: 'flight-offers-pricing',
        flightOffers: [args.flight_offer],
      },
    };
    let path = '/v1/shopping/flight-offers/pricing';
    if (args.include_bags) path += '?include=bags';
    return this.post(path, body);
  }

  private async getFlightPriceAnalysis(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.originIataCode || !args.destinationIataCode || !args.departureDate) {
      return { content: [{ type: 'text', text: 'originIataCode, destinationIataCode, and departureDate are required' }], isError: true };
    }
    const params: Record<string, string> = {
      originIataCode:      args.originIataCode as string,
      destinationIataCode: args.destinationIataCode as string,
      departureDate:       args.departureDate as string,
    };
    if (args.currencyCode) params.currencyCode = args.currencyCode as string;
    if (args.oneWay)       params.oneWay       = String(args.oneWay);
    return this.get('/v1/analytics/itinerary-price-metrics', params);
  }

  private async getFlightCheapestDates(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.origin || !args.destination) {
      return { content: [{ type: 'text', text: 'origin and destination are required' }], isError: true };
    }
    const params: Record<string, string> = {
      origin:      args.origin as string,
      destination: args.destination as string,
    };
    if (args.departureDate) params.departureDate = args.departureDate as string;
    if (args.duration)      params.duration      = args.duration as string;
    if (args.nonStop)       params.nonStop       = String(args.nonStop);
    if (args.currencyCode)  params.currencyCode  = args.currencyCode as string;
    return this.get('/v1/shopping/flight-dates', params);
  }

  private async getFlightInspiration(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.origin) {
      return { content: [{ type: 'text', text: 'origin is required' }], isError: true };
    }
    const params: Record<string, string> = { origin: args.origin as string };
    if (args.departureDate) params.departureDate = args.departureDate as string;
    if (args.maxPrice)      params.maxPrice      = String(args.maxPrice);
    if (args.currencyCode)  params.currencyCode  = args.currencyCode as string;
    return this.get('/v1/shopping/flight-destinations', params);
  }

  private async getFlightAvailability(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.originLocationCode || !args.destinationLocationCode || !args.departureDate) {
      return { content: [{ type: 'text', text: 'originLocationCode, destinationLocationCode, and departureDate are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      data: {
        type: 'flight-availability',
        originDestinations: [{
          id: '1',
          originLocationCode:      args.originLocationCode,
          destinationLocationCode: args.destinationLocationCode,
          departureDateTime: { date: args.departureDate },
        }],
        travelers: [{ id: '1', travelerType: 'ADULT' }],
        sources: ['GDS'],
        searchCriteria: {
          flightFilters: {
            cabinRestrictions: args.travelClass
              ? [{ cabin: args.travelClass, coverage: 'MOST_SEGMENTS', originDestinationIds: ['1'] }]
              : [],
          },
        },
      },
    };
    return this.post('/v1/shopping/availability/flight-availabilities', body);
  }

  // ── Airline & Airport methods ──────────────────────────────────────────────

  private async getAirlineInfo(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.airlineCodes) {
      return { content: [{ type: 'text', text: 'airlineCodes is required' }], isError: true };
    }
    return this.get('/v1/reference-data/airlines', { airlineCodes: args.airlineCodes as string });
  }

  private async searchAirports(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.keyword) {
      return { content: [{ type: 'text', text: 'keyword is required' }], isError: true };
    }
    const params: Record<string, string> = {
      keyword: args.keyword as string,
      subType: (args.subType as string) ?? 'AIRPORT,CITY',
      'page[limit]': String((args.page_limit as number) ?? 10),
    };
    if (args.countryCode) params.countryCode = args.countryCode as string;
    return this.get('/v1/reference-data/locations', params);
  }

  private async getAirportRoutes(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.departureAirportCode) {
      return { content: [{ type: 'text', text: 'departureAirportCode is required' }], isError: true };
    }
    const params: Record<string, string> = {
      departureAirportCode: args.departureAirportCode as string,
      max: String((args.max as number) ?? 20),
    };
    if (args.arrivalCountryCode) params.arrivalCountryCode = args.arrivalCountryCode as string;
    return this.get('/v1/airport/direct-destinations', params);
  }

  // ── Hotel methods ──────────────────────────────────────────────────────────

  private async searchHotels(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.cityCode && (!args.latitude || !args.longitude)) {
      return { content: [{ type: 'text', text: 'cityCode or latitude+longitude is required' }], isError: true };
    }
    const params: Record<string, string> = {};
    if (args.cityCode)    params.cityCode    = args.cityCode as string;
    if (args.latitude)    params.latitude    = String(args.latitude);
    if (args.longitude)   params.longitude   = String(args.longitude);
    if (args.radius)      params.radius      = String(args.radius);
    if (args.amenities)   params.amenities   = args.amenities as string;
    if (args.ratings)     params.ratings     = args.ratings as string;
    if (args.hotelSource) params.hotelSource = args.hotelSource as string;
    return this.get('/v1/reference-data/locations/hotels/by-city', params);
  }

  private async getHotelOffers(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.hotelIds || !args.checkInDate || !args.checkOutDate) {
      return { content: [{ type: 'text', text: 'hotelIds, checkInDate, and checkOutDate are required' }], isError: true };
    }
    const params: Record<string, string> = {
      hotelIds:    args.hotelIds as string,
      checkInDate: args.checkInDate as string,
      checkOutDate:args.checkOutDate as string,
      adults:      String((args.adults as number) ?? 1),
      roomQuantity:String((args.roomQuantity as number) ?? 1),
    };
    if (args.priceRange)  params.priceRange  = args.priceRange as string;
    if (args.currency)    params.currency    = args.currency as string;
    if (args.boardType)   params.boardType   = args.boardType as string;
    return this.get('/v3/shopping/hotel-offers', params);
  }

  private async getHotelRatings(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.hotelIds) {
      return { content: [{ type: 'text', text: 'hotelIds is required' }], isError: true };
    }
    return this.get('/v2/e-reputation/hotel-sentiments', { hotelIds: args.hotelIds as string });
  }

  // ── Destination Experience methods ─────────────────────────────────────────

  private async searchActivities(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.latitude || !args.longitude) {
      return { content: [{ type: 'text', text: 'latitude and longitude are required' }], isError: true };
    }
    const params: Record<string, string> = {
      latitude:  String(args.latitude),
      longitude: String(args.longitude),
      radius:    String((args.radius as number) ?? 1),
    };
    return this.get('/v1/shopping/activities', params);
  }

  private async getPointsOfInterest(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.latitude || !args.longitude) {
      return { content: [{ type: 'text', text: 'latitude and longitude are required' }], isError: true };
    }
    const params: Record<string, string> = {
      latitude:     String(args.latitude),
      longitude:    String(args.longitude),
      radius:       String((args.radius as number) ?? 2),
      'page[limit]':String((args.page_limit as number) ?? 10),
    };
    if (args.categories) params.categories = args.categories as string;
    return this.get('/v1/reference-data/locations/pois', params);
  }

  // ── Market Insight methods ─────────────────────────────────────────────────

  private async getLocationScore(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.latitude || !args.longitude) {
      return { content: [{ type: 'text', text: 'latitude and longitude are required' }], isError: true };
    }
    return this.get('/v1/location/analytics/category-rated-areas', {
      latitude:  String(args.latitude),
      longitude: String(args.longitude),
    });
  }

  private async getMostBookedDestinations(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.originCityCode || !args.period) {
      return { content: [{ type: 'text', text: 'originCityCode and period are required' }], isError: true };
    }
    return this.get('/v1/travel/analytics/air-traffic/booked', {
      originCityCode: args.originCityCode as string,
      period:         args.period as string,
      max:            String((args.max as number) ?? 10),
    });
  }

  private async getMostTraveledDestinations(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.originCityCode || !args.period) {
      return { content: [{ type: 'text', text: 'originCityCode and period are required' }], isError: true };
    }
    return this.get('/v1/travel/analytics/air-traffic/traveled', {
      originCityCode: args.originCityCode as string,
      period:         args.period as string,
      max:            String((args.max as number) ?? 10),
    });
  }

  // ── Transfer methods ───────────────────────────────────────────────────────

  private async searchTransfers(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.startLocationCode || !args.startDateTime) {
      return { content: [{ type: 'text', text: 'startLocationCode and startDateTime are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      startLocationCode: args.startLocationCode,
      startDateTime:     args.startDateTime,
      passengers:        (args.passengers as number) ?? 1,
      transferType:      (args.transferType as string) ?? 'PRIVATE',
    };
    if (args.endAddressLine)  {
      body.endAddressLine  = args.endAddressLine;
      body.endCityName     = args.endCityName;
      body.endZipCode      = args.endZipCode;
      body.endCountryCode  = args.endCountryCode;
    }
    if (args.currencyCode) body.currencyCode = args.currencyCode;
    return this.post('/v1/shopping/transfer-offers', body);
  }
}
