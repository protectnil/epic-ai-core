/**
 * Lansweeper MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/Lansweeper-public/MCP-server-lansweeper — transport: stdio, auth: Personal Access Token
// MCP status: Official (published under Lansweeper-public org). Experimental label, ~56 commits. Only 3 tools — fails 10+ tool criterion.
// Our adapter covers: 12 tools. Vendor MCP covers: 3 tools (get-asset-details, get-authorized-sites, get-assets-resources).
// Recommendation: use-rest-api — vendor MCP fails criterion 3 (only 3 tools, need 10+). Our adapter provides full coverage.
//
// Base URL: https://api.lansweeper.com/api/v2/graphql (GraphQL endpoint — single endpoint for all queries)
// Auth: Personal Access Token (PAT) — Authorization: Token <PAT> header. Generated in Lansweeper Sites > Settings > Developer Tools.
//       OAuth2 also supported for integrations: POST https://api.lansweeper.com/api/v2/oauth/token (client_credentials),
//       OAuth access token uses Authorization: Bearer <token>.
// Docs: https://developer.lansweeper.com/docs/data-api/get-started/quickstart/
// Rate limits: Not publicly documented — consult Lansweeper support for enterprise rate limits

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface LansweeperConfig {
  accessToken: string;
  baseUrl?: string;
}

export class LansweeperMCPServer extends MCPAdapterBase {
  private readonly accessToken: string;
  private readonly baseUrl: string;

  constructor(config: LansweeperConfig) {
    super();
    this.accessToken = config.accessToken;
    this.baseUrl = config.baseUrl || 'https://api.lansweeper.com/api/v2/graphql';
  }

  static catalog() {
    return {
      name: 'lansweeper',
      displayName: 'Lansweeper',
      version: '1.0.0',
      category: 'cybersecurity',
      keywords: [
        'lansweeper', 'it asset management', 'asset discovery', 'itam', 'network scanning',
        'hardware inventory', 'software inventory', 'device management', 'it inventory',
        'vulnerability', 'end of life', 'EOL', 'scanned devices', 'OT assets',
      ],
      toolNames: [
        'list_sites',
        'get_assets', 'get_asset', 'search_assets',
        'get_asset_software', 'get_asset_users',
        'get_software_inventory', 'get_user_inventory',
        'get_windows_assets', 'get_linux_assets', 'get_network_devices',
        'get_asset_vulnerabilities',
      ],
      description: 'Lansweeper IT asset discovery: query hardware and software inventory, scanned devices, users, network devices, and vulnerability data across all sites.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_sites',
        description: 'List all Lansweeper sites accessible with the current access token, returning site IDs and names',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_assets',
        description: 'List all assets in a Lansweeper site with optional type filter and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            site_id: {
              type: 'string',
              description: 'Lansweeper site ID to query assets from',
            },
            asset_type: {
              type: 'string',
              description: 'Filter by asset type (e.g. Windows, Linux, Mac, VMware, Network Device)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of assets to return (default: 100, max: 500)',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
          required: ['site_id'],
        },
      },
      {
        name: 'get_asset',
        description: 'Get detailed hardware and software information for a specific asset by asset key',
        inputSchema: {
          type: 'object',
          properties: {
            site_id: {
              type: 'string',
              description: 'Lansweeper site ID that owns the asset',
            },
            asset_key: {
              type: 'string',
              description: 'Unique asset key identifier',
            },
          },
          required: ['site_id', 'asset_key'],
        },
      },
      {
        name: 'search_assets',
        description: 'Search assets by name, IP address, MAC address, or username across a Lansweeper site',
        inputSchema: {
          type: 'object',
          properties: {
            site_id: {
              type: 'string',
              description: 'Lansweeper site ID to search within',
            },
            query: {
              type: 'string',
              description: 'Search term: asset name, IP address, MAC address, or username',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results to return (default: 50)',
            },
          },
          required: ['site_id', 'query'],
        },
      },
      {
        name: 'get_asset_software',
        description: 'List all software installed on a specific asset including version, publisher, and install date',
        inputSchema: {
          type: 'object',
          properties: {
            site_id: {
              type: 'string',
              description: 'Lansweeper site ID that owns the asset',
            },
            asset_key: {
              type: 'string',
              description: 'Unique asset key identifier',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of software entries to return (default: 200)',
            },
          },
          required: ['site_id', 'asset_key'],
        },
      },
      {
        name: 'get_asset_users',
        description: 'Get users logged into or associated with a specific asset from scan data',
        inputSchema: {
          type: 'object',
          properties: {
            site_id: {
              type: 'string',
              description: 'Lansweeper site ID that owns the asset',
            },
            asset_key: {
              type: 'string',
              description: 'Unique asset key identifier',
            },
          },
          required: ['site_id', 'asset_key'],
        },
      },
      {
        name: 'get_software_inventory',
        description: 'List all unique software titles found across a site with installation counts and version info',
        inputSchema: {
          type: 'object',
          properties: {
            site_id: {
              type: 'string',
              description: 'Lansweeper site ID to query software inventory from',
            },
            software_name: {
              type: 'string',
              description: 'Filter by software name (partial match)',
            },
            publisher: {
              type: 'string',
              description: 'Filter by software publisher name',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of software titles to return (default: 100)',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
          required: ['site_id'],
        },
      },
      {
        name: 'get_user_inventory',
        description: 'List all users discovered across a Lansweeper site from Active Directory and local account scans',
        inputSchema: {
          type: 'object',
          properties: {
            site_id: {
              type: 'string',
              description: 'Lansweeper site ID to query users from',
            },
            domain: {
              type: 'string',
              description: 'Filter by domain name',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of users to return (default: 100)',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
          required: ['site_id'],
        },
      },
      {
        name: 'get_windows_assets',
        description: 'List all Windows-based assets in a site with OS version, domain, and last scan time',
        inputSchema: {
          type: 'object',
          properties: {
            site_id: {
              type: 'string',
              description: 'Lansweeper site ID to query Windows assets from',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of assets to return (default: 100)',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
          required: ['site_id'],
        },
      },
      {
        name: 'get_linux_assets',
        description: 'List all Linux-based assets in a site with distribution, kernel version, and last scan time',
        inputSchema: {
          type: 'object',
          properties: {
            site_id: {
              type: 'string',
              description: 'Lansweeper site ID to query Linux assets from',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of assets to return (default: 100)',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
          required: ['site_id'],
        },
      },
      {
        name: 'get_network_devices',
        description: 'List network devices (routers, switches, firewalls, printers) discovered in a site with IP and MAC addresses',
        inputSchema: {
          type: 'object',
          properties: {
            site_id: {
              type: 'string',
              description: 'Lansweeper site ID to query network devices from',
            },
            device_type: {
              type: 'string',
              description: 'Filter by device type (e.g. Router, Switch, Firewall, Printer, Access Point)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of devices to return (default: 100)',
            },
            cursor: {
              type: 'string',
              description: 'Pagination cursor from a previous response',
            },
          },
          required: ['site_id'],
        },
      },
      {
        name: 'get_asset_vulnerabilities',
        description: 'Get vulnerability scan results and CVE data for a specific asset based on installed software versions',
        inputSchema: {
          type: 'object',
          properties: {
            site_id: {
              type: 'string',
              description: 'Lansweeper site ID that owns the asset',
            },
            asset_key: {
              type: 'string',
              description: 'Unique asset key identifier',
            },
            severity: {
              type: 'string',
              description: 'Filter by CVE severity: CRITICAL, HIGH, MEDIUM, LOW (default: returns all)',
            },
          },
          required: ['site_id', 'asset_key'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_sites':
          return this.listSites();
        case 'get_assets':
          return this.getAssets(args);
        case 'get_asset':
          return this.getAsset(args);
        case 'search_assets':
          return this.searchAssets(args);
        case 'get_asset_software':
          return this.getAssetSoftware(args);
        case 'get_asset_users':
          return this.getAssetUsers(args);
        case 'get_software_inventory':
          return this.getSoftwareInventory(args);
        case 'get_user_inventory':
          return this.getUserInventory(args);
        case 'get_windows_assets':
          return this.getWindowsAssets(args);
        case 'get_linux_assets':
          return this.getLinuxAssets(args);
        case 'get_network_devices':
          return this.getNetworkDevices(args);
        case 'get_asset_vulnerabilities':
          return this.getAssetVulnerabilities(args);
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
      'Authorization': `Token ${this.accessToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  }

  private async graphql(query: string, variables: Record<string, unknown> = {}): Promise<ToolResult> {
    const response = await this.fetchWithRetry(this.baseUrl, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ query, variables }),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json() as { errors?: Array<{ message: string }>; data?: unknown };
    if (data.errors && data.errors.length > 0) {
      return { content: [{ type: 'text', text: `GraphQL error: ${data.errors.map((e) => e.message).join('; ')}` }], isError: true };
    }
    return { content: [{ type: 'text', text: this.truncate(data.data) }], isError: false };
  }

  private async listSites(): Promise<ToolResult> {
    const query = `
      query {
        authorizedSites {
          sites {
            id
            name
          }
        }
      }
    `;
    return this.graphql(query);
  }

  private async getAssets(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.site_id) return { content: [{ type: 'text', text: 'site_id is required' }], isError: true };
    const limit = (args.limit as number) || 100;
    const filters: string[] = [];
    if (args.asset_type) filters.push(`{operator: EQUAL, path: "assetBasicInfo.type", value: "${encodeURIComponent(args.asset_type as string)}"}`);
    const filterStr = filters.length > 0 ? `filters: [${filters.join(', ')}],` : '';
    const cursorStr = args.cursor ? `cursor: "${encodeURIComponent(args.cursor as string)}",` : '';
    const query = `
      query {
        site(id: "${encodeURIComponent(args.site_id as string)}") {
          assetResources(${filterStr} ${cursorStr} pagination: { limit: ${limit} }) {
            total
            pagination { cursor nextPage }
            items {
              assetBasicInfo { name description type domain ipAddress macAddress lastSeen firstSeen }
            }
          }
        }
      }
    `;
    return this.graphql(query);
  }

  private async getAsset(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.site_id || !args.asset_key) {
      return { content: [{ type: 'text', text: 'site_id and asset_key are required' }], isError: true };
    }
    const query = `
      query {
        site(id: "${encodeURIComponent(args.site_id as string)}") {
          assetResources(filters: [{operator: EQUAL, path: "assetBasicInfo.key", value: "${encodeURIComponent(args.asset_key as string)}"}]) {
            items {
              assetBasicInfo { key name description type domain ipAddress macAddress lastSeen firstSeen operatingSystem }
              assetCustom { manufacturer model serialNumber purchaseDate warrantyDate }
            }
          }
        }
      }
    `;
    return this.graphql(query);
  }

  private async searchAssets(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.site_id || !args.query) {
      return { content: [{ type: 'text', text: 'site_id and query are required' }], isError: true };
    }
    const limit = (args.limit as number) || 50;
    const query = `
      query {
        site(id: "${encodeURIComponent(args.site_id as string)}") {
          assetResources(
            filters: [{operator: LIKE, path: "assetBasicInfo.name", value: "${encodeURIComponent(args.query as string)}"}]
            pagination: { limit: ${limit} }
          ) {
            total
            items {
              assetBasicInfo { key name type domain ipAddress macAddress lastSeen }
            }
          }
        }
      }
    `;
    return this.graphql(query);
  }

  private async getAssetSoftware(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.site_id || !args.asset_key) {
      return { content: [{ type: 'text', text: 'site_id and asset_key are required' }], isError: true };
    }
    const limit = (args.limit as number) || 200;
    const query = `
      query {
        site(id: "${encodeURIComponent(args.site_id as string)}") {
          assetResources(
            filters: [{operator: EQUAL, path: "assetBasicInfo.key", value: "${encodeURIComponent(args.asset_key as string)}"}]
          ) {
            items {
              assetBasicInfo { name }
              software(pagination: { limit: ${limit} }) {
                items { name version publisher installDate }
              }
            }
          }
        }
      }
    `;
    return this.graphql(query);
  }

  private async getAssetUsers(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.site_id || !args.asset_key) {
      return { content: [{ type: 'text', text: 'site_id and asset_key are required' }], isError: true };
    }
    const query = `
      query {
        site(id: "${encodeURIComponent(args.site_id as string)}") {
          assetResources(
            filters: [{operator: EQUAL, path: "assetBasicInfo.key", value: "${encodeURIComponent(args.asset_key as string)}"}]
          ) {
            items {
              assetBasicInfo { name }
              logonHistory {
                items { userName lastLogon }
              }
            }
          }
        }
      }
    `;
    return this.graphql(query);
  }

  private async getSoftwareInventory(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.site_id) return { content: [{ type: 'text', text: 'site_id is required' }], isError: true };
    const limit = (args.limit as number) || 100;
    const filters: string[] = [];
    if (args.software_name) filters.push(`{operator: LIKE, path: "software.name", value: "${encodeURIComponent(args.software_name as string)}"}`);
    if (args.publisher) filters.push(`{operator: LIKE, path: "software.publisher", value: "${encodeURIComponent(args.publisher as string)}"}`);
    const filterStr = filters.length > 0 ? `filters: [${filters.join(', ')}],` : '';
    const cursorStr = args.cursor ? `cursor: "${encodeURIComponent(args.cursor as string)}",` : '';
    const query = `
      query {
        site(id: "${encodeURIComponent(args.site_id as string)}") {
          assetResources(${filterStr} ${cursorStr} pagination: { limit: ${limit} }) {
            total
            pagination { cursor nextPage }
            items {
              assetBasicInfo { name }
              software(pagination: { limit: 10 }) {
                items { name version publisher installDate }
              }
            }
          }
        }
      }
    `;
    return this.graphql(query);
  }

  private async getUserInventory(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.site_id) return { content: [{ type: 'text', text: 'site_id is required' }], isError: true };
    const limit = (args.limit as number) || 100;
    const filters: string[] = [];
    if (args.domain) filters.push(`{operator: EQUAL, path: "assetBasicInfo.domain", value: "${encodeURIComponent(args.domain as string)}"}`);
    const filterStr = filters.length > 0 ? `filters: [${filters.join(', ')}],` : '';
    const cursorStr = args.cursor ? `cursor: "${encodeURIComponent(args.cursor as string)}",` : '';
    const query = `
      query {
        site(id: "${encodeURIComponent(args.site_id as string)}") {
          assetResources(
            ${filterStr} ${cursorStr}
            filters: [{operator: EQUAL, path: "assetBasicInfo.type", value: "User"}]
            pagination: { limit: ${limit} }
          ) {
            total
            pagination { cursor nextPage }
            items {
              assetBasicInfo { name domain description lastSeen }
            }
          }
        }
      }
    `;
    return this.graphql(query);
  }

  private async getWindowsAssets(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.site_id) return { content: [{ type: 'text', text: 'site_id is required' }], isError: true };
    const limit = (args.limit as number) || 100;
    const cursorStr = args.cursor ? `cursor: "${encodeURIComponent(args.cursor as string)}",` : '';
    const query = `
      query {
        site(id: "${encodeURIComponent(args.site_id as string)}") {
          assetResources(
            filters: [{operator: LIKE, path: "assetBasicInfo.type", value: "Windows"}]
            ${cursorStr} pagination: { limit: ${limit} }
          ) {
            total
            pagination { cursor nextPage }
            items {
              assetBasicInfo { key name type domain ipAddress operatingSystem lastSeen }
            }
          }
        }
      }
    `;
    return this.graphql(query);
  }

  private async getLinuxAssets(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.site_id) return { content: [{ type: 'text', text: 'site_id is required' }], isError: true };
    const limit = (args.limit as number) || 100;
    const cursorStr = args.cursor ? `cursor: "${encodeURIComponent(args.cursor as string)}",` : '';
    const query = `
      query {
        site(id: "${encodeURIComponent(args.site_id as string)}") {
          assetResources(
            filters: [{operator: LIKE, path: "assetBasicInfo.type", value: "Linux"}]
            ${cursorStr} pagination: { limit: ${limit} }
          ) {
            total
            pagination { cursor nextPage }
            items {
              assetBasicInfo { key name type domain ipAddress operatingSystem lastSeen }
            }
          }
        }
      }
    `;
    return this.graphql(query);
  }

  private async getNetworkDevices(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.site_id) return { content: [{ type: 'text', text: 'site_id is required' }], isError: true };
    const limit = (args.limit as number) || 100;
    const cursorStr = args.cursor ? `cursor: "${encodeURIComponent(args.cursor as string)}",` : '';
    const deviceFilter = args.device_type
      ? `{operator: EQUAL, path: "assetBasicInfo.type", value: "${encodeURIComponent(args.device_type as string)}"}`
      : `{operator: IN, path: "assetBasicInfo.type", value: "Router,Switch,Firewall,Printer,Access Point"}`;
    const query = `
      query {
        site(id: "${encodeURIComponent(args.site_id as string)}") {
          assetResources(
            filters: [${deviceFilter}]
            ${cursorStr} pagination: { limit: ${limit} }
          ) {
            total
            pagination { cursor nextPage }
            items {
              assetBasicInfo { key name type ipAddress macAddress description lastSeen }
            }
          }
        }
      }
    `;
    return this.graphql(query);
  }

  private async getAssetVulnerabilities(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.site_id || !args.asset_key) {
      return { content: [{ type: 'text', text: 'site_id and asset_key are required' }], isError: true };
    }
    const severityFilter = args.severity
      ? `filters: [{operator: EQUAL, path: "severity", value: "${encodeURIComponent(args.severity as string)}"}]`
      : '';
    const query = `
      query {
        site(id: "${encodeURIComponent(args.site_id as string)}") {
          assetResources(
            filters: [{operator: EQUAL, path: "assetBasicInfo.key", value: "${encodeURIComponent(args.asset_key as string)}"}]
          ) {
            items {
              assetBasicInfo { name }
              vulnerabilities(${severityFilter}) {
                items { cveId severity cvssScore description affectedSoftware publishedDate }
              }
            }
          }
        }
      }
    `;
    return this.graphql(query);
  }
}
