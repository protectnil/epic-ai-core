/**
 * Bungie.Net MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28. Bungie (the company) has not published an official MCP server.
// Community MCP: None found. No community MCP server for the Bungie.Net API exists on GitHub or npm.
// Our adapter covers: 20 tools (manifest, entity definition, player search, linked profiles, profile, character,
//   item, entity search, activity history, PGCR, historical stats, unique weapons, aggregate activity stats,
//   public milestones, public vendors, clan weekly rewards, clan aggregate stats, group, group members,
//   groups for member).
// Recommendation: use-rest-api — no official or community Bungie MCP exists. Our adapter provides full coverage.
//
// Base URL: https://www.bungie.net/Platform
// Auth: X-API-Key header required on ALL requests. Register at https://www.bungie.net/en/Application.
//       OAuth2 (authorizationCode) required for write operations and authenticated reads (inventory, vault, etc).
//       Token endpoint: POST https://www.bungie.net/Platform/App/OAuth/token/
// Docs: https://bungie-net.github.io/multi/index.html
// Rate limits: ~250 requests/10 seconds per API key. Some endpoints require elevated OAuth scopes.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface BungieConfig {
  apiKey: string;
  /** Optional OAuth2 Bearer token for authenticated endpoints (inventory, vault, etc.) */
  accessToken?: string;
  /** Optional base URL override (default: https://www.bungie.net/Platform) */
  baseUrl?: string;
}

