/**
 * Intellifi Brain Web API MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official Intellifi Brain MCP server was found on GitHub.
//
// Base URL: https://{customer}.intellifi.{tld}/api (e.g. https://brain.intellifi.cloud/api)
// Auth: API key passed via X-Api-Key header (HeaderApiKey) or ?key= query param (QueryApiKey).
//   Session cookie (CookieSid) is for browser/admin use only — not for programmatic access.
//   Users/Keys endpoints require admin cookie — out of scope for this adapter.
// Docs: https://intellifi.zendesk.com
// Spec: https://api.apis.guru/v2/specs/intellifi.nl/2.23.2+0.gfbc3926.dirty/openapi.json
// Rate limits: Not publicly documented. Contact support@intellifi.nl for enterprise limits.
// Category: iot — RFID/BLE asset tracking and location intelligence platform.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface IntellifiBrainConfig {
  /** API key for X-Api-Key header authentication */
  apiKey: string;
  /** Base URL of the Brain API (default: https://brain.intellifi.cloud/api) */
  baseUrl?: string;
}

export class IntellifiNlMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: IntellifiBrainConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? 'https://brain.intellifi.cloud/api';
  }

  static catalog() {
    return {
      name: 'intellifi-nl',
      displayName: 'Intellifi Brain',
      version: '1.0.0',
      category: 'iot',
      keywords: [
        'intellifi', 'brain', 'rfid', 'bluetooth', 'ble', 'iot', 'asset-tracking',
        'location', 'presence', 'spot', 'item', 'key', 'subscription', 'event',
        'location-rule', 'item-list', 'spot-list', 'blob', 'kv-pair',
      ],
      toolNames: [
        'get_auth_info',
        'list_items', 'get_item', 'create_item', 'update_item', 'delete_item',
        'list_spots', 'get_spot', 'update_spot',
        'list_locations', 'get_location', 'create_location', 'update_location', 'delete_location',
        'list_presences', 'get_presence',
        'list_events', 'get_event',
        'list_keys', 'get_key', 'create_key', 'update_key', 'delete_key',
        'list_subscriptions', 'get_subscription', 'create_subscription', 'update_subscription', 'delete_subscription', 'get_subscription_events',
        'list_location_rules', 'get_location_rule', 'create_location_rule', 'update_location_rule', 'delete_location_rule',
        'list_item_lists', 'get_item_list', 'create_item_list', 'update_item_list', 'delete_item_list',
        'get_item_list_ids', 'add_items_to_list', 'remove_item_from_list',
        'list_spot_lists', 'get_spot_list', 'create_spot_list', 'update_spot_list', 'delete_spot_list',
        'get_spot_list_ids', 'add_spots_to_list', 'remove_spot_from_list',
        'list_kvpairs', 'get_kvpair', 'create_kvpair', 'update_kvpair', 'delete_kvpair',
        'list_blobs', 'get_blob_metadata', 'create_blob_metadata', 'delete_blob',
        'list_services', 'get_service', 'update_service',
      ],
      description: 'Intellifi Brain IoT platform: manage RFID/BLE items, spots, locations, presences, events, subscriptions, and asset-tracking rules.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // Auth
      {
        name: 'get_auth_info',
        description: 'Retrieve authentication information and current session/API key details from the Brain',
        inputSchema: { type: 'object', properties: {} },
      },
      // Items
      {
        name: 'list_items',
        description: 'List all tracked items (RFID tags, BLE beacons) with optional filters for pagination and search',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Maximum number of items to return (default: 100)' },
            skip: { type: 'number', description: 'Number of items to skip for pagination (default: 0)' },
            q: { type: 'string', description: 'Free-text search query to filter items by label or identifier' },
          },
        },
      },
      {
        name: 'get_item',
        description: 'Get a single tracked item by its ID — returns label, code, status, and last-seen location',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Item ID to retrieve' },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_item',
        description: 'Create a new tracked item (RFID tag or BLE beacon) with a code and optional label',
        inputSchema: {
          type: 'object',
          properties: {
            code: { type: 'string', description: 'Unique identifier code for the item (e.g. EPC, MAC address)' },
            label: { type: 'string', description: 'Human-readable label for the item (optional)' },
          },
          required: ['code'],
        },
      },
      {
        name: 'update_item',
        description: 'Update an existing item\'s label or properties by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Item ID to update' },
            label: { type: 'string', description: 'New label for the item (optional)' },
          },
          required: ['id'],
        },
      },
      {
        name: 'delete_item',
        description: 'Delete a tracked item by ID — removes it from the Brain permanently',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Item ID to delete' },
          },
          required: ['id'],
        },
      },
      // Spots
      {
        name: 'list_spots',
        description: 'List all spots (RFID readers, BLE gateways, or virtual zones) with optional pagination',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Maximum number of spots to return (default: 100)' },
            skip: { type: 'number', description: 'Number of spots to skip for pagination (default: 0)' },
            q: { type: 'string', description: 'Free-text search query to filter spots by label' },
          },
        },
      },
      {
        name: 'get_spot',
        description: 'Get a single spot by ID — returns label, type, location, and configuration',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Spot ID to retrieve' },
          },
          required: ['id'],
        },
      },
      {
        name: 'update_spot',
        description: 'Update an existing spot\'s label or properties by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Spot ID to update' },
            label: { type: 'string', description: 'New label for the spot (optional)' },
          },
          required: ['id'],
        },
      },
      // Locations
      {
        name: 'list_locations',
        description: 'List all logical locations (zones, rooms, areas) with optional pagination and search',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Maximum number of locations to return (default: 100)' },
            skip: { type: 'number', description: 'Number of locations to skip for pagination (default: 0)' },
            q: { type: 'string', description: 'Free-text search query to filter by label' },
          },
        },
      },
      {
        name: 'get_location',
        description: 'Get a single location by ID — returns label, type, and associated spots',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Location ID to retrieve' },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_location',
        description: 'Create a new logical location (zone or area) with a label',
        inputSchema: {
          type: 'object',
          properties: {
            label: { type: 'string', description: 'Human-readable label for the location' },
          },
          required: ['label'],
        },
      },
      {
        name: 'update_location',
        description: 'Update an existing location\'s label by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Location ID to update' },
            label: { type: 'string', description: 'New label for the location' },
          },
          required: ['id', 'label'],
        },
      },
      {
        name: 'delete_location',
        description: 'Delete a location by ID — removes the logical zone from the Brain',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Location ID to delete' },
          },
          required: ['id'],
        },
      },
      // Presences
      {
        name: 'list_presences',
        description: 'List current item presences — which items are currently detected at which spots or locations',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Maximum number of presences to return (default: 100)' },
            skip: { type: 'number', description: 'Number of presences to skip for pagination (default: 0)' },
            item_id: { type: 'string', description: 'Filter presences by item ID (optional)' },
            spot_id: { type: 'string', description: 'Filter presences by spot ID (optional)' },
          },
        },
      },
      {
        name: 'get_presence',
        description: 'Get a single presence record by ID — returns item, spot, first seen, and last seen timestamps',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Presence ID to retrieve' },
          },
          required: ['id'],
        },
      },
      // Events
      {
        name: 'list_events',
        description: 'List tracking events (item arrives/departs/moves) with optional filters for item, spot, or time range',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Maximum number of events to return (default: 100)' },
            skip: { type: 'number', description: 'Number of events to skip for pagination (default: 0)' },
            item_id: { type: 'string', description: 'Filter events by item ID (optional)' },
            spot_id: { type: 'string', description: 'Filter events by spot ID (optional)' },
          },
        },
      },
      {
        name: 'get_event',
        description: 'Get a single event by ID — returns event type, item, spot, and timestamp',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Event ID to retrieve' },
          },
          required: ['id'],
        },
      },
      // Keys
      {
        name: 'list_keys',
        description: 'List API keys configured in the Brain (requires admin authentication)',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Maximum number of keys to return (default: 100)' },
            skip: { type: 'number', description: 'Number of keys to skip for pagination (default: 0)' },
          },
        },
      },
      {
        name: 'get_key',
        description: 'Get a single API key by ID — returns label, permissions, and expiry',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Key ID to retrieve' },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_key',
        description: 'Create a new API key with a label and optional permissions',
        inputSchema: {
          type: 'object',
          properties: {
            label: { type: 'string', description: 'Human-readable label for the API key' },
          },
          required: ['label'],
        },
      },
      {
        name: 'update_key',
        description: 'Update an existing API key\'s label or permissions by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Key ID to update' },
            label: { type: 'string', description: 'New label for the key (optional)' },
          },
          required: ['id'],
        },
      },
      {
        name: 'delete_key',
        description: 'Delete an API key by ID — revokes access for that key immediately',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Key ID to delete' },
          },
          required: ['id'],
        },
      },
      // Subscriptions
      {
        name: 'list_subscriptions',
        description: 'List webhook subscriptions that receive event notifications from the Brain',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Maximum number of subscriptions to return (default: 100)' },
            skip: { type: 'number', description: 'Number of subscriptions to skip for pagination (default: 0)' },
          },
        },
      },
      {
        name: 'get_subscription',
        description: 'Get a single webhook subscription by ID — returns URL, event types, and status',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Subscription ID to retrieve' },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_subscription',
        description: 'Create a new webhook subscription to receive Brain events at a specified URL',
        inputSchema: {
          type: 'object',
          properties: {
            url: { type: 'string', description: 'HTTPS webhook URL to receive event notifications' },
            label: { type: 'string', description: 'Human-readable label for the subscription (optional)' },
          },
          required: ['url'],
        },
      },
      {
        name: 'update_subscription',
        description: 'Update an existing subscription\'s URL or label by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Subscription ID to update' },
            url: { type: 'string', description: 'New webhook URL (optional)' },
            label: { type: 'string', description: 'New label for the subscription (optional)' },
          },
          required: ['id'],
        },
      },
      {
        name: 'delete_subscription',
        description: 'Delete a webhook subscription by ID — stops event delivery to that URL',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Subscription ID to delete' },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_subscription_events',
        description: 'Get recent events delivered to a specific webhook subscription',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Subscription ID to get events for' },
            limit: { type: 'number', description: 'Maximum number of events to return (default: 100)' },
          },
          required: ['id'],
        },
      },
      // Location Rules
      {
        name: 'list_location_rules',
        description: 'List location rules that map spots to logical locations for presence aggregation',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Maximum number of location rules to return (default: 100)' },
            skip: { type: 'number', description: 'Number of rules to skip for pagination (default: 0)' },
          },
        },
      },
      {
        name: 'get_location_rule',
        description: 'Get a single location rule by ID — returns spot, location, and matching criteria',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Location rule ID to retrieve' },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_location_rule',
        description: 'Create a location rule that maps a spot (or spot group) to a logical location',
        inputSchema: {
          type: 'object',
          properties: {
            location_id: { type: 'string', description: 'Location ID to map to' },
            spot_id: { type: 'string', description: 'Spot ID to map from (optional if using spot list)' },
            label: { type: 'string', description: 'Human-readable label for the rule (optional)' },
          },
          required: ['location_id'],
        },
      },
      {
        name: 'update_location_rule',
        description: 'Update an existing location rule by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Location rule ID to update' },
            location_id: { type: 'string', description: 'New location ID to map to (optional)' },
            label: { type: 'string', description: 'New label for the rule (optional)' },
          },
          required: ['id'],
        },
      },
      {
        name: 'delete_location_rule',
        description: 'Delete a location rule by ID — removes the spot-to-location mapping',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Location rule ID to delete' },
          },
          required: ['id'],
        },
      },
      // Item Lists
      {
        name: 'list_item_lists',
        description: 'List item list sets — named groups of tracked items used for batch operations and rules',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Maximum number of item lists to return (default: 100)' },
            skip: { type: 'number', description: 'Number of lists to skip for pagination (default: 0)' },
          },
        },
      },
      {
        name: 'get_item_list',
        description: 'Get a single item list by ID — returns label and item count',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Item list ID to retrieve' },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_item_list',
        description: 'Create a new item list set with a label for grouping tracked items',
        inputSchema: {
          type: 'object',
          properties: {
            label: { type: 'string', description: 'Human-readable label for the item list' },
          },
          required: ['label'],
        },
      },
      {
        name: 'update_item_list',
        description: 'Update an item list\'s label by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Item list ID to update' },
            label: { type: 'string', description: 'New label for the item list' },
          },
          required: ['id', 'label'],
        },
      },
      {
        name: 'delete_item_list',
        description: 'Delete an item list by ID — removes the group and its membership records',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Item list ID to delete' },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_item_list_ids',
        description: 'Get the item IDs that belong to a specific item list',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Item list ID to get members for' },
          },
          required: ['id'],
        },
      },
      {
        name: 'add_items_to_list',
        description: 'Add one or more item IDs to an existing item list',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Item list ID to add items to' },
            item_ids: {
              type: 'array',
              description: 'Array of item IDs to add to the list',
              items: { type: 'string' },
            },
          },
          required: ['id', 'item_ids'],
        },
      },
      {
        name: 'remove_item_from_list',
        description: 'Remove a single item from an item list by list ID and item ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Item list ID' },
            item_id: { type: 'string', description: 'Item ID to remove from the list' },
          },
          required: ['id', 'item_id'],
        },
      },
      // Spot Lists
      {
        name: 'list_spot_lists',
        description: 'List spot list sets — named groups of spots used for location rules and batch operations',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Maximum number of spot lists to return (default: 100)' },
            skip: { type: 'number', description: 'Number of lists to skip for pagination (default: 0)' },
          },
        },
      },
      {
        name: 'get_spot_list',
        description: 'Get a single spot list by ID — returns label and spot count',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Spot list ID to retrieve' },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_spot_list',
        description: 'Create a new spot list for grouping multiple spots into a named set',
        inputSchema: {
          type: 'object',
          properties: {
            label: { type: 'string', description: 'Human-readable label for the spot list' },
          },
          required: ['label'],
        },
      },
      {
        name: 'update_spot_list',
        description: 'Update an existing spot list\'s label by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Spot list ID to update' },
            label: { type: 'string', description: 'New label for the spot list' },
          },
          required: ['id', 'label'],
        },
      },
      {
        name: 'delete_spot_list',
        description: 'Delete a spot list by ID — removes the group and its membership records',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Spot list ID to delete' },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_spot_list_ids',
        description: 'Get the spot IDs that belong to a specific spot list',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Spot list ID to get members for' },
          },
          required: ['id'],
        },
      },
      {
        name: 'add_spots_to_list',
        description: 'Add one or more spot IDs to an existing spot list',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Spot list ID to add spots to' },
            spot_ids: {
              type: 'array',
              description: 'Array of spot IDs to add to the list',
              items: { type: 'string' },
            },
          },
          required: ['id', 'spot_ids'],
        },
      },
      {
        name: 'remove_spot_from_list',
        description: 'Remove a single spot from a spot list by list ID and spot ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Spot list ID' },
            spot_id: { type: 'string', description: 'Spot ID to remove from the list' },
          },
          required: ['id', 'spot_id'],
        },
      },
      // KV Pairs
      {
        name: 'list_kvpairs',
        description: 'List all key-value pairs stored in the Brain — used for custom metadata and configuration',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Maximum number of key-value pairs to return (default: 100)' },
            skip: { type: 'number', description: 'Number of pairs to skip for pagination (default: 0)' },
          },
        },
      },
      {
        name: 'get_kvpair',
        description: 'Get a single key-value pair by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Key-value pair ID to retrieve' },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_kvpair',
        description: 'Create a new key-value pair for storing custom metadata in the Brain',
        inputSchema: {
          type: 'object',
          properties: {
            key: { type: 'string', description: 'Key name for the pair' },
            value: { type: 'string', description: 'Value to store' },
          },
          required: ['key', 'value'],
        },
      },
      {
        name: 'update_kvpair',
        description: 'Update an existing key-value pair\'s value by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Key-value pair ID to update' },
            value: { type: 'string', description: 'New value to store' },
          },
          required: ['id', 'value'],
        },
      },
      {
        name: 'delete_kvpair',
        description: 'Delete a key-value pair by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Key-value pair ID to delete' },
          },
          required: ['id'],
        },
      },
      // Blobs
      {
        name: 'list_blobs',
        description: 'List binary large object (blob) metadata stored in the Brain',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Maximum number of blobs to return (default: 100)' },
            skip: { type: 'number', description: 'Number of blobs to skip for pagination (default: 0)' },
          },
        },
      },
      {
        name: 'get_blob_metadata',
        description: 'Get metadata for a specific blob by ID — returns filename, content type, and size',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Blob ID to retrieve metadata for' },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_blob_metadata',
        description: 'Create a new blob metadata record before uploading binary data',
        inputSchema: {
          type: 'object',
          properties: {
            filename: { type: 'string', description: 'Filename for the blob' },
            content_type: { type: 'string', description: 'MIME type of the blob content (e.g. image/png, application/pdf)' },
          },
          required: ['filename', 'content_type'],
        },
      },
      {
        name: 'delete_blob',
        description: 'Delete a blob and its metadata by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Blob ID to delete' },
          },
          required: ['id'],
        },
      },
      // Services
      {
        name: 'list_services',
        description: 'List Brain microservices and their current status (running, stopped, error)',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Maximum number of services to return (default: 100)' },
            skip: { type: 'number', description: 'Number of services to skip for pagination (default: 0)' },
          },
        },
      },
      {
        name: 'get_service',
        description: 'Get details of a single Brain service by ID — returns name, status, and configuration',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Service ID to retrieve' },
          },
          required: ['id'],
        },
      },
      {
        name: 'update_service',
        description: 'Update a Brain service\'s configuration by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Service ID to update' },
            label: { type: 'string', description: 'New label for the service (optional)' },
          },
          required: ['id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_auth_info': return this.get('/authinfo');
        case 'list_items': return this.list('/items', args);
        case 'get_item': return this.getById('/items', args);
        case 'create_item': return this.create('/items', args, ['code']);
        case 'update_item': return this.update('/items', args);
        case 'delete_item': return this.deleteById('/items', args);
        case 'list_spots': return this.list('/spots', args);
        case 'get_spot': return this.getById('/spots', args);
        case 'update_spot': return this.update('/spots', args);
        case 'list_locations': return this.list('/locations', args);
        case 'get_location': return this.getById('/locations', args);
        case 'create_location': return this.create('/locations', args, ['label']);
        case 'update_location': return this.update('/locations', args);
        case 'delete_location': return this.deleteById('/locations', args);
        case 'list_presences': return this.listPresences(args);
        case 'get_presence': return this.getById('/presences', args);
        case 'list_events': return this.listEvents(args);
        case 'get_event': return this.getById('/events', args);
        case 'list_keys': return this.list('/keys', args);
        case 'get_key': return this.getById('/keys', args);
        case 'create_key': return this.create('/keys', args, ['label']);
        case 'update_key': return this.update('/keys', args);
        case 'delete_key': return this.deleteById('/keys', args);
        case 'list_subscriptions': return this.list('/subscriptions', args);
        case 'get_subscription': return this.getById('/subscriptions', args);
        case 'create_subscription': return this.create('/subscriptions', args, ['url']);
        case 'update_subscription': return this.update('/subscriptions', args);
        case 'delete_subscription': return this.deleteById('/subscriptions', args);
        case 'get_subscription_events': return this.getSubscriptionEvents(args);
        case 'list_location_rules': return this.list('/locationrules', args);
        case 'get_location_rule': return this.getById('/locationrules', args);
        case 'create_location_rule': return this.create('/locationrules', args, ['location_id']);
        case 'update_location_rule': return this.update('/locationrules', args);
        case 'delete_location_rule': return this.deleteById('/locationrules', args);
        case 'list_item_lists': return this.list('/sets/itemlists', args);
        case 'get_item_list': return this.getById('/sets/itemlists', args);
        case 'create_item_list': return this.create('/sets/itemlists', args, ['label']);
        case 'update_item_list': return this.update('/sets/itemlists', args);
        case 'delete_item_list': return this.deleteById('/sets/itemlists', args);
        case 'get_item_list_ids': return this.getSubResource('/sets/itemlists', args, 'ids');
        case 'add_items_to_list': return this.addToList('/sets/itemlists', args, 'item_ids');
        case 'remove_item_from_list': return this.removeFromList('/sets/itemlists', args, 'item_id');
        case 'list_spot_lists': return this.list('/sets/spotlists', args);
        case 'get_spot_list': return this.getById('/sets/spotlists', args);
        case 'create_spot_list': return this.create('/sets/spotlists', args, ['label']);
        case 'update_spot_list': return this.update('/sets/spotlists', args);
        case 'delete_spot_list': return this.deleteById('/sets/spotlists', args);
        case 'get_spot_list_ids': return this.getSubResource('/sets/spotlists', args, 'ids');
        case 'add_spots_to_list': return this.addToList('/sets/spotlists', args, 'spot_ids');
        case 'remove_spot_from_list': return this.removeFromList('/sets/spotlists', args, 'spot_id');
        case 'list_kvpairs': return this.list('/kvpairs', args);
        case 'get_kvpair': return this.getById('/kvpairs', args);
        case 'create_kvpair': return this.create('/kvpairs', args, ['key', 'value']);
        case 'update_kvpair': return this.update('/kvpairs', args);
        case 'delete_kvpair': return this.deleteById('/kvpairs', args);
        case 'list_blobs': return this.list('/blobs', args);
        case 'get_blob_metadata': return this.getById('/blobs', args);
        case 'create_blob_metadata': return this.create('/blobs', args, ['filename', 'content_type']);
        case 'delete_blob': return this.deleteById('/blobs', args);
        case 'list_services': return this.list('/services', args);
        case 'get_service': return this.getById('/services', args);
        case 'update_service': return this.update('/services', args);
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

  private buildHeaders(): Record<string, string> {
    return {
      'X-Api-Key': this.apiKey,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  }

  private buildListUrl(path: string, args: Record<string, unknown>): string {
    const qs = new URLSearchParams();
    if (args.limit !== undefined) qs.set('limit', String(args.limit));
    if (args.skip !== undefined) qs.set('skip', String(args.skip));
    if (args.q) qs.set('q', args.q as string);
    const query = qs.toString();
    return `${this.baseUrl}${path}${query ? `?${query}` : ''}`;
  }

  private async get(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'GET',
      headers: this.buildHeaders(),
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}${errText ? ` — ${errText}` : ''}` }],
        isError: true,
      };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async list(path: string, args: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(this.buildListUrl(path, args), {
      method: 'GET',
      headers: this.buildHeaders(),
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}${errText ? ` — ${errText}` : ''}` }],
        isError: true,
      };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getById(path: string, args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) {
      return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    }
    return this.get(`${path}/${encodeURIComponent(args.id as string)}`);
  }

  private async create(path: string, args: Record<string, unknown>, required: string[]): Promise<ToolResult> {
    for (const field of required) {
      if (!args[field]) {
        return { content: [{ type: 'text', text: `${field} is required` }], isError: true };
      }
    }
    const body: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(args)) {
      if (v !== undefined) body[k] = v;
    }
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.buildHeaders(),
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}${errText ? ` — ${errText}` : ''}` }],
        isError: true,
      };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async update(path: string, args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) {
      return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    }
    const { id, ...rest } = args;
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}/${encodeURIComponent(id as string)}`, {
      method: 'PUT',
      headers: this.buildHeaders(),
      body: JSON.stringify(rest),
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}${errText ? ` — ${errText}` : ''}` }],
        isError: true,
      };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async deleteById(path: string, args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) {
      return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    }
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}/${encodeURIComponent(args.id as string)}`, {
      method: 'DELETE',
      headers: this.buildHeaders(),
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}${errText ? ` — ${errText}` : ''}` }],
        isError: true,
      };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ deleted: true, id: args.id }) }], isError: false };
  }

  private async getSubResource(path: string, args: Record<string, unknown>, sub: string): Promise<ToolResult> {
    if (!args.id) {
      return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    }
    return this.get(`${path}/${encodeURIComponent(args.id as string)}/${sub}`);
  }

  private async addToList(path: string, args: Record<string, unknown>, arrayField: string): Promise<ToolResult> {
    if (!args.id) {
      return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    }
    if (!args[arrayField] || !Array.isArray(args[arrayField])) {
      return { content: [{ type: 'text', text: `${arrayField} is required and must be an array` }], isError: true };
    }
    const response = await this.fetchWithRetry(
      `${this.baseUrl}${path}/${encodeURIComponent(args.id as string)}/ids`,
      {
        method: 'POST',
        headers: this.buildHeaders(),
        body: JSON.stringify(args[arrayField]),
      },
    );
    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}${errText ? ` — ${errText}` : ''}` }],
        isError: true,
      };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async removeFromList(path: string, args: Record<string, unknown>, itemField: string): Promise<ToolResult> {
    if (!args.id) {
      return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    }
    if (!args[itemField]) {
      return { content: [{ type: 'text', text: `${itemField} is required` }], isError: true };
    }
    const response = await this.fetchWithRetry(
      `${this.baseUrl}${path}/${encodeURIComponent(args.id as string)}/ids/${encodeURIComponent(args[itemField] as string)}`,
      {
        method: 'DELETE',
        headers: this.buildHeaders(),
      },
    );
    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}${errText ? ` — ${errText}` : ''}` }],
        isError: true,
      };
    }
    return {
      content: [{ type: 'text', text: JSON.stringify({ deleted: true, list_id: args.id, item_id: args[itemField] }) }],
      isError: false,
    };
  }

  private async listPresences(args: Record<string, unknown>): Promise<ToolResult> {
    const qs = new URLSearchParams();
    if (args.limit !== undefined) qs.set('limit', String(args.limit));
    if (args.skip !== undefined) qs.set('skip', String(args.skip));
    if (args.item_id) qs.set('item_id', args.item_id as string);
    if (args.spot_id) qs.set('spot_id', args.spot_id as string);
    const query = qs.toString();
    const url = `${this.baseUrl}/presences${query ? `?${query}` : ''}`;
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: this.buildHeaders() });
    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}${errText ? ` — ${errText}` : ''}` }],
        isError: true,
      };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listEvents(args: Record<string, unknown>): Promise<ToolResult> {
    const qs = new URLSearchParams();
    if (args.limit !== undefined) qs.set('limit', String(args.limit));
    if (args.skip !== undefined) qs.set('skip', String(args.skip));
    if (args.item_id) qs.set('item_id', args.item_id as string);
    if (args.spot_id) qs.set('spot_id', args.spot_id as string);
    const query = qs.toString();
    const url = `${this.baseUrl}/events${query ? `?${query}` : ''}`;
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: this.buildHeaders() });
    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}${errText ? ` — ${errText}` : ''}` }],
        isError: true,
      };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getSubscriptionEvents(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) {
      return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    }
    const qs = new URLSearchParams();
    if (args.limit !== undefined) qs.set('limit', String(args.limit));
    const query = qs.toString();
    const url = `${this.baseUrl}/subscriptions/${encodeURIComponent(args.id as string)}/events${query ? `?${query}` : ''}`;
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: this.buildHeaders() });
    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}${errText ? ` — ${errText}` : ''}` }],
        isError: true,
      };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }
}
