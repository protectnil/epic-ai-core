/**
 * NetBox MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official NetBox MCP server was found on GitHub as of March 2026.
//
// Base URL: https://{instance}/api  (default: https://demo.netbox.dev/api)
// Auth: Bearer token — set in Authorization header as "Token <api_token>"
// Docs: https://docs.netbox.dev/en/stable/integrations/rest-api/
// Rate limits: Not publicly documented; enforced at the instance level

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface NetBoxConfig {
  /** NetBox API token */
  apiToken: string;
  /** Base URL of the NetBox instance, e.g. https://netbox.example.com/api (default: https://demo.netbox.dev/api) */
  baseUrl?: string;
}

export class NetBoxDevMCPServer extends MCPAdapterBase {
  private readonly token: string;
  private readonly baseUrl: string;

  constructor(config: NetBoxConfig) {
    super();
    this.token = config.apiToken;
    this.baseUrl = config.baseUrl ?? 'https://demo.netbox.dev/api';
  }

  static catalog() {
    return {
      name: 'netbox-dev',
      displayName: 'NetBox',
      version: '1.0.0',
      category: 'devops' as const,
      keywords: [
        'netbox', 'dcim', 'ipam', 'network', 'infrastructure', 'device', 'rack', 'site',
        'ip-address', 'prefix', 'vlan', 'virtual-machine', 'cluster', 'cable', 'interface',
        'circuit', 'tenant', 'inventory', 'data-center', 'network-management',
      ],
      toolNames: [
        'get_status',
        'list_devices', 'get_device', 'create_device', 'update_device', 'delete_device',
        'list_sites', 'get_site', 'create_site', 'update_site', 'delete_site',
        'list_racks', 'get_rack', 'create_rack', 'update_rack', 'delete_rack',
        'list_interfaces', 'get_interface', 'create_interface', 'update_interface', 'delete_interface',
        'list_ip_addresses', 'get_ip_address', 'create_ip_address', 'update_ip_address', 'delete_ip_address',
        'list_prefixes', 'get_prefix', 'create_prefix', 'update_prefix', 'delete_prefix',
        'get_available_ips', 'get_available_prefixes',
        'list_vlans', 'get_vlan', 'create_vlan', 'update_vlan', 'delete_vlan',
        'list_virtual_machines', 'get_virtual_machine', 'create_virtual_machine', 'update_virtual_machine', 'delete_virtual_machine',
        'list_clusters', 'get_cluster', 'create_cluster', 'update_cluster', 'delete_cluster',
        'list_cables', 'get_cable', 'create_cable', 'update_cable', 'delete_cable',
        'list_circuits', 'get_circuit', 'create_circuit', 'update_circuit', 'delete_circuit',
        'list_tenants', 'get_tenant', 'create_tenant', 'update_tenant', 'delete_tenant',
        'list_tags', 'get_tag', 'create_tag', 'update_tag', 'delete_tag',
      ],
      description: 'Network infrastructure management: model devices, racks, sites, IP addresses, prefixes, VLANs, VMs, cables, and circuits in a NetBox DCIM/IPAM instance.',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Status ──────────────────────────────────────────────────────────────
      {
        name: 'get_status',
        description: 'Get NetBox instance status including version, Python version, and installed plugins',
        inputSchema: { type: 'object', properties: {} },
      },

      // ── Devices ─────────────────────────────────────────────────────────────
      {
        name: 'list_devices',
        description: 'List physical devices with optional filters for site, role, platform, status, and tag',
        inputSchema: {
          type: 'object',
          properties: {
            q: { type: 'string', description: 'Free-text search across device name, serial, and asset tag' },
            site: { type: 'string', description: 'Filter by site slug' },
            role: { type: 'string', description: 'Filter by device role slug' },
            platform: { type: 'string', description: 'Filter by platform slug' },
            status: { type: 'string', description: 'Filter by status: active, planned, staged, failed, inventory, decommissioning' },
            tag: { type: 'string', description: 'Filter by tag slug' },
            limit: { type: 'number', description: 'Maximum results to return (default: 50, max: 1000)' },
            offset: { type: 'number', description: 'Pagination offset (default: 0)' },
          },
        },
      },
      {
        name: 'get_device',
        description: 'Get full details of a specific device by its numeric ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'Device numeric ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_device',
        description: 'Create a new device with name, device type, role, and site assignment',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Device hostname/name' },
            device_type: { type: 'number', description: 'Device type ID' },
            device_role: { type: 'number', description: 'Device role ID' },
            site: { type: 'number', description: 'Site ID' },
            platform: { type: 'number', description: 'Platform ID (optional)' },
            serial: { type: 'string', description: 'Serial number (optional)' },
            asset_tag: { type: 'string', description: 'Asset tag (optional)' },
            status: { type: 'string', description: 'Status: active, planned, staged, failed, inventory, decommissioning (default: active)' },
            comments: { type: 'string', description: 'Free-text comments (optional)' },
          },
          required: ['name', 'device_type', 'device_role', 'site'],
        },
      },
      {
        name: 'update_device',
        description: 'Update one or more fields on an existing device by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'Device numeric ID' },
            name: { type: 'string', description: 'New device name' },
            status: { type: 'string', description: 'New status: active, planned, staged, failed, inventory, decommissioning' },
            platform: { type: 'number', description: 'New platform ID' },
            serial: { type: 'string', description: 'New serial number' },
            asset_tag: { type: 'string', description: 'New asset tag' },
            comments: { type: 'string', description: 'Updated comments' },
          },
          required: ['id'],
        },
      },
      {
        name: 'delete_device',
        description: 'Delete a device by ID (irreversible)',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'Device numeric ID to delete' },
          },
          required: ['id'],
        },
      },

      // ── Sites ────────────────────────────────────────────────────────────────
      {
        name: 'list_sites',
        description: 'List physical sites (data centers, offices) with optional filters for region, status, and tag',
        inputSchema: {
          type: 'object',
          properties: {
            q: { type: 'string', description: 'Free-text search across site name and facility' },
            status: { type: 'string', description: 'Filter by status: active, planned, retired' },
            region: { type: 'string', description: 'Filter by region slug' },
            tag: { type: 'string', description: 'Filter by tag slug' },
            limit: { type: 'number', description: 'Maximum results (default: 50)' },
            offset: { type: 'number', description: 'Pagination offset (default: 0)' },
          },
        },
      },
      {
        name: 'get_site',
        description: 'Get full details of a specific site by its numeric ID',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'number', description: 'Site numeric ID' } },
          required: ['id'],
        },
      },
      {
        name: 'create_site',
        description: 'Create a new site with name, slug, status, and optional geographic metadata',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Site display name' },
            slug: { type: 'string', description: 'URL-safe identifier slug' },
            status: { type: 'string', description: 'Status: active, planned, retired (default: active)' },
            facility: { type: 'string', description: 'Facility name or data center identifier (optional)' },
            physical_address: { type: 'string', description: 'Physical mailing address (optional)' },
            latitude: { type: 'number', description: 'GPS latitude (optional)' },
            longitude: { type: 'number', description: 'GPS longitude (optional)' },
            description: { type: 'string', description: 'Short description (optional)' },
          },
          required: ['name', 'slug'],
        },
      },
      {
        name: 'update_site',
        description: 'Update fields on an existing site by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'Site numeric ID' },
            name: { type: 'string', description: 'New site name' },
            status: { type: 'string', description: 'New status: active, planned, retired' },
            description: { type: 'string', description: 'Updated description' },
            facility: { type: 'string', description: 'Updated facility name' },
          },
          required: ['id'],
        },
      },
      {
        name: 'delete_site',
        description: 'Delete a site by ID (irreversible; fails if devices or racks are still assigned)',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'number', description: 'Site numeric ID to delete' } },
          required: ['id'],
        },
      },

      // ── Racks ────────────────────────────────────────────────────────────────
      {
        name: 'list_racks',
        description: 'List equipment racks with optional filters for site, location, role, and status',
        inputSchema: {
          type: 'object',
          properties: {
            q: { type: 'string', description: 'Free-text search across rack name and facility ID' },
            site: { type: 'string', description: 'Filter by site slug' },
            status: { type: 'string', description: 'Filter by status: active, planned, reserved, available, deprecated' },
            role: { type: 'string', description: 'Filter by rack role slug' },
            limit: { type: 'number', description: 'Maximum results (default: 50)' },
            offset: { type: 'number', description: 'Pagination offset (default: 0)' },
          },
        },
      },
      {
        name: 'get_rack',
        description: 'Get full details of a rack by its numeric ID including unit count and device assignments',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'number', description: 'Rack numeric ID' } },
          required: ['id'],
        },
      },
      {
        name: 'create_rack',
        description: 'Create a new rack with name, site, and unit height specification',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Rack name or identifier' },
            site: { type: 'number', description: 'Site ID where the rack is located' },
            status: { type: 'string', description: 'Status: active, planned, reserved, available, deprecated (default: active)' },
            u_height: { type: 'number', description: 'Height in rack units (default: 42)' },
            facility_id: { type: 'string', description: 'Unique identifier within the facility (optional)' },
            asset_tag: { type: 'string', description: 'Asset tag (optional)' },
          },
          required: ['name', 'site'],
        },
      },
      {
        name: 'update_rack',
        description: 'Update fields on an existing rack by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'Rack numeric ID' },
            name: { type: 'string', description: 'New rack name' },
            status: { type: 'string', description: 'New status' },
            u_height: { type: 'number', description: 'New height in rack units' },
            facility_id: { type: 'string', description: 'New facility ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'delete_rack',
        description: 'Delete a rack by ID (irreversible; fails if devices are still mounted)',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'number', description: 'Rack numeric ID to delete' } },
          required: ['id'],
        },
      },

      // ── Interfaces ───────────────────────────────────────────────────────────
      {
        name: 'list_interfaces',
        description: 'List physical and virtual device interfaces with optional filters for device, type, and enabled state',
        inputSchema: {
          type: 'object',
          properties: {
            q: { type: 'string', description: 'Free-text search across interface name and description' },
            device: { type: 'string', description: 'Filter by device name' },
            device_id: { type: 'number', description: 'Filter by device numeric ID' },
            type: { type: 'string', description: 'Filter by interface type, e.g. 1000base-t, 10gbase-x-sfpp' },
            enabled: { type: 'boolean', description: 'Filter by enabled state: true or false' },
            limit: { type: 'number', description: 'Maximum results (default: 50)' },
            offset: { type: 'number', description: 'Pagination offset (default: 0)' },
          },
        },
      },
      {
        name: 'get_interface',
        description: 'Get full details of a device interface by its numeric ID',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'number', description: 'Interface numeric ID' } },
          required: ['id'],
        },
      },
      {
        name: 'create_interface',
        description: 'Create a new interface on a device with name, type, and optional MAC address',
        inputSchema: {
          type: 'object',
          properties: {
            device: { type: 'number', description: 'Device ID this interface belongs to' },
            name: { type: 'string', description: 'Interface name, e.g. GigabitEthernet0/0' },
            type: { type: 'string', description: 'Interface type, e.g. 1000base-t, 10gbase-x-sfpp, virtual' },
            enabled: { type: 'boolean', description: 'Whether the interface is enabled (default: true)' },
            mtu: { type: 'number', description: 'MTU value (optional)' },
            mac_address: { type: 'string', description: 'MAC address in colon-separated format (optional)' },
            description: { type: 'string', description: 'Short description (optional)' },
          },
          required: ['device', 'name', 'type'],
        },
      },
      {
        name: 'update_interface',
        description: 'Update fields on an existing device interface by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'Interface numeric ID' },
            name: { type: 'string', description: 'New interface name' },
            enabled: { type: 'boolean', description: 'Updated enabled state' },
            mtu: { type: 'number', description: 'New MTU' },
            description: { type: 'string', description: 'Updated description' },
          },
          required: ['id'],
        },
      },
      {
        name: 'delete_interface',
        description: 'Delete a device interface by ID (irreversible)',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'number', description: 'Interface numeric ID to delete' } },
          required: ['id'],
        },
      },

      // ── IP Addresses ─────────────────────────────────────────────────────────
      {
        name: 'list_ip_addresses',
        description: 'List IP addresses with optional filters for address prefix, status, role, tenant, and tag',
        inputSchema: {
          type: 'object',
          properties: {
            q: { type: 'string', description: 'Search by address, DNS name, or description' },
            address: { type: 'string', description: 'Exact address or CIDR prefix filter, e.g. 10.0.0.0/24' },
            status: { type: 'string', description: 'Filter by status: active, reserved, deprecated, dhcp, slaac' },
            role: { type: 'string', description: 'Filter by role: loopback, secondary, anycast, vip, vrrp, hsrp, glbp, carp' },
            dns_name: { type: 'string', description: 'Filter by DNS name' },
            tag: { type: 'string', description: 'Filter by tag slug' },
            limit: { type: 'number', description: 'Maximum results (default: 50)' },
            offset: { type: 'number', description: 'Pagination offset (default: 0)' },
          },
        },
      },
      {
        name: 'get_ip_address',
        description: 'Get full details of an IP address record by its numeric ID',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'number', description: 'IP address numeric ID' } },
          required: ['id'],
        },
      },
      {
        name: 'create_ip_address',
        description: 'Create a new IP address record with CIDR notation, status, and optional DNS name',
        inputSchema: {
          type: 'object',
          properties: {
            address: { type: 'string', description: 'IP address with prefix length in CIDR notation, e.g. 192.168.1.1/24' },
            status: { type: 'string', description: 'Status: active, reserved, deprecated, dhcp, slaac (default: active)' },
            role: { type: 'string', description: 'Role: loopback, secondary, anycast, vip, vrrp, hsrp, glbp, carp (optional)' },
            dns_name: { type: 'string', description: 'Forward DNS hostname (optional)' },
            description: { type: 'string', description: 'Short description (optional)' },
            tenant: { type: 'number', description: 'Tenant ID (optional)' },
          },
          required: ['address'],
        },
      },
      {
        name: 'update_ip_address',
        description: 'Update fields on an existing IP address record by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'IP address numeric ID' },
            status: { type: 'string', description: 'New status: active, reserved, deprecated, dhcp, slaac' },
            dns_name: { type: 'string', description: 'Updated DNS hostname' },
            description: { type: 'string', description: 'Updated description' },
            tenant: { type: 'number', description: 'Updated tenant ID' },
          },
          required: ['id'],
        },
      },
      {
        name: 'delete_ip_address',
        description: 'Delete an IP address record by ID (irreversible)',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'number', description: 'IP address numeric ID to delete' } },
          required: ['id'],
        },
      },

      // ── Prefixes ─────────────────────────────────────────────────────────────
      {
        name: 'list_prefixes',
        description: 'List IP prefixes/subnets with optional filters for VRF, site, VLAN, role, status, and tag',
        inputSchema: {
          type: 'object',
          properties: {
            q: { type: 'string', description: 'Search by prefix or description' },
            prefix: { type: 'string', description: 'Exact prefix match, e.g. 10.0.0.0/8' },
            status: { type: 'string', description: 'Filter by status: active, container, reserved, deprecated' },
            site: { type: 'string', description: 'Filter by site slug' },
            vlan_id: { type: 'number', description: 'Filter by VLAN numeric ID' },
            is_pool: { type: 'boolean', description: 'Filter by pool flag' },
            tag: { type: 'string', description: 'Filter by tag slug' },
            limit: { type: 'number', description: 'Maximum results (default: 50)' },
            offset: { type: 'number', description: 'Pagination offset (default: 0)' },
          },
        },
      },
      {
        name: 'get_prefix',
        description: 'Get full details of an IP prefix by its numeric ID',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'number', description: 'Prefix numeric ID' } },
          required: ['id'],
        },
      },
      {
        name: 'create_prefix',
        description: 'Create a new IP prefix with CIDR notation, status, and optional site and VLAN assignment',
        inputSchema: {
          type: 'object',
          properties: {
            prefix: { type: 'string', description: 'IP prefix in CIDR notation, e.g. 10.1.0.0/24' },
            status: { type: 'string', description: 'Status: active, container, reserved, deprecated (default: active)' },
            site: { type: 'number', description: 'Site ID (optional)' },
            vlan: { type: 'number', description: 'VLAN ID (optional)' },
            is_pool: { type: 'boolean', description: 'Flag prefix as a pool for address allocation (default: false)' },
            description: { type: 'string', description: 'Short description (optional)' },
          },
          required: ['prefix'],
        },
      },
      {
        name: 'update_prefix',
        description: 'Update fields on an existing IP prefix by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'Prefix numeric ID' },
            status: { type: 'string', description: 'New status: active, container, reserved, deprecated' },
            description: { type: 'string', description: 'Updated description' },
            is_pool: { type: 'boolean', description: 'Updated pool flag' },
          },
          required: ['id'],
        },
      },
      {
        name: 'delete_prefix',
        description: 'Delete an IP prefix by ID (irreversible)',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'number', description: 'Prefix numeric ID to delete' } },
          required: ['id'],
        },
      },
      {
        name: 'get_available_ips',
        description: 'List available (unallocated) IP addresses within a prefix by prefix ID',
        inputSchema: {
          type: 'object',
          properties: {
            prefix_id: { type: 'number', description: 'Prefix numeric ID to query available IPs within' },
          },
          required: ['prefix_id'],
        },
      },
      {
        name: 'get_available_prefixes',
        description: 'List available child prefixes that can be allocated within a parent prefix by ID',
        inputSchema: {
          type: 'object',
          properties: {
            prefix_id: { type: 'number', description: 'Parent prefix numeric ID to query available sub-prefixes within' },
          },
          required: ['prefix_id'],
        },
      },

      // ── VLANs ────────────────────────────────────────────────────────────────
      {
        name: 'list_vlans',
        description: 'List VLANs with optional filters for VLAN ID, site, group, role, status, and tag',
        inputSchema: {
          type: 'object',
          properties: {
            q: { type: 'string', description: 'Search by VLAN name or description' },
            vid: { type: 'number', description: 'Filter by VLAN ID number (1-4094)' },
            site: { type: 'string', description: 'Filter by site slug' },
            status: { type: 'string', description: 'Filter by status: active, reserved, deprecated' },
            role: { type: 'string', description: 'Filter by role slug' },
            tag: { type: 'string', description: 'Filter by tag slug' },
            limit: { type: 'number', description: 'Maximum results (default: 50)' },
            offset: { type: 'number', description: 'Pagination offset (default: 0)' },
          },
        },
      },
      {
        name: 'get_vlan',
        description: 'Get full details of a VLAN by its numeric ID',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'number', description: 'VLAN numeric ID' } },
          required: ['id'],
        },
      },
      {
        name: 'create_vlan',
        description: 'Create a new VLAN with VID, name, status, and optional site and role assignment',
        inputSchema: {
          type: 'object',
          properties: {
            vid: { type: 'number', description: 'VLAN ID number (1-4094)' },
            name: { type: 'string', description: 'VLAN name' },
            status: { type: 'string', description: 'Status: active, reserved, deprecated (default: active)' },
            site: { type: 'number', description: 'Site ID (optional)' },
            role: { type: 'number', description: 'Role ID (optional)' },
            description: { type: 'string', description: 'Short description (optional)' },
          },
          required: ['vid', 'name'],
        },
      },
      {
        name: 'update_vlan',
        description: 'Update fields on an existing VLAN by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'VLAN numeric ID' },
            name: { type: 'string', description: 'New VLAN name' },
            status: { type: 'string', description: 'New status: active, reserved, deprecated' },
            description: { type: 'string', description: 'Updated description' },
          },
          required: ['id'],
        },
      },
      {
        name: 'delete_vlan',
        description: 'Delete a VLAN by ID (irreversible)',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'number', description: 'VLAN numeric ID to delete' } },
          required: ['id'],
        },
      },

      // ── Virtual Machines ─────────────────────────────────────────────────────
      {
        name: 'list_virtual_machines',
        description: 'List virtual machines with optional filters for cluster, site, platform, status, and tag',
        inputSchema: {
          type: 'object',
          properties: {
            q: { type: 'string', description: 'Search by VM name or description' },
            cluster: { type: 'string', description: 'Filter by cluster name' },
            cluster_id: { type: 'number', description: 'Filter by cluster numeric ID' },
            status: { type: 'string', description: 'Filter by status: active, planned, staged, failed, offline, decommissioning' },
            platform: { type: 'string', description: 'Filter by platform slug' },
            tag: { type: 'string', description: 'Filter by tag slug' },
            limit: { type: 'number', description: 'Maximum results (default: 50)' },
            offset: { type: 'number', description: 'Pagination offset (default: 0)' },
          },
        },
      },
      {
        name: 'get_virtual_machine',
        description: 'Get full details of a virtual machine by its numeric ID',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'number', description: 'Virtual machine numeric ID' } },
          required: ['id'],
        },
      },
      {
        name: 'create_virtual_machine',
        description: 'Create a new virtual machine record with name, cluster, and optional CPU/memory/disk allocation',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'VM hostname' },
            cluster: { type: 'number', description: 'Cluster ID where the VM runs' },
            status: { type: 'string', description: 'Status: active, planned, staged, failed, offline, decommissioning (default: active)' },
            vcpus: { type: 'number', description: 'Number of virtual CPUs (optional)' },
            memory: { type: 'number', description: 'Memory in MB (optional)' },
            disk: { type: 'number', description: 'Disk in GB (optional)' },
            platform: { type: 'number', description: 'Platform ID (optional)' },
            description: { type: 'string', description: 'Short description (optional)' },
          },
          required: ['name', 'cluster'],
        },
      },
      {
        name: 'update_virtual_machine',
        description: 'Update fields on an existing virtual machine record by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'Virtual machine numeric ID' },
            name: { type: 'string', description: 'New VM name' },
            status: { type: 'string', description: 'New status' },
            vcpus: { type: 'number', description: 'New vCPU count' },
            memory: { type: 'number', description: 'New memory in MB' },
            disk: { type: 'number', description: 'New disk in GB' },
          },
          required: ['id'],
        },
      },
      {
        name: 'delete_virtual_machine',
        description: 'Delete a virtual machine record by ID (irreversible)',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'number', description: 'Virtual machine numeric ID to delete' } },
          required: ['id'],
        },
      },

      // ── Clusters ─────────────────────────────────────────────────────────────
      {
        name: 'list_clusters',
        description: 'List virtualization clusters with optional filters for type, group, site, and tag',
        inputSchema: {
          type: 'object',
          properties: {
            q: { type: 'string', description: 'Search by cluster name' },
            site: { type: 'string', description: 'Filter by site slug' },
            tag: { type: 'string', description: 'Filter by tag slug' },
            limit: { type: 'number', description: 'Maximum results (default: 50)' },
            offset: { type: 'number', description: 'Pagination offset (default: 0)' },
          },
        },
      },
      {
        name: 'get_cluster',
        description: 'Get full details of a virtualization cluster by its numeric ID',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'number', description: 'Cluster numeric ID' } },
          required: ['id'],
        },
      },
      {
        name: 'create_cluster',
        description: 'Create a new virtualization cluster with name and type',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Cluster name' },
            type: { type: 'number', description: 'Cluster type ID' },
            site: { type: 'number', description: 'Site ID (optional)' },
            description: { type: 'string', description: 'Short description (optional)' },
          },
          required: ['name', 'type'],
        },
      },
      {
        name: 'update_cluster',
        description: 'Update fields on an existing cluster by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'Cluster numeric ID' },
            name: { type: 'string', description: 'New cluster name' },
            site: { type: 'number', description: 'New site ID' },
            description: { type: 'string', description: 'Updated description' },
          },
          required: ['id'],
        },
      },
      {
        name: 'delete_cluster',
        description: 'Delete a cluster by ID (irreversible; fails if VMs are still assigned)',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'number', description: 'Cluster numeric ID to delete' } },
          required: ['id'],
        },
      },

      // ── Cables ───────────────────────────────────────────────────────────────
      {
        name: 'list_cables',
        description: 'List physical cables connecting device ports with optional filters for type, status, and color',
        inputSchema: {
          type: 'object',
          properties: {
            q: { type: 'string', description: 'Search by cable label' },
            type: { type: 'string', description: 'Filter by cable type, e.g. cat5e, cat6, mmf, smf, coaxial' },
            status: { type: 'string', description: 'Filter by status: connected, planned, decommissioning' },
            color: { type: 'string', description: 'Filter by color hex code, e.g. aa1409' },
            limit: { type: 'number', description: 'Maximum results (default: 50)' },
            offset: { type: 'number', description: 'Pagination offset (default: 0)' },
          },
        },
      },
      {
        name: 'get_cable',
        description: 'Get full details of a cable by its numeric ID including both termination endpoints',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'number', description: 'Cable numeric ID' } },
          required: ['id'],
        },
      },
      {
        name: 'create_cable',
        description: 'Create a new cable record connecting two device port terminations with type and optional label',
        inputSchema: {
          type: 'object',
          properties: {
            a_terminations: {
              type: 'array',
              items: { type: 'object' },
              description: 'Array of A-side termination objects, each with object_type and object_id',
            },
            b_terminations: {
              type: 'array',
              items: { type: 'object' },
              description: 'Array of B-side termination objects, each with object_type and object_id',
            },
            type: { type: 'string', description: 'Cable type: cat5e, cat6, cat6a, cat7, cat8, mmf, smf, coaxial, dac-active, dac-passive (optional)' },
            status: { type: 'string', description: 'Status: connected, planned, decommissioning (default: connected)' },
            label: { type: 'string', description: 'Cable label (optional)' },
            color: { type: 'string', description: 'Color hex code, e.g. aa1409 (optional)' },
          },
          required: ['a_terminations', 'b_terminations'],
        },
      },
      {
        name: 'update_cable',
        description: 'Update fields on an existing cable by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'Cable numeric ID' },
            label: { type: 'string', description: 'New cable label' },
            status: { type: 'string', description: 'New status: connected, planned, decommissioning' },
            color: { type: 'string', description: 'New color hex code' },
          },
          required: ['id'],
        },
      },
      {
        name: 'delete_cable',
        description: 'Delete a cable by ID (irreversible)',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'number', description: 'Cable numeric ID to delete' } },
          required: ['id'],
        },
      },

      // ── Circuits ─────────────────────────────────────────────────────────────
      {
        name: 'list_circuits',
        description: 'List provider circuits with optional filters for provider, type, status, and tenant',
        inputSchema: {
          type: 'object',
          properties: {
            q: { type: 'string', description: 'Search by circuit ID or description' },
            provider: { type: 'string', description: 'Filter by provider slug' },
            status: { type: 'string', description: 'Filter by status: active, planned, provisioning, offline, deprovisioning, decommissioned' },
            tag: { type: 'string', description: 'Filter by tag slug' },
            limit: { type: 'number', description: 'Maximum results (default: 50)' },
            offset: { type: 'number', description: 'Pagination offset (default: 0)' },
          },
        },
      },
      {
        name: 'get_circuit',
        description: 'Get full details of a circuit by its numeric ID',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'number', description: 'Circuit numeric ID' } },
          required: ['id'],
        },
      },
      {
        name: 'create_circuit',
        description: 'Create a new provider circuit with CID, provider, type, and optional commit rate',
        inputSchema: {
          type: 'object',
          properties: {
            cid: { type: 'string', description: 'Circuit ID assigned by the provider' },
            provider: { type: 'number', description: 'Provider ID' },
            type: { type: 'number', description: 'Circuit type ID' },
            status: { type: 'string', description: 'Status: active, planned, provisioning, offline, deprovisioning, decommissioned (default: active)' },
            commit_rate: { type: 'number', description: 'Committed rate in Kbps (optional)' },
            description: { type: 'string', description: 'Short description (optional)' },
          },
          required: ['cid', 'provider', 'type'],
        },
      },
      {
        name: 'update_circuit',
        description: 'Update fields on an existing circuit by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'Circuit numeric ID' },
            status: { type: 'string', description: 'New status' },
            commit_rate: { type: 'number', description: 'New commit rate in Kbps' },
            description: { type: 'string', description: 'Updated description' },
          },
          required: ['id'],
        },
      },
      {
        name: 'delete_circuit',
        description: 'Delete a circuit by ID (irreversible)',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'number', description: 'Circuit numeric ID to delete' } },
          required: ['id'],
        },
      },

      // ── Tenants ──────────────────────────────────────────────────────────────
      {
        name: 'list_tenants',
        description: 'List tenants (organizations owning network resources) with optional filters for group and tag',
        inputSchema: {
          type: 'object',
          properties: {
            q: { type: 'string', description: 'Search by tenant name or description' },
            group: { type: 'string', description: 'Filter by tenant group slug' },
            tag: { type: 'string', description: 'Filter by tag slug' },
            limit: { type: 'number', description: 'Maximum results (default: 50)' },
            offset: { type: 'number', description: 'Pagination offset (default: 0)' },
          },
        },
      },
      {
        name: 'get_tenant',
        description: 'Get full details of a tenant by its numeric ID',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'number', description: 'Tenant numeric ID' } },
          required: ['id'],
        },
      },
      {
        name: 'create_tenant',
        description: 'Create a new tenant with name, slug, and optional description',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Tenant display name' },
            slug: { type: 'string', description: 'URL-safe identifier slug' },
            description: { type: 'string', description: 'Short description (optional)' },
            comments: { type: 'string', description: 'Free-text comments (optional)' },
          },
          required: ['name', 'slug'],
        },
      },
      {
        name: 'update_tenant',
        description: 'Update fields on an existing tenant by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'Tenant numeric ID' },
            name: { type: 'string', description: 'New tenant name' },
            description: { type: 'string', description: 'Updated description' },
            comments: { type: 'string', description: 'Updated comments' },
          },
          required: ['id'],
        },
      },
      {
        name: 'delete_tenant',
        description: 'Delete a tenant by ID (irreversible; fails if resources are still assigned)',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'number', description: 'Tenant numeric ID to delete' } },
          required: ['id'],
        },
      },

      // ── Tags ─────────────────────────────────────────────────────────────────
      {
        name: 'list_tags',
        description: 'List all tags used in the NetBox instance with optional search and color filter',
        inputSchema: {
          type: 'object',
          properties: {
            q: { type: 'string', description: 'Search by tag name, slug, or description' },
            color: { type: 'string', description: 'Filter by color hex code' },
            limit: { type: 'number', description: 'Maximum results (default: 50)' },
            offset: { type: 'number', description: 'Pagination offset (default: 0)' },
          },
        },
      },
      {
        name: 'get_tag',
        description: 'Get full details of a tag by its numeric ID',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'number', description: 'Tag numeric ID' } },
          required: ['id'],
        },
      },
      {
        name: 'create_tag',
        description: 'Create a new tag with name, slug, color, and optional description',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Tag display name' },
            slug: { type: 'string', description: 'URL-safe identifier slug' },
            color: { type: 'string', description: '6-digit hex color code without #, e.g. aa1409' },
            description: { type: 'string', description: 'Short description (optional)' },
          },
          required: ['name', 'slug'],
        },
      },
      {
        name: 'update_tag',
        description: 'Update fields on an existing tag by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'Tag numeric ID' },
            name: { type: 'string', description: 'New tag name' },
            color: { type: 'string', description: 'New color hex code' },
            description: { type: 'string', description: 'Updated description' },
          },
          required: ['id'],
        },
      },
      {
        name: 'delete_tag',
        description: 'Delete a tag by ID (irreversible)',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'number', description: 'Tag numeric ID to delete' } },
          required: ['id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_status':             return await this.getStatus();
        case 'list_devices':           return await this.listResources('dcim/devices', args);
        case 'get_device':             return await this.getResource('dcim/devices', args);
        case 'create_device':          return await this.createResource('dcim/devices', args);
        case 'update_device':          return await this.updateResource('dcim/devices', args);
        case 'delete_device':          return await this.deleteResource('dcim/devices', args);
        case 'list_sites':             return await this.listResources('dcim/sites', args);
        case 'get_site':               return await this.getResource('dcim/sites', args);
        case 'create_site':            return await this.createResource('dcim/sites', args);
        case 'update_site':            return await this.updateResource('dcim/sites', args);
        case 'delete_site':            return await this.deleteResource('dcim/sites', args);
        case 'list_racks':             return await this.listResources('dcim/racks', args);
        case 'get_rack':               return await this.getResource('dcim/racks', args);
        case 'create_rack':            return await this.createResource('dcim/racks', args);
        case 'update_rack':            return await this.updateResource('dcim/racks', args);
        case 'delete_rack':            return await this.deleteResource('dcim/racks', args);
        case 'list_interfaces':        return await this.listResources('dcim/interfaces', args);
        case 'get_interface':          return await this.getResource('dcim/interfaces', args);
        case 'create_interface':       return await this.createResource('dcim/interfaces', args);
        case 'update_interface':       return await this.updateResource('dcim/interfaces', args);
        case 'delete_interface':       return await this.deleteResource('dcim/interfaces', args);
        case 'list_ip_addresses':      return await this.listResources('ipam/ip-addresses', args);
        case 'get_ip_address':         return await this.getResource('ipam/ip-addresses', args);
        case 'create_ip_address':      return await this.createResource('ipam/ip-addresses', args);
        case 'update_ip_address':      return await this.updateResource('ipam/ip-addresses', args);
        case 'delete_ip_address':      return await this.deleteResource('ipam/ip-addresses', args);
        case 'list_prefixes':          return await this.listResources('ipam/prefixes', args);
        case 'get_prefix':             return await this.getResource('ipam/prefixes', args);
        case 'create_prefix':          return await this.createResource('ipam/prefixes', args);
        case 'update_prefix':          return await this.updateResource('ipam/prefixes', args);
        case 'delete_prefix':          return await this.deleteResource('ipam/prefixes', args);
        case 'get_available_ips':      return await this.getAvailableIps(args);
        case 'get_available_prefixes': return await this.getAvailablePrefixes(args);
        case 'list_vlans':             return await this.listResources('ipam/vlans', args);
        case 'get_vlan':               return await this.getResource('ipam/vlans', args);
        case 'create_vlan':            return await this.createResource('ipam/vlans', args);
        case 'update_vlan':            return await this.updateResource('ipam/vlans', args);
        case 'delete_vlan':            return await this.deleteResource('ipam/vlans', args);
        case 'list_virtual_machines':  return await this.listResources('virtualization/virtual-machines', args);
        case 'get_virtual_machine':    return await this.getResource('virtualization/virtual-machines', args);
        case 'create_virtual_machine': return await this.createResource('virtualization/virtual-machines', args);
        case 'update_virtual_machine': return await this.updateResource('virtualization/virtual-machines', args);
        case 'delete_virtual_machine': return await this.deleteResource('virtualization/virtual-machines', args);
        case 'list_clusters':          return await this.listResources('virtualization/clusters', args);
        case 'get_cluster':            return await this.getResource('virtualization/clusters', args);
        case 'create_cluster':         return await this.createResource('virtualization/clusters', args);
        case 'update_cluster':         return await this.updateResource('virtualization/clusters', args);
        case 'delete_cluster':         return await this.deleteResource('virtualization/clusters', args);
        case 'list_cables':            return await this.listResources('dcim/cables', args);
        case 'get_cable':              return await this.getResource('dcim/cables', args);
        case 'create_cable':           return await this.createResource('dcim/cables', args);
        case 'update_cable':           return await this.updateResource('dcim/cables', args);
        case 'delete_cable':           return await this.deleteResource('dcim/cables', args);
        case 'list_circuits':          return await this.listResources('circuits/circuits', args);
        case 'get_circuit':            return await this.getResource('circuits/circuits', args);
        case 'create_circuit':         return await this.createResource('circuits/circuits', args);
        case 'update_circuit':         return await this.updateResource('circuits/circuits', args);
        case 'delete_circuit':         return await this.deleteResource('circuits/circuits', args);
        case 'list_tenants':           return await this.listResources('tenancy/tenants', args);
        case 'get_tenant':             return await this.getResource('tenancy/tenants', args);
        case 'create_tenant':          return await this.createResource('tenancy/tenants', args);
        case 'update_tenant':          return await this.updateResource('tenancy/tenants', args);
        case 'delete_tenant':          return await this.deleteResource('tenancy/tenants', args);
        case 'list_tags':              return await this.listResources('extras/tags', args);
        case 'get_tag':                return await this.getResource('extras/tags', args);
        case 'create_tag':             return await this.createResource('extras/tags', args);
        case 'update_tag':             return await this.updateResource('extras/tags', args);
        case 'delete_tag':             return await this.deleteResource('extras/tags', args);
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

  // ── Private helpers ─────────────────────────────────────────────────────────

  private headers(): Record<string, string> {
    return {
      Authorization: `Token ${this.token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  private async fetchJson(url: string, options: RequestInit = {}): Promise<ToolResult> {
    const response = await this.fetchWithRetry(url, { headers: this.headers(), ...options });
    let data: unknown;
    try {
      data = await response.json();
    } catch {
      data = { status: response.status, statusText: response.statusText };
    }
    const out = JSON.stringify(data, null, 2);
    return {
      content: [{ type: 'text', text: this.truncate(out) }],
      isError: !response.ok,
    };
  }

  private async getStatus(): Promise<ToolResult> {
    return this.fetchJson(`${this.baseUrl}/status/`);
  }

  private async listResources(resource: string, args: Record<string, unknown>): Promise<ToolResult> {
    const { limit, offset, ...filters } = args;
    const params = new URLSearchParams();
    params.set('limit', String(limit ?? 50));
    params.set('offset', String(offset ?? 0));
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null) {
        params.set(key, String(value));
      }
    }
    return this.fetchJson(`${this.baseUrl}/${resource}/?${params}`);
  }

  private async getResource(resource: string, args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.id as number;
    if (!id) {
      return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    }
    return this.fetchJson(`${this.baseUrl}/${resource}/${id}/`);
  }

  private async createResource(resource: string, args: Record<string, unknown>): Promise<ToolResult> {
    return this.fetchJson(`${this.baseUrl}/${resource}/`, {
      method: 'POST',
      body: JSON.stringify(args),
    });
  }

  private async updateResource(resource: string, args: Record<string, unknown>): Promise<ToolResult> {
    const { id, ...fields } = args;
    if (!id) {
      return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    }
    return this.fetchJson(`${this.baseUrl}/${resource}/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(fields),
    });
  }

  private async deleteResource(resource: string, args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.id as number;
    if (!id) {
      return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    }
    const response = await this.fetchWithRetry(`${this.baseUrl}/${resource}/${id}/`, {
      method: 'DELETE',
      headers: this.headers(),
    });
    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `Delete failed: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }
    return {
      content: [{ type: 'text', text: `Deleted ${resource} ID ${id} successfully` }],
      isError: false,
    };
  }

  private async getAvailableIps(args: Record<string, unknown>): Promise<ToolResult> {
    const prefix_id = args.prefix_id as number;
    if (!prefix_id) {
      return { content: [{ type: 'text', text: 'prefix_id is required' }], isError: true };
    }
    return this.fetchJson(`${this.baseUrl}/ipam/prefixes/${prefix_id}/available-ips/`);
  }

  private async getAvailablePrefixes(args: Record<string, unknown>): Promise<ToolResult> {
    const prefix_id = args.prefix_id as number;
    if (!prefix_id) {
      return { content: [{ type: 'text', text: 'prefix_id is required' }], isError: true };
    }
    return this.fetchJson(`${this.baseUrl}/ipam/prefixes/${prefix_id}/available-prefixes/`);
  }
}
