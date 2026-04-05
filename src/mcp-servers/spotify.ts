/**
 * Spotify MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03. No official Spotify-maintained MCP server found on GitHub.
//   Community implementations exist but cover only 1-3 tools (search, play).
// Our adapter covers: 18 tools (search, browse, artists, albums, tracks, playlists, recommendations, user profile).
//   Community MCP servers are too limited for production use.
// Recommendation: Use this adapter. It covers the full Spotify Web API catalog surface.
//
// Base URL: https://api.spotify.com/v1
// Auth: OAuth2 Bearer access token (client_credentials for catalog; authorization_code for /me/* user endpoints).
// Docs: https://developer.spotify.com/documentation/web-api/
// Spec: https://api.apis.guru/v2/specs/spotify.com/1.0.0/openapi.json
// Rate limits: Dynamic per endpoint. Roughly 100-500 req/30s depending on tier. HTTP 429 + Retry-After on breach.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface SpotifyConfig {
  /** OAuth2 Bearer access token */
  accessToken: string;
  /** Optional base URL override (default: https://api.spotify.com/v1) */
  baseUrl?: string;
}


export class SpotifyMCPServer extends MCPAdapterBase {
  private readonly accessToken: string;
  private readonly baseUrl: string;

  constructor(config: SpotifyConfig) {
    super();
    this.accessToken = config.accessToken;
    this.baseUrl = config.baseUrl ?? 'https://api.spotify.com/v1';
  }

