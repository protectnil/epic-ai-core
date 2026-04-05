/**
 * Open Policy Agent (OPA) MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: No official OPA MCP server exists.
// Our adapter covers: 9 tools across policy management, data documents, ad-hoc queries, and health.
// Base URL: http://openpolicy.local (configurable — typically http://localhost:8181 in practice)
// Auth: None (OPA is typically deployed inside a trusted network; auth can be added via reverse proxy)
// Docs: https://www.openpolicyagent.org/docs/latest/rest-api/
// Spec: https://api.apis.guru/v2/specs/openpolicy.local/0.28.0/openapi.json

import { ToolDefinition, ToolResult } from "./types.js";
import { MCPAdapterBase } from "./base.js";

interface OpenPolicyConfig {
  /** Base URL of the OPA server (default: http://localhost:8181) */
  baseUrl?: string;
  /** Optional Bearer token if OPA is behind an auth proxy */
  bearerToken?: string;
}

export class OpenPolicyMCPServer extends MCPAdapterBase {
  private readonly baseUrl: string;
  private readonly bearerToken: string | undefined;

  constructor(config: OpenPolicyConfig = {}) {
    super();
    this.baseUrl = config.baseUrl ?? "http://localhost:8181";
    this.bearerToken = config.bearerToken;
  }

