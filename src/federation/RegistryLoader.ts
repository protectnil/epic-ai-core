/**
 * @epicai/legion — Registry Loader
 * Loads mcp-registry.json and builds ServerConnection[] for the FederationManager.
 * Resolves credentials from environment variables or a SecretsProvider.
 * Built on the Epic AI Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ServerConnection, AuthConfig } from '../types/index.js';

// ─── Registry Entry (matches generate-registry.ts output) ────────────────────

interface RegistryEntry {
  id: string;
  name: string;
  description: string;
  category: string;
  keywords: string[];
  type: 'mcp' | 'rest' | 'both';
  mcp?: {
    transport: 'stdio' | 'streamable-http';
    command?: string;
    args?: string[];
    envKeys?: string[];
    url?: string;
    requiresOAuth?: boolean;
    toolCount?: number;
    toolNames?: string[];
    recommendation?: string;
    repoUrl?: string;
  };
  rest?: {
    module: string;
    className: string;
    baseUrl: string;
    authType: string;
    envKey: string;
    toolCount: number;
    toolNames: string[];
  };
}

// ─── Loader Options ──────────────────────────────────────────────────────────

export interface RegistryLoaderOptions {
  /**
   * Path to mcp-registry.json. Defaults to the bundled file in the package.
   */
  registryPath?: string;

  /**
   * Which adapter types to load.
   * - 'mcp-only': only load adapters with vendor MCP connections
   * - 'rest-only': only load REST adapters
   * - 'all': load everything (default)
   * - 'mcp-preferred': load MCP when available, REST as fallback
   */
  strategy?: 'mcp-only' | 'rest-only' | 'all' | 'mcp-preferred';

  /**
   * Filter by category (e.g., ['cybersecurity', 'devops']).
   * If empty or undefined, all categories are included.
   */
  categories?: string[];

  /**
   * Filter by adapter ID. Only load these specific adapters.
   * If empty or undefined, all adapters are included.
   */
  include?: string[];

  /**
   * Exclude these adapter IDs.
   */
  exclude?: string[];

  /**
   * Custom credential resolver. If not provided, reads from process.env.
   * The function receives the env var name and returns the value.
   */
  resolveCredential?: (envKey: string) => string | undefined;

  /**
   * Whether to skip adapters whose credentials are not found in env.
   * Default: true (only connect adapters the customer has credentials for).
   */
  skipMissingCredentials?: boolean;
}

// ─── Loader Result ───────────────────────────────────────────────────────────

export interface LoadedAdapter {
  /** ServerConnection for the FederationManager */
  connection: ServerConnection;
  /** Whether this is an MCP or REST connection */
  connectionType: 'mcp' | 'rest';
  /** Original registry entry for reference */
  entry: RegistryEntry;
}

export interface RegistryLoadResult {
  /** Adapters that were loaded successfully (credentials found) */
  loaded: LoadedAdapter[];
  /** Adapters that were skipped (missing credentials) */
  skipped: Array<{ id: string; reason: string }>;
  /** Total entries in the registry */
  totalInRegistry: number;
}

// ─── Loader ──────────────────────────────────────────────────────────────────

export class RegistryLoader {
  private readonly options: Required<RegistryLoaderOptions>;
  private registry: RegistryEntry[] = [];

  constructor(options: RegistryLoaderOptions = {}) {
    this.options = {
      registryPath: options.registryPath || join(import.meta.dirname || __dirname, '..', '..', 'mcp-registry.json'),
      strategy: options.strategy || 'mcp-preferred',
      categories: options.categories || [],
      include: options.include || [],
      exclude: options.exclude || [],
      resolveCredential: options.resolveCredential || ((key: string) => process.env[key]),
      skipMissingCredentials: options.skipMissingCredentials ?? true,
    };
  }

  /**
   * Load the registry and build ServerConnection[] for all matching adapters.
   */
  load(): RegistryLoadResult {
    // Read the registry file
    const raw = readFileSync(this.options.registryPath, 'utf-8');
    this.registry = JSON.parse(raw) as RegistryEntry[];

    const result: RegistryLoadResult = {
      loaded: [],
      skipped: [],
      totalInRegistry: this.registry.length,
    };

    for (const entry of this.registry) {
      // Apply filters
      if (this.options.include.length > 0 && !this.options.include.includes(entry.id)) continue;
      if (this.options.exclude.includes(entry.id)) continue;
      if (this.options.categories.length > 0 && !this.options.categories.includes(entry.category)) continue;

      // Determine which connection type to use
      const connectionType = this.resolveConnectionType(entry);
      if (!connectionType) {
        result.skipped.push({ id: entry.id, reason: 'No matching connection type for strategy' });
        continue;
      }

      // Build the ServerConnection
      const loaded = connectionType === 'mcp'
        ? this.buildMCPConnection(entry)
        : this.buildRESTConnection(entry);

      if (loaded) {
        result.loaded.push(loaded);
      } else {
        result.skipped.push({ id: entry.id, reason: 'Missing credentials' });
      }
    }

    return result;
  }

