/**
 * OpenLink Smart Data Bot (OSDB) MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: No official OpenLink OSDB MCP server exists.
// Our adapter covers: 8 tools across service management, action discovery, action execution, and authentication.
// Base URL: https://osdb.openlinksw.com/osdb
// Auth: Session-based (login/logout endpoints); credentials passed via basic auth or token negotiated at login
// Docs: https://osdb.openlinksw.com/osdb
// Spec: https://api.apis.guru/v2/specs/openlinksw.com/osdb/1.0.0/openapi.json

import { ToolDefinition, ToolResult } from "./types.js";
import { MCPAdapterBase } from "./base.js";

interface OsdbConfig {
  /** Base URL of the OSDB server (default: https://osdb.openlinksw.com/osdb) */
  baseUrl?: string;
  /** Optional Bearer/session token obtained after login */
  bearerToken?: string;
}

export class OpenLinkOsdbMCPServer extends MCPAdapterBase {
  private readonly baseUrl: string;
  private readonly bearerToken: string | undefined;

  constructor(config: OsdbConfig = {}) {
    super();
    this.baseUrl = config.baseUrl ?? "https://osdb.openlinksw.com/osdb";
    this.bearerToken = config.bearerToken;
  }

  static catalog() {
    return {
      name: "openlinksw-osdb",
      displayName: "OpenLink Smart Data Bot (OSDB)",
      version: "1.0.0",
      category: "data",
      keywords: [
        "openlink", "osdb", "smart data bot", "linked data", "rdf", "sparql",
        "ldp", "semantic web", "knowledge graph", "virtuoso", "data integration",
        "openapi", "bot", "actions",
      ],
      toolNames: [
        "login",
        "logout",
        "list_services",
        "load_service",
        "describe_service",
        "unload_service",
        "list_actions",
        "describe_action",
        "get_action_help",
        "execute_action",
      ],
      description: "OpenLink Smart Data Bot REST API — manage smart data services, discover and execute actions on linked data sources (RDF, LDP, SPARQL), and authenticate sessions.",
      author: "protectnil",
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: "login",
        description: "Authenticate with the OSDB server and establish a session",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "logout",
        description: "Terminate the current OSDB session",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "list_services",
        description: "List all smart data services currently loaded in the OSDB instance",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "load_service",
        description: "Load a new smart data service from a remote service description URL",
        inputSchema: {
          type: "object",
          properties: {
            service_description_url: {
              type: "string",
              description: "URL of the resource containing the service description to load (e.g. an OpenAPI or service manifest URL)",
            },
            service_moniker: {
              type: "string",
              description: "Optional service ID to uniquely identify the service — required for anonymous services or to override the name in the service description",
            },
          },
          required: ["service_description_url"],
        },
      },
      {
        name: "describe_service",
        description: "Get a detailed description of a specific loaded smart data service",
        inputSchema: {
          type: "object",
          properties: {
            service_id: {
              type: "string",
              description: "The service ID to describe (obtain via list_services)",
            },
          },
          required: ["service_id"],
        },
      },
      {
        name: "unload_service",
        description: "Unload (remove) a smart data service from the OSDB instance",
        inputSchema: {
          type: "object",
          properties: {
            service_id: {
              type: "string",
              description: "The service ID to unload",
            },
          },
          required: ["service_id"],
        },
      },
      {
        name: "list_actions",
        description: "List all actions supported by a given smart data service",
        inputSchema: {
          type: "object",
          properties: {
            service_id: {
              type: "string",
              description: "The service ID for which to list available actions",
            },
          },
          required: ["service_id"],
        },
      },
      {
        name: "describe_action",
        description: "Get a detailed description of a specific action within a service, including entry points and parameters",
        inputSchema: {
          type: "object",
          properties: {
            service_id: {
              type: "string",
              description: "The service ID containing the action",
            },
            action_id: {
              type: "string",
              description: "The action ID to describe (e.g. \"read\", \"create\", \"update\", \"delete\")",
            },
          },
          required: ["service_id", "action_id"],
        },
      },
      {
        name: "get_action_help",
        description: "Get help text and usage documentation for a specific action within a service",
        inputSchema: {
          type: "object",
          properties: {
            service_id: {
              type: "string",
              description: "The service ID containing the action",
            },
            action_id: {
              type: "string",
              description: "The action ID for which to retrieve help",
            },
          },
          required: ["service_id", "action_id"],
        },
      },
      {
        name: "execute_action",
        description: "Execute a specific action on a smart data service — supports passing action-specific parameters, body data (raw or via URL), and output format preferences",
        inputSchema: {
          type: "object",
          properties: {
            service_id: {
              type: "string",
              description: "The service ID on which to execute the action",
            },
            action_id: {
              type: "string",
              description: "The action ID to execute",
            },
            action_params: {
              type: "object",
              description: "Action-specific parameters as key/value pairs (structure depends on the action — use describe_action to discover required params)",
            },
            body_data_src_url: {
              type: "string",
              description: "URL of a resource containing input data for the action (e.g. a CSV or RDF document URL)",
            },
            body_data_raw: {
              type: "string",
              description: "Base64-encoded raw input data for the action (alternative to body_data_src_url)",
            },
            body_data_encoding: {
              type: "string",
              description: "Media type of the data in body_data_raw or body_data_src_url before base64 encoding (e.g. \"text/csv\", \"text/turtle\")",
            },
            output_type: {
              type: "string",
              enum: ["url_only", "generate_rdf", "display_rdf"],
              description: "Controls action output type: url_only=return URL only, generate_rdf=convert output to RDF, display_rdf=display RDF output",
            },
            response_format: {
              type: "string",
              description: "Preferred response MIME type (e.g. \"application/ld+json\", \"text/turtle\", \"application/rdf+xml\")",
            },
          },
          required: ["service_id", "action_id"],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case "login":           return this.login();
        case "logout":          return this.logout();
        case "list_services":   return this.listServices();
        case "load_service":    return this.loadService(args);
        case "describe_service": return this.describeService(args);
        case "unload_service":  return this.unloadService(args);
        case "list_actions":    return this.listActions(args);
        case "describe_action": return this.describeAction(args);
        case "get_action_help": return this.getActionHelp(args);
        case "execute_action":  return this.executeAction(args);
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

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (this.bearerToken) headers["Authorization"] = `Bearer ${this.bearerToken}`;
    return headers;
  }

  private async doFetch(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<ToolResult> {
    const url = `${this.baseUrl}${path}`;
    const headers = this.buildHeaders();
    const init: RequestInit = { method, headers };
    if (body !== undefined) {
      init.body = JSON.stringify(body);
    }
    const response = await this.fetchWithRetry(url, init);
    if (response.status === 204) {
      return { content: [{ type: "text", text: "Success (no content)" }], isError: false };
    }
    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      return {
        content: [{ type: "text", text: `API error: ${response.status} ${response.statusText}${errText ? ` — ${errText.slice(0, 500)}` : ""}` }],
        isError: true,
      };
    }
    let data: unknown;
    const ct = response.headers.get("content-type") ?? "";
    if (ct.includes("json")) {
      try { data = await response.json(); } catch { throw new Error(`OSDB returned non-JSON (HTTP ${response.status})`); }
    } else {
      data = await response.text();
    }
    return { content: [{ type: "text", text: this.truncate(data) }], isError: false };
  }

  private async login(): Promise<ToolResult> {
    return this.doFetch("GET", "/api/v1/login");
  }

  private async logout(): Promise<ToolResult> {
    return this.doFetch("GET", "/api/v1/logout");
  }

  private async listServices(): Promise<ToolResult> {
    return this.doFetch("GET", "/api/v1/services");
  }

  private async loadService(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.service_description_url) {
      return { content: [{ type: "text", text: "service_description_url is required" }], isError: true };
    }
    const body: Record<string, unknown> = { service_description_url: args.service_description_url };
    if (args.service_moniker) body.service_moniker = args.service_moniker;
    return this.doFetch("POST", "/api/v1/services", body);
  }

  private async describeService(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.service_id) return { content: [{ type: "text", text: "service_id is required" }], isError: true };
    return this.doFetch("GET", `/api/v1/services/${encodeURIComponent(args.service_id as string)}`);
  }

