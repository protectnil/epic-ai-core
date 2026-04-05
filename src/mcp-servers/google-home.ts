/**
 * Google Home MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official Google Home MCP server was found on GitHub.
// Note: This adapter targets the unofficial Google Home Local API (port 8443 on device LAN IP).
// The local API uses a short-lived cast-local-authorization-token (~1 day TTL).
//
// Base URL: https://<google-home-ip>:8443/setup  (user supplies device IP)
// Auth: API key header `cast-local-authorization-token` — obtain via Google Home Foyer API or grpcurl
// Docs: https://github.com/rithvikvibhu/GHLocalApi
// Rate limits: Local device — no documented rate limits; requests go directly to the device on LAN

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface GoogleHomeConfig {
  /** Local authorization token (cast-local-authorization-token) — short-lived, ~1 day TTL */
  localAuthToken: string;
  /** IP address of the Google Home device on the local network (e.g. "192.168.1.50") */
  deviceIp: string;
  /** Optional port override (default: 8443) */
  port?: number;
}

export class GoogleHomeMCPServer extends MCPAdapterBase {
  private readonly localAuthToken: string;
  private readonly baseUrl: string;

  constructor(config: GoogleHomeConfig) {
    super();
    this.localAuthToken = config.localAuthToken;
    const port = config.port ?? 8443;
    this.baseUrl = `https://${config.deviceIp}:${port}/setup`;
  }