  /**
   * Convenience: return just the ServerConnection[] for FederationManager.
   */
  loadConnections(): ServerConnection[] {
    return this.load().loaded.map(l => l.connection);
  }

  private resolveConnectionType(entry: RegistryEntry): 'mcp' | 'rest' | null {
    switch (this.options.strategy) {
      case 'mcp-only':
        return entry.mcp ? 'mcp' : null;
      case 'rest-only':
        return entry.rest ? 'rest' : null;
      case 'mcp-preferred':
        if (entry.mcp && !entry.mcp.requiresOAuth) return 'mcp';
        if (entry.rest) return 'rest';
        if (entry.mcp) return 'mcp'; // OAuth MCP as last resort
        return null;
      case 'all':
        // Prefer MCP for 'both' type
        if (entry.mcp && !entry.mcp.requiresOAuth) return 'mcp';
        if (entry.rest) return 'rest';
        return entry.mcp ? 'mcp' : null;
      default:
        return null;
    }
  }

  private buildMCPConnection(entry: RegistryEntry): LoadedAdapter | null {
    const mcp = entry.mcp;
    if (!mcp) return null;

    if (mcp.transport === 'stdio') {
      // Resolve env vars for stdio MCP
      const env: Record<string, string> = {};
      const missingKeys: string[] = [];

      for (const key of mcp.envKeys || []) {
        const value = this.options.resolveCredential(key);
        if (value) {
          env[key] = value;
        } else {
          missingKeys.push(key);
        }
      }

      // If any required env vars are missing and we're skipping, bail
      if (missingKeys.length > 0 && this.options.skipMissingCredentials) {
        return null;
      }

      const connection: ServerConnection = {
        name: entry.id,
        transport: 'stdio',
        command: mcp.command,
        args: mcp.args,
      };

      // Store env vars in the connection for MCPClientAdapter to use
      // The ServerConnection type doesn't have env, but MCPClientAdapter's
      // StdioClientTransport accepts it. We extend via type assertion.
      (connection as any).env = env;

      return { connection, connectionType: 'mcp', entry };
    }

    if (mcp.transport === 'streamable-http' && mcp.url) {
      const connection: ServerConnection = {
        name: entry.id,
        transport: 'streamable-http',
        url: mcp.url,
      };

      // If not OAuth, try to resolve a Bearer token from env
      if (!mcp.requiresOAuth) {
        const tokenKey = deriveEnvKey(entry.id) + '_TOKEN';
        const token = this.options.resolveCredential(tokenKey);
        if (token) {
          connection.auth = { type: 'bearer', token };
        } else if (this.options.skipMissingCredentials) {
          return null;
        }
      }

      return { connection, connectionType: 'mcp', entry };
    }

    return null;
  }

  private buildRESTConnection(entry: RegistryEntry): LoadedAdapter | null {
    const rest = entry.rest;
    if (!rest) return null;

    // Resolve the primary credential
    const credential = this.options.resolveCredential(rest.envKey);
    if (!credential && this.options.skipMissingCredentials) {
      return null;
    }

    // REST adapters are loaded differently — they're instantiated as classes,
    // not connected via MCP protocol. The ServerConnection here is a shim
    // that tells the FederationManager to load the REST adapter module.
    const auth: AuthConfig = { type: 'bearer', token: credential || '' };

    const connection: ServerConnection = {
      name: entry.id,
      transport: 'stdio', // REST adapters are in-process, not network
      command: '__rest_adapter__', // Sentinel value for FederationManager
      args: [rest.module, rest.className, rest.envKey],
    };

    // Attach auth for credential propagation
    connection.auth = auth;

    return { connection, connectionType: 'rest', entry };
  }
}

function deriveEnvKey(adapterId: string): string {
  return adapterId.toUpperCase().replace(/-/g, '_');
}
