/**
 * Spotify Web API MCP Adapter (sonallux edition)
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official Spotify MCP server was found on GitHub.
//
// Base URL: https://api.spotify.com/v1
// Auth: OAuth 2.0 Bearer token (Authorization Code or Client Credentials flow).
//   Token URL: https://accounts.spotify.com/api/token
//   Authorization URL: https://accounts.spotify.com/authorize
//   Pass the access_token in the constructor. Refresh handling is the caller's responsibility.
// Docs: https://developer.spotify.com/documentation/web-api/
// Spec: https://api.apis.guru/v2/specs/spotify.com/sonallux/2023.2.27/openapi.json
//   Source: https://github.com/sonallux/spotify-web-api (community-maintained fixes)
// Rate limits: Per-endpoint rate limits enforced by Spotify. 429 responses include
//   Retry-After header. Most read endpoints: ~180 req/30s window per user.
// Note: Some endpoints require specific OAuth scopes (e.g. user-library-read,
//   user-read-playback-state). Scope errors return 403. Playback control requires
//   a Spotify Premium account.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface SpotifySonalluxConfig {
  /** Spotify OAuth 2.0 access token */
  accessToken: string;
  /** Optional base URL override (default: https://api.spotify.com/v1) */
  baseUrl?: string;
}

export class SpotifySonalluxMCPServer extends MCPAdapterBase {
  private readonly accessToken: string;
  private readonly baseUrl: string;

  constructor(config: SpotifySonalluxConfig) {
    super();
    this.accessToken = config.accessToken;
    this.baseUrl = (config.baseUrl ?? 'https://api.spotify.com/v1').replace(/\/$/, '');
  }

