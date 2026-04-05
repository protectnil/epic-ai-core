/**
 * DeepL MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/DeepLcom/deepl-mcp-server — transport: stdio, auth: API key
// Published by DeepLcom (official). Last commit: 2026-01-28. 8 tools only (fails 10+ tool criterion).
// Our adapter covers: 12 tools. Vendor MCP covers: 8 tools (translate-text, translate-document,
//   rephrase-text, get-source-languages, get-target-languages, list-glossaries, get-glossary-info,
//   get-glossary-dictionary-entries). MCP missing: check_usage, create_glossary, delete_glossary,
//   list_glossary_language_pairs.
// Recommendation: use-rest-api — official MCP fails the 10+ tool criterion (only 8 tools). Our adapter
//   provides broader coverage including usage monitoring, glossary creation/deletion, and language pairs.
//
// Base URL: https://api.deepl.com (Pro) or https://api-free.deepl.com (Free tier)
// Auth: Authorization header — "DeepL-Auth-Key <key>"
// Docs: https://developers.deepl.com/docs
// Rate limits: HTTP 429 returned when limits exceeded; Free tier: 500,000 chars/month; Pro: plan-dependent

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface DeepLConfig {
  apiKey: string;
  baseUrl?: string;
}

export class DeepLMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: DeepLConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.deepl.com';
  }

  static catalog() {
    return {
      name: 'deepl',
      displayName: 'DeepL',
      version: '1.0.0',
      category: 'misc',
      keywords: [
        'deepl', 'translation', 'translate', 'language', 'localization', 'l10n',
        'i18n', 'glossary', 'rephrase', 'document translation', 'multilingual',
      ],
      toolNames: [
        'translate_text', 'translate_document', 'rephrase_text',
        'get_source_languages', 'get_target_languages',
        'check_usage',
        'list_glossaries', 'create_glossary', 'get_glossary', 'delete_glossary',
        'get_glossary_entries', 'list_glossary_language_pairs',
      ],
      description: 'DeepL AI translation: translate text and documents across 30+ languages, rephrase content, manage glossaries, and monitor usage.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'translate_text',
        description: 'Translate one or more text strings using DeepL AI with optional source language, formality, and glossary controls',
        inputSchema: {
          type: 'object',
          properties: {
            text: {
              type: 'string',
              description: 'Text to translate. For multiple strings, separate with newlines or provide a JSON array string.',
            },
            target_lang: {
              type: 'string',
              description: 'Target language code (e.g. EN-US, DE, FR, ES, JA, ZH). See get_target_languages for full list.',
            },
            source_lang: {
              type: 'string',
              description: 'Source language code (e.g. EN, DE). Omit for automatic detection.',
            },
            formality: {
              type: 'string',
              description: 'Formality level for supported languages: default, more (formal), less (informal), prefer_more, prefer_less',
            },
            glossary_id: {
              type: 'string',
              description: 'Glossary UUID to apply for consistent terminology. Requires source_lang to be set.',
            },
            split_sentences: {
              type: 'string',
              description: 'How to split sentences: 0 (none), 1 (punctuation, default), nonewlines (punctuation only, no newlines)',
            },
            preserve_formatting: {
              type: 'boolean',
              description: 'Preserve original formatting such as whitespace and punctuation (default: false)',
            },
            tag_handling: {
              type: 'string',
              description: 'Enable tag handling: xml or html. Allows translating content with markup.',
            },
          },
          required: ['text', 'target_lang'],
        },
      },
      {
        name: 'translate_document',
        description: 'Upload and translate a document file (PDF, DOCX, PPTX, XLSX, HTML, TXT) using DeepL, returning download URL and status',
        inputSchema: {
          type: 'object',
          properties: {
            file_url: {
              type: 'string',
              description: 'Publicly accessible URL of the document to translate',
            },
            filename: {
              type: 'string',
              description: 'Original filename including extension (e.g. report.docx) — used to determine file type',
            },
            target_lang: {
              type: 'string',
              description: 'Target language code for the translated document (e.g. DE, FR, JA)',
            },
            source_lang: {
              type: 'string',
              description: 'Source language code. Omit for automatic detection.',
            },
            formality: {
              type: 'string',
              description: 'Formality level: default, more, less, prefer_more, prefer_less',
            },
            glossary_id: {
              type: 'string',
              description: 'Glossary UUID to apply for consistent terminology',
            },
          },
          required: ['file_url', 'filename', 'target_lang'],
        },
      },
      {
        name: 'rephrase_text',
        description: 'Rephrase text in its original language using DeepL Write with optional writing style and tone controls',
        inputSchema: {
          type: 'object',
          properties: {
            text: {
              type: 'string',
              description: 'Text to rephrase',
            },
            target_lang: {
              type: 'string',
              description: 'Language code of the text to rephrase (e.g. EN-US, EN-GB, DE). Must match the source language. Required for rephrasing.',
            },
            writing_style: {
              type: 'string',
              description: 'Desired writing style: academic, business, casual, simple, default, or prefer_* variants (prefer_academic, prefer_business, prefer_casual, prefer_simple). Cannot be combined with tone.',
            },
            tone: {
              type: 'string',
              description: 'Desired tone: confident, default, diplomatic, enthusiastic, friendly, professional',
            },
          },
          required: ['text', 'target_lang'],
        },
      },
      {
        name: 'get_source_languages',
        description: 'Retrieve the list of all languages supported as translation sources by the DeepL API',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_target_languages',
        description: 'Retrieve the list of all languages supported as translation targets by the DeepL API, including regional variants',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'check_usage',
        description: 'Check current DeepL API usage — characters translated and character limit for the current billing period',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'list_glossaries',
        description: 'List all glossaries in the DeepL account with their language pairs, entry counts, and creation dates',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'create_glossary',
        description: 'Create a new DeepL glossary with term pairs for consistent vocabulary in a specific source-to-target language direction',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Human-readable name for the glossary (e.g. "Marketing Terms EN-DE")',
            },
            source_lang: {
              type: 'string',
              description: 'Source language code (e.g. EN)',
            },
            target_lang: {
              type: 'string',
              description: 'Target language code (e.g. DE)',
            },
            entries: {
              type: 'string',
              description: 'Tab-separated term pairs, one per line: "source_term\\ttarget_term\\n..." or TSV format',
            },
            entries_format: {
              type: 'string',
              description: 'Format of the entries field: tsv (default) or csv',
            },
          },
          required: ['name', 'source_lang', 'target_lang', 'entries'],
        },
      },
      {
        name: 'get_glossary',
        description: 'Get metadata for a specific DeepL glossary by ID, including name, language pair, entry count, and creation date',
        inputSchema: {
          type: 'object',
          properties: {
            glossary_id: {
              type: 'string',
              description: 'UUID of the glossary to retrieve',
            },
          },
          required: ['glossary_id'],
        },
      },
      {
        name: 'delete_glossary',
        description: 'Permanently delete a DeepL glossary by ID. This action cannot be undone.',
        inputSchema: {
          type: 'object',
          properties: {
            glossary_id: {
              type: 'string',
              description: 'UUID of the glossary to delete',
            },
          },
          required: ['glossary_id'],
        },
      },
      {
        name: 'get_glossary_entries',
        description: 'Retrieve all term pairs stored in a specific DeepL glossary',
        inputSchema: {
          type: 'object',
          properties: {
            glossary_id: {
              type: 'string',
              description: 'UUID of the glossary whose entries to retrieve',
            },
          },
          required: ['glossary_id'],
        },
      },
      {
        name: 'list_glossary_language_pairs',
        description: 'List all source-target language pair combinations supported for DeepL glossaries',
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
        case 'translate_text':
          return this.translateText(args);
        case 'translate_document':
          return this.translateDocument(args);
        case 'rephrase_text':
          return this.rephraseText(args);
        case 'get_source_languages':
          return this.getLanguages('source');
        case 'get_target_languages':
          return this.getLanguages('target');
        case 'check_usage':
          return this.checkUsage();
        case 'list_glossaries':
          return this.listGlossaries();
        case 'create_glossary':
          return this.createGlossary(args);
        case 'get_glossary':
          return this.getGlossary(args);
        case 'delete_glossary':
          return this.deleteGlossary(args);
        case 'get_glossary_entries':
          return this.getGlossaryEntries(args);
        case 'list_glossary_language_pairs':
          return this.listGlossaryLanguagePairs();
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

  private get authHeader(): Record<string, string> {
    return {
      'Authorization': `DeepL-Auth-Key ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  private async translateText(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.text || !args.target_lang) {
      return { content: [{ type: 'text', text: 'text and target_lang are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      text: [args.text as string],
      target_lang: (args.target_lang as string).toUpperCase(),
    };
    if (args.source_lang) body.source_lang = (args.source_lang as string).toUpperCase();
    if (args.formality) body.formality = args.formality;
    if (args.glossary_id) body.glossary_id = args.glossary_id;
    if (args.split_sentences) body.split_sentences = args.split_sentences;
    if (typeof args.preserve_formatting === 'boolean') body.preserve_formatting = args.preserve_formatting;
    if (args.tag_handling) body.tag_handling = args.tag_handling;

    const response = await this.fetchWithRetry(`${this.baseUrl}/v2/translate`, {
      method: 'POST',
      headers: this.authHeader,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async translateDocument(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.file_url || !args.filename || !args.target_lang) {
      return { content: [{ type: 'text', text: 'file_url, filename, and target_lang are required' }], isError: true };
    }
    // Document translation requires multipart/form-data with file content.
    // We fetch the document from the provided URL and forward it to DeepL.
    const fileResponse = await this.fetchWithRetry(args.file_url as string, {});
    if (!fileResponse.ok) {
      return { content: [{ type: 'text', text: `Failed to fetch document: ${fileResponse.status} ${fileResponse.statusText}` }], isError: true };
    }
    const fileBlob = await fileResponse.blob();
    const formData = new FormData();
    formData.append('file', fileBlob, args.filename as string);
    formData.append('target_lang', (args.target_lang as string).toUpperCase());
    if (args.source_lang) formData.append('source_lang', (args.source_lang as string).toUpperCase());
    if (args.formality) formData.append('formality', args.formality as string);
    if (args.glossary_id) formData.append('glossary_id', args.glossary_id as string);

    const response = await this.fetchWithRetry(`${this.baseUrl}/v2/document`, {
      method: 'POST',
      headers: { 'Authorization': `DeepL-Auth-Key ${this.apiKey}` },
      body: formData,
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async rephraseText(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.text || !args.target_lang) {
      return { content: [{ type: 'text', text: 'text and target_lang are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      text: [args.text as string],
      target_lang: (args.target_lang as string).toUpperCase(),
    };
    if (args.writing_style) body.writing_style = args.writing_style;
    if (args.tone) body.tone = args.tone;

    const response = await this.fetchWithRetry(`${this.baseUrl}/v2/write/rephrase`, {
      method: 'POST',
      headers: this.authHeader,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getLanguages(type: 'source' | 'target'): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}/v2/languages?type=${type}`, {
      headers: this.authHeader,
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async checkUsage(): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}/v2/usage`, {
      headers: this.authHeader,
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listGlossaries(): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}/v2/glossaries`, {
      headers: this.authHeader,
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async createGlossary(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name || !args.source_lang || !args.target_lang || !args.entries) {
      return { content: [{ type: 'text', text: 'name, source_lang, target_lang, and entries are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      name: args.name,
      source_lang: (args.source_lang as string).toUpperCase(),
      target_lang: (args.target_lang as string).toUpperCase(),
      entries: args.entries,
      entries_format: (args.entries_format as string) || 'tsv',
    };
    const response = await this.fetchWithRetry(`${this.baseUrl}/v2/glossaries`, {
      method: 'POST',
      headers: this.authHeader,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getGlossary(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.glossary_id) {
      return { content: [{ type: 'text', text: 'glossary_id is required' }], isError: true };
    }
    const response = await this.fetchWithRetry(`${this.baseUrl}/v2/glossaries/${encodeURIComponent(args.glossary_id as string)}`, {
      headers: this.authHeader,
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async deleteGlossary(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.glossary_id) {
      return { content: [{ type: 'text', text: 'glossary_id is required' }], isError: true };
    }
    const response = await this.fetchWithRetry(`${this.baseUrl}/v2/glossaries/${encodeURIComponent(args.glossary_id as string)}`, {
      method: 'DELETE',
      headers: this.authHeader,
    });
    if (response.status === 204) {
      return { content: [{ type: 'text', text: `Glossary ${encodeURIComponent(args.glossary_id as string)} deleted successfully` }], isError: false };
    }
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: `Glossary ${encodeURIComponent(args.glossary_id as string)} deleted successfully` }], isError: false };
  }

  private async getGlossaryEntries(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.glossary_id) {
      return { content: [{ type: 'text', text: 'glossary_id is required' }], isError: true };
    }
    const response = await this.fetchWithRetry(`${this.baseUrl}/v2/glossaries/${encodeURIComponent(args.glossary_id as string)}/entries`, {
      headers: { ...this.authHeader, 'Accept': 'text/tab-separated-values' },
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const text = await response.text();
    const truncated = text.length > 10_000
      ? text.slice(0, 10_000) + `\n... [truncated, ${text.length} total chars]`
      : text;
    return { content: [{ type: 'text', text: truncated }], isError: false };
  }

  private async listGlossaryLanguagePairs(): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}/v2/glossary-language-pairs`, {
      headers: this.authHeader,
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }
}
