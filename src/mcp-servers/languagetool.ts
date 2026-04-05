/**
 * LanguageTool MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03. LanguageTool has not published an official MCP server.
//
// Base URL: https://api.languagetoolplus.com/v2
// Auth: Optional — username + apiKey form params for Premium access. Free tier works unauthenticated.
// Docs: https://languagetool.org/http-api/
// Rate limits: Free: 20 req/min, 75,000 chars/min, 20,000 chars/req.
//              Premium: 80 req/min, 300,000 chars/min, 60,000 chars/req.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface LanguageToolConfig {
  username?: string;
  apiKey?: string;
  baseUrl?: string;
}

export class LanguageToolMCPServer extends MCPAdapterBase {
  private readonly username: string;
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: LanguageToolConfig) {
    super();
    this.username = config.username ?? '';
    this.apiKey = config.apiKey ?? '';
    this.baseUrl = config.baseUrl ?? 'https://api.languagetoolplus.com/v2';
  }

  static catalog() {
    return {
      name: 'languagetool',
      displayName: 'LanguageTool',
      version: '1.0.0',
      category: 'productivity' as const,
      keywords: [
        'languagetool', 'grammar', 'spelling', 'proofreading', 'style', 'writing',
        'text', 'check', 'language', 'correction', 'error', 'suggestion', 'dictionary',
        'word', 'rules', 'categories', 'nlp', 'linguistics',
      ],
      toolNames: [
        'check_text',
        'list_languages',
        'list_words',
        'add_word',
        'delete_word',
      ],
      description: 'Check texts for grammar, spelling, and style issues using LanguageTool. Supports 30+ languages, custom dictionaries, and Premium rule sets.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'check_text',
        description: 'Check a text for grammar, spelling, and style issues. Returns matches with offset, length, rule ID, message, and suggested replacements.',
        inputSchema: {
          type: 'object',
          properties: {
            text: {
              type: 'string',
              description: 'The plain text to check.',
            },
            language: {
              type: 'string',
              description: 'Language code (e.g. en-US, de-DE, fr, auto). Use "auto" for automatic language detection.',
            },
            mother_tongue: {
              type: 'string',
              description: "Language code of the user's native language — enables false-friend checks for some language pairs.",
            },
            preferred_variants: {
              type: 'string',
              description: 'Comma-separated list of preferred language variants used with language=auto (e.g. en-GB,de-AT).',
            },
            enabled_rules: {
              type: 'string',
              description: 'Comma-separated IDs of additional rules to enable.',
            },
            disabled_rules: {
              type: 'string',
              description: 'Comma-separated IDs of rules to disable.',
            },
            enabled_categories: {
              type: 'string',
              description: 'Comma-separated IDs of rule categories to enable.',
            },
            disabled_categories: {
              type: 'string',
              description: 'Comma-separated IDs of rule categories to disable.',
            },
            enabled_only: {
              type: 'boolean',
              description: 'If true, only rules/categories from enabled_rules and enabled_categories are active.',
            },
            level: {
              type: 'string',
              description: 'Rule sensitivity level: "default" or "picky" (activates stricter style rules).',
            },
          },
          required: ['text', 'language'],
        },
      },
      {
        name: 'list_languages',
        description: 'Get the full list of languages and language variants supported by LanguageTool, including language codes and names.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_words',
        description: "List words in the user's personal dictionary. Requires Premium credentials (username + apiKey).",
        inputSchema: {
          type: 'object',
          properties: {
            offset: {
              type: 'number',
              description: 'Offset into the word list for pagination (default: 0).',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of words to return (default: 10).',
            },
            dicts: {
              type: 'string',
              description: 'Comma-separated dictionary names to include; omit to use the default dictionary.',
            },
          },
        },
      },
      {
        name: 'add_word',
        description: "Add a single word to the user's personal dictionary. Requires Premium credentials (username + apiKey). Cannot add phrases (no spaces).",
        inputSchema: {
          type: 'object',
          properties: {
            word: {
              type: 'string',
              description: 'The word to add. Must be a single word with no whitespace.',
            },
            dict: {
              type: 'string',
              description: 'Name of the dictionary to add the word to (creates if non-existent). Omit for the default dictionary.',
            },
          },
          required: ['word'],
        },
      },
      {
        name: 'delete_word',
        description: "Remove a word from the user's personal dictionary. Requires Premium credentials (username + apiKey).",
        inputSchema: {
          type: 'object',
          properties: {
            word: {
              type: 'string',
              description: 'The word to remove from the dictionary.',
            },
            dict: {
              type: 'string',
              description: 'Name of the dictionary to remove the word from. Omit for the default dictionary.',
            },
          },
          required: ['word'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'check_text':
          return this.checkText(args);
        case 'list_languages':
          return this.listLanguages();
        case 'list_words':
          return this.listWords(args);
        case 'add_word':
          return this.addWord(args);
        case 'delete_word':
          return this.deleteWord(args);
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

  private authParams(): Record<string, string> {
    const params: Record<string, string> = {};
    if (this.username) params.username = this.username;
    if (this.apiKey) params.apiKey = this.apiKey;
    return params;
  }

  private async postForm(path: string, body: Record<string, string>): Promise<ToolResult> {
    const url = `${this.baseUrl}${path}`;
    const form = new URLSearchParams(body);
    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error ${response.status}: ${errText}` }], isError: true };
    }
    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new Error(`LanguageTool returned non-JSON (HTTP ${response.status})`);
    }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async get(path: string, params: Record<string, string> = {}): Promise<ToolResult> {
    const qs = new URLSearchParams(params);
    const url = `${this.baseUrl}${path}?${qs.toString()}`;
    const response = await this.fetchWithRetry(url, { method: 'GET' });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error ${response.status}: ${errText}` }], isError: true };
    }
    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new Error(`LanguageTool returned non-JSON (HTTP ${response.status})`);
    }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async checkText(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.text) return { content: [{ type: 'text', text: 'text is required' }], isError: true };
    if (!args.language) return { content: [{ type: 'text', text: 'language is required' }], isError: true };

    const body: Record<string, string> = {
      text: args.text as string,
      language: args.language as string,
      ...this.authParams(),
    };
    if (args.mother_tongue) body.motherTongue = args.mother_tongue as string;
    if (args.preferred_variants) body.preferredVariants = args.preferred_variants as string;
    if (args.enabled_rules) body.enabledRules = args.enabled_rules as string;
    if (args.disabled_rules) body.disabledRules = args.disabled_rules as string;
    if (args.enabled_categories) body.enabledCategories = args.enabled_categories as string;
    if (args.disabled_categories) body.disabledCategories = args.disabled_categories as string;
    if (args.enabled_only !== undefined) body.enabledOnly = String(args.enabled_only);
    if (args.level) body.level = args.level as string;

    return this.postForm('/check', body);
  }

  private async listLanguages(): Promise<ToolResult> {
    return this.get('/languages');
  }

  private async listWords(args: Record<string, unknown>): Promise<ToolResult> {
    if (!this.username || !this.apiKey) {
      return { content: [{ type: 'text', text: 'username and apiKey are required for dictionary operations' }], isError: true };
    }
    const params: Record<string, string> = { ...this.authParams() };
    if (args.offset !== undefined) params.offset = String(args.offset);
    if (args.limit !== undefined) params.limit = String(args.limit);
    if (args.dicts) params.dicts = args.dicts as string;
    return this.get('/words', params);
  }

  private async addWord(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.word) return { content: [{ type: 'text', text: 'word is required' }], isError: true };
    if (!this.username || !this.apiKey) {
      return { content: [{ type: 'text', text: 'username and apiKey are required for dictionary operations' }], isError: true };
    }
    const body: Record<string, string> = {
      word: args.word as string,
      ...this.authParams(),
    };
    if (args.dict) body.dict = args.dict as string;
    return this.postForm('/words/add', body);
  }

  private async deleteWord(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.word) return { content: [{ type: 'text', text: 'word is required' }], isError: true };
    if (!this.username || !this.apiKey) {
      return { content: [{ type: 'text', text: 'username and apiKey are required for dictionary operations' }], isError: true };
    }
    const body: Record<string, string> = {
      word: args.word as string,
      ...this.authParams(),
    };
    if (args.dict) body.dict = args.dict as string;
    return this.postForm('/words/delete', body);
  }
}
