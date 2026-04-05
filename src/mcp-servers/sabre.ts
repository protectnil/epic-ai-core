/**
 * Sabre MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://developer.sabre.com/product-collection/mcp-server — transport: proprietary/hosted, auth: Sabre commercial credentials
// Sabre announced its MCP server in September 2025 as a proprietary commercial offering embedded in SabreMosaic.
// It is NOT an open npm/GitHub MCP server — access requires a Sabre commercial agreement.
// Vendor MCP covers: flights, hotels, post-booking (tool count not publicly documented).
// Our adapter covers: 14 tools.
// Recommendation: use-rest-api — Sabre MCP does not meet criterion 1 (not publicly published/accessible);
//   it is a closed commercial offering requiring a Sabre contract. Our REST adapter is the accessible integration.
//
// Base URL: https://api.havail.sabre.com
// Auth: OAuth2 client credentials — POST https://api.havail.sabre.com/v2/auth/token
//       with Basic auth (base64 clientId:clientSecret) and grant_type=client_credentials
// Docs: https://developer.sabre.com/docs
// Rate limits: Not publicly documented; varies by API contract and plan tier

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface SabreConfig {
  clientId: string;
  clientSecret: string;
  baseUrl?: string;
}

export class SabreMCPServer extends MCPAdapterBase {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly baseUrl: string;
  private bearerToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: SabreConfig) {
    super();
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.baseUrl = config.baseUrl || 'https://api.havail.sabre.com';
  }

  static catalog() {
    return {
      name: 'sabre',
      displayName: 'Sabre',
      version: '1.0.0',
      category: 'misc',
      keywords: ['sabre', 'gds', 'travel', 'flight', 'hotel', 'airline', 'booking', 'itinerary', 'fare', 'pnr', 'reservation', 'car rental', 'travel agency', 'tmc'],
      toolNames: [
        'search_flights', 'get_flight_details', 'list_airlines',
        'search_hotels', 'get_hotel_details', 'list_hotel_amenities',
        'get_lowest_fares', 'search_destination_fares',
        'create_pnr', 'get_pnr', 'cancel_pnr',
        'search_cars', 'get_airport_info', 'list_countries',
      ],
      description: 'Sabre GDS travel platform: search flights and hotels, retrieve fare data, manage PNRs, and access airline/airport information.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'search_flights',
        description: 'Search available flights between origin and destination for given travel dates and passenger count',
        inputSchema: {
          type: 'object',
          properties: {
            origin: {
              type: 'string',
              description: 'Origin airport IATA code (e.g. LAX, JFK, LHR)',
            },
            destination: {
              type: 'string',
              description: 'Destination airport IATA code (e.g. ORD, CDG, DXB)',
            },
            departure_date: {
              type: 'string',
              description: 'Departure date in YYYY-MM-DD format',
            },
            return_date: {
              type: 'string',
              description: 'Return date for round trip in YYYY-MM-DD format (omit for one-way)',
            },
            adults: {
              type: 'number',
              description: 'Number of adult passengers (default: 1)',
            },
            cabin_class: {
              type: 'string',
              description: 'Cabin class: Y (economy), S (premium economy), C (business), F (first) (default: Y)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results to return (default: 20)',
            },
          },
          required: ['origin', 'destination', 'departure_date'],
        },
      },
      {
        name: 'get_flight_details',
        description: 'Get detailed flight information including aircraft type, duration, stops, and fare rules for a specific flight',
        inputSchema: {
          type: 'object',
          properties: {
            flight_number: {
              type: 'string',
              description: 'Airline code and flight number (e.g. AA100, UA234)',
            },
            departure_date: {
              type: 'string',
              description: 'Flight departure date in YYYY-MM-DD format',
            },
            origin: {
              type: 'string',
              description: 'Origin airport IATA code',
            },
            destination: {
              type: 'string',
              description: 'Destination airport IATA code',
            },
          },
          required: ['flight_number', 'departure_date'],
        },
      },
      {
        name: 'list_airlines',
        description: 'List airlines with IATA codes and names, optionally filtered by code or name search',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search by airline name or IATA code (e.g. AA, American)',
            },
          },
        },
      },
      {
        name: 'search_hotels',
        description: 'Search available hotels by destination city or airport with check-in, check-out, and occupancy filters',
        inputSchema: {
          type: 'object',
          properties: {
            destination: {
              type: 'string',
              description: 'Destination airport IATA code or city code (e.g. LAX, NYC)',
            },
            check_in: {
              type: 'string',
              description: 'Check-in date in YYYY-MM-DD format',
            },
            check_out: {
              type: 'string',
              description: 'Check-out date in YYYY-MM-DD format',
            },
            adults: {
              type: 'number',
              description: 'Number of adults (default: 1)',
            },
            rooms: {
              type: 'number',
              description: 'Number of rooms (default: 1)',
            },
            max_rate: {
              type: 'number',
              description: 'Maximum nightly rate in USD',
            },
            limit: {
              type: 'number',
              description: 'Maximum results to return (default: 20)',
            },
          },
          required: ['destination', 'check_in', 'check_out'],
        },
      },
      {
        name: 'get_hotel_details',
        description: 'Get detailed information about a specific hotel including description, photos, amenities, and room types',
        inputSchema: {
          type: 'object',
          properties: {
            hotel_code: {
              type: 'string',
              description: 'Sabre hotel property code',
            },
            check_in: {
              type: 'string',
              description: 'Check-in date in YYYY-MM-DD format for rate display',
            },
            check_out: {
              type: 'string',
              description: 'Check-out date in YYYY-MM-DD format',
            },
          },
          required: ['hotel_code'],
        },
      },
      {
        name: 'list_hotel_amenities',
        description: 'List amenity codes and descriptions used in Sabre hotel search results',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_lowest_fares',
        description: 'Get the lowest available airfares for an origin-destination pair across a date range',
        inputSchema: {
          type: 'object',
          properties: {
            origin: {
              type: 'string',
              description: 'Origin airport IATA code',
            },
            destination: {
              type: 'string',
              description: 'Destination airport IATA code',
            },
            departure_date: {
              type: 'string',
              description: 'Departure date in YYYY-MM-DD format',
            },
            length_of_stay: {
              type: 'number',
              description: 'Number of nights for round trip (omit for one-way)',
            },
          },
          required: ['origin', 'destination', 'departure_date'],
        },
      },
      {
        name: 'search_destination_fares',
        description: 'Search for lowest fares to multiple destinations from an origin airport within a date range',
        inputSchema: {
          type: 'object',
          properties: {
            origin: {
              type: 'string',
              description: 'Origin airport IATA code',
            },
            departure_date: {
              type: 'string',
              description: 'Departure date in YYYY-MM-DD format',
            },
            theme: {
              type: 'string',
              description: 'Destination theme filter: beach, city, mountains, adventure, culture (optional)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of destination results (default: 20)',
            },
          },
          required: ['origin', 'departure_date'],
        },
      },
      {
        name: 'create_pnr',
        description: 'Create a Passenger Name Record (PNR) booking in the Sabre GDS for a flight itinerary',
        inputSchema: {
          type: 'object',
          properties: {
            origin: {
              type: 'string',
              description: 'Origin airport IATA code',
            },
            destination: {
              type: 'string',
              description: 'Destination airport IATA code',
            },
            flight_number: {
              type: 'string',
              description: 'Flight number to book (e.g. AA100)',
            },
            departure_date: {
              type: 'string',
              description: 'Departure date in YYYY-MM-DD format',
            },
            passenger_name: {
              type: 'string',
              description: 'Passenger full name (LastName/FirstName format)',
            },
            contact_email: {
              type: 'string',
              description: 'Contact email address for the booking',
            },
            contact_phone: {
              type: 'string',
              description: 'Contact phone number',
            },
          },
          required: ['origin', 'destination', 'flight_number', 'departure_date', 'passenger_name'],
        },
      },
      {
        name: 'get_pnr',
        description: 'Retrieve a Passenger Name Record (PNR) from Sabre by its record locator code',
        inputSchema: {
          type: 'object',
          properties: {
            record_locator: {
              type: 'string',
              description: 'PNR record locator (6-character booking reference, e.g. ABCDEF)',
            },
          },
          required: ['record_locator'],
        },
      },
      {
        name: 'cancel_pnr',
        description: 'Cancel a Passenger Name Record (PNR) and all associated segments in Sabre GDS',
        inputSchema: {
          type: 'object',
          properties: {
            record_locator: {
              type: 'string',
              description: 'PNR record locator to cancel (6-character booking reference)',
            },
          },
          required: ['record_locator'],
        },
      },
      {
        name: 'search_cars',
        description: 'Search available rental cars at a pickup location for given dates and car class preferences',
        inputSchema: {
          type: 'object',
          properties: {
            pickup_location: {
              type: 'string',
              description: 'Pickup location IATA code or city code',
            },
            pickup_date: {
              type: 'string',
              description: 'Pickup date and time in YYYY-MM-DDTHH:MM format',
            },
            return_date: {
              type: 'string',
              description: 'Return date and time in YYYY-MM-DDTHH:MM format',
            },
            car_class: {
              type: 'string',
              description: 'Car class: ECAR, CCAR, ICAR, SCAR, FCAR (economy, compact, intermediate, standard, fullsize)',
            },
            limit: {
              type: 'number',
              description: 'Maximum results to return (default: 20)',
            },
          },
          required: ['pickup_location', 'pickup_date', 'return_date'],
        },
      },
      {
        name: 'get_airport_info',
        description: 'Get details for an airport by IATA code including name, city, country, timezone, and terminal info',
        inputSchema: {
          type: 'object',
          properties: {
            iata_code: {
              type: 'string',
              description: 'Airport IATA code (e.g. LAX, LHR, DXB)',
            },
          },
          required: ['iata_code'],
        },
      },
      {
        name: 'list_countries',
        description: 'List countries with IATA country codes for use in Sabre travel search filters',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search by country name or code',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'search_flights':
          return this.searchFlights(args);
        case 'get_flight_details':
          return this.getFlightDetails(args);
        case 'list_airlines':
          return this.listAirlines(args);
        case 'search_hotels':
          return this.searchHotels(args);
        case 'get_hotel_details':
          return this.getHotelDetails(args);
        case 'list_hotel_amenities':
          return this.listHotelAmenities();
        case 'get_lowest_fares':
          return this.getLowestFares(args);
        case 'search_destination_fares':
          return this.searchDestinationFares(args);
        case 'create_pnr':
          return this.createPnr(args);
        case 'get_pnr':
          return this.getPnr(args);
        case 'cancel_pnr':
          return this.cancelPnr(args);
        case 'search_cars':
          return this.searchCars(args);
        case 'get_airport_info':
          return this.getAirportInfo(args);
        case 'list_countries':
          return this.listCountries(args);
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

  private async getOrRefreshToken(): Promise<string> {
    const now = Date.now();
    if (this.bearerToken && this.tokenExpiry > now) {
      return this.bearerToken;
    }
    const response = await this.fetchWithRetry(`${this.baseUrl}/v2/auth/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${this.clientId}:${this.clientSecret}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });
    if (!response.ok) {
      throw new Error(`OAuth2 token request failed: ${response.status} ${response.statusText}`);
    }
    const data = await response.json() as { access_token: string; expires_in: number };
    this.bearerToken = data.access_token;
    this.tokenExpiry = now + (data.expires_in - 60) * 1000;
    return this.bearerToken;
  }

  private async authHeaders(): Promise<Record<string, string>> {
    const token = await this.getOrRefreshToken();
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  private async apiPost(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const headers = await this.authHeaders();
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiGet(path: string): Promise<ToolResult> {
    const headers = await this.authHeaders();
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, { headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async searchFlights(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.origin || !args.destination || !args.departure_date) {
      return { content: [{ type: 'text', text: 'origin, destination, and departure_date are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      OTA_AirLowFareSearchRQ: {
        OriginDestinationInformation: [
          {
            DepartureDateTime: args.departure_date,
            OriginLocation: { LocationCode: args.origin },
            DestinationLocation: { LocationCode: args.destination },
          },
        ],
        TravelerInfoSummary: {
          AirTravelerAvail: [{ PassengerTypeQuantity: [{ Code: 'ADT', Quantity: (args.adults as number) || 1 }] }],
        },
        TravelPreferences: {
          CabinPref: [{ Cabin: (args.cabin_class as string) || 'Y', PreferLevel: 'Preferred' }],
        },
        MaxResponses: (args.limit as number) || 20,
      },
    };
    if (args.return_date) {
      (body.OTA_AirLowFareSearchRQ as Record<string, unknown[]>).OriginDestinationInformation.push({
        DepartureDateTime: args.return_date,
        OriginLocation: { LocationCode: args.destination },
        DestinationLocation: { LocationCode: args.origin },
      });
    }
    return this.apiPost('/v4.3.0/shop/flights', body);
  }

  private async getFlightDetails(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.flight_number || !args.departure_date) {
      return { content: [{ type: 'text', text: 'flight_number and departure_date are required' }], isError: true };
    }
    const params = new URLSearchParams({ flightNumber: args.flight_number as string, departureDate: args.departure_date as string });
    if (args.origin) params.set('origin', args.origin as string);
    if (args.destination) params.set('destination', args.destination as string);
    return this.apiGet(`/v1/lists/utilities/airlines/flight?${params.toString()}`);
  }

  private async listAirlines(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.query) params.set('airlineName', args.query as string);
    const qs = params.toString();
    return this.apiGet(`/v1/lists/utilities/airlines${qs ? '?' + qs : ''}`);
  }

  private async searchHotels(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.destination || !args.check_in || !args.check_out) {
      return { content: [{ type: 'text', text: 'destination, check_in, and check_out are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      OTA_HotelAvailRQ: {
        AvailRequestSegments: [{
          AvailRequestSegment: {
            HotelSearchCriteria: [{
              Criterion: {
                HotelRef: { HotelCityCode: args.destination },
              },
            }],
            StayDateRange: {
              Start: args.check_in,
              End: args.check_out,
            },
            RoomStayCandidates: [{
              RoomStayCandidate: {
                GuestCounts: [{ AgeQualifyingCode: '10', Count: (args.adults as number) || 1 }],
              },
            }],
          },
        }],
        MaxResponses: (args.limit as number) || 20,
      },
    };
    return this.apiPost('/v4.0.0/shop/hotels/availability', body);
  }

  private async getHotelDetails(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.hotel_code) return { content: [{ type: 'text', text: 'hotel_code is required' }], isError: true };
    const params = new URLSearchParams({ PropertyCode: args.hotel_code as string });
    if (args.check_in) params.set('CheckInDate', args.check_in as string);
    if (args.check_out) params.set('CheckOutDate', args.check_out as string);
    return this.apiGet(`/v2.0.0/shop/hotels/content?${params.toString()}`);
  }

  private async listHotelAmenities(): Promise<ToolResult> {
    return this.apiGet('/v1/lists/utilities/hotels/amenities');
  }

  private async getLowestFares(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.origin || !args.destination || !args.departure_date) {
      return { content: [{ type: 'text', text: 'origin, destination, and departure_date are required' }], isError: true };
    }
    const params = new URLSearchParams({
      origin: args.origin as string,
      destination: args.destination as string,
      departuredate: args.departure_date as string,
    });
    if (args.length_of_stay) params.set('lengthofstay', String(args.length_of_stay));
    return this.apiGet(`/v2/shop/flights/fares?${params.toString()}`);
  }

  private async searchDestinationFares(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.origin || !args.departure_date) {
      return { content: [{ type: 'text', text: 'origin and departure_date are required' }], isError: true };
    }
    const params = new URLSearchParams({
      origin: args.origin as string,
      departuredate: args.departure_date as string,
      limit: String((args.limit as number) || 20),
    });
    if (args.theme) params.set('theme', args.theme as string);
    return this.apiGet(`/v1/shop/flights/fares/inspire?${params.toString()}`);
  }

  private async createPnr(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.origin || !args.destination || !args.flight_number || !args.departure_date || !args.passenger_name) {
      return { content: [{ type: 'text', text: 'origin, destination, flight_number, departure_date, and passenger_name are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      CreatePassengerNameRecordRQ: {
        AirBook: {
          OriginDestinationInformation: {
            FlightSegment: {
              DepartureDateTime: args.departure_date,
              FlightNumber: args.flight_number,
              OriginLocation: { LocationCode: args.origin },
              DestinationLocation: { LocationCode: args.destination },
            },
          },
        },
        TravelerInfo: {
          PersonName: { NameNumber: '1.1', PassengerType: 'ADT', GivenName: args.passenger_name },
        },
        Arunk: {},
      },
    };
    if (args.contact_email) {
      (body.CreatePassengerNameRecordRQ as Record<string, unknown>).Email = { Address: args.contact_email };
    }
    return this.apiPost('/v2.3.0/passenger/records', body);
  }

  private async getPnr(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.record_locator) return { content: [{ type: 'text', text: 'record_locator is required' }], isError: true };
    return this.apiGet(`/v1/passenger/records/${encodeURIComponent(args.record_locator as string)}`);
  }

  private async cancelPnr(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.record_locator) return { content: [{ type: 'text', text: 'record_locator is required' }], isError: true };
    const headers = await this.authHeaders();
    const response = await this.fetchWithRetry(`${this.baseUrl}/v1/passenger/records/${encodeURIComponent(args.record_locator as string)}`, {
      method: 'DELETE',
      headers,
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ success: true, record_locator: args.record_locator }) }], isError: false };
  }

  private async searchCars(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.pickup_location || !args.pickup_date || !args.return_date) {
      return { content: [{ type: 'text', text: 'pickup_location, pickup_date, and return_date are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      OTA_VehAvailRateRQ: {
        VehAvailRQCore: {
          VehRentalCore: {
            PickUpLocation: { LocationCode: args.pickup_location },
            ReturnLocation: { LocationCode: args.pickup_location },
            PickUpDateTime: args.pickup_date,
            ReturnDateTime: args.return_date,
          },
        },
        MaxResponses: (args.limit as number) || 20,
      },
    };
    if (args.car_class) {
      (body.OTA_VehAvailRateRQ as Record<string, unknown>).VehPrefs = { VehPref: { VehClass: { Size: args.car_class } } };
    }
    return this.apiPost('/v4.0.0/shop/cars/availability', body);
  }

  private async getAirportInfo(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.iata_code) return { content: [{ type: 'text', text: 'iata_code is required' }], isError: true };
    return this.apiGet(`/v1/lists/supported/cities?airportCode=${encodeURIComponent(args.iata_code as string)}`);
  }

  private async listCountries(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.query) params.set('countryName', args.query as string);
    const qs = params.toString();
    return this.apiGet(`/v1/lists/utilities/geography/countries${qs ? '?' + qs : ''}`);
  }
}