  static catalog() {
    return {
      name: "openpolicy",
      displayName: "Open Policy Agent (OPA)",
      version: "0.28.0",
      category: "compliance",
      keywords: [
        "opa", "open policy agent", "policy", "compliance", "authorization",
        "access control", "rego", "rbac", "abac", "policy-as-code",
        "cloud native", "kubernetes", "governance", "enforcement",
      ],
      toolNames: [
        "get_health",
        "list_policies",
        "get_policy",
        "put_policy",
        "delete_policy",
        "get_document",
        "put_document",
        "delete_document",
        "execute_query",
      ],
      description: "Open Policy Agent REST API — manage Rego policy modules, evaluate data documents, run ad-hoc queries, and check server health.",
      author: "protectnil",
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: "get_health",
        description: "Check the health of the OPA server — optionally verify that all configured bundles and plugins are activated",
        inputSchema: {
          type: "object",
          properties: {
            bundles: {
              type: "boolean",
              description: "If true, include bundle activation status in health check (returns 500 if any bundle is not activated)",
            },
            plugins: {
              type: "boolean",
              description: "If true, include plugin status in health check (returns 500 if any plugin is not OK)",
            },
          },
        },
      },
      {
        name: "list_policies",
        description: "List all Rego policy modules currently loaded in OPA",
        inputSchema: {
          type: "object",
          properties: {
            pretty: {
              type: "boolean",
              description: "Format JSON response with indentation for readability",
            },
          },
        },
      },
      {
        name: "get_policy",
        description: "Retrieve a specific Rego policy module by its ID",
        inputSchema: {
          type: "object",
          properties: {
            id: {
              type: "string",
              description: "The policy module ID (e.g. \"example/rbac\")",
            },
            pretty: {
              type: "boolean",
              description: "Format JSON response with indentation",
            },
          },
          required: ["id"],
        },
      },
      {
        name: "put_policy",
        description: "Create or update a Rego policy module — provide the raw Rego source text",
        inputSchema: {
          type: "object",
          properties: {
            id: {
              type: "string",
              description: "The policy module ID to create or replace (e.g. \"example/rbac\")",
            },
            rego_source: {
              type: "string",
              description: "Raw Rego policy source code (e.g. \"package example\\ndefault allow = false\")",
            },
            metrics: {
              type: "boolean",
              description: "Include compilation performance metrics in response",
            },
          },
          required: ["id", "rego_source"],
        },
      },
      {
        name: "delete_policy",
        description: "Delete a Rego policy module by its ID",
        inputSchema: {
          type: "object",
          properties: {
            id: {
              type: "string",
              description: "The policy module ID to delete",
            },
          },
          required: ["id"],
        },
      },
      {
        name: "get_document",
        description: "Get a data document or evaluate a policy rule at a given path — optionally provide input for rule evaluation",
        inputSchema: {
          type: "object",
          properties: {
            path: {
              type: "string",
              description: "Document or policy path using slash-separated segments (e.g. \"myapp/allow\" or \"users/alice\")",
            },
            input: {
              type: "string",
              description: "JSON-encoded input document for rule evaluation (e.g. \"{\\\"user\\\":\\\"alice\\\",\\\"action\\\":\\\"read\\\"}\")",
            },
            pretty: {
              type: "boolean",
              description: "Format JSON response with indentation",
            },
            provenance: {
              type: "boolean",
              description: "Include provenance information (build version, bundles) in response",
            },
            metrics: {
              type: "boolean",
              description: "Include evaluation performance metrics in response",
            },
          },
          required: ["path"],
        },
      },
      {
        name: "put_document",
        description: "Create or overwrite a data document at a given path",
        inputSchema: {
          type: "object",
          properties: {
            path: {
              type: "string",
              description: "Data document path using slash-separated segments (e.g. \"users\" or \"config/roles\")",
            },
            document: {
              type: "string",
              description: "JSON-encoded document to store (e.g. \"{\\\"alice\\\":{\\\"role\\\":\\\"admin\\\"}}\")",
            },
          },
          required: ["path", "document"],
        },
      },
      {
        name: "delete_document",
        description: "Delete a data document at a given path",
        inputSchema: {
          type: "object",
          properties: {
            path: {
              type: "string",
              description: "Data document path to delete (e.g. \"users/alice\")",
            },
          },
          required: ["path"],
        },
      },
      {
        name: "execute_query",
        description: "Execute an ad-hoc Rego query against OPA — use for one-off evaluations without loading a named policy module",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Rego query string (e.g. \"data.example.allow == true\")",
            },
            input: {
              type: "object",
              description: "Input document for the query as a JSON object",
            },
            pretty: {
              type: "boolean",
              description: "Format JSON response with indentation",
            },
            metrics: {
              type: "boolean",
              description: "Include evaluation performance metrics in response",
            },
          },
          required: ["query"],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case "get_health":      return this.getHealth(args);
        case "list_policies":   return this.listPolicies(args);
        case "get_policy":      return this.getPolicy(args);
        case "put_policy":      return this.putPolicy(args);
        case "delete_policy":   return this.deletePolicy(args);
        case "get_document":    return this.getDocument(args);
        case "put_document":    return this.putDocument(args);
        case "delete_document": return this.deleteDocument(args);
        case "execute_query":   return this.executeQuery(args);
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

  private buildHeaders(extra: Record<string, string> = {}): Record<string, string> {
    const headers: Record<string, string> = { "Content-Type": "application/json", ...extra };
    if (this.bearerToken) headers["Authorization"] = `Bearer ${this.bearerToken}`;
    return headers;
  }

  private buildQs(params: Record<string, string | undefined>): string {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) qs.set(k, v);
    }
    const s = qs.toString();
    return s ? `?${s}` : "";
  }

  private async doFetch(
    method: string,
    path: string,
    qs: string = "",
    body?: unknown,
    contentType?: string,
  ): Promise<ToolResult> {
    const url = `${this.baseUrl}${path}${qs}`;
    const headers = this.buildHeaders();
    if (contentType) headers["Content-Type"] = contentType;
    const init: RequestInit = { method, headers };
    if (body !== undefined) {
      init.body = typeof body === "string" ? body : JSON.stringify(body);
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
      try { data = await response.json(); } catch { throw new Error(`OPA returned non-JSON (HTTP ${response.status})`); }
    } else {
      data = await response.text();
    }
    return { content: [{ type: "text", text: this.truncate(data) }], isError: false };
  }

  private async getHealth(args: Record<string, unknown>): Promise<ToolResult> {
    const qs = this.buildQs({
      bundles: args.bundles ? "true" : undefined,
      plugins: args.plugins ? "true" : undefined,
    });
    return this.doFetch("GET", "/health", qs);
  }

  private async listPolicies(args: Record<string, unknown>): Promise<ToolResult> {
    const qs = this.buildQs({ pretty: args.pretty ? "true" : undefined });
    return this.doFetch("GET", "/v1/policies", qs);
  }

  private async getPolicy(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: "text", text: "id is required" }], isError: true };
    const qs = this.buildQs({ pretty: args.pretty ? "true" : undefined });
    return this.doFetch("GET", `/v1/policies/${encodeURIComponent(args.id as string)}`, qs);
  }

  private async putPolicy(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: "text", text: "id is required" }], isError: true };
    if (!args.rego_source) return { content: [{ type: "text", text: "rego_source is required" }], isError: true };
    const qs = this.buildQs({ metrics: args.metrics ? "true" : undefined });
    return this.doFetch(
      "PUT",
      `/v1/policies/${encodeURIComponent(args.id as string)}`,
      qs,
      args.rego_source as string,
      "text/plain",
    );
  }

  private async deletePolicy(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: "text", text: "id is required" }], isError: true };
    return this.doFetch("DELETE", `/v1/policies/${encodeURIComponent(args.id as string)}`);
  }

  private async getDocument(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.path) return { content: [{ type: "text", text: "path is required" }], isError: true };
    const qs = this.buildQs({
      input:      args.input as string | undefined,
      pretty:     args.pretty ? "true" : undefined,
      provenance: args.provenance ? "true" : undefined,
      metrics:    args.metrics ? "true" : undefined,
    });
    const safePath = (args.path as string).replace(/^\//, "");
    return this.doFetch("GET", `/v1/data/${safePath}`, qs);
  }

  private async putDocument(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.path)     return { content: [{ type: "text", text: "path is required" }],     isError: true };
    if (!args.document) return { content: [{ type: "text", text: "document is required" }], isError: true };
    let parsedDoc: unknown;
    try {
      parsedDoc = typeof args.document === "string" ? JSON.parse(args.document) : args.document;
    } catch {
      return { content: [{ type: "text", text: "document must be valid JSON" }], isError: true };
    }
    const safePath = (args.path as string).replace(/^\//, "");
    return this.doFetch("PUT", `/v1/data/${safePath}`, "", parsedDoc);
  }

  private async deleteDocument(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.path) return { content: [{ type: "text", text: "path is required" }], isError: true };
    const safePath = (args.path as string).replace(/^\//, "");
    return this.doFetch("DELETE", `/v1/data/${safePath}`);
  }

  private async executeQuery(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.query) return { content: [{ type: "text", text: "query is required" }], isError: true };
    const qs = this.buildQs({
      pretty:  args.pretty ? "true" : undefined,
      metrics: args.metrics ? "true" : undefined,
    });
    const body: Record<string, unknown> = { query: args.query };
    if (args.input !== undefined) body.input = args.input;
    return this.doFetch("POST", "/v1/query", qs, body);
  }
}
