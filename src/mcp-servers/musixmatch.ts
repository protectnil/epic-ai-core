/**
 * Musixmatch MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official Musixmatch MCP server was found on GitHub, npm, or Musixmatch developer docs.
// Our adapter covers: 16 tools. Vendor MCP: None.
// Recommendation: use-rest-api — no official MCP exists; REST adapter is the primary integration.
//
// Base URL: https://api.musixmatch.com/ws/1.1
// Auth: API key passed as query param `apikey` on every request
// Docs: https://developer.musixmatch.com/documentation
// Rate limits: Free plan — 2,000 requests/day. Commercial plans vary.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface MusixmatchConfig {
  /** Musixmatch API key. Obtain at https://developer.musixmatch.com/signup */
  apiKey: string;
  /** Base URL override. Defaults to https://api.musixmatch.com/ws/1.1 */
  baseUrl?: string;
}

export class MusixmatchMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: MusixmatchConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = (config.baseUrl ?? 'https://api.musixmatch.com/ws/1.1').replace(/\/$/, '');
  }

  static catalog() {
    return {
      name: 'musixmatch',
      displayName: 'Musixmatch',
      version: '1.0.0',
      category: 'music',
      keywords: [
        'musixmatch', 'music', 'lyrics', 'song', 'track', 'artist', 'album',
        'subtitle', 'snippet', 'chart', 'top tracks', 'top artists', 'search',
        'match', 'genre', 'karaoke',
      ],
      toolNames: [
        'search_tracks', 'get_track', 'get_track_lyrics', 'get_track_snippet',
        'get_track_subtitle', 'match_track', 'match_lyrics', 'match_subtitle',
        'search_artists', 'get_artist', 'get_artist_albums', 'get_artist_related',
        'get_album', 'get_album_tracks',
        'get_chart_tracks', 'get_chart_artists',
      ],
      description: 'Musixmatch lyrics database: search tracks, artists, and albums; retrieve lyrics, subtitles, snippets, and music charts.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Track Search & Retrieval ───────────────────────────────────────────
      {
        name: 'search_tracks',
        description: 'Search the Musixmatch catalog for tracks by track name, artist name, or lyrics text with optional filters and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            q_track: { type: 'string', description: 'Track title to search for' },
            q_artist: { type: 'string', description: 'Artist name to search for' },
            q_lyrics: { type: 'string', description: 'Lyric text to search for' },
            f_artist_id: { type: 'number', description: 'Filter results by Musixmatch artist ID' },
            f_music_genre_id: { type: 'number', description: 'Filter results by music genre ID' },
            f_lyrics_language: { type: 'string', description: 'Filter lyrics by ISO 639-1 language code (e.g. en, es, fr)' },
            f_has_lyrics: { type: 'number', description: 'Filter to tracks that have lyrics (1) or not (0)' },
            s_artist_rating: { type: 'string', description: 'Sort by artist rating: asc or desc' },
            s_track_rating: { type: 'string', description: 'Sort by track rating: asc or desc' },
            quorum_factor: { type: 'number', description: 'Search result quality factor between 0.1 and 0.9 (default: 0.6)' },
            page: { type: 'number', description: 'Pagination page number (1-based, default: 1)' },
            page_size: { type: 'number', description: 'Number of results per page (max: 100, default: 10)' },
          },
        },
      },
      {
        name: 'get_track',
        description: 'Get detailed metadata for a specific track by its Musixmatch track ID',
        inputSchema: {
          type: 'object',
          properties: {
            track_id: { type: 'number', description: 'Musixmatch numeric track ID' },
          },
          required: ['track_id'],
        },
      },
      {
        name: 'get_track_lyrics',
        description: 'Get the full lyrics for a track by its Musixmatch track ID',
        inputSchema: {
          type: 'object',
          properties: {
            track_id: { type: 'number', description: 'Musixmatch numeric track ID' },
          },
          required: ['track_id'],
        },
      },
      {
        name: 'get_track_snippet',
        description: 'Get a short lyrics snippet (hook/chorus) for a track by its Musixmatch track ID',
        inputSchema: {
          type: 'object',
          properties: {
            track_id: { type: 'number', description: 'Musixmatch numeric track ID' },
          },
          required: ['track_id'],
        },
      },
      {
        name: 'get_track_subtitle',
        description: 'Get the time-synced subtitle (LRC format) for a track by its Musixmatch track ID',
        inputSchema: {
          type: 'object',
          properties: {
            track_id: { type: 'number', description: 'Musixmatch numeric track ID' },
          },
          required: ['track_id'],
        },
      },
      // ── Track Matcher ──────────────────────────────────────────────────────
      {
        name: 'match_track',
        description: 'Find a Musixmatch track by matching on artist name and track title (fuzzy matching)',
        inputSchema: {
          type: 'object',
          properties: {
            q_artist: { type: 'string', description: 'Artist name to match' },
            q_track: { type: 'string', description: 'Track title to match' },
            f_has_lyrics: { type: 'number', description: 'Require lyrics (1) or not (0)' },
            f_has_subtitle: { type: 'number', description: 'Require subtitle (1) or not (0)' },
          },
          required: ['q_artist', 'q_track'],
        },
      },
      {
        name: 'match_lyrics',
        description: 'Find and return lyrics by matching on artist name and track title without needing a track ID',
        inputSchema: {
          type: 'object',
          properties: {
            q_track: { type: 'string', description: 'Track title to match' },
            q_artist: { type: 'string', description: 'Artist name to match' },
          },
          required: ['q_track', 'q_artist'],
        },
      },
      {
        name: 'match_subtitle',
        description: 'Find and return a time-synced subtitle by matching on artist name and track title',
        inputSchema: {
          type: 'object',
          properties: {
            q_track: { type: 'string', description: 'Track title to match' },
            q_artist: { type: 'string', description: 'Artist name to match' },
            f_subtitle_length: { type: 'number', description: 'Target subtitle duration in seconds' },
            f_subtitle_length_max_deviation: { type: 'number', description: 'Allowed deviation in seconds from f_subtitle_length' },
          },
          required: ['q_track', 'q_artist'],
        },
      },
      // ── Artist ─────────────────────────────────────────────────────────────
      {
        name: 'search_artists',
        description: 'Search the Musixmatch catalog for artists by name with optional pagination',
        inputSchema: {
          type: 'object',
          properties: {
            q_artist: { type: 'string', description: 'Artist name to search for' },
            f_artist_id: { type: 'number', description: 'Filter by Musixmatch artist ID' },
            page: { type: 'number', description: 'Pagination page number (1-based, default: 1)' },
            page_size: { type: 'number', description: 'Number of results per page (max: 100, default: 10)' },
          },
        },
      },
      {
        name: 'get_artist',
        description: 'Get detailed metadata for a specific artist by their Musixmatch artist ID',
        inputSchema: {
          type: 'object',
          properties: {
            artist_id: { type: 'number', description: 'Musixmatch numeric artist ID' },
          },
          required: ['artist_id'],
        },
      },
      {
        name: 'get_artist_albums',
        description: 'Get the discography (album list) for an artist by their Musixmatch artist ID',
        inputSchema: {
          type: 'object',
          properties: {
            artist_id: { type: 'number', description: 'Musixmatch numeric artist ID' },
            s_release_date: { type: 'string', description: 'Sort albums by release date: asc or desc' },
            g_album_name: { type: 'number', description: 'Group albums by name to remove duplicates (1 = yes)' },
            page: { type: 'number', description: 'Pagination page number (1-based, default: 1)' },
            page_size: { type: 'number', description: 'Number of albums per page (max: 100, default: 10)' },
          },
          required: ['artist_id'],
        },
      },
      {
        name: 'get_artist_related',
        description: 'Get a list of artists related to or similar to a given Musixmatch artist',
        inputSchema: {
          type: 'object',
          properties: {
            artist_id: { type: 'number', description: 'Musixmatch numeric artist ID' },
            page: { type: 'number', description: 'Pagination page number (1-based, default: 1)' },
            page_size: { type: 'number', description: 'Number of related artists per page (max: 100, default: 10)' },
          },
          required: ['artist_id'],
        },
      },
      // ── Album ──────────────────────────────────────────────────────────────
      {
        name: 'get_album',
        description: 'Get detailed metadata for a specific album by its Musixmatch album ID',
        inputSchema: {
          type: 'object',
          properties: {
            album_id: { type: 'number', description: 'Musixmatch numeric album ID' },
          },
          required: ['album_id'],
        },
      },
      {
        name: 'get_album_tracks',
        description: 'Get the track listing for an album by its Musixmatch album ID',
        inputSchema: {
          type: 'object',
          properties: {
            album_id: { type: 'number', description: 'Musixmatch numeric album ID' },
            f_has_lyrics: { type: 'number', description: 'Filter to tracks that have lyrics (1) or not (0)' },
            page: { type: 'number', description: 'Pagination page number (1-based, default: 1)' },
            page_size: { type: 'number', description: 'Number of tracks per page (max: 100, default: 10)' },
          },
          required: ['album_id'],
        },
      },
      // ── Charts ─────────────────────────────────────────────────────────────
      {
        name: 'get_chart_tracks',
        description: 'Get the top tracks chart from Musixmatch, optionally filtered by country',
        inputSchema: {
          type: 'object',
          properties: {
            country: { type: 'string', description: 'ISO 3166-1 alpha-2 country code (e.g. us, gb, de). Omit for global chart.' },
            f_has_lyrics: { type: 'number', description: 'Filter to tracks with lyrics only (1)' },
            page: { type: 'number', description: 'Pagination page number (1-based, default: 1)' },
            page_size: { type: 'number', description: 'Number of chart entries per page (max: 100, default: 10)' },
          },
        },
      },
      {
        name: 'get_chart_artists',
        description: 'Get the top artists chart from Musixmatch, optionally filtered by country',
        inputSchema: {
          type: 'object',
          properties: {
            country: { type: 'string', description: 'ISO 3166-1 alpha-2 country code (e.g. us, gb, de). Omit for global chart.' },
            page: { type: 'number', description: 'Pagination page number (1-based, default: 1)' },
            page_size: { type: 'number', description: 'Number of chart entries per page (max: 100, default: 10)' },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'search_tracks':       return await this.searchTracks(args);
        case 'get_track':           return await this.getTrack(args);
        case 'get_track_lyrics':    return await this.getTrackLyrics(args);
        case 'get_track_snippet':   return await this.getTrackSnippet(args);
        case 'get_track_subtitle':  return await this.getTrackSubtitle(args);
        case 'match_track':         return await this.matchTrack(args);
        case 'match_lyrics':        return await this.matchLyrics(args);
        case 'match_subtitle':      return await this.matchSubtitle(args);
        case 'search_artists':      return await this.searchArtists(args);
        case 'get_artist':          return await this.getArtist(args);
        case 'get_artist_albums':   return await this.getArtistAlbums(args);
        case 'get_artist_related':  return await this.getArtistRelated(args);
        case 'get_album':           return await this.getAlbum(args);
        case 'get_album_tracks':    return await this.getAlbumTracks(args);
        case 'get_chart_tracks':    return await this.getChartTracks(args);
        case 'get_chart_artists':   return await this.getChartArtists(args);
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

  private buildUrl(endpoint: string, params: Record<string, unknown> = {}): string {
    const qs = new URLSearchParams({ apikey: this.apiKey, format: 'json' });
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') {
        qs.set(k, String(v));
      }
    }
    return `${this.baseUrl}/${endpoint}?${qs.toString()}`;
  }

  private async get(endpoint: string, params: Record<string, unknown> = {}): Promise<ToolResult> {
    const url = this.buildUrl(endpoint, params);
    const response = await this.fetchWithRetry(url, {
      headers: { 'Accept': 'application/json' },
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json() as Record<string, unknown>;
    // Musixmatch wraps all responses in { message: { header: { status_code }, body: { ... } } }
    const msg = (data as Record<string, unknown>).message as Record<string, unknown> | undefined;
    const statusCode = (msg?.header as Record<string, unknown> | undefined)?.status_code;
    if (statusCode && statusCode !== 200) {
      return { content: [{ type: 'text', text: `Musixmatch API error: status_code ${statusCode}` }], isError: true };
    }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  // ── Track methods ──────────────────────────────────────────────────────────

  private async searchTracks(args: Record<string, unknown>): Promise<ToolResult> {
    return this.get('track.search', {
      q_track: args.q_track,
      q_artist: args.q_artist,
      q_lyrics: args.q_lyrics,
      f_artist_id: args.f_artist_id,
      f_music_genre_id: args.f_music_genre_id,
      f_lyrics_language: args.f_lyrics_language,
      f_has_lyrics: args.f_has_lyrics,
      s_artist_rating: args.s_artist_rating,
      s_track_rating: args.s_track_rating,
      quorum_factor: args.quorum_factor,
      page: args.page,
      page_size: args.page_size,
    });
  }

  private async getTrack(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.track_id) return { content: [{ type: 'text', text: 'track_id is required' }], isError: true };
    return this.get('track.get', { track_id: args.track_id });
  }

  private async getTrackLyrics(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.track_id) return { content: [{ type: 'text', text: 'track_id is required' }], isError: true };
    return this.get('track.lyrics.get', { track_id: args.track_id });
  }

  private async getTrackSnippet(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.track_id) return { content: [{ type: 'text', text: 'track_id is required' }], isError: true };
    return this.get('track.snippet.get', { track_id: args.track_id });
  }

  private async getTrackSubtitle(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.track_id) return { content: [{ type: 'text', text: 'track_id is required' }], isError: true };
    return this.get('track.subtitle.get', { track_id: args.track_id });
  }

  private async matchTrack(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.q_artist || !args.q_track) {
      return { content: [{ type: 'text', text: 'q_artist and q_track are required' }], isError: true };
    }
    return this.get('matcher.track.get', {
      q_artist: args.q_artist,
      q_track: args.q_track,
      f_has_lyrics: args.f_has_lyrics,
      f_has_subtitle: args.f_has_subtitle,
    });
  }

  private async matchLyrics(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.q_track || !args.q_artist) {
      return { content: [{ type: 'text', text: 'q_track and q_artist are required' }], isError: true };
    }
    return this.get('matcher.lyrics.get', { q_track: args.q_track, q_artist: args.q_artist });
  }

  private async matchSubtitle(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.q_track || !args.q_artist) {
      return { content: [{ type: 'text', text: 'q_track and q_artist are required' }], isError: true };
    }
    return this.get('matcher.subtitle.get', {
      q_track: args.q_track,
      q_artist: args.q_artist,
      f_subtitle_length: args.f_subtitle_length,
      f_subtitle_length_max_deviation: args.f_subtitle_length_max_deviation,
    });
  }

  // ── Artist methods ─────────────────────────────────────────────────────────

  private async searchArtists(args: Record<string, unknown>): Promise<ToolResult> {
    return this.get('artist.search', {
      q_artist: args.q_artist,
      f_artist_id: args.f_artist_id,
      page: args.page,
      page_size: args.page_size,
    });
  }

  private async getArtist(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.artist_id) return { content: [{ type: 'text', text: 'artist_id is required' }], isError: true };
    return this.get('artist.get', { artist_id: args.artist_id });
  }

  private async getArtistAlbums(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.artist_id) return { content: [{ type: 'text', text: 'artist_id is required' }], isError: true };
    return this.get('artist.albums.get', {
      artist_id: args.artist_id,
      s_release_date: args.s_release_date,
      g_album_name: args.g_album_name,
      page: args.page,
      page_size: args.page_size,
    });
  }

  private async getArtistRelated(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.artist_id) return { content: [{ type: 'text', text: 'artist_id is required' }], isError: true };
    return this.get('artist.related.get', {
      artist_id: args.artist_id,
      page: args.page,
      page_size: args.page_size,
    });
  }

  // ── Album methods ──────────────────────────────────────────────────────────

  private async getAlbum(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.album_id) return { content: [{ type: 'text', text: 'album_id is required' }], isError: true };
    return this.get('album.get', { album_id: args.album_id });
  }

  private async getAlbumTracks(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.album_id) return { content: [{ type: 'text', text: 'album_id is required' }], isError: true };
    return this.get('album.tracks.get', {
      album_id: args.album_id,
      f_has_lyrics: args.f_has_lyrics,
      page: args.page,
      page_size: args.page_size,
    });
  }

  // ── Chart methods ──────────────────────────────────────────────────────────

  private async getChartTracks(args: Record<string, unknown>): Promise<ToolResult> {
    return this.get('chart.tracks.get', {
      country: args.country,
      f_has_lyrics: args.f_has_lyrics,
      page: args.page,
      page_size: args.page_size,
    });
  }

  private async getChartArtists(args: Record<string, unknown>): Promise<ToolResult> {
    return this.get('chart.artists.get', {
      country: args.country,
      page: args.page,
      page_size: args.page_size,
    });
  }
}
