/**
 * PRSS ContentDepot MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official PRSS/ContentDepot MCP server was found on GitHub. We build a full REST wrapper
// covering programs, episodes, segments, pieces, spots, spot insertions, broadcast services,
// and CD Drive file management for public radio content distribution.
//
// Base URL: https://contentdepot.prss.org
// Auth: OAuth 2.0 Bearer token (cd:full scope — authorization code or implicit flow)
//       Token URL: https://contentdepot.prss.org/api/oauth2/token
// Docs: https://contentdepot.prss.org/api/swagger-ui.html
// Spec: https://api.apis.guru/v2/specs/prss.org/2.0.0/openapi.json
// Category: media
// Rate limits: Not publicly documented — use standard retry backoff

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface PRSSConfig {
  accessToken: string;
  baseUrl?: string;
}

export class PRSSMCPServer extends MCPAdapterBase {
  private readonly accessToken: string;
  private readonly baseUrl: string;

  constructor(config: PRSSConfig) {
    super();
    this.accessToken = config.accessToken;
    this.baseUrl = config.baseUrl || 'https://contentdepot.prss.org';
  }

  static catalog() {
    return {
      name: 'prss',
      displayName: 'PRSS ContentDepot',
      version: '1.0.0',
      category: 'media',
      keywords: [
        'prss', 'contentdepot', 'public radio', 'npr', 'metapub', 'radiodns',
        'program', 'episode', 'segment', 'piece', 'audio', 'broadcast',
        'epg', 'electronic program guide', 'spot', 'spot insertion', 'cue',
        'cd drive', 'file upload', 'content management', 'radio',
        'broadcast service', 'station', 'metadata', 'media',
      ],
      toolNames: [
        'list_broadcast_services', 'get_broadcast_service',
        'list_programs', 'get_program',
        'list_episodes', 'get_episode',
        'list_segments', 'get_segment', 'create_segment', 'delete_segment',
        'list_pieces', 'get_piece', 'create_piece', 'delete_piece',
        'list_spots', 'get_spot', 'create_spot', 'delete_spot',
        'list_spot_insertions', 'get_spot_insertion', 'create_spot_insertion', 'delete_spot_insertion',
        'create_epg_batch', 'get_epg_batch',
        'upload_file', 'get_file_info', 'delete_file', 'get_file_content',
        'create_folder', 'get_folder_info', 'list_folder_items',
        'get_radiodns_gi', 'get_radiodns_si', 'get_radiodns_pi',
      ],
      description: 'PRSS ContentDepot API: manage public radio programs, episodes, segments, pieces, spots, and metadata distribution via MetaPub and RadioDNS for station EPG delivery.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // -- Broadcast Services ------------------------------------------------
      {
        name: 'list_broadcast_services',
        description: 'List broadcast services in ContentDepot, with optional pagination and sort order',
        inputSchema: {
          type: 'object',
          properties: {
            pageStart: {
              type: 'number',
              description: 'Start page index (0-based, default 0)',
            },
            pageSize: {
              type: 'number',
              description: 'Number of results to return (0-500, default 500)',
            },
            orderById: {
              type: 'string',
              description: 'Sort order by broadcast service ID: "asc" or "desc"',
            },
          },
        },
      },
      {
        name: 'get_broadcast_service',
        description: 'Get a specific broadcast service by its ContentDepot ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Broadcast service ID' },
          },
          required: ['id'],
        },
      },
      // -- Programs ----------------------------------------------------------
      {
        name: 'list_programs',
        description: 'Search for programs in ContentDepot using free-text and optional pagination filters',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Free-text search query for program titles or descriptions',
            },
            pageStart: { type: 'number', description: 'Start page index (0-based)' },
            pageSize: { type: 'number', description: 'Number of results to return' },
          },
        },
      },
      {
        name: 'get_program',
        description: 'Get detailed information about a specific program by its ContentDepot ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Program ID' },
          },
          required: ['id'],
        },
      },
      // -- Episodes ----------------------------------------------------------
      {
        name: 'list_episodes',
        description: 'List episodes for a given program ID, with optional pagination',
        inputSchema: {
          type: 'object',
          properties: {
            programId: {
              type: 'string',
              description: 'Program ID to list episodes for (required)',
            },
            pageStart: { type: 'number', description: 'Start page index (0-based)' },
            pageSize: { type: 'number', description: 'Number of results to return' },
          },
          required: ['programId'],
        },
      },
      {
        name: 'get_episode',
        description: 'Get detailed information about a specific episode by its ContentDepot ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Episode ID' },
          },
          required: ['id'],
        },
      },
      // -- Segments ----------------------------------------------------------
      {
        name: 'list_segments',
        description: 'List audio segments for a given episode. Segments contain audio content along with in-cue and out-cue metadata.',
        inputSchema: {
          type: 'object',
          properties: {
            episodeId: {
              type: 'string',
              description: 'Episode ID to list segments for (required)',
            },
            pageStart: { type: 'number', description: 'Start page index (0-based)' },
            pageSize: { type: 'number', description: 'Number of results to return' },
          },
          required: ['episodeId'],
        },
      },
      {
        name: 'get_segment',
        description: 'Get detailed information about a specific audio segment by its ContentDepot ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Segment ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_segment',
        description: 'Create a new audio segment for an episode with title, duration, in-cue, and out-cue information',
        inputSchema: {
          type: 'object',
          properties: {
            episodeId: { type: 'string', description: 'Episode ID this segment belongs to' },
            title: { type: 'string', description: 'Title of the segment' },
            duration: { type: 'number', description: 'Duration of the segment in seconds' },
            inCue: { type: 'string', description: 'In-cue text for the segment' },
            outCue: { type: 'string', description: 'Out-cue text for the segment' },
            contentUrl: {
              type: 'string',
              description: 'CD Drive URI or URL to the audio content (e.g. cddrive:id:12345)',
            },
          },
        },
      },
      {
        name: 'delete_segment',
        description: 'Delete an audio segment from ContentDepot by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Segment ID to delete' },
          },
          required: ['id'],
        },
      },
      // -- Pieces ------------------------------------------------------------
      {
        name: 'list_pieces',
        description: 'List story or song-level pieces within an episode. Pieces define specific metadata within segments (e.g. a 3-minute story within an 18-minute segment).',
        inputSchema: {
          type: 'object',
          properties: {
            episodeId: {
              type: 'string',
              description: 'Episode ID to list pieces for (required)',
            },
            pageStart: { type: 'number', description: 'Start page index (0-based)' },
            pageSize: { type: 'number', description: 'Number of results to return' },
          },
          required: ['episodeId'],
        },
      },
      {
        name: 'get_piece',
        description: 'Get detailed information about a specific piece by its ContentDepot ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Piece ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_piece',
        description: 'Create a new story or song-level piece within an episode with title, artists, and timing metadata',
        inputSchema: {
          type: 'object',
          properties: {
            episodeId: { type: 'string', description: 'Episode ID this piece belongs to' },
            title: { type: 'string', description: 'Title of the piece (story or song title)' },
            artists: {
              type: 'array',
              items: { type: 'string' },
              description: 'List of artist or contributor names',
            },
            startTime: {
              type: 'number',
              description: 'Start time of the piece within the episode in seconds',
            },
            duration: { type: 'number', description: 'Duration of the piece in seconds' },
            description: { type: 'string', description: 'Description or summary of the piece content' },
          },
        },
      },
      {
        name: 'delete_piece',
        description: 'Delete a piece (story or song-level metadata) from ContentDepot by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Piece ID to delete' },
          },
          required: ['id'],
        },
      },
      // -- Spots -------------------------------------------------------------
      {
        name: 'list_spots',
        description: 'List audio spots available for broadcast insertion. Spots are audio files triggered by broadcast cues.',
        inputSchema: {
          type: 'object',
          properties: {
            pageStart: { type: 'number', description: 'Start page index (0-based)' },
            pageSize: { type: 'number', description: 'Number of results to return' },
          },
        },
      },
      {
        name: 'get_spot',
        description: 'Get detailed information about a specific audio spot by its ContentDepot ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Spot ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_spot',
        description: 'Create a new audio spot for broadcast insertion with title and content reference',
        inputSchema: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Title of the spot' },
            contentUrl: {
              type: 'string',
              description: 'CD Drive URI or URL to the spot audio file',
            },
            duration: { type: 'number', description: 'Duration of the spot audio in seconds' },
          },
        },
      },
      {
        name: 'delete_spot',
        description: 'Delete an audio spot from ContentDepot by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Spot ID to delete' },
          },
          required: ['id'],
        },
      },
      // -- Spot Insertions ---------------------------------------------------
      {
        name: 'list_spot_insertions',
        description: 'List spot insertions that define which spots play when broadcast cues are received',
        inputSchema: {
          type: 'object',
          properties: {
            pageStart: { type: 'number', description: 'Start page index (0-based)' },
            pageSize: { type: 'number', description: 'Number of results to return' },
          },
        },
      },
      {
        name: 'get_spot_insertion',
        description: 'Get details of a specific spot insertion by its ContentDepot ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Spot insertion ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_spot_insertion',
        description: 'Create a spot insertion that maps a broadcast cue to an audio spot for playback',
        inputSchema: {
          type: 'object',
          properties: {
            spotId: { type: 'string', description: 'ID of the spot to insert' },
            cueId: {
              type: 'string',
              description: 'Broadcast cue ID that triggers this spot insertion',
            },
            startDate: {
              type: 'string',
              description: 'ISO 8601 date when this insertion becomes active (e.g. 2026-04-01T00:00:00Z)',
            },
            endDate: {
              type: 'string',
              description: 'ISO 8601 date when this insertion expires',
            },
          },
        },
      },
      {
        name: 'delete_spot_insertion',
        description: 'Delete a spot insertion by its ContentDepot ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Spot insertion ID to delete' },
          },
          required: ['id'],
        },
      },
      // -- MetaPub (EPG Batch) -----------------------------------------------
      {
        name: 'create_epg_batch',
        description: 'Create a MetaPub EPG batch operation to synchronize producer program and episode metadata to stations via the RadioDNS Electronic Program Guide',
        inputSchema: {
          type: 'object',
          properties: {
            programId: {
              type: 'string',
              description: 'Program ID to synchronize metadata for',
            },
            contentUrl: {
              type: 'string',
              description: 'CD Drive URI pointing to the metadata XML file to ingest',
            },
            startDate: {
              type: 'string',
              description: 'ISO 8601 start date for the EPG batch window',
            },
            endDate: {
              type: 'string',
              description: 'ISO 8601 end date for the EPG batch window',
            },
          },
        },
      },
      {
        name: 'get_epg_batch',
        description: 'Get the status and results of a MetaPub EPG batch operation by its batch ID',
        inputSchema: {
          type: 'object',
          properties: {
            batchId: { type: 'string', description: 'EPG batch operation ID to retrieve' },
          },
          required: ['batchId'],
        },
      },
      // -- CD Drive: Files ---------------------------------------------------
      {
        name: 'upload_file',
        description: 'Upload a file to ContentDepot Drive for use as audio content, metadata, or images. Returns a CD Drive URI for referencing the file in other API operations.',
        inputSchema: {
          type: 'object',
          properties: {
            filename: {
              type: 'string',
              description: 'Name of the file to upload (e.g. episode.mp3, metadata.xml)',
            },
            contentType: {
              type: 'string',
              description: 'MIME type of the file (e.g. audio/mpeg, application/xml, image/jpeg)',
            },
            folderId: {
              type: 'string',
              description: 'CD Drive folder ID to upload into (optional, uploads to root if omitted)',
            },
          },
          required: ['filename', 'contentType'],
        },
      },
      {
        name: 'get_file_info',
        description: 'Get metadata and information about a CD Drive file by its file ID',
        inputSchema: {
          type: 'object',
          properties: {
            fileId: { type: 'string', description: 'CD Drive file ID' },
          },
          required: ['fileId'],
        },
      },
      {
        name: 'delete_file',
        description: 'Delete a file from ContentDepot Drive by its file ID',
        inputSchema: {
          type: 'object',
          properties: {
            fileId: { type: 'string', description: 'CD Drive file ID to delete' },
          },
          required: ['fileId'],
        },
      },
      {
        name: 'get_file_content',
        description: 'Download the content of a CD Drive file by its file ID',
        inputSchema: {
          type: 'object',
          properties: {
            fileId: { type: 'string', description: 'CD Drive file ID to download' },
          },
          required: ['fileId'],
        },
      },
      // -- CD Drive: Folders -------------------------------------------------
      {
        name: 'create_folder',
        description: 'Create a new folder in ContentDepot Drive for organizing content files',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Folder name' },
            parentFolderId: {
              type: 'string',
              description: 'Parent folder ID to create this folder inside (optional, creates at root if omitted)',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'get_folder_info',
        description: 'Get information about a CD Drive folder by its folder ID',
        inputSchema: {
          type: 'object',
          properties: {
            folderId: { type: 'string', description: 'CD Drive folder ID' },
          },
          required: ['folderId'],
        },
      },
      {
        name: 'list_folder_items',
        description: 'List all files and subfolders inside a ContentDepot Drive folder',
        inputSchema: {
          type: 'object',
          properties: {
            folderId: { type: 'string', description: 'CD Drive folder ID to list items from' },
          },
          required: ['folderId'],
        },
      },
      // -- RadioDNS ----------------------------------------------------------
      {
        name: 'get_radiodns_gi',
        description: 'Get the RadioDNS Group Information (GI) XML document for national public radio program groupings used by station middleware for EPG display',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_radiodns_si',
        description: 'Get the RadioDNS Service Information (SI) XML document listing national public radio services for HD radio and streaming EPG middleware',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_radiodns_pi',
        description: 'Get the RadioDNS Programme Information (PI) XML document for a specific station service and broadcast date for daily EPG scheduling',
        inputSchema: {
          type: 'object',
          properties: {
            fqdn: {
              type: 'string',
              description: 'Fully qualified domain name of the RadioDNS service (e.g. npr.org)',
            },
            sid: {
              type: 'string',
              description: 'Service ID for the RadioDNS endpoint',
            },
            date: {
              type: 'string',
              description: 'Broadcast date in YYYYMMDD format (e.g. 20260401)',
            },
          },
          required: ['fqdn', 'sid', 'date'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_broadcast_services':    return this.listBroadcastServices(args);
        case 'get_broadcast_service':      return this.getBroadcastService(args);
        case 'list_programs':              return this.listPrograms(args);
        case 'get_program':                return this.getProgram(args);
        case 'list_episodes':              return this.listEpisodes(args);
        case 'get_episode':                return this.getEpisode(args);
        case 'list_segments':              return this.listSegments(args);
        case 'get_segment':                return this.getSegment(args);
        case 'create_segment':             return this.createSegment(args);
        case 'delete_segment':             return this.deleteSegment(args);
        case 'list_pieces':                return this.listPieces(args);
        case 'get_piece':                  return this.getPiece(args);
        case 'create_piece':               return this.createPiece(args);
        case 'delete_piece':               return this.deletePiece(args);
        case 'list_spots':                 return this.listSpots(args);
        case 'get_spot':                   return this.getSpot(args);
        case 'create_spot':                return this.createSpot(args);
        case 'delete_spot':                return this.deleteSpot(args);
        case 'list_spot_insertions':       return this.listSpotInsertions(args);
        case 'get_spot_insertion':         return this.getSpotInsertion(args);
        case 'create_spot_insertion':      return this.createSpotInsertion(args);
        case 'delete_spot_insertion':      return this.deleteSpotInsertion(args);
        case 'create_epg_batch':           return this.createEpgBatch(args);
        case 'get_epg_batch':              return this.getEpgBatch(args);
        case 'upload_file':                return this.uploadFile(args);
        case 'get_file_info':              return this.getFileInfo(args);
        case 'delete_file':                return this.deleteFile(args);
        case 'get_file_content':           return this.getFileContent(args);
        case 'create_folder':              return this.createFolder(args);
        case 'get_folder_info':            return this.getFolderInfo(args);
        case 'list_folder_items':          return this.listFolderItems(args);
        case 'get_radiodns_gi':            return this.getRadioDnsGi();
        case 'get_radiodns_si':            return this.getRadioDnsSi();
        case 'get_radiodns_pi':            return this.getRadioDnsPi(args);
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

  // -- Private helpers -------------------------------------------------------

  private async request(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    body?: Record<string, unknown>,
    params?: Record<string, string | number | undefined>,
  ): Promise<ToolResult> {
    let url = `${this.baseUrl}${path}`;
    if (params) {
      const qs = Object.entries(params)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
        .join('&');
      if (qs) url += `?${qs}`;
    }
    const init: RequestInit = {
      method,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    };
    if (body && Object.keys(body).length > 0) init.body = JSON.stringify(body);
    const response = await this.fetchWithRetry(url, init);
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error: ${response.status} ${errText}` }], isError: true };
    }
    if (response.status === 204) {
      return { content: [{ type: 'text', text: '{"success":true}' }], isError: false };
    }
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('xml')) {
      const text = await response.text();
      return { content: [{ type: 'text', text: text.length > 10_000 ? text.slice(0, 10_000) + '\n... [truncated]' : text }], isError: false };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  // -- Broadcast Services ----------------------------------------------------

  private async listBroadcastServices(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('GET', '/api/v2/broadcastservices', undefined, {
      pageStart: args.pageStart as number | undefined,
      pageSize: args.pageSize as number | undefined,
      orderById: args.orderById as string | undefined,
    });
  }

  private async getBroadcastService(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.request('GET', `/api/v2/broadcastservices/${encodeURIComponent(args.id as string)}`);
  }

  // -- Programs --------------------------------------------------------------

  private async listPrograms(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('GET', '/api/v2/programs/search', undefined, {
      query: args.query as string | undefined,
      pageStart: args.pageStart as number | undefined,
      pageSize: args.pageSize as number | undefined,
    });
  }

  private async getProgram(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.request('GET', `/api/v2/programs/${encodeURIComponent(args.id as string)}`);
  }

  // -- Episodes --------------------------------------------------------------

  private async listEpisodes(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.programId) return { content: [{ type: 'text', text: 'programId is required' }], isError: true };
    return this.request('GET', '/api/v2/episodes', undefined, {
      programId: args.programId as string,
      pageStart: args.pageStart as number | undefined,
      pageSize: args.pageSize as number | undefined,
    });
  }

  private async getEpisode(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.request('GET', `/api/v2/episodes/${encodeURIComponent(args.id as string)}`);
  }

  // -- Segments --------------------------------------------------------------

  private async listSegments(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.episodeId) return { content: [{ type: 'text', text: 'episodeId is required' }], isError: true };
    return this.request('GET', '/api/v2/segments', undefined, {
      episodeId: args.episodeId as string,
      pageStart: args.pageStart as number | undefined,
      pageSize: args.pageSize as number | undefined,
    });
  }

  private async getSegment(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.request('GET', `/api/v2/segments/${encodeURIComponent(args.id as string)}`);
  }

  private async createSegment(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {};
    if (args.episodeId) body.episodeId = args.episodeId;
    if (args.title) body.title = args.title;
    if (args.duration !== undefined) body.duration = args.duration;
    if (args.inCue) body.inCue = args.inCue;
    if (args.outCue) body.outCue = args.outCue;
    if (args.contentUrl) body.contentUrl = args.contentUrl;
    return this.request('POST', '/api/v2/segments', body);
  }

  private async deleteSegment(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.request('DELETE', `/api/v2/segments/${encodeURIComponent(args.id as string)}`);
  }

  // -- Pieces ----------------------------------------------------------------

  private async listPieces(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.episodeId) return { content: [{ type: 'text', text: 'episodeId is required' }], isError: true };
    return this.request('GET', '/api/v2/pieces', undefined, {
      episodeId: args.episodeId as string,
      pageStart: args.pageStart as number | undefined,
      pageSize: args.pageSize as number | undefined,
    });
  }

  private async getPiece(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.request('GET', `/api/v2/pieces/${encodeURIComponent(args.id as string)}`);
  }

  private async createPiece(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {};
    if (args.episodeId) body.episodeId = args.episodeId;
    if (args.title) body.title = args.title;
    if (args.artists) body.artists = args.artists;
    if (args.startTime !== undefined) body.startTime = args.startTime;
    if (args.duration !== undefined) body.duration = args.duration;
    if (args.description) body.description = args.description;
    return this.request('POST', '/api/v2/pieces', body);
  }

  private async deletePiece(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.request('DELETE', `/api/v2/pieces/${encodeURIComponent(args.id as string)}`);
  }

  // -- Spots -----------------------------------------------------------------

  private async listSpots(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('GET', '/api/v2/spots', undefined, {
      pageStart: args.pageStart as number | undefined,
      pageSize: args.pageSize as number | undefined,
    });
  }

  private async getSpot(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.request('GET', `/api/v2/spots/${encodeURIComponent(args.id as string)}`);
  }

  private async createSpot(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {};
    if (args.title) body.title = args.title;
    if (args.contentUrl) body.contentUrl = args.contentUrl;
    if (args.duration !== undefined) body.duration = args.duration;
    return this.request('POST', '/api/v2/spots', body);
  }

  private async deleteSpot(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.request('DELETE', `/api/v2/spots/${encodeURIComponent(args.id as string)}`);
  }

  // -- Spot Insertions -------------------------------------------------------

  private async listSpotInsertions(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('GET', '/api/v2/spotinsertions', undefined, {
      pageStart: args.pageStart as number | undefined,
      pageSize: args.pageSize as number | undefined,
    });
  }

  private async getSpotInsertion(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.request('GET', `/api/v2/spotinsertions/${encodeURIComponent(args.id as string)}`);
  }

  private async createSpotInsertion(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {};
    if (args.spotId) body.spotId = args.spotId;
    if (args.cueId) body.cueId = args.cueId;
    if (args.startDate) body.startDate = args.startDate;
    if (args.endDate) body.endDate = args.endDate;
    return this.request('POST', '/api/v2/spotinsertions', body);
  }

  private async deleteSpotInsertion(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.request('DELETE', `/api/v2/spotinsertions/${encodeURIComponent(args.id as string)}`);
  }

  // -- MetaPub (EPG Batch) ---------------------------------------------------

  private async createEpgBatch(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {};
    if (args.programId) body.programId = args.programId;
    if (args.contentUrl) body.contentUrl = args.contentUrl;
    if (args.startDate) body.startDate = args.startDate;
    if (args.endDate) body.endDate = args.endDate;
    return this.request('POST', '/api/v2/metapub/program-information/batch', body);
  }

  private async getEpgBatch(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.batchId) return { content: [{ type: 'text', text: 'batchId is required' }], isError: true };
    return this.request('GET', `/api/v2/metapub/program-information/batch/${encodeURIComponent(args.batchId as string)}`);
  }

  // -- CD Drive: Files -------------------------------------------------------

  private async uploadFile(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.filename || !args.contentType) {
      return { content: [{ type: 'text', text: 'filename and contentType are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      filename: args.filename,
      contentType: args.contentType,
    };
    if (args.folderId) body.folderId = args.folderId;
    return this.request('POST', '/api/v2/cddrive/files/content', body);
  }

  private async getFileInfo(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.fileId) return { content: [{ type: 'text', text: 'fileId is required' }], isError: true };
    return this.request('GET', `/api/v2/cddrive/files/${encodeURIComponent(args.fileId as string)}`);
  }

  private async deleteFile(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.fileId) return { content: [{ type: 'text', text: 'fileId is required' }], isError: true };
    return this.request('DELETE', `/api/v2/cddrive/files/${encodeURIComponent(args.fileId as string)}`);
  }

  private async getFileContent(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.fileId) return { content: [{ type: 'text', text: 'fileId is required' }], isError: true };
    return this.request('GET', `/api/v2/cddrive/files/${encodeURIComponent(args.fileId as string)}/content`);
  }

  // -- CD Drive: Folders -----------------------------------------------------

  private async createFolder(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    const body: Record<string, unknown> = { name: args.name };
    if (args.parentFolderId) body.parentFolderId = args.parentFolderId;
    return this.request('POST', '/api/v2/cddrive/folders', body);
  }

  private async getFolderInfo(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.folderId) return { content: [{ type: 'text', text: 'folderId is required' }], isError: true };
    return this.request('GET', `/api/v2/cddrive/folders/${encodeURIComponent(args.folderId as string)}`);
  }

  private async listFolderItems(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.folderId) return { content: [{ type: 'text', text: 'folderId is required' }], isError: true };
    return this.request('GET', `/api/v2/cddrive/folders/${encodeURIComponent(args.folderId as string)}/items`);
  }

  // -- RadioDNS --------------------------------------------------------------

  private async getRadioDnsGi(): Promise<ToolResult> {
    return this.request('GET', '/radiodns/spi/3.1/GI.xml');
  }

  private async getRadioDnsSi(): Promise<ToolResult> {
    return this.request('GET', '/radiodns/spi/3.1/SI.xml');
  }

  private async getRadioDnsPi(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.fqdn || !args.sid || !args.date) {
      return { content: [{ type: 'text', text: 'fqdn, sid, and date are required' }], isError: true };
    }
    const fqdn = encodeURIComponent(args.fqdn as string);
    const sid = encodeURIComponent(args.sid as string);
    const date = encodeURIComponent(args.date as string);
    return this.request('GET', `/radiodns/spi/3.1/id/${fqdn}/${sid}/${date}_PI.xml`);
  }
}
