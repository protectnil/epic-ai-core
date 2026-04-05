/**
 * Hetzner Cloud MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official Hetzner Cloud MCP server was found on GitHub.
//
// Base URL: https://api.hetzner.cloud/v1
// Auth: Bearer token — Authorization: Bearer <API_TOKEN>
// Docs: https://docs.hetzner.cloud/
// Rate limits: 3600 requests/hour per API token. X-RateLimit-* headers returned on each response.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface HetznerCloudConfig {
  apiToken: string;
  /** Optional base URL override (default: https://api.hetzner.cloud/v1) */
  baseUrl?: string;
}

export class HetznerCloudMCPServer extends MCPAdapterBase {
  private readonly apiToken: string;
  private readonly baseUrl: string;

  constructor(config: HetznerCloudConfig) {
    super();
    this.apiToken = config.apiToken;
    this.baseUrl = config.baseUrl ?? 'https://api.hetzner.cloud/v1';
  }

  static catalog() {
    return {
      name: 'hetzner-cloud',
      displayName: 'Hetzner Cloud',
      version: '1.0.0',
      category: 'cloud',
      keywords: [
        'hetzner', 'cloud', 'server', 'vps', 'virtual-machine', 'vm', 'instance',
        'volume', 'block-storage', 'network', 'firewall', 'load-balancer',
        'floating-ip', 'ssh-key', 'image', 'snapshot', 'datacenter', 'location',
        'server-type', 'iso', 'placement-group', 'primary-ip', 'certificate',
        'reboot', 'poweroff', 'poweron', 'resize', 'rebuild', 'rescue',
      ],
      toolNames: [
        'list_servers', 'get_server', 'create_server', 'update_server', 'delete_server',
        'reboot_server', 'poweron_server', 'poweroff_server', 'shutdown_server', 'reset_server',
        'resize_server', 'rebuild_server', 'enable_rescue', 'disable_rescue',
        'enable_backup', 'disable_backup', 'create_server_image', 'reset_server_password',
        'list_volumes', 'get_volume', 'create_volume', 'update_volume', 'delete_volume',
        'attach_volume', 'detach_volume', 'resize_volume',
        'list_networks', 'get_network', 'create_network', 'update_network', 'delete_network',
        'list_firewalls', 'get_firewall', 'create_firewall', 'update_firewall', 'delete_firewall',
        'apply_firewall', 'remove_firewall', 'set_firewall_rules',
        'list_load_balancers', 'get_load_balancer', 'create_load_balancer', 'update_load_balancer', 'delete_load_balancer',
        'list_floating_ips', 'get_floating_ip', 'create_floating_ip', 'update_floating_ip', 'delete_floating_ip',
        'assign_floating_ip', 'unassign_floating_ip',
        'list_ssh_keys', 'get_ssh_key', 'create_ssh_key', 'update_ssh_key', 'delete_ssh_key',
        'list_images', 'get_image', 'update_image', 'delete_image',
        'list_datacenters', 'get_datacenter',
        'list_locations', 'get_location',
        'list_server_types', 'get_server_type',
        'list_placement_groups', 'get_placement_group', 'create_placement_group', 'update_placement_group', 'delete_placement_group',
        'list_primary_ips', 'get_primary_ip', 'create_primary_ip', 'update_primary_ip', 'delete_primary_ip',
        'list_actions', 'get_action',
        'get_pricing',
      ],
      description: 'Hetzner Cloud infrastructure management: servers, volumes, networks, firewalls, load balancers, floating IPs, SSH keys, images, and datacenters.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // Servers
      {
        name: 'list_servers',
        description: 'List all servers in the Hetzner Cloud project with optional name, label, and status filters',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Filter by server name (exact match)' },
            label_selector: { type: 'string', description: 'Filter by label selector (e.g. env=prod)' },
            status: { type: 'string', description: 'Filter by status: initializing, starting, running, stopping, off, deleting, migrating, rebuilding, unknown' },
            sort: { type: 'string', description: 'Sort by: id, id:asc, id:desc, name, name:asc, name:desc, created, created:asc, created:desc' },
            page: { type: 'number', description: 'Page number (default: 1)' },
            per_page: { type: 'number', description: 'Results per page (default: 25, max: 50)' },
          },
        },
      },
      {
        name: 'get_server',
        description: 'Get full details of a specific server by ID including status, IP addresses, server type, and datacenter',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'Server ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_server',
        description: 'Create a new server in Hetzner Cloud — specify name, server type, image, location, and optional SSH keys, networks, and firewalls',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Unique name for the server (a-z, 0-9, hyphens)' },
            server_type: { type: 'string', description: 'Server type name or ID (e.g. cx22, cx32, cpx11)' },
            image: { type: 'string', description: 'Image name, ID, or type to use (e.g. ubuntu-22.04, debian-11)' },
            location: { type: 'string', description: 'Location name or ID (e.g. nbg1, fsn1, hel1, ash, hil)' },
            datacenter: { type: 'string', description: 'Datacenter name or ID — alternative to location' },
            ssh_keys: { type: 'array', description: 'Array of SSH key names or IDs to install', items: { type: 'string' } },
            networks: { type: 'array', description: 'Array of private network IDs to attach', items: { type: 'number' } },
            firewalls: { type: 'array', description: 'Array of firewall IDs to apply', items: { type: 'object' } },
            user_data: { type: 'string', description: 'Cloud-init user data script (cloud-config format)' },
            labels: { type: 'object', description: 'Key-value labels to assign to the server' },
            start_after_create: { type: 'boolean', description: 'Start server immediately after creation (default: true)' },
          },
          required: ['name', 'server_type', 'image'],
        },
      },
      {
        name: 'update_server',
        description: 'Update a server name or labels by server ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'Server ID' },
            name: { type: 'string', description: 'New server name' },
            labels: { type: 'object', description: 'Updated key-value labels' },
          },
          required: ['id'],
        },
      },
      {
        name: 'delete_server',
        description: 'Delete a server permanently — this is irreversible; all data on the server will be lost',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'Server ID to delete' },
          },
          required: ['id'],
        },
      },
      {
        name: 'reboot_server',
        description: 'Gracefully reboot a running server (sends ACPI shutdown signal then restarts)',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'Server ID to reboot' },
          },
          required: ['id'],
        },
      },
      {
        name: 'poweron_server',
        description: 'Power on a server that is currently off',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'Server ID to power on' },
          },
          required: ['id'],
        },
      },
      {
        name: 'poweroff_server',
        description: 'Hard power off a server immediately without graceful shutdown — may cause data loss',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'Server ID to power off' },
          },
          required: ['id'],
        },
      },
      {
        name: 'shutdown_server',
        description: 'Gracefully shut down a server by sending an ACPI shutdown signal — waits for OS to shutdown cleanly',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'Server ID to shut down' },
          },
          required: ['id'],
        },
      },
      {
        name: 'reset_server',
        description: 'Hard reset a server (equivalent to pulling the power and restarting) — may cause data loss',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'Server ID to reset' },
          },
          required: ['id'],
        },
      },
      {
        name: 'resize_server',
        description: 'Resize a server to a different server type — server must be off; upgrade_disk controls whether the disk is enlarged',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'Server ID to resize' },
            server_type: { type: 'string', description: 'Target server type name or ID (e.g. cx32, cpx21)' },
            upgrade_disk: { type: 'boolean', description: 'Enlarge disk when upgrading (default: true); set false to allow downgrade later' },
          },
          required: ['id', 'server_type'],
        },
      },
      {
        name: 'rebuild_server',
        description: 'Rebuild a server from a new image — all data on the server will be lost; server must be off',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'Server ID to rebuild' },
            image: { type: 'string', description: 'Image name or ID to rebuild from (e.g. ubuntu-22.04)' },
          },
          required: ['id', 'image'],
        },
      },
      {
        name: 'enable_rescue',
        description: 'Enable rescue mode for a server — sets a temporary root password and boots into a rescue system on next reboot',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'Server ID' },
            type: { type: 'string', description: 'Rescue type: linux64 (default), linux32, freebsd64' },
            ssh_keys: { type: 'array', description: 'SSH key IDs to allow access in rescue mode', items: { type: 'number' } },
          },
          required: ['id'],
        },
      },
      {
        name: 'disable_rescue',
        description: 'Disable rescue mode for a server that has rescue mode enabled',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'Server ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'enable_backup',
        description: 'Enable automatic daily backups for a server (adds ~20% to the server cost)',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'Server ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'disable_backup',
        description: 'Disable automatic backups for a server — existing backups are not deleted immediately',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'Server ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_server_image',
        description: 'Create a snapshot image of a server at its current state — server should be off for a consistent snapshot',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'Server ID to snapshot' },
            description: { type: 'string', description: 'Description for the snapshot image' },
            labels: { type: 'object', description: 'Key-value labels for the image' },
          },
          required: ['id'],
        },
      },
      {
        name: 'reset_server_password',
        description: 'Reset the root password of a server — server must be running; new password returned in the action result',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'Server ID' },
          },
          required: ['id'],
        },
      },
      // Volumes
      {
        name: 'list_volumes',
        description: 'List all block storage volumes with optional name, label, and status filters',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Filter by volume name (exact match)' },
            label_selector: { type: 'string', description: 'Filter by label selector' },
            status: { type: 'string', description: 'Filter by status: creating, available' },
            sort: { type: 'string', description: 'Sort by: id, name, created (append :asc or :desc)' },
            page: { type: 'number', description: 'Page number (default: 1)' },
            per_page: { type: 'number', description: 'Results per page (default: 25, max: 50)' },
          },
        },
      },
      {
        name: 'get_volume',
        description: 'Get full details of a specific volume by ID including size, location, and attached server',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'Volume ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_volume',
        description: 'Create a new block storage volume — specify size in GB, location, and optional server to attach to',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Unique volume name' },
            size: { type: 'number', description: 'Volume size in GB (min: 10, max: 10240)' },
            location: { type: 'string', description: 'Location name or ID (e.g. nbg1, fsn1)' },
            server: { type: 'number', description: 'Server ID to attach the volume to immediately' },
            format: { type: 'string', description: 'Filesystem to format: xfs, ext4 (default: xfs)' },
            labels: { type: 'object', description: 'Key-value labels' },
          },
          required: ['name', 'size'],
        },
      },
      {
        name: 'update_volume',
        description: 'Update volume name or labels by volume ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'Volume ID' },
            name: { type: 'string', description: 'New volume name' },
            labels: { type: 'object', description: 'Updated key-value labels' },
          },
          required: ['id'],
        },
      },
      {
        name: 'delete_volume',
        description: 'Delete a volume permanently — volume must be detached from all servers first',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'Volume ID to delete' },
          },
          required: ['id'],
        },
      },
      {
        name: 'attach_volume',
        description: 'Attach a volume to a server — volume and server must be in the same location',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'Volume ID' },
            server: { type: 'number', description: 'Server ID to attach to' },
            automount: { type: 'boolean', description: 'Auto-mount the volume after attach (default: false)' },
          },
          required: ['id', 'server'],
        },
      },
      {
        name: 'detach_volume',
        description: 'Detach a volume from its currently attached server',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'Volume ID to detach' },
          },
          required: ['id'],
        },
      },
      {
        name: 'resize_volume',
        description: 'Increase the size of a volume — volume size can only be increased, never decreased',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'Volume ID' },
            size: { type: 'number', description: 'New size in GB (must be larger than current size)' },
          },
          required: ['id', 'size'],
        },
      },
      // Networks
      {
        name: 'list_networks',
        description: 'List all private networks with optional name and label filters',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Filter by network name' },
            label_selector: { type: 'string', description: 'Filter by label selector' },
            page: { type: 'number', description: 'Page number (default: 1)' },
            per_page: { type: 'number', description: 'Results per page (default: 25, max: 50)' },
          },
        },
      },
      {
        name: 'get_network',
        description: 'Get full details of a specific private network by ID including subnets, routes, and attached servers',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'Network ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_network',
        description: 'Create a private network with a specified IP range and optional subnets',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Network name' },
            ip_range: { type: 'string', description: 'IP range in CIDR notation (e.g. 10.0.0.0/8)' },
            subnets: { type: 'array', description: 'Array of subnet objects with type, ip_range, network_zone', items: { type: 'object' } },
            routes: { type: 'array', description: 'Array of static route objects with destination and gateway', items: { type: 'object' } },
            labels: { type: 'object', description: 'Key-value labels' },
          },
          required: ['name', 'ip_range'],
        },
      },
      {
        name: 'update_network',
        description: 'Update a private network name, labels, or expose routes to vSwitch',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'Network ID' },
            name: { type: 'string', description: 'New network name' },
            labels: { type: 'object', description: 'Updated key-value labels' },
            expose_routes_to_vswitch: { type: 'boolean', description: 'Expose routes to Hetzner vSwitch' },
          },
          required: ['id'],
        },
      },
      {
        name: 'delete_network',
        description: 'Delete a private network — all servers must be detached from it first',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'Network ID to delete' },
          },
          required: ['id'],
        },
      },
      // Firewalls
      {
        name: 'list_firewalls',
        description: 'List all firewalls with optional name and label filters',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Filter by firewall name' },
            label_selector: { type: 'string', description: 'Filter by label selector' },
            sort: { type: 'string', description: 'Sort by: id, name, created (append :asc or :desc)' },
            page: { type: 'number', description: 'Page number (default: 1)' },
            per_page: { type: 'number', description: 'Results per page (default: 25, max: 50)' },
          },
        },
      },
      {
        name: 'get_firewall',
        description: 'Get full details of a specific firewall by ID including all rules and applied resources',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'Firewall ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_firewall',
        description: 'Create a firewall with inbound and outbound rules; optionally apply it to servers or label selectors immediately',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Firewall name' },
            rules: { type: 'array', description: 'Array of firewall rule objects with direction, protocol, port, source_ips, destination_ips', items: { type: 'object' } },
            apply_to: { type: 'array', description: 'Array of resources to apply firewall to (type: server or label_selector)', items: { type: 'object' } },
            labels: { type: 'object', description: 'Key-value labels' },
          },
          required: ['name'],
        },
      },
      {
        name: 'update_firewall',
        description: 'Update firewall name or labels by firewall ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'Firewall ID' },
            name: { type: 'string', description: 'New firewall name' },
            labels: { type: 'object', description: 'Updated key-value labels' },
          },
          required: ['id'],
        },
      },
      {
        name: 'delete_firewall',
        description: 'Delete a firewall — it must not be applied to any resources',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'Firewall ID to delete' },
          },
          required: ['id'],
        },
      },
      {
        name: 'apply_firewall',
        description: 'Apply a firewall to one or more servers or label-selected server groups',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'Firewall ID' },
            apply_to: { type: 'array', description: 'Array of resource objects (type: server or label_selector) to apply firewall to', items: { type: 'object' } },
          },
          required: ['id', 'apply_to'],
        },
      },
      {
        name: 'remove_firewall',
        description: 'Remove a firewall from one or more servers or label-selected server groups',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'Firewall ID' },
            remove_from: { type: 'array', description: 'Array of resource objects (type: server or label_selector) to remove firewall from', items: { type: 'object' } },
          },
          required: ['id', 'remove_from'],
        },
      },
      {
        name: 'set_firewall_rules',
        description: 'Replace all rules of a firewall with a new set of rules — this is a full replacement, not an incremental update',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'Firewall ID' },
            rules: { type: 'array', description: 'Complete new set of firewall rules (direction, protocol, port, source_ips, destination_ips)', items: { type: 'object' } },
          },
          required: ['id', 'rules'],
        },
      },
      // Load Balancers
      {
        name: 'list_load_balancers',
        description: 'List all load balancers with optional name, label, and sort filters',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Filter by load balancer name' },
            label_selector: { type: 'string', description: 'Filter by label selector' },
            sort: { type: 'string', description: 'Sort by: id, name, created (append :asc or :desc)' },
            page: { type: 'number', description: 'Page number (default: 1)' },
            per_page: { type: 'number', description: 'Results per page (default: 25, max: 50)' },
          },
        },
      },
      {
        name: 'get_load_balancer',
        description: 'Get full details of a specific load balancer by ID including services, targets, and health check status',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'Load balancer ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_load_balancer',
        description: 'Create a load balancer with a specified type, location, algorithm, and optional services and targets',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Load balancer name' },
            load_balancer_type: { type: 'string', description: 'Load balancer type name or ID (e.g. lb11, lb21, lb31)' },
            location: { type: 'string', description: 'Location name or ID (e.g. nbg1, fsn1, hel1)' },
            algorithm: { type: 'object', description: 'Algorithm object with type: round_robin or least_connections' },
            services: { type: 'array', description: 'Array of service configuration objects', items: { type: 'object' } },
            targets: { type: 'array', description: 'Array of target objects (type: server, label_selector, ip)', items: { type: 'object' } },
            network: { type: 'number', description: 'Private network ID to attach load balancer to' },
            labels: { type: 'object', description: 'Key-value labels' },
          },
          required: ['name', 'load_balancer_type'],
        },
      },
      {
        name: 'update_load_balancer',
        description: 'Update load balancer name or labels by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'Load balancer ID' },
            name: { type: 'string', description: 'New load balancer name' },
            labels: { type: 'object', description: 'Updated key-value labels' },
          },
          required: ['id'],
        },
      },
      {
        name: 'delete_load_balancer',
        description: 'Delete a load balancer permanently',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'Load balancer ID to delete' },
          },
          required: ['id'],
        },
      },
      // Floating IPs
      {
        name: 'list_floating_ips',
        description: 'List all floating IPs with optional name, label, and IP version filters',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Filter by floating IP name' },
            label_selector: { type: 'string', description: 'Filter by label selector' },
            sort: { type: 'string', description: 'Sort by: id, created (append :asc or :desc)' },
            page: { type: 'number', description: 'Page number (default: 1)' },
            per_page: { type: 'number', description: 'Results per page (default: 25, max: 50)' },
          },
        },
      },
      {
        name: 'get_floating_ip',
        description: 'Get full details of a specific floating IP by ID including assigned server and location',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'Floating IP ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_floating_ip',
        description: 'Create a new floating IP in a specified location or attached to a home location of a server',
        inputSchema: {
          type: 'object',
          properties: {
            type: { type: 'string', description: 'IP version: ipv4 or ipv6' },
            home_location: { type: 'string', description: 'Location name or ID for the floating IP (e.g. nbg1, fsn1)' },
            server: { type: 'number', description: 'Server ID to assign the floating IP to immediately' },
            name: { type: 'string', description: 'Name for the floating IP' },
            description: { type: 'string', description: 'Description of the floating IP' },
            labels: { type: 'object', description: 'Key-value labels' },
          },
          required: ['type'],
        },
      },
      {
        name: 'update_floating_ip',
        description: 'Update floating IP name, description, or labels by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'Floating IP ID' },
            name: { type: 'string', description: 'New name' },
            description: { type: 'string', description: 'New description' },
            labels: { type: 'object', description: 'Updated key-value labels' },
          },
          required: ['id'],
        },
      },
      {
        name: 'delete_floating_ip',
        description: 'Delete a floating IP — it will be unassigned from any server first',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'Floating IP ID to delete' },
          },
          required: ['id'],
        },
      },
      {
        name: 'assign_floating_ip',
        description: 'Assign a floating IP to a server — the server and floating IP must be in the same location',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'Floating IP ID' },
            server: { type: 'number', description: 'Server ID to assign the floating IP to' },
          },
          required: ['id', 'server'],
        },
      },
      {
        name: 'unassign_floating_ip',
        description: 'Unassign a floating IP from its currently assigned server',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'Floating IP ID to unassign' },
          },
          required: ['id'],
        },
      },
      // SSH Keys
      {
        name: 'list_ssh_keys',
        description: 'List all SSH public keys in the project with optional name and label filters',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Filter by SSH key name' },
            label_selector: { type: 'string', description: 'Filter by label selector' },
            fingerprint: { type: 'string', description: 'Filter by SSH key fingerprint' },
            sort: { type: 'string', description: 'Sort by: id, name, created (append :asc or :desc)' },
            page: { type: 'number', description: 'Page number (default: 1)' },
            per_page: { type: 'number', description: 'Results per page (default: 25, max: 50)' },
          },
        },
      },
      {
        name: 'get_ssh_key',
        description: 'Get details of a specific SSH key by ID including fingerprint and public key',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'SSH key ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_ssh_key',
        description: 'Add an SSH public key to the project for use when creating servers',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Name for the SSH key' },
            public_key: { type: 'string', description: 'OpenSSH-formatted public key string' },
            labels: { type: 'object', description: 'Key-value labels' },
          },
          required: ['name', 'public_key'],
        },
      },
      {
        name: 'update_ssh_key',
        description: 'Update SSH key name or labels by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'SSH key ID' },
            name: { type: 'string', description: 'New SSH key name' },
            labels: { type: 'object', description: 'Updated key-value labels' },
          },
          required: ['id'],
        },
      },
      {
        name: 'delete_ssh_key',
        description: 'Delete an SSH key from the project — does not affect running servers that have already been provisioned with this key',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'SSH key ID to delete' },
          },
          required: ['id'],
        },
      },
      // Images
      {
        name: 'list_images',
        description: 'List available images (system images, snapshots, backups) with optional type, OS, name, and label filters',
        inputSchema: {
          type: 'object',
          properties: {
            type: { type: 'string', description: 'Filter by type: system, snapshot, backup, app' },
            status: { type: 'string', description: 'Filter by status: creating, available' },
            os_flavor: { type: 'string', description: 'Filter by OS: ubuntu, debian, centos, rocky, fedora' },
            name: { type: 'string', description: 'Filter by image name (e.g. ubuntu-22.04)' },
            label_selector: { type: 'string', description: 'Filter by label selector' },
            architecture: { type: 'string', description: 'Filter by CPU architecture: x86, arm' },
            sort: { type: 'string', description: 'Sort by: id, name, created (append :asc or :desc)' },
            page: { type: 'number', description: 'Page number (default: 1)' },
            per_page: { type: 'number', description: 'Results per page (default: 25, max: 50)' },
          },
        },
      },
      {
        name: 'get_image',
        description: 'Get full details of a specific image by ID including OS, size, created from server, and protection status',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'Image ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'update_image',
        description: 'Update image description or labels by ID — only applicable to snapshots and backups, not system images',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'Image ID' },
            description: { type: 'string', description: 'New image description' },
            type: { type: 'string', description: 'Convert backup to snapshot: snapshot' },
            labels: { type: 'object', description: 'Updated key-value labels' },
          },
          required: ['id'],
        },
      },
      {
        name: 'delete_image',
        description: 'Delete a snapshot or backup image — system images cannot be deleted',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'Image ID to delete' },
          },
          required: ['id'],
        },
      },
      // Datacenters
      {
        name: 'list_datacenters',
        description: 'List all available Hetzner Cloud datacenters with location and available server types',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Filter by datacenter name (e.g. nbg1-dc3, fsn1-dc14)' },
            sort: { type: 'string', description: 'Sort by: id, name (append :asc or :desc)' },
            page: { type: 'number', description: 'Page number (default: 1)' },
            per_page: { type: 'number', description: 'Results per page (default: 25, max: 50)' },
          },
        },
      },
      {
        name: 'get_datacenter',
        description: 'Get details of a specific datacenter by ID including location and available server types',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'Datacenter ID' },
          },
          required: ['id'],
        },
      },
      // Locations
      {
        name: 'list_locations',
        description: 'List all Hetzner Cloud locations (cities/regions) with network zones and available features',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Filter by location name (e.g. nbg1, fsn1, hel1, ash, hil)' },
            sort: { type: 'string', description: 'Sort by: id, name (append :asc or :desc)' },
            page: { type: 'number', description: 'Page number (default: 1)' },
            per_page: { type: 'number', description: 'Results per page (default: 25, max: 50)' },
          },
        },
      },
      {
        name: 'get_location',
        description: 'Get details of a specific location by ID including country, city, and network zone',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'Location ID' },
          },
          required: ['id'],
        },
      },
      // Server Types
      {
        name: 'list_server_types',
        description: 'List all available server types with CPU, memory, storage, and pricing information',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Filter by server type name (e.g. cx22, cpx11)' },
            sort: { type: 'string', description: 'Sort by: id, name (append :asc or :desc)' },
            page: { type: 'number', description: 'Page number (default: 1)' },
            per_page: { type: 'number', description: 'Results per page (default: 25, max: 50)' },
          },
        },
      },
      {
        name: 'get_server_type',
        description: 'Get detailed specs of a specific server type by ID including CPU count, RAM, disk size, and price per hour',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'Server type ID' },
          },
          required: ['id'],
        },
      },
      // Placement Groups
      {
        name: 'list_placement_groups',
        description: 'List all placement groups used to distribute servers across physical hosts',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Filter by placement group name' },
            label_selector: { type: 'string', description: 'Filter by label selector' },
            type: { type: 'string', description: 'Filter by type: spread' },
            sort: { type: 'string', description: 'Sort by: id, name, created (append :asc or :desc)' },
            page: { type: 'number', description: 'Page number (default: 1)' },
            per_page: { type: 'number', description: 'Results per page (default: 25, max: 50)' },
          },
        },
      },
      {
        name: 'get_placement_group',
        description: 'Get details of a specific placement group by ID including member servers',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'Placement group ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_placement_group',
        description: 'Create a placement group to ensure servers are spread across different physical hosts for high availability',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Placement group name' },
            type: { type: 'string', description: 'Placement type: spread (only supported value)' },
            labels: { type: 'object', description: 'Key-value labels' },
          },
          required: ['name', 'type'],
        },
      },
      {
        name: 'update_placement_group',
        description: 'Update placement group name or labels by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'Placement group ID' },
            name: { type: 'string', description: 'New name' },
            labels: { type: 'object', description: 'Updated key-value labels' },
          },
          required: ['id'],
        },
      },
      {
        name: 'delete_placement_group',
        description: 'Delete a placement group — all servers must be removed from it first',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'Placement group ID to delete' },
          },
          required: ['id'],
        },
      },
      // Primary IPs
      {
        name: 'list_primary_ips',
        description: 'List all primary IPs (persistent IPs attached to servers) with optional name and label filters',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Filter by primary IP name' },
            label_selector: { type: 'string', description: 'Filter by label selector' },
            ip: { type: 'string', description: 'Filter by IP address' },
            sort: { type: 'string', description: 'Sort by: id, created (append :asc or :desc)' },
            page: { type: 'number', description: 'Page number (default: 1)' },
            per_page: { type: 'number', description: 'Results per page (default: 25, max: 50)' },
          },
        },
      },
      {
        name: 'get_primary_ip',
        description: 'Get details of a specific primary IP by ID including assignee and auto-delete setting',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'Primary IP ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_primary_ip',
        description: 'Create a primary IP that persists independently of servers for use with server rebuilds or migrations',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Name for the primary IP' },
            type: { type: 'string', description: 'IP version: ipv4 or ipv6' },
            datacenter: { type: 'string', description: 'Datacenter name or ID where the primary IP will be created' },
            assignee_type: { type: 'string', description: 'Type of resource to assign to: server' },
            assignee_id: { type: 'number', description: 'ID of the server to assign to' },
            auto_delete: { type: 'boolean', description: 'Delete the primary IP when the assigned server is deleted (default: false)' },
            labels: { type: 'object', description: 'Key-value labels' },
          },
          required: ['name', 'type', 'assignee_type'],
        },
      },
      {
        name: 'update_primary_ip',
        description: 'Update primary IP name, auto-delete setting, or labels by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'Primary IP ID' },
            name: { type: 'string', description: 'New name' },
            auto_delete: { type: 'boolean', description: 'New auto-delete setting' },
            labels: { type: 'object', description: 'Updated key-value labels' },
          },
          required: ['id'],
        },
      },
      {
        name: 'delete_primary_ip',
        description: 'Delete a primary IP — it must be unassigned from any server first',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'Primary IP ID to delete' },
          },
          required: ['id'],
        },
      },
      // Actions
      {
        name: 'list_actions',
        description: 'List all recent asynchronous actions (server create, reboot, resize, etc.) with optional status and sort filters',
        inputSchema: {
          type: 'object',
          properties: {
            status: { type: 'string', description: 'Filter by status: running, success, error' },
            sort: { type: 'string', description: 'Sort by: id, command, status, started, finished (append :asc or :desc)' },
            page: { type: 'number', description: 'Page number (default: 1)' },
            per_page: { type: 'number', description: 'Results per page (default: 25, max: 50)' },
          },
        },
      },
      {
        name: 'get_action',
        description: 'Get the status and result of a specific asynchronous action by ID — use to poll long-running operations',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'Action ID' },
          },
          required: ['id'],
        },
      },
      // Pricing
      {
        name: 'get_pricing',
        description: 'Get current pricing information for all Hetzner Cloud resources including servers, volumes, floating IPs, and load balancers',
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
        case 'list_servers':            return this.listResource('/servers', args);
        case 'get_server':              return this.getResource('/servers', args);
        case 'create_server':           return this.createResource('/servers', args);
        case 'update_server':           return this.updateResource('/servers', args);
        case 'delete_server':           return this.deleteResource('/servers', args);
        case 'reboot_server':           return this.serverAction(args, 'reboot');
        case 'poweron_server':          return this.serverAction(args, 'poweron');
        case 'poweroff_server':         return this.serverAction(args, 'poweroff');
        case 'shutdown_server':         return this.serverAction(args, 'shutdown');
        case 'reset_server':            return this.serverAction(args, 'reset');
        case 'resize_server':           return this.serverActionWithBody(args, 'change_type', { server_type: args.server_type, upgrade_disk: args.upgrade_disk ?? true });
        case 'rebuild_server':          return this.serverActionWithBody(args, 'rebuild', { image: args.image });
        case 'enable_rescue':           return this.serverActionWithBody(args, 'enable_rescue', { type: args.type ?? 'linux64', ssh_keys: args.ssh_keys });
        case 'disable_rescue':          return this.serverAction(args, 'disable_rescue');
        case 'enable_backup':           return this.serverAction(args, 'enable_backup');
        case 'disable_backup':          return this.serverAction(args, 'disable_backup');
        case 'create_server_image':     return this.serverActionWithBody(args, 'create_image', { description: args.description, labels: args.labels });
        case 'reset_server_password':   return this.serverAction(args, 'reset_password');
        case 'list_volumes':            return this.listResource('/volumes', args);
        case 'get_volume':              return this.getResource('/volumes', args);
        case 'create_volume':           return this.createResource('/volumes', args);
        case 'update_volume':           return this.updateResource('/volumes', args);
        case 'delete_volume':           return this.deleteResource('/volumes', args);
        case 'attach_volume':           return this.volumeActionWithBody(args, 'attach', { server: args.server, automount: args.automount });
        case 'detach_volume':           return this.resourceAction('/volumes', args, 'detach');
        case 'resize_volume':           return this.volumeActionWithBody(args, 'resize', { size: args.size });
        case 'list_networks':           return this.listResource('/networks', args);
        case 'get_network':             return this.getResource('/networks', args);
        case 'create_network':          return this.createResource('/networks', args);
        case 'update_network':          return this.updateResource('/networks', args);
        case 'delete_network':          return this.deleteResource('/networks', args);
        case 'list_firewalls':          return this.listResource('/firewalls', args);
        case 'get_firewall':            return this.getResource('/firewalls', args);
        case 'create_firewall':         return this.createResource('/firewalls', args);
        case 'update_firewall':         return this.updateResource('/firewalls', args);
        case 'delete_firewall':         return this.deleteResource('/firewalls', args);
        case 'apply_firewall':          return this.resourceAction('/firewalls', args, 'apply_to_resources', { apply_to: args.apply_to });
        case 'remove_firewall':         return this.resourceAction('/firewalls', args, 'remove_from_resources', { remove_from: args.remove_from });
        case 'set_firewall_rules':      return this.resourceAction('/firewalls', args, 'set_rules', { rules: args.rules });
        case 'list_load_balancers':     return this.listResource('/load_balancers', args);
        case 'get_load_balancer':       return this.getResource('/load_balancers', args);
        case 'create_load_balancer':    return this.createResource('/load_balancers', args);
        case 'update_load_balancer':    return this.updateResource('/load_balancers', args);
        case 'delete_load_balancer':    return this.deleteResource('/load_balancers', args);
        case 'list_floating_ips':       return this.listResource('/floating_ips', args);
        case 'get_floating_ip':         return this.getResource('/floating_ips', args);
        case 'create_floating_ip':      return this.createResource('/floating_ips', args);
        case 'update_floating_ip':      return this.updateResource('/floating_ips', args);
        case 'delete_floating_ip':      return this.deleteResource('/floating_ips', args);
        case 'assign_floating_ip':      return this.resourceAction('/floating_ips', args, 'assign', { server: args.server });
        case 'unassign_floating_ip':    return this.resourceAction('/floating_ips', args, 'unassign');
        case 'list_ssh_keys':           return this.listResource('/ssh_keys', args);
        case 'get_ssh_key':             return this.getResource('/ssh_keys', args);
        case 'create_ssh_key':          return this.createResource('/ssh_keys', args);
        case 'update_ssh_key':          return this.updateResource('/ssh_keys', args);
        case 'delete_ssh_key':          return this.deleteResource('/ssh_keys', args);
        case 'list_images':             return this.listResource('/images', args);
        case 'get_image':               return this.getResource('/images', args);
        case 'update_image':            return this.updateResource('/images', args);
        case 'delete_image':            return this.deleteResource('/images', args);
        case 'list_datacenters':        return this.listResource('/datacenters', args);
        case 'get_datacenter':          return this.getResource('/datacenters', args);
        case 'list_locations':          return this.listResource('/locations', args);
        case 'get_location':            return this.getResource('/locations', args);
        case 'list_server_types':       return this.listResource('/server_types', args);
        case 'get_server_type':         return this.getResource('/server_types', args);
        case 'list_placement_groups':   return this.listResource('/placement_groups', args);
        case 'get_placement_group':     return this.getResource('/placement_groups', args);
        case 'create_placement_group':  return this.createResource('/placement_groups', args);
        case 'update_placement_group':  return this.updateResource('/placement_groups', args);
        case 'delete_placement_group':  return this.deleteResource('/placement_groups', args);
        case 'list_primary_ips':        return this.listResource('/primary_ips', args);
        case 'get_primary_ip':          return this.getResource('/primary_ips', args);
        case 'create_primary_ip':       return this.createResource('/primary_ips', args);
        case 'update_primary_ip':       return this.updateResource('/primary_ips', args);
        case 'delete_primary_ip':       return this.deleteResource('/primary_ips', args);
        case 'list_actions':            return this.listResource('/actions', args);
        case 'get_action':              return this.getResource('/actions', args);
        case 'get_pricing':             return this.fetch('/pricing', 'GET');
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

  private headers(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.apiToken}`,
      'Content-Type': 'application/json',
    };
  }

  private async fetch(path: string, method: string, body?: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method,
      headers: this.headers(),
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (response.status === 204) {
      return { content: [{ type: 'text', text: '{"success":true}' }], isError: false };
    }
    if (!response.ok) {
      let errText = `API error: ${response.status} ${response.statusText}`;
      try {
        const errData = await response.json() as { error?: { message?: string } };
        if (errData?.error?.message) errText += ` — ${errData.error.message}`;
      } catch { /* ignore */ }
      return { content: [{ type: 'text', text: errText }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Hetzner Cloud returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private buildListQuery(args: Record<string, unknown>): string {
    const params = new URLSearchParams();
    const listFields = ['name', 'label_selector', 'status', 'sort', 'type', 'os_flavor',
      'architecture', 'ip', 'fingerprint', 'include_deprecated'] as const;
    for (const field of listFields) {
      if (args[field] !== undefined) params.set(field, String(args[field]));
    }
    if (args.page !== undefined) params.set('page', String(args.page));
    if (args.per_page !== undefined) params.set('per_page', String(args.per_page));
    const qs = params.toString();
    return qs ? `?${qs}` : '';
  }

  private async listResource(basePath: string, args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetch(`${basePath}${this.buildListQuery(args)}`, 'GET');
  }

  private async getResource(basePath: string, args: Record<string, unknown>): Promise<ToolResult> {
    if (args.id === undefined) {
      return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    }
    return this.fetch(`${basePath}/${encodeURIComponent(String(args.id))}`, 'GET');
  }

  private async createResource(basePath: string, args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetch(basePath, 'POST', args);
  }

  private async updateResource(basePath: string, args: Record<string, unknown>): Promise<ToolResult> {
    if (args.id === undefined) {
      return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    }
    const { id, ...body } = args;
    return this.fetch(`${basePath}/${encodeURIComponent(String(id))}`, 'PUT', body);
  }

  private async deleteResource(basePath: string, args: Record<string, unknown>): Promise<ToolResult> {
    if (args.id === undefined) {
      return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    }
    return this.fetch(`${basePath}/${encodeURIComponent(String(args.id))}`, 'DELETE');
  }

  private async serverAction(args: Record<string, unknown>, action: string): Promise<ToolResult> {
    if (args.id === undefined) {
      return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    }
    return this.fetch(`/servers/${encodeURIComponent(String(args.id))}/actions/${action}`, 'POST', {});
  }

  private async serverActionWithBody(args: Record<string, unknown>, action: string, body: Record<string, unknown>): Promise<ToolResult> {
    if (args.id === undefined) {
      return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    }
    // Remove undefined values from body
    const cleanBody = Object.fromEntries(Object.entries(body).filter(([, v]) => v !== undefined));
    return this.fetch(`/servers/${encodeURIComponent(String(args.id))}/actions/${action}`, 'POST', cleanBody);
  }

  private async volumeActionWithBody(args: Record<string, unknown>, action: string, body: Record<string, unknown>): Promise<ToolResult> {
    if (args.id === undefined) {
      return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    }
    const cleanBody = Object.fromEntries(Object.entries(body).filter(([, v]) => v !== undefined));
    return this.fetch(`/volumes/${encodeURIComponent(String(args.id))}/actions/${action}`, 'POST', cleanBody);
  }

  private async resourceAction(basePath: string, args: Record<string, unknown>, action: string, body: Record<string, unknown> = {}): Promise<ToolResult> {
    if (args.id === undefined) {
      return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    }
    const cleanBody = Object.fromEntries(Object.entries(body).filter(([, v]) => v !== undefined));
    return this.fetch(`${basePath}/${encodeURIComponent(String(args.id))}/actions/${action}`, 'POST', cleanBody);
  }
}
