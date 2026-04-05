/**
 * IBM Containers (Bluemix) MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// IBM Containers REST API v3 for managing single containers, container groups,
// Docker images, public IP addresses, volumes, and file shares in Bluemix.
//
// Base URL: https://containers-api.ng.bluemix.net/v3
// Auth: X-Auth-Token (JWT from `cf oauth-token`) + X-Auth-Project-Id (space GUID)
// Docs: https://new-console.ng.bluemix.net/docs/containers/container_index.html
// Spec: https://api.apis.guru/v2/specs/bluemix.net/containers/3.0.0/openapi.json

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface BluemixContainersConfig {
  /**
   * Bluemix JWT access token. Obtain via `cf oauth-token`.
   */
  authToken: string;
  /**
   * Bluemix organization space GUID. Obtain via `cf space <name> --guid`.
   */
  projectId: string;
  /**
   * Override the API base URL. Defaults to https://containers-api.ng.bluemix.net/v3
   */
  baseUrl?: string;
}

export class BluemixContainersMCPServer extends MCPAdapterBase {
  private readonly authToken: string;
  private readonly projectId: string;
  private readonly baseUrl: string;

  constructor(config: BluemixContainersConfig) {
    super();
    this.authToken = config.authToken;
    this.projectId = config.projectId;
    this.baseUrl = config.baseUrl || 'https://containers-api.ng.bluemix.net/v3';
  }

