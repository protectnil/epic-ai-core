/**
 * Just Eat UK MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official Just Eat UK MCP server was found on GitHub. We build a full REST wrapper.
//
// Base URL: https://uk.api.just-eat.io
// Auth: Bearer JWT token (for consumer/order endpoints) or API key header (for delivery partner endpoints)
// Docs: https://developer.just-eat.io/
// Spec: https://api.apis.guru/v2/specs/just-eat.co.uk/1.0.0/openapi.json
// Category: food
// Rate limits: See Just Eat developer docs — partner-specific limits apply

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface JustEatUKConfig {
  apiKey?: string;
  bearerToken?: string;
  baseUrl?: string;
}

export class JustEatUKMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly bearerToken: string;
  private readonly baseUrl: string;

  constructor(config: JustEatUKConfig) {
    super();
    this.apiKey = config.apiKey || '';
    this.bearerToken = config.bearerToken || '';
    this.baseUrl = config.baseUrl || 'https://uk.api.just-eat.io';
  }

  static catalog() {
    return {
      name: 'just-eat-uk',
      displayName: 'Just Eat UK',
      version: '1.0.0',
      category: 'food',
      keywords: [
        'just-eat', 'food', 'delivery', 'restaurant', 'order', 'menu',
        'checkout', 'consumer', 'driver', 'delivery-pool', 'postcode',
        'uk', 'takeaway', 'cuisine', 'basket',
      ],
      toolNames: [
        'search_restaurants_by_postcode',
        'search_restaurants_by_location',
        'search_restaurants',
        'search_autocomplete',
        'get_checkout',
        'update_checkout',
        'get_available_fulfilment_times',
        'get_delivery_estimate',
        'get_delivery_fees',
        'get_consumer_details',
        'create_consumer',
        'get_communication_preferences',
        'get_restaurant_menu',
        'get_restaurant_catalogue',
        'get_menu_categories',
        'get_menu_items',
        'get_menu_item_variations',
        'get_menu_item_modifier_groups',
        'create_order',
        'accept_order',
        'reject_order',
        'cancel_order',
        'complete_order',
        'get_order_times',
        'get_restaurant_service_times',
        'get_delivery_pools',
        'create_delivery_pool',
        'get_delivery_pool',
        'update_delivery_pool',
        'delete_delivery_pool',
        'add_restaurants_to_pool',
        'remove_restaurants_from_pool',
        'get_pool_availability',
        'set_pool_availability',
        'update_driver_location',
        'set_restaurant_online',
        'set_restaurant_offline',
      ],
      description: 'Just Eat UK API: search restaurants by postcode or location, browse menus, manage checkouts, place and track orders, manage delivery pools, and handle driver location updates for the UK food delivery platform.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Restaurant Search ──────────────────────────────────────────────────
      {
        name: 'search_restaurants_by_postcode',
        description: 'Get a list of restaurants available for delivery or collection at a given UK postcode',
        inputSchema: {
          type: 'object',
          properties: {
            postcode: {
              type: 'string',
              description: 'UK postcode to search (e.g. EC4A1AB)',
            },
          },
          required: ['postcode'],
        },
      },
      {
        name: 'search_restaurants_by_location',
        description: 'Get a list of restaurants available near a latitude/longitude coordinate',
        inputSchema: {
          type: 'object',
          properties: {
            latitude: {
              type: 'number',
              description: 'Latitude coordinate',
            },
            longitude: {
              type: 'number',
              description: 'Longitude coordinate',
            },
          },
          required: ['latitude', 'longitude'],
        },
      },
      {
        name: 'search_restaurants',
        description: 'Search for restaurants by tenant and optional query parameters (cuisine, name, etc.)',
        inputSchema: {
          type: 'object',
          properties: {
            tenant: {
              type: 'string',
              description: 'Tenant identifier (e.g. uk)',
            },
            q: {
              type: 'string',
              description: 'Search query (cuisine type, restaurant name)',
            },
            location: {
              type: 'string',
              description: 'Location string for the search',
            },
          },
          required: ['tenant'],
        },
      },
      {
        name: 'search_autocomplete',
        description: 'Get autocomplete suggestions for restaurant or cuisine search for a given tenant and query',
        inputSchema: {
          type: 'object',
          properties: {
            tenant: {
              type: 'string',
              description: 'Tenant identifier (e.g. uk)',
            },
            q: {
              type: 'string',
              description: 'Partial query string to autocomplete',
            },
          },
          required: ['tenant', 'q'],
        },
      },
      // ── Checkout ───────────────────────────────────────────────────────────
      {
        name: 'get_checkout',
        description: 'Get the current state of a checkout session including basket, fulfilment method, and total',
        inputSchema: {
          type: 'object',
          properties: {
            tenant: {
              type: 'string',
              description: 'Tenant identifier (e.g. uk)',
            },
            checkoutId: {
              type: 'string',
              description: 'Unique checkout session ID',
            },
          },
          required: ['tenant', 'checkoutId'],
        },
      },
      {
        name: 'update_checkout',
        description: 'Update a checkout session — change fulfilment method, delivery address, or other basket properties',
        inputSchema: {
          type: 'object',
          properties: {
            tenant: {
              type: 'string',
              description: 'Tenant identifier (e.g. uk)',
            },
            checkoutId: {
              type: 'string',
              description: 'Unique checkout session ID',
            },
            fulfilmentMethod: {
              type: 'string',
              description: 'Fulfilment method: delivery or collection',
            },
            deliveryAddress: {
              type: 'object',
              description: 'Delivery address object with lines, city, postcode',
            },
          },
          required: ['tenant', 'checkoutId'],
        },
      },
      {
        name: 'get_available_fulfilment_times',
        description: 'Get available fulfilment time slots (delivery or collection windows) for a checkout',
        inputSchema: {
          type: 'object',
          properties: {
            tenant: {
              type: 'string',
              description: 'Tenant identifier (e.g. uk)',
            },
            checkoutId: {
              type: 'string',
              description: 'Unique checkout session ID',
            },
          },
          required: ['tenant', 'checkoutId'],
        },
      },
      // ── Delivery ───────────────────────────────────────────────────────────
      {
        name: 'get_delivery_estimate',
        description: 'Get an estimated delivery time for a given pickup and drop-off location',
        inputSchema: {
          type: 'object',
          properties: {
            pickupLatitude: {
              type: 'number',
              description: 'Latitude of the restaurant pickup location',
            },
            pickupLongitude: {
              type: 'number',
              description: 'Longitude of the restaurant pickup location',
            },
            dropoffLatitude: {
              type: 'number',
              description: 'Latitude of the delivery address',
            },
            dropoffLongitude: {
              type: 'number',
              description: 'Longitude of the delivery address',
            },
          },
          required: ['pickupLatitude', 'pickupLongitude', 'dropoffLatitude', 'dropoffLongitude'],
        },
      },
      {
        name: 'get_delivery_fees',
        description: 'Get the delivery fee schedule for a restaurant in the specified tenant',
        inputSchema: {
          type: 'object',
          properties: {
            tenant: {
              type: 'string',
              description: 'Tenant identifier (e.g. uk)',
            },
            restaurantId: {
              type: 'string',
              description: 'Restaurant ID to retrieve delivery fees for',
            },
          },
          required: ['tenant'],
        },
      },
      // ── Consumer ───────────────────────────────────────────────────────────
      {
        name: 'get_consumer_details',
        description: 'Get consumer account details for the authenticated user in the given tenant',
        inputSchema: {
          type: 'object',
          properties: {
            tenant: {
              type: 'string',
              description: 'Tenant identifier (e.g. uk)',
            },
          },
          required: ['tenant'],
        },
      },
      {
        name: 'create_consumer',
        description: 'Create a new consumer account in the given tenant',
        inputSchema: {
          type: 'object',
          properties: {
            tenant: {
              type: 'string',
              description: 'Tenant identifier (e.g. uk)',
            },
            email: {
              type: 'string',
              description: 'Consumer email address',
            },
            firstName: {
              type: 'string',
              description: 'Consumer first name',
            },
            lastName: {
              type: 'string',
              description: 'Consumer last name',
            },
            phoneNumber: {
              type: 'string',
              description: 'Consumer phone number',
            },
          },
          required: ['tenant', 'email'],
        },
      },
      {
        name: 'get_communication_preferences',
        description: 'Get the communication preferences (marketing, notifications) for the authenticated consumer',
        inputSchema: {
          type: 'object',
          properties: {
            tenant: {
              type: 'string',
              description: 'Tenant identifier (e.g. uk)',
            },
          },
          required: ['tenant'],
        },
      },
      // ── Menu / Catalogue ───────────────────────────────────────────────────
      {
        name: 'get_restaurant_menu',
        description: 'Get the full menu for a restaurant including all categories and items',
        inputSchema: {
          type: 'object',
          properties: {
            tenant: {
              type: 'string',
              description: 'Tenant identifier (e.g. uk)',
            },
            restaurantId: {
              type: 'string',
              description: 'Restaurant ID to retrieve menu for',
            },
          },
          required: ['tenant', 'restaurantId'],
        },
      },
      {
        name: 'get_restaurant_catalogue',
        description: 'Get the structured product catalogue for a restaurant (categories, items, variations, modifiers)',
        inputSchema: {
          type: 'object',
          properties: {
            tenant: {
              type: 'string',
              description: 'Tenant identifier (e.g. uk)',
            },
            restaurantId: {
              type: 'string',
              description: 'Restaurant ID to retrieve catalogue for',
            },
          },
          required: ['tenant', 'restaurantId'],
        },
      },
      {
        name: 'get_menu_categories',
        description: 'Get all menu categories for a restaurant',
        inputSchema: {
          type: 'object',
          properties: {
            tenant: {
              type: 'string',
              description: 'Tenant identifier (e.g. uk)',
            },
            restaurantId: {
              type: 'string',
              description: 'Restaurant ID',
            },
          },
          required: ['tenant', 'restaurantId'],
        },
      },
      {
        name: 'get_menu_items',
        description: 'Get all menu items for a restaurant catalogue',
        inputSchema: {
          type: 'object',
          properties: {
            tenant: {
              type: 'string',
              description: 'Tenant identifier (e.g. uk)',
            },
            restaurantId: {
              type: 'string',
              description: 'Restaurant ID',
            },
          },
          required: ['tenant', 'restaurantId'],
        },
      },
      {
        name: 'get_menu_item_variations',
        description: 'Get all size/variation options for a specific menu item',
        inputSchema: {
          type: 'object',
          properties: {
            tenant: {
              type: 'string',
              description: 'Tenant identifier (e.g. uk)',
            },
            restaurantId: {
              type: 'string',
              description: 'Restaurant ID',
            },
            itemId: {
              type: 'string',
              description: 'Menu item ID to get variations for',
            },
          },
          required: ['tenant', 'restaurantId', 'itemId'],
        },
      },
      {
        name: 'get_menu_item_modifier_groups',
        description: 'Get all modifier groups (add-ons, extras) for a specific menu item',
        inputSchema: {
          type: 'object',
          properties: {
            tenant: {
              type: 'string',
              description: 'Tenant identifier (e.g. uk)',
            },
            restaurantId: {
              type: 'string',
              description: 'Restaurant ID',
            },
            itemId: {
              type: 'string',
              description: 'Menu item ID to get modifier groups for',
            },
          },
          required: ['tenant', 'restaurantId', 'itemId'],
        },
      },
      // ── Orders ─────────────────────────────────────────────────────────────
      {
        name: 'create_order',
        description: 'Create a new food order at a restaurant — submits the basket for processing',
        inputSchema: {
          type: 'object',
          properties: {
            restaurantId: {
              type: 'string',
              description: 'Restaurant ID to place the order with',
            },
            items: {
              type: 'array',
              description: 'Array of order items with itemId, quantity, and any modifiers',
            },
            fulfilmentMethod: {
              type: 'string',
              description: 'delivery or collection',
            },
            deliveryAddress: {
              type: 'object',
              description: 'Delivery address (required for delivery orders)',
            },
            notes: {
              type: 'string',
              description: 'Optional notes for the restaurant',
            },
          },
          required: ['restaurantId', 'items', 'fulfilmentMethod'],
        },
      },
      {
        name: 'accept_order',
        description: 'Accept an incoming order at the restaurant side — confirms the order will be prepared',
        inputSchema: {
          type: 'object',
          properties: {
            orderId: {
              type: 'string',
              description: 'Order ID to accept',
            },
            estimatedMinutes: {
              type: 'number',
              description: 'Estimated preparation time in minutes',
            },
          },
          required: ['orderId'],
        },
      },
      {
        name: 'reject_order',
        description: 'Reject an incoming order at the restaurant side with an optional reason',
        inputSchema: {
          type: 'object',
          properties: {
            orderId: {
              type: 'string',
              description: 'Order ID to reject',
            },
            reason: {
              type: 'string',
              description: 'Reason for rejection (e.g. restaurant-too-busy, item-unavailable)',
            },
          },
          required: ['orderId'],
        },
      },
      {
        name: 'cancel_order',
        description: 'Cancel an order that has already been accepted, with a cancellation reason',
        inputSchema: {
          type: 'object',
          properties: {
            orderId: {
              type: 'string',
              description: 'Order ID to cancel',
            },
            reason: {
              type: 'string',
              description: 'Reason for cancellation',
            },
          },
          required: ['orderId'],
        },
      },
      {
        name: 'complete_order',
        description: 'Mark an order as completed (delivered or collected by customer)',
        inputSchema: {
          type: 'object',
          properties: {
            orderId: {
              type: 'string',
              description: 'Order ID to complete',
            },
          },
          required: ['orderId'],
        },
      },
      {
        name: 'get_order_times',
        description: "Get a restaurant's configured order preparation and delivery time settings",
        inputSchema: {
          type: 'object',
          properties: {
            tenant: {
              type: 'string',
              description: 'Tenant identifier (e.g. uk)',
            },
            restaurantId: {
              type: 'string',
              description: 'Restaurant ID',
            },
          },
          required: ['tenant', 'restaurantId'],
        },
      },
      {
        name: 'get_restaurant_service_times',
        description: "Get a restaurant's configured service hours for delivery and collection",
        inputSchema: {
          type: 'object',
          properties: {
            tenant: {
              type: 'string',
              description: 'Tenant identifier (e.g. uk)',
            },
            restaurantId: {
              type: 'string',
              description: 'Restaurant ID',
            },
          },
          required: ['tenant', 'restaurantId'],
        },
      },
      // ── Delivery Pools ─────────────────────────────────────────────────────
      {
        name: 'get_delivery_pools',
        description: 'Get all delivery pools configured for your delivery partner account',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'create_delivery_pool',
        description: 'Create a new delivery pool to group restaurants and manage their delivery operations together',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Name of the delivery pool',
            },
            description: {
              type: 'string',
              description: 'Description of the delivery pool',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'get_delivery_pool',
        description: 'Get the details of a specific delivery pool by ID',
        inputSchema: {
          type: 'object',
          properties: {
            deliveryPoolId: {
              type: 'string',
              description: 'Delivery pool ID',
            },
          },
          required: ['deliveryPoolId'],
        },
      },
      {
        name: 'update_delivery_pool',
        description: 'Update the configuration of an existing delivery pool',
        inputSchema: {
          type: 'object',
          properties: {
            deliveryPoolId: {
              type: 'string',
              description: 'Delivery pool ID to update',
            },
            name: {
              type: 'string',
              description: 'New name for the delivery pool',
            },
            description: {
              type: 'string',
              description: 'New description for the delivery pool',
            },
          },
          required: ['deliveryPoolId'],
        },
      },
      {
        name: 'delete_delivery_pool',
        description: 'Delete a delivery pool — all associated restaurants will be unlinked',
        inputSchema: {
          type: 'object',
          properties: {
            deliveryPoolId: {
              type: 'string',
              description: 'Delivery pool ID to delete',
            },
          },
          required: ['deliveryPoolId'],
        },
      },
      {
        name: 'add_restaurants_to_pool',
        description: 'Add one or more restaurants to an existing delivery pool',
        inputSchema: {
          type: 'object',
          properties: {
            deliveryPoolId: {
              type: 'string',
              description: 'Delivery pool ID to add restaurants to',
            },
            restaurantIds: {
              type: 'array',
              description: 'Array of restaurant IDs to add to the pool',
              items: { type: 'string' },
            },
          },
          required: ['deliveryPoolId', 'restaurantIds'],
        },
      },
      {
        name: 'remove_restaurants_from_pool',
        description: 'Remove one or more restaurants from a delivery pool',
        inputSchema: {
          type: 'object',
          properties: {
            deliveryPoolId: {
              type: 'string',
              description: 'Delivery pool ID to remove restaurants from',
            },
            restaurantIds: {
              type: 'array',
              description: 'Array of restaurant IDs to remove from the pool',
              items: { type: 'string' },
            },
          },
          required: ['deliveryPoolId', 'restaurantIds'],
        },
      },
      {
        name: 'get_pool_availability',
        description: 'Get the current relative availability (pickup capacity) for a delivery pool',
        inputSchema: {
          type: 'object',
          properties: {
            deliveryPoolId: {
              type: 'string',
              description: 'Delivery pool ID',
            },
          },
          required: ['deliveryPoolId'],
        },
      },
      {
        name: 'set_pool_availability',
        description: 'Set the relative availability (pickup capacity percentage) for a delivery pool',
        inputSchema: {
          type: 'object',
          properties: {
            deliveryPoolId: {
              type: 'string',
              description: 'Delivery pool ID',
            },
            availabilityPercentage: {
              type: 'number',
              description: 'Pickup availability as a percentage (0-100)',
            },
          },
          required: ['deliveryPoolId', 'availabilityPercentage'],
        },
      },
      // ── Driver / Restaurant Status ──────────────────────────────────────────
      {
        name: 'update_driver_location',
        description: "Update the current GPS location of a driver for a specific order's delivery tracking",
        inputSchema: {
          type: 'object',
          properties: {
            orderId: {
              type: 'string',
              description: 'Order ID being delivered',
            },
            latitude: {
              type: 'number',
              description: 'Driver current latitude',
            },
            longitude: {
              type: 'number',
              description: 'Driver current longitude',
            },
          },
          required: ['orderId', 'latitude', 'longitude'],
        },
      },
      {
        name: 'set_restaurant_online',
        description: 'Set a restaurant status to online so it appears in search results and accepts new orders',
        inputSchema: {
          type: 'object',
          properties: {
            restaurantId: {
              type: 'string',
              description: 'Restaurant ID to set online',
            },
          },
          required: ['restaurantId'],
        },
      },
      {
        name: 'set_restaurant_offline',
        description: 'Set a restaurant status to offline to stop receiving new orders temporarily',
        inputSchema: {
          type: 'object',
          properties: {
            restaurantId: {
              type: 'string',
              description: 'Restaurant ID to set offline',
            },
            reason: {
              type: 'string',
              description: 'Optional reason for going offline (e.g. too-busy, closed-early)',
            },
          },
          required: ['restaurantId'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'search_restaurants_by_postcode':   return this.searchByPostcode(args);
        case 'search_restaurants_by_location':   return this.searchByLocation(args);
        case 'search_restaurants':               return this.searchRestaurants(args);
        case 'search_autocomplete':              return this.searchAutocomplete(args);
        case 'get_checkout':                     return this.getCheckout(args);
        case 'update_checkout':                  return this.updateCheckout(args);
        case 'get_available_fulfilment_times':   return this.getAvailableFulfilmentTimes(args);
        case 'get_delivery_estimate':            return this.getDeliveryEstimate(args);
        case 'get_delivery_fees':                return this.getDeliveryFees(args);
        case 'get_consumer_details':             return this.getConsumerDetails(args);
        case 'create_consumer':                  return this.createConsumer(args);
        case 'get_communication_preferences':    return this.getCommunicationPreferences(args);
        case 'get_restaurant_menu':              return this.getRestaurantMenu(args);
        case 'get_restaurant_catalogue':         return this.getRestaurantCatalogue(args);
        case 'get_menu_categories':              return this.getMenuCategories(args);
        case 'get_menu_items':                   return this.getMenuItems(args);
        case 'get_menu_item_variations':         return this.getMenuItemVariations(args);
        case 'get_menu_item_modifier_groups':    return this.getMenuItemModifierGroups(args);
        case 'create_order':                     return this.createOrder(args);
        case 'accept_order':                     return this.acceptOrder(args);
        case 'reject_order':                     return this.rejectOrder(args);
        case 'cancel_order':                     return this.cancelOrder(args);
        case 'complete_order':                   return this.completeOrder(args);
        case 'get_order_times':                  return this.getOrderTimes(args);
        case 'get_restaurant_service_times':     return this.getRestaurantServiceTimes(args);
        case 'get_delivery_pools':               return this.getDeliveryPools();
        case 'create_delivery_pool':             return this.createDeliveryPool(args);
        case 'get_delivery_pool':                return this.getDeliveryPool(args);
        case 'update_delivery_pool':             return this.updateDeliveryPool(args);
        case 'delete_delivery_pool':             return this.deleteDeliveryPool(args);
        case 'add_restaurants_to_pool':          return this.addRestaurantsToPool(args);
        case 'remove_restaurants_from_pool':     return this.removeRestaurantsFromPool(args);
        case 'get_pool_availability':            return this.getPoolAvailability(args);
        case 'set_pool_availability':            return this.setPoolAvailability(args);
        case 'update_driver_location':           return this.updateDriverLocation(args);
        case 'set_restaurant_online':            return this.setRestaurantOnline(args);
        case 'set_restaurant_offline':           return this.setRestaurantOffline(args);
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

  // ── Private helpers ────────────────────────────────────────────────────────

  private get authHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    if (this.bearerToken) {
      headers['Authorization'] = `Bearer ${this.bearerToken}`;
    } else if (this.apiKey) {
      headers['Authorization'] = this.apiKey;
    }
    return headers;
  }

  private buildQuery(params: Record<string, unknown>): string {
    const q = Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== null && v !== '')
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join('&');
    return q ? `?${q}` : '';
  }

  private async request(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    path: string,
    body?: Record<string, unknown>,
  ): Promise<ToolResult> {
    const url = `${this.baseUrl}${path}`;
    const init: RequestInit = {
      method,
      headers: this.authHeaders,
    };
    if (body && Object.keys(body).length > 0) init.body = JSON.stringify(body);
    const response = await this.fetchWithRetry(url, init);
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${errText}` }],
        isError: true,
      };
    }
    if (response.status === 204) {
      return { content: [{ type: 'text', text: '{"success":true}' }], isError: false };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  // ── Restaurant Search ──────────────────────────────────────────────────────

  private async searchByPostcode(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.postcode) return { content: [{ type: 'text', text: 'postcode is required' }], isError: true };
    const postcode = encodeURIComponent(args.postcode as string);
    return this.request('GET', `/restaurants/bypostcode/${postcode}`);
  }

  private async searchByLocation(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.latitude || !args.longitude) {
      return { content: [{ type: 'text', text: 'latitude and longitude are required' }], isError: true };
    }
    const q = this.buildQuery({ latitude: args.latitude, longitude: args.longitude });
    return this.request('GET', `/restaurants/bylatlong${q}`);
  }

  private async searchRestaurants(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.tenant) return { content: [{ type: 'text', text: 'tenant is required' }], isError: true };
    const { tenant, ...params } = args;
    const q = this.buildQuery(params as Record<string, unknown>);
    return this.request('GET', `/search/restaurants/${encodeURIComponent(tenant as string)}${q}`);
  }

  private async searchAutocomplete(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.tenant || !args.q) {
      return { content: [{ type: 'text', text: 'tenant and q are required' }], isError: true };
    }
    const q = this.buildQuery({ q: args.q });
    return this.request('GET', `/search/autocomplete/${encodeURIComponent(args.tenant as string)}${q}`);
  }

  // ── Checkout ───────────────────────────────────────────────────────────────

  private async getCheckout(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.tenant || !args.checkoutId) {
      return { content: [{ type: 'text', text: 'tenant and checkoutId are required' }], isError: true };
    }
    return this.request('GET', `/checkout/${encodeURIComponent(args.tenant as string)}/${encodeURIComponent(args.checkoutId as string)}`);
  }

  private async updateCheckout(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.tenant || !args.checkoutId) {
      return { content: [{ type: 'text', text: 'tenant and checkoutId are required' }], isError: true };
    }
    const { tenant, checkoutId, ...body } = args;
    return this.request('PATCH', `/checkout/${encodeURIComponent(tenant as string)}/${encodeURIComponent(checkoutId as string)}`, body as Record<string, unknown>);
  }

  private async getAvailableFulfilmentTimes(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.tenant || !args.checkoutId) {
      return { content: [{ type: 'text', text: 'tenant and checkoutId are required' }], isError: true };
    }
    return this.request('GET', `/checkout/${encodeURIComponent(args.tenant as string)}/${encodeURIComponent(args.checkoutId as string)}/fulfilment/availabletimes`);
  }

  // ── Delivery ───────────────────────────────────────────────────────────────

  private async getDeliveryEstimate(args: Record<string, unknown>): Promise<ToolResult> {
    const { pickupLatitude, pickupLongitude, dropoffLatitude, dropoffLongitude } = args;
    if (!pickupLatitude || !pickupLongitude || !dropoffLatitude || !dropoffLongitude) {
      return { content: [{ type: 'text', text: 'pickupLatitude, pickupLongitude, dropoffLatitude, and dropoffLongitude are required' }], isError: true };
    }
    const q = this.buildQuery({ pickupLatitude, pickupLongitude, dropoffLatitude, dropoffLongitude });
    return this.request('GET', `/delivery/estimate${q}`);
  }

  private async getDeliveryFees(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.tenant) return { content: [{ type: 'text', text: 'tenant is required' }], isError: true };
    const { tenant, ...params } = args;
    const q = this.buildQuery(params as Record<string, unknown>);
    return this.request('GET', `/delivery-fees/${encodeURIComponent(tenant as string)}${q}`);
  }

  // ── Consumer ───────────────────────────────────────────────────────────────

  private async getConsumerDetails(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.tenant) return { content: [{ type: 'text', text: 'tenant is required' }], isError: true };
    return this.request('GET', `/consumers/${encodeURIComponent(args.tenant as string)}`);
  }

  private async createConsumer(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.tenant || !args.email) {
      return { content: [{ type: 'text', text: 'tenant and email are required' }], isError: true };
    }
    const { tenant, ...body } = args;
    return this.request('POST', `/consumers/${encodeURIComponent(tenant as string)}`, body as Record<string, unknown>);
  }

  private async getCommunicationPreferences(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.tenant) return { content: [{ type: 'text', text: 'tenant is required' }], isError: true };
    return this.request('GET', `/consumers/${encodeURIComponent(args.tenant as string)}/me/communication-preferences`);
  }

  // ── Menu / Catalogue ───────────────────────────────────────────────────────

  private async getRestaurantMenu(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.tenant || !args.restaurantId) {
      return { content: [{ type: 'text', text: 'tenant and restaurantId are required' }], isError: true };
    }
    return this.request('GET', `/restaurants/${encodeURIComponent(args.tenant as string)}/${encodeURIComponent(args.restaurantId as string)}/menu`);
  }

  private async getRestaurantCatalogue(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.tenant || !args.restaurantId) {
      return { content: [{ type: 'text', text: 'tenant and restaurantId are required' }], isError: true };
    }
    return this.request('GET', `/restaurants/${encodeURIComponent(args.tenant as string)}/${encodeURIComponent(args.restaurantId as string)}/catalogue`);
  }

  private async getMenuCategories(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.tenant || !args.restaurantId) {
      return { content: [{ type: 'text', text: 'tenant and restaurantId are required' }], isError: true };
    }
    return this.request('GET', `/restaurants/${encodeURIComponent(args.tenant as string)}/${encodeURIComponent(args.restaurantId as string)}/catalogue/categories`);
  }

  private async getMenuItems(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.tenant || !args.restaurantId) {
      return { content: [{ type: 'text', text: 'tenant and restaurantId are required' }], isError: true };
    }
    return this.request('GET', `/restaurants/${encodeURIComponent(args.tenant as string)}/${encodeURIComponent(args.restaurantId as string)}/catalogue/items`);
  }

  private async getMenuItemVariations(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.tenant || !args.restaurantId || !args.itemId) {
      return { content: [{ type: 'text', text: 'tenant, restaurantId, and itemId are required' }], isError: true };
    }
    return this.request('GET', `/restaurants/${encodeURIComponent(args.tenant as string)}/${encodeURIComponent(args.restaurantId as string)}/catalogue/items/${encodeURIComponent(args.itemId as string)}/variations`);
  }

  private async getMenuItemModifierGroups(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.tenant || !args.restaurantId || !args.itemId) {
      return { content: [{ type: 'text', text: 'tenant, restaurantId, and itemId are required' }], isError: true };
    }
    return this.request('GET', `/restaurants/${encodeURIComponent(args.tenant as string)}/${encodeURIComponent(args.restaurantId as string)}/catalogue/items/${encodeURIComponent(args.itemId as string)}/modifiergroups`);
  }

  // ── Orders ─────────────────────────────────────────────────────────────────

  private async createOrder(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.restaurantId || !args.items || !args.fulfilmentMethod) {
      return { content: [{ type: 'text', text: 'restaurantId, items, and fulfilmentMethod are required' }], isError: true };
    }
    return this.request('POST', '/orders', args as Record<string, unknown>);
  }

  private async acceptOrder(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.orderId) return { content: [{ type: 'text', text: 'orderId is required' }], isError: true };
    const { orderId, ...body } = args;
    return this.request('PUT', `/orders/${encodeURIComponent(orderId as string)}/accept`, body as Record<string, unknown>);
  }

  private async rejectOrder(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.orderId) return { content: [{ type: 'text', text: 'orderId is required' }], isError: true };
    const { orderId, ...body } = args;
    return this.request('PUT', `/orders/${encodeURIComponent(orderId as string)}/reject`, body as Record<string, unknown>);
  }

  private async cancelOrder(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.orderId) return { content: [{ type: 'text', text: 'orderId is required' }], isError: true };
    const { orderId, ...body } = args;
    return this.request('PUT', `/orders/${encodeURIComponent(orderId as string)}/cancel`, body as Record<string, unknown>);
  }

  private async completeOrder(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.orderId) return { content: [{ type: 'text', text: 'orderId is required' }], isError: true };
    return this.request('POST', `/orders/${encodeURIComponent(args.orderId as string)}/complete`);
  }

  private async getOrderTimes(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.tenant || !args.restaurantId) {
      return { content: [{ type: 'text', text: 'tenant and restaurantId are required' }], isError: true };
    }
    return this.request('GET', `/restaurants/${encodeURIComponent(args.tenant as string)}/${encodeURIComponent(args.restaurantId as string)}/ordertimes`);
  }

  private async getRestaurantServiceTimes(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.tenant || !args.restaurantId) {
      return { content: [{ type: 'text', text: 'tenant and restaurantId are required' }], isError: true };
    }
    return this.request('GET', `/restaurants/${encodeURIComponent(args.tenant as string)}/${encodeURIComponent(args.restaurantId as string)}/servicetimes`);
  }

  // ── Delivery Pools ─────────────────────────────────────────────────────────

  private async getDeliveryPools(): Promise<ToolResult> {
    return this.request('GET', '/delivery/pools');
  }

  private async createDeliveryPool(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    return this.request('POST', '/delivery/pools', args as Record<string, unknown>);
  }

  private async getDeliveryPool(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.deliveryPoolId) return { content: [{ type: 'text', text: 'deliveryPoolId is required' }], isError: true };
    return this.request('GET', `/delivery/pools/${encodeURIComponent(args.deliveryPoolId as string)}`);
  }

  private async updateDeliveryPool(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.deliveryPoolId) return { content: [{ type: 'text', text: 'deliveryPoolId is required' }], isError: true };
    const { deliveryPoolId, ...body } = args;
    return this.request('PATCH', `/delivery/pools/${encodeURIComponent(deliveryPoolId as string)}`, body as Record<string, unknown>);
  }

  private async deleteDeliveryPool(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.deliveryPoolId) return { content: [{ type: 'text', text: 'deliveryPoolId is required' }], isError: true };
    return this.request('DELETE', `/delivery/pools/${encodeURIComponent(args.deliveryPoolId as string)}`);
  }

  private async addRestaurantsToPool(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.deliveryPoolId || !args.restaurantIds) {
      return { content: [{ type: 'text', text: 'deliveryPoolId and restaurantIds are required' }], isError: true };
    }
    const { deliveryPoolId, ...body } = args;
    return this.request('PUT', `/delivery/pools/${encodeURIComponent(deliveryPoolId as string)}/restaurants`, body as Record<string, unknown>);
  }

  private async removeRestaurantsFromPool(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.deliveryPoolId || !args.restaurantIds) {
      return { content: [{ type: 'text', text: 'deliveryPoolId and restaurantIds are required' }], isError: true };
    }
    return this.request('DELETE', `/delivery/pools/${encodeURIComponent(args.deliveryPoolId as string)}/restaurants`);
  }

  private async getPoolAvailability(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.deliveryPoolId) return { content: [{ type: 'text', text: 'deliveryPoolId is required' }], isError: true };
    return this.request('GET', `/delivery/pools/${encodeURIComponent(args.deliveryPoolId as string)}/availability/relative`);
  }

  private async setPoolAvailability(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.deliveryPoolId || args.availabilityPercentage === undefined) {
      return { content: [{ type: 'text', text: 'deliveryPoolId and availabilityPercentage are required' }], isError: true };
    }
    const { deliveryPoolId, ...body } = args;
    return this.request('PUT', `/delivery/pools/${encodeURIComponent(deliveryPoolId as string)}/availability/relative`, body as Record<string, unknown>);
  }

  // ── Driver / Restaurant Status ──────────────────────────────────────────────

  private async updateDriverLocation(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.orderId || !args.latitude || !args.longitude) {
      return { content: [{ type: 'text', text: 'orderId, latitude, and longitude are required' }], isError: true };
    }
    const body = { latitude: args.latitude, longitude: args.longitude };
    return this.request('PUT', `/orders/${encodeURIComponent(args.orderId as string)}/deliverystate/driverlocation`, body);
  }

  private async setRestaurantOnline(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.restaurantId) return { content: [{ type: 'text', text: 'restaurantId is required' }], isError: true };
    return this.request('PUT', '/restaurant-online-status', { restaurantId: args.restaurantId });
  }

  private async setRestaurantOffline(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.restaurantId) return { content: [{ type: 'text', text: 'restaurantId is required' }], isError: true };
    return this.request('PUT', '/restaurant-offline-status', args as Record<string, unknown>);
  }
}
