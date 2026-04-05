/**
 * NetBox MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03. No official NetBox MCP server was found on GitHub.
// Several community wrappers exist but none is an official DigitalOcean/NetBox product.
//
// Base URL: https://<your-netbox-host>/api  (configurable; defaults to https://netboxdemo.com/api)
// Auth: API Token — Authorization: Token <api_token>
// Docs: https://netboxdemo.com/api/docs/
// Spec: https://api.apis.guru/v2/specs/netboxdemo.com/2.8/openapi.json (Swagger 2.0)
// Rate limits: Not publicly documented; enforce per-deployment limits.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface NetBoxConfig {
  apiToken: string;
  baseUrl?: string;
}

export class NetboxdemoMCPServer extends MCPAdapterBase {
  private readonly apiToken: string;
  private readonly baseUrl: string;

  constructor(config: NetBoxConfig) {
    super();
    this.apiToken = config.apiToken;
    this.baseUrl = (config.baseUrl || 'https://netboxdemo.com/api').replace(/\/$/, '');
  }

  static catalog() {
    return {
      name: 'netboxdemo',
      displayName: 'NetBox',
      version: '1.0.0',
      category: 'devops' as const,
      keywords: [
        'netbox', 'network', 'dcim', 'ipam', 'ip address', 'prefix', 'vlan', 'vrf',
        'device', 'rack', 'site', 'cable', 'circuit', 'interface', 'virtualization',
        'data center', 'infrastructure', 'inventory', 'topology', 'digitalocean',
      ],
      toolNames: [
        'list_sites', 'get_site', 'create_site',
        'list_racks', 'get_rack', 'create_rack',
        'list_devices', 'get_device', 'create_device', 'update_device',
        'list_interfaces', 'get_interface', 'create_interface',
        'list_cables', 'get_cable', 'create_cable',
        'list_ip_addresses', 'get_ip_address', 'create_ip_address', 'update_ip_address',
        'list_prefixes', 'get_prefix', 'create_prefix',
        'list_vlans', 'get_vlan', 'create_vlan',
        'list_vrfs', 'get_vrf', 'create_vrf',
        'list_clusters', 'get_cluster', 'create_cluster',
        'list_virtual_machines', 'get_virtual_machine', 'create_virtual_machine',
        'list_circuits', 'get_circuit',
        'list_providers', 'get_provider',
        'list_tags', 'list_object_changes',
      ],
      description: 'NetBox network source-of-truth: manage DCIM (devices, racks, sites, cables), IPAM (IP addresses, prefixes, VLANs, VRFs), virtualization (clusters, VMs), and circuits via the NetBox REST API.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // ── DCIM: Sites ──────────────────────────────────────────────────────
      {
        name: 'list_sites',
        description: 'List all NetBox sites (physical data center or office locations) with optional name/region/status filter',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Filter by site name (partial match)' },
            region: { type: 'string', description: 'Filter by region slug' },
            status: { type: 'string', description: 'Filter by status: active, planned, retired, staging, decommissioning' },
            limit: { type: 'number', description: 'Max results to return (default: 50)' },
            offset: { type: 'number', description: 'Pagination offset' },
          },
        },
      },
      {
        name: 'get_site',
        description: 'Retrieve a single NetBox site by its numeric ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'The NetBox site ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_site',
        description: 'Create a new site in NetBox with a name, slug, and optional status/region/address',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Site name (required)' },
            slug: { type: 'string', description: 'URL-friendly identifier, e.g. "us-east-1" (required)' },
            status: { type: 'string', description: 'Status: active (default), planned, staged, decommissioning, retired' },
            description: { type: 'string', description: 'Optional description' },
            physical_address: { type: 'string', description: 'Physical postal address' },
            latitude: { type: 'number', description: 'GPS latitude' },
            longitude: { type: 'number', description: 'GPS longitude' },
          },
          required: ['name', 'slug'],
        },
      },
      // ── DCIM: Racks ──────────────────────────────────────────────────────
      {
        name: 'list_racks',
        description: 'List server racks in NetBox, optionally filtered by site or name',
        inputSchema: {
          type: 'object',
          properties: {
            site: { type: 'string', description: 'Filter by site slug' },
            name: { type: 'string', description: 'Filter by rack name' },
            status: { type: 'string', description: 'Filter by status: active, planned, retired' },
            limit: { type: 'number', description: 'Max results (default: 50)' },
            offset: { type: 'number', description: 'Pagination offset' },
          },
        },
      },
      {
        name: 'get_rack',
        description: 'Retrieve a single NetBox rack by numeric ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'The NetBox rack ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_rack',
        description: 'Create a new rack in NetBox in a given site with optional unit height and type',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Rack name (required)' },
            site: { type: 'number', description: 'Site ID (required)' },
            u_height: { type: 'number', description: 'Rack height in rack units (default: 42)' },
            status: { type: 'string', description: 'Status: active, planned, retired, reserved' },
            rack_type: { type: 'string', description: '2-post-frame, 4-post-frame, 4-post-cabinet, wall-frame, wall-cabinet' },
          },
          required: ['name', 'site'],
        },
      },
      // ── DCIM: Devices ─────────────────────────────────────────────────────
      {
        name: 'list_devices',
        description: 'List physical devices in NetBox with optional filters for site, rack, role, manufacturer, or status',
        inputSchema: {
          type: 'object',
          properties: {
            site: { type: 'string', description: 'Filter by site slug' },
            rack_id: { type: 'number', description: 'Filter by rack ID' },
            device_role: { type: 'string', description: 'Filter by device role slug (e.g. "router", "switch", "server")' },
            manufacturer: { type: 'string', description: 'Filter by manufacturer slug' },
            status: { type: 'string', description: 'Filter by status: active, planned, staged, failed, inventory, decommissioning, offline' },
            name: { type: 'string', description: 'Filter by device name' },
            limit: { type: 'number', description: 'Max results (default: 50)' },
            offset: { type: 'number', description: 'Pagination offset' },
          },
        },
      },
      {
        name: 'get_device',
        description: 'Retrieve a single device by its NetBox numeric ID, including device type and primary IPs',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'The NetBox device ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_device',
        description: 'Create a new physical device in NetBox assigned to a device type, role, and site',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Device name (required)' },
            device_type: { type: 'number', description: 'Device type ID (required)' },
            device_role: { type: 'number', description: 'Device role ID (required)' },
            site: { type: 'number', description: 'Site ID (required)' },
            status: { type: 'string', description: 'Status: active, planned, staged, failed, inventory, decommissioning, offline (default: active)' },
            rack: { type: 'number', description: 'Rack ID (optional)' },
            position: { type: 'number', description: 'Rack unit position (optional)' },
            serial: { type: 'string', description: 'Serial number (optional)' },
            asset_tag: { type: 'string', description: 'Asset tag (optional)' },
            comments: { type: 'string', description: 'Free-form comments (optional)' },
          },
          required: ['name', 'device_type', 'device_role', 'site'],
        },
      },
      {
        name: 'update_device',
        description: 'Update an existing NetBox device — change status, rack position, serial, or asset tag',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'The device ID to update (required)' },
            status: { type: 'string', description: 'New status' },
            rack: { type: 'number', description: 'New rack ID' },
            position: { type: 'number', description: 'New rack unit position' },
            serial: { type: 'string', description: 'Updated serial number' },
            asset_tag: { type: 'string', description: 'Updated asset tag' },
            comments: { type: 'string', description: 'Updated comments' },
          },
          required: ['id'],
        },
      },
      // ── DCIM: Interfaces ──────────────────────────────────────────────────
      {
        name: 'list_interfaces',
        description: 'List network interfaces for devices in NetBox, with optional device filter',
        inputSchema: {
          type: 'object',
          properties: {
            device_id: { type: 'number', description: 'Filter interfaces by device ID' },
            device: { type: 'string', description: 'Filter interfaces by device name' },
            name: { type: 'string', description: 'Filter by interface name (partial match)' },
            limit: { type: 'number', description: 'Max results (default: 50)' },
            offset: { type: 'number', description: 'Pagination offset' },
          },
        },
      },
      {
        name: 'get_interface',
        description: 'Retrieve a single device interface by its NetBox numeric ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'The interface ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_interface',
        description: 'Create a new network interface on a device in NetBox',
        inputSchema: {
          type: 'object',
          properties: {
            device: { type: 'number', description: 'Device ID (required)' },
            name: { type: 'string', description: 'Interface name, e.g. "GigabitEthernet0/0" (required)' },
            type: { type: 'string', description: 'Interface type: 1000base-t, 10gbase-x-sfpp, virtual, lag, etc. (required)' },
            enabled: { type: 'boolean', description: 'Whether the interface is enabled (default: true)' },
            mtu: { type: 'number', description: 'MTU value (optional)' },
            description: { type: 'string', description: 'Interface description' },
          },
          required: ['device', 'name', 'type'],
        },
      },
      // ── DCIM: Cables ──────────────────────────────────────────────────────
      {
        name: 'list_cables',
        description: 'List physical cables connecting devices/interfaces in NetBox',
        inputSchema: {
          type: 'object',
          properties: {
            site: { type: 'string', description: 'Filter by site slug' },
            status: { type: 'string', description: 'Filter by status: connected, planned, decommissioning' },
            limit: { type: 'number', description: 'Max results (default: 50)' },
            offset: { type: 'number', description: 'Pagination offset' },
          },
        },
      },
      {
        name: 'get_cable',
        description: 'Retrieve a single cable by its NetBox numeric ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'The cable ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_cable',
        description: 'Create a cable connection between two termination endpoints in NetBox',
        inputSchema: {
          type: 'object',
          properties: {
            termination_a_type: { type: 'string', description: 'Content type for side A, e.g. "dcim.interface"' },
            termination_a_id: { type: 'number', description: 'Object ID for side A termination' },
            termination_b_type: { type: 'string', description: 'Content type for side B, e.g. "dcim.interface"' },
            termination_b_id: { type: 'number', description: 'Object ID for side B termination' },
            type: { type: 'string', description: 'Cable type: cat3, cat5e, cat6, cat6a, coaxial, fiber-single-mode, fiber-multi-mode' },
            status: { type: 'string', description: 'Status: connected (default), planned, decommissioning' },
            label: { type: 'string', description: 'Optional cable label' },
            color: { type: 'string', description: 'Hex color code without # (e.g. "aa1409")' },
          },
          required: ['termination_a_type', 'termination_a_id', 'termination_b_type', 'termination_b_id'],
        },
      },
      // ── IPAM: IP Addresses ────────────────────────────────────────────────
      {
        name: 'list_ip_addresses',
        description: 'List IP addresses in NetBox IPAM, with optional prefix, status, or VRF filter',
        inputSchema: {
          type: 'object',
          properties: {
            prefix: { type: 'string', description: 'Filter by parent prefix (CIDR, e.g. "10.0.0.0/8")' },
            status: { type: 'string', description: 'Filter by status: active, reserved, deprecated, dhcp, slaac' },
            vrf_id: { type: 'number', description: 'Filter by VRF ID' },
            interface_id: { type: 'number', description: 'Filter by assigned interface ID' },
            limit: { type: 'number', description: 'Max results (default: 50)' },
            offset: { type: 'number', description: 'Pagination offset' },
          },
        },
      },
      {
        name: 'get_ip_address',
        description: 'Retrieve a single IP address record by its NetBox numeric ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'The IP address ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_ip_address',
        description: 'Create a new IP address in NetBox IPAM with CIDR notation',
        inputSchema: {
          type: 'object',
          properties: {
            address: { type: 'string', description: 'IP address with prefix length, e.g. "192.168.1.1/24" (required)' },
            status: { type: 'string', description: 'Status: active, reserved, deprecated, dhcp, slaac (default: active)' },
            vrf: { type: 'number', description: 'VRF ID (optional)' },
            description: { type: 'string', description: 'Optional description' },
            dns_name: { type: 'string', description: 'DNS hostname associated with this IP' },
          },
          required: ['address'],
        },
      },
      {
        name: 'update_ip_address',
        description: 'Update an existing IP address in NetBox — change status, description, or DNS name',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'The IP address ID to update (required)' },
            status: { type: 'string', description: 'New status: active, reserved, deprecated, dhcp, slaac' },
            description: { type: 'string', description: 'Updated description' },
            dns_name: { type: 'string', description: 'Updated DNS hostname' },
            vrf: { type: 'number', description: 'Updated VRF ID' },
          },
          required: ['id'],
        },
      },
      // ── IPAM: Prefixes ────────────────────────────────────────────────────
      {
        name: 'list_prefixes',
        description: 'List IP prefixes (subnets) in NetBox IPAM with optional site/VRF/status filter',
        inputSchema: {
          type: 'object',
          properties: {
            site: { type: 'string', description: 'Filter by site slug' },
            vrf_id: { type: 'number', description: 'Filter by VRF ID' },
            status: { type: 'string', description: 'Filter by status: active, container, reserved, deprecated' },
            prefix: { type: 'string', description: 'Exact CIDR prefix match, e.g. "10.0.0.0/8"' },
            limit: { type: 'number', description: 'Max results (default: 50)' },
            offset: { type: 'number', description: 'Pagination offset' },
          },
        },
      },
      {
        name: 'get_prefix',
        description: 'Retrieve a single IP prefix by its NetBox numeric ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'The prefix ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_prefix',
        description: 'Create a new IP prefix (subnet) in NetBox IPAM',
        inputSchema: {
          type: 'object',
          properties: {
            prefix: { type: 'string', description: 'CIDR prefix, e.g. "10.10.0.0/24" (required)' },
            status: { type: 'string', description: 'Status: active, container, reserved, deprecated (default: active)' },
            site: { type: 'number', description: 'Site ID (optional)' },
            vrf: { type: 'number', description: 'VRF ID (optional)' },
            description: { type: 'string', description: 'Optional description' },
          },
          required: ['prefix'],
        },
      },
      // ── IPAM: VLANs ───────────────────────────────────────────────────────
      {
        name: 'list_vlans',
        description: 'List VLANs in NetBox IPAM with optional site/group/status filter',
        inputSchema: {
          type: 'object',
          properties: {
            site: { type: 'string', description: 'Filter by site slug' },
            group_id: { type: 'number', description: 'Filter by VLAN group ID' },
            status: { type: 'string', description: 'Filter by status: active, reserved, deprecated' },
            vid: { type: 'number', description: 'Filter by VLAN ID number' },
            limit: { type: 'number', description: 'Max results (default: 50)' },
            offset: { type: 'number', description: 'Pagination offset' },
          },
        },
      },
      {
        name: 'get_vlan',
        description: 'Retrieve a single VLAN by its NetBox numeric ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'The VLAN ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_vlan',
        description: 'Create a new VLAN in NetBox IPAM with a VLAN ID number and name',
        inputSchema: {
          type: 'object',
          properties: {
            vid: { type: 'number', description: 'VLAN ID number 1-4094 (required)' },
            name: { type: 'string', description: 'VLAN name (required)' },
            status: { type: 'string', description: 'Status: active, reserved, deprecated (default: active)' },
            site: { type: 'number', description: 'Site ID (optional)' },
            description: { type: 'string', description: 'Optional description' },
          },
          required: ['vid', 'name'],
        },
      },
      // ── IPAM: VRFs ────────────────────────────────────────────────────────
      {
        name: 'list_vrfs',
        description: 'List VRFs (Virtual Routing and Forwarding instances) in NetBox IPAM',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Filter by VRF name' },
            limit: { type: 'number', description: 'Max results (default: 50)' },
            offset: { type: 'number', description: 'Pagination offset' },
          },
        },
      },
      {
        name: 'get_vrf',
        description: 'Retrieve a single VRF by its NetBox numeric ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'The VRF ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_vrf',
        description: 'Create a new VRF in NetBox IPAM with a name and optional route distinguisher',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'VRF name (required)' },
            rd: { type: 'string', description: 'Route distinguisher, e.g. "65000:100" (optional)' },
            description: { type: 'string', description: 'Optional description' },
            enforce_unique: { type: 'boolean', description: 'Enforce unique IP/prefix assignments in this VRF (default: true)' },
          },
          required: ['name'],
        },
      },
      // ── Virtualization: Clusters ──────────────────────────────────────────
      {
        name: 'list_clusters',
        description: 'List virtualization clusters in NetBox (e.g. vSphere, Proxmox, KVM clusters)',
        inputSchema: {
          type: 'object',
          properties: {
            site: { type: 'string', description: 'Filter by site slug' },
            type: { type: 'string', description: 'Filter by cluster type slug' },
            name: { type: 'string', description: 'Filter by cluster name' },
            limit: { type: 'number', description: 'Max results (default: 50)' },
            offset: { type: 'number', description: 'Pagination offset' },
          },
        },
      },
      {
        name: 'get_cluster',
        description: 'Retrieve a single virtualization cluster by its NetBox numeric ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'The cluster ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_cluster',
        description: 'Create a new virtualization cluster in NetBox with a name and type',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Cluster name (required)' },
            type: { type: 'number', description: 'Cluster type ID (required)' },
            site: { type: 'number', description: 'Site ID (optional)' },
            comments: { type: 'string', description: 'Optional comments' },
          },
          required: ['name', 'type'],
        },
      },
      // ── Virtualization: Virtual Machines ──────────────────────────────────
      {
        name: 'list_virtual_machines',
        description: 'List virtual machines in NetBox with optional cluster or status filter',
        inputSchema: {
          type: 'object',
          properties: {
            cluster_id: { type: 'number', description: 'Filter by cluster ID' },
            status: { type: 'string', description: 'Filter by status: active, planned, staged, failed, decommissioning, offline' },
            name: { type: 'string', description: 'Filter by VM name' },
            limit: { type: 'number', description: 'Max results (default: 50)' },
            offset: { type: 'number', description: 'Pagination offset' },
          },
        },
      },
      {
        name: 'get_virtual_machine',
        description: 'Retrieve a single virtual machine by its NetBox numeric ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'The virtual machine ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_virtual_machine',
        description: 'Create a new virtual machine record in NetBox, assigned to a cluster',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'VM name (required)' },
            cluster: { type: 'number', description: 'Cluster ID (required)' },
            status: { type: 'string', description: 'Status: active, planned, staged, failed, decommissioning, offline (default: active)' },
            vcpus: { type: 'number', description: 'Number of vCPUs' },
            memory: { type: 'number', description: 'Memory in MB' },
            disk: { type: 'number', description: 'Disk storage in GB' },
            comments: { type: 'string', description: 'Optional comments' },
          },
          required: ['name', 'cluster'],
        },
      },
      // ── Circuits ──────────────────────────────────────────────────────────
      {
        name: 'list_circuits',
        description: 'List network circuits in NetBox with optional provider, status, or site filter',
        inputSchema: {
          type: 'object',
          properties: {
            provider_id: { type: 'number', description: 'Filter by circuit provider ID' },
            status: { type: 'string', description: 'Filter by status: active, planned, staged, decommissioning, decommissioned, offline' },
            site: { type: 'string', description: 'Filter by site slug' },
            limit: { type: 'number', description: 'Max results (default: 50)' },
            offset: { type: 'number', description: 'Pagination offset' },
          },
        },
      },
      {
        name: 'get_circuit',
        description: 'Retrieve a single circuit by its NetBox numeric ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'The circuit ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'list_providers',
        description: 'List network/circuit providers in NetBox (ISPs, telcos, cloud providers)',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Filter by provider name' },
            limit: { type: 'number', description: 'Max results (default: 50)' },
            offset: { type: 'number', description: 'Pagination offset' },
          },
        },
      },
      {
        name: 'get_provider',
        description: 'Retrieve a single circuit provider by its NetBox numeric ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'The provider ID' },
          },
          required: ['id'],
        },
      },
      // ── Extras ────────────────────────────────────────────────────────────
      {
        name: 'list_tags',
        description: 'List all tags defined in NetBox for labeling objects',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Filter by tag name' },
            limit: { type: 'number', description: 'Max results (default: 50)' },
            offset: { type: 'number', description: 'Pagination offset' },
          },
        },
      },
      {
        name: 'list_object_changes',
        description: 'List NetBox audit log / object change history with optional user and object type filters',
        inputSchema: {
          type: 'object',
          properties: {
            user: { type: 'string', description: 'Filter by username' },
            object_type: { type: 'string', description: 'Filter by content type, e.g. "dcim.device"' },
            limit: { type: 'number', description: 'Max results (default: 50)' },
            offset: { type: 'number', description: 'Pagination offset' },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        // DCIM
        case 'list_sites':             return await this.listObjects('dcim/sites/', args);
        case 'get_site':               return await this.getObject('dcim/sites/', args);
        case 'create_site':            return await this.createObject('dcim/sites/', args);
        case 'list_racks':             return await this.listObjects('dcim/racks/', args);
        case 'get_rack':               return await this.getObject('dcim/racks/', args);
        case 'create_rack':            return await this.createObject('dcim/racks/', args);
        case 'list_devices':           return await this.listObjects('dcim/devices/', args);
        case 'get_device':             return await this.getObject('dcim/devices/', args);
        case 'create_device':          return await this.createObject('dcim/devices/', args);
        case 'update_device':          return await this.patchObject('dcim/devices/', args);
        case 'list_interfaces':        return await this.listObjects('dcim/interfaces/', args);
        case 'get_interface':          return await this.getObject('dcim/interfaces/', args);
        case 'create_interface':       return await this.createObject('dcim/interfaces/', args);
        case 'list_cables':            return await this.listObjects('dcim/cables/', args);
        case 'get_cable':              return await this.getObject('dcim/cables/', args);
        case 'create_cable':           return await this.createObject('dcim/cables/', args);
        // IPAM
        case 'list_ip_addresses':      return await this.listObjects('ipam/ip-addresses/', args);
        case 'get_ip_address':         return await this.getObject('ipam/ip-addresses/', args);
        case 'create_ip_address':      return await this.createObject('ipam/ip-addresses/', args);
        case 'update_ip_address':      return await this.patchObject('ipam/ip-addresses/', args);
        case 'list_prefixes':          return await this.listObjects('ipam/prefixes/', args);
        case 'get_prefix':             return await this.getObject('ipam/prefixes/', args);
        case 'create_prefix':          return await this.createObject('ipam/prefixes/', args);
        case 'list_vlans':             return await this.listObjects('ipam/vlans/', args);
        case 'get_vlan':               return await this.getObject('ipam/vlans/', args);
        case 'create_vlan':            return await this.createObject('ipam/vlans/', args);
        case 'list_vrfs':              return await this.listObjects('ipam/vrfs/', args);
        case 'get_vrf':                return await this.getObject('ipam/vrfs/', args);
        case 'create_vrf':             return await this.createObject('ipam/vrfs/', args);
        // Virtualization
        case 'list_clusters':          return await this.listObjects('virtualization/clusters/', args);
        case 'get_cluster':            return await this.getObject('virtualization/clusters/', args);
        case 'create_cluster':         return await this.createObject('virtualization/clusters/', args);
        case 'list_virtual_machines':  return await this.listObjects('virtualization/virtual-machines/', args);
        case 'get_virtual_machine':    return await this.getObject('virtualization/virtual-machines/', args);
        case 'create_virtual_machine': return await this.createObject('virtualization/virtual-machines/', args);
        // Circuits
        case 'list_circuits':          return await this.listObjects('circuits/circuits/', args);
        case 'get_circuit':            return await this.getObject('circuits/circuits/', args);
        case 'list_providers':         return await this.listObjects('circuits/providers/', args);
        case 'get_provider':           return await this.getObject('circuits/providers/', args);
        // Extras
        case 'list_tags':              return await this.listObjects('extras/tags/', args);
        case 'list_object_changes':    return await this.listObjects('extras/object-changes/', args);
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

  private buildHeaders(): Record<string, string> {
    return {
      Authorization: `Token ${this.apiToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  private async nbRequest(path: string, options: RequestInit = {}): Promise<ToolResult> {
    const url = `${this.baseUrl}/${path}`;
    const response = await this.fetchWithRetry(url, { ...options, headers: this.buildHeaders() });

    if (!response.ok) {
      let detail = '';
      try { detail = await response.text(); } catch { /* ignore */ }
      return {
        content: [{ type: 'text', text: `NetBox API error ${response.status} ${response.statusText}${detail ? ': ' + detail.slice(0, 400) : ''}` }],
        isError: true,
      };
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      return { content: [{ type: 'text', text: `NetBox returned non-JSON response (HTTP ${response.status})` }], isError: true };
    }

    const text = JSON.stringify(data, null, 2);
    const truncated = text.length > 10_000
      ? text.slice(0, 10_000) + `\n... [truncated, ${text.length} total chars]`
      : text;
    return { content: [{ type: 'text', text: truncated }], isError: false };
  }

  private listObjects(resource: string, args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    const skipKeys = new Set(['limit', 'offset']);
    params.set('limit', String((args.limit as number) ?? 50));
    params.set('offset', String((args.offset as number) ?? 0));
    for (const [k, v] of Object.entries(args)) {
      if (!skipKeys.has(k) && v !== undefined && v !== null) {
        params.set(k, String(v));
      }
    }
    return this.nbRequest(`${resource}?${params.toString()}`);
  }

  private getObject(resource: string, args: Record<string, unknown>): Promise<ToolResult> {
    return this.nbRequest(`${resource}${encodeURIComponent(String(args.id))}/`);
  }

  private createObject(resource: string, args: Record<string, unknown>): Promise<ToolResult> {
    return this.nbRequest(resource, { method: 'POST', body: JSON.stringify(args) });
  }

  private patchObject(resource: string, args: Record<string, unknown>): Promise<ToolResult> {
    const { id, ...rest } = args;
    return this.nbRequest(`${resource}${encodeURIComponent(String(id))}/`, {
      method: 'PATCH',
      body: JSON.stringify(rest),
    });
  }
}
