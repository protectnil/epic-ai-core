/**
 * Pandorabots MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Spec: https://api.apis.guru/v2/specs/pandorabots.com/1.0.0/swagger.json
// Base URL: https://aiaas.pandorabots.com
// Auth: user_key query parameter
// Docs: https://developer.pandorabots.com/

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface PandorabotsConfig {
  appId: string;
  userKey: string;
  baseUrl?: string;
}

export class PandorabotsMCPServer extends MCPAdapterBase {
  private readonly appId: string;
  private readonly userKey: string;
  private readonly baseUrl: string;

  constructor(config: PandorabotsConfig) {
    super();
    this.appId = config.appId;
    this.userKey = config.userKey;
    this.baseUrl = config.baseUrl || 'https://aiaas.pandorabots.com';
  }

  static catalog() {
    return {
      name: 'pandorabots',
      displayName: 'Pandorabots',
      version: '1.0.0',
      category: 'ai' as const,
      keywords: ['pandorabots', 'chatbot', 'aiml', 'conversational-ai', 'bot'],
      toolNames: [
        'list_bots',
        'create_bot',
        'delete_bot',
        'list_bot_files',
        'compile_bot',
        'get_bot_file',
        'upload_bot_file',
        'delete_bot_file',
        'talk_to_bot',
        'anonymous_talk',
      ],
      description: 'Pandorabots AIaaS adapter — manage AIML chatbots, upload files, and hold conversations via the Epic AI Intelligence Platform.',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'list_bots',
        description: 'Retrieve a list of all bots in your Pandorabots application.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'create_bot',
        description: 'Create a new chatbot in your Pandorabots application.',
        inputSchema: {
          type: 'object',
          properties: {
            botname: {
              type: 'string',
              description: 'Name for the new bot (alphanumeric, lowercase)',
            },
          },
          required: ['botname'],
        },
      },
      {
        name: 'delete_bot',
        description: 'Delete an existing chatbot from your Pandorabots application.',
        inputSchema: {
          type: 'object',
          properties: {
            botname: {
              type: 'string',
              description: 'Name of the bot to delete',
            },
          },
          required: ['botname'],
        },
      },
      {
        name: 'list_bot_files',
        description: 'List all files associated with a bot, with optional type filter (aiml, set, map, substitution, pdefaults, properties).',
        inputSchema: {
          type: 'object',
          properties: {
            botname: {
              type: 'string',
              description: 'Name of the bot',
            },
            return: {
              type: 'string',
              description: 'File type filter: aiml, set, map, substitution, pdefaults, properties',
            },
          },
          required: ['botname'],
        },
      },
      {
        name: 'compile_bot',
        description: 'Compile/verify a bot to check for AIML errors. Returns compilation results and any syntax issues.',
        inputSchema: {
          type: 'object',
          properties: {
            botname: {
              type: 'string',
              description: 'Name of the bot to compile',
            },
          },
          required: ['botname'],
        },
      },
      {
        name: 'get_bot_file',
        description: 'Retrieve a specific bot file by type and filename. Use file_kind=aiml/set/map/substitution for named files, or pdefaults/properties for single files.',
        inputSchema: {
          type: 'object',
          properties: {
            botname: {
              type: 'string',
              description: 'Name of the bot',
            },
            file_kind: {
              type: 'string',
              description: 'File type: aiml, set, map, substitution, pdefaults, properties',
            },
            filename: {
              type: 'string',
              description: 'Filename (required for aiml, set, map, substitution types)',
            },
          },
          required: ['botname', 'file_kind'],
        },
      },
      {
        name: 'upload_bot_file',
        description: 'Upload a bot file (AIML, set, map, substitution, pdefaults, or properties) to a Pandorabots bot.',
        inputSchema: {
          type: 'object',
          properties: {
            botname: {
              type: 'string',
              description: 'Name of the bot',
            },
            file_kind: {
              type: 'string',
              description: 'File type: aiml, set, map, substitution, pdefaults, properties',
            },
            filename: {
              type: 'string',
              description: 'Filename (required for aiml, set, map, substitution types)',
            },
            content: {
              type: 'string',
              description: 'File content to upload',
            },
          },
          required: ['botname', 'file_kind', 'content'],
        },
      },
      {
        name: 'delete_bot_file',
        description: 'Delete a specific file from a Pandorabots bot.',
        inputSchema: {
          type: 'object',
          properties: {
            botname: {
              type: 'string',
              description: 'Name of the bot',
            },
            file_kind: {
              type: 'string',
              description: 'File type: aiml, set, map, substitution, pdefaults, properties',
            },
            filename: {
              type: 'string',
              description: 'Filename (required for aiml, set, map, substitution types)',
            },
          },
          required: ['botname', 'file_kind'],
        },
      },
      {
        name: 'talk_to_bot',
        description: 'Send a message to a Pandorabots chatbot and receive a response. Supports session continuity and debug options.',
        inputSchema: {
          type: 'object',
          properties: {
            botname: {
              type: 'string',
              description: 'Name of the bot to talk to',
            },
            input: {
              type: 'string',
              description: 'User input message to send to the bot',
            },
            client_name: {
              type: 'string',
              description: 'End-user identifier for maintaining per-user predicates',
            },
            sessionid: {
              type: 'string',
              description: 'Session ID to group conversation turns together',
            },
            recent: {
              type: 'boolean',
              description: 'If true, return recent conversation history',
            },
          },
          required: ['botname', 'input'],
        },
      },
      {
        name: 'anonymous_talk',
        description: 'Talk to a bot anonymously. Pandorabots will auto-generate a client_name if not provided, useful for stateless or new conversations.',
        inputSchema: {
          type: 'object',
          properties: {
            botname: {
              type: 'string',
              description: 'Name of the bot to talk to',
            },
            input: {
              type: 'string',
              description: 'User input message to send to the bot',
            },
            client_name: {
              type: 'string',
              description: 'Optional end-user client identifier (auto-generated if omitted)',
            },
            sessionid: {
              type: 'string',
              description: 'Optional session ID for grouping conversation turns',
            },
          },
          required: ['botname', 'input'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_bots':
          return await this.listBots();
        case 'create_bot':
          return await this.createBot(args);
        case 'delete_bot':
          return await this.deleteBot(args);
        case 'list_bot_files':
          return await this.listBotFiles(args);
        case 'compile_bot':
          return await this.compileBot(args);
        case 'get_bot_file':
          return await this.getBotFile(args);
        case 'upload_bot_file':
          return await this.uploadBotFile(args);
        case 'delete_bot_file':
          return await this.deleteBotFile(args);
        case 'talk_to_bot':
          return await this.talkToBot(args);
        case 'anonymous_talk':
          return await this.anonymousTalk(args);
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

  private authParam(): string {
    return `user_key=${encodeURIComponent(this.userKey)}`;
  }

  private async request(method: string, path: string, body?: Record<string, string>): Promise<ToolResult> {
    const sep = path.includes('?') ? '&' : '?';
    const url = `${this.baseUrl}${path}${sep}${this.authParam()}`;
    const init: RequestInit = { method };
    if (body && (method === 'POST' || method === 'PUT')) {
      const form = new URLSearchParams(body);
      init.body = form.toString();
      init.headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
    }
    const response = await this.fetchWithRetry(url, init);
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `Pandorabots API error ${response.status}: ${errText}` }], isError: true };
    }
    const contentType = response.headers.get('content-type') || '';
    let data: unknown;
    if (contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listBots(): Promise<ToolResult> {
    return this.request('GET', `/bot/${encodeURIComponent(this.appId)}`);
  }

  private async createBot(args: Record<string, unknown>): Promise<ToolResult> {
    const botname = args.botname as string;
    if (!botname) return { content: [{ type: 'text', text: 'botname is required' }], isError: true };
    return this.request('PUT', `/bot/${encodeURIComponent(this.appId)}/${encodeURIComponent(botname)}`);
  }

  private async deleteBot(args: Record<string, unknown>): Promise<ToolResult> {
    const botname = args.botname as string;
    if (!botname) return { content: [{ type: 'text', text: 'botname is required' }], isError: true };
    return this.request('DELETE', `/bot/${encodeURIComponent(this.appId)}/${encodeURIComponent(botname)}`);
  }

  private async listBotFiles(args: Record<string, unknown>): Promise<ToolResult> {
    const botname = args.botname as string;
    if (!botname) return { content: [{ type: 'text', text: 'botname is required' }], isError: true };
    let path = `/bot/${encodeURIComponent(this.appId)}/${encodeURIComponent(botname)}`;
    if (args.return) path += `?return=${encodeURIComponent(args.return as string)}`;
    return this.request('GET', path);
  }

  private async compileBot(args: Record<string, unknown>): Promise<ToolResult> {
    const botname = args.botname as string;
    if (!botname) return { content: [{ type: 'text', text: 'botname is required' }], isError: true };
    return this.request('GET', `/bot/${encodeURIComponent(this.appId)}/${encodeURIComponent(botname)}/verify`);
  }

  private async getBotFile(args: Record<string, unknown>): Promise<ToolResult> {
    const botname = args.botname as string;
    const fileKind = args.file_kind as string;
    if (!botname || !fileKind) return { content: [{ type: 'text', text: 'botname and file_kind are required' }], isError: true };
    const filename = args.filename as string | undefined;
    if (filename) {
      return this.request('GET', `/bot/${encodeURIComponent(this.appId)}/${encodeURIComponent(botname)}/${encodeURIComponent(fileKind)}/${encodeURIComponent(filename)}`);
    }
    return this.request('GET', `/bot/${encodeURIComponent(this.appId)}/${encodeURIComponent(botname)}/${encodeURIComponent(fileKind)}`);
  }

  private async uploadBotFile(args: Record<string, unknown>): Promise<ToolResult> {
    const botname = args.botname as string;
    const fileKind = args.file_kind as string;
    const content = args.content as string;
    if (!botname || !fileKind || !content) return { content: [{ type: 'text', text: 'botname, file_kind, and content are required' }], isError: true };
    const filename = args.filename as string | undefined;
    const body: Record<string, string> = { content };
    if (filename) {
      return this.request('PUT', `/bot/${encodeURIComponent(this.appId)}/${encodeURIComponent(botname)}/${encodeURIComponent(fileKind)}/${encodeURIComponent(filename)}`, body);
    }
    return this.request('PUT', `/bot/${encodeURIComponent(this.appId)}/${encodeURIComponent(botname)}/${encodeURIComponent(fileKind)}`, body);
  }

  private async deleteBotFile(args: Record<string, unknown>): Promise<ToolResult> {
    const botname = args.botname as string;
    const fileKind = args.file_kind as string;
    if (!botname || !fileKind) return { content: [{ type: 'text', text: 'botname and file_kind are required' }], isError: true };
    const filename = args.filename as string | undefined;
    if (filename) {
      return this.request('DELETE', `/bot/${encodeURIComponent(this.appId)}/${encodeURIComponent(botname)}/${encodeURIComponent(fileKind)}/${encodeURIComponent(filename)}`);
    }
    return this.request('DELETE', `/bot/${encodeURIComponent(this.appId)}/${encodeURIComponent(botname)}/${encodeURIComponent(fileKind)}`);
  }

  private async talkToBot(args: Record<string, unknown>): Promise<ToolResult> {
    const botname = args.botname as string;
    const input = args.input as string;
    if (!botname || !input) return { content: [{ type: 'text', text: 'botname and input are required' }], isError: true };
    const body: Record<string, string> = { input };
    if (args.client_name) body['client_name'] = args.client_name as string;
    if (args.sessionid) body['sessionid'] = args.sessionid as string;
    if (args.recent !== undefined) body['recent'] = String(args.recent);
    return this.request('POST', `/talk/${encodeURIComponent(this.appId)}/${encodeURIComponent(botname)}`, body);
  }

  private async anonymousTalk(args: Record<string, unknown>): Promise<ToolResult> {
    const botname = args.botname as string;
    const input = args.input as string;
    if (!botname || !input) return { content: [{ type: 'text', text: 'botname and input are required' }], isError: true };
    const body: Record<string, string> = { input };
    if (args.client_name) body['client_name'] = args.client_name as string;
    if (args.sessionid) body['sessionid'] = args.sessionid as string;
    return this.request('POST', `/atalk/${encodeURIComponent(this.appId)}/${encodeURIComponent(botname)}`, body);
  }
}
