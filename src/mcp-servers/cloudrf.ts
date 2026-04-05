/**
 * CloudRF MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03. CloudRF has not published an official MCP server.
//
// Base URL: https://api.cloudrf.com
// Auth: API Key in request header — key: <api-key>
// Docs: https://docs.cloudrf.com
// Rate limits: Not publicly documented; CloudRF enforces per-account limits server-side.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface CloudRFConfig {
  apiKey: string;
  baseUrl?: string;
}

export class CloudRFMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: CloudRFConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.cloudrf.com';
  }

  static catalog() {
    return {
      name: 'cloudrf',
      displayName: 'CloudRF',
      version: '1.0.0',
      category: 'telecom' as const,
      keywords: ['cloudrf', 'rf', 'radio frequency', 'coverage', 'signal', 'propagation', 'heatmap', 'antenna', 'telecom', 'wireless', 'path loss', 'interference'],
      toolNames: [
        'create_area_coverage',
        'create_path_profile',
        'create_points_profile',
        'find_best_server',
        'find_interference',
        'merge_mesh',
        'list_archive',
        'export_archive',
        'delete_archive',
        'delete_network',
        'add_clutter',
      ],
      description: 'Run RF propagation analyses with CloudRF: area coverage heatmaps, point-to-point path profiles, best-server analysis, interference detection, and archive management.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Coverage ──────────────────────────────────────────────────────────
      {
        name: 'create_area_coverage',
        description: 'Create a point-to-multipoint RF coverage heatmap for a transmitter. Returns a coverage layer showing signal strength across the surrounding area.',
        inputSchema: {
          type: 'object',
          properties: {
            site: { type: 'string', description: 'Site name or identifier for this calculation' },
            network: { type: 'string', description: 'Network name to group this site with others' },
            lat: { type: 'number', description: 'Transmitter latitude in decimal degrees (required)' },
            lon: { type: 'number', description: 'Transmitter longitude in decimal degrees (required)' },
            alt: { type: 'number', description: 'Transmitter height above ground in metres (default: 10)' },
            frq: { type: 'number', description: 'Transmitter frequency in MHz (required)' },
            txw: { type: 'number', description: 'Transmitter power in Watts (default: 1)' },
            bwi: { type: 'number', description: 'Bandwidth in MHz (default: 1)' },
            rxg: { type: 'number', description: 'Receiver antenna gain in dBd (default: 2.15)' },
            rxs: { type: 'number', description: 'Minimum received signal strength in dBm (default: -90)' },
            rad: { type: 'number', description: 'Radius of coverage area in kilometres (default: 10)' },
            res: { type: 'number', description: 'Output resolution in pixels per degree (default: 1200)' },
            pm: { type: 'number', description: 'Propagation model: 1=ITM, 2=LOS, 7=ITWOM3, 9=Ericsson (default: 1)' },
            azi: { type: 'number', description: 'Antenna azimuth bearing in degrees (default: 0)' },
            tlt: { type: 'number', description: 'Antenna tilt in degrees (default: 0)' },
            hbw: { type: 'number', description: 'Horizontal beamwidth in degrees (default: 360 = omnidirectional)' },
            vbw: { type: 'number', description: 'Vertical beamwidth in degrees (default: 10)' },
          },
          required: ['lat', 'lon', 'frq'],
        },
      },
      // ── Path Profiles ─────────────────────────────────────────────────────
      {
        name: 'create_path_profile',
        description: 'Run a point-to-point RF path profile analysis between a transmitter and receiver. Returns Fresnel zone clearance, path loss, and received signal data.',
        inputSchema: {
          type: 'object',
          properties: {
            site: { type: 'string', description: 'Site name or identifier for this calculation' },
            network: { type: 'string', description: 'Network name to group this site' },
            lat: { type: 'number', description: 'Transmitter latitude in decimal degrees (required)' },
            lon: { type: 'number', description: 'Transmitter longitude in decimal degrees (required)' },
            alt: { type: 'number', description: 'Transmitter height above ground in metres (default: 10)' },
            frq: { type: 'number', description: 'Frequency in MHz (required)' },
            txw: { type: 'number', description: 'Transmitter power in Watts (default: 1)' },
            rxlat: { type: 'number', description: 'Receiver latitude in decimal degrees (required)' },
            rxlon: { type: 'number', description: 'Receiver longitude in decimal degrees (required)' },
            rxalt: { type: 'number', description: 'Receiver height above ground in metres (default: 1.5)' },
            rxg: { type: 'number', description: 'Receiver gain in dBd (default: 2.15)' },
            pm: { type: 'number', description: 'Propagation model: 1=ITM, 2=LOS, 7=ITWOM3, 9=Ericsson (default: 1)' },
          },
          required: ['lat', 'lon', 'frq', 'rxlat', 'rxlon'],
        },
      },
      {
        name: 'create_points_profile',
        description: 'Run point-to-multipoint path profile analysis from many transmitter sites to a single receiver location.',
        inputSchema: {
          type: 'object',
          properties: {
            network: { type: 'string', description: 'Network name — all sites in this network are tested (required)' },
            rxlat: { type: 'number', description: 'Receiver latitude in decimal degrees (required)' },
            rxlon: { type: 'number', description: 'Receiver longitude in decimal degrees (required)' },
            rxalt: { type: 'number', description: 'Receiver height above ground in metres (default: 1.5)' },
            rxg: { type: 'number', description: 'Receiver gain in dBd (default: 2.15)' },
            rxs: { type: 'number', description: 'Minimum required signal strength in dBm (default: -90)' },
          },
          required: ['network', 'rxlat', 'rxlon'],
        },
      },
      // ── Network Analysis ──────────────────────────────────────────────────
      {
        name: 'find_best_server',
        description: 'Find the best serving transmitter in a network for a given location — returns the site with strongest coverage at the receiver coordinates.',
        inputSchema: {
          type: 'object',
          properties: {
            network: { type: 'string', description: 'Network name to search across (required)' },
            rxlat: { type: 'number', description: 'Receiver latitude in decimal degrees (required)' },
            rxlon: { type: 'number', description: 'Receiver longitude in decimal degrees (required)' },
            rxalt: { type: 'number', description: 'Receiver height above ground in metres (default: 1.5)' },
          },
          required: ['network', 'rxlat', 'rxlon'],
        },
      },
      {
        name: 'find_interference',
        description: 'Find interference between overlapping coverage layers in a network — identifies sites whose signal coverage overlaps at a given location.',
        inputSchema: {
          type: 'object',
          properties: {
            network: { type: 'string', description: 'Network name to analyse for interference (required)' },
            rxlat: { type: 'number', description: 'Receiver latitude in decimal degrees (required)' },
            rxlon: { type: 'number', description: 'Receiver longitude in decimal degrees (required)' },
            rxalt: { type: 'number', description: 'Receiver height above ground in metres (default: 1.5)' },
          },
          required: ['network', 'rxlat', 'rxlon'],
        },
      },
      {
        name: 'merge_mesh',
        description: 'Merge multiple coverage sites in a network into a single composite coverage layer (super layer / mesh).',
        inputSchema: {
          type: 'object',
          properties: {
            network: { type: 'string', description: 'Network name whose sites to merge into a mesh layer (required)' },
          },
          required: ['network'],
        },
      },
      // ── Archive ───────────────────────────────────────────────────────────
      {
        name: 'list_archive',
        description: 'List saved calculations from the CloudRF archive for the authenticated account',
        inputSchema: {
          type: 'object',
          properties: {
            network: { type: 'string', description: 'Filter results by network name (optional)' },
            site: { type: 'string', description: 'Filter results by site name (optional)' },
          },
        },
      },
      {
        name: 'export_archive',
        description: 'Export a saved calculation from the archive in a GIS file format (KMZ, GeoTIFF, SHP, etc.)',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Calculation archive ID to export (required)' },
            format: { type: 'string', description: 'Export format: kmz, geotiff, shp, json (default: kmz)' },
          },
          required: ['id'],
        },
      },
      {
        name: 'delete_archive',
        description: 'Delete a single saved calculation from the CloudRF archive by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Calculation archive ID to delete (required)' },
          },
          required: ['id'],
        },
      },
      {
        name: 'delete_network',
        description: 'Delete all calculations belonging to an entire network from the archive',
        inputSchema: {
          type: 'object',
          properties: {
            network: { type: 'string', description: 'Network name — all calculations in this network will be deleted (required)' },
          },
          required: ['network'],
        },
      },
      // ── Clutter ───────────────────────────────────────────────────────────
      {
        name: 'add_clutter',
        description: 'Upload clutter data (buildings, vegetation, terrain obstacles) as GeoJSON to improve propagation model accuracy',
        inputSchema: {
          type: 'object',
          properties: {
            geojson: {
              type: 'object',
              description: 'GeoJSON FeatureCollection containing clutter features with height properties (required)',
            },
          },
          required: ['geojson'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'create_area_coverage':  return await this.createAreaCoverage(args);
        case 'create_path_profile':   return await this.createPathProfile(args);
        case 'create_points_profile': return await this.createPointsProfile(args);
        case 'find_best_server':      return await this.findBestServer(args);
        case 'find_interference':     return await this.findInterference(args);
        case 'merge_mesh':            return await this.mergeMesh(args);
        case 'list_archive':          return await this.listArchive(args);
        case 'export_archive':        return await this.exportArchive(args);
        case 'delete_archive':        return await this.deleteArchive(args);
        case 'delete_network':        return await this.deleteNetwork(args);
        case 'add_clutter':           return await this.addClutter(args);
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

  private buildHeaders(contentType = 'application/json'): Record<string, string> {
    return {
      key: this.apiKey,
      'Content-Type': contentType,
    };
  }

  private async cloudRFRequest(path: string, options: RequestInit = {}): Promise<ToolResult> {
    const url = `${this.baseUrl}${path}`;
    const response = await this.fetchWithRetry(url, { ...options, headers: this.buildHeaders() });

    if (!response.ok) {
      let detail = '';
      try { detail = await response.text(); } catch { /* ignore */ }
      return {
        content: [{ type: 'text', text: `CloudRF API error ${response.status} ${response.statusText}${detail ? ': ' + detail.slice(0, 400) : ''}` }],
        isError: true,
      };
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      return { content: [{ type: 'text', text: `CloudRF returned non-JSON response (HTTP ${response.status})` }], isError: false };
    }

    const text = JSON.stringify(data, null, 2);
    const truncated = text.length > 10_000
      ? text.slice(0, 10_000) + `\n... [truncated, ${text.length} total chars]`
      : text;
    return { content: [{ type: 'text', text: truncated }], isError: false };
  }

  // ── Coverage ──────────────────────────────────────────────────────────────

  private async createAreaCoverage(args: Record<string, unknown>): Promise<ToolResult> {
    return this.cloudRFRequest('/area', {
      method: 'POST',
      body: JSON.stringify(args),
    });
  }

  // ── Path Profiles ─────────────────────────────────────────────────────────

  private async createPathProfile(args: Record<string, unknown>): Promise<ToolResult> {
    return this.cloudRFRequest('/path', {
      method: 'POST',
      body: JSON.stringify(args),
    });
  }

  private async createPointsProfile(args: Record<string, unknown>): Promise<ToolResult> {
    return this.cloudRFRequest('/points', {
      method: 'POST',
      body: JSON.stringify(args),
    });
  }

  // ── Network Analysis ──────────────────────────────────────────────────────

  private async findBestServer(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.network) params.set('network', args.network as string);
    if (args.rxlat !== undefined) params.set('rxlat', String(args.rxlat));
    if (args.rxlon !== undefined) params.set('rxlon', String(args.rxlon));
    if (args.rxalt !== undefined) params.set('rxalt', String(args.rxalt));
    return this.cloudRFRequest(`/network?${params.toString()}`);
  }

  private async findInterference(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.network) params.set('network', args.network as string);
    if (args.rxlat !== undefined) params.set('rxlat', String(args.rxlat));
    if (args.rxlon !== undefined) params.set('rxlon', String(args.rxlon));
    if (args.rxalt !== undefined) params.set('rxalt', String(args.rxalt));
    return this.cloudRFRequest(`/interference?${params.toString()}`);
  }

  private async mergeMesh(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.network) params.set('network', args.network as string);
    return this.cloudRFRequest(`/mesh?${params.toString()}`);
  }

  // ── Archive ───────────────────────────────────────────────────────────────

  private async listArchive(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.network) params.set('network', args.network as string);
    if (args.site) params.set('site', args.site as string);
    const qs = params.toString();
    return this.cloudRFRequest(`/archive/list${qs ? '?' + qs : ''}`);
  }

  private async exportArchive(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.set('id', args.id as string);
    if (args.format) params.set('format', args.format as string);
    return this.cloudRFRequest(`/archive/export?${params.toString()}`);
  }

  private async deleteArchive(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.set('id', args.id as string);
    return this.cloudRFRequest(`/archive/delete?${params.toString()}`);
  }

  private async deleteNetwork(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.set('network', args.network as string);
    return this.cloudRFRequest(`/archive/delete/network?${params.toString()}`);
  }

  // ── Clutter ───────────────────────────────────────────────────────────────

  private async addClutter(args: Record<string, unknown>): Promise<ToolResult> {
    return this.cloudRFRequest('/clutter/add', {
      method: 'POST',
      body: JSON.stringify(args.geojson),
    });
  }
}
