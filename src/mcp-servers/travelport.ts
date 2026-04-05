/**
 * Travelport MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Travelport UAPI REST API — Global Distribution System for travel.
// Base URL: https://api.travelport.com
// Auth: OAuth2 Bearer — POST https://api.travelport.com/v1/oauth/token
//       with client_credentials grant, client_id + client_secret in form body
// Docs: https://developer.travelport.com/en/docs
// Rate limits: Varies by contract tier; no public rate limit documentation

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface TravelportConfig {
  clientId: string;
  clientSecret: string;
  baseUrl?: string;
}

export class TravelportMCPServer extends MCPAdapterBase {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly baseUrl: string;
  private bearerToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: TravelportConfig) {
    super();
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.baseUrl = config.baseUrl || 'https://api.travelport.com';
  }

  static catalog() {
    return {
      name: 'travelport',
      displayName: 'Travelport',
      version: '1.0.0',
      category: 'travel',
      keywords: ['travelport', 'gds', 'travel', 'flight', 'hotel', 'airline', 'booking', 'uapi', 'car rental', 'airport', 'seat map', 'offer', 'itinerary'],
      toolNames: [
        'search_flights', 'get_flight_details', 'price_offer',
        'create_booking', 'get_booking', 'cancel_booking',
        'search_hotels', 'get_hotel_details',
        'search_cars', 'get_car_details',
        'list_airports', 'get_seat_map',
      ],
      description: 'Travelport UAPI GDS: search and book flights, hotels, and rental cars; manage bookings; retrieve seat maps and airport data.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'search_flights',
        description: 'Search available flights between origin and destination for given travel dates and passenger count using Travelport UAPI',
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
              description: 'Cabin class preference: Economy, PremiumEconomy, Business, First (default: Economy)',
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
        description: 'Get detailed flight information including aircraft type, duration, stops, and fare rules for a specific Travelport flight segment',
        inputSchema: {
          type: 'object',
          properties: {
            carrier: {
              type: 'string',
              description: 'IATA airline carrier code (e.g. AA, UA, DL)',
            },
            flight_number: {
              type: 'string',
              description: 'Flight number without carrier code (e.g. 100, 234)',
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
          required: ['carrier', 'flight_number', 'departure_date'],
        },
      },
      {
        name: 'price_offer',
        description: 'Price and validate a specific flight offer from Travelport search results, returning fare breakdown and booking conditions',
        inputSchema: {
          type: 'object',
          properties: {
            offer_id: {
              type: 'string',
              description: 'Travelport offer identifier returned by search_flights',
            },
            adults: {
              type: 'number',
              description: 'Number of adult passengers (default: 1)',
            },
            currency: {
              type: 'string',
              description: 'Target currency code for pricing (e.g. USD, EUR, GBP) (default: USD)',
            },
          },
          required: ['offer_id'],
        },
      },
      {
        name: 'create_booking',
        description: 'Create a flight booking in Travelport UAPI for a priced offer with passenger and payment details',
        inputSchema: {
          type: 'object',
          properties: {
            offer_id: {
              type: 'string',
              description: 'Travelport offer identifier from price_offer',
            },
            passenger_first_name: {
              type: 'string',
              description: 'Passenger first name as on passport/ID',
            },
            passenger_last_name: {
              type: 'string',
              description: 'Passenger last name as on passport/ID',
            },
            passenger_dob: {
              type: 'string',
              description: 'Passenger date of birth in YYYY-MM-DD format',
            },
            contact_email: {
              type: 'string',
              description: 'Contact email address for booking confirmation',
            },
            contact_phone: {
              type: 'string',
              description: 'Contact phone number including country code',
            },
            payment_type: {
              type: 'string',
              description: 'Payment type: Credit, Cash, Agency (default: Agency)',
            },
          },
          required: ['offer_id', 'passenger_first_name', 'passenger_last_name', 'contact_email'],
        },
      },
      {
        name: 'get_booking',
        description: 'Retrieve an existing Travelport booking by its Universal Record Locator (URL) or PNR reference',
        inputSchema: {
          type: 'object',
          properties: {
            record_locator: {
              type: 'string',
              description: 'Travelport Universal Record Locator or PNR reference code (e.g. ABCDEF)',
            },
          },
          required: ['record_locator'],
        },
      },
      {
        name: 'cancel_booking',
        description: 'Cancel an existing Travelport booking by its Universal Record Locator, voiding all associated segments',
        inputSchema: {
          type: 'object',
          properties: {
            record_locator: {
              type: 'string',
              description: 'Travelport Universal Record Locator to cancel',
            },
            reason: {
              type: 'string',
              description: 'Cancellation reason (optional, for audit trail)',
            },
          },
          required: ['record_locator'],
        },
      },
      {
        name: 'search_hotels',
        description: 'Search available hotels near an airport or city code for given check-in and check-out dates using Travelport UAPI',
        inputSchema: {
          type: 'object',
          properties: {
            location: {
              type: 'string',
              description: 'Airport IATA code or city code to search hotels near (e.g. LAX, NYC)',
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
              description: 'Number of adult guests (default: 1)',
            },
            rooms: {
              type: 'number',
              description: 'Number of rooms required (default: 1)',
            },
            max_rate: {
              type: 'number',
              description: 'Maximum nightly rate in USD',
            },
            chain_code: {
              type: 'string',
              description: 'Hotel chain code to filter results (e.g. HY for Hyatt, MC for Marriott)',
            },
            limit: {
              type: 'number',
              description: 'Maximum results to return (default: 20)',
            },
          },
          required: ['location', 'check_in', 'check_out'],
        },
      },
      {
        name: 'get_hotel_details',
        description: 'Get detailed hotel information including description, amenities, room types, and rates from Travelport',
        inputSchema: {
          type: 'object',
          properties: {
            hotel_code: {
              type: 'string',
              description: 'Travelport hotel property code',
            },
            chain_code: {
              type: 'string',
              description: 'Hotel chain code (e.g. HY, MC, HH)',
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
          required: ['hotel_code', 'chain_code'],
        },
      },
      {
        name: 'search_cars',
        description: 'Search available rental cars at a pickup location for given dates and car class using Travelport UAPI',
        inputSchema: {
          type: 'object',
          properties: {
            pickup_location: {
              type: 'string',
              description: 'Pickup location IATA airport code or city code',
            },
            pickup_datetime: {
              type: 'string',
              description: 'Pickup date and time in YYYY-MM-DDTHH:MM format',
            },
            return_datetime: {
              type: 'string',
              description: 'Return date and time in YYYY-MM-DDTHH:MM format',
            },
            car_class: {
              type: 'string',
              description: 'Car class code: ECAR (economy), CCAR (compact), ICAR (intermediate), SCAR (standard), FCAR (fullsize), LCAR (luxury)',
            },
            vendor_code: {
              type: 'string',
              description: 'Car rental vendor code to filter (e.g. ZE for Hertz, ET for Enterprise)',
            },
            limit: {
              type: 'number',
              description: 'Maximum results to return (default: 20)',
            },
          },
          required: ['pickup_location', 'pickup_datetime', 'return_datetime'],
        },
      },
      {
        name: 'get_car_details',
        description: 'Get detailed rental car information including features, inclusions, and rate breakdown from Travelport',
        inputSchema: {
          type: 'object',
          properties: {
            rate_key: {
              type: 'string',
              description: 'Travelport car rate key returned by search_cars',
            },
          },
          required: ['rate_key'],
        },
      },
      {
        name: 'list_airports',
        description: 'List airports with IATA codes, names, cities, and countries; optionally filter by query string',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search by airport name, city, country, or IATA code (e.g. LAX, London)',
            },
            country_code: {
              type: 'string',
              description: 'Filter by ISO 3166-1 alpha-2 country code (e.g. US, GB, DE)',
            },
          },
        },
      },
      {
        name: 'get_seat_map',
        description: 'Retrieve the seat map for a specific flight segment showing seat availability, classes, and features',
        inputSchema: {
          type: 'object',
          properties: {
            carrier: {
              type: 'string',
              description: 'IATA airline carrier code (e.g. AA, UA, DL)',
            },
            flight_number: {
              type: 'string',
              description: 'Flight number without carrier code (e.g. 100)',
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
            cabin_class: {
              type: 'string',
              description: 'Cabin class: Economy, Business, First (default: Economy)',
            },
          },
          required: ['carrier', 'flight_number', 'departure_date', 'origin', 'destination'],
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
        case 'price_offer':
          return this.priceOffer(args);
        case 'create_booking':
          return this.createBooking(args);
        case 'get_booking':
          return this.getBooking(args);
        case 'cancel_booking':
          return this.cancelBooking(args);
        case 'search_hotels':
          return this.searchHotels(args);
        case 'get_hotel_details':
          return this.getHotelDetails(args);
        case 'search_cars':
          return this.searchCars(args);
        case 'get_car_details':
          return this.getCarDetails(args);
        case 'list_airports':
          return this.listAirports(args);
        case 'get_seat_map':
          return this.getSeatMap(args);
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
    const response = await this.fetchWithRetry(`${this.baseUrl}/v1/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
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
    this.tokenExpiry = now + (data.expires_in - 60) * 1000;
    return this.bearerToken;
  }

  private async authHeaders(): Promise<Record<string, string>> {
    const token = await this.getOrRefreshToken();
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
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

  private async apiDelete(path: string): Promise<ToolResult> {
    const headers = await this.authHeaders();
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'DELETE',
      headers,
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ success: true }) }], isError: false };
  }

  private async searchFlights(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.origin || !args.destination || !args.departure_date) {
      return { content: [{ type: 'text', text: 'origin, destination, and departure_date are required' }], isError: true };
    }
    const segments: Record<string, unknown>[] = [
      {
        From: { AirportCode: args.origin },
        To: { AirportCode: args.destination },
        DepartureTime: args.departure_date,
      },
    ];
    if (args.return_date) {
      segments.push({
        From: { AirportCode: args.destination },
        To: { AirportCode: args.origin },
        DepartureTime: args.return_date,
      });
    }
    const body: Record<string, unknown> = {
      AirSearchModifiersType: {
        CabinClass: (args.cabin_class as string) || 'Economy',
      },
      SearchPassenger: [{ Code: 'ADT', BookingTravelerRef: `pax_1` }],
      SearchAirLeg: segments,
      AirSearchModifiers: {
        MaxResults: (args.limit as number) || 20,
      },
    };
    return this.apiPost('/v1/air/search/availability', body);
  }

  private async getFlightDetails(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.carrier || !args.flight_number || !args.departure_date) {
      return { content: [{ type: 'text', text: 'carrier, flight_number, and departure_date are required' }], isError: true };
    }
    const params = new URLSearchParams({
      carrier: args.carrier as string,
      flightNumber: args.flight_number as string,
      departureDate: args.departure_date as string,
    });
    if (args.origin) params.set('origin', args.origin as string);
    if (args.destination) params.set('destination', args.destination as string);
    return this.apiGet(`/v1/air/flight?${params.toString()}`);
  }

  private async priceOffer(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.offer_id) {
      return { content: [{ type: 'text', text: 'offer_id is required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      AirPricingCommand: {
        AirSegmentRef: args.offer_id,
        AirPricingModifiers: {
          Currency: (args.currency as string) || 'USD',
          NumberOfPassengers: (args.adults as number) || 1,
        },
      },
    };
    return this.apiPost('/v1/air/price', body);
  }

  private async createBooking(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.offer_id || !args.passenger_first_name || !args.passenger_last_name || !args.contact_email) {
      return { content: [{ type: 'text', text: 'offer_id, passenger_first_name, passenger_last_name, and contact_email are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      BookingTraveler: [
        {
          BookingTravelerName: {
            First: args.passenger_first_name,
            Last: args.passenger_last_name,
          },
          DOB: args.passenger_dob,
          Email: [{ Type: 'Home', EmailId: args.contact_email }],
          Phone: args.contact_phone ? [{ Type: 'Home', Number: args.contact_phone }] : undefined,
        },
      ],
      AirPricingSolution: {
        Key: args.offer_id,
      },
      FormOfPayment: {
        Type: (args.payment_type as string) || 'Agency',
      },
    };
    return this.apiPost('/v1/air/booking', body);
  }

  private async getBooking(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.record_locator) {
      return { content: [{ type: 'text', text: 'record_locator is required' }], isError: true };
    }
    return this.apiGet(`/v1/universal/record/${encodeURIComponent(args.record_locator as string)}`);
  }

  private async cancelBooking(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.record_locator) {
      return { content: [{ type: 'text', text: 'record_locator is required' }], isError: true };
    }
    const params = new URLSearchParams({ locatorCode: args.record_locator as string });
    if (args.reason) params.set('reason', args.reason as string);
    return this.apiDelete(`/v1/universal/record?${params.toString()}`);
  }

  private async searchHotels(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.location || !args.check_in || !args.check_out) {
      return { content: [{ type: 'text', text: 'location, check_in, and check_out are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      HotelSearchLocation: {
        HotelLocation: {
          Location: args.location,
          LocationType: 'Airport',
        },
      },
      HotelStay: {
        CheckInDate: args.check_in,
        CheckOutDate: args.check_out,
      },
      RateRange: args.max_rate ? { MaxAmount: args.max_rate, CurrencyCode: 'USD' } : undefined,
      HotelSearchModifiers: {
        NumberOfAdults: (args.adults as number) || 1,
        NumberOfRooms: (args.rooms as number) || 1,
        ChainCode: args.chain_code,
        MaxResults: (args.limit as number) || 20,
      },
    };
    return this.apiPost('/v1/hotel/search/availability', body);
  }

  private async getHotelDetails(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.hotel_code || !args.chain_code) {
      return { content: [{ type: 'text', text: 'hotel_code and chain_code are required' }], isError: true };
    }
    const params = new URLSearchParams({
      propertyCode: args.hotel_code as string,
      chainCode: args.chain_code as string,
    });
    if (args.check_in) params.set('checkInDate', args.check_in as string);
    if (args.check_out) params.set('checkOutDate', args.check_out as string);
    return this.apiGet(`/v1/hotel/property?${params.toString()}`);
  }

  private async searchCars(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.pickup_location || !args.pickup_datetime || !args.return_datetime) {
      return { content: [{ type: 'text', text: 'pickup_location, pickup_datetime, and return_datetime are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      VehicleSearchAvailabilityReq: {
        PickUpDateTime: args.pickup_datetime,
        ReturnDateTime: args.return_datetime,
        PickUpLocation: {
          LocationCode: args.pickup_location,
          IsAirport: true,
        },
        ReturnLocation: {
          LocationCode: args.pickup_location,
          IsAirport: true,
        },
        VehicleModifiers: {
          AirConditioning: true,
          VehicleClass: args.car_class,
          VendorCode: args.vendor_code,
          MaxResults: (args.limit as number) || 20,
        },
      },
    };
    return this.apiPost('/v1/vehicle/search/availability', body);
  }

  private async getCarDetails(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.rate_key) {
      return { content: [{ type: 'text', text: 'rate_key is required' }], isError: true };
    }
    return this.apiGet(`/v1/vehicle/rate/${encodeURIComponent(args.rate_key as string)}`);
  }

  private async listAirports(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.query) params.set('q', args.query as string);
    if (args.country_code) params.set('country', args.country_code as string);
    const qs = params.toString();
    return this.apiGet(`/v1/reference/airports${qs ? '?' + qs : ''}`);
  }

  private async getSeatMap(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.carrier || !args.flight_number || !args.departure_date || !args.origin || !args.destination) {
      return { content: [{ type: 'text', text: 'carrier, flight_number, departure_date, origin, and destination are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      SeatMapReq: {
        FlightDetails: {
          Carrier: args.carrier,
          FlightNumber: args.flight_number,
          DepartureDate: args.departure_date,
          Origin: args.origin,
          Destination: args.destination,
          CabinClass: (args.cabin_class as string) || 'Economy',
        },
      },
    };
    return this.apiPost('/v1/air/seatmap', body);
  }
}