export class BungieMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly accessToken: string | undefined;
  private readonly baseUrl: string;

  constructor(config: BungieConfig) {
    super();
    this.apiKey = config.apiKey;
    this.accessToken = config.accessToken;
    this.baseUrl = config.baseUrl ?? 'https://www.bungie.net/Platform';
  }

  static catalog() {
    return {
      name: 'bungie',
      displayName: 'Bungie.Net',
      version: '1.0.0',
      category: 'gaming' as const,
      keywords: [
        'bungie', 'destiny', 'destiny2', 'halo', 'gaming', 'fps', 'shooter',
        'clan', 'fireteam', 'guardian', 'character', 'inventory', 'vault',
        'raid', 'pvp', 'pve', 'strike', 'dungeon', 'manifest', 'milestone',
        'activity', 'pgcr', 'carnage', 'leaderboard', 'stats', 'weapons',
      ],
      toolNames: [
        'get_destiny_manifest',
        'get_destiny_entity_definition',
        'search_destiny_player',
        'get_linked_profiles',
        'get_profile',
        'get_character',
        'get_item',
        'search_destiny_entities',
        'get_activity_history',
        'get_post_game_carnage_report',
        'get_historical_stats',
        'get_unique_weapon_history',
        'get_aggregate_activity_stats',
        'get_public_milestones',
        'get_public_vendors',
        'get_clan_weekly_reward_state',
        'get_clan_aggregate_stats',
        'get_group',
        'get_members_of_group',
        'get_groups_for_member',
      ],
      description: 'Bungie.Net API for Destiny 2: player profiles, characters, inventory, activity history, post-game carnage reports, milestones, vendors, clans/groups, leaderboards, and the game manifest.',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_destiny_manifest',
        description: 'Get the current version of the Destiny 2 manifest — includes URLs for all definition databases (items, activities, vendors, etc.)',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_destiny_entity_definition',
        description: 'Get the static definition for a Destiny entity by type and hash (e.g. DestinyInventoryItemDefinition, DestinyActivityDefinition)',
        inputSchema: {
          type: 'object',
          properties: {
            entity_type: {
              type: 'string',
              description: 'The type of entity definition (e.g. DestinyInventoryItemDefinition, DestinyActivityDefinition, DestinyClassDefinition)',
            },
            hash_identifier: {
              type: 'number',
              description: 'The hash identifier of the entity to look up',
            },
          },
          required: ['entity_type', 'hash_identifier'],
        },
      },
      {
        name: 'search_destiny_player',
        description: 'Search for a Destiny 2 player by their Bungie Name (displayName#code) and platform membership type',
        inputSchema: {
          type: 'object',
          properties: {
            membership_type: {
              type: 'number',
              description: 'Platform membership type: -1=All, 1=Xbox, 2=PSN, 3=Steam, 5=Stadia, 6=EpicGames, 254=BungieNext',
            },
            display_name: {
              type: 'string',
              description: 'The display name portion of the Bungie Name (before the #)',
            },
            display_name_code: {
              type: 'number',
              description: 'The numeric code portion of the Bungie Name (after the #)',
            },
          },
          required: ['membership_type', 'display_name', 'display_name_code'],
        },
      },
      {
        name: 'get_linked_profiles',
        description: 'Get all Destiny platform memberships linked to a Bungie account — returns membershipId and membershipType for each platform',
        inputSchema: {
          type: 'object',
          properties: {
            membership_type: {
              type: 'number',
              description: 'The membership type of the supplied membershipId',
            },
            membership_id: {
              type: 'string',
              description: 'The Bungie or Destiny membership ID',
            },
            get_all_memberships: {
              type: 'boolean',
              description: 'If true, return all memberships regardless of cross-save override status',
            },
          },
          required: ['membership_type', 'membership_id'],
        },
      },
      {
        name: 'get_profile',
        description: 'Get a Destiny 2 profile — characters, inventory, vault, progression, milestones, and more depending on components requested',
        inputSchema: {
          type: 'object',
          properties: {
            membership_type: {
              type: 'number',
              description: 'Platform membership type (1=Xbox, 2=PSN, 3=Steam, 6=EpicGames)',
            },
            destiny_membership_id: {
              type: 'string',
              description: 'Destiny membership ID of the player',
            },
            components: {
              type: 'array',
              items: { type: 'number' },
              description: 'Component IDs: 100=Profiles, 200=Characters, 201=CharacterInventories, 205=CharacterEquipment, 102=ProfileInventories, 103=ProfileCurrencies, 300=ItemInstances, 900=Records, 800=Collectibles, 1000=Metrics',
            },
          },
          required: ['membership_type', 'destiny_membership_id', 'components'],
        },
      },
      {
        name: 'get_character',
        description: 'Get detailed data for a specific Destiny 2 character including stats, equipment, and progression',
        inputSchema: {
          type: 'object',
          properties: {
            membership_type: {
              type: 'number',
              description: 'Platform membership type',
            },
            destiny_membership_id: {
              type: 'string',
              description: 'Destiny membership ID of the player',
            },
            character_id: {
              type: 'string',
              description: 'The ID of the character to retrieve',
            },
            components: {
              type: 'array',
              items: { type: 'number' },
              description: 'Component IDs (e.g. 200=Characters, 201=CharacterInventories, 205=CharacterEquipment, 300=ItemInstances)',
            },
          },
          required: ['membership_type', 'destiny_membership_id', 'character_id', 'components'],
        },
      },
      {
        name: 'get_item',
        description: 'Get detailed data for a specific Destiny 2 item instance (weapon, armor, etc.) on a player',
        inputSchema: {
          type: 'object',
          properties: {
            membership_type: {
              type: 'number',
              description: 'Platform membership type',
            },
            destiny_membership_id: {
              type: 'string',
              description: 'Destiny membership ID of the player who owns the item',
            },
            item_instance_id: {
              type: 'string',
              description: 'The instance ID of the item (unique per player)',
            },
            components: {
              type: 'array',
              items: { type: 'number' },
              description: 'Component IDs: 300=ItemInstances, 302=ItemPerks, 304=ItemStats, 305=ItemSockets, 307=ItemCommonData, 308=ItemPlugStates',
            },
          },
          required: ['membership_type', 'destiny_membership_id', 'item_instance_id', 'components'],
        },
      },
      {
        name: 'search_destiny_entities',
        description: 'Search the Destiny 2 armory for items, activities, or other entities by name',
        inputSchema: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              description: 'Entity type to search: DestinyInventoryItemDefinition, DestinyActivityDefinition, etc.',
            },
            search_term: {
              type: 'string',
              description: 'The name to search for',
            },
            page: {
              type: 'number',
              description: 'Page number for paginated results (default: 0)',
            },
          },
          required: ['type', 'search_term'],
        },
      },
      {
        name: 'get_activity_history',
        description: 'Get the activity history (match history) for a Destiny 2 character — raids, strikes, crucible, gambit, etc.',
        inputSchema: {
          type: 'object',
          properties: {
            membership_type: {
              type: 'number',
              description: 'Platform membership type',
            },
            destiny_membership_id: {
              type: 'string',
              description: 'Destiny membership ID',
            },
            character_id: {
              type: 'string',
              description: 'Character ID to get history for',
            },
            count: {
              type: 'number',
              description: 'Number of activities to return (max 250, default 25)',
            },
            mode: {
              type: 'number',
              description: 'Activity mode filter: 0=None/All, 2=Story, 3=Strike, 4=Raid, 5=AllPvP, 7=AllPvE, 10=Control, 37=Trials, 46=Gambit, 63=Dungeon',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 0)',
            },
          },
          required: ['membership_type', 'destiny_membership_id', 'character_id'],
        },
      },
      {
        name: 'get_post_game_carnage_report',
        description: 'Get the Post Game Carnage Report (PGCR) for a completed Destiny 2 activity — full scoreboard with kills, deaths, assists for all players',
        inputSchema: {
          type: 'object',
          properties: {
            activity_id: {
              type: 'string',
              description: 'The unique activity instance ID (obtained from get_activity_history)',
            },
          },
          required: ['activity_id'],
        },
      },
      {
        name: 'get_historical_stats',
        description: 'Get aggregated historical stats for a Destiny 2 character across all activity modes',
        inputSchema: {
          type: 'object',
          properties: {
            membership_type: {
              type: 'number',
              description: 'Platform membership type',
            },
            destiny_membership_id: {
              type: 'string',
              description: 'Destiny membership ID',
            },
            character_id: {
              type: 'string',
              description: 'Character ID (use 0 for account-level stats)',
            },
            modes: {
              type: 'array',
              items: { type: 'number' },
              description: 'Activity mode IDs to include stats for (e.g. [5] for all PvP, [7] for all PvE)',
            },
            groups: {
              type: 'array',
              items: { type: 'number' },
              description: 'Stat groups: 1=General, 2=Weapons, 3=Medals',
            },
          },
          required: ['membership_type', 'destiny_membership_id', 'character_id'],
        },
      },
      {
        name: 'get_unique_weapon_history',
        description: 'Get all unique weapons a Destiny 2 character has used along with kill stats for each weapon',
        inputSchema: {
          type: 'object',
          properties: {
            membership_type: {
              type: 'number',
              description: 'Platform membership type',
            },
            destiny_membership_id: {
              type: 'string',
              description: 'Destiny membership ID',
            },
            character_id: {
              type: 'string',
              description: 'Character ID',
            },
          },
          required: ['membership_type', 'destiny_membership_id', 'character_id'],
        },
      },
      {
        name: 'get_aggregate_activity_stats',
        description: 'Get aggregate completion stats for all activities a Destiny 2 character has participated in',
        inputSchema: {
          type: 'object',
          properties: {
            membership_type: {
              type: 'number',
              description: 'Platform membership type',
            },
            destiny_membership_id: {
              type: 'string',
              description: 'Destiny membership ID',
            },
            character_id: {
              type: 'string',
              description: 'Character ID',
            },
          },
          required: ['membership_type', 'destiny_membership_id', 'character_id'],
        },
      },
      {
        name: 'get_public_milestones',
        description: 'Get all currently active public Destiny 2 milestones (weekly reset activities, seasonal content, etc.)',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_public_vendors',
        description: 'Get public vendor sales data for Destiny 2 (Xur, Banshee-44, Ada-1, etc.) without requiring authentication',
        inputSchema: {
          type: 'object',
          properties: {
            components: {
              type: 'array',
              items: { type: 'number' },
              description: 'Components to include: 400=Vendors, 401=VendorCategories, 402=VendorSales',
            },
          },
          required: ['components'],
        },
      },
      {
        name: 'get_clan_weekly_reward_state',
        description: 'Get the weekly reward state for a Destiny 2 clan — shows which engrams have been earned this week',
        inputSchema: {
          type: 'object',
          properties: {
            group_id: {
              type: 'string',
              description: 'The clan/group ID',
            },
          },
          required: ['group_id'],
        },
      },
      {
        name: 'get_clan_aggregate_stats',
        description: 'Get aggregated Destiny 2 stats for all members of a clan across specified activity modes',
        inputSchema: {
          type: 'object',
          properties: {
            group_id: {
              type: 'string',
              description: 'The clan/group ID',
            },
            modes: {
              type: 'string',
              description: 'Comma-separated activity mode IDs (e.g. "5,7" for PvP and PvE)',
            },
          },
          required: ['group_id'],
        },
      },
      {
        name: 'get_group',
        description: 'Get details for a Bungie.net group or Destiny 2 clan by group ID — includes name, about, membership count, and settings',
        inputSchema: {
          type: 'object',
          properties: {
            group_id: {
              type: 'string',
              description: 'The unique group/clan ID',
            },
          },
          required: ['group_id'],
        },
      },
      {
        name: 'get_members_of_group',
        description: 'Get a paginated list of members in a Bungie.net group or Destiny 2 clan',
        inputSchema: {
          type: 'object',
          properties: {
            group_id: {
              type: 'string',
              description: 'The group/clan ID',
            },
            current_page: {
              type: 'number',
              description: 'Page number (1-based, default: 1)',
            },
            member_type: {
              type: 'number',
              description: 'Filter by membership role: 0=None, 1=Beginner, 2=Member, 3=Admin, 4=ActingFounder, 5=Founder',
            },
            name_search: {
              type: 'string',
              description: 'Filter members by display name prefix',
            },
          },
          required: ['group_id'],
        },
      },
      {
        name: 'get_groups_for_member',
        description: 'Get all Bungie.net groups or Destiny 2 clans that a given user is a member of',
        inputSchema: {
          type: 'object',
          properties: {
            membership_type: {
              type: 'number',
              description: 'Platform membership type of the user',
            },
            membership_id: {
              type: 'string',
              description: 'Membership ID of the user',
            },
            filter: {
              type: 'number',
              description: 'Membership filter: 0=All, 1=Founded, 2=Ally',
            },
            group_type: {
              type: 'number',
              description: 'Group type: 0=General, 1=Clan',
            },
          },
          required: ['membership_type', 'membership_id', 'filter', 'group_type'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_destiny_manifest':
          return this.getDestinyManifest();
        case 'get_destiny_entity_definition':
          return this.getDestinyEntityDefinition(args);
        case 'search_destiny_player':
          return this.searchDestinyPlayer(args);
        case 'get_linked_profiles':
          return this.getLinkedProfiles(args);
        case 'get_profile':
          return this.getProfile(args);
        case 'get_character':
          return this.getCharacter(args);
        case 'get_item':
          return this.getItem(args);
        case 'search_destiny_entities':
          return this.searchDestinyEntities(args);
        case 'get_activity_history':
          return this.getActivityHistory(args);
        case 'get_post_game_carnage_report':
          return this.getPostGameCarnageReport(args);
        case 'get_historical_stats':
          return this.getHistoricalStats(args);
        case 'get_unique_weapon_history':
          return this.getUniqueWeaponHistory(args);
        case 'get_aggregate_activity_stats':
          return this.getAggregateActivityStats(args);
        case 'get_public_milestones':
          return this.getPublicMilestones();
        case 'get_public_vendors':
          return this.getPublicVendors(args);
        case 'get_clan_weekly_reward_state':
          return this.getClanWeeklyRewardState(args);
        case 'get_clan_aggregate_stats':
          return this.getClanAggregateStats(args);
        case 'get_group':
          return this.getGroup(args);
        case 'get_members_of_group':
          return this.getMembersOfGroup(args);
        case 'get_groups_for_member':
          return this.getGroupsForMember(args);
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
    const headers: Record<string, string> = {
      'X-API-Key': this.apiKey,
      'Content-Type': 'application/json',
    };
    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }
    return headers;
  }

  private buildUrl(path: string, params: Record<string, string | number | undefined> = {}): string {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) qs.set(k, String(v));
    }
    const query = qs.toString();
    return `${this.baseUrl}${path}${query ? `?${query}` : ''}`;
  }

  private async get(path: string, params: Record<string, string | number | undefined> = {}): Promise<ToolResult> {
    const url = this.buildUrl(path, params);
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: this.buildHeaders() });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Bungie API returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async post(path: string, body: unknown): Promise<ToolResult> {
    const url = `${this.baseUrl}${path}`;
    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers: this.buildHeaders(),
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Bungie API returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getDestinyManifest(): Promise<ToolResult> {
    return this.get('/Destiny2/Manifest/');
  }

  private async getDestinyEntityDefinition(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.entity_type) return { content: [{ type: 'text', text: 'entity_type is required' }], isError: true };
    if (args.hash_identifier === undefined) return { content: [{ type: 'text', text: 'hash_identifier is required' }], isError: true };
    return this.get(`/Destiny2/Manifest/${encodeURIComponent(args.entity_type as string)}/${encodeURIComponent(String(args.hash_identifier))}/`);
  }

  private async searchDestinyPlayer(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.membership_type === undefined) return { content: [{ type: 'text', text: 'membership_type is required' }], isError: true };
    if (!args.display_name) return { content: [{ type: 'text', text: 'display_name is required' }], isError: true };
    if (args.display_name_code === undefined) return { content: [{ type: 'text', text: 'display_name_code is required' }], isError: true };
    return this.post(`/Destiny2/SearchDestinyPlayerByBungieName/${encodeURIComponent(String(args.membership_type))}/`, {
      displayName: args.display_name,
      displayNameCode: args.display_name_code,
    });
  }

  private async getLinkedProfiles(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.membership_type === undefined) return { content: [{ type: 'text', text: 'membership_type is required' }], isError: true };
    if (!args.membership_id) return { content: [{ type: 'text', text: 'membership_id is required' }], isError: true };
    const params: Record<string, string | number | undefined> = {};
    if (args.get_all_memberships !== undefined) params.getAllMemberships = String(args.get_all_memberships);
    return this.get(`/Destiny2/${encodeURIComponent(String(args.membership_type))}/Profile/${encodeURIComponent(args.membership_id as string)}/LinkedProfiles/`, params);
  }

  private async getProfile(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.membership_type === undefined) return { content: [{ type: 'text', text: 'membership_type is required' }], isError: true };
    if (!args.destiny_membership_id) return { content: [{ type: 'text', text: 'destiny_membership_id is required' }], isError: true };
    if (!args.components) return { content: [{ type: 'text', text: 'components is required' }], isError: true };
    const components = Array.isArray(args.components) ? (args.components as number[]).join(',') : String(args.components);
    return this.get(`/Destiny2/${encodeURIComponent(String(args.membership_type))}/Profile/${encodeURIComponent(args.destiny_membership_id as string)}/`, { components });
  }

  private async getCharacter(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.membership_type === undefined) return { content: [{ type: 'text', text: 'membership_type is required' }], isError: true };
    if (!args.destiny_membership_id) return { content: [{ type: 'text', text: 'destiny_membership_id is required' }], isError: true };
    if (!args.character_id) return { content: [{ type: 'text', text: 'character_id is required' }], isError: true };
    if (!args.components) return { content: [{ type: 'text', text: 'components is required' }], isError: true };
    const components = Array.isArray(args.components) ? (args.components as number[]).join(',') : String(args.components);
    return this.get(
      `/Destiny2/${encodeURIComponent(String(args.membership_type))}/Profile/${encodeURIComponent(args.destiny_membership_id as string)}/Character/${encodeURIComponent(args.character_id as string)}/`,
      { components },
    );
  }

  private async getItem(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.membership_type === undefined) return { content: [{ type: 'text', text: 'membership_type is required' }], isError: true };
    if (!args.destiny_membership_id) return { content: [{ type: 'text', text: 'destiny_membership_id is required' }], isError: true };
    if (!args.item_instance_id) return { content: [{ type: 'text', text: 'item_instance_id is required' }], isError: true };
    if (!args.components) return { content: [{ type: 'text', text: 'components is required' }], isError: true };
    const components = Array.isArray(args.components) ? (args.components as number[]).join(',') : String(args.components);
    return this.get(
      `/Destiny2/${encodeURIComponent(String(args.membership_type))}/Profile/${encodeURIComponent(args.destiny_membership_id as string)}/Item/${encodeURIComponent(args.item_instance_id as string)}/`,
      { components },
    );
  }

  private async searchDestinyEntities(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.type) return { content: [{ type: 'text', text: 'type is required' }], isError: true };
    if (!args.search_term) return { content: [{ type: 'text', text: 'search_term is required' }], isError: true };
    const params: Record<string, string | number | undefined> = {};
    if (args.page !== undefined) params.page = args.page as number;
    return this.get(`/Destiny2/Armory/Search/${encodeURIComponent(args.type as string)}/${encodeURIComponent(args.search_term as string)}/`, params);
  }

  private async getActivityHistory(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.membership_type === undefined) return { content: [{ type: 'text', text: 'membership_type is required' }], isError: true };
    if (!args.destiny_membership_id) return { content: [{ type: 'text', text: 'destiny_membership_id is required' }], isError: true };
    if (!args.character_id) return { content: [{ type: 'text', text: 'character_id is required' }], isError: true };
    const params: Record<string, string | number | undefined> = {};
    if (args.count !== undefined) params.count = args.count as number;
    if (args.mode !== undefined) params.mode = args.mode as number;
    if (args.page !== undefined) params.page = args.page as number;
    return this.get(
      `/Destiny2/${encodeURIComponent(String(args.membership_type))}/Account/${encodeURIComponent(args.destiny_membership_id as string)}/Character/${encodeURIComponent(args.character_id as string)}/Stats/Activities/`,
      params,
    );
  }

  private async getPostGameCarnageReport(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.activity_id) return { content: [{ type: 'text', text: 'activity_id is required' }], isError: true };
    return this.get(`/Destiny2/Stats/PostGameCarnageReport/${encodeURIComponent(args.activity_id as string)}/`);
  }

  private async getHistoricalStats(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.membership_type === undefined) return { content: [{ type: 'text', text: 'membership_type is required' }], isError: true };
    if (!args.destiny_membership_id) return { content: [{ type: 'text', text: 'destiny_membership_id is required' }], isError: true };
    if (!args.character_id) return { content: [{ type: 'text', text: 'character_id is required' }], isError: true };
    const params: Record<string, string | number | undefined> = {};
    if (args.modes) params.modes = Array.isArray(args.modes) ? (args.modes as number[]).join(',') : String(args.modes);
    if (args.groups) params.groups = Array.isArray(args.groups) ? (args.groups as number[]).join(',') : String(args.groups);
    return this.get(
      `/Destiny2/${encodeURIComponent(String(args.membership_type))}/Account/${encodeURIComponent(args.destiny_membership_id as string)}/Character/${encodeURIComponent(args.character_id as string)}/Stats/`,
      params,
    );
  }

  private async getUniqueWeaponHistory(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.membership_type === undefined) return { content: [{ type: 'text', text: 'membership_type is required' }], isError: true };
    if (!args.destiny_membership_id) return { content: [{ type: 'text', text: 'destiny_membership_id is required' }], isError: true };
    if (!args.character_id) return { content: [{ type: 'text', text: 'character_id is required' }], isError: true };
    return this.get(
      `/Destiny2/${encodeURIComponent(String(args.membership_type))}/Account/${encodeURIComponent(args.destiny_membership_id as string)}/Character/${encodeURIComponent(args.character_id as string)}/Stats/UniqueWeapons/`,
    );
  }

  private async getAggregateActivityStats(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.membership_type === undefined) return { content: [{ type: 'text', text: 'membership_type is required' }], isError: true };
    if (!args.destiny_membership_id) return { content: [{ type: 'text', text: 'destiny_membership_id is required' }], isError: true };
    if (!args.character_id) return { content: [{ type: 'text', text: 'character_id is required' }], isError: true };
    return this.get(
      `/Destiny2/${encodeURIComponent(String(args.membership_type))}/Account/${encodeURIComponent(args.destiny_membership_id as string)}/Character/${encodeURIComponent(args.character_id as string)}/Stats/AggregateActivityStats/`,
    );
  }

  private async getPublicMilestones(): Promise<ToolResult> {
    return this.get('/Destiny2/Milestones/');
  }

  private async getPublicVendors(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.components) return { content: [{ type: 'text', text: 'components is required' }], isError: true };
    const components = Array.isArray(args.components) ? (args.components as number[]).join(',') : String(args.components);
    return this.get('/Destiny2/Vendors/', { components });
  }

  private async getClanWeeklyRewardState(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.group_id) return { content: [{ type: 'text', text: 'group_id is required' }], isError: true };
    return this.get(`/Destiny2/Clan/${encodeURIComponent(args.group_id as string)}/WeeklyRewardState/`);
  }

  private async getClanAggregateStats(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.group_id) return { content: [{ type: 'text', text: 'group_id is required' }], isError: true };
    const params: Record<string, string | number | undefined> = {};
    if (args.modes) params.modes = args.modes as string;
    return this.get(`/Destiny2/Stats/AggregateClanStats/${encodeURIComponent(args.group_id as string)}/`, params);
  }

  private async getGroup(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.group_id) return { content: [{ type: 'text', text: 'group_id is required' }], isError: true };
    return this.get(`/GroupV2/${encodeURIComponent(args.group_id as string)}/`);
  }

  private async getMembersOfGroup(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.group_id) return { content: [{ type: 'text', text: 'group_id is required' }], isError: true };
    const params: Record<string, string | number | undefined> = {};
    if (args.current_page !== undefined) params.currentpage = args.current_page as number;
    if (args.member_type !== undefined) params.memberType = args.member_type as number;
    if (args.name_search) params.nameSearch = args.name_search as string;
    return this.get(`/GroupV2/${encodeURIComponent(args.group_id as string)}/Members/`, params);
  }

  private async getGroupsForMember(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.membership_type === undefined) return { content: [{ type: 'text', text: 'membership_type is required' }], isError: true };
    if (!args.membership_id) return { content: [{ type: 'text', text: 'membership_id is required' }], isError: true };
    if (args.filter === undefined) return { content: [{ type: 'text', text: 'filter is required' }], isError: true };
    if (args.group_type === undefined) return { content: [{ type: 'text', text: 'group_type is required' }], isError: true };
    return this.get(
      `/GroupV2/User/${encodeURIComponent(String(args.membership_type))}/${encodeURIComponent(args.membership_id as string)}/${encodeURIComponent(String(args.filter))}/${encodeURIComponent(String(args.group_type))}/`,
    );
  }
}
