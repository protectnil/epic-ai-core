/**
 * smart-me MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03.
// No official smart-me.com MCP server was found on GitHub.
//
// Base URL: https://smart-me.com:443
// Auth: HTTP Basic Authentication (username + password)
// Docs: https://smart-me.com/swagger/docs/v1
// Rate limits: Not published; standard cloud throttling applies.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface SmartMeConfig {
  username: string;
  password: string;
  baseUrl?: string;
}

export class SmartMeMCPServer extends MCPAdapterBase {
  private readonly username: string;
  private readonly password: string;
  private readonly baseUrl: string;

  constructor(config: SmartMeConfig) {
    super();
    this.username = config.username;
    this.password = config.password;
    this.baseUrl = config.baseUrl ?? 'https://smart-me.com:443';
  }

  private get authHeaders(): Record<string, string> {
    const encoded = Buffer.from(`${this.username}:${this.password}`).toString('base64');
    return {
      Authorization: `Basic ${encoded}`,
      'Content-Type': 'application/json',
    };
  }

  static catalog() {
    return {
      name: 'smart-me',
      displayName: 'smart-me',
      version: '1.0.0',
      category: 'iot' as const,
      keywords: [
        'smart-me', 'smart meter', 'energy', 'electricity', 'iot', 'meter', 'device',
        'consumption', 'power', 'measurement', 'values', 'realtime', 'monitoring',
        'sub-meter', 'folder', 'mbus', 'user', 'actions',
      ],
      toolNames: [
        'list_devices',
        'get_device',
        'update_device',
        'get_device_values',
        'get_values_in_past',
        'get_meter_values',
        'get_devices_by_energy',
        'get_devices_by_subtype',
        'get_device_by_serial',
        'get_additional_device_info',
        'set_device_action',
        'get_device_action',
        'list_custom_devices',
        'get_custom_device',
        'get_folder',
        'get_folder_menu',
        'get_meter_folder_info',
        'get_user',
        'get_sub_user',
        'create_sub_user',
        'delete_sub_user',
      ],
      description:
        'Access and manage smart energy meters and IoT devices in the smart-me Cloud. ' +
        'Read real-time and historical energy consumption values, manage device metadata, ' +
        'control device actions, organize devices into folders, and manage sub-users.',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_devices',
        description:
          'List all smart meters and energy monitoring devices registered in the smart-me account.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_device',
        description:
          'Retrieve detailed information for a specific smart-me device by its ID, ' +
          'including current energy readings and metadata.',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'The smart-me device ID (GUID)',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'update_device',
        description:
          'Update the metadata or configuration of an existing smart-me device.',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'The smart-me device ID (GUID)',
            },
            name: {
              type: 'string',
              description: 'New display name for the device',
            },
            counter_reading: {
              type: 'number',
              description: 'Override the meter counter reading value',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_device_values',
        description:
          'Retrieve the current measurement values for a specific device, ' +
          'including voltage, current, power, and energy readings.',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'The smart-me device ID (GUID)',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_values_in_past',
        description:
          'Retrieve historical energy values for a device over a specified time range in the past.',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'The smart-me device ID (GUID)',
            },
            date: {
              type: 'string',
              description:
                'Reference date and time (ISO 8601 format) to retrieve past values from',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_meter_values',
        description:
          'Retrieve the raw meter register values (obis codes and counter readings) ' +
          'for a specific device.',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'The smart-me device ID (GUID)',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_devices_by_energy',
        description:
          'List devices filtered and sorted by energy type (electricity, gas, water, heat, etc.).',
        inputSchema: {
          type: 'object',
          properties: {
            energy_type: {
              type: 'number',
              description:
                'Energy type filter: 0=All, 1=Electricity, 2=Gas, 3=Water, 4=Heat, ' +
                '5=HeatCostAllocator, 6=WarmWater, 7=ColdWater',
            },
          },
        },
      },
      {
        name: 'get_devices_by_subtype',
        description:
          'List devices filtered by device sub-type (e.g. main meter, sub-meter, virtual device).',
        inputSchema: {
          type: 'object',
          properties: {
            sub_type: {
              type: 'number',
              description: 'Sub-type filter value (integer)',
            },
          },
        },
      },
      {
        name: 'get_device_by_serial',
        description:
          'Retrieve a smart-me device by its serial number instead of its GUID.',
        inputSchema: {
          type: 'object',
          properties: {
            serial: {
              type: 'number',
              description: 'The meter serial number (integer)',
            },
          },
          required: ['serial'],
        },
      },
      {
        name: 'get_additional_device_info',
        description:
          'Retrieve additional technical information for a device, such as firmware version, ' +
          'hardware type, and communication parameters.',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'The smart-me device ID (GUID)',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'set_device_action',
        description:
          'Send an action command to a device, such as switching a relay on/off ' +
          'or resetting an energy counter.',
        inputSchema: {
          type: 'object',
          properties: {
            device_id: {
              type: 'string',
              description: 'The smart-me device ID (GUID) to send the action to',
            },
            action_id: {
              type: 'number',
              description:
                'Action identifier: 1=SwitchOn, 2=SwitchOff, 3=ResetCounter, ' +
                '4=StartCharging, 5=StopCharging',
            },
            value: {
              type: 'number',
              description: 'Optional numeric value accompanying the action (e.g. dim level)',
            },
          },
          required: ['device_id', 'action_id'],
        },
      },
      {
        name: 'get_device_action',
        description:
          'Retrieve the current action state or last action result for a smart-me device.',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'The smart-me device ID (GUID)',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'list_custom_devices',
        description:
          'List all custom (virtual) devices created in the smart-me account ' +
          'for software-defined metering.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_custom_device',
        description:
          'Retrieve details of a specific custom (virtual) smart-me device by its ID.',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'The custom device ID (GUID)',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_folder',
        description:
          'Retrieve a smart-me device folder by its ID, including the devices it contains.',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'The folder ID (GUID)',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_folder_menu',
        description:
          'Retrieve the folder menu hierarchy showing all folders and their structure ' +
          'in the smart-me account.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_meter_folder_info',
        description:
          'Retrieve meter folder information including aggregated energy totals ' +
          'and device counts for a folder.',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'The folder ID (GUID) to retrieve meter information for',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_user',
        description:
          'Retrieve profile and account information for the currently authenticated smart-me user.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_sub_user',
        description:
          'Retrieve information for a specific sub-user account under the main smart-me account.',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'The sub-user ID (GUID)',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_sub_user',
        description:
          'Create a new sub-user account under the main smart-me account with limited access.',
        inputSchema: {
          type: 'object',
          properties: {
            username: {
              type: 'string',
              description: 'Username (email address) for the new sub-user',
            },
            password: {
              type: 'string',
              description: 'Password for the new sub-user account',
            },
            name: {
              type: 'string',
              description: 'Display name for the sub-user (optional)',
            },
          },
          required: ['username', 'password'],
        },
      },
      {
        name: 'delete_sub_user',
        description: 'Delete a sub-user account from the smart-me account by user ID.',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'The sub-user ID (GUID) to delete',
            },
          },
          required: ['id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_devices':
          return await this.listDevices();
        case 'get_device':
          return await this.getDevice(args);
        case 'update_device':
          return await this.updateDevice(args);
        case 'get_device_values':
          return await this.getDeviceValues(args);
        case 'get_values_in_past':
          return await this.getValuesInPast(args);
        case 'get_meter_values':
          return await this.getMeterValues(args);
        case 'get_devices_by_energy':
          return await this.getDevicesByEnergy(args);
        case 'get_devices_by_subtype':
          return await this.getDevicesBySubtype(args);
        case 'get_device_by_serial':
          return await this.getDeviceBySerial(args);
        case 'get_additional_device_info':
          return await this.getAdditionalDeviceInfo(args);
        case 'set_device_action':
          return await this.setDeviceAction(args);
        case 'get_device_action':
          return await this.getDeviceAction(args);
        case 'list_custom_devices':
          return await this.listCustomDevices();
        case 'get_custom_device':
          return await this.getCustomDevice(args);
        case 'get_folder':
          return await this.getFolder(args);
        case 'get_folder_menu':
          return await this.getFolderMenu();
        case 'get_meter_folder_info':
          return await this.getMeterFolderInfo(args);
        case 'get_user':
          return await this.getUser();
        case 'get_sub_user':
          return await this.getSubUser(args);
        case 'create_sub_user':
          return await this.createSubUser(args);
        case 'delete_sub_user':
          return await this.deleteSubUser(args);
        default:
          return {
            content: [{ type: 'text', text: `Unknown tool: ${name}` }],
            isError: true,
          };
      }
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }

  private async request(
    method: string,
    path: string,
    body?: Record<string, unknown>,
    params?: URLSearchParams,
  ): Promise<ToolResult> {
    const qs = params && params.toString() ? `?${params.toString()}` : '';
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}${qs}`, {
      method,
      headers: this.authHeaders,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (response.status === 204) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ status: 204, message: 'Success (no content)' }) }],
        isError: false,
      };
    }

    if (!response.ok) {
      let errText = '';
      try { errText = await response.text(); } catch { /* ignore */ }
      return {
        content: [
          {
            type: 'text',
            text: `smart-me API error ${response.status} ${response.statusText}: ${errText}`,
          },
        ],
        isError: true,
      };
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      const txt = await response.text().catch(() => '');
      return {
        content: [{ type: 'text', text: this.truncate(txt || JSON.stringify({ status: response.status })) }],
        isError: false,
      };
    }

    return {
      content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }],
      isError: false,
    };
  }

  private async listDevices(): Promise<ToolResult> {
    return this.request('GET', '/api/Devices');
  }

  private async getDevice(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.id as string;
    if (!id) {
      return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    }
    return this.request('GET', `/api/Devices/${encodeURIComponent(id)}`);
  }

  private async updateDevice(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.id as string;
    if (!id) {
      return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    }
    const body: Record<string, unknown> = { Id: id };
    if (args.name !== undefined) body.Name = args.name;
    if (args.counter_reading !== undefined) body.CounterReading = args.counter_reading;
    return this.request('PUT', `/api/Devices/${encodeURIComponent(id)}`, body);
  }

  private async getDeviceValues(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.id as string;
    if (!id) {
      return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    }
    return this.request('GET', `/api/Values/${encodeURIComponent(id)}`);
  }

  private async getValuesInPast(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.id as string;
    if (!id) {
      return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    }
    const params = new URLSearchParams();
    if (args.date) params.set('date', args.date as string);
    return this.request('GET', `/api/ValuesInPast/${encodeURIComponent(id)}`, undefined, params);
  }

  private async getMeterValues(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.id as string;
    if (!id) {
      return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    }
    return this.request('GET', `/api/MeterValues/${encodeURIComponent(id)}`);
  }

  private async getDevicesByEnergy(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.energy_type !== undefined) params.set('meterEnergyType', String(args.energy_type as number));
    return this.request('GET', '/api/DevicesByEnergy', undefined, params);
  }

  private async getDevicesBySubtype(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.sub_type !== undefined) params.set('meterSubType', String(args.sub_type as number));
    return this.request('GET', '/api/DevicesBySubType', undefined, params);
  }

  private async getDeviceBySerial(args: Record<string, unknown>): Promise<ToolResult> {
    const serial = args.serial as number;
    if (serial === undefined || serial === null) {
      return { content: [{ type: 'text', text: 'serial is required' }], isError: true };
    }
    const params = new URLSearchParams({ serial: String(serial) });
    return this.request('GET', '/api/DeviceBySerial', undefined, params);
  }

  private async getAdditionalDeviceInfo(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.id as string;
    if (!id) {
      return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    }
    return this.request('GET', `/api/AdditionalDeviceInformation/${encodeURIComponent(id)}`);
  }

  private async setDeviceAction(args: Record<string, unknown>): Promise<ToolResult> {
    const device_id = args.device_id as string;
    const action_id = args.action_id as number;
    if (!device_id || action_id === undefined || action_id === null) {
      return {
        content: [{ type: 'text', text: 'device_id and action_id are required' }],
        isError: true,
      };
    }
    const body: Record<string, unknown> = { DeviceId: device_id, ActionId: action_id };
    if (args.value !== undefined) body.Value = args.value;
    return this.request('POST', '/api/Actions', body);
  }

  private async getDeviceAction(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.id as string;
    if (!id) {
      return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    }
    return this.request('GET', `/api/Actions/${encodeURIComponent(id)}`);
  }

  private async listCustomDevices(): Promise<ToolResult> {
    return this.request('GET', '/api/CustomDevice');
  }

  private async getCustomDevice(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.id as string;
    if (!id) {
      return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    }
    return this.request('GET', `/api/CustomDevice/${encodeURIComponent(id)}`);
  }

  private async getFolder(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.id as string;
    if (!id) {
      return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    }
    return this.request('GET', `/api/Folder/${encodeURIComponent(id)}`);
  }

  private async getFolderMenu(): Promise<ToolResult> {
    return this.request('GET', '/api/FolderMenu');
  }

  private async getMeterFolderInfo(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.id as string;
    if (!id) {
      return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    }
    return this.request('GET', `/api/MeterFolderInformation/${encodeURIComponent(id)}`);
  }

  private async getUser(): Promise<ToolResult> {
    return this.request('GET', '/api/User');
  }

  private async getSubUser(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.id as string;
    if (!id) {
      return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    }
    return this.request('GET', `/api/SubUser/${encodeURIComponent(id)}`);
  }

  private async createSubUser(args: Record<string, unknown>): Promise<ToolResult> {
    const username = args.username as string;
    const password = args.password as string;
    if (!username || !password) {
      return {
        content: [{ type: 'text', text: 'username and password are required' }],
        isError: true,
      };
    }
    const body: Record<string, unknown> = { Username: username, Password: password };
    if (args.name) body.Name = args.name;
    return this.request('POST', '/api/SubUser', body);
  }

  private async deleteSubUser(args: Record<string, unknown>): Promise<ToolResult> {
    const id = args.id as string;
    if (!id) {
      return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    }
    return this.request('DELETE', `/api/SubUser/${encodeURIComponent(id)}`);
  }
}