  private async unloadService(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.service_id) return { content: [{ type: "text", text: "service_id is required" }], isError: true };
    return this.doFetch("DELETE", `/api/v1/services/${encodeURIComponent(args.service_id as string)}`);
  }

  private async listActions(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.service_id) return { content: [{ type: "text", text: "service_id is required" }], isError: true };
    return this.doFetch("GET", `/api/v1/actions/${encodeURIComponent(args.service_id as string)}`);
  }

  private async describeAction(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.service_id) return { content: [{ type: "text", text: "service_id is required" }], isError: true };
    if (!args.action_id)  return { content: [{ type: "text", text: "action_id is required" }],  isError: true };
    return this.doFetch(
      "GET",
      `/api/v1/actions/${encodeURIComponent(args.service_id as string)}/${encodeURIComponent(args.action_id as string)}`,
    );
  }

  private async getActionHelp(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.service_id) return { content: [{ type: "text", text: "service_id is required" }], isError: true };
    if (!args.action_id)  return { content: [{ type: "text", text: "action_id is required" }],  isError: true };
    return this.doFetch(
      "GET",
      `/api/v1/actions/${encodeURIComponent(args.service_id as string)}/${encodeURIComponent(args.action_id as string)}/help`,
    );
  }

  private async executeAction(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.service_id) return { content: [{ type: "text", text: "service_id is required" }], isError: true };
    if (!args.action_id)  return { content: [{ type: "text", text: "action_id is required" }],  isError: true };
    const body: Record<string, unknown> = {};
    if (args.action_params && typeof args.action_params === "object") {
      Object.assign(body, args.action_params);
    }
    if (args.body_data_src_url)  body["osdb:body_data_src_url"]  = args.body_data_src_url;
    if (args.body_data_raw)      body["osdb:body_data_raw"]      = args.body_data_raw;
    if (args.body_data_encoding) body["osdb:body_data_encoding"] = args.body_data_encoding;
    if (args.output_type)        body["osdb:output_type"]        = args.output_type;
    if (args.response_format)    body["osdb:response_format"]    = args.response_format;
    return this.doFetch(
      "POST",
      `/api/v1/actions/${encodeURIComponent(args.service_id as string)}/${encodeURIComponent(args.action_id as string)}/exec`,
      body,
    );
  }
}
