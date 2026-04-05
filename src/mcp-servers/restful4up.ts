/**
 * RESTful4Up MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: No official vendor MCP server found for RESTful4Up.
// RESTful4Up is a RESTful API wrapper around the Unipacker malware unpacking tool.
// Source: https://github.com/rpgeeganage/restful4up
// Our adapter covers: 5 tools (unpack, emulation output, YARA rule generation, YARA rule application, cleanup).
// Recommendation: Use this adapter for all RESTful4Up operations.
//
// Base URL: configurable (default: http://restful4up.local)
// Auth: None required — typically deployed on-premises or in a private network
// Docs: https://raw.githubusercontent.com/rpgeeganage/restful4up/master/app/spec/api.yml
// Rate limits: Self-hosted; no imposed limits.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface Restful4UpConfig {
  /** Base URL of the RESTful4Up instance (default: http://restful4up.local) */
  baseUrl?: string;
}

export class Restful4UpMCPServer extends MCPAdapterBase {
  private readonly baseUrl: string;

  constructor(config: Restful4UpConfig = {}) {
    super();
    this.baseUrl = config.baseUrl ?? 'http://restful4up.local';
  }

  static catalog() {
    return {
      name: 'restful4up',
      displayName: 'RESTful4Up',
      version: '1.0.0',
      category: 'media',
      keywords: [
        'restful4up', 'unipacker', 'unpack', 'malware', 'packer', 'yara', 'yara-rules',
        'emulation', 'binary', 'executable', 'reverse-engineering', 'security', 'analysis',
      ],
      toolNames: [
        'unpack_file',
        'get_emulation_output',
        'generate_partial_yara_rules',
        'apply_yara_rules',
        'clean_uploaded_files',
      ],
      description: 'RESTful4Up wraps the Unipacker tool as a REST API for unpacking packed/obfuscated malware executables, generating YARA rules, and applying YARA rules to binary files.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'unpack_file',
        description: 'Unpack a packed or obfuscated executable using Unipacker — returns the unpacked binary as base64-encoded data',
        inputSchema: {
          type: 'object',
          properties: {
            file_base64: {
              type: 'string',
              description: 'Base64-encoded binary content of the executable to unpack',
            },
            filename: {
              type: 'string',
              description: 'Original filename of the executable (used as the multipart filename)',
            },
          },
          required: ['file_base64', 'filename'],
        },
      },
      {
        name: 'get_emulation_output',
        description: 'Unpack a file and return the emulation output — lines of text produced during the Unipacker emulation run',
        inputSchema: {
          type: 'object',
          properties: {
            file_base64: {
              type: 'string',
              description: 'Base64-encoded binary content of the executable to emulate',
            },
            filename: {
              type: 'string',
              description: 'Original filename of the executable',
            },
          },
          required: ['file_base64', 'filename'],
        },
      },
      {
        name: 'generate_partial_yara_rules',
        description: 'Generate partial YARA rules (without condition section) for a given executable — useful as a starting point for writing detection signatures',
        inputSchema: {
          type: 'object',
          properties: {
            file_base64: {
              type: 'string',
              description: 'Base64-encoded binary content of the executable',
            },
            filename: {
              type: 'string',
              description: 'Original filename of the executable',
            },
            is_unpacking_required: {
              type: 'string',
              description: 'Whether to unpack the file before generating rules: "true" or "false" (default: "false")',
              enum: ['true', 'false'],
            },
            minimum_string_length: {
              type: 'string',
              description: 'Minimum string length to include in generated YARA strings section (e.g. "4")',
            },
            strings_to_ignore: {
              type: 'array',
              description: 'Array of strings to exclude from the generated YARA rule (up to 1000)',
              items: { type: 'string' },
            },
          },
          required: ['file_base64', 'filename'],
        },
      },
      {
        name: 'apply_yara_rules',
        description: 'Apply up to 10 YARA rules (as base64-encoded strings) to a given executable and return which rules matched',
        inputSchema: {
          type: 'object',
          properties: {
            file_base64: {
              type: 'string',
              description: 'Base64-encoded binary content of the executable to scan',
            },
            filename: {
              type: 'string',
              description: 'Original filename of the executable',
            },
            rules: {
              type: 'array',
              description: 'Array of YARA rules as base64-encoded strings (1–10 rules)',
              items: { type: 'string' },
            },
            is_unpacking_required: {
              type: 'string',
              description: 'Whether to unpack the file before applying rules: "true" or "false" (default: "false")',
              enum: ['true', 'false'],
            },
          },
          required: ['file_base64', 'filename', 'rules'],
        },
      },
      {
        name: 'clean_uploaded_files',
        description: 'Clean up all temporarily uploaded files on the RESTful4Up server — call after processing is complete to free disk space',
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
        case 'unpack_file':
          return this.unpackFile(args);
        case 'get_emulation_output':
          return this.getEmulationOutput(args);
        case 'generate_partial_yara_rules':
          return this.generatePartialYaraRules(args);
        case 'apply_yara_rules':
          return this.applyYaraRules(args);
        case 'clean_uploaded_files':
          return this.cleanUploadedFiles();
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

  private buildFormData(args: Record<string, unknown>): FormData {
    const form = new FormData();
    const fileBase64 = args.file_base64 as string;
    const filename = (args.filename as string) ?? 'file.bin';
    const bytes = Buffer.from(fileBase64, 'base64');
    const blob = new Blob([bytes], { type: 'application/octet-stream' });
    form.append('file', blob, filename);
    return form;
  }

  private async unpackFile(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.file_base64) return { content: [{ type: 'text', text: 'file_base64 is required' }], isError: true };
    if (!args.filename) return { content: [{ type: 'text', text: 'filename is required' }], isError: true };
    const form = this.buildFormData(args);
    const response = await this.fetchWithRetry(`${this.baseUrl}/unpack`, { method: 'POST', body: form });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error: ${response.status} ${errText}` }], isError: true };
    }
    const buffer = await response.arrayBuffer();
    const b64 = Buffer.from(buffer).toString('base64');
    return { content: [{ type: 'text', text: this.truncate(`Unpacked binary (base64): ${b64}`) }], isError: false };
  }

  private async getEmulationOutput(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.file_base64) return { content: [{ type: 'text', text: 'file_base64 is required' }], isError: true };
    if (!args.filename) return { content: [{ type: 'text', text: 'filename is required' }], isError: true };
    const form = this.buildFormData(args);
    const response = await this.fetchWithRetry(`${this.baseUrl}/emulation-output`, { method: 'POST', body: form });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error: ${response.status} ${errText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error('RESTful4Up returned non-JSON'); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async generatePartialYaraRules(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.file_base64) return { content: [{ type: 'text', text: 'file_base64 is required' }], isError: true };
    if (!args.filename) return { content: [{ type: 'text', text: 'filename is required' }], isError: true };
    const form = this.buildFormData(args);
    if (args.is_unpacking_required) form.append('is_unpacking_required', args.is_unpacking_required as string);
    if (args.minimum_string_length) form.append('minimum_string_length', args.minimum_string_length as string);
    if (Array.isArray(args.strings_to_ignore)) {
      for (const s of args.strings_to_ignore as string[]) {
        form.append('strings_to_ignore', s);
      }
    }
    const response = await this.fetchWithRetry(`${this.baseUrl}/generate-partial-yara-rules`, { method: 'POST', body: form });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error: ${response.status} ${errText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error('RESTful4Up returned non-JSON'); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async applyYaraRules(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.file_base64) return { content: [{ type: 'text', text: 'file_base64 is required' }], isError: true };
    if (!args.filename) return { content: [{ type: 'text', text: 'filename is required' }], isError: true };
    if (!Array.isArray(args.rules) || (args.rules as unknown[]).length === 0) {
      return { content: [{ type: 'text', text: 'rules must be a non-empty array (1–10 base64-encoded YARA rules)' }], isError: true };
    }
    const rules = args.rules as string[];
    if (rules.length > 10) {
      return { content: [{ type: 'text', text: 'rules array must contain 10 or fewer items' }], isError: true };
    }
    const form = this.buildFormData(args);
    for (const rule of rules) {
      form.append('rules', rule);
    }
    if (args.is_unpacking_required) form.append('is_unpacking_required', args.is_unpacking_required as string);
    const response = await this.fetchWithRetry(`${this.baseUrl}/apply-yara-rules`, { method: 'POST', body: form });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error: ${response.status} ${errText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error('RESTful4Up returned non-JSON'); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async cleanUploadedFiles(): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}/clean`, { method: 'HEAD' });
    if (response.status === 204) {
      return { content: [{ type: 'text', text: 'Cleanup successful — all uploaded files removed.' }], isError: false };
    }
    const errText = await response.text().catch(() => response.statusText);
    return { content: [{ type: 'text', text: `API error: ${response.status} ${errText}` }], isError: true };
  }
}
