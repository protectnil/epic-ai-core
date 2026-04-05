/**
 * Firmalyzer IoTVAS MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03. No official Firmalyzer-published MCP server
//   exists on GitHub or npmjs.
//
// Base URL: https://iotvas-api.firmalyzer.com/api/v1
// Auth: API key in X-API-Key header
//   Obtain a key at https://iotvas-api.firmalyzer.com/portal/signup
// Docs: https://iotvas-api.firmalyzer.com/api/v1/docs
// Spec: https://api.apis.guru/v2/specs/firmalyzer.com/iotvas/1.0/openapi.json
// Rate limits: Not published. Recommended <=60 req/min for production.

import { ToolDefinition, ToolResult } from "./types.js";
import { MCPAdapterBase } from './base.js';

interface FirmalyzerIotvasConfig {
  apiKey: string;
  baseUrl?: string; // default: https://iotvas-api.firmalyzer.com/api/v1
}

export class FirmalyzerIotvasMCPServer extends MCPAdapterBase {
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(config: FirmalyzerIotvasConfig) {
    super();
    this.baseUrl = (config.baseUrl ?? "https://iotvas-api.firmalyzer.com/api/v1").replace(/\/$/, "");
    this.apiKey = config.apiKey;
  }

  static catalog() {
    return {
      name: "firmalyzer-iotvas",
      displayName: "Firmalyzer IoTVAS",
      version: "1.0.0",
      category: "iot" as const,
      keywords: [
        "iot", "firmware", "vulnerability", "cve", "security", "device detection",
        "risk analysis", "crypto keys", "certificates", "config audit", "firmalyzer",
      ],
      toolNames: [
        "detect_device",
        "get_firmware_accounts",
        "get_firmware_config_issues",
        "get_firmware_expired_certs",
        "get_firmware_private_keys",
        "get_firmware_risk",
        "get_firmware_weak_certs",
        "get_firmware_weak_keys",
      ],
      description:
        "Discover IoT/connected devices by network banners and analyze firmware risk: CVEs, default accounts, config issues, expired/weak certificates, and private crypto keys via the Firmalyzer IoTVAS API.",
      author: "protectnil",
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // -- Device Detection ---------------------------------------------------
      {
        name: "detect_device",
        description:
          "Detect IoT device maker, model, and firmware version using network service banners and MAC address captured by a port scanner or vulnerability assessment tool.",
        inputSchema: {
          type: "object",
          properties: {
            ftp_banner:      { type: "string", description: "FTP service banner string from the device" },
            http_response:   { type: "string", description: "HTTP response headers/body from the device" },
            https_response:  { type: "string", description: "HTTPS response headers/body from the device" },
            hostname:        { type: "string", description: "Device hostname if resolved" },
            nic_mac:         { type: "string", description: "MAC address of the device NIC, e.g. AA:BB:CC:DD:EE:FF" },
            snmp_sysdescr:   { type: "string", description: "SNMP sysDescr OID value from the device" },
            snmp_sysoid:     { type: "string", description: "SNMP sysObjectID OID value from the device" },
            telnet_banner:   { type: "string", description: "Telnet service banner string from the device" },
            upnp_response:   { type: "string", description: "UPnP discovery response from the device" },
          },
        },
      },
      // -- Firmware Analysis --------------------------------------------------
      {
        name: "get_firmware_accounts",
        description:
          "Retrieve default accounts and password hashes embedded in a device firmware image, identified by its SHA-256 hash.",
        inputSchema: {
          type: "object",
          properties: {
            firmware_hash: {
              type: "string",
              description: "SHA-256 hash of the device firmware, e.g. af88b1aaac0b222df8539f3ae1479b5c8eaeae41f1776b5dd2fa805cb33a1175",
            },
          },
          required: ["firmware_hash"],
        },
      },
      {
        name: "get_firmware_config_issues",
        description:
          "Get default OS configuration issues found in a device firmware, including insecure service settings and hardening gaps.",
        inputSchema: {
          type: "object",
          properties: {
            firmware_hash: {
              type: "string",
              description: "SHA-256 hash of the device firmware",
            },
          },
          required: ["firmware_hash"],
        },
      },
      {
        name: "get_firmware_expired_certs",
        description:
          "List expired digital certificates embedded in a device firmware that may indicate stale or unpatched security artifacts.",
        inputSchema: {
          type: "object",
          properties: {
            firmware_hash: {
              type: "string",
              description: "SHA-256 hash of the device firmware",
            },
          },
          required: ["firmware_hash"],
        },
      },
      {
        name: "get_firmware_private_keys",
        description:
          "Retrieve private cryptographic keys (RSA, EC, DSA) embedded in a device firmware -- a critical security finding indicating credential exposure.",
        inputSchema: {
          type: "object",
          properties: {
            firmware_hash: {
              type: "string",
              description: "SHA-256 hash of the device firmware",
            },
          },
          required: ["firmware_hash"],
        },
      },
      {
        name: "get_firmware_risk",
        description:
          "Get a real-time risk analysis of a device firmware including CVE count, severity scores, default credential exposure, and overall risk rating.",
        inputSchema: {
          type: "object",
          properties: {
            firmware_hash: {
              type: "string",
              description: "SHA-256 hash of the device firmware",
            },
          },
          required: ["firmware_hash"],
        },
      },
      {
        name: "get_firmware_weak_certs",
        description:
          "List certificates embedded in a device firmware that use weak fingerprinting algorithms (e.g. MD5, SHA-1) and should be replaced.",
        inputSchema: {
          type: "object",
          properties: {
            firmware_hash: {
              type: "string",
              description: "SHA-256 hash of the device firmware",
            },
          },
          required: ["firmware_hash"],
        },
      },
      {
        name: "get_firmware_weak_keys",
        description:
          "Retrieve cryptographic keys in a device firmware with insufficient key length (e.g. RSA-512, RSA-1024) that are considered weak.",
        inputSchema: {
          type: "object",
          properties: {
            firmware_hash: {
              type: "string",
              description: "SHA-256 hash of the device firmware",
            },
          },
          required: ["firmware_hash"],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case "detect_device":               return await this.detectDevice(args);
        case "get_firmware_accounts":       return await this.getFirmwareResource(args, "accounts");
        case "get_firmware_config_issues":  return await this.getFirmwareResource(args, "config-issues");
        case "get_firmware_expired_certs":  return await this.getFirmwareResource(args, "expired-certs");
        case "get_firmware_private_keys":   return await this.getFirmwareResource(args, "private-keys");
        case "get_firmware_risk":           return await this.getFirmwareResource(args, "risk");
        case "get_firmware_weak_certs":     return await this.getFirmwareResource(args, "weak-certs");
        case "get_firmware_weak_keys":      return await this.getFirmwareResource(args, "weak-keys");
        default:
          return { content: [{ type: "text", text: `Unknown tool: ${name}` }], isError: true };
      }
    } catch (error) {
      return {
        content: [{ type: "text", text: `Tool execution failed: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      };
    }
  }

  // -- Private helpers --------------------------------------------------------

  private buildHeaders(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "X-API-Key": this.apiKey,
    };
  }

  private async iotvasRequest(path: string, options: RequestInit = {}): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      ...options,
      headers: this.buildHeaders(),
    });

    if (!response.ok) {
      let detail = "";
      try { detail = await response.text(); } catch { /* ignore */ }
      return {
        content: [{ type: "text", text: `IoTVAS API error ${response.status} ${response.statusText}${detail ? ": " + detail.slice(0, 400) : ""}` }],
        isError: true,
      };
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      return { content: [{ type: "text", text: `IoTVAS returned non-JSON response (HTTP ${response.status})` }], isError: true };
    }

    const text = JSON.stringify(data, null, 2);
    const truncated = text.length > 10_000
      ? text.slice(0, 10_000) + `\n... [truncated, ${text.length} total chars]`
      : text;
    return { content: [{ type: "text", text: truncated }], isError: false };
  }

  // -- Device Detection -------------------------------------------------------

  private async detectDevice(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {};
    const fields = [
      "ftp_banner", "http_response", "https_response", "hostname",
      "nic_mac", "snmp_sysdescr", "snmp_sysoid", "telnet_banner", "upnp_response",
    ];
    for (const f of fields) {
      if (args[f] !== undefined) body[f] = args[f];
    }
    return this.iotvasRequest("/device/detect", { method: "POST", body: JSON.stringify(body) });
  }

  // -- Firmware Resources -----------------------------------------------------

  private async getFirmwareResource(args: Record<string, unknown>, resource: string): Promise<ToolResult> {
    const hash = encodeURIComponent(args.firmware_hash as string);
    return this.iotvasRequest(`/firmware/${hash}/${resource}`);
  }
}