  static catalog() {
    return {
      name: 'spotify',
      displayName: 'Spotify',
      version: '1.0.0',
      category: 'music',
      keywords: [
        'spotify', 'music', 'song', 'track', 'artist', 'album', 'playlist',
        'podcast', 'episode', 'stream', 'audio', 'player', 'playback',
        'recommendation', 'genre', 'search', 'browse', 'new releases',
        'featured', 'top tracks', 'related artists', 'audio features',
        'danceability', 'energy', 'tempo', 'valence',
      ],
      toolNames: [
        'search_catalog',
        'get_track', 'get_audio_features', 'get_audio_analysis',
        'get_artist', 'get_artist_top_tracks', 'get_artist_albums', 'get_related_artists',
        'get_album', 'get_album_tracks',
        'get_playlist', 'get_playlist_tracks',
        'get_recommendations',
        'browse_new_releases', 'browse_featured_playlists', 'browse_categories',
        'get_current_user_profile', 'get_user_top_items',
      ],
      description: 'Spotify music catalog: search tracks/artists/albums/playlists, fetch audio features, get track recommendations by seed genres/artists/tracks, browse new releases and featured playlists.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'search_catalog',
        description: 'Search the Spotify catalog for tracks, artists, albums, playlists, podcasts, or episodes — returns ranked results with IDs and metadata',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query text (e.g. "Taylor Swift", "Blinding Lights", "workout playlist")',
            },
            type: {
              type: 'string',
              description: 'Comma-separated types to search: track, artist, album, playlist, show, episode (default: track,artist,album)',
            },
            market: {
              type: 'string',
              description: 'ISO 3166-1 alpha-2 country code to limit results to a specific market (e.g. US, GB)',
            },
            limit: {
              type: 'number',
              description: 'Max results per type, 1-50 (default: 20)',
            },
            offset: {
              type: 'number',
              description: 'Pagination offset — index of first result (default: 0)',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_track',
        description: 'Get full metadata for a Spotify track by ID including name, artists, album, duration, popularity score, and preview URL',
        inputSchema: {
          type: 'object',
          properties: {
            track_id: {
              type: 'string',
              description: 'Spotify track ID (22-char base-62 string, e.g. 4uLU6hMCjMI75M1A2tKUQC)',
            },
            market: {
              type: 'string',
              description: 'ISO 3166-1 alpha-2 market code for content availability (e.g. US)',
            },
          },
          required: ['track_id'],
        },
      },
      {
        name: 'get_audio_features',
        description: 'Get audio feature analysis for a track: danceability, energy, key, loudness, speechiness, acousticness, instrumentalness, liveness, valence, and tempo',
        inputSchema: {
          type: 'object',
          properties: {
            track_id: {
              type: 'string',
              description: 'Spotify track ID to analyze (e.g. 4uLU6hMCjMI75M1A2tKUQC)',
            },
          },
          required: ['track_id'],
        },
      },
      {
        name: 'get_audio_analysis',
        description: 'Get detailed low-level audio analysis for a track including sections, segments, beats, bars, and tatums (large response, auto-truncated at 10KB)',
        inputSchema: {
          type: 'object',
          properties: {
            track_id: {
              type: 'string',
              description: 'Spotify track ID to analyze',
            },
          },
          required: ['track_id'],
        },
      },
      {
        name: 'get_artist',
        description: 'Get Spotify artist profile including name, genres, follower count, popularity score, and image URLs',
        inputSchema: {
          type: 'object',
          properties: {
            artist_id: {
              type: 'string',
              description: 'Spotify artist ID (e.g. 06HL4z0CvFAxyc27GXpf02)',
            },
          },
          required: ['artist_id'],
        },
      },
      {
        name: 'get_artist_top_tracks',
        description: "Get an artist's top tracks in a specific market, ranked by Spotify popularity score",
        inputSchema: {
          type: 'object',
          properties: {
            artist_id: {
              type: 'string',
              description: 'Spotify artist ID',
            },
            market: {
              type: 'string',
              description: 'ISO 3166-1 alpha-2 market code — required by the API (e.g. US)',
            },
          },
          required: ['artist_id', 'market'],
        },
      },
      {
        name: 'get_artist_albums',
        description: "Get an artist's discography — albums, singles, compilations, and appears-on releases with pagination support",
        inputSchema: {
          type: 'object',
          properties: {
            artist_id: {
              type: 'string',
              description: 'Spotify artist ID',
            },
            include_groups: {
              type: 'string',
              description: 'Comma-separated release types: album, single, appears_on, compilation (default: album,single)',
            },
            market: {
              type: 'string',
              description: 'ISO 3166-1 alpha-2 market code to filter available releases',
            },
            limit: {
              type: 'number',
              description: 'Max results, 1-50 (default: 20)',
            },
            offset: {
              type: 'number',
              description: 'Pagination offset (default: 0)',
            },
          },
          required: ['artist_id'],
        },
      },
      {
        name: 'get_related_artists',
        description: "Get up to 20 artists similar to a given artist based on Spotify's listener analysis",
        inputSchema: {
          type: 'object',
          properties: {
            artist_id: {
              type: 'string',
              description: 'Spotify artist ID to find similar artists for',
            },
          },
          required: ['artist_id'],
        },
      },
      {
        name: 'get_album',
        description: 'Get full album metadata including tracks, release date, label, genres, copyrights, and available markets',
        inputSchema: {
          type: 'object',
          properties: {
            album_id: {
              type: 'string',
              description: 'Spotify album ID (e.g. 4aawyAB9vmqN3uQ7FjRGTy)',
            },
            market: {
              type: 'string',
              description: 'ISO 3166-1 alpha-2 market code',
            },
          },
          required: ['album_id'],
        },
      },
      {
        name: 'get_album_tracks',
        description: 'Get paginated track listing for an album with IDs, names, duration, and artist info',
        inputSchema: {
          type: 'object',
          properties: {
            album_id: {
              type: 'string',
              description: 'Spotify album ID',
            },
            market: {
              type: 'string',
              description: 'ISO 3166-1 alpha-2 market code',
            },
            limit: {
              type: 'number',
              description: 'Max tracks per page, 1-50 (default: 20)',
            },
            offset: {
              type: 'number',
              description: 'Pagination offset (default: 0)',
            },
          },
          required: ['album_id'],
        },
      },
      {
        name: 'get_playlist',
        description: 'Get full playlist metadata including name, description, owner, follower count, and snapshot ID',
        inputSchema: {
          type: 'object',
          properties: {
            playlist_id: {
              type: 'string',
              description: 'Spotify playlist ID (e.g. 37i9dQZF1DXcBWIGoYBM5M)',
            },
            market: {
              type: 'string',
              description: 'ISO 3166-1 alpha-2 market code for track availability',
            },
          },
          required: ['playlist_id'],
        },
      },
      {
        name: 'get_playlist_tracks',
        description: 'Get paginated track listing from a playlist with full track metadata and added-at timestamps',
        inputSchema: {
          type: 'object',
          properties: {
            playlist_id: {
              type: 'string',
              description: 'Spotify playlist ID',
            },
            market: {
              type: 'string',
              description: 'ISO 3166-1 alpha-2 market code',
            },
            limit: {
              type: 'number',
              description: 'Max tracks per page, 1-100 (default: 20)',
            },
            offset: {
              type: 'number',
              description: 'Pagination offset (default: 0)',
            },
          },
          required: ['playlist_id'],
        },
      },
      {
        name: 'get_recommendations',
        description: 'Get track recommendations seeded by up to 5 artists, tracks, or genres — supports audio feature tuning (danceability, energy, tempo, valence)',
        inputSchema: {
          type: 'object',
          properties: {
            seed_artists: {
              type: 'string',
              description: 'Comma-separated Spotify artist IDs as recommendation seeds (max 5 total seeds across all seed fields)',
            },
            seed_tracks: {
              type: 'string',
              description: 'Comma-separated Spotify track IDs as recommendation seeds (max 5 total seeds)',
            },
            seed_genres: {
              type: 'string',
              description: 'Comma-separated genre names as seeds (e.g. pop,rock,hip-hop — max 5 total seeds)',
            },
            limit: {
              type: 'number',
              description: 'Number of recommendations to return, 1-100 (default: 20)',
            },
            market: {
              type: 'string',
              description: 'ISO 3166-1 alpha-2 market code',
            },
            target_danceability: {
              type: 'number',
              description: 'Target danceability score 0.0-1.0',
            },
            target_energy: {
              type: 'number',
              description: 'Target energy score 0.0-1.0',
            },
            target_valence: {
              type: 'number',
              description: 'Target valence (happiness) score 0.0-1.0',
            },
            target_tempo: {
              type: 'number',
              description: 'Target tempo in BPM',
            },
            min_popularity: {
              type: 'number',
              description: 'Minimum track popularity score 0-100',
            },
          },
        },
      },
      {
        name: 'browse_new_releases',
        description: 'Browse new album releases on Spotify in a specific market, sorted by release date',
        inputSchema: {
          type: 'object',
          properties: {
            market: {
              type: 'string',
              description: 'ISO 3166-1 alpha-2 market code (e.g. US)',
            },
            limit: {
              type: 'number',
              description: 'Max albums to return, 1-50 (default: 20)',
            },
            offset: {
              type: 'number',
              description: 'Pagination offset (default: 0)',
            },
          },
        },
      },
      {
        name: 'browse_featured_playlists',
        description: "Browse Spotify's editorial featured playlists for a market — mood-based and curated collections",
        inputSchema: {
          type: 'object',
          properties: {
            market: {
              type: 'string',
              description: 'ISO 3166-1 alpha-2 market code (e.g. US)',
            },
            locale: {
              type: 'string',
              description: 'Locale for message and playlist names (e.g. en_US)',
            },
            limit: {
              type: 'number',
              description: 'Max playlists to return, 1-50 (default: 20)',
            },
            offset: {
              type: 'number',
              description: 'Pagination offset (default: 0)',
            },
          },
        },
      },
      {
        name: 'browse_categories',
        description: 'List Spotify browse categories (genres/moods like Pop, Workout, Sleep) with IDs for category-playlist lookups',
        inputSchema: {
          type: 'object',
          properties: {
            market: {
              type: 'string',
              description: 'ISO 3166-1 alpha-2 market code (e.g. US)',
            },
            locale: {
              type: 'string',
              description: 'Locale for category names (e.g. en_US)',
            },
            limit: {
              type: 'number',
              description: 'Max categories to return, 1-50 (default: 20)',
            },
            offset: {
              type: 'number',
              description: 'Pagination offset (default: 0)',
            },
          },
        },
      },
      {
        name: 'get_current_user_profile',
        description: "Get the authenticated user's Spotify profile including display name, follower count, country, and subscription level (requires user OAuth token)",
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_user_top_items',
        description: "Get the authenticated user's top artists or tracks over short, medium, or long term (requires user OAuth token with user-top-read scope)",
        inputSchema: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              description: 'Item type to fetch: artists or tracks (default: tracks)',
            },
            time_range: {
              type: 'string',
              description: 'Time range: short_term (4 weeks), medium_term (6 months), long_term (all time) (default: medium_term)',
            },
            limit: {
              type: 'number',
              description: 'Max items to return, 1-50 (default: 20)',
            },
            offset: {
              type: 'number',
              description: 'Pagination offset (default: 0)',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'search_catalog':            return this.searchCatalog(args);
        case 'get_track':                 return this.getTrack(args);
        case 'get_audio_features':        return this.getAudioFeatures(args);
        case 'get_audio_analysis':        return this.getAudioAnalysis(args);
        case 'get_artist':                return this.getArtist(args);
        case 'get_artist_top_tracks':     return this.getArtistTopTracks(args);
        case 'get_artist_albums':         return this.getArtistAlbums(args);
        case 'get_related_artists':       return this.getRelatedArtists(args);
        case 'get_album':                 return this.getAlbum(args);
        case 'get_album_tracks':          return this.getAlbumTracks(args);
        case 'get_playlist':              return this.getPlaylist(args);
        case 'get_playlist_tracks':       return this.getPlaylistTracks(args);
        case 'get_recommendations':       return this.getRecommendations(args);
        case 'browse_new_releases':       return this.browseNewReleases(args);
        case 'browse_featured_playlists': return this.browseFeaturedPlaylists(args);
        case 'browse_categories':         return this.browseCategories(args);
        case 'get_current_user_profile':  return this.getCurrentUserProfile();
        case 'get_user_top_items':        return this.getUserTopItems(args);
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

  // ── Helpers ─────────────────────────────────────────────────────────────────

  private headers(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
    };
  }

  private async get(path: string, params: Record<string, string | number | undefined> = {}): Promise<ToolResult> {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) qs.set(k, String(v));
    }
    const qsStr = qs.toString();
    const url = `${this.baseUrl}${path}${qsStr ? '?' + qsStr : ''}`;
    const response = await this.fetchWithRetry(url, { method: 'GET', headers: this.headers() });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Spotify returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  // ── Tool implementations ─────────────────────────────────────────────────────