  static catalog() {
    return {
      name: 'google-home',
      displayName: 'Google Home',
      version: '1.0.0',
      category: 'iot' as const,
      keywords: [
        'google home', 'smart home', 'iot', 'chromecast', 'assistant',
        'bluetooth', 'wifi', 'smart speaker', 'home automation',
        'alarms', 'timers', 'do not disturb', 'night mode', 'equalizer',
        'cast', 'local api', 'device settings', 'reboot',
      ],
      toolNames: [
        'get_device_info', 'set_device_info',
        'get_alarms_and_timers', 'delete_alarms_and_timers', 'set_alarm_volume',
        'get_bluetooth_status', 'get_paired_bluetooth_devices', 'scan_bluetooth_devices',
        'get_bluetooth_scan_results', 'pair_bluetooth_device', 'forget_bluetooth_device',
        'set_bluetooth_discoverability',
        'get_saved_wifi_networks', 'scan_wifi_networks', 'get_wifi_scan_results',
        'connect_wifi_network', 'forget_wifi_network',
        'set_do_not_disturb', 'set_night_mode', 'set_equalizer',
        'check_ready_status', 'test_download_speed',
        'reboot_device',
        'get_supported_locales', 'get_supported_timezones',
      ],
      description: 'Google Home local API: control a Google Home/Nest device on LAN — alarms, timers, Bluetooth, Wi-Fi, night mode, equalizer, do-not-disturb, device info, and reboot.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_device_info',
        description: 'Get Google Home device information (name, firmware, timezone, locale) via the eureka_info endpoint',
        inputSchema: {
          type: 'object',
          properties: {
            params: {
              type: 'string',
              description: 'Comma-separated list of info sections to return (e.g. "name,build_info,settings,device_info,net,wifi")',
            },
            options: {
              type: 'string',
              description: 'Additional options flags as a numeric string (default: "48")',
            },
          },
        },
      },
      {
        name: 'set_device_info',
        description: 'Update Google Home device settings such as device name, opt-in preferences, or timezone',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'New friendly name for the device (e.g. "Living Room")',
            },
            opt_in_opencast: {
              type: 'boolean',
              description: 'Opt in to opencast feature (default: unchanged)',
            },
            opt_in_preview_channel: {
              type: 'boolean',
              description: 'Opt in to preview/beta channel (default: unchanged)',
            },
          },
        },
      },
      {
        name: 'get_alarms_and_timers',
        description: 'Get all active alarms and timers on the Google Home device',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'delete_alarms_and_timers',
        description: 'Delete specific alarms or timers on the Google Home device by their IDs',
        inputSchema: {
          type: 'object',
          properties: {
            ids: {
              type: 'array',
              description: 'Array of alarm/timer IDs to delete (e.g. ["alarm/abc123", "timer/def456"])',
              items: { type: 'string' },
            },
          },
          required: ['ids'],
        },
      },
      {
        name: 'set_alarm_volume',
        description: 'Set the alarm and timer volume on the Google Home device',
        inputSchema: {
          type: 'object',
          properties: {
            volume: {
              type: 'number',
              description: 'Volume level as a float between 0.0 (silent) and 1.0 (maximum)',
            },
          },
          required: ['volume'],
        },
      },
      {
        name: 'get_bluetooth_status',
        description: 'Get current Bluetooth status of the Google Home device (enabled, scanning, discovery mode)',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_paired_bluetooth_devices',
        description: 'Get a list of all Bluetooth devices currently paired (bonded) with the Google Home device',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'scan_bluetooth_devices',
        description: 'Start or stop a Bluetooth scan for nearby devices on the Google Home device',
        inputSchema: {
          type: 'object',
          properties: {
            enable: {
              type: 'boolean',
              description: 'True to start scanning, false to stop scanning',
            },
            clear_results: {
              type: 'boolean',
              description: 'Clear previous scan results before starting (default: false)',
            },
            timeout: {
              type: 'number',
              description: 'Scan timeout in seconds (default: 60)',
            },
          },
          required: ['enable'],
        },
      },
      {
        name: 'get_bluetooth_scan_results',
        description: 'Get the results of the most recent Bluetooth device scan',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'pair_bluetooth_device',
        description: 'Connect to or disconnect from a Bluetooth speaker or device by MAC address',
        inputSchema: {
          type: 'object',
          properties: {
            mac_address: {
              type: 'string',
              description: 'MAC address of the Bluetooth device (e.g. "54:13:79:49:19:22")',
            },
            connect: {
              type: 'boolean',
              description: 'True to connect, false to disconnect',
            },
            profile: {
              type: 'number',
              description: 'Bluetooth profile number (default: 2 for A2DP audio)',
            },
          },
          required: ['mac_address', 'connect'],
        },
      },
      {
        name: 'forget_bluetooth_device',
        description: 'Remove (forget/unbond) a previously paired Bluetooth device from the Google Home device',
        inputSchema: {
          type: 'object',
          properties: {
            mac_address: {
              type: 'string',
              description: 'MAC address of the Bluetooth device to forget',
            },
          },
          required: ['mac_address'],
        },
      },
      {
        name: 'set_bluetooth_discoverability',
        description: 'Enable or disable Bluetooth discoverability on the Google Home device',
        inputSchema: {
          type: 'object',
          properties: {
            enable_discovery: {
              type: 'boolean',
              description: 'True to make the device discoverable, false to hide it',
            },
          },
          required: ['enable_discovery'],
        },
      },
      {
        name: 'get_saved_wifi_networks',
        description: 'Get a list of Wi-Fi networks saved on the Google Home device',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'scan_wifi_networks',
        description: 'Initiate a scan for available Wi-Fi networks near the Google Home device',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_wifi_scan_results',
        description: 'Get the results of the most recent Wi-Fi network scan',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'connect_wifi_network',
        description: 'Connect the Google Home device to a Wi-Fi network using BSSID and encrypted password',
        inputSchema: {
          type: 'object',
          properties: {
            bssid: {
              type: 'string',
              description: 'BSSID (MAC address) of the Wi-Fi access point to connect to',
            },
            enc_passwd: {
              type: 'string',
              description: 'Encrypted Wi-Fi password (base64-encoded, encrypted per Google Home protocol)',
            },
            signal_level: {
              type: 'number',
              description: 'Signal level of the network in dBm (optional, from scan results)',
            },
          },
          required: ['bssid', 'enc_passwd'],
        },
      },
      {
        name: 'forget_wifi_network',
        description: 'Remove a saved Wi-Fi network from the Google Home device by WPA ID',
        inputSchema: {
          type: 'object',
          properties: {
            wpa_id: {
              type: 'number',
              description: 'WPA network ID to forget (obtain from get_saved_wifi_networks)',
            },
          },
          required: ['wpa_id'],
        },
      },
      {
        name: 'set_do_not_disturb',
        description: 'Enable or disable Do Not Disturb (suppress notifications) on the Google Home device',
        inputSchema: {
          type: 'object',
          properties: {
            enable_notifications: {
              type: 'boolean',
              description: 'True to enable notifications (disable DND), false to suppress them (enable DND)',
            },
          },
          required: ['enable_notifications'],
        },
      },
      {
        name: 'set_night_mode',
        description: 'Configure night mode settings: schedule, LED brightness, do-not-disturb, and volume on the Google Home device',
        inputSchema: {
          type: 'object',
          properties: {
            enabled: {
              type: 'boolean',
              description: 'Enable or disable night mode (default: false)',
            },
            do_not_disturb: {
              type: 'boolean',
              description: 'Enable Do Not Disturb during night mode hours (default: false)',
            },
            led_brightness: {
              type: 'number',
              description: 'LED brightness during night mode as a float 0.0–1.0 (default: 0.0 = off)',
            },
            start_hour: {
              type: 'number',
              description: 'Night mode start hour in 24-hour format (0–23)',
            },
            end_hour: {
              type: 'number',
              description: 'Night mode end hour in 24-hour format (0–23)',
            },
          },
        },
      },
      {
        name: 'set_equalizer',
        description: 'Set equalizer high-shelf and low-shelf gain values on the Google Home device',
        inputSchema: {
          type: 'object',
          properties: {
            high_shelf_gain_db: {
              type: 'number',
              description: 'High-shelf equalizer gain in dB (e.g. -6 to +6)',
            },
            low_shelf_gain_db: {
              type: 'number',
              description: 'Low-shelf equalizer gain in dB (e.g. -6 to +6)',
            },
          },
        },
      },
      {
        name: 'check_ready_status',
        description: 'Check if the Google Home device is ready to play audio, optionally playing a ready message',
        inputSchema: {
          type: 'object',
          properties: {
            play_ready_message: {
              type: 'boolean',
              description: 'Play an audio ready message on the device (default: false)',
            },
            user_id: {
              type: 'string',
              description: 'User ID to associate with the ready check',
            },
          },
        },
      },
      {
        name: 'test_download_speed',
        description: 'Run an internet download speed test on the Google Home device using a test file URL',
        inputSchema: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              description: 'URL of the test file to download for speed measurement (default: Google reliability test)',
            },
          },
        },
      },
      {
        name: 'reboot_device',
        description: 'Reboot or factory reset the Google Home device — use with caution',
        inputSchema: {
          type: 'object',
          properties: {
            params: {
              type: 'string',
              description: 'Reboot mode: "now" to reboot immediately, "factory_reset" to wipe and reset (default: "now")',
            },
          },
        },
      },
      {
        name: 'get_supported_locales',
        description: 'Get the list of locales (languages) supported by the Google Home device',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_supported_timezones',
        description: 'Get the list of timezones supported by the Google Home device',
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
        case 'get_device_info':
          return this.getDeviceInfo(args);
        case 'set_device_info':
          return this.setDeviceInfo(args);
        case 'get_alarms_and_timers':
          return this.getAlarmsAndTimers();
        case 'delete_alarms_and_timers':
          return this.deleteAlarmsAndTimers(args);
        case 'set_alarm_volume':
          return this.setAlarmVolume(args);
        case 'get_bluetooth_status':
          return this.getBluetoothStatus();
        case 'get_paired_bluetooth_devices':
          return this.getPairedBluetoothDevices();
        case 'scan_bluetooth_devices':
          return this.scanBluetoothDevices(args);
        case 'get_bluetooth_scan_results':
          return this.getBluetoothScanResults();
        case 'pair_bluetooth_device':
          return this.pairBluetoothDevice(args);
        case 'forget_bluetooth_device':
          return this.forgetBluetoothDevice(args);
        case 'set_bluetooth_discoverability':
          return this.setBluetoothDiscoverability(args);
        case 'get_saved_wifi_networks':
          return this.getSavedWifiNetworks();
        case 'scan_wifi_networks':
          return this.scanWifiNetworks();
        case 'get_wifi_scan_results':
          return this.getWifiScanResults();
        case 'connect_wifi_network':
          return this.connectWifiNetwork(args);
        case 'forget_wifi_network':
          return this.forgetWifiNetwork(args);
        case 'set_do_not_disturb':
          return this.setDoNotDisturb(args);
        case 'set_night_mode':
          return this.setNightMode(args);
        case 'set_equalizer':
          return this.setEqualizer(args);
        case 'check_ready_status':
          return this.checkReadyStatus(args);
        case 'test_download_speed':
          return this.testDownloadSpeed(args);
        case 'reboot_device':
          return this.rebootDevice(args);
        case 'get_supported_locales':
          return this.getSupportedLocales();
        case 'get_supported_timezones':
          return this.getSupportedTimezones();
        default:
          return {
            content: [{ type: 'text', text: `Unknown tool: ${name}` }],
            isError: true,
          };
      }
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Tool execution failed: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      };
    }
  }

  private buildHeaders(includeContentType = false): Record<string, string> {
    const headers: Record<string, string> = {
      'cast-local-authorization-token': this.localAuthToken,
    };
    if (includeContentType) {
      headers['content-type'] = 'application/json';
    }
    return headers;
  }

  private async getRequest(path: string, params: Record<string, string> = {}): Promise<ToolResult> {
    const qs = new URLSearchParams(params);
    const url = `${this.baseUrl}${path}${qs.toString() ? '?' + qs.toString() : ''}`;
    const response = await this.fetchWithRetry(url, {
      method: 'GET',
      headers: this.buildHeaders(),
    });
    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }
    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new Error(`Google Home returned non-JSON (HTTP ${response.status})`);
    }
    return {
      content: [{ type: 'text', text: this.truncate(data) }],
      isError: false,
    };
  }

  private async postRequest(path: string, body: Record<string, unknown>): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.buildHeaders(true),
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }
    let data: unknown;
    try {
      const text = await response.text();
      data = text ? JSON.parse(text) : { success: true };
    } catch {
      throw new Error(`Google Home returned non-JSON (HTTP ${response.status})`);
    }
    return {
      content: [{ type: 'text', text: this.truncate(data) }],
      isError: false,
    };
  }

  private async getDeviceInfo(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string> = {
      params: (args.params as string) ?? 'name,build_info,settings,device_info,net,wifi',
      options: (args.options as string) ?? '48',
      nonce: String(Math.floor(Math.random() * 1e9)),
    };
    return this.getRequest('/eureka_info', params);
  }

  private async setDeviceInfo(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {};
    if (args.name !== undefined) body.name = args.name;
    if (args.opt_in_opencast !== undefined || args.opt_in_preview_channel !== undefined) {
      const opt_in: Record<string, unknown> = {};
      if (args.opt_in_opencast !== undefined) opt_in.opencast = args.opt_in_opencast;
      if (args.opt_in_preview_channel !== undefined) opt_in.preview_channel = args.opt_in_preview_channel;
      body.opt_in = opt_in;
    }
    return this.postRequest('/set_eureka_info', body);
  }

  private async getAlarmsAndTimers(): Promise<ToolResult> {
    return this.getRequest('/assistant/alarms');
  }

  private async deleteAlarmsAndTimers(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.ids || !Array.isArray(args.ids)) {
      return { content: [{ type: 'text', text: 'ids array is required' }], isError: true };
    }
    return this.postRequest('/assistant/alarms/delete', { ids: args.ids });
  }

  private async setAlarmVolume(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.volume === undefined) {
      return { content: [{ type: 'text', text: 'volume is required' }], isError: true };
    }
    return this.postRequest('/assistant/alarms/volume', { volume: args.volume as number });
  }

  private async getBluetoothStatus(): Promise<ToolResult> {
    return this.getRequest('/bluetooth/status');
  }

  private async getPairedBluetoothDevices(): Promise<ToolResult> {
    return this.getRequest('/bluetooth/get_bonded');
  }

  private async scanBluetoothDevices(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.enable === undefined) {
      return { content: [{ type: 'text', text: 'enable is required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      enable: args.enable as boolean,
      clear_results: (args.clear_results as boolean) ?? false,
      timeout: (args.timeout as number) ?? 60,
    };
    return this.postRequest('/bluetooth/scan', body);
  }

  private async getBluetoothScanResults(): Promise<ToolResult> {
    return this.getRequest('/bluetooth/scan_results');
  }

  private async pairBluetoothDevice(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.mac_address) {
      return { content: [{ type: 'text', text: 'mac_address is required' }], isError: true };
    }
    if (args.connect === undefined) {
      return { content: [{ type: 'text', text: 'connect is required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      mac_address: args.mac_address as string,
      connect: args.connect as boolean,
      profile: (args.profile as number) ?? 2,
    };
    return this.postRequest('/bluetooth/connect', body);
  }

  private async forgetBluetoothDevice(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.mac_address) {
      return { content: [{ type: 'text', text: 'mac_address is required' }], isError: true };
    }
    return this.postRequest('/bluetooth/bond', { bond: false, mac_address: args.mac_address as string });
  }

  private async setBluetoothDiscoverability(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.enable_discovery === undefined) {
      return { content: [{ type: 'text', text: 'enable_discovery is required' }], isError: true };
    }
    return this.postRequest('/bluetooth/discovery', { enable_discovery: args.enable_discovery as boolean });
  }

  private async getSavedWifiNetworks(): Promise<ToolResult> {
    return this.getRequest('/configured_networks');
  }

  private async scanWifiNetworks(): Promise<ToolResult> {
    return this.postRequest('/scan_wifi', {});
  }

  private async getWifiScanResults(): Promise<ToolResult> {
    return this.getRequest('/scan_results');
  }

  private async connectWifiNetwork(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.bssid) return { content: [{ type: 'text', text: 'bssid is required' }], isError: true };
    if (!args.enc_passwd) return { content: [{ type: 'text', text: 'enc_passwd is required' }], isError: true };
    const body: Record<string, unknown> = {
      bssid: args.bssid as string,
      enc_passwd: args.enc_passwd as string,
    };
    if (args.signal_level !== undefined) body.signal_level = args.signal_level as number;
    return this.postRequest('/connect_wifi', body);
  }

  private async forgetWifiNetwork(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.wpa_id === undefined) {
      return { content: [{ type: 'text', text: 'wpa_id is required' }], isError: true };
    }
    return this.postRequest('/forget_wifi', { wpa_id: args.wpa_id as number });
  }

  private async setDoNotDisturb(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.enable_notifications === undefined) {
      return { content: [{ type: 'text', text: 'enable_notifications is required' }], isError: true };
    }
    return this.postRequest('/assistant/notifications', {
      notifications_enabled: args.enable_notifications as boolean,
    });
  }

  private async setNightMode(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {};
    if (args.enabled !== undefined) body.enabled = args.enabled;
    if (args.do_not_disturb !== undefined) body.do_not_disturb = args.do_not_disturb;
    if (args.led_brightness !== undefined) body.led_brightness = args.led_brightness;
    if (args.start_hour !== undefined || args.end_hour !== undefined) {
      body.windows = [{
        start_hour: (args.start_hour as number) ?? 22,
        end_hour: (args.end_hour as number) ?? 7,
      }];
    }
    return this.postRequest('/assistant/set_night_mode_params', body);
  }

  private async setEqualizer(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      high_shelf: { gain_db: (args.high_shelf_gain_db as number) ?? 0 },
      low_shelf: { gain_db: (args.low_shelf_gain_db as number) ?? 0 },
    };
    return this.postRequest('/user_eq/set_equalizer', body);
  }

  private async checkReadyStatus(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      play_ready_message: (args.play_ready_message as boolean) ?? false,
    };
    if (args.user_id) body.user_id = args.user_id as string;
    return this.postRequest('/assistant/check_ready_status', body);
  }

  private async testDownloadSpeed(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      url: (args.url as string) ?? 'https://storage.googleapis.com/reliability-speedtest/random.txt',
    };
    return this.postRequest('/test_internet_download_speed', body);
  }

  private async rebootDevice(args: Record<string, unknown>): Promise<ToolResult> {
    return this.postRequest('/reboot', { params: (args.params as string) ?? 'now' });
  }

  private async getSupportedLocales(): Promise<ToolResult> {
    return this.getRequest('/supported_locales');
  }

  private async getSupportedTimezones(): Promise<ToolResult> {
    return this.getRequest('/supported_timezones');
  }
}
