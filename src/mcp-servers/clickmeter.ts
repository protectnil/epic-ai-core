/**
 * ClickMeter MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03.
// No official ClickMeter MCP server was found on GitHub.
//
// Base URL: https://apiv2.clickmeter.com:80
// Auth: API Key — X-Clickmeter-AuthKey header.
//       Generate API keys in ClickMeter Account → Settings → API.
// Docs: https://support.clickmeter.com/hc/en-us/categories/201474986-API
// Rate limits: Not specified in OpenAPI spec; enterprise plan-based limits apply.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface ClickMeterConfig {
  apiKey: string;
  baseUrl?: string;
}

export class ClickMeterMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: ClickMeterConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? 'https://apiv2.clickmeter.com:80';
  }

  private get authHeaders(): Record<string, string> {
    return {
      'X-Clickmeter-AuthKey': this.apiKey,
      'Content-Type': 'application/json',
    };
  }

  static catalog() {
    return {
      name: 'clickmeter',
      displayName: 'ClickMeter',
      version: '1.0.0',
      category: 'marketing' as const,
      keywords: [
        'clickmeter', 'link tracking', 'url tracking', 'click tracking', 'conversions',
        'datapoints', 'groups', 'tags', 'retargeting', 'analytics', 'marketing',
        'short url', 'redirect', 'campaign tracking', 'utm', 'aggregated stats',
      ],
      toolNames: [
        'get_account', 'update_account', 'get_account_plan',
        'list_domain_whitelist', 'create_domain_whitelist', 'delete_domain_whitelist',
        'list_ip_blacklist', 'create_ip_blacklist', 'delete_ip_blacklist',
        'list_guests', 'create_guest', 'get_guest', 'update_guest', 'delete_guest',
        'get_guest_permissions',
        'get_aggregated_stats', 'list_aggregated_stats',
        'get_aggregated_summary_datapoints', 'get_aggregated_summary_groups', 'get_aggregated_summary_conversions',
        'get_clickstream', 'get_hits',
        'list_datapoints', 'create_datapoint', 'get_datapoint', 'update_datapoint', 'delete_datapoint',
        'batch_create_datapoints', 'batch_update_datapoints', 'batch_delete_datapoints',
        'get_datapoint_stats', 'list_datapoint_stats', 'get_datapoint_hits',
        'toggle_datapoint_favourite', 'update_datapoint_notes',
        'list_groups', 'create_group', 'get_group', 'update_group', 'delete_group',
        'get_group_stats', 'list_group_stats', 'get_group_summary', 'get_group_hits',
        'list_group_datapoints', 'create_group_datapoint',
        'toggle_group_favourite', 'update_group_notes',
        'list_conversions', 'create_conversion', 'get_conversion', 'update_conversion', 'delete_conversion',
        'get_conversion_stats', 'list_conversion_stats',
        'list_conversion_datapoints', 'get_conversion_hits',
        'update_conversion_notes',
        'list_tags', 'create_tag', 'get_tag', 'delete_tag', 'update_tag_name',
        'list_tag_datapoints', 'list_tag_groups',
        'associate_tag_datapoint', 'associate_tag_group',
        'delete_tag_datapoint_associations', 'delete_tag_group_associations',
        'list_domains', 'create_domain', 'get_domain', 'update_domain', 'delete_domain',
        'list_retargeting', 'create_retargeting', 'get_retargeting', 'update_retargeting', 'delete_retargeting',
        'list_retargeting_datapoints',
        'get_me', 'get_my_plan',
      ],
      description:
        'Track links, manage datapoints (tracking URLs), groups, conversions, tags, retargeting scripts, and ' +
        'retrieve aggregated click analytics via ClickMeter.',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // Account
      {
        name: 'get_account',
        description: 'Retrieve current ClickMeter account data including usage and settings.',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'update_account',
        description: 'Update current ClickMeter account settings and profile data.',
        inputSchema: {
          type: 'object',
          properties: {
            company_name: { type: 'string', description: 'Company name for the account' },
            timezone: { type: 'string', description: 'Timezone identifier (e.g. America/New_York)' },
          },
        },
      },
      {
        name: 'get_account_plan',
        description: 'Retrieve the current ClickMeter account plan and feature limits.',
        inputSchema: { type: 'object', properties: {} },
      },
      // Domain Whitelist
      {
        name: 'list_domain_whitelist',
        description: 'Retrieve all domains allowed for redirect in DDU mode.',
        inputSchema: {
          type: 'object',
          properties: {
            offset: { type: 'number', description: 'Pagination offset' },
            limit: { type: 'number', description: 'Number of results to return' },
          },
        },
      },
      {
        name: 'create_domain_whitelist',
        description: 'Add a domain to the ClickMeter DDU redirect whitelist.',
        inputSchema: {
          type: 'object',
          properties: {
            domain: { type: 'string', description: 'Domain name to whitelist (e.g. example.com)' },
          },
          required: ['domain'],
        },
      },
      {
        name: 'delete_domain_whitelist',
        description: 'Remove a domain from the DDU redirect whitelist by whitelist ID.',
        inputSchema: {
          type: 'object',
          properties: {
            whitelist_id: { type: 'string', description: 'Whitelist entry ID to delete' },
          },
          required: ['whitelist_id'],
        },
      },
      // IP Blacklist
      {
        name: 'list_ip_blacklist',
        description: 'Retrieve all IP addresses excluded from click event tracking.',
        inputSchema: {
          type: 'object',
          properties: {
            offset: { type: 'number', description: 'Pagination offset' },
            limit: { type: 'number', description: 'Number of results to return' },
          },
        },
      },
      {
        name: 'create_ip_blacklist',
        description: 'Add an IP address to the ClickMeter click-tracking blacklist.',
        inputSchema: {
          type: 'object',
          properties: {
            ip: { type: 'string', description: 'IP address or CIDR range to blacklist' },
          },
          required: ['ip'],
        },
      },
      {
        name: 'delete_ip_blacklist',
        description: 'Remove an IP address from the click-tracking blacklist by entry ID.',
        inputSchema: {
          type: 'object',
          properties: {
            blacklist_id: { type: 'string', description: 'Blacklist entry ID to delete' },
          },
          required: ['blacklist_id'],
        },
      },
      // Guests
      {
        name: 'list_guests',
        description: 'Retrieve all guest sub-users on the ClickMeter account.',
        inputSchema: {
          type: 'object',
          properties: {
            offset: { type: 'number', description: 'Pagination offset' },
            limit: { type: 'number', description: 'Number of results to return' },
          },
        },
      },
      {
        name: 'create_guest',
        description: 'Create a new guest user with limited access to the ClickMeter account.',
        inputSchema: {
          type: 'object',
          properties: {
            username: { type: 'string', description: 'Guest username (email)' },
            password: { type: 'string', description: 'Guest account password' },
            first_name: { type: 'string', description: 'Guest first name' },
            last_name: { type: 'string', description: 'Guest last name' },
          },
          required: ['username', 'password'],
        },
      },
      {
        name: 'get_guest',
        description: 'Retrieve a specific guest user by guest ID.',
        inputSchema: {
          type: 'object',
          properties: {
            guest_id: { type: 'string', description: 'Guest user ID' },
          },
          required: ['guest_id'],
        },
      },
      {
        name: 'update_guest',
        description: 'Update a guest user profile by guest ID.',
        inputSchema: {
          type: 'object',
          properties: {
            guest_id: { type: 'string', description: 'Guest user ID to update' },
            first_name: { type: 'string', description: 'Updated first name' },
            last_name: { type: 'string', description: 'Updated last name' },
          },
          required: ['guest_id'],
        },
      },
      {
        name: 'delete_guest',
        description: 'Delete a guest user by guest ID.',
        inputSchema: {
          type: 'object',
          properties: {
            guest_id: { type: 'string', description: 'Guest user ID to delete' },
          },
          required: ['guest_id'],
        },
      },
      {
        name: 'get_guest_permissions',
        description: 'Retrieve permissions granted to a specific guest user.',
        inputSchema: {
          type: 'object',
          properties: {
            guest_id: { type: 'string', description: 'Guest user ID' },
            offset: { type: 'number', description: 'Pagination offset' },
            limit: { type: 'number', description: 'Number of results to return' },
          },
          required: ['guest_id'],
        },
      },
      // Aggregated Stats
      {
        name: 'get_aggregated_stats',
        description: 'Retrieve aggregated click statistics for the account across a timeframe.',
        inputSchema: {
          type: 'object',
          properties: {
            timeframe: { type: 'string', description: 'Timeframe: today, yesterday, last7, last30, lastmonth, currentmonth, previousmonth, last90, last120, last180, custom' },
            from_day: { type: 'string', description: 'Start date in YYYYMMDD format (required for custom timeframe)' },
            to_day: { type: 'string', description: 'End date in YYYYMMDD format (required for custom timeframe)' },
          },
          required: ['timeframe'],
        },
      },
      {
        name: 'list_aggregated_stats',
        description: 'Retrieve aggregated click statistics grouped by day, week, or month for a timeframe.',
        inputSchema: {
          type: 'object',
          properties: {
            timeframe: { type: 'string', description: 'Timeframe identifier' },
            group_by: { type: 'string', description: 'Grouping: day, week, month' },
            from_day: { type: 'string', description: 'Start date YYYYMMDD (for custom timeframe)' },
            to_day: { type: 'string', description: 'End date YYYYMMDD (for custom timeframe)' },
            offset: { type: 'number', description: 'Pagination offset' },
            limit: { type: 'number', description: 'Number of results' },
          },
          required: ['timeframe'],
        },
      },
      {
        name: 'get_aggregated_summary_datapoints',
        description: 'Retrieve aggregated statistics for a subset of datapoints with performance summary.',
        inputSchema: {
          type: 'object',
          properties: {
            timeframe: { type: 'string', description: 'Timeframe identifier' },
            type: { type: 'string', description: 'Datapoint type filter: tl (tracking link) or tp (tracking pixel)' },
            from_day: { type: 'string', description: 'Start date YYYYMMDD (for custom timeframe)' },
            to_day: { type: 'string', description: 'End date YYYYMMDD (for custom timeframe)' },
            offset: { type: 'number', description: 'Pagination offset' },
            limit: { type: 'number', description: 'Number of results' },
          },
          required: ['timeframe'],
        },
      },
      {
        name: 'get_aggregated_summary_groups',
        description: 'Retrieve aggregated statistics for a subset of groups with performance summary.',
        inputSchema: {
          type: 'object',
          properties: {
            timeframe: { type: 'string', description: 'Timeframe identifier' },
            from_day: { type: 'string', description: 'Start date YYYYMMDD (for custom timeframe)' },
            to_day: { type: 'string', description: 'End date YYYYMMDD (for custom timeframe)' },
            offset: { type: 'number', description: 'Pagination offset' },
            limit: { type: 'number', description: 'Number of results' },
          },
          required: ['timeframe'],
        },
      },
      {
        name: 'get_aggregated_summary_conversions',
        description: 'Retrieve aggregated statistics for a subset of conversions with performance summary.',
        inputSchema: {
          type: 'object',
          properties: {
            timeframe: { type: 'string', description: 'Timeframe identifier' },
            from_day: { type: 'string', description: 'Start date YYYYMMDD (for custom timeframe)' },
            to_day: { type: 'string', description: 'End date YYYYMMDD (for custom timeframe)' },
            offset: { type: 'number', description: 'Pagination offset' },
            limit: { type: 'number', description: 'Number of results' },
          },
          required: ['timeframe'],
        },
      },
      // Events
      {
        name: 'get_clickstream',
        description: 'Retrieve the latest 100 click events for the account.',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'get_hits',
        description: 'Retrieve the full list of click events for the account with pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            timeframe: { type: 'string', description: 'Timeframe identifier' },
            from_day: { type: 'string', description: 'Start date YYYYMMDD' },
            to_day: { type: 'string', description: 'End date YYYYMMDD' },
            offset: { type: 'number', description: 'Pagination offset' },
            limit: { type: 'number', description: 'Number of results' },
          },
        },
      },
      // Datapoints
      {
        name: 'list_datapoints',
        description: 'List all tracking datapoints (links and pixels) associated with the account.',
        inputSchema: {
          type: 'object',
          properties: {
            offset: { type: 'number', description: 'Pagination offset' },
            limit: { type: 'number', description: 'Number of results to return' },
            type: { type: 'string', description: 'Filter by type: tl (tracking link) or tp (tracking pixel)' },
            status: { type: 'string', description: 'Filter by status: active, paused, deleted' },
            tags: { type: 'string', description: 'Comma-separated tag IDs to filter by' },
            text_search: { type: 'string', description: 'Text search across datapoint names and URLs' },
            favourite: { type: 'boolean', description: 'Filter to only favourite datapoints' },
          },
        },
      },
      {
        name: 'create_datapoint',
        description: 'Create a new tracking datapoint (tracking link or pixel) in ClickMeter.',
        inputSchema: {
          type: 'object',
          properties: {
            type: { type: 'string', description: 'Datapoint type: tl (tracking link) or tp (tracking pixel)' },
            title: { type: 'string', description: 'Descriptive title for the datapoint' },
            url: { type: 'string', description: 'Destination URL to track' },
            group_id: { type: 'number', description: 'Group ID to assign this datapoint to (optional)' },
            notes: { type: 'string', description: 'Optional notes about this datapoint' },
          },
          required: ['type', 'url'],
        },
      },
      {
        name: 'get_datapoint',
        description: 'Get details of a specific tracking datapoint by ID.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Datapoint ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'update_datapoint',
        description: 'Update an existing tracking datapoint by ID.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Datapoint ID to update' },
            title: { type: 'string', description: 'Updated title' },
            url: { type: 'string', description: 'Updated destination URL' },
            notes: { type: 'string', description: 'Updated notes' },
          },
          required: ['id'],
        },
      },
      {
        name: 'delete_datapoint',
        description: 'Delete a specific tracking datapoint by ID.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Datapoint ID to delete' },
          },
          required: ['id'],
        },
      },
      {
        name: 'batch_create_datapoints',
        description: 'Create multiple tracking datapoints in a single batch request.',
        inputSchema: {
          type: 'object',
          properties: {
            datapoints: {
              type: 'array',
              description: 'Array of datapoint objects each with type and url',
              items: { type: 'object' },
            },
          },
          required: ['datapoints'],
        },
      },
      {
        name: 'batch_update_datapoints',
        description: 'Update multiple tracking datapoints in a single batch request.',
        inputSchema: {
          type: 'object',
          properties: {
            datapoints: {
              type: 'array',
              description: 'Array of datapoint objects each with id and fields to update',
              items: { type: 'object' },
            },
          },
          required: ['datapoints'],
        },
      },
      {
        name: 'batch_delete_datapoints',
        description: 'Delete multiple tracking datapoints in a single batch request.',
        inputSchema: {
          type: 'object',
          properties: {
            ids: {
              type: 'array',
              description: 'Array of datapoint IDs to delete',
              items: { type: 'string' },
            },
          },
          required: ['ids'],
        },
      },
      {
        name: 'get_datapoint_stats',
        description: 'Retrieve click statistics for a specific datapoint over a timeframe.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Datapoint ID' },
            timeframe: { type: 'string', description: 'Timeframe identifier' },
            from_day: { type: 'string', description: 'Start date YYYYMMDD' },
            to_day: { type: 'string', description: 'End date YYYYMMDD' },
          },
          required: ['id', 'timeframe'],
        },
      },
      {
        name: 'list_datapoint_stats',
        description: 'Retrieve click statistics for a datapoint grouped by temporal entity.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Datapoint ID' },
            timeframe: { type: 'string', description: 'Timeframe identifier' },
            group_by: { type: 'string', description: 'Grouping: day, week, month' },
            from_day: { type: 'string', description: 'Start date YYYYMMDD' },
            to_day: { type: 'string', description: 'End date YYYYMMDD' },
            offset: { type: 'number', description: 'Pagination offset' },
            limit: { type: 'number', description: 'Number of results' },
          },
          required: ['id', 'timeframe'],
        },
      },
      {
        name: 'get_datapoint_hits',
        description: 'Retrieve the list of individual click events for a specific datapoint.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Datapoint ID' },
            timeframe: { type: 'string', description: 'Timeframe identifier' },
            from_day: { type: 'string', description: 'Start date YYYYMMDD' },
            to_day: { type: 'string', description: 'End date YYYYMMDD' },
            offset: { type: 'number', description: 'Pagination offset' },
            limit: { type: 'number', description: 'Number of results' },
          },
          required: ['id'],
        },
      },
      {
        name: 'toggle_datapoint_favourite',
        description: 'Toggle the favourite flag on a specific datapoint.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Datapoint ID to toggle favourite' },
          },
          required: ['id'],
        },
      },
      {
        name: 'update_datapoint_notes',
        description: 'Update the notes field on a specific datapoint.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Datapoint ID' },
            notes: { type: 'string', description: 'New notes text for this datapoint' },
          },
          required: ['id', 'notes'],
        },
      },
      // Groups
      {
        name: 'list_groups',
        description: 'List all datapoint groups associated with the account.',
        inputSchema: {
          type: 'object',
          properties: {
            offset: { type: 'number', description: 'Pagination offset' },
            limit: { type: 'number', description: 'Number of results to return' },
            status: { type: 'string', description: 'Filter by status: active, deleted' },
            tags: { type: 'string', description: 'Comma-separated tag IDs to filter by' },
            text_search: { type: 'string', description: 'Text search across group names' },
            favourite: { type: 'boolean', description: 'Filter to only favourite groups' },
          },
        },
      },
      {
        name: 'create_group',
        description: 'Create a new group to organize tracking datapoints in ClickMeter.',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Group name' },
            notes: { type: 'string', description: 'Optional notes for this group' },
          },
          required: ['name'],
        },
      },
      {
        name: 'get_group',
        description: 'Get details of a specific group by group ID.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Group ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'update_group',
        description: 'Update an existing group by ID.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Group ID to update' },
            name: { type: 'string', description: 'Updated group name' },
            notes: { type: 'string', description: 'Updated notes' },
          },
          required: ['id'],
        },
      },
      {
        name: 'delete_group',
        description: 'Delete a specific group by group ID.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Group ID to delete' },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_group_stats',
        description: 'Retrieve click statistics for a specific group over a timeframe.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Group ID' },
            timeframe: { type: 'string', description: 'Timeframe identifier' },
            from_day: { type: 'string', description: 'Start date YYYYMMDD' },
            to_day: { type: 'string', description: 'End date YYYYMMDD' },
          },
          required: ['id', 'timeframe'],
        },
      },
      {
        name: 'list_group_stats',
        description: 'Retrieve click statistics for a group grouped by temporal entity.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Group ID' },
            timeframe: { type: 'string', description: 'Timeframe identifier' },
            group_by: { type: 'string', description: 'Grouping: day, week, month' },
            from_day: { type: 'string', description: 'Start date YYYYMMDD' },
            to_day: { type: 'string', description: 'End date YYYYMMDD' },
            offset: { type: 'number', description: 'Pagination offset' },
            limit: { type: 'number', description: 'Number of results' },
          },
          required: ['id', 'timeframe'],
        },
      },
      {
        name: 'get_group_summary',
        description: 'Retrieve summary statistics for all datapoints within a group.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Group ID' },
            timeframe: { type: 'string', description: 'Timeframe identifier' },
            from_day: { type: 'string', description: 'Start date YYYYMMDD' },
            to_day: { type: 'string', description: 'End date YYYYMMDD' },
            offset: { type: 'number', description: 'Pagination offset' },
            limit: { type: 'number', description: 'Number of results' },
          },
          required: ['id', 'timeframe'],
        },
      },
      {
        name: 'get_group_hits',
        description: 'Retrieve individual click events for a specific group.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Group ID' },
            timeframe: { type: 'string', description: 'Timeframe identifier' },
            from_day: { type: 'string', description: 'Start date YYYYMMDD' },
            to_day: { type: 'string', description: 'End date YYYYMMDD' },
            offset: { type: 'number', description: 'Pagination offset' },
            limit: { type: 'number', description: 'Number of results' },
          },
          required: ['id'],
        },
      },
      {
        name: 'list_group_datapoints',
        description: 'List all datapoints within a specific group.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Group ID' },
            offset: { type: 'number', description: 'Pagination offset' },
            limit: { type: 'number', description: 'Number of results to return' },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_group_datapoint',
        description: 'Create a new datapoint directly within a specific group.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Group ID to create the datapoint in' },
            type: { type: 'string', description: 'Datapoint type: tl (tracking link) or tp (tracking pixel)' },
            url: { type: 'string', description: 'Destination URL to track' },
            title: { type: 'string', description: 'Descriptive title' },
          },
          required: ['id', 'type', 'url'],
        },
      },
      {
        name: 'toggle_group_favourite',
        description: 'Toggle the favourite flag on a specific group.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Group ID to toggle favourite' },
          },
          required: ['id'],
        },
      },
      {
        name: 'update_group_notes',
        description: 'Update the notes field on a specific group.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Group ID' },
            notes: { type: 'string', description: 'New notes text for this group' },
          },
          required: ['id', 'notes'],
        },
      },
      // Conversions
      {
        name: 'list_conversions',
        description: 'List all conversion tracking events configured in the account.',
        inputSchema: {
          type: 'object',
          properties: {
            offset: { type: 'number', description: 'Pagination offset' },
            limit: { type: 'number', description: 'Number of results to return' },
            status: { type: 'string', description: 'Filter by status: active, deleted' },
            text_search: { type: 'string', description: 'Text search across conversion names' },
          },
        },
      },
      {
        name: 'create_conversion',
        description: 'Create a new conversion tracking event in ClickMeter.',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Conversion event name' },
            value: { type: 'number', description: 'Monetary value per conversion (optional)' },
            notes: { type: 'string', description: 'Optional notes about this conversion' },
          },
          required: ['name'],
        },
      },
      {
        name: 'get_conversion',
        description: 'Retrieve a specific conversion by conversion ID.',
        inputSchema: {
          type: 'object',
          properties: {
            conversion_id: { type: 'string', description: 'Conversion ID' },
          },
          required: ['conversion_id'],
        },
      },
      {
        name: 'update_conversion',
        description: 'Update an existing conversion tracking event by conversion ID.',
        inputSchema: {
          type: 'object',
          properties: {
            conversion_id: { type: 'string', description: 'Conversion ID to update' },
            name: { type: 'string', description: 'Updated conversion name' },
            value: { type: 'number', description: 'Updated monetary value per conversion' },
          },
          required: ['conversion_id'],
        },
      },
      {
        name: 'delete_conversion',
        description: 'Delete a conversion tracking event by conversion ID.',
        inputSchema: {
          type: 'object',
          properties: {
            conversion_id: { type: 'string', description: 'Conversion ID to delete' },
          },
          required: ['conversion_id'],
        },
      },
      {
        name: 'get_conversion_stats',
        description: 'Retrieve click and conversion statistics for a specific conversion.',
        inputSchema: {
          type: 'object',
          properties: {
            conversion_id: { type: 'string', description: 'Conversion ID' },
            timeframe: { type: 'string', description: 'Timeframe identifier' },
            from_day: { type: 'string', description: 'Start date YYYYMMDD' },
            to_day: { type: 'string', description: 'End date YYYYMMDD' },
          },
          required: ['conversion_id', 'timeframe'],
        },
      },
      {
        name: 'list_conversion_stats',
        description: 'Retrieve conversion statistics grouped by temporal entity.',
        inputSchema: {
          type: 'object',
          properties: {
            conversion_id: { type: 'string', description: 'Conversion ID' },
            timeframe: { type: 'string', description: 'Timeframe identifier' },
            group_by: { type: 'string', description: 'Grouping: day, week, month' },
            from_day: { type: 'string', description: 'Start date YYYYMMDD' },
            to_day: { type: 'string', description: 'End date YYYYMMDD' },
            offset: { type: 'number', description: 'Pagination offset' },
            limit: { type: 'number', description: 'Number of results' },
          },
          required: ['conversion_id', 'timeframe'],
        },
      },
      {
        name: 'list_conversion_datapoints',
        description: 'Retrieve datapoints associated with a specific conversion.',
        inputSchema: {
          type: 'object',
          properties: {
            conversion_id: { type: 'string', description: 'Conversion ID' },
            offset: { type: 'number', description: 'Pagination offset' },
            limit: { type: 'number', description: 'Number of results' },
          },
          required: ['conversion_id'],
        },
      },
      {
        name: 'get_conversion_hits',
        description: 'Retrieve individual click events related to a specific conversion.',
        inputSchema: {
          type: 'object',
          properties: {
            conversion_id: { type: 'string', description: 'Conversion ID' },
            timeframe: { type: 'string', description: 'Timeframe identifier' },
            from_day: { type: 'string', description: 'Start date YYYYMMDD' },
            to_day: { type: 'string', description: 'End date YYYYMMDD' },
            offset: { type: 'number', description: 'Pagination offset' },
            limit: { type: 'number', description: 'Number of results' },
          },
          required: ['conversion_id'],
        },
      },
      {
        name: 'update_conversion_notes',
        description: 'Update the notes field on a specific conversion.',
        inputSchema: {
          type: 'object',
          properties: {
            conversion_id: { type: 'string', description: 'Conversion ID' },
            notes: { type: 'string', description: 'New notes text for this conversion' },
          },
          required: ['conversion_id', 'notes'],
        },
      },
      // Tags
      {
        name: 'list_tags',
        description: 'List all tags associated with the ClickMeter account.',
        inputSchema: {
          type: 'object',
          properties: {
            offset: { type: 'number', description: 'Pagination offset' },
            limit: { type: 'number', description: 'Number of results to return' },
          },
        },
      },
      {
        name: 'create_tag',
        description: 'Create a new tag for organizing datapoints and groups.',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Tag name' },
            data_points: {
              type: 'array',
              description: 'Optional array of datapoint IDs to associate with this tag',
              items: { type: 'string' },
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'get_tag',
        description: 'Retrieve a specific tag by tag ID.',
        inputSchema: {
          type: 'object',
          properties: {
            tag_id: { type: 'string', description: 'Tag ID' },
          },
          required: ['tag_id'],
        },
      },
      {
        name: 'delete_tag',
        description: 'Delete a specific tag by tag ID.',
        inputSchema: {
          type: 'object',
          properties: {
            tag_id: { type: 'string', description: 'Tag ID to delete' },
          },
          required: ['tag_id'],
        },
      },
      {
        name: 'update_tag_name',
        description: 'Quickly update the name of a specific tag.',
        inputSchema: {
          type: 'object',
          properties: {
            tag_id: { type: 'string', description: 'Tag ID to rename' },
            name: { type: 'string', description: 'New tag name' },
          },
          required: ['tag_id', 'name'],
        },
      },
      {
        name: 'list_tag_datapoints',
        description: 'List all datapoints associated with a specific tag.',
        inputSchema: {
          type: 'object',
          properties: {
            tag_id: { type: 'string', description: 'Tag ID' },
            offset: { type: 'number', description: 'Pagination offset' },
            limit: { type: 'number', description: 'Number of results' },
          },
          required: ['tag_id'],
        },
      },
      {
        name: 'list_tag_groups',
        description: 'List all groups associated with a specific tag.',
        inputSchema: {
          type: 'object',
          properties: {
            tag_id: { type: 'string', description: 'Tag ID' },
            offset: { type: 'number', description: 'Pagination offset' },
            limit: { type: 'number', description: 'Number of results' },
          },
          required: ['tag_id'],
        },
      },
      {
        name: 'associate_tag_datapoint',
        description: 'Associate or disassociate a tag with a specific datapoint.',
        inputSchema: {
          type: 'object',
          properties: {
            tag_id: { type: 'string', description: 'Tag ID' },
            datapoint_id: { type: 'string', description: 'Datapoint ID to associate' },
            action: { type: 'string', description: 'Action: associate or deassociate' },
          },
          required: ['tag_id', 'datapoint_id', 'action'],
        },
      },
      {
        name: 'associate_tag_group',
        description: 'Associate or disassociate a tag with a specific group.',
        inputSchema: {
          type: 'object',
          properties: {
            tag_id: { type: 'string', description: 'Tag ID' },
            group_id: { type: 'string', description: 'Group ID to associate' },
            action: { type: 'string', description: 'Action: associate or deassociate' },
          },
          required: ['tag_id', 'group_id', 'action'],
        },
      },
      {
        name: 'delete_tag_datapoint_associations',
        description: 'Remove all datapoint associations from a specific tag.',
        inputSchema: {
          type: 'object',
          properties: {
            tag_id: { type: 'string', description: 'Tag ID to clear datapoint associations from' },
          },
          required: ['tag_id'],
        },
      },
      {
        name: 'delete_tag_group_associations',
        description: 'Remove all group associations from a specific tag.',
        inputSchema: {
          type: 'object',
          properties: {
            tag_id: { type: 'string', description: 'Tag ID to clear group associations from' },
          },
          required: ['tag_id'],
        },
      },
      // Domains
      {
        name: 'list_domains',
        description: 'Retrieve a list of custom domains configured in ClickMeter.',
        inputSchema: {
          type: 'object',
          properties: {
            offset: { type: 'number', description: 'Pagination offset' },
            limit: { type: 'number', description: 'Number of results to return' },
          },
        },
      },
      {
        name: 'create_domain',
        description: 'Add a new custom domain for use with tracking links in ClickMeter.',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Custom domain name (e.g. track.example.com)' },
            home_page: { type: 'string', description: 'URL to redirect to when visiting the domain root' },
          },
          required: ['name'],
        },
      },
      {
        name: 'get_domain',
        description: 'Get details of a specific custom domain by domain ID.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Domain ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'update_domain',
        description: 'Update an existing custom domain configuration by domain ID.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Domain ID to update' },
            name: { type: 'string', description: 'Updated domain name' },
            home_page: { type: 'string', description: 'Updated home page redirect URL' },
          },
          required: ['id'],
        },
      },
      {
        name: 'delete_domain',
        description: 'Delete a custom domain by domain ID.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Domain ID to delete' },
          },
          required: ['id'],
        },
      },
      // Retargeting
      {
        name: 'list_retargeting',
        description: 'List all retargeting pixel scripts associated with the account.',
        inputSchema: {
          type: 'object',
          properties: {
            offset: { type: 'number', description: 'Pagination offset' },
            limit: { type: 'number', description: 'Number of results to return' },
          },
        },
      },
      {
        name: 'create_retargeting',
        description: 'Create a new retargeting pixel script in ClickMeter.',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Retargeting script name' },
            script: { type: 'string', description: 'Retargeting pixel code or script content' },
          },
          required: ['name', 'script'],
        },
      },
      {
        name: 'get_retargeting',
        description: 'Get a specific retargeting script by retargeting ID.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Retargeting script ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'update_retargeting',
        description: 'Update an existing retargeting script by ID.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Retargeting script ID to update' },
            name: { type: 'string', description: 'Updated name' },
            script: { type: 'string', description: 'Updated script content' },
          },
          required: ['id'],
        },
      },
      {
        name: 'delete_retargeting',
        description: 'Delete a retargeting script and remove all its associations.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Retargeting script ID to delete' },
          },
          required: ['id'],
        },
      },
      {
        name: 'list_retargeting_datapoints',
        description: 'List all datapoints associated with a specific retargeting script.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Retargeting script ID' },
            offset: { type: 'number', description: 'Pagination offset' },
            limit: { type: 'number', description: 'Number of results to return' },
          },
          required: ['id'],
        },
      },
      // Me shortcuts
      {
        name: 'get_me',
        description: 'Retrieve current authenticated user data (alias for get_account).',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'get_my_plan',
        description: 'Retrieve the current user account plan details.',
        inputSchema: { type: 'object', properties: {} },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_account': return await this.request('GET', '/account');
        case 'update_account': return await this.request('POST', '/account', args);
        case 'get_account_plan': return await this.request('GET', '/account/plan');
        case 'list_domain_whitelist': return await this.request('GET', '/account/domainwhitelist', undefined, this.offsetParams(args));
        case 'create_domain_whitelist': return await this.request('POST', '/account/domainwhitelist', args);
        case 'delete_domain_whitelist': return await this.request('DELETE', `/account/domainwhitelist/${args.whitelist_id}`);
        case 'list_ip_blacklist': return await this.request('GET', '/account/ipblacklist', undefined, this.offsetParams(args));
        case 'create_ip_blacklist': return await this.request('POST', '/account/ipblacklist', args);
        case 'delete_ip_blacklist': return await this.request('DELETE', `/account/ipblacklist/${args.blacklist_id}`);
        case 'list_guests': return await this.request('GET', '/account/guests', undefined, this.offsetParams(args));
        case 'create_guest': return await this.request('POST', '/account/guests', args);
        case 'get_guest': return await this.request('GET', `/account/guests/${args.guest_id}`);
        case 'update_guest': return await this.updateGuest(args);
        case 'delete_guest': return await this.request('DELETE', `/account/guests/${args.guest_id}`);
        case 'get_guest_permissions': return await this.getGuestPermissions(args);
        case 'get_aggregated_stats': return await this.request('GET', '/aggregated', undefined, this.statsParams(args));
        case 'list_aggregated_stats': return await this.request('GET', '/aggregated/list', undefined, this.statsParams(args));
        case 'get_aggregated_summary_datapoints': return await this.request('GET', '/aggregated/summary/datapoints', undefined, this.statsParams(args));
        case 'get_aggregated_summary_groups': return await this.request('GET', '/aggregated/summary/groups', undefined, this.statsParams(args));
        case 'get_aggregated_summary_conversions': return await this.request('GET', '/aggregated/summary/conversions', undefined, this.statsParams(args));
        case 'get_clickstream': return await this.request('GET', '/clickstream');
        case 'get_hits': return await this.request('GET', '/hits', undefined, this.statsParams(args));
        case 'list_datapoints': return await this.listDatapoints(args);
        case 'create_datapoint': return await this.request('POST', '/datapoints', args);
        case 'get_datapoint': return await this.request('GET', `/datapoints/${args.id}`);
        case 'update_datapoint': return await this.updateItem(args, '/datapoints');
        case 'delete_datapoint': return await this.request('DELETE', `/datapoints/${args.id}`);
        case 'batch_create_datapoints': return await this.request('PUT', '/datapoints/batch', { list: args.datapoints });
        case 'batch_update_datapoints': return await this.request('POST', '/datapoints/batch', { list: args.datapoints });
        case 'batch_delete_datapoints': return await this.request('DELETE', '/datapoints/batch', { list: args.ids });
        case 'get_datapoint_stats': return await this.request('GET', `/datapoints/${args.id}/aggregated`, undefined, this.statsParams(args));
        case 'list_datapoint_stats': return await this.request('GET', `/datapoints/${args.id}/aggregated/list`, undefined, this.statsParams(args));
        case 'get_datapoint_hits': return await this.request('GET', `/datapoints/${args.id}/hits`, undefined, this.statsParams(args));
        case 'toggle_datapoint_favourite': return await this.request('PUT', `/datapoints/${args.id}/favourite`);
        case 'update_datapoint_notes': return await this.request('PUT', `/datapoints/${args.id}/notes`, { notes: args.notes });
        case 'list_groups': return await this.listGroups(args);
        case 'create_group': return await this.request('POST', '/groups', args);
        case 'get_group': return await this.request('GET', `/groups/${args.id}`);
        case 'update_group': return await this.updateItem(args, '/groups');
        case 'delete_group': return await this.request('DELETE', `/groups/${args.id}`);
        case 'get_group_stats': return await this.request('GET', `/groups/${args.id}/aggregated`, undefined, this.statsParams(args));
        case 'list_group_stats': return await this.request('GET', `/groups/${args.id}/aggregated/list`, undefined, this.statsParams(args));
        case 'get_group_summary': return await this.request('GET', `/groups/${args.id}/aggregated/summary`, undefined, this.statsParams(args));
        case 'get_group_hits': return await this.request('GET', `/groups/${args.id}/hits`, undefined, this.statsParams(args));
        case 'list_group_datapoints': return await this.request('GET', `/groups/${args.id}/datapoints`, undefined, this.offsetParams(args));
        case 'create_group_datapoint': return await this.createGroupDatapoint(args);
        case 'toggle_group_favourite': return await this.request('PUT', `/groups/${args.id}/favourite`);
        case 'update_group_notes': return await this.request('PUT', `/groups/${args.id}/notes`, { notes: args.notes });
        case 'list_conversions': return await this.listConversions(args);
        case 'create_conversion': return await this.request('POST', '/conversions', args);
        case 'get_conversion': return await this.request('GET', `/conversions/${args.conversion_id}`);
        case 'update_conversion': return await this.updateConversion(args);
        case 'delete_conversion': return await this.request('DELETE', `/conversions/${args.conversion_id}`);
        case 'get_conversion_stats': return await this.request('GET', `/conversions/${args.conversion_id}/aggregated`, undefined, this.statsParams(args));
        case 'list_conversion_stats': return await this.request('GET', `/conversions/${args.conversion_id}/aggregated/list`, undefined, this.statsParams(args));
        case 'list_conversion_datapoints': return await this.request('GET', `/conversions/${args.conversion_id}/datapoints`, undefined, this.offsetParams(args));
        case 'get_conversion_hits': return await this.request('GET', `/conversions/${args.conversion_id}/hits`, undefined, this.statsParams(args));
        case 'update_conversion_notes': return await this.request('PUT', `/conversions/${args.conversion_id}/notes`, { notes: args.notes });
        case 'list_tags': return await this.request('GET', '/tags', undefined, this.offsetParams(args));
        case 'create_tag': return await this.request('POST', '/tags', args);
        case 'get_tag': return await this.request('GET', `/tags/${args.tag_id}`);
        case 'delete_tag': return await this.request('DELETE', `/tags/${args.tag_id}`);
        case 'update_tag_name': return await this.request('PUT', `/tags/${args.tag_id}/name`, { name: args.name });
        case 'list_tag_datapoints': return await this.request('GET', `/tags/${args.tag_id}/datapoints`, undefined, this.offsetParams(args));
        case 'list_tag_groups': return await this.request('GET', `/tags/${args.tag_id}/groups`, undefined, this.offsetParams(args));
        case 'associate_tag_datapoint': return await this.request('PUT', `/tags/${args.tag_id}/datapoints/patch`, args);
        case 'associate_tag_group': return await this.request('PUT', `/tags/${args.tag_id}/groups/patch`, args);
        case 'delete_tag_datapoint_associations': return await this.request('DELETE', `/tags/${args.tag_id}/datapoints`);
        case 'delete_tag_group_associations': return await this.request('DELETE', `/tags/${args.tag_id}/groups`);
        case 'list_domains': return await this.request('GET', '/domains', undefined, this.offsetParams(args));
        case 'create_domain': return await this.request('POST', '/domains', args);
        case 'get_domain': return await this.request('GET', `/domains/${args.id}`);
        case 'update_domain': return await this.updateItem(args, '/domains');
        case 'delete_domain': return await this.request('DELETE', `/domains/${args.id}`);
        case 'list_retargeting': return await this.request('GET', '/retargeting', undefined, this.offsetParams(args));
        case 'create_retargeting': return await this.request('POST', '/retargeting', args);
        case 'get_retargeting': return await this.request('GET', `/retargeting/${args.id}`);
        case 'update_retargeting': return await this.updateItem(args, '/retargeting');
        case 'delete_retargeting': return await this.request('DELETE', `/retargeting/${args.id}`);
        case 'list_retargeting_datapoints': return await this.request('GET', `/retargeting/${args.id}/datapoints`, undefined, this.offsetParams(args));
        case 'get_me': return await this.request('GET', '/me');
        case 'get_my_plan': return await this.request('GET', '/me/plan');
        default:
          return {
            content: [{ type: 'text', text: `Unknown tool: ${name}` }],
            isError: true,
          };
      }
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }

  private offsetParams(args: Record<string, unknown>): URLSearchParams | undefined {
    const params = new URLSearchParams();
    if (args.offset !== undefined) params.set('offset', String(args.offset as number));
    if (args.limit !== undefined) params.set('limit', String(args.limit as number));
    return params.toString() ? params : undefined;
  }

  private statsParams(args: Record<string, unknown>): URLSearchParams | undefined {
    const params = new URLSearchParams();
    if (args.timeframe) params.set('timeframe', args.timeframe as string);
    if (args.from_day) params.set('fromDay', args.from_day as string);
    if (args.to_day) params.set('toDay', args.to_day as string);
    if (args.group_by) params.set('groupBy', args.group_by as string);
    if (args.type) params.set('type', args.type as string);
    if (args.status) params.set('status', args.status as string);
    if (args.offset !== undefined) params.set('offset', String(args.offset as number));
    if (args.limit !== undefined) params.set('limit', String(args.limit as number));
    return params.toString() ? params : undefined;
  }

  private async request(
    method: string,
    path: string,
    body?: Record<string, unknown>,
    params?: URLSearchParams,
  ): Promise<ToolResult> {
    const qs = params && params.toString() ? `?${params.toString()}` : '';
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}${qs}`, {
      method,
      headers: this.authHeaders,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (response.status === 204) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ status: 204, message: 'Success (no content)' }) }],
        isError: false,
      };
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      const txt = await response.text().catch(() => '');
      return {
        content: [{ type: 'text', text: this.truncate(txt || JSON.stringify({ status: response.status })) }],
        isError: !response.ok,
      };
    }

    if (!response.ok) {
      return {
        content: [
          {
            type: 'text',
            text: `ClickMeter API error ${response.status}: ${this.truncate(JSON.stringify(data))}`,
          },
        ],
        isError: true,
      };
    }

    return {
      content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }],
      isError: false,
    };
  }

  private async updateGuest(args: Record<string, unknown>): Promise<ToolResult> {
    const { guest_id, ...rest } = args;
    return this.request('POST', `/account/guests/${guest_id}`, rest);
  }

  private async getGuestPermissions(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.offsetParams(args);
    return this.request('GET', `/account/guests/${args.guest_id}/permissions`, undefined, params);
  }

  private async listDatapoints(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.offset !== undefined) params.set('offset', String(args.offset as number));
    if (args.limit !== undefined) params.set('limit', String(args.limit as number));
    if (args.type) params.set('type', args.type as string);
    if (args.status) params.set('status', args.status as string);
    if (args.tags) params.set('tags', args.tags as string);
    if (args.text_search) params.set('textSearch', args.text_search as string);
    if (args.favourite !== undefined) params.set('favourite', String(args.favourite as boolean));
    return this.request('GET', '/datapoints', undefined, params.toString() ? params : undefined);
  }

  private async updateItem(args: Record<string, unknown>, basePath: string): Promise<ToolResult> {
    const { id, ...rest } = args;
    return this.request('POST', `${basePath}/${id}`, rest);
  }

  private async listGroups(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.offset !== undefined) params.set('offset', String(args.offset as number));
    if (args.limit !== undefined) params.set('limit', String(args.limit as number));
    if (args.status) params.set('status', args.status as string);
    if (args.tags) params.set('tags', args.tags as string);
    if (args.text_search) params.set('textSearch', args.text_search as string);
    if (args.favourite !== undefined) params.set('favourite', String(args.favourite as boolean));
    return this.request('GET', '/groups', undefined, params.toString() ? params : undefined);
  }

  private async createGroupDatapoint(args: Record<string, unknown>): Promise<ToolResult> {
    const { id, ...rest } = args;
    return this.request('POST', `/groups/${id}/datapoints`, rest);
  }

  private async listConversions(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.offset !== undefined) params.set('offset', String(args.offset as number));
    if (args.limit !== undefined) params.set('limit', String(args.limit as number));
    if (args.status) params.set('status', args.status as string);
    if (args.text_search) params.set('textSearch', args.text_search as string);
    return this.request('GET', '/conversions', undefined, params.toString() ? params : undefined);
  }

  private async updateConversion(args: Record<string, unknown>): Promise<ToolResult> {
    const { conversion_id, ...rest } = args;
    return this.request('POST', `/conversions/${conversion_id}`, rest);
  }
}