  private async searchCatalog(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.query) return { content: [{ type: 'text', text: 'query is required' }], isError: true };
    return this.get('/search', {
      q: args.query as string,
      type: (args.type as string) ?? 'track,artist,album',
      market: args.market as string | undefined,
      limit: (args.limit as number) ?? 20,
      offset: (args.offset as number) ?? 0,
    });
  }

  private async getTrack(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.track_id) return { content: [{ type: 'text', text: 'track_id is required' }], isError: true };
    return this.get(`/tracks/${encodeURIComponent(args.track_id as string)}`, {
      market: args.market as string | undefined,
    });
  }

  private async getAudioFeatures(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.track_id) return { content: [{ type: 'text', text: 'track_id is required' }], isError: true };
    return this.get(`/audio-features/${encodeURIComponent(args.track_id as string)}`);
  }

  private async getAudioAnalysis(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.track_id) return { content: [{ type: 'text', text: 'track_id is required' }], isError: true };
    return this.get(`/audio-analysis/${encodeURIComponent(args.track_id as string)}`);
  }

  private async getArtist(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.artist_id) return { content: [{ type: 'text', text: 'artist_id is required' }], isError: true };
    return this.get(`/artists/${encodeURIComponent(args.artist_id as string)}`);
  }

  private async getArtistTopTracks(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.artist_id) return { content: [{ type: 'text', text: 'artist_id is required' }], isError: true };
    if (!args.market) return { content: [{ type: 'text', text: 'market is required' }], isError: true };
    return this.get(`/artists/${encodeURIComponent(args.artist_id as string)}/top-tracks`, {
      market: args.market as string,
    });
  }

  private async getArtistAlbums(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.artist_id) return { content: [{ type: 'text', text: 'artist_id is required' }], isError: true };
    return this.get(`/artists/${encodeURIComponent(args.artist_id as string)}/albums`, {
      include_groups: (args.include_groups as string) ?? 'album,single',
      market: args.market as string | undefined,
      limit: (args.limit as number) ?? 20,
      offset: (args.offset as number) ?? 0,
    });
  }

  private async getRelatedArtists(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.artist_id) return { content: [{ type: 'text', text: 'artist_id is required' }], isError: true };
    return this.get(`/artists/${encodeURIComponent(args.artist_id as string)}/related-artists`);
  }

  private async getAlbum(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.album_id) return { content: [{ type: 'text', text: 'album_id is required' }], isError: true };
    return this.get(`/albums/${encodeURIComponent(args.album_id as string)}`, {
      market: args.market as string | undefined,
    });
  }

  private async getAlbumTracks(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.album_id) return { content: [{ type: 'text', text: 'album_id is required' }], isError: true };
    return this.get(`/albums/${encodeURIComponent(args.album_id as string)}/tracks`, {
      market: args.market as string | undefined,
      limit: (args.limit as number) ?? 20,
      offset: (args.offset as number) ?? 0,
    });
  }

  private async getPlaylist(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.playlist_id) return { content: [{ type: 'text', text: 'playlist_id is required' }], isError: true };
    return this.get(`/playlists/${encodeURIComponent(args.playlist_id as string)}`, {
      market: args.market as string | undefined,
    });
  }

  private async getPlaylistTracks(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.playlist_id) return { content: [{ type: 'text', text: 'playlist_id is required' }], isError: true };
    return this.get(`/playlists/${encodeURIComponent(args.playlist_id as string)}/tracks`, {
      market: args.market as string | undefined,
      limit: (args.limit as number) ?? 20,
      offset: (args.offset as number) ?? 0,
    });
  }

  private async getRecommendations(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.seed_artists && !args.seed_tracks && !args.seed_genres) {
      return { content: [{ type: 'text', text: 'At least one of seed_artists, seed_tracks, or seed_genres is required' }], isError: true };
    }
    const params: Record<string, string | number | undefined> = {
      limit: (args.limit as number) ?? 20,
      market: args.market as string | undefined,
    };
    if (args.seed_artists) params.seed_artists = args.seed_artists as string;
    if (args.seed_tracks) params.seed_tracks = args.seed_tracks as string;
    if (args.seed_genres) params.seed_genres = args.seed_genres as string;
    if (args.target_danceability !== undefined) params.target_danceability = args.target_danceability as number;
    if (args.target_energy !== undefined) params.target_energy = args.target_energy as number;
    if (args.target_valence !== undefined) params.target_valence = args.target_valence as number;
    if (args.target_tempo !== undefined) params.target_tempo = args.target_tempo as number;
    if (args.min_popularity !== undefined) params.min_popularity = args.min_popularity as number;
    return this.get('/recommendations', params);
  }

  private async browseNewReleases(args: Record<string, unknown>): Promise<ToolResult> {
    return this.get('/browse/new-releases', {
      market: args.market as string | undefined,
      limit: (args.limit as number) ?? 20,
      offset: (args.offset as number) ?? 0,
    });
  }

  private async browseFeaturedPlaylists(args: Record<string, unknown>): Promise<ToolResult> {
    return this.get('/browse/featured-playlists', {
      market: args.market as string | undefined,
      locale: args.locale as string | undefined,
      limit: (args.limit as number) ?? 20,
      offset: (args.offset as number) ?? 0,
    });
  }

  private async browseCategories(args: Record<string, unknown>): Promise<ToolResult> {
    return this.get('/browse/categories', {
      market: args.market as string | undefined,
      locale: args.locale as string | undefined,
      limit: (args.limit as number) ?? 20,
      offset: (args.offset as number) ?? 0,
    });
  }

  private async getCurrentUserProfile(): Promise<ToolResult> {
    return this.get('/me');
  }

  private async getUserTopItems(args: Record<string, unknown>): Promise<ToolResult> {
    const type = (args.type as string) ?? 'tracks';
    if (!['artists', 'tracks'].includes(type)) {
      return { content: [{ type: 'text', text: 'type must be artists or tracks' }], isError: true };
    }
    return this.get(`/me/top/${encodeURIComponent(type)}`, {
      time_range: (args.time_range as string) ?? 'medium_term',
      limit: (args.limit as number) ?? 20,
      offset: (args.offset as number) ?? 0,
    });
  }
}
