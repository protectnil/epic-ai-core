/**
 * PandaScore MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Spec: https://api.apis.guru/v2/specs/pandascore.co/2.23.1/openapi.json
// Base URL: https://api.pandascore.co
// Auth: Authorization: Bearer {token} or ?token= query param
// Docs: https://developers.pandascore.co/

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface PandaScoreConfig {
  token: string;
  baseUrl?: string;
}

export class PandaScoreMCPServer extends MCPAdapterBase {
  private readonly token: string;
  private readonly baseUrl: string;

  constructor(config: PandaScoreConfig) {
    super();
    this.token = config.token;
    this.baseUrl = config.baseUrl || 'https://api.pandascore.co';
  }

  static catalog() {
    return {
      name: 'pandascore',
      displayName: 'PandaScore',
      version: '2.23.1',
      category: 'sports' as const,
      keywords: ['pandascore', 'esports', 'gaming', 'leagues', 'matches', 'tournaments', 'teams', 'players'],
      toolNames: [
        'list_leagues',
        'get_league',
        'list_matches',
        'get_match',
        'list_tournaments',
        'get_tournament',
        'list_series',
        'list_teams',
        'get_team',
        'list_players',
        'get_player',
        'list_videogames',
        'get_videogame',
      ],
      description: 'PandaScore esports data adapter — access leagues, matches, tournaments, teams, and players across all major videogames via the Epic AI Intelligence Platform.',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_leagues',
        description: 'List all esports leagues. Supports filtering by videogame, search, sort, and pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            videogame: {
              type: 'string',
              description: 'Filter by videogame slug or ID (e.g. lol, csgo, dota2)',
            },
            search: {
              type: 'string',
              description: 'Search leagues by name (partial match)',
            },
            sort: {
              type: 'string',
              description: 'Sort field (e.g. name, -name)',
            },
            page: {
              type: 'number',
              description: 'Page number for pagination (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Results per page (max 100, default 50)',
            },
          },
        },
      },
      {
        name: 'get_league',
        description: 'Get full details for a specific esports league by ID or slug.',
        inputSchema: {
          type: 'object',
          properties: {
            league_id_or_slug: {
              type: 'string',
              description: 'League ID (numeric) or slug (e.g. lol-worlds)',
            },
          },
          required: ['league_id_or_slug'],
        },
      },
      {
        name: 'list_matches',
        description: 'List esports matches. Filter by status (running, upcoming, past), videogame, league, tournament, or team.',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              description: 'Filter by match status: running, upcoming, past (omit for all)',
            },
            videogame: {
              type: 'string',
              description: 'Filter by videogame slug or ID',
            },
            league_id: {
              type: 'string',
              description: 'Filter by league ID',
            },
            tournament_id: {
              type: 'string',
              description: 'Filter by tournament ID',
            },
            sort: {
              type: 'string',
              description: 'Sort field (e.g. begin_at, -begin_at)',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Results per page (max 100)',
            },
          },
        },
      },
      {
        name: 'get_match',
        description: 'Get full details for a specific esports match by ID or slug, including teams, scores, and game results.',
        inputSchema: {
          type: 'object',
          properties: {
            match_id_or_slug: {
              type: 'string',
              description: 'Match ID (numeric) or slug',
            },
          },
          required: ['match_id_or_slug'],
        },
      },
      {
        name: 'list_tournaments',
        description: 'List esports tournaments. Filter by status (running, upcoming, past), videogame, league, or series.',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              description: 'Filter by status: running, upcoming, past (omit for all)',
            },
            videogame: {
              type: 'string',
              description: 'Filter by videogame slug or ID',
            },
            league_id: {
              type: 'string',
              description: 'Filter by league ID',
            },
            sort: {
              type: 'string',
              description: 'Sort field (e.g. begin_at, -begin_at)',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Results per page (max 100)',
            },
          },
        },
      },
      {
        name: 'get_tournament',
        description: 'Get full details for a specific tournament by ID or slug, including standings and bracket information.',
        inputSchema: {
          type: 'object',
          properties: {
            tournament_id_or_slug: {
              type: 'string',
              description: 'Tournament ID (numeric) or slug',
            },
          },
          required: ['tournament_id_or_slug'],
        },
      },
      {
        name: 'list_series',
        description: 'List esports series (occurrences of leagues). Filter by status, videogame, or league.',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              description: 'Filter by status: running, upcoming, past (omit for all)',
            },
            videogame: {
              type: 'string',
              description: 'Filter by videogame slug or ID',
            },
            sort: {
              type: 'string',
              description: 'Sort field (e.g. begin_at, -begin_at)',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Results per page (max 100)',
            },
          },
        },
      },
      {
        name: 'list_teams',
        description: 'List esports teams. Filter by videogame, search by name, or sort by field.',
        inputSchema: {
          type: 'object',
          properties: {
            videogame: {
              type: 'string',
              description: 'Filter by videogame slug or ID',
            },
            search: {
              type: 'string',
              description: 'Search teams by name (partial match)',
            },
            sort: {
              type: 'string',
              description: 'Sort field (e.g. name, -name)',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Results per page (max 100)',
            },
          },
        },
      },
      {
        name: 'get_team',
        description: 'Get full details for a specific esports team by ID or slug, including roster and recent results.',
        inputSchema: {
          type: 'object',
          properties: {
            team_id_or_slug: {
              type: 'string',
              description: 'Team ID (numeric) or slug',
            },
          },
          required: ['team_id_or_slug'],
        },
      },
      {
        name: 'list_players',
        description: 'List esports players. Filter by videogame, team, nationality, or search by name.',
        inputSchema: {
          type: 'object',
          properties: {
            videogame: {
              type: 'string',
              description: 'Filter by videogame slug or ID',
            },
            search: {
              type: 'string',
              description: 'Search players by name or in-game name (partial match)',
            },
            nationality: {
              type: 'string',
              description: 'Filter by player nationality (ISO 3166-1 alpha-2 code, e.g. US, KR)',
            },
            sort: {
              type: 'string',
              description: 'Sort field (e.g. name, -name)',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Results per page (max 100)',
            },
          },
        },
      },
      {
        name: 'get_player',
        description: 'Get full profile for a specific esports player by ID or slug, including team affiliations and stats.',
        inputSchema: {
          type: 'object',
          properties: {
            player_id_or_slug: {
              type: 'string',
              description: 'Player ID (numeric) or slug (in-game name)',
            },
          },
          required: ['player_id_or_slug'],
        },
      },
      {
        name: 'list_videogames',
        description: 'List all supported videogames on PandaScore (e.g. League of Legends, CS:GO, Dota 2, Valorant).',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
            },
            per_page: {
              type: 'number',
              description: 'Results per page (max 100)',
            },
          },
        },
      },
      {
        name: 'get_videogame',
        description: 'Get details for a specific videogame by ID or slug, including available leagues and series.',
        inputSchema: {
          type: 'object',
          properties: {
            videogame_id_or_slug: {
              type: 'string',
              description: 'Videogame ID (numeric) or slug (e.g. lol, csgo, dota2, valorant)',
            },
          },
          required: ['videogame_id_or_slug'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_leagues':
          return await this.listLeagues(args);
        case 'get_league':
          return await this.getLeague(args);
        case 'list_matches':
          return await this.listMatches(args);
        case 'get_match':
          return await this.getMatch(args);
        case 'list_tournaments':
          return await this.listTournaments(args);
        case 'get_tournament':
          return await this.getTournament(args);
        case 'list_series':
          return await this.listSeries(args);
        case 'list_teams':
          return await this.listTeams(args);
        case 'get_team':
          return await this.getTeam(args);
        case 'list_players':
          return await this.listPlayers(args);
        case 'get_player':
          return await this.getPlayer(args);
        case 'list_videogames':
          return await this.listVideogames(args);
        case 'get_videogame':
          return await this.getVideogame(args);
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

  private get headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.token}`,
      'Content-Type': 'application/json',
    };
  }

  private buildParams(args: Record<string, unknown>, allowed: string[]): URLSearchParams {
    const params = new URLSearchParams();
    for (const key of allowed) {
      if (args[key] !== undefined && args[key] !== null) {
        params.set(key === 'page' ? 'page[number]' : key === 'per_page' ? 'page[size]' : key, String(args[key]));
      }
    }
    return params;
  }

  private async get(path: string, params?: URLSearchParams): Promise<ToolResult> {
    const qs = params && params.toString() ? '?' + params.toString() : '';
    const url = `${this.baseUrl}${path}${qs}`;
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `PandaScore API error ${response.status}: ${errText}` }], isError: true };
    }
    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new Error(`PandaScore returned non-JSON response (HTTP ${response.status})`);
    }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listLeagues(args: Record<string, unknown>): Promise<ToolResult> {
    let path = '/leagues';
    if (args.videogame) {
      path = `/videogames/${encodeURIComponent(args.videogame as string)}/leagues`;
    }
    const params = this.buildParams(args, ['search', 'sort', 'page', 'per_page']);
    return this.get(path, params);
  }

  private async getLeague(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.league_id_or_slug as string;
    if (!id) return { content: [{ type: 'text', text: 'league_id_or_slug is required' }], isError: true };
    return this.get(`/leagues/${encodeURIComponent(id)}`);
  }

  private async listMatches(args: Record<string, unknown>): Promise<ToolResult> {
    const status = args.status as string | undefined;
    let path = '/matches';
    if (status === 'running') path = '/matches/running';
    else if (status === 'upcoming') path = '/matches/upcoming';
    else if (status === 'past') path = '/matches/past';
    const params = this.buildParams(args, ['sort', 'page', 'per_page']);
    if (args.videogame) params.set('filter[videogame]', String(args.videogame));
    if (args.league_id) params.set('filter[league_id]', String(args.league_id));
    if (args.tournament_id) params.set('filter[tournament_id]', String(args.tournament_id));
    return this.get(path, params);
  }

  private async getMatch(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.match_id_or_slug as string;
    if (!id) return { content: [{ type: 'text', text: 'match_id_or_slug is required' }], isError: true };
    return this.get(`/matches/${encodeURIComponent(id)}`);
  }

  private async listTournaments(args: Record<string, unknown>): Promise<ToolResult> {
    const status = args.status as string | undefined;
    let path = '/tournaments';
    if (status === 'running') path = '/tournaments/running';
    else if (status === 'upcoming') path = '/tournaments/upcoming';
    else if (status === 'past') path = '/tournaments/past';
    const params = this.buildParams(args, ['sort', 'page', 'per_page']);
    if (args.videogame) params.set('filter[videogame]', String(args.videogame));
    if (args.league_id) params.set('filter[league_id]', String(args.league_id));
    return this.get(path, params);
  }

  private async getTournament(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.tournament_id_or_slug as string;
    if (!id) return { content: [{ type: 'text', text: 'tournament_id_or_slug is required' }], isError: true };
    return this.get(`/tournaments/${encodeURIComponent(id)}`);
  }

  private async listSeries(args: Record<string, unknown>): Promise<ToolResult> {
    const status = args.status as string | undefined;
    let path = '/series';
    if (status === 'running') path = '/series/running';
    else if (status === 'upcoming') path = '/series/upcoming';
    else if (status === 'past') path = '/series/past';
    const params = this.buildParams(args, ['sort', 'page', 'per_page']);
    if (args.videogame) params.set('filter[videogame]', String(args.videogame));
    return this.get(path, params);
  }

  private async listTeams(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.buildParams(args, ['sort', 'page', 'per_page']);
    if (args.videogame) params.set('filter[videogame]', String(args.videogame));
    if (args.search) params.set('search[name]', String(args.search));
    return this.get('/teams', params);
  }

  private async getTeam(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.team_id_or_slug as string;
    if (!id) return { content: [{ type: 'text', text: 'team_id_or_slug is required' }], isError: true };
    return this.get(`/teams/${encodeURIComponent(id)}`);
  }

  private async listPlayers(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.buildParams(args, ['sort', 'page', 'per_page']);
    if (args.videogame) params.set('filter[videogame]', String(args.videogame));
    if (args.search) params.set('search[name]', String(args.search));
    if (args.nationality) params.set('filter[nationality]', String(args.nationality));
    return this.get('/players', params);
  }

  private async getPlayer(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.player_id_or_slug as string;
    if (!id) return { content: [{ type: 'text', text: 'player_id_or_slug is required' }], isError: true };
    return this.get(`/players/${encodeURIComponent(id)}`);
  }

  private async listVideogames(args: Record<string, unknown>): Promise<ToolResult> {
    const params = this.buildParams(args, ['page', 'per_page']);
    return this.get('/videogames', params);
  }

  private async getVideogame(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.videogame_id_or_slug as string;
    if (!id) return { content: [{ type: 'text', text: 'videogame_id_or_slug is required' }], isError: true };
    return this.get(`/videogames/${encodeURIComponent(id)}`);
  }
}