  static catalog() {
    return {
      name: 'spotify-sonallux',
      displayName: 'Spotify Web API (sonallux)',
      version: '2023.2.27',
      category: 'music' as const,
      keywords: [
        'spotify', 'music', 'audio', 'streaming', 'playlist', 'album', 'artist',
        'track', 'song', 'podcast', 'show', 'episode', 'audiobook', 'chapter',
        'search', 'recommendations', 'browse', 'categories', 'featured',
        'new-releases', 'top-tracks', 'related-artists', 'audio-features',
        'audio-analysis', 'playback', 'player', 'queue', 'devices', 'shuffle',
        'repeat', 'volume', 'seek', 'saved', 'library', 'follow', 'markets',
        'genres', 'sepa',
      ],
      toolNames: [
        'search',
        'get_track',
        'get_several_tracks',
        'get_audio_features',
        'get_several_audio_features',
        'get_audio_analysis',
        'get_album',
        'get_several_albums',
        'get_album_tracks',
        'get_artist',
        'get_several_artists',
        'get_artist_albums',
        'get_artist_top_tracks',
        'get_artist_related_artists',
        'get_playlist',
        'get_playlist_tracks',
        'get_playlist_cover',
        'get_show',
        'get_several_shows',
        'get_show_episodes',
        'get_episode',
        'get_several_episodes',
        'get_audiobook',
        'get_several_audiobooks',
        'get_audiobook_chapters',
        'get_chapter',
        'get_several_chapters',
        'get_recommendations',
        'get_recommendation_genres',
        'get_new_releases',
        'get_featured_playlists',
        'get_categories',
        'get_category',
        'get_category_playlists',
        'get_available_markets',
        'get_current_user_profile',
        'get_user_profile',
        'get_current_user_playlists',
        'get_user_playlists',
        'get_user_top_artists',
        'get_user_top_tracks',
        'get_user_saved_tracks',
        'check_user_saved_tracks',
        'save_tracks',
        'remove_saved_tracks',
        'get_user_saved_albums',
        'check_user_saved_albums',
        'save_albums',
        'remove_saved_albums',
        'get_user_saved_shows',
        'check_user_saved_shows',
        'save_shows',
        'remove_saved_shows',
        'get_user_saved_episodes',
        'check_user_saved_episodes',
        'save_episodes',
        'remove_saved_episodes',
        'get_user_saved_audiobooks',
        'check_user_saved_audiobooks',
        'save_audiobooks',
        'remove_saved_audiobooks',
        'get_followed_artists',
        'follow_artists_or_users',
        'unfollow_artists_or_users',
        'check_user_follows',
        'follow_playlist',
        'unfollow_playlist',
        'check_if_users_follow_playlist',
        'get_playback_state',
        'get_currently_playing',
        'get_available_devices',
        'get_recently_played',
        'get_user_queue',
        'start_playback',
        'pause_playback',
        'skip_to_next',
        'skip_to_previous',
        'seek_to_position',
        'set_repeat_mode',
        'set_volume',
        'toggle_shuffle',
        'transfer_playback',
        'add_to_queue',
        'create_playlist',
        'change_playlist_details',
        'add_tracks_to_playlist',
        'update_playlist_items',
        'remove_playlist_items',
        'upload_playlist_cover',
      ],
      description: 'Full Spotify Web API: search, browse, and stream music; manage playlists, saved content, and library; control playback across devices; access audio features and analysis; explore artists, albums, tracks, podcasts, shows, episodes, and audiobooks.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Search ──────────────────────────────────────────────────────────────
      {
        name: 'search',
        description: 'Search Spotify catalog for tracks, albums, artists, playlists, shows, episodes, or audiobooks. Returns paginated results.',
        inputSchema: {
          type: 'object',
          properties: {
            q: { type: 'string', description: 'Search query (e.g. "Bohemian Rhapsody" or "artist:Queen album:Innuendo")' },
            type: { type: 'string', description: 'Comma-separated list of item types: album, artist, playlist, track, show, episode, audiobook (e.g. "track,album")' },
            market: { type: 'string', description: 'ISO 3166-1 alpha-2 country code to filter results by market (e.g. "US")' },
            limit: { type: 'number', description: 'Maximum number of results per type (1–50, default 20)' },
            offset: { type: 'number', description: 'Pagination offset (default 0)' },
            include_external: { type: 'string', description: 'If "audio", includes externally hosted audio. Optional.' },
          },
          required: ['q', 'type'],
        },
      },
      // ── Tracks ──────────────────────────────────────────────────────────────
      {
        name: 'get_track',
        description: 'Get Spotify catalog information for a single track by its Spotify ID.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Spotify track ID (e.g. "11dFghVXANMlKmJXsNCbNl")' },
            market: { type: 'string', description: 'ISO 3166-1 alpha-2 country code for market filtering. Optional.' },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_several_tracks',
        description: 'Get Spotify catalog information for multiple tracks by their Spotify IDs (max 50).',
        inputSchema: {
          type: 'object',
          properties: {
            ids: { type: 'string', description: 'Comma-separated list of Spotify track IDs (max 50, e.g. "3n3Ppam7vgaVa1iaRUIOKE,3twNvmDtFriZZR6cv18y9")' },
            market: { type: 'string', description: 'ISO 3166-1 alpha-2 country code. Optional.' },
          },
          required: ['ids'],
        },
      },
      {
        name: 'get_audio_features',
        description: 'Get audio feature information for a single track: danceability, energy, key, loudness, mode, speechiness, acousticness, instrumentalness, liveness, valence, tempo, duration, time_signature.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Spotify track ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_several_audio_features',
        description: 'Get audio features for multiple tracks (max 100). Returns danceability, energy, tempo, valence, and more for each track.',
        inputSchema: {
          type: 'object',
          properties: {
            ids: { type: 'string', description: 'Comma-separated list of Spotify track IDs (max 100)' },
          },
          required: ['ids'],
        },
      },
      {
        name: 'get_audio_analysis',
        description: "Get detailed audio analysis for a track: sections, segments, beats, bars, tatums, pitch, timbre, loudness. Useful for music visualization and deep audio processing.",
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Spotify track ID' },
          },
          required: ['id'],
        },
      },
      // ── Albums ──────────────────────────────────────────────────────────────
      {
        name: 'get_album',
        description: 'Get Spotify catalog information for a single album.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Spotify album ID' },
            market: { type: 'string', description: 'ISO 3166-1 alpha-2 country code. Optional.' },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_several_albums',
        description: 'Get Spotify catalog information for multiple albums (max 20).',
        inputSchema: {
          type: 'object',
          properties: {
            ids: { type: 'string', description: 'Comma-separated Spotify album IDs (max 20)' },
            market: { type: 'string', description: 'ISO 3166-1 alpha-2 country code. Optional.' },
          },
          required: ['ids'],
        },
      },
      {
        name: 'get_album_tracks',
        description: "Get Spotify catalog information about an album's tracks.",
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Spotify album ID' },
            market: { type: 'string', description: 'ISO 3166-1 alpha-2 country code. Optional.' },
            limit: { type: 'number', description: 'Max number of tracks (1–50, default 20)' },
            offset: { type: 'number', description: 'Pagination offset (default 0)' },
          },
          required: ['id'],
        },
      },
      // ── Artists ─────────────────────────────────────────────────────────────
      {
        name: 'get_artist',
        description: 'Get Spotify catalog information for a single artist.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Spotify artist ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_several_artists',
        description: 'Get Spotify catalog information for multiple artists (max 50).',
        inputSchema: {
          type: 'object',
          properties: {
            ids: { type: 'string', description: 'Comma-separated Spotify artist IDs (max 50)' },
          },
          required: ['ids'],
        },
      },
      {
        name: 'get_artist_albums',
        description: "Get Spotify catalog information about an artist's albums.",
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Spotify artist ID' },
            include_groups: { type: 'string', description: 'Comma-separated filter: album, single, appears_on, compilation. Optional.' },
            market: { type: 'string', description: 'ISO 3166-1 alpha-2 country code. Optional.' },
            limit: { type: 'number', description: 'Max results (1–50, default 20)' },
            offset: { type: 'number', description: 'Pagination offset (default 0)' },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_artist_top_tracks',
        description: "Get Spotify catalog information about an artist's top tracks.",
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Spotify artist ID' },
            market: { type: 'string', description: 'ISO 3166-1 alpha-2 country code (e.g. "US"). Optional.' },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_artist_related_artists',
        description: 'Get Spotify catalog information about artists similar to the given artist.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Spotify artist ID' },
          },
          required: ['id'],
        },
      },
      // ── Playlists ────────────────────────────────────────────────────────────
      {
        name: 'get_playlist',
        description: 'Get a playlist owned by a Spotify user.',
        inputSchema: {
          type: 'object',
          properties: {
            playlist_id: { type: 'string', description: 'Spotify playlist ID' },
            market: { type: 'string', description: 'ISO 3166-1 alpha-2 country code. Optional.' },
            fields: { type: 'string', description: 'Filters for the query: a comma-separated list of fields to return. Optional.' },
            additional_types: { type: 'string', description: 'Comma-separated list of item types: track, episode. Optional.' },
          },
          required: ['playlist_id'],
        },
      },
      {
        name: 'get_playlist_tracks',
        description: 'Get full details of the tracks or episodes of a playlist.',
        inputSchema: {
          type: 'object',
          properties: {
            playlist_id: { type: 'string', description: 'Spotify playlist ID' },
            market: { type: 'string', description: 'ISO 3166-1 alpha-2 country code. Optional.' },
            fields: { type: 'string', description: 'Comma-separated list of fields to return. Optional.' },
            limit: { type: 'number', description: 'Max results (1–100, default 20)' },
            offset: { type: 'number', description: 'Pagination offset (default 0)' },
            additional_types: { type: 'string', description: 'Comma-separated list of item types: track, episode. Optional.' },
          },
          required: ['playlist_id'],
        },
      },
      {
        name: 'get_playlist_cover',
        description: 'Get the current image associated with a specific playlist.',
        inputSchema: {
          type: 'object',
          properties: {
            playlist_id: { type: 'string', description: 'Spotify playlist ID' },
          },
          required: ['playlist_id'],
        },
      },
      // ── Shows / Podcasts ─────────────────────────────────────────────────────
      {
        name: 'get_show',
        description: 'Get Spotify catalog information for a single show (podcast).',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Spotify show ID' },
            market: { type: 'string', description: 'ISO 3166-1 alpha-2 country code. Optional.' },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_several_shows',
        description: 'Get Spotify catalog information for multiple shows (podcasts, max 50).',
        inputSchema: {
          type: 'object',
          properties: {
            ids: { type: 'string', description: 'Comma-separated Spotify show IDs (max 50)' },
            market: { type: 'string', description: 'ISO 3166-1 alpha-2 country code. Optional.' },
          },
          required: ['ids'],
        },
      },
      {
        name: 'get_show_episodes',
        description: "Get Spotify catalog information about a show's episodes.",
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Spotify show ID' },
            market: { type: 'string', description: 'ISO 3166-1 alpha-2 country code. Optional.' },
            limit: { type: 'number', description: 'Max results (1–50, default 20)' },
            offset: { type: 'number', description: 'Pagination offset (default 0)' },
          },
          required: ['id'],
        },
      },
      // ── Episodes ─────────────────────────────────────────────────────────────
      {
        name: 'get_episode',
        description: 'Get Spotify catalog information for a single episode.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Spotify episode ID' },
            market: { type: 'string', description: 'ISO 3166-1 alpha-2 country code. Optional.' },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_several_episodes',
        description: 'Get Spotify catalog information for multiple episodes (max 50).',
        inputSchema: {
          type: 'object',
          properties: {
            ids: { type: 'string', description: 'Comma-separated Spotify episode IDs (max 50)' },
            market: { type: 'string', description: 'ISO 3166-1 alpha-2 country code. Optional.' },
          },
          required: ['ids'],
        },
      },
      // ── Audiobooks ───────────────────────────────────────────────────────────
      {
        name: 'get_audiobook',
        description: 'Get Spotify catalog information for a single audiobook.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Spotify audiobook ID' },
            market: { type: 'string', description: 'ISO 3166-1 alpha-2 country code. Optional.' },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_several_audiobooks',
        description: 'Get Spotify catalog information for multiple audiobooks (max 50).',
        inputSchema: {
          type: 'object',
          properties: {
            ids: { type: 'string', description: 'Comma-separated Spotify audiobook IDs (max 50)' },
            market: { type: 'string', description: 'ISO 3166-1 alpha-2 country code. Optional.' },
          },
          required: ['ids'],
        },
      },
      {
        name: 'get_audiobook_chapters',
        description: 'Get Spotify catalog information about an audiobook\'s chapters.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Spotify audiobook ID' },
            market: { type: 'string', description: 'ISO 3166-1 alpha-2 country code. Optional.' },
            limit: { type: 'number', description: 'Max results (1–50, default 20)' },
            offset: { type: 'number', description: 'Pagination offset (default 0)' },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_chapter',
        description: 'Get Spotify catalog information for a single audiobook chapter.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Spotify chapter ID' },
            market: { type: 'string', description: 'ISO 3166-1 alpha-2 country code. Optional.' },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_several_chapters',
        description: 'Get Spotify catalog information for multiple audiobook chapters (max 50).',
        inputSchema: {
          type: 'object',
          properties: {
            ids: { type: 'string', description: 'Comma-separated Spotify chapter IDs (max 50)' },
            market: { type: 'string', description: 'ISO 3166-1 alpha-2 country code. Optional.' },
          },
          required: ['ids'],
        },
      },
      // ── Discovery / Browse ───────────────────────────────────────────────────
      {
        name: 'get_recommendations',
        description: 'Get track recommendations based on seed artists, tracks, and genres. Use audio feature parameters (target_energy, target_danceability, etc.) to tune results.',
        inputSchema: {
          type: 'object',
          properties: {
            seed_artists: { type: 'string', description: 'Comma-separated Spotify artist IDs (up to 5 total seeds combined)' },
            seed_tracks: { type: 'string', description: 'Comma-separated Spotify track IDs (up to 5 total seeds combined)' },
            seed_genres: { type: 'string', description: 'Comma-separated genre names from get_recommendation_genres (up to 5 total seeds combined)' },
            limit: { type: 'number', description: 'Number of recommendation tracks (1–100, default 20)' },
            market: { type: 'string', description: 'ISO 3166-1 alpha-2 country code. Optional.' },
            min_acousticness: { type: 'number', description: 'Minimum acousticness (0.0–1.0). Optional.' },
            max_acousticness: { type: 'number', description: 'Maximum acousticness (0.0–1.0). Optional.' },
            target_acousticness: { type: 'number', description: 'Target acousticness (0.0–1.0). Optional.' },
            min_danceability: { type: 'number', description: 'Minimum danceability (0.0–1.0). Optional.' },
            max_danceability: { type: 'number', description: 'Maximum danceability (0.0–1.0). Optional.' },
            target_danceability: { type: 'number', description: 'Target danceability (0.0–1.0). Optional.' },
            min_energy: { type: 'number', description: 'Minimum energy (0.0–1.0). Optional.' },
            max_energy: { type: 'number', description: 'Maximum energy (0.0–1.0). Optional.' },
            target_energy: { type: 'number', description: 'Target energy (0.0–1.0). Optional.' },
            min_tempo: { type: 'number', description: 'Minimum tempo in BPM. Optional.' },
            max_tempo: { type: 'number', description: 'Maximum tempo in BPM. Optional.' },
            target_tempo: { type: 'number', description: 'Target tempo in BPM. Optional.' },
            min_valence: { type: 'number', description: 'Minimum valence / positiveness (0.0–1.0). Optional.' },
            max_valence: { type: 'number', description: 'Maximum valence / positiveness (0.0–1.0). Optional.' },
            target_valence: { type: 'number', description: 'Target valence / positiveness (0.0–1.0). Optional.' },
            min_popularity: { type: 'number', description: 'Minimum popularity score (0–100). Optional.' },
            max_popularity: { type: 'number', description: 'Maximum popularity score (0–100). Optional.' },
            target_popularity: { type: 'number', description: 'Target popularity score (0–100). Optional.' },
          },
        },
      },
      {
        name: 'get_recommendation_genres',
        description: 'Get a list of available genre seeds that can be used with get_recommendations.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_new_releases',
        description: 'Get a list of new album releases featured in Spotify.',
        inputSchema: {
          type: 'object',
          properties: {
            country: { type: 'string', description: 'ISO 3166-1 alpha-2 country code. Optional.' },
            limit: { type: 'number', description: 'Max results (1–50, default 20)' },
            offset: { type: 'number', description: 'Pagination offset (default 0)' },
          },
        },
      },
      {
        name: 'get_featured_playlists',
        description: "Get a list of Spotify featured playlists (shown on Spotify's browse tab).",
        inputSchema: {
          type: 'object',
          properties: {
            country: { type: 'string', description: 'ISO 3166-1 alpha-2 country code. Optional.' },
            locale: { type: 'string', description: 'Locale for the response language (e.g. "sv_SE"). Optional.' },
            timestamp: { type: 'string', description: 'ISO 8601 datetime string for time-based featured playlists. Optional.' },
            limit: { type: 'number', description: 'Max results (1–50, default 20)' },
            offset: { type: 'number', description: 'Pagination offset (default 0)' },
          },
        },
      },
      {
        name: 'get_categories',
        description: 'Get a list of categories used to tag items in Spotify.',
        inputSchema: {
          type: 'object',
          properties: {
            country: { type: 'string', description: 'ISO 3166-1 alpha-2 country code. Optional.' },
            locale: { type: 'string', description: 'Locale (e.g. "sv_SE"). Optional.' },
            limit: { type: 'number', description: 'Max results (1–50, default 20)' },
            offset: { type: 'number', description: 'Pagination offset (default 0)' },
          },
        },
      },
      {
        name: 'get_category',
        description: 'Get a single category used to tag items in Spotify.',
        inputSchema: {
          type: 'object',
          properties: {
            category_id: { type: 'string', description: 'Spotify category ID (e.g. "party")' },
            country: { type: 'string', description: 'ISO 3166-1 alpha-2 country code. Optional.' },
            locale: { type: 'string', description: 'Locale (e.g. "sv_SE"). Optional.' },
          },
          required: ['category_id'],
        },
      },
      {
        name: 'get_category_playlists',
        description: "Get a list of Spotify playlists tagged with a particular category.",
        inputSchema: {
          type: 'object',
          properties: {
            category_id: { type: 'string', description: 'Spotify category ID (e.g. "party")' },
            country: { type: 'string', description: 'ISO 3166-1 alpha-2 country code. Optional.' },
            limit: { type: 'number', description: 'Max results (1–50, default 20)' },
            offset: { type: 'number', description: 'Pagination offset (default 0)' },
          },
          required: ['category_id'],
        },
      },
      {
        name: 'get_available_markets',
        description: 'Get the list of markets (country codes) where Spotify is available.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      // ── Users ────────────────────────────────────────────────────────────────
      {
        name: 'get_current_user_profile',
        description: "Get detailed profile information about the current user. Requires user-read-private and user-read-email scopes.",
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_user_profile',
        description: "Get public profile information about a Spotify user.",
        inputSchema: {
          type: 'object',
          properties: {
            user_id: { type: 'string', description: 'Spotify user ID' },
          },
          required: ['user_id'],
        },
      },
      {
        name: 'get_current_user_playlists',
        description: "Get a list of the playlists owned or followed by the current Spotify user. Requires playlist-read-private scope.",
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Max results (1–50, default 20)' },
            offset: { type: 'number', description: 'Pagination offset (default 0)' },
          },
        },
      },
      {
        name: 'get_user_playlists',
        description: "Get a list of the playlists owned or followed by a Spotify user.",
        inputSchema: {
          type: 'object',
          properties: {
            user_id: { type: 'string', description: 'Spotify user ID' },
            limit: { type: 'number', description: 'Max results (1–50, default 20)' },
            offset: { type: 'number', description: 'Pagination offset (default 0)' },
          },
          required: ['user_id'],
        },
      },
      {
        name: 'get_user_top_artists',
        description: "Get the current user's top artists based on affinity. Requires user-top-read scope.",
        inputSchema: {
          type: 'object',
          properties: {
            time_range: { type: 'string', description: 'Time window: short_term (~4 weeks), medium_term (~6 months, default), long_term (several years)' },
            limit: { type: 'number', description: 'Max results (1–50, default 20)' },
            offset: { type: 'number', description: 'Pagination offset (default 0)' },
          },
        },
      },
      {
        name: 'get_user_top_tracks',
        description: "Get the current user's top tracks based on affinity. Requires user-top-read scope.",
        inputSchema: {
          type: 'object',
          properties: {
            time_range: { type: 'string', description: 'Time window: short_term (~4 weeks), medium_term (~6 months, default), long_term (several years)' },
            limit: { type: 'number', description: 'Max results (1–50, default 20)' },
            offset: { type: 'number', description: 'Pagination offset (default 0)' },
          },
        },
      },
      // ── Library: Tracks ──────────────────────────────────────────────────────
      {
        name: 'get_user_saved_tracks',
        description: "Get a list of the songs saved in the current Spotify user's library. Requires user-library-read scope.",
        inputSchema: {
          type: 'object',
          properties: {
            market: { type: 'string', description: 'ISO 3166-1 alpha-2 country code. Optional.' },
            limit: { type: 'number', description: 'Max results (1–50, default 20)' },
            offset: { type: 'number', description: 'Pagination offset (default 0)' },
          },
        },
      },
      {
        name: 'check_user_saved_tracks',
        description: "Check if tracks are saved in the current user's library. Requires user-library-read scope.",
        inputSchema: {
          type: 'object',
          properties: {
            ids: { type: 'string', description: 'Comma-separated Spotify track IDs (max 50)' },
          },
          required: ['ids'],
        },
      },
      {
        name: 'save_tracks',
        description: "Save one or more tracks to the current user's library. Requires user-library-modify scope.",
        inputSchema: {
          type: 'object',
          properties: {
            ids: { type: 'string', description: 'Comma-separated Spotify track IDs (max 50)' },
          },
          required: ['ids'],
        },
      },
      {
        name: 'remove_saved_tracks',
        description: "Remove one or more tracks from the current user's library. Requires user-library-modify scope.",
        inputSchema: {
          type: 'object',
          properties: {
            ids: { type: 'string', description: 'Comma-separated Spotify track IDs (max 50)' },
          },
          required: ['ids'],
        },
      },
      // ── Library: Albums ──────────────────────────────────────────────────────
      {
        name: 'get_user_saved_albums',
        description: "Get a list of albums saved in the current user's library. Requires user-library-read scope.",
        inputSchema: {
          type: 'object',
          properties: {
            market: { type: 'string', description: 'ISO 3166-1 alpha-2 country code. Optional.' },
            limit: { type: 'number', description: 'Max results (1–50, default 20)' },
            offset: { type: 'number', description: 'Pagination offset (default 0)' },
          },
        },
      },
      {
        name: 'check_user_saved_albums',
        description: "Check if albums are saved in the current user's library. Requires user-library-read scope.",
        inputSchema: {
          type: 'object',
          properties: {
            ids: { type: 'string', description: 'Comma-separated Spotify album IDs (max 20)' },
          },
          required: ['ids'],
        },
      },
      {
        name: 'save_albums',
        description: "Save one or more albums to the current user's library. Requires user-library-modify scope.",
        inputSchema: {
          type: 'object',
          properties: {
            ids: { type: 'string', description: 'Comma-separated Spotify album IDs (max 20)' },
          },
          required: ['ids'],
        },
      },
      {
        name: 'remove_saved_albums',
        description: "Remove one or more albums from the current user's library. Requires user-library-modify scope.",
        inputSchema: {
          type: 'object',
          properties: {
            ids: { type: 'string', description: 'Comma-separated Spotify album IDs (max 20)' },
          },
          required: ['ids'],
        },
      },
      // ── Library: Shows ───────────────────────────────────────────────────────
      {
        name: 'get_user_saved_shows',
        description: "Get a list of shows saved in the current user's library. Requires user-library-read scope.",
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Max results (1–50, default 20)' },
            offset: { type: 'number', description: 'Pagination offset (default 0)' },
          },
        },
      },
      {
        name: 'check_user_saved_shows',
        description: "Check if shows are saved in the current user's library. Requires user-library-read scope.",
        inputSchema: {
          type: 'object',
          properties: {
            ids: { type: 'string', description: 'Comma-separated Spotify show IDs (max 50)' },
          },
          required: ['ids'],
        },
      },
      {
        name: 'save_shows',
        description: "Save one or more shows to the current user's library. Requires user-library-modify scope.",
        inputSchema: {
          type: 'object',
          properties: {
            ids: { type: 'string', description: 'Comma-separated Spotify show IDs (max 50)' },
          },
          required: ['ids'],
        },
      },
      {
        name: 'remove_saved_shows',
        description: "Remove one or more shows from the current user's library. Requires user-library-modify scope.",
        inputSchema: {
          type: 'object',
          properties: {
            ids: { type: 'string', description: 'Comma-separated Spotify show IDs (max 50)' },
            market: { type: 'string', description: 'ISO 3166-1 alpha-2 country code. Optional.' },
          },
          required: ['ids'],
        },
      },
      // ── Library: Episodes ────────────────────────────────────────────────────
      {
        name: 'get_user_saved_episodes',
        description: "Get a list of episodes saved in the current user's library. Requires user-library-read scope.",
        inputSchema: {
          type: 'object',
          properties: {
            market: { type: 'string', description: 'ISO 3166-1 alpha-2 country code. Optional.' },
            limit: { type: 'number', description: 'Max results (1–50, default 20)' },
            offset: { type: 'number', description: 'Pagination offset (default 0)' },
          },
        },
      },
      {
        name: 'check_user_saved_episodes',
        description: "Check if episodes are saved in the current user's library. Requires user-library-read scope.",
        inputSchema: {
          type: 'object',
          properties: {
            ids: { type: 'string', description: 'Comma-separated Spotify episode IDs (max 50)' },
          },
          required: ['ids'],
        },
      },
      {
        name: 'save_episodes',
        description: "Save one or more episodes to the current user's library. Requires user-library-modify scope.",
        inputSchema: {
          type: 'object',
          properties: {
            ids: { type: 'string', description: 'Comma-separated Spotify episode IDs (max 50)' },
          },
          required: ['ids'],
        },
      },
      {
        name: 'remove_saved_episodes',
        description: "Remove one or more episodes from the current user's library. Requires user-library-modify scope.",
        inputSchema: {
          type: 'object',
          properties: {
            ids: { type: 'string', description: 'Comma-separated Spotify episode IDs (max 50)' },
          },
          required: ['ids'],
        },
      },
      // ── Library: Audiobooks ──────────────────────────────────────────────────
      {
        name: 'get_user_saved_audiobooks',
        description: "Get a list of audiobooks saved in the current user's library. Requires user-library-read scope.",
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Max results (1–50, default 20)' },
            offset: { type: 'number', description: 'Pagination offset (default 0)' },
          },
        },
      },
      {
        name: 'check_user_saved_audiobooks',
        description: "Check if audiobooks are saved in the current user's library. Requires user-library-read scope.",
        inputSchema: {
          type: 'object',
          properties: {
            ids: { type: 'string', description: 'Comma-separated Spotify audiobook IDs (max 50)' },
          },
          required: ['ids'],
        },
      },
      {
        name: 'save_audiobooks',
        description: "Save one or more audiobooks to the current user's library. Requires user-library-modify scope.",
        inputSchema: {
          type: 'object',
          properties: {
            ids: { type: 'string', description: 'Comma-separated Spotify audiobook IDs (max 50)' },
          },
          required: ['ids'],
        },
      },
      {
        name: 'remove_saved_audiobooks',
        description: "Remove one or more audiobooks from the current user's library. Requires user-library-modify scope.",
        inputSchema: {
          type: 'object',
          properties: {
            ids: { type: 'string', description: 'Comma-separated Spotify audiobook IDs (max 50)' },
          },
          required: ['ids'],
        },
      },
      // ── Following ────────────────────────────────────────────────────────────
      {
        name: 'get_followed_artists',
        description: "Get the current user's followed artists. Requires user-follow-read scope.",
        inputSchema: {
          type: 'object',
          properties: {
            type: { type: 'string', description: 'Must be "artist"' },
            after: { type: 'string', description: 'Last artist ID retrieved from previous request (cursor-based pagination). Optional.' },
            limit: { type: 'number', description: 'Max results (1–50, default 20)' },
          },
          required: ['type'],
        },
      },
      {
        name: 'follow_artists_or_users',
        description: "Add the current user as a follower of one or more artists or other Spotify users. Requires user-follow-modify scope.",
        inputSchema: {
          type: 'object',
          properties: {
            type: { type: 'string', description: '"artist" or "user"' },
            ids: { type: 'string', description: 'Comma-separated Spotify IDs (max 50)' },
          },
          required: ['type', 'ids'],
        },
      },
      {
        name: 'unfollow_artists_or_users',
        description: "Remove the current user as a follower of one or more artists or Spotify users. Requires user-follow-modify scope.",
        inputSchema: {
          type: 'object',
          properties: {
            type: { type: 'string', description: '"artist" or "user"' },
            ids: { type: 'string', description: 'Comma-separated Spotify IDs (max 50)' },
          },
          required: ['type', 'ids'],
        },
      },
      {
        name: 'check_user_follows',
        description: "Check to see if the current user is following one or more artists or Spotify users. Requires user-follow-read scope.",
        inputSchema: {
          type: 'object',
          properties: {
            type: { type: 'string', description: '"artist" or "user"' },
            ids: { type: 'string', description: 'Comma-separated Spotify IDs (max 50)' },
          },
          required: ['type', 'ids'],
        },
      },
      {
        name: 'follow_playlist',
        description: "Add the current user as a follower of a playlist. Requires playlist-modify-public or playlist-modify-private scope.",
        inputSchema: {
          type: 'object',
          properties: {
            playlist_id: { type: 'string', description: 'Spotify playlist ID' },
            public: { type: 'boolean', description: 'If true, the playlist will be included in the user\'s public playlists (default true)' },
          },
          required: ['playlist_id'],
        },
      },
      {
        name: 'unfollow_playlist',
        description: "Remove the current user as a follower of a playlist. Requires playlist-modify-public or playlist-modify-private scope.",
        inputSchema: {
          type: 'object',
          properties: {
            playlist_id: { type: 'string', description: 'Spotify playlist ID' },
          },
          required: ['playlist_id'],
        },
      },
      {
        name: 'check_if_users_follow_playlist',
        description: "Check to see if one or more Spotify users are following a specified playlist.",
        inputSchema: {
          type: 'object',
          properties: {
            playlist_id: { type: 'string', description: 'Spotify playlist ID' },
            ids: { type: 'string', description: 'Comma-separated Spotify user IDs (max 5)' },
          },
          required: ['playlist_id', 'ids'],
        },
      },
      // ── Playback ─────────────────────────────────────────────────────────────
      {
        name: 'get_playback_state',
        description: "Get information about the user's current playback state (device, shuffle, repeat, progress, currently playing). Requires user-read-playback-state scope.",
        inputSchema: {
          type: 'object',
          properties: {
            market: { type: 'string', description: 'ISO 3166-1 alpha-2 country code. Optional.' },
            additional_types: { type: 'string', description: 'Comma-separated types: track, episode. Optional.' },
          },
        },
      },
      {
        name: 'get_currently_playing',
        description: "Get the object currently being played on the user's Spotify account. Requires user-read-currently-playing scope.",
        inputSchema: {
          type: 'object',
          properties: {
            market: { type: 'string', description: 'ISO 3166-1 alpha-2 country code. Optional.' },
            additional_types: { type: 'string', description: 'Comma-separated types: track, episode. Optional.' },
          },
        },
      },
      {
        name: 'get_available_devices',
        description: "Get information about the user's available Spotify Connect devices. Requires user-read-playback-state scope.",
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_recently_played',
        description: "Get tracks from the current user's recently played tracks. Requires user-read-recently-played scope.",
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Max results (1–50, default 20)' },
            after: { type: 'number', description: 'Unix timestamp (ms) — return items after this timestamp. Optional.' },
            before: { type: 'number', description: 'Unix timestamp (ms) — return items before this timestamp. Optional.' },
          },
        },
      },
      {
        name: 'get_user_queue',
        description: "Get the list of objects that make up the user's queue. Requires user-read-currently-playing and user-read-playback-state scopes.",
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'start_playback',
        description: "Start or resume playback on the user's active device. Requires user-modify-playback-state scope and Spotify Premium.",
        inputSchema: {
          type: 'object',
          properties: {
            device_id: { type: 'string', description: 'Target device ID. If not provided, uses the currently active device. Optional.' },
            context_uri: { type: 'string', description: 'Spotify URI of context to play (album, artist, playlist, e.g. "spotify:album:1Je1IMUlBXcx1Fz0WE7oPT"). Optional.' },
            uris: { type: 'string', description: 'Comma-separated Spotify track URIs to play (max 20, e.g. "spotify:track:4iV5W9uYEdYUVa79Axb7Rh"). Optional.' },
            offset_position: { type: 'number', description: 'Zero-based index of the item in context_uri to start at. Optional.' },
            offset_uri: { type: 'string', description: 'Spotify URI to start at within context_uri. Optional.' },
            position_ms: { type: 'number', description: 'Position in ms to start playback at. Optional.' },
          },
        },
      },
      {
        name: 'pause_playback',
        description: "Pause playback on the user's account. Requires user-modify-playback-state scope and Spotify Premium.",
        inputSchema: {
          type: 'object',
          properties: {
            device_id: { type: 'string', description: 'Target device ID. Optional.' },
          },
        },
      },
      {
        name: 'skip_to_next',
        description: "Skip to the next track in the user's queue. Requires user-modify-playback-state scope and Spotify Premium.",
        inputSchema: {
          type: 'object',
          properties: {
            device_id: { type: 'string', description: 'Target device ID. Optional.' },
          },
        },
      },
      {
        name: 'skip_to_previous',
        description: "Skip to the previous track in the user's queue. Requires user-modify-playback-state scope and Spotify Premium.",
        inputSchema: {
          type: 'object',
          properties: {
            device_id: { type: 'string', description: 'Target device ID. Optional.' },
          },
        },
      },
      {
        name: 'seek_to_position',
        description: "Seek to position in the currently playing track. Requires user-modify-playback-state scope and Spotify Premium.",
        inputSchema: {
          type: 'object',
          properties: {
            position_ms: { type: 'number', description: 'Position in milliseconds to seek to (must be positive)' },
            device_id: { type: 'string', description: 'Target device ID. Optional.' },
          },
          required: ['position_ms'],
        },
      },
      {
        name: 'set_repeat_mode',
        description: "Set the repeat mode for the user's playback. Requires user-modify-playback-state scope and Spotify Premium.",
        inputSchema: {
          type: 'object',
          properties: {
            state: { type: 'string', description: 'Repeat state: "track" (repeat current track), "context" (repeat current context), "off"' },
            device_id: { type: 'string', description: 'Target device ID. Optional.' },
          },
          required: ['state'],
        },
      },
      {
        name: 'set_volume',
        description: "Set the volume for the user's current playback device. Requires user-modify-playback-state scope and Spotify Premium.",
        inputSchema: {
          type: 'object',
          properties: {
            volume_percent: { type: 'number', description: 'Volume level (0–100)' },
            device_id: { type: 'string', description: 'Target device ID. Optional.' },
          },
          required: ['volume_percent'],
        },
      },
      {
        name: 'toggle_shuffle',
        description: "Toggle shuffle on or off for the user's playback. Requires user-modify-playback-state scope and Spotify Premium.",
        inputSchema: {
          type: 'object',
          properties: {
            state: { type: 'boolean', description: 'true to enable shuffle, false to disable' },
            device_id: { type: 'string', description: 'Target device ID. Optional.' },
          },
          required: ['state'],
        },
      },
      {
        name: 'transfer_playback',
        description: "Transfer playback to a new device and optionally start playback. Requires user-modify-playback-state scope and Spotify Premium.",
        inputSchema: {
          type: 'object',
          properties: {
            device_ids: { type: 'string', description: 'Target device ID (only one device supported at a time)' },
            play: { type: 'boolean', description: 'If true, start playback on the new device. Optional.' },
          },
          required: ['device_ids'],
        },
      },
      {
        name: 'add_to_queue',
        description: "Add an item to the end of the user's current playback queue. Requires user-modify-playback-state scope and Spotify Premium.",
        inputSchema: {
          type: 'object',
          properties: {
            uri: { type: 'string', description: 'Spotify URI of the item to add (track or episode, e.g. "spotify:track:4iV5W9uYEdYUVa79Axb7Rh")' },
            device_id: { type: 'string', description: 'Target device ID. Optional.' },
          },
          required: ['uri'],
        },
      },
      // ── Playlist Management ──────────────────────────────────────────────────
      {
        name: 'create_playlist',
        description: "Create a playlist for a Spotify user. Requires playlist-modify-public or playlist-modify-private scope.",
        inputSchema: {
          type: 'object',
          properties: {
            user_id: { type: 'string', description: "The user's Spotify user ID" },
            name: { type: 'string', description: 'Name for the new playlist (max 100 chars)' },
            public: { type: 'boolean', description: 'If true (default), the playlist will be public' },
            collaborative: { type: 'boolean', description: 'If true, the playlist is collaborative (must also set public=false). Optional.' },
            description: { type: 'string', description: 'Playlist description as displayed in Spotify clients. Optional.' },
          },
          required: ['user_id', 'name'],
        },
      },
      {
        name: 'change_playlist_details',
        description: "Change a playlist's name and public/private state. Requires playlist-modify-public or playlist-modify-private scope.",
        inputSchema: {
          type: 'object',
          properties: {
            playlist_id: { type: 'string', description: 'Spotify playlist ID' },
            name: { type: 'string', description: 'New name for the playlist. Optional.' },
            public: { type: 'boolean', description: 'If true, the playlist is public. Optional.' },
            collaborative: { type: 'boolean', description: 'If true, the playlist is collaborative. Optional.' },
            description: { type: 'string', description: 'New playlist description. Optional.' },
          },
          required: ['playlist_id'],
        },
      },
      {
        name: 'add_tracks_to_playlist',
        description: "Add one or more items to a user's playlist. Requires playlist-modify-public or playlist-modify-private scope.",
        inputSchema: {
          type: 'object',
          properties: {
            playlist_id: { type: 'string', description: 'Spotify playlist ID' },
            uris: { type: 'string', description: 'Comma-separated Spotify URIs to add (max 100, e.g. "spotify:track:4iV5W9uYEdYUVa79Axb7Rh")' },
            position: { type: 'number', description: 'Zero-based position to insert items (appends to end if omitted). Optional.' },
          },
          required: ['playlist_id', 'uris'],
        },
      },
      {
        name: 'update_playlist_items',
        description: "Either reorder or replace items in a playlist. Requires playlist-modify-public or playlist-modify-private scope.",
        inputSchema: {
          type: 'object',
          properties: {
            playlist_id: { type: 'string', description: 'Spotify playlist ID' },
            uris: { type: 'string', description: 'Comma-separated Spotify URIs to replace playlist contents. Optional (omit to reorder instead).' },
            range_start: { type: 'number', description: 'Position of the first item to be reordered. Optional.' },
            insert_before: { type: 'number', description: 'Position where items should be inserted after reordering. Optional.' },
            range_length: { type: 'number', description: 'Number of items to be reordered (default 1). Optional.' },
            snapshot_id: { type: 'string', description: 'Playlist snapshot ID for version control. Optional.' },
          },
          required: ['playlist_id'],
        },
      },
      {
        name: 'remove_playlist_items',
        description: "Remove one or more items from a user's playlist. Requires playlist-modify-public or playlist-modify-private scope.",
        inputSchema: {
          type: 'object',
          properties: {
            playlist_id: { type: 'string', description: 'Spotify playlist ID' },
            uris: { type: 'string', description: 'Comma-separated Spotify URIs to remove' },
            snapshot_id: { type: 'string', description: 'Playlist snapshot ID for version control. Optional.' },
          },
          required: ['playlist_id', 'uris'],
        },
      },
      {
        name: 'upload_playlist_cover',
        description: "Replace the image used to represent a playlist. Requires ugc-image-upload and playlist-modify-public/private scope.",
        inputSchema: {
          type: 'object',
          properties: {
            playlist_id: { type: 'string', description: 'Spotify playlist ID' },
            image_data: { type: 'string', description: 'Base64-encoded JPEG image data (max 256 KB)' },
          },
          required: ['playlist_id', 'image_data'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        // Search
        case 'search':                        return this.search(args);
        // Tracks
        case 'get_track':                     return this.doGet(`/tracks/${args.id}`, this.pick(args, ['market']));
        case 'get_several_tracks':            return this.doGet('/tracks', { ids: args.ids as string, ...this.pick(args, ['market']) });
        case 'get_audio_features':            return this.doGet(`/audio-features/${args.id}`);
        case 'get_several_audio_features':    return this.doGet('/audio-features', { ids: args.ids as string });
        case 'get_audio_analysis':            return this.doGet(`/audio-analysis/${args.id}`);
        // Albums
        case 'get_album':                     return this.doGet(`/albums/${args.id}`, this.pick(args, ['market']));
        case 'get_several_albums':            return this.doGet('/albums', { ids: args.ids as string, ...this.pick(args, ['market']) });
        case 'get_album_tracks':              return this.doGet(`/albums/${args.id}/tracks`, this.pick(args, ['market', 'limit', 'offset']));
        // Artists
        case 'get_artist':                    return this.doGet(`/artists/${args.id}`);
        case 'get_several_artists':           return this.doGet('/artists', { ids: args.ids as string });
        case 'get_artist_albums':             return this.doGet(`/artists/${args.id}/albums`, this.pick(args, ['include_groups', 'market', 'limit', 'offset']));
        case 'get_artist_top_tracks':         return this.doGet(`/artists/${args.id}/top-tracks`, this.pick(args, ['market']));
        case 'get_artist_related_artists':    return this.doGet(`/artists/${args.id}/related-artists`);
        // Playlists
        case 'get_playlist':                  return this.doGet(`/playlists/${args.playlist_id}`, this.pick(args, ['market', 'fields', 'additional_types']));
        case 'get_playlist_tracks':           return this.doGet(`/playlists/${args.playlist_id}/tracks`, this.pick(args, ['market', 'fields', 'limit', 'offset', 'additional_types']));
        case 'get_playlist_cover':            return this.doGet(`/playlists/${args.playlist_id}/images`);
        // Shows
        case 'get_show':                      return this.doGet(`/shows/${args.id}`, this.pick(args, ['market']));
        case 'get_several_shows':             return this.doGet('/shows', { ids: args.ids as string, ...this.pick(args, ['market']) });
        case 'get_show_episodes':             return this.doGet(`/shows/${args.id}/episodes`, this.pick(args, ['market', 'limit', 'offset']));
        // Episodes
        case 'get_episode':                   return this.doGet(`/episodes/${args.id}`, this.pick(args, ['market']));
        case 'get_several_episodes':          return this.doGet('/episodes', { ids: args.ids as string, ...this.pick(args, ['market']) });
        // Audiobooks
        case 'get_audiobook':                 return this.doGet(`/audiobooks/${args.id}`, this.pick(args, ['market']));
        case 'get_several_audiobooks':        return this.doGet('/audiobooks', { ids: args.ids as string, ...this.pick(args, ['market']) });
        case 'get_audiobook_chapters':        return this.doGet(`/audiobooks/${args.id}/chapters`, this.pick(args, ['market', 'limit', 'offset']));
        case 'get_chapter':                   return this.doGet(`/chapters/${args.id}`, this.pick(args, ['market']));
        case 'get_several_chapters':          return this.doGet('/chapters', { ids: args.ids as string, ...this.pick(args, ['market']) });
        // Discovery
        case 'get_recommendations':           return this.getRecommendations(args);
        case 'get_recommendation_genres':     return this.doGet('/recommendations/available-genre-seeds');
        case 'get_new_releases':              return this.doGet('/browse/new-releases', this.pick(args, ['country', 'limit', 'offset']));
        case 'get_featured_playlists':        return this.doGet('/browse/featured-playlists', this.pick(args, ['country', 'locale', 'timestamp', 'limit', 'offset']));
        case 'get_categories':               return this.doGet('/browse/categories', this.pick(args, ['country', 'locale', 'limit', 'offset']));
        case 'get_category':                  return this.doGet(`/browse/categories/${args.category_id}`, this.pick(args, ['country', 'locale']));
        case 'get_category_playlists':        return this.doGet(`/browse/categories/${args.category_id}/playlists`, this.pick(args, ['country', 'limit', 'offset']));
        case 'get_available_markets':         return this.doGet('/markets');
        // Users
        case 'get_current_user_profile':      return this.doGet('/me');
        case 'get_user_profile':              return this.doGet(`/users/${args.user_id}`);
        case 'get_current_user_playlists':    return this.doGet('/me/playlists', this.pick(args, ['limit', 'offset']));
        case 'get_user_playlists':            return this.doGet(`/users/${args.user_id}/playlists`, this.pick(args, ['limit', 'offset']));
        case 'get_user_top_artists':          return this.doGet('/me/top/artists', this.pick(args, ['time_range', 'limit', 'offset']));
        case 'get_user_top_tracks':           return this.doGet('/me/top/tracks', this.pick(args, ['time_range', 'limit', 'offset']));
        // Library: Tracks
        case 'get_user_saved_tracks':         return this.doGet('/me/tracks', this.pick(args, ['market', 'limit', 'offset']));
        case 'check_user_saved_tracks':       return this.doGet('/me/tracks/contains', { ids: args.ids as string });
        case 'save_tracks':                   return this.doPut('/me/tracks', { ids: args.ids as string });
        case 'remove_saved_tracks':           return this.doDelete('/me/tracks', { ids: args.ids as string });
        // Library: Albums
        case 'get_user_saved_albums':         return this.doGet('/me/albums', this.pick(args, ['market', 'limit', 'offset']));
        case 'check_user_saved_albums':       return this.doGet('/me/albums/contains', { ids: args.ids as string });
        case 'save_albums':                   return this.doPut('/me/albums', { ids: args.ids as string });
        case 'remove_saved_albums':           return this.doDelete('/me/albums', { ids: args.ids as string });
        // Library: Shows
        case 'get_user_saved_shows':          return this.doGet('/me/shows', this.pick(args, ['limit', 'offset']));
        case 'check_user_saved_shows':        return this.doGet('/me/shows/contains', { ids: args.ids as string });
        case 'save_shows':                    return this.doPut('/me/shows', { ids: args.ids as string });
        case 'remove_saved_shows':            return this.doDelete('/me/shows', { ids: args.ids as string, ...this.pick(args, ['market']) });
        // Library: Episodes
        case 'get_user_saved_episodes':       return this.doGet('/me/episodes', this.pick(args, ['market', 'limit', 'offset']));
        case 'check_user_saved_episodes':     return this.doGet('/me/episodes/contains', { ids: args.ids as string });
        case 'save_episodes':                 return this.doPut('/me/episodes', { ids: args.ids as string });
        case 'remove_saved_episodes':         return this.doDelete('/me/episodes', { ids: args.ids as string });
        // Library: Audiobooks
        case 'get_user_saved_audiobooks':     return this.doGet('/me/audiobooks', this.pick(args, ['limit', 'offset']));
        case 'check_user_saved_audiobooks':   return this.doGet('/me/audiobooks/contains', { ids: args.ids as string });
        case 'save_audiobooks':               return this.doPut('/me/audiobooks', { ids: args.ids as string });
        case 'remove_saved_audiobooks':       return this.doDelete('/me/audiobooks', { ids: args.ids as string });
        // Following
        case 'get_followed_artists':          return this.doGet('/me/following', { type: args.type as string, ...this.pick(args, ['after', 'limit']) });
        case 'follow_artists_or_users':       return this.doPut('/me/following', { type: args.type as string, ids: args.ids as string });
        case 'unfollow_artists_or_users':     return this.doDelete('/me/following', { type: args.type as string, ids: args.ids as string });
        case 'check_user_follows':            return this.doGet('/me/following/contains', { type: args.type as string, ids: args.ids as string });
        case 'follow_playlist':               return this.followPlaylist(args);
        case 'unfollow_playlist':             return this.doDeletePath(`/playlists/${args.playlist_id}/followers`);
        case 'check_if_users_follow_playlist': return this.doGet(`/playlists/${args.playlist_id}/followers/contains`, { ids: args.ids as string });
        // Playback
        case 'get_playback_state':            return this.doGet('/me/player', this.pick(args, ['market', 'additional_types']));
        case 'get_currently_playing':         return this.doGet('/me/player/currently-playing', this.pick(args, ['market', 'additional_types']));
        case 'get_available_devices':         return this.doGet('/me/player/devices');
        case 'get_recently_played':           return this.doGet('/me/player/recently-played', this.pick(args, ['limit', 'after', 'before']));
        case 'get_user_queue':                return this.doGet('/me/player/queue');
        case 'start_playback':                return this.startPlayback(args);
        case 'pause_playback':                return this.doPlayerPut('/me/player/pause', this.pick(args, ['device_id']));
        case 'skip_to_next':                  return this.doPlayerPost('/me/player/next', this.pick(args, ['device_id']));
        case 'skip_to_previous':              return this.doPlayerPost('/me/player/previous', this.pick(args, ['device_id']));
        case 'seek_to_position':              return this.doPlayerPut('/me/player/seek', { position_ms: String(args.position_ms), ...this.pick(args, ['device_id']) });
        case 'set_repeat_mode':               return this.doPlayerPut('/me/player/repeat', { state: args.state as string, ...this.pick(args, ['device_id']) });
        case 'set_volume':                    return this.doPlayerPut('/me/player/volume', { volume_percent: String(args.volume_percent), ...this.pick(args, ['device_id']) });
        case 'toggle_shuffle':                return this.doPlayerPut('/me/player/shuffle', { state: String(args.state), ...this.pick(args, ['device_id']) });
        case 'transfer_playback':             return this.transferPlayback(args);
        case 'add_to_queue':                  return this.doPlayerPost('/me/player/queue', { uri: args.uri as string, ...this.pick(args, ['device_id']) });
        // Playlist management
        case 'create_playlist':               return this.createPlaylist(args);
        case 'change_playlist_details':       return this.changePlaylistDetails(args);
        case 'add_tracks_to_playlist':        return this.addTracksToPlaylist(args);
        case 'update_playlist_items':         return this.updatePlaylistItems(args);
        case 'remove_playlist_items':         return this.removePlaylistItems(args);
        case 'upload_playlist_cover':         return this.uploadPlaylistCover(args);
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

  // ── Helpers ────────────────────────────────────────────────────────────────

  private pick(args: Record<string, unknown>, keys: string[]): Record<string, string> {
    const out: Record<string, string> = {};
    for (const k of keys) {
      if (args[k] !== undefined && args[k] !== null) {
        out[k] = String(args[k]);
      }
    }
    return out;
  }

  private get authHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.accessToken}`,
      Accept: 'application/json',
    };
  }

  private async doGet(path: string, params: Record<string, string> = {}): Promise<ToolResult> {
    const qs = Object.keys(params).length ? '?' + new URLSearchParams(params).toString() : '';
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}${qs}`, {
      method: 'GET',
      headers: this.authHeaders,
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `Spotify API error ${response.status}: ${errText}` }], isError: true };
    }
    // Some endpoints (204 No Content) return empty body
    if (response.status === 204) {
      return { content: [{ type: 'text', text: 'Success (no content)' }], isError: false };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async doPut(path: string, params: Record<string, string> = {}): Promise<ToolResult> {
    const qs = Object.keys(params).length ? '?' + new URLSearchParams(params).toString() : '';
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}${qs}`, {
      method: 'PUT',
      headers: this.authHeaders,
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `Spotify API error ${response.status}: ${errText}` }], isError: true };
    }
    if (response.status === 200 || response.status === 201) {
      const data = await response.json().catch(() => ({}));
      return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
    }
    return { content: [{ type: 'text', text: 'Success' }], isError: false };
  }

  private async doDelete(path: string, params: Record<string, string> = {}): Promise<ToolResult> {
    const qs = Object.keys(params).length ? '?' + new URLSearchParams(params).toString() : '';
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}${qs}`, {
      method: 'DELETE',
      headers: this.authHeaders,
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `Spotify API error ${response.status}: ${errText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: 'Success' }], isError: false };
  }

  private async doDeletePath(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'DELETE',
      headers: this.authHeaders,
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `Spotify API error ${response.status}: ${errText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: 'Success' }], isError: false };
  }

  private async doPost(path: string, body: unknown, params: Record<string, string> = {}): Promise<ToolResult> {
    const qs = Object.keys(params).length ? '?' + new URLSearchParams(params).toString() : '';
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}${qs}`, {
      method: 'POST',
      headers: { ...this.authHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `Spotify API error ${response.status}: ${errText}` }], isError: true };
    }
    if (response.status === 201 || response.status === 200) {
      const data = await response.json().catch(() => ({}));
      return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
    }
    return { content: [{ type: 'text', text: 'Success' }], isError: false };
  }

  // Player PUT uses query params, not body
  private async doPlayerPut(path: string, params: Record<string, string> = {}): Promise<ToolResult> {
    return this.doPut(path, params);
  }

  // Player POST uses query params
  private async doPlayerPost(path: string, params: Record<string, string> = {}): Promise<ToolResult> {
    const qs = Object.keys(params).length ? '?' + new URLSearchParams(params).toString() : '';
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}${qs}`, {
      method: 'POST',
      headers: this.authHeaders,
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `Spotify API error ${response.status}: ${errText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: 'Success' }], isError: false };
  }

  // ── Complex Tool Implementations ───────────────────────────────────────────

  private async search(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.q) return { content: [{ type: 'text', text: 'q is required' }], isError: true };
    if (!args.type) return { content: [{ type: 'text', text: 'type is required' }], isError: true };
    const params: Record<string, string> = { q: args.q as string, type: args.type as string };
    if (args.market) params['market'] = args.market as string;
    if (args.limit !== undefined) params['limit'] = String(args.limit);
    if (args.offset !== undefined) params['offset'] = String(args.offset);
    if (args.include_external) params['include_external'] = args.include_external as string;
    return this.doGet('/search', params);
  }

  private async getRecommendations(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    const strFields = ['seed_artists', 'seed_tracks', 'seed_genres', 'market'];
    const numFields = [
      'limit', 'min_acousticness', 'max_acousticness', 'target_acousticness',
      'min_danceability', 'max_danceability', 'target_danceability',
      'min_energy', 'max_energy', 'target_energy',
      'min_tempo', 'max_tempo', 'target_tempo',
      'min_valence', 'max_valence', 'target_valence',
      'min_popularity', 'max_popularity', 'target_popularity',
    ];
    for (const f of strFields) {
      if (args[f]) params[f] = args[f] as string;
    }
    for (const f of numFields) {
      if (args[f] !== undefined) params[f] = String(args[f]);
    }
    return this.doGet('/recommendations', params);
  }

  private async followPlaylist(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, boolean> = {};
    if (args.public !== undefined) body['public'] = args.public as boolean;
    const response = await this.fetchWithRetry(`${this.baseUrl}/playlists/${args.playlist_id}/followers`, {
      method: 'PUT',
      headers: { ...this.authHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `Spotify API error ${response.status}: ${errText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: 'Success' }], isError: false };
  }

  private async startPlayback(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {};
    if (args.device_id) params['device_id'] = args.device_id as string;

    const body: Record<string, unknown> = {};
    if (args.context_uri) body['context_uri'] = args.context_uri;
    if (args.uris) body['uris'] = (args.uris as string).split(',').map((u: string) => u.trim());
    if (args.offset_position !== undefined) body['offset'] = { position: args.offset_position };
    else if (args.offset_uri) body['offset'] = { uri: args.offset_uri };
    if (args.position_ms !== undefined) body['position_ms'] = args.position_ms;

    const qs = Object.keys(params).length ? '?' + new URLSearchParams(params).toString() : '';
    const response = await this.fetchWithRetry(`${this.baseUrl}/me/player/play${qs}`, {
      method: 'PUT',
      headers: { ...this.authHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `Spotify API error ${response.status}: ${errText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: 'Playback started' }], isError: false };
  }

  private async transferPlayback(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      device_ids: [args.device_ids as string],
    };
    if (args.play !== undefined) body['play'] = args.play;
    const response = await this.fetchWithRetry(`${this.baseUrl}/me/player`, {
      method: 'PUT',
      headers: { ...this.authHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `Spotify API error ${response.status}: ${errText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: 'Playback transferred' }], isError: false };
  }

  private async createPlaylist(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.user_id) return { content: [{ type: 'text', text: 'user_id is required' }], isError: true };
    if (!args.name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    const body: Record<string, unknown> = { name: args.name };
    if (args.public !== undefined) body['public'] = args.public;
    if (args.collaborative !== undefined) body['collaborative'] = args.collaborative;
    if (args.description) body['description'] = args.description;
    return this.doPost(`/users/${args.user_id}/playlists`, body);
  }

  private async changePlaylistDetails(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.playlist_id) return { content: [{ type: 'text', text: 'playlist_id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.name) body['name'] = args.name;
    if (args.public !== undefined) body['public'] = args.public;
    if (args.collaborative !== undefined) body['collaborative'] = args.collaborative;
    if (args.description !== undefined) body['description'] = args.description;
    const response = await this.fetchWithRetry(`${this.baseUrl}/playlists/${args.playlist_id}`, {
      method: 'PUT',
      headers: { ...this.authHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `Spotify API error ${response.status}: ${errText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: 'Playlist updated' }], isError: false };
  }

  private async addTracksToPlaylist(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.playlist_id) return { content: [{ type: 'text', text: 'playlist_id is required' }], isError: true };
    if (!args.uris) return { content: [{ type: 'text', text: 'uris is required' }], isError: true };
    const body: Record<string, unknown> = {
      uris: (args.uris as string).split(',').map((u: string) => u.trim()),
    };
    if (args.position !== undefined) body['position'] = args.position;
    return this.doPost(`/playlists/${args.playlist_id}/tracks`, body);
  }

  private async updatePlaylistItems(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.playlist_id) return { content: [{ type: 'text', text: 'playlist_id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.uris) body['uris'] = (args.uris as string).split(',').map((u: string) => u.trim());
    if (args.range_start !== undefined) body['range_start'] = args.range_start;
    if (args.insert_before !== undefined) body['insert_before'] = args.insert_before;
    if (args.range_length !== undefined) body['range_length'] = args.range_length;
    if (args.snapshot_id) body['snapshot_id'] = args.snapshot_id;
    const response = await this.fetchWithRetry(`${this.baseUrl}/playlists/${args.playlist_id}/tracks`, {
      method: 'PUT',
      headers: { ...this.authHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `Spotify API error ${response.status}: ${errText}` }], isError: true };
    }
    const data = await response.json().catch(() => ({}));
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async removePlaylistItems(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.playlist_id) return { content: [{ type: 'text', text: 'playlist_id is required' }], isError: true };
    if (!args.uris) return { content: [{ type: 'text', text: 'uris is required' }], isError: true };
    const body: Record<string, unknown> = {
      tracks: (args.uris as string).split(',').map((u: string) => ({ uri: u.trim() })),
    };
    if (args.snapshot_id) body['snapshot_id'] = args.snapshot_id;
    const response = await this.fetchWithRetry(`${this.baseUrl}/playlists/${args.playlist_id}/tracks`, {
      method: 'DELETE',
      headers: { ...this.authHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `Spotify API error ${response.status}: ${errText}` }], isError: true };
    }
    const data = await response.json().catch(() => ({}));
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async uploadPlaylistCover(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.playlist_id) return { content: [{ type: 'text', text: 'playlist_id is required' }], isError: true };
    if (!args.image_data) return { content: [{ type: 'text', text: 'image_data is required' }], isError: true };
    const response = await this.fetchWithRetry(`${this.baseUrl}/playlists/${args.playlist_id}/images`, {
      method: 'PUT',
      headers: { ...this.authHeaders, 'Content-Type': 'image/jpeg' },
      body: args.image_data as string,
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `Spotify API error ${response.status}: ${errText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: 'Playlist cover uploaded' }], isError: false };
  }
}