  private get headers(): Record<string, string> {
    return {
      'X-Auth-Token': this.authToken,
      'X-Auth-Project-Id': this.projectId,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // --- Single Containers ---
      {
        name: 'list_containers',
        description: 'List all single containers running in the Bluemix space.',
        inputSchema: {
          type: 'object',
          properties: {
            all: { type: 'boolean', description: 'If true, list all containers including stopped ones' },
          },
        },
      },
      {
        name: 'create_container',
        description: 'Create and start a single container in the Bluemix space from a Docker image in the private registry.',
        inputSchema: {
          type: 'object',
          properties: {
            Image: { type: 'string', description: 'Full path to Docker image in the private Bluemix registry, e.g. registry.ng.bluemix.net/<namespace>/<image>' },
            name: { type: 'string', description: 'Name for the container (letters, numbers, periods, underscores, hyphens; must start with a letter)' },
            Cmd: { type: 'array', items: { type: 'string' }, description: 'Command to run in the container' },
            Env: { type: 'array', items: { type: 'string' }, description: 'Environment variables in KEY=VALUE format' },
            Memory: { type: 'number', description: 'Memory limit in MB' },
            ExposedPorts: { type: 'object', description: 'Ports to expose, e.g. {"8080/tcp": {}}' },
          },
          required: ['Image'],
        },
      },
      {
        name: 'inspect_container',
        description: 'Inspect a single container and return detailed configuration and state information.',
        inputSchema: {
          type: 'object',
          properties: {
            name_or_id: { type: 'string', description: 'Container name or ID' },
          },
          required: ['name_or_id'],
        },
      },
      {
        name: 'get_container_status',
        description: 'Get the current running state of a single container by its ID.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Container ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'delete_container',
        description: 'Remove a single container from the Bluemix space.',
        inputSchema: {
          type: 'object',
          properties: {
            name_or_id: { type: 'string', description: 'Container name or ID' },
          },
          required: ['name_or_id'],
        },
      },
      {
        name: 'start_container',
        description: 'Start a stopped single container.',
        inputSchema: {
          type: 'object',
          properties: {
            name_or_id: { type: 'string', description: 'Container name or ID' },
          },
          required: ['name_or_id'],
        },
      },
      {
        name: 'stop_container',
        description: 'Stop a running single container.',
        inputSchema: {
          type: 'object',
          properties: {
            name_or_id: { type: 'string', description: 'Container name or ID' },
            t: { type: 'number', description: 'Seconds to wait before forcibly stopping (default: 10)' },
          },
          required: ['name_or_id'],
        },
      },
      {
        name: 'restart_container',
        description: 'Restart a single container.',
        inputSchema: {
          type: 'object',
          properties: {
            name_or_id: { type: 'string', description: 'Container name or ID' },
            t: { type: 'number', description: 'Seconds to wait before forcibly restarting (default: 10)' },
          },
          required: ['name_or_id'],
        },
      },
      {
        name: 'pause_container',
        description: 'Pause all processes in a single running container.',
        inputSchema: {
          type: 'object',
          properties: {
            name_or_id: { type: 'string', description: 'Container name or ID' },
          },
          required: ['name_or_id'],
        },
      },
      {
        name: 'unpause_container',
        description: 'Unpause all processes in a paused single container.',
        inputSchema: {
          type: 'object',
          properties: {
            name_or_id: { type: 'string', description: 'Container name or ID' },
          },
          required: ['name_or_id'],
        },
      },
      {
        name: 'rename_container',
        description: 'Rename a single container.',
        inputSchema: {
          type: 'object',
          properties: {
            name_or_id: { type: 'string', description: 'Current container name or ID' },
            name: { type: 'string', description: 'New name for the container' },
          },
          required: ['name_or_id', 'name'],
        },
      },
      // --- Container Groups ---
      {
        name: 'list_container_groups',
        description: 'List all container groups in the Bluemix space.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'create_container_group',
        description: 'Create and start a container group in Bluemix — multiple instances of the same image with built-in load balancing.',
        inputSchema: {
          type: 'object',
          properties: {
            Name: { type: 'string', description: 'Name for the container group' },
            Image: { type: 'string', description: 'Full path to Docker image in the private Bluemix registry' },
            NumberInstances: { type: 'object', description: 'Instance count config, e.g. {"Desired": 2, "Min": 1, "Max": 5}' },
            Memory: { type: 'number', description: 'Memory per instance in MB' },
            Env: { type: 'array', items: { type: 'string' }, description: 'Environment variables in KEY=VALUE format' },
            Port: { type: 'number', description: 'Port to expose for the group' },
            Route: { type: 'object', description: 'Public route to map, e.g. {"domain": "mybluemix.net", "host": "myapp"}' },
          },
          required: ['Name', 'Image'],
        },
      },
      {
        name: 'inspect_container_group',
        description: 'Inspect a container group and return full configuration including instance count and route mappings.',
        inputSchema: {
          type: 'object',
          properties: {
            name_or_id: { type: 'string', description: 'Container group name or ID' },
          },
          required: ['name_or_id'],
        },
      },
      {
        name: 'update_container_group',
        description: 'Update a container group — change desired instance count or auto-scaling settings.',
        inputSchema: {
          type: 'object',
          properties: {
            name_or_id: { type: 'string', description: 'Container group name or ID' },
            NumberInstances: { type: 'object', description: 'Updated instance count config, e.g. {"Desired": 3}' },
          },
          required: ['name_or_id'],
        },
      },
      {
        name: 'delete_container_group',
        description: 'Stop and delete all container instances in a container group.',
        inputSchema: {
          type: 'object',
          properties: {
            name_or_id: { type: 'string', description: 'Container group name or ID' },
          },
          required: ['name_or_id'],
        },
      },
      {
        name: 'map_route_to_group',
        description: 'Map a public route to a container group to make it accessible from the internet.',
        inputSchema: {
          type: 'object',
          properties: {
            name_or_id: { type: 'string', description: 'Container group name or ID' },
            domain: { type: 'string', description: 'Domain name, e.g. mybluemix.net' },
            host: { type: 'string', description: 'Hostname prefix for the route' },
          },
          required: ['name_or_id', 'domain', 'host'],
        },
      },
      {
        name: 'unmap_route_from_group',
        description: 'Unmap a public route from a container group.',
        inputSchema: {
          type: 'object',
          properties: {
            name_or_id: { type: 'string', description: 'Container group name or ID' },
            domain: { type: 'string', description: 'Domain name to unmap' },
            host: { type: 'string', description: 'Hostname prefix to unmap' },
          },
          required: ['name_or_id', 'domain', 'host'],
        },
      },
      // --- Public IP Addresses ---
      {
        name: 'list_floating_ips',
        description: 'List public IP addresses allocated to the space. Unbound IPs are available to bind to containers.',
        inputSchema: {
          type: 'object',
          properties: {
            all: { type: 'boolean', description: 'If true, list all IPs including those already bound to containers' },
          },
        },
      },
      {
        name: 'request_floating_ip',
        description: 'Request (allocate) a new public IP address for the Bluemix space.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'release_floating_ip',
        description: 'Release a public IP address back to the pool.',
        inputSchema: {
          type: 'object',
          properties: {
            ip: { type: 'string', description: 'Public IP address to release' },
          },
          required: ['ip'],
        },
      },
      {
        name: 'bind_floating_ip',
        description: 'Bind a public IP address to a single container to make it accessible from the internet.',
        inputSchema: {
          type: 'object',
          properties: {
            name_or_id: { type: 'string', description: 'Container name or ID' },
            ip: { type: 'string', description: 'Public IP address to bind' },
          },
          required: ['name_or_id', 'ip'],
        },
      },
      {
        name: 'unbind_floating_ip',
        description: 'Unbind a public IP address from a single container.',
        inputSchema: {
          type: 'object',
          properties: {
            name_or_id: { type: 'string', description: 'Container name or ID' },
            ip: { type: 'string', description: 'Public IP address to unbind' },
          },
          required: ['name_or_id', 'ip'],
        },
      },
      // --- Images ---
      {
        name: 'list_images',
        description: 'List all Docker images available in the private Bluemix registry for the organization.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'inspect_image',
        description: 'Inspect a Docker image in the private Bluemix registry and return detailed metadata.',
        inputSchema: {
          type: 'object',
          properties: {
            name_or_id: { type: 'string', description: 'Image name (full path) or ID' },
          },
          required: ['name_or_id'],
        },
      },
      {
        name: 'delete_image',
        description: 'Remove a Docker image from the private Bluemix registry.',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Image ID to remove' },
          },
          required: ['id'],
        },
      },
      // --- Registry ---
      {
        name: 'get_registry_namespace',
        description: 'Retrieve the namespace set for the organization in the private Bluemix Docker registry.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'check_namespace_availability',
        description: 'Check whether a namespace is available for use in the private Bluemix registry.',
        inputSchema: {
          type: 'object',
          properties: {
            namespace: { type: 'string', description: 'Namespace to check' },
          },
          required: ['namespace'],
        },
      },
      {
        name: 'set_registry_namespace',
        description: 'Set a namespace for your private Bluemix Docker registry. Each organization can have only one namespace.',
        inputSchema: {
          type: 'object',
          properties: {
            namespace: { type: 'string', description: 'Namespace to set for the organization registry' },
          },
          required: ['namespace'],
        },
      },
      // --- Volumes ---
      {
        name: 'list_volumes',
        description: 'List all Docker volumes created in the Bluemix space.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'inspect_volume',
        description: 'Retrieve detailed information about a specific volume in the Bluemix space.',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Volume name' },
          },
          required: ['name'],
        },
      },
      {
        name: 'create_volume',
        description: 'Create a new Docker volume in the Bluemix space for persisting container data.',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Name for the new volume' },
            fsName: { type: 'string', description: 'Optional name of a file share to host this volume' },
          },
          required: ['name'],
        },
      },
      {
        name: 'delete_volume',
        description: 'Delete a Docker volume from the Bluemix space.',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Volume name to delete' },
          },
          required: ['name'],
        },
      },
      {
        name: 'share_volume',
        description: 'Share a volume with another Bluemix space.',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Volume name to share' },
          },
          required: ['name'],
        },
      },
      // --- File Shares ---
      {
        name: 'list_file_shares',
        description: 'List all NFS file shares available in the Bluemix space.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'inspect_file_share',
        description: 'Retrieve detailed information about a specific NFS file share.',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'File share name' },
          },
          required: ['name'],
        },
      },
      {
        name: 'create_file_share',
        description: 'Create a new NFS file share in the Bluemix space to host Docker volumes.',
        inputSchema: {
          type: 'object',
          properties: {
            fsName: { type: 'string', description: 'Name for the file share' },
            fsSize: { type: 'number', description: 'Size of the file share in GB (use list_file_share_sizes to see options)' },
          },
          required: ['fsName', 'fsSize'],
        },
      },
      {
        name: 'delete_file_share',
        description: 'Delete an NFS file share from the Bluemix space.',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'File share name to delete' },
          },
          required: ['name'],
        },
      },
      {
        name: 'list_file_share_sizes',
        description: 'List available NFS file share sizes (flavors) for creating file shares in the Bluemix space.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      // --- Space / Quota / Info ---
      {
        name: 'get_quota',
        description: 'Retrieve organization and space-specific quota limits and current usage for containers.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'update_quota',
        description: 'Update the container quota settings for the current space.',
        inputSchema: {
          type: 'object',
          properties: {
            floating_ips_max: { type: 'number', description: 'Maximum number of public IP addresses' },
            ram_max: { type: 'number', description: 'Maximum RAM in MB' },
          },
        },
      },
      {
        name: 'get_usage',
        description: 'List available container sizes and current quota usage limits for the space.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_messages',
        description: 'List system messages for the authenticated user from the IBM Containers service.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_api_version',
        description: 'Retrieve the latest IBM Containers API version information.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      // --- TLS ---
      {
        name: 'get_tls_certificate',
        description: 'Retrieve the TLS certificate for the IBM Containers service.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'refresh_tls_certificate',
        description: 'Refresh the TLS certificate for the IBM Containers service.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_containers': return await this.listContainers(args);
        case 'create_container': return await this.createContainer(args);
        case 'inspect_container': return await this.inspectContainer(args);
        case 'get_container_status': return await this.getContainerStatus(args);
        case 'delete_container': return await this.deleteContainer(args);
        case 'start_container': return await this.startContainer(args);
        case 'stop_container': return await this.stopContainer(args);
        case 'restart_container': return await this.restartContainer(args);
        case 'pause_container': return await this.pauseContainer(args);
        case 'unpause_container': return await this.unpauseContainer(args);
        case 'rename_container': return await this.renameContainer(args);
        case 'list_container_groups': return await this.listContainerGroups();
        case 'create_container_group': return await this.createContainerGroup(args);
        case 'inspect_container_group': return await this.inspectContainerGroup(args);
        case 'update_container_group': return await this.updateContainerGroup(args);
        case 'delete_container_group': return await this.deleteContainerGroup(args);
        case 'map_route_to_group': return await this.mapRouteToGroup(args);
        case 'unmap_route_from_group': return await this.unmapRouteFromGroup(args);
        case 'list_floating_ips': return await this.listFloatingIps(args);
        case 'request_floating_ip': return await this.requestFloatingIp();
        case 'release_floating_ip': return await this.releaseFloatingIp(args);
        case 'bind_floating_ip': return await this.bindFloatingIp(args);
        case 'unbind_floating_ip': return await this.unbindFloatingIp(args);
        case 'list_images': return await this.listImages();
        case 'inspect_image': return await this.inspectImage(args);
        case 'delete_image': return await this.deleteImage(args);
        case 'get_registry_namespace': return await this.getRegistryNamespace();
        case 'check_namespace_availability': return await this.checkNamespaceAvailability(args);
        case 'set_registry_namespace': return await this.setRegistryNamespace(args);
        case 'list_volumes': return await this.listVolumes();
        case 'inspect_volume': return await this.inspectVolume(args);
        case 'create_volume': return await this.createVolume(args);
        case 'delete_volume': return await this.deleteVolume(args);
        case 'share_volume': return await this.shareVolume(args);
        case 'list_file_shares': return await this.listFileShares();
        case 'inspect_file_share': return await this.inspectFileShare(args);
        case 'create_file_share': return await this.createFileShare(args);
        case 'delete_file_share': return await this.deleteFileShare(args);
        case 'list_file_share_sizes': return await this.listFileShareSizes();
        case 'get_quota': return await this.getQuota();
        case 'update_quota': return await this.updateQuota(args);
        case 'get_usage': return await this.getUsage();
        case 'get_messages': return await this.getMessages();
        case 'get_api_version': return await this.getApiVersion();
        case 'get_tls_certificate': return await this.getTlsCertificate();
        case 'refresh_tls_certificate': return await this.refreshTlsCertificate();
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

  private async apiGet(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, { method: 'GET', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiPost(path: string, body?: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    if (response.status === 204) {
      return { content: [{ type: 'text', text: JSON.stringify({ success: true }) }], isError: false };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiPatch(path: string, body: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'PATCH',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    if (response.status === 204) {
      return { content: [{ type: 'text', text: JSON.stringify({ success: true }) }], isError: false };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiPut(path: string, body?: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'PUT',
      headers: this.headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    if (response.status === 204) {
      return { content: [{ type: 'text', text: JSON.stringify({ success: true }) }], isError: false };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiDelete(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, { method: 'DELETE', headers: this.headers });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify({ success: true }) }], isError: false };
  }

  // --- Single Container methods ---

  private async listContainers(args: Record<string, unknown>): Promise<ToolResult> {
    const all = args.all ? '?all=1' : '';
    return this.apiGet(`/containers/json${all}`);
  }

  private async createContainer(args: Record<string, unknown>): Promise<ToolResult> {
    const { Image } = args;
    if (!Image) return { content: [{ type: 'text', text: 'Image is required' }], isError: true };
    const query = args.name ? `?name=${encodeURIComponent(args.name as string)}` : '';
    const body: Record<string, unknown> = { Image };
    if (args.Cmd) body.Cmd = args.Cmd;
    if (args.Env) body.Env = args.Env;
    if (args.Memory) body.Memory = args.Memory;
    if (args.ExposedPorts) body.ExposedPorts = args.ExposedPorts;
    return this.apiPost(`/containers/create${query}`, body);
  }

  private async inspectContainer(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.name_or_id as string;
    if (!id) return { content: [{ type: 'text', text: 'name_or_id is required' }], isError: true };
    return this.apiGet(`/containers/${encodeURIComponent(id)}/json`);
  }

  private async getContainerStatus(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.id as string;
    if (!id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.apiGet(`/containers/${encodeURIComponent(id)}/status`);
  }

  private async deleteContainer(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.name_or_id as string;
    if (!id) return { content: [{ type: 'text', text: 'name_or_id is required' }], isError: true };
    return this.apiDelete(`/containers/${encodeURIComponent(id)}`);
  }

  private async startContainer(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.name_or_id as string;
    if (!id) return { content: [{ type: 'text', text: 'name_or_id is required' }], isError: true };
    return this.apiPost(`/containers/${encodeURIComponent(id)}/start`);
  }

  private async stopContainer(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.name_or_id as string;
    if (!id) return { content: [{ type: 'text', text: 'name_or_id is required' }], isError: true };
    const t = args.t ? `?t=${args.t}` : '';
    return this.apiPost(`/containers/${encodeURIComponent(id)}/stop${t}`);
  }

  private async restartContainer(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.name_or_id as string;
    if (!id) return { content: [{ type: 'text', text: 'name_or_id is required' }], isError: true };
    const t = args.t ? `?t=${args.t}` : '';
    return this.apiPost(`/containers/${encodeURIComponent(id)}/restart${t}`);
  }

  private async pauseContainer(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.name_or_id as string;
    if (!id) return { content: [{ type: 'text', text: 'name_or_id is required' }], isError: true };
    return this.apiPost(`/containers/${encodeURIComponent(id)}/pause`);
  }

  private async unpauseContainer(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.name_or_id as string;
    if (!id) return { content: [{ type: 'text', text: 'name_or_id is required' }], isError: true };
    return this.apiPost(`/containers/${encodeURIComponent(id)}/unpause`);
  }

  private async renameContainer(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.name_or_id as string;
    const name = args.name as string;
    if (!id) return { content: [{ type: 'text', text: 'name_or_id is required' }], isError: true };
    if (!name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    return this.apiPost(`/containers/${encodeURIComponent(id)}/rename?name=${encodeURIComponent(name)}`);
  }

  // --- Container Group methods ---

  private async listContainerGroups(): Promise<ToolResult> {
    return this.apiGet('/containers/groups');
  }

  private async createContainerGroup(args: Record<string, unknown>): Promise<ToolResult> {
    const { Name, Image } = args;
    if (!Name || !Image) return { content: [{ type: 'text', text: 'Name and Image are required' }], isError: true };
    const body: Record<string, unknown> = { Name, Image };
    if (args.NumberInstances) body.NumberInstances = args.NumberInstances;
    if (args.Memory) body.Memory = args.Memory;
    if (args.Env) body.Env = args.Env;
    if (args.Port) body.Port = args.Port;
    if (args.Route) body.Route = args.Route;
    return this.apiPost('/containers/groups', body);
  }

  private async inspectContainerGroup(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.name_or_id as string;
    if (!id) return { content: [{ type: 'text', text: 'name_or_id is required' }], isError: true };
    return this.apiGet(`/containers/groups/${encodeURIComponent(id)}`);
  }

  private async updateContainerGroup(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.name_or_id as string;
    if (!id) return { content: [{ type: 'text', text: 'name_or_id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.NumberInstances) body.NumberInstances = args.NumberInstances;
    return this.apiPatch(`/containers/groups/${encodeURIComponent(id)}`, body);
  }

  private async deleteContainerGroup(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.name_or_id as string;
    if (!id) return { content: [{ type: 'text', text: 'name_or_id is required' }], isError: true };
    return this.apiDelete(`/containers/groups/${encodeURIComponent(id)}`);
  }

  private async mapRouteToGroup(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.name_or_id as string;
    const domain = args.domain as string;
    const host = args.host as string;
    if (!id || !domain || !host) return { content: [{ type: 'text', text: 'name_or_id, domain, and host are required' }], isError: true };
    return this.apiPost(`/containers/groups/${encodeURIComponent(id)}/maproute`, { domain, host });
  }

  private async unmapRouteFromGroup(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.name_or_id as string;
    const domain = args.domain as string;
    const host = args.host as string;
    if (!id || !domain || !host) return { content: [{ type: 'text', text: 'name_or_id, domain, and host are required' }], isError: true };
    return this.apiPost(`/containers/groups/${encodeURIComponent(id)}/unmaproute`, { domain, host });
  }

  // --- Floating IP methods ---

  private async listFloatingIps(args: Record<string, unknown>): Promise<ToolResult> {
    const all = args.all ? '?all=1' : '';
    return this.apiGet(`/containers/floating-ips${all}`);
  }

  private async requestFloatingIp(): Promise<ToolResult> {
    return this.apiPost('/containers/floating-ips/request');
  }

  private async releaseFloatingIp(args: Record<string, unknown>): Promise<ToolResult> {
    const ip = args.ip as string;
    if (!ip) return { content: [{ type: 'text', text: 'ip is required' }], isError: true };
    return this.apiPost(`/containers/floating-ips/${encodeURIComponent(ip)}/release`);
  }

  private async bindFloatingIp(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.name_or_id as string;
    const ip = args.ip as string;
    if (!id || !ip) return { content: [{ type: 'text', text: 'name_or_id and ip are required' }], isError: true };
    return this.apiPost(`/containers/${encodeURIComponent(id)}/floating-ips/${encodeURIComponent(ip)}/bind`);
  }

  private async unbindFloatingIp(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.name_or_id as string;
    const ip = args.ip as string;
    if (!id || !ip) return { content: [{ type: 'text', text: 'name_or_id and ip are required' }], isError: true };
    return this.apiPost(`/containers/${encodeURIComponent(id)}/floating-ips/${encodeURIComponent(ip)}/unbind`);
  }

  // --- Image methods ---

  private async listImages(): Promise<ToolResult> {
    return this.apiGet('/images/json');
  }

  private async inspectImage(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.name_or_id as string;
    if (!id) return { content: [{ type: 'text', text: 'name_or_id is required' }], isError: true };
    return this.apiGet(`/images/${encodeURIComponent(id)}/json`);
  }

  private async deleteImage(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.id as string;
    if (!id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.apiDelete(`/images/${encodeURIComponent(id)}`);
  }

  // --- Registry methods ---

  private async getRegistryNamespace(): Promise<ToolResult> {
    return this.apiGet('/registry/namespaces');
  }

  private async checkNamespaceAvailability(args: Record<string, unknown>): Promise<ToolResult> {
    const ns = args.namespace as string;
    if (!ns) return { content: [{ type: 'text', text: 'namespace is required' }], isError: true };
    return this.apiGet(`/registry/namespaces/${encodeURIComponent(ns)}`);
  }

  private async setRegistryNamespace(args: Record<string, unknown>): Promise<ToolResult> {
    const ns = args.namespace as string;
    if (!ns) return { content: [{ type: 'text', text: 'namespace is required' }], isError: true };
    return this.apiPut(`/registry/namespaces/${encodeURIComponent(ns)}`);
  }

  // --- Volume methods ---

  private async listVolumes(): Promise<ToolResult> {
    return this.apiGet('/volumes/json');
  }

  private async inspectVolume(args: Record<string, unknown>): Promise<ToolResult> {
    const name = args.name as string;
    if (!name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    return this.apiGet(`/volumes/${encodeURIComponent(name)}/json`);
  }

  private async createVolume(args: Record<string, unknown>): Promise<ToolResult> {
    const name = args.name as string;
    if (!name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    const body: Record<string, unknown> = { name };
    if (args.fsName) body.fsName = args.fsName;
    return this.apiPost('/volumes/create', body);
  }

  private async deleteVolume(args: Record<string, unknown>): Promise<ToolResult> {
    const name = args.name as string;
    if (!name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    return this.apiDelete(`/volumes/${encodeURIComponent(name)}`);
  }

  private async shareVolume(args: Record<string, unknown>): Promise<ToolResult> {
    const name = args.name as string;
    if (!name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    return this.apiPost(`/volumes/${encodeURIComponent(name)}`);
  }

  // --- File Share methods ---

  private async listFileShares(): Promise<ToolResult> {
    return this.apiGet('/volumes/fs/json');
  }

  private async inspectFileShare(args: Record<string, unknown>): Promise<ToolResult> {
    const name = args.name as string;
    if (!name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    return this.apiGet(`/volumes/fs/${encodeURIComponent(name)}/json`);
  }

  private async createFileShare(args: Record<string, unknown>): Promise<ToolResult> {
    const fsName = args.fsName as string;
    const fsSize = args.fsSize as number;
    if (!fsName || fsSize === undefined) return { content: [{ type: 'text', text: 'fsName and fsSize are required' }], isError: true };
    return this.apiPost('/volumes/fs/create', { fsName, fsSize });
  }

  private async deleteFileShare(args: Record<string, unknown>): Promise<ToolResult> {
    const name = args.name as string;
    if (!name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    return this.apiDelete(`/volumes/fs/${encodeURIComponent(name)}`);
  }

  private async listFileShareSizes(): Promise<ToolResult> {
    return this.apiGet('/volumes/fs/flavors/json');
  }

  // --- Quota / Usage / Info methods ---

  private async getQuota(): Promise<ToolResult> {
    return this.apiGet('/containers/quota');
  }

  private async updateQuota(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {};
    if (args.floating_ips_max !== undefined) body.floating_ips_max = args.floating_ips_max;
    if (args.ram_max !== undefined) body.ram_max = args.ram_max;
    return this.apiPut('/containers/quota', body);
  }

  private async getUsage(): Promise<ToolResult> {
    return this.apiGet('/containers/usage');
  }

  private async getMessages(): Promise<ToolResult> {
    return this.apiGet('/containers/messages');
  }

  private async getApiVersion(): Promise<ToolResult> {
    return this.apiGet('/containers/version');
  }

  // --- TLS methods ---

  private async getTlsCertificate(): Promise<ToolResult> {
    return this.apiGet('/tlskey');
  }

  private async refreshTlsCertificate(): Promise<ToolResult> {
    return this.apiPut('/tlskey/refresh');
  }

  static catalog() {
    return {
      name: 'bluemix-containers',
      displayName: 'IBM Containers (Bluemix)',
      version: '1.0.0',
      category: 'cloud' as const,
      keywords: ['bluemix', 'ibm', 'containers', 'docker', 'cloud'],
      toolNames: [
        'list_containers', 'create_container', 'inspect_container', 'get_container_status',
        'delete_container', 'start_container', 'stop_container', 'restart_container',
        'pause_container', 'unpause_container', 'rename_container',
        'list_container_groups', 'create_container_group', 'inspect_container_group',
        'update_container_group', 'delete_container_group', 'map_route_to_group', 'unmap_route_from_group',
        'list_floating_ips', 'request_floating_ip', 'release_floating_ip', 'bind_floating_ip', 'unbind_floating_ip',
        'list_images', 'inspect_image', 'delete_image',
        'get_registry_namespace', 'check_namespace_availability', 'set_registry_namespace',
        'list_volumes', 'inspect_volume', 'create_volume', 'delete_volume', 'share_volume',
        'list_file_shares', 'inspect_file_share', 'create_file_share', 'delete_file_share', 'list_file_share_sizes',
        'get_quota', 'update_quota', 'get_usage', 'get_messages', 'get_api_version',
        'get_tls_certificate', 'refresh_tls_certificate',
      ],
      description: 'IBM Containers (Bluemix) adapter for the Epic AI Intelligence Platform',
      author: 'protectnil' as const,
    };
  }
}
