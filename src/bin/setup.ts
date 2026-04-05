#!/usr/bin/env node
/**
 * Epic AI® Legion — CLI Entry Point
 * `legion` / `npx @epicai/legion`   — setup wizard
 * `legion serve` / `--serve`        — MCP server mode
 * `legion add <name>`               — add adapter and enter credentials
 * `legion remove <name>`            — remove an adapter
 * `legion health`                   — check adapter status
 * `legion list`                     — show Curated + Custom adapters
 * `legion search [term]`            — search all available adapters
 * `legion configure`                — connect credentials and wire adapters
 * `legion help`                     — show all commands
 *
 * Legion is an Intelligent Virtual Assistant (IVA) — the AI classifies intent,
 * selects adapters, calls them, and synthesizes a response through your local
 * SLM or cloud LLM.
 *
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc.
 * Adapters: Elastic License 2.0 | SDK Framework: Apache-2.0
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync, chmodSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { execSync } from 'node:child_process';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const EPIC_AI_DIR = join(homedir(), '.epic-ai');
const ENV_FILE = join(EPIC_AI_DIR, '.env');
const STATE_FILE = join(EPIC_AI_DIR, 'adapter-state.json');
const CONFIG_FILE = join(EPIC_AI_DIR, 'config.json');

// ─── Types ──────────────────────────────────────────────────

interface AdapterEntry {
  id: string;
  name: string;
  description?: string;
  category?: string;
  type?: string;
  rest?: {
    module?: string;
    className?: string;
    baseUrl?: string;
    authType?: string;
    envKey?: string;
    toolCount?: number;
    toolNames?: string[];
  };
  mcp?: {
    transport?: string;
    packageName?: string;
    command?: string;
    args?: string[];
    url?: string;
    envKeys?: string[];
  };
}

interface AdapterState {
  schemaVersion: number;
  lastHealthCheck: string | null;
  adapters: Record<string, {
    type: string;
    status: string;
    toolCount: number;
    installedVersion?: string;
    lastVerified: string | null;
  }>;
}

interface LegionConfig {
  selectedAdapters: string[];
  secretsProvider: string;
  aiClient: string;
  localBackend?: string;
}

// ─── Package root ───────────────────────────────────────────

function getPackageRoot(): string {
  const thisFile = fileURLToPath(import.meta.url);
  return join(thisFile, '..', '..', '..');
}

// ─── Catalog loading (single source: adapter-catalog.json from MongoDB) ─────

async function loadAllAdapters(): Promise<AdapterEntry[]> {
  try {
    const catalogPath = join(getPackageRoot(), 'adapter-catalog.json');
    const raw = await readFile(catalogPath, 'utf-8');
    return JSON.parse(raw) as AdapterEntry[];
  } catch {
    return [];
  }
}

// ─── State management ───────────────────────────────────────

function ensureDir(): void {
  if (!existsSync(EPIC_AI_DIR)) {
    mkdirSync(EPIC_AI_DIR, { recursive: true });
  }
}

function loadState(): AdapterState {
  try {
    if (existsSync(STATE_FILE)) {
      return JSON.parse(readFileSync(STATE_FILE, 'utf-8'));
    }
  } catch { /* fresh state */ }
  return { schemaVersion: 1, lastHealthCheck: null, adapters: {} };
}

function saveState(state: AdapterState): void {
  ensureDir();
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function loadConfig(): LegionConfig | null {
  try {
    if (existsSync(CONFIG_FILE)) {
      return JSON.parse(readFileSync(CONFIG_FILE, 'utf-8'));
    }
  } catch { /* no config */ }
  return null;
}

function saveConfig(config: LegionConfig): void {
  ensureDir();
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

// ─── Credential helpers ─────────────────────────────────────

function writeCredential(key: string, value: string): void {
  ensureDir();
  let existing = '';
  if (existsSync(ENV_FILE)) {
    existing = readFileSync(ENV_FILE, 'utf-8');
  }
  const regex = new RegExp(`^${key}=.*$`, 'm');
  if (regex.test(existing)) {
    existing = existing.replace(regex, `${key}=${value}`);
  } else {
    existing += `${key}=${value}\n`;
  }
  writeFileSync(ENV_FILE, existing, 'utf-8');
  chmodSync(ENV_FILE, 0o600);
}

function loadCredentials(): Record<string, string> {
  const creds: Record<string, string> = {};
  if (!existsSync(ENV_FILE)) return creds;
  const lines = readFileSync(ENV_FILE, 'utf-8').split('\n');
  for (const line of lines) {
    const eq = line.indexOf('=');
    if (eq > 0) {
      creds[line.slice(0, eq)] = line.slice(eq + 1);
    }
  }
  return creds;
}

// ─── MCP Client Detection ───────────────────────────────────

interface McpClientInfo {
  id: string;
  name: string;
  detected: boolean;
  configPath: string;   // absolute path
  configKey: string;    // "mcpServers" or "servers"
  hint?: string;
}

function expandHome(p: string): string {
  return p.startsWith('~') ? join(homedir(), p.slice(1)) : p;
}

function commandExists(cmd: string): boolean {
  try {
    execSync(`which ${cmd}`, { stdio: 'pipe', timeout: 3000 });
    return true;
  } catch {
    return false;
  }
}

function detectMcpClients(): McpClientInfo[] {
  const isMac = process.platform === 'darwin';
  const clients: McpClientInfo[] = [
    {
      id: 'claude-code',
      name: 'Claude Code CLI',
      detected: existsSync(expandHome('~/.claude')) || commandExists('claude'),
      configPath: expandHome('~/.claude/claude_desktop_config.json'),
      configKey: 'mcpServers',
    },
    {
      id: 'claude-desktop',
      name: 'Claude Desktop',
      detected: isMac
        ? existsSync(expandHome('~/Library/Application Support/Claude'))
        : existsSync(expandHome('~/.config/Claude')),
      configPath: isMac
        ? expandHome('~/Library/Application Support/Claude/claude_desktop_config.json')
        : expandHome('~/.config/Claude/claude_desktop_config.json'),
      configKey: 'mcpServers',
    },
    {
      id: 'cursor',
      name: 'Cursor',
      detected: existsSync(expandHome('~/.cursor')) || (isMac && existsSync('/Applications/Cursor.app')),
      configPath: expandHome('~/.cursor/mcp.json'),
      configKey: 'mcpServers',
    },
    {
      id: 'windsurf',
      name: 'Windsurf',
      detected: existsSync(expandHome('~/.codeium/windsurf')),
      configPath: expandHome('~/.codeium/windsurf/mcp_config.json'),
      configKey: 'mcpServers',
    },
    {
      id: 'vscode',
      name: 'VS Code (Copilot)',
      detected: commandExists('code') || (isMac && existsSync('/Applications/Visual Studio Code.app')),
      configPath: expandHome('~/.vscode/mcp.json'),
      configKey: 'servers',
      hint: 'Per-project: .vscode/mcp.json',
    },
    {
      id: 'codex',
      name: 'Codex CLI',
      detected: existsSync(expandHome('~/.codex')) || commandExists('codex'),
      configPath: expandHome('~/.codex/config.json'),
      configKey: 'mcpServers',
    },
    {
      id: 'gemini',
      name: 'Gemini CLI',
      detected: existsSync(expandHome('~/.gemini')) || commandExists('gemini'),
      configPath: expandHome('~/.gemini/settings.json'),
      configKey: 'mcpServers',
    },
    {
      id: 'cline',
      name: 'Cline',
      detected: isMac
        ? existsSync(expandHome('~/Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev'))
        : existsSync(expandHome('~/.config/Code/User/globalStorage/saoudrizwan.claude-dev')),
      configPath: isMac
        ? expandHome('~/Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json')
        : expandHome('~/.config/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json'),
      configKey: 'mcpServers',
    },
    {
      id: 'continue',
      name: 'Continue',
      detected: existsSync(expandHome('~/.continue')),
      configPath: expandHome('~/.continue/config.json'),
      configKey: 'mcpServers',
    },
    {
      id: 'goose',
      name: 'Goose',
      detected: commandExists('goose'),
      configPath: expandHome('~/.config/goose/config.yaml'),
      configKey: 'mcpServers',
      hint: 'YAML config — manual setup recommended',
    },
    {
      id: 'roo-code',
      name: 'Roo Code',
      detected: isMac
        ? existsSync(expandHome('~/Library/Application Support/Code/User/globalStorage/rooveterinaryinc.roo-cline'))
        : false,
      configPath: isMac
        ? expandHome('~/Library/Application Support/Code/User/globalStorage/rooveterinaryinc.roo-cline/settings/mcp_settings.json')
        : '',
      configKey: 'mcpServers',
    },
  ];

  return clients;
}

/** Read existing config, merge Legion server entry, write back */
function writeMcpConfig(client: McpClientInfo): { success: boolean; error?: string } {
  const legionEntry = { command: 'npx', args: ['@epicai/legion', '--serve'] };

  // YAML configs — don't auto-write
  if (client.configPath.endsWith('.yaml') || client.configPath.endsWith('.yml')) {
    return { success: false, error: 'YAML config — add manually' };
  }

  try {
    // Ensure parent directory exists
    const dir = join(client.configPath, '..');
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    // Read existing config or start fresh
    let config: Record<string, unknown> = {};
    if (existsSync(client.configPath)) {
      const raw = readFileSync(client.configPath, 'utf-8').trim();
      if (raw) {
        config = JSON.parse(raw);
      }
    }

    // Get or create the servers object
    const key = client.configKey;
    if (!config[key] || typeof config[key] !== 'object') {
      config[key] = {};
    }
    const servers = config[key] as Record<string, unknown>;

    // Add Legion (don't overwrite if already present)
    if (servers['legion']) {
      return { success: true, error: 'already configured' };
    }

    servers['legion'] = legionEntry;
    writeFileSync(client.configPath, JSON.stringify(config, null, 2) + '\n');
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

// ─── System detection ───────────────────────────────────────

interface SystemInfo {
  nodeVersion: string;
  platform: string;
  arch: string;
  hasLlamaCpp: boolean;
  hasOllama: boolean;
  hasVllm: boolean;
  localPort: number | null;
  localBackend: string | null;
  mcpClients: McpClientInfo[];
}

async function detectSystem(): Promise<SystemInfo> {
  const info: SystemInfo = {
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    hasLlamaCpp: false,
    hasOllama: false,
    hasVllm: false,
    localPort: null,
    localBackend: null,
    mcpClients: detectMcpClients(),
  };

  for (const [port, name] of [[8080, 'llama.cpp'], [11434, 'Ollama'], [8000, 'vLLM']] as const) {
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 2000);
      const resp = await fetch(`http://localhost:${port}/v1/models`, { signal: controller.signal });
      clearTimeout(t);
      if (resp.ok) {
        if (port === 8080) info.hasLlamaCpp = true;
        if (port === 11434) info.hasOllama = true;
        if (port === 8000) info.hasVllm = true;
        if (!info.localPort) {
          info.localPort = port;
          info.localBackend = name;
        }
      }
    } catch { /* not running */ }
  }

  return info;
}

// ─── MCP Server Mode (--serve) ──────────────────────────────

async function startMcpServer(): Promise<void> {
  const { McpServer } = await import('@modelcontextprotocol/sdk/server/mcp.js');
  const { StdioServerTransport } = await import('@modelcontextprotocol/sdk/server/stdio.js');
  const { z } = await import('zod');

  const allAdapters = await loadAllAdapters();
  void loadConfig(); // used in subcommands
  const state = loadState();

  const server = new McpServer({
    name: 'epic-ai-legion',
    version: '1.0.0',
  });

  // Build the real routing engine — same ToolPreFilter used in the eval
  const { ToolPreFilter } = await import('../federation/ToolPreFilter.js');

  // Determine which adapters the user has configured (credentials or explicit selection)
  const creds = loadCredentials();
  const config = loadConfig();
  const configuredAdapterIds = new Set<string>();
  for (const adapter of allAdapters) {
    const hasCredential = adapter.rest?.envKey ? !!creds[adapter.rest.envKey] : false;
    const hasMcpKeys = adapter.mcp?.envKeys?.some(k => !!creds[k]) ?? false;
    const isSelected = config?.selectedAdapters?.includes(adapter.id) ?? false;
    const isInState = !!state.adapters[adapter.id];
    if (hasCredential || hasMcpKeys || isSelected || isInState) {
      configuredAdapterIds.add(adapter.id);
    }
  }

  // Use shared buildToolsForRouting (enriched descriptions for BM25)

  // Two indexes: configured adapters (default search) and full catalog (discover mode)
  const configuredAdapters = allAdapters.filter(a => configuredAdapterIds.has(a.id));
  const toolPreFilter = new ToolPreFilter();
  const fullCatalogFilter = new ToolPreFilter();

  toolPreFilter.index(buildToolsForRouting(configuredAdapters));
  fullCatalogFilter.index(buildToolsForRouting(allAdapters));

  // Load vector index if available
  try {
    const vectorPath = join(getPackageRoot(), 'vector-index.json');
    const vectorRaw = await readFile(vectorPath, 'utf-8');
    const vectorRecords = JSON.parse(vectorRaw);
    toolPreFilter.loadVectorIndex(vectorRecords);
    fullCatalogFilter.loadVectorIndex(vectorRecords);
  } catch { /* no vector index — BM25 only */ }

  // Main query tool — the single entry point for the LLM
  server.tool(
    'legion_query',
    {
      query: z.string().describe('Natural language query. Searches your configured adapters by default. Use discover:true to search the full catalog of 3,887 adapters.'),
      detail: z.enum(['full', 'summary']).optional().describe('full (default): top 20 with tool lists. summary: one-line adapter summaries — use this when the first call missed.'),
      discover: z.boolean().optional().describe('Set to true to search ALL available adapters, not just your configured ones. Use this to find new adapters to connect.'),
    },
    async (args) => {
      const query = args.query;
      const detail = args.detail || 'full';
      const discover = args.discover || false;
      // Choose index: configured adapters by default, full catalog in discover mode
      const activeFilter = discover ? fullCatalogFilter : toolPreFilter;

      // Ring 2: Summary mode — return next 200 BM25-ranked adapters as one-line summaries
      if (detail === 'summary') {
        const selected200 = await activeFilter.select(query, { maxTools: 220, maxPerServer: 10 });
        const servers200 = [...new Set(selected200.map(t => t.server))];
        // Skip the first 20 (already shown in Ring 1), take the next 200
        const ring2Servers = servers200.slice(20);
        const summaries = ring2Servers.map(serverId => {
          const a = allAdapters.find(x => x.id === serverId);
          if (!a) return null;
          return {
            id: a.id,
            name: a.name,
            category: a.category || 'other',
            description: (a.description || '').slice(0, 80),
            configured: configuredAdapterIds.has(a.id),
          };
        }).filter(Boolean);

        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              status: 'summary',
              query,
              mode: discover ? 'discover' : 'configured',
              totalShown: summaries.length,
              adapters: summaries,
              message: discover
                ? `Showing ${summaries.length} adapters from the full catalog. Use legion_call to add and connect one.`
                : `Showing ${summaries.length} additional configured adapters ranked by relevance.`,
            }),
          }],
        };
      }

      // Ring 1: Full mode — BM25 + query expansion, top 20 detailed
      const selected = await activeFilter.select(query, { maxTools: 20, maxPerServer: 5 });
      const selectedServers = [...new Set(selected.map(t => t.server))];

      // Build category hints from all adapters
      const catCounts = new Map<string, number>();
      for (const a of allAdapters) {
        const cat = a.category || 'other';
        catCounts.set(cat, (catCounts.get(cat) || 0) + 1);
      }
      const topCategories = [...catCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([cat, count]) => ({ category: cat, adapterCount: count }));

      if (selectedServers.length === 0) {
        // No match in configured adapters — suggest discover mode
        const hint = discover
          ? 'No adapters matched in the full catalog. Try a different query or use legion_list to browse.'
          : `None of your ${configuredAdapters.length} configured adapters matched. Try legion_query with discover:true to search all ${allAdapters.length} available adapters.`;
        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              status: 'no_match',
              message: `No adapters matched query: "${query}"`,
              hint,
              configuredCount: configuredAdapters.length,
              totalAvailable: allAdapters.length,
              categories: topCategories,
            }),
          }],
        };
      }

      // Build response with matched adapter info
      const matches = selectedServers.map(serverId => {
        const adapter = allAdapters.find(a => a.id === serverId);
        if (!adapter) return null;
        return {
          id: adapter.id,
          name: adapter.name,
          type: adapter.type,
          category: adapter.category,
          tools: adapter.rest?.toolNames || (adapter.mcp as Record<string, unknown>)?.toolNames as string[] | undefined || [],
          toolCount: adapter.rest?.toolCount || 0,
          configured: configuredAdapterIds.has(adapter.id),
          transport: adapter.mcp?.transport || (adapter.rest ? 'rest' : 'unknown'),
        };
      }).filter(Boolean);

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            status: 'matched',
            query,
            mode: discover ? 'discover' : 'configured',
            matchedAdapters: matches,
            totalMatched: matches.length,
            configuredCount: configuredAdapters.length,
            categories: topCategories,
            message: discover
              ? `Found ${matches.length} adapters in the full catalog. Adapters marked configured:true are ready to use.`
              : matches.length < 3
                ? `Only ${matches.length} of your ${configuredAdapters.length} configured adapters matched. Try legion_query with discover:true to search all ${allAdapters.length} available adapters.`
                : `Found ${matches.length} matching adapters from your ${configuredAdapters.length} configured adapters.`,
          }),
        }],
      };
    }
  );

  // Tool execution
  server.tool(
    'legion_call',
    {
      adapter: z.string().describe('Adapter ID (e.g., "github", "crowdstrike", "salesforce")'),
      tool: z.string().describe('Tool name to call on the adapter'),
      args: z.record(z.unknown()).optional().describe('Arguments to pass to the tool'),
    },
    async (toolArgs) => {
      const adapterId = toolArgs.adapter;
      const toolName = toolArgs.tool;
      const callArgs = toolArgs.args || {};

      const adapter = allAdapters.find(a => a.id === adapterId);
      if (!adapter) {
        return {
          content: [{ type: 'text' as const, text: JSON.stringify({ error: `Adapter "${adapterId}" not found` }) }],
          isError: true,
        };
      }

      // REST adapter execution
      if (adapter.rest?.module && adapter.rest?.className) {
        try {
          const creds = loadCredentials();
          const modulePath = join(getPackageRoot(), adapter.rest.module);
          const mod = await import(modulePath);
          const AdapterClass = mod[adapter.rest.className] || mod.default;

          // Build config from credentials
          const adapterConfig: Record<string, string> = {};
          if (adapter.rest.envKey && creds[adapter.rest.envKey]) {
            adapterConfig.apiKey = creds[adapter.rest.envKey];
          }
          if (adapter.rest.baseUrl) {
            adapterConfig.baseUrl = adapter.rest.baseUrl;
          }

          const instance = new AdapterClass(adapterConfig);
          const result = await instance.callTool(toolName, callArgs);

          return {
            content: [{ type: 'text' as const, text: typeof result.content === 'string' ? result.content : JSON.stringify(result.content) }],
            isError: result.isError || false,
          };
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          return {
            content: [{ type: 'text' as const, text: JSON.stringify({ error: msg, adapter: adapterId, tool: toolName }) }],
            isError: true,
          };
        }
      }

      // MCP stdio adapter — spawn and call
      if (adapter.mcp?.transport === 'stdio' && adapter.mcp?.command) {
        try {
          const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
          const { StdioClientTransport } = await import('@modelcontextprotocol/sdk/client/stdio.js');

          const transport = new StdioClientTransport({
            command: adapter.mcp.command,
            args: adapter.mcp.args || [],
          });
          const client = new Client({ name: 'legion', version: '1.0' }, { capabilities: {} });
          await client.connect(transport);
          const result = await client.callTool({ name: toolName, arguments: callArgs as Record<string, string> });
          await client.close();

          const text = (result.content as Array<{ type: string; text?: string }>)
            .filter(c => c.type === 'text')
            .map(c => c.text || '')
            .join('\n');

          return {
            content: [{ type: 'text' as const, text }],
            isError: result.isError || false,
          };
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          return {
            content: [{ type: 'text' as const, text: JSON.stringify({ error: msg, adapter: adapterId, tool: toolName }) }],
            isError: true,
          };
        }
      }

      // MCP HTTP adapter
      if (adapter.mcp?.transport === 'streamable-http' && adapter.mcp?.url) {
        try {
          const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
          const { StreamableHTTPClientTransport } = await import('@modelcontextprotocol/sdk/client/streamableHttp.js');

          const transport = new StreamableHTTPClientTransport(new URL(adapter.mcp.url));
          const client = new Client({ name: 'legion', version: '1.0' }, { capabilities: {} });
          await client.connect(transport);
          const result = await client.callTool({ name: toolName, arguments: callArgs as Record<string, string> });
          await client.close();

          const text = (result.content as Array<{ type: string; text?: string }>)
            .filter(c => c.type === 'text')
            .map(c => c.text || '')
            .join('\n');

          return {
            content: [{ type: 'text' as const, text }],
            isError: result.isError || false,
          };
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          return {
            content: [{ type: 'text' as const, text: JSON.stringify({ error: msg, adapter: adapterId, tool: toolName }) }],
            isError: true,
          };
        }
      }

      return {
        content: [{ type: 'text' as const, text: JSON.stringify({ error: `No executable transport for adapter "${adapterId}"` }) }],
        isError: true,
      };
    }
  );

  // List available adapters
  server.tool(
    'legion_list',
    {
      category: z.string().optional().describe('Filter by category name (e.g., "hr", "cybersecurity", "healthcare", "hospitality", "construction", "manufacturing", "finance", "devops", "observability", "communication", "crm", "ai"). Use this when legion_query returns low-confidence results to browse all adapters in a domain.'),
      search: z.string().optional().describe('Search by keyword across adapter names and descriptions'),
    },
    async (args) => {
      let results = allAdapters;

      if (args.category) {
        results = results.filter(a => a.category === args.category);
      }
      if (args.search) {
        const term = args.search.toLowerCase();
        results = results.filter(a =>
          a.id.includes(term) || a.name.toLowerCase().includes(term) ||
          (a.description || '').toLowerCase().includes(term)
        );
      }

      const categories = [...new Set(allAdapters.map(a => a.category).filter(Boolean))];

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            total: results.length,
            categories,
            adapters: results.slice(0, 50).map(a => ({
              id: a.id,
              name: a.name,
              category: a.category,
              type: a.type,
              toolCount: a.rest?.toolCount || 0,
            })),
            truncated: results.length > 50,
          }),
        }],
      };
    }
  );

  // Connect via stdio
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

// ─── Subcommands ────────────────────────────────────────────

async function cmdAdd(adapterName: string): Promise<void> {
  const p = await import('@clack/prompts');
  const pc = (await import('picocolors')).default;

  const all = await loadAllAdapters();

  const match = all.find(a => a.id === adapterName || a.name.toLowerCase() === adapterName.toLowerCase());
  if (!match) {
    const fuzzy = all.filter(a => a.id.includes(adapterName) || a.name.toLowerCase().includes(adapterName.toLowerCase()));
    if (fuzzy.length > 0) {
      console.log(`Adapter "${adapterName}" not found. Did you mean:`);
      fuzzy.slice(0, 5).forEach(a => console.log(`  ${pc.cyan(a.id)} — ${a.name}`));
    } else {
      console.log(`Adapter "${adapterName}" not found. Run ${pc.cyan('npx @epicai/legion list')} to see all adapters.`);
    }
    process.exit(1);
  }

  const s = p.spinner();

  // Install stdio dependency if needed
  if (match.mcp?.transport === 'stdio' && match.mcp?.packageName) {
    s.start(`Installing ${match.name}`);
    try {
      execSync(`npm install -g --ignore-scripts ${match.mcp.packageName}`, { stdio: 'pipe', timeout: 60000 });
      s.stop(`${pc.green('✓')} ${match.name} installed`);
    } catch {
      s.stop(`${pc.yellow('!')} Install failed — run manually: npm install -g ${match.mcp.packageName}`);
    }
  }

  // Prompt for credentials
  if (match.rest?.envKey) {
    const key = await p.password({ message: `${match.rest.envKey}` });
    if (!p.isCancel(key) && key) {
      writeCredential(match.rest.envKey, key);
    }
  } else if (match.mcp?.envKeys && match.mcp.envKeys.length > 0) {
    for (const envKey of match.mcp.envKeys) {
      const key = await p.password({ message: envKey });
      if (!p.isCancel(key) && key) {
        writeCredential(envKey, key);
      }
    }
  }

  // Update state
  const state = loadState();
  state.adapters[match.id] = {
    type: match.type || 'unknown',
    status: 'configured',
    toolCount: match.rest?.toolCount || 0,
    lastVerified: null,
  };
  saveState(state);

  // Update config
  const config = loadConfig() || { selectedAdapters: [], secretsProvider: 'manual', aiClient: 'unknown' };
  if (!config.selectedAdapters.includes(match.id)) {
    config.selectedAdapters.push(match.id);
  }
  saveConfig(config);

  console.log(`${pc.green('✓')} ${match.name} added to Legion.`);
}

async function cmdRemove(adapterName: string): Promise<void> {
  const pc = (await import('picocolors')).default;

  const state = loadState();
  const config = loadConfig();

  if (!state.adapters[adapterName]) {
    console.log(`Adapter "${adapterName}" is not configured.`);
    process.exit(1);
  }

  delete state.adapters[adapterName];
  saveState(state);

  if (config) {
    config.selectedAdapters = config.selectedAdapters.filter(id => id !== adapterName);
    saveConfig(config);
  }

  console.log(`${pc.green('✓')} ${adapterName} removed from Legion.`);
  console.log(`${pc.white('  Note: credentials in ~/.epic-ai/.env and MCP client configs are not removed.')}`);
  console.log(`${pc.white('  Clean those manually if needed.')}`);
}

async function cmdHealth(): Promise<void> {
  const pc = (await import('picocolors')).default;
  const p = await import('@clack/prompts');

  const state = loadState();
  const creds = loadCredentials();
  const all = await loadAllAdapters();

  const configured = Object.keys(state.adapters);
  if (configured.length === 0) {
    console.log(`No adapters configured. Run ${pc.cyan('npx @epicai/legion')} to set up.`);
    return;
  }

  const s = p.spinner();
  s.start(`Checking ${configured.length} adapters`);

  const results: string[] = [];
  let healthy = 0;
  let issues = 0;

  for (const id of configured) {
    const adapter = all.find(a => a.id === id);
    if (!adapter) {
      results.push(`${pc.red('✗')} ${id} — not found in catalog`);
      issues++;
      continue;
    }

    // Check if credentials exist (REST envKey and MCP envKeys)
    const isCurated = CURATED_IDS.includes(id);
    let hasKey = true;
    let missingKey = '';

    if (adapter.rest?.envKey) {
      if (!creds[adapter.rest.envKey]) { hasKey = false; missingKey = adapter.rest.envKey; }
    }
    if (hasKey && !isCurated && adapter.mcp?.envKeys && adapter.mcp.envKeys.length > 0) {
      const hasMcpKey = adapter.mcp.envKeys.some(k => !!creds[k]);
      if (!hasMcpKey) { hasKey = false; missingKey = adapter.mcp.envKeys[0]; }
    }

    if (isCurated || hasKey) {
      const label = isCurated ? 'curated' : state.adapters[id].status;
      results.push(`${pc.green('✓')} ${adapter.name || id}  ${state.adapters[id].toolCount} tools  ${label}`);
      healthy++;
    } else {
      results.push(`${pc.yellow('!')} ${adapter.name || id}  missing ${missingKey || 'credentials'}`);
      issues++;
    }
  }

  s.stop('Health check complete');

  p.note(results.join('\n'), `${healthy} healthy, ${issues} need attention`);

  state.lastHealthCheck = new Date().toISOString();
  saveState(state);
}


// ─── Shared: build enriched tool descriptions for BM25 routing ──────────

function buildToolsForRouting(adapters: AdapterEntry[]) {
  const tools: Array<{ name: string; description: string; parameters: Record<string, unknown>; server: string; tier: 'orchestrated' | 'direct' }> = [];
  for (const adapter of adapters) {
    const toolNames = adapter.rest?.toolNames || (adapter.mcp as Record<string, unknown>)?.toolNames as string[] | undefined || [];
    const adapterDesc = adapter.description || adapter.id;
    if (toolNames.length === 0) {
      tools.push({ name: `${adapter.id}:default`, description: `${adapter.name} — ${adapterDesc}`, parameters: { type: 'object', properties: {} }, server: adapter.id, tier: 'orchestrated' });
    } else {
      for (const t of toolNames) {
        // Include adapter description so BM25 can match natural language queries against domain terms
        tools.push({ name: `${adapter.id}:${t}`, description: `${adapter.name} — ${t.replace(/_/g, ' ')} — ${adapterDesc}`, parameters: { type: 'object', properties: {} }, server: adapter.id, tier: 'orchestrated' });
      }
    }
  }
  return tools;
}

// ─── Curated adapter IDs (mirrored here for list/search — keep in sync with wizard) ──

const CURATED_IDS = [
  'com-claude-mcp-pubmed-pubmed',
  'govbase-mcp',
  'searchcode',
  'robtex',
];

// ─── legion list ────────────────────────────────────────────

async function cmdList(): Promise<void> {
  const pc = (await import('picocolors')).default;
  const all = await loadAllAdapters();
  const state = loadState();

  // Curated tier
  const curatedRows = CURATED_IDS.map(id => all.find(a => a.id === id)).filter(Boolean) as AdapterEntry[];

  // Custom tier — in state but not curated
  const customIds = Object.keys(state.adapters).filter(id => !CURATED_IDS.includes(id));
  const customRows = customIds.map(id => all.find(a => a.id === id) || { id, name: id, type: 'unknown' } as AdapterEntry);

  console.log('');

  // Curated
  console.log(`  ${pc.bold('Curated')}  ${pc.white(`(${curatedRows.length})`)}  ${pc.white('— open data, no credentials required')}`);
  console.log('');
  for (const a of curatedRows) {
    const toolCount = a.rest?.toolCount || (a.mcp as Record<string, unknown>)?.toolCount as number | undefined || 0;
    const typeLabel = a.type === 'mcp' ? pc.white('MCP') : a.type === 'both' ? pc.white('REST+MCP') : pc.white('REST');
    console.log(`    ${pc.cyan(a.id.padEnd(35))} ${typeLabel}  ${String(toolCount).padStart(3)} tools   ${pc.white((a.description || '').slice(0, 50))}`);
  }
  console.log('');

  // Custom
  console.log(`  ${pc.bold('Custom')}   ${pc.white(`(${customRows.length})`)}  ${pc.white('— your APIs and credentials')}`);
  console.log('');
  if (customRows.length === 0) {
    console.log(`    ${pc.white('None yet — run:')} ${pc.cyan('legion configure')}`);
  } else {
    for (const a of customRows) {
      const toolCount = a.rest?.toolCount || 0;
      const typeLabel = a.type === 'mcp' ? pc.white('MCP') : a.type === 'both' ? pc.white('REST+MCP') : pc.white('REST');
      console.log(`    ${pc.cyan(a.id.padEnd(35))} ${typeLabel}  ${String(toolCount).padStart(3)} tools   ${pc.white((a.description || '').slice(0, 50))}`);
    }
  }
  console.log('');
}

// ─── legion search ──────────────────────────────────────────

async function cmdSearch(term?: string): Promise<void> {
  const pc = (await import('picocolors')).default;
  const all = await loadAllAdapters();
  const state = loadState();

  if (!term) {
    // No term — show curated tier + hint
    const curatedRows = CURATED_IDS.map(id => all.find(a => a.id === id)).filter(Boolean) as AdapterEntry[];
    console.log('');
    console.log(`  ${pc.bold('Curated adapters')}  ${pc.white('— vetted, open data, no credentials required')}`);
    console.log('');
    for (const a of curatedRows) {
      const toolCount = a.rest?.toolCount || (a.mcp as Record<string, unknown>)?.toolCount as number | undefined || 0;
      console.log(`    ${pc.cyan(a.id.padEnd(35))} ${String(toolCount).padStart(3)} tools   ${pc.white((a.description || '').slice(0, 60))}`);
    }
    console.log('');
    console.log(`  ${pc.white(`Search all ${all.length} available adapters:`)}  ${pc.cyan('legion search <term>')}`);
    console.log('');
    return;
  }

  const t = term.toLowerCase();
  const results = all.filter(a =>
    a.id.includes(t) ||
    a.name.toLowerCase().includes(t) ||
    (a.description || '').toLowerCase().includes(t) ||
    (a.category || '').includes(t)
  );

  if (results.length === 0) {
    console.log(`\n  No adapters matched "${term}". Try a broader term.\n`);
    return;
  }

  // Sort: curated first, then custom (in state), then rest
  const customInState = new Set(Object.keys(state.adapters));
  const sorted = [
    ...results.filter(a => CURATED_IDS.includes(a.id)),
    ...results.filter(a => !CURATED_IDS.includes(a.id) && customInState.has(a.id)),
    ...results.filter(a => !CURATED_IDS.includes(a.id) && !customInState.has(a.id)),
  ];

  const shown = sorted.slice(0, 20);
  console.log('');
  console.log(`  ${pc.bold(`${results.length} adapters`)} matching "${term}"${results.length > 20 ? pc.white(' (showing top 20)') : ''}`);
  console.log('');

  for (const a of shown) {
    const toolCount = a.rest?.toolCount || (a.mcp as Record<string, unknown>)?.toolCount as number | undefined || 0;
    const tag = CURATED_IDS.includes(a.id)
      ? pc.green('curated')
      : customInState.has(a.id)
        ? pc.cyan('configured')
        : pc.white('available');
    console.log(`    ${pc.cyan(a.id.padEnd(35))} ${String(toolCount).padStart(3)} tools  [${tag}]`);
    if (a.description) console.log(`    ${pc.white((' ').repeat(35))} ${pc.white(a.description.slice(0, 70))}`);
    console.log('');
  }

  const unconfigured = shown.filter(a => !CURATED_IDS.includes(a.id) && !customInState.has(a.id));
  if (unconfigured.length > 0) {
    console.log(`  ${pc.white('Add one:')}  ${pc.cyan(`legion add ${unconfigured[0].id}`)}`);
    console.log('');
  }
}

// ─── legion configure ───────────────────────────────────────

async function cmdConfigure(): Promise<void> {
  const p = await import('@clack/prompts');
  const pc = (await import('picocolors')).default;

  console.log('');
  p.intro(pc.bgCyan(pc.black(' Legion Configure — Connect Your APIs ')));

  const all = await loadAllAdapters();

  // Step 1: Where to look for credentials
  const scanTargets = await p.multiselect({
    message: 'Where should Legion look for existing credentials?',
    options: [
      { value: 'epic-ai', label: '~/.epic-ai/.env', hint: 'Legion\'s credential store' },
      { value: 'home', label: '~/.env', hint: 'home directory env file' },
      { value: 'cwd', label: '.env in current directory', hint: `${process.cwd()}/.env` },
    ],
    initialValues: ['epic-ai'],
    required: true,
  });
  if (p.isCancel(scanTargets)) { p.cancel('Cancelled.'); process.exit(0); }

  // Step 2: Scan and match
  const s = p.spinner();
  s.start('Scanning for credentials');

  const foundCreds: Record<string, string> = {};

  if ((scanTargets as string[]).includes('epic-ai')) {
    Object.assign(foundCreds, loadCredentials());
  }
  if ((scanTargets as string[]).includes('home')) {
    const p2 = join(homedir(), '.env');
    if (existsSync(p2)) {
      const lines = readFileSync(p2, 'utf-8').split('\n');
      for (const line of lines) {
        const eq = line.indexOf('=');
        if (eq > 0) foundCreds[line.slice(0, eq)] = line.slice(eq + 1);
      }
    }
  }
  if ((scanTargets as string[]).includes('cwd')) {
    const p3 = join(process.cwd(), '.env');
    if (existsSync(p3)) {
      const lines = readFileSync(p3, 'utf-8').split('\n');
      for (const line of lines) {
        const eq = line.indexOf('=');
        if (eq > 0) foundCreds[line.slice(0, eq)] = line.slice(eq + 1);
      }
    }
  }

  s.stop('Scan complete');

  // Match credentials to adapters
  const matched: Array<{ adapter: AdapterEntry; key: string }> = [];
  for (const adapter of all) {
    if (CURATED_IDS.includes(adapter.id)) continue; // skip curated — already configured
    const envKey = adapter.rest?.envKey;
    if (envKey && foundCreds[envKey]) {
      matched.push({ adapter, key: envKey });
    } else if (adapter.mcp?.envKeys) {
      for (const k of adapter.mcp.envKeys) {
        if (foundCreds[k]) { matched.push({ adapter, key: k }); break; }
      }
    }
  }

  if (matched.length === 0) {
    p.log.info('No matching credentials found in scanned locations.');
  } else {
    p.note(
      matched.map(m => `  ${pc.green(m.key.padEnd(30))} → ${pc.cyan(m.adapter.name)}`).join('\n'),
      `Found ${matched.length} credential${matched.length !== 1 ? 's' : ''}`
    );

    // Step 3: Confirm which to wire
    const toWire = await p.multiselect({
      message: 'Wire these adapters?',
      options: matched.map(m => ({
        value: m.adapter.id,
        label: m.adapter.name,
        hint: `${m.key} → ${m.adapter.description?.slice(0, 50) || m.adapter.id}`,
      })),
      initialValues: matched.map(m => m.adapter.id),
      required: false,
    });
    if (p.isCancel(toWire)) { p.cancel('Cancelled.'); process.exit(0); }

    // Step 4: Write to state and config
    const state = loadState();
    const config = loadConfig() || { selectedAdapters: [], secretsProvider: 'manual', aiClient: 'unknown' };

    for (const id of (toWire as string[])) {
      const m = matched.find(x => x.adapter.id === id)!;
      // Copy credential to ~/.epic-ai/.env if it came from elsewhere
      writeCredential(m.key, foundCreds[m.key]);
      state.adapters[id] = { type: m.adapter.type || 'unknown', status: 'configured', toolCount: m.adapter.rest?.toolCount || 0, lastVerified: null };
      if (!config.selectedAdapters.includes(id)) config.selectedAdapters.push(id);
    }
    saveState(state);
    saveConfig(config);

    if ((toWire as string[]).length > 0) {
      p.log.success(`${(toWire as string[]).length} adapter${(toWire as string[]).length !== 1 ? 's' : ''} configured.`);
    }
  }

  // Step 5: Add more manually?
  const addMore = await p.confirm({ message: 'Add adapters manually?', initialValue: false });
  if (!p.isCancel(addMore) && addMore) {
    const name = await p.text({ message: 'Adapter ID (run "legion search <term>" to find one):' });
    if (!p.isCancel(name) && name) {
      await cmdAdd(name);
    }
  }

  p.outro(`${pc.green('Done.')} Run ${pc.cyan('legion list')} to see your configured adapters.`);
}

// ─── legion query ───────────────────────────────────────────

async function cmdQuery(query: string): Promise<void> {
  const pc = (await import('picocolors')).default;
  const p = await import('@clack/prompts');

  const all = await loadAllAdapters();
  const state = loadState();
  const creds = loadCredentials();
  const config = loadConfig();

  // Determine configured adapters (same logic as MCP server mode)
  const configuredIds = new Set<string>();
  for (const adapter of all) {
    const hasCredential = adapter.rest?.envKey ? !!creds[adapter.rest.envKey] : false;
    const hasMcpKeys = adapter.mcp?.envKeys?.some(k => !!creds[k]) ?? false;
    const isSelected = config?.selectedAdapters?.includes(adapter.id) ?? false;
    const isInState = !!state.adapters[adapter.id];
    if (hasCredential || hasMcpKeys || isSelected || isInState) {
      configuredIds.add(adapter.id);
    }
  }

  const configured = all.filter(a => configuredIds.has(a.id));
  if (configured.length === 0) {
    console.log(`\n  No adapters configured. Run ${pc.cyan('legion')} to set up.\n`);
    process.exit(1);
  }

  // Route the query using ToolPreFilter (same engine as MCP server)
  const { ToolPreFilter } = await import('../federation/ToolPreFilter.js');
  const filter = new ToolPreFilter();
  filter.index(buildToolsForRouting(configured));

  // Load vector index if available
  try {
    const vectorPath = join(getPackageRoot(), 'vector-index.json');
    const vectorRaw = await readFile(vectorPath, 'utf-8');
    const vectorRecords = JSON.parse(vectorRaw);
    filter.loadVectorIndex(vectorRecords);
  } catch { /* no vector index — BM25 only */ }

  const matches = await filter.select(query, { maxTools: 5, maxPerServer: 2 });

  if (matches.length === 0) {
    console.log(`\n  No adapters matched "${query}".`);
    console.log(`  You have ${configured.length} configured adapters. Try a different query.\n`);
    return;
  }

  const topServer = matches[0].server;
  const topToolFull = matches[0].name; // "adapterId:toolName"
  const topToolName = topToolFull.includes(':') ? topToolFull.split(':').slice(1).join(':') : topToolFull;
  const adapter = all.find(a => a.id === topServer);

  if (!adapter) {
    console.log(`\n  Matched adapter "${topServer}" but it's not in the catalog.\n`);
    return;
  }

  const s = p.spinner();
  s.start(`Routing to ${adapter.name} → ${topToolName}`);

  // Call the adapter
  try {
    let resultText = '';

    if (adapter.mcp?.transport === 'streamable-http' && adapter.mcp?.url) {
      const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
      const { StreamableHTTPClientTransport } = await import('@modelcontextprotocol/sdk/client/streamableHttp.js');
      const transport = new StreamableHTTPClientTransport(new URL(adapter.mcp.url));
      const client = new Client({ name: 'legion', version: '1.0' }, { capabilities: {} });
      await client.connect(transport);
      const result = await client.callTool({ name: topToolName === 'default' ? (adapter.rest?.toolNames?.[0] || topToolName) : topToolName, arguments: { query } });
      await client.close();
      resultText = (result.content as Array<{ type: string; text?: string }>).filter(c => c.type === 'text').map(c => c.text || '').join('\n');
    } else if (adapter.mcp?.transport === 'stdio' && adapter.mcp?.command) {
      const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
      const { StdioClientTransport } = await import('@modelcontextprotocol/sdk/client/stdio.js');
      const transport = new StdioClientTransport({ command: adapter.mcp.command, args: adapter.mcp.args || [] });
      const client = new Client({ name: 'legion', version: '1.0' }, { capabilities: {} });
      await client.connect(transport);
      const result = await client.callTool({ name: topToolName, arguments: { query } });
      await client.close();
      resultText = (result.content as Array<{ type: string; text?: string }>).filter(c => c.type === 'text').map(c => c.text || '').join('\n');
    } else if (adapter.rest?.module && adapter.rest?.className) {
      const modulePath = join(getPackageRoot(), adapter.rest.module);
      const mod = await import(modulePath);
      const AdapterClass = mod[adapter.rest.className] || mod.default;
      const adapterConfig: Record<string, string> = {};
      if (adapter.rest.envKey && creds[adapter.rest.envKey]) adapterConfig.apiKey = creds[adapter.rest.envKey];
      if (adapter.rest.baseUrl) adapterConfig.baseUrl = adapter.rest.baseUrl;
      const instance = new AdapterClass(adapterConfig);
      const result = await instance.callTool(topToolName, { query });
      resultText = typeof result.content === 'string' ? result.content : JSON.stringify(result.content);
    } else {
      s.stop(`${pc.yellow('!')} No executable transport for ${adapter.name}`);
      return;
    }

    s.stop(`${pc.green('✓')} ${adapter.name} → ${topToolName}`);

    // Print result (truncate if huge)
    const lines = resultText.split('\n');
    if (lines.length > 30) {
      console.log('\n' + lines.slice(0, 30).join('\n'));
      console.log(pc.white(`\n  ... ${lines.length - 30} more lines. Full result returned above.`));
    } else {
      console.log('\n' + resultText);
    }
    console.log('');
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    s.stop(`${pc.red('✗')} ${adapter.name} — ${msg}`);
  }
}

// ─── legion help ────────────────────────────────────────────

async function cmdHelp(): Promise<void> {
  const pc = (await import('picocolors')).default;
  console.log('');
  console.log(`  ${pc.bold('Epic AI® Legion')} — Intelligent Virtual Assistant (IVA)`);
  console.log('');
  console.log(`  ${pc.bold('Commands:')}`);
  console.log('');
  console.log(`    ${pc.cyan('legion')}                       run the setup wizard`);
  console.log(`    ${pc.cyan('legion query "<question>"')}    route a question to your adapters and return results`);
  console.log(`    ${pc.cyan('legion list')}                  show Curated + Custom adapters`);
  console.log(`    ${pc.cyan('legion search [term]')}         search all available adapters`);
  console.log(`    ${pc.cyan('legion add <id>')}              add an adapter and enter credentials`);
  console.log(`    ${pc.cyan('legion remove <id>')}           remove an adapter`);
  console.log(`    ${pc.cyan('legion configure')}             connect your APIs and credentials`);
  console.log(`    ${pc.cyan('legion health')}                check adapter status`);
  console.log(`    ${pc.cyan('legion serve')}                 start as MCP server (used by AI clients)`);
  console.log(`    ${pc.cyan('legion help')}                  show this help`);
  console.log('');
  console.log(`  ${pc.white('Docs:')}  https://legion.epic-ai.io`);
  console.log('');
}

// ─── Setup Wizard ───────────────────────────────────────────

async function runSetupWizard(): Promise<void> {
  const p = await import('@clack/prompts');
  const pc = (await import('picocolors')).default;

  console.log('');
  p.note(
    `35,835 tools. One self-hosted MCP server.\nYour context window only loads what the query needs.`,
    pc.bgCyan(pc.black(' Epic AI® Legion '))
  );

  const s = p.spinner();

  // Step 1: System detection
  s.start('Detecting your system');
  const system = await detectSystem();
  const allAdapters = await loadAllAdapters();
  s.stop('System detected');

  const detectedClients = system.mcpClients.filter(c => c.detected);
  const hasLocalLLM = system.localBackend !== null;

  p.note(
    [
      `${pc.green('✓')} Node.js ${system.nodeVersion}`,
      `${pc.green('✓')} ${system.platform} / ${system.arch}`,
      hasLocalLLM ? `${pc.green('✓')} ${system.localBackend} running on port ${system.localPort}` : `${pc.white('○')} No local LLM detected`,
      `${pc.green('✓')} ${allAdapters.length} adapters available`,
      `${pc.green('✓')} ${detectedClients.length} AI client${detectedClients.length !== 1 ? 's' : ''} detected`,
    ].join('\n'),
    'System'
  );

  // Step 2: AI client detection + config
  let configuredClients: string[] = [];

  if (detectedClients.length === 0 && !hasLocalLLM) {
    p.log.warning('No AI clients or local LLMs detected.');
    p.note(
      [
        'Install an MCP-compatible AI client:',
        '',
        `  ${pc.cyan('Claude Code')}   — npm install -g @anthropic-ai/claude-code`,
        `  ${pc.cyan('Cursor')}        — cursor.com`,
        `  ${pc.cyan('VS Code')}       — code.visualstudio.com + Copilot`,
        `  ${pc.cyan('Windsurf')}      — windsurf.com`,
        '',
        'Or install a local LLM:',
        '',
        `  ${pc.cyan('llama.cpp')}     — brew install llama.cpp`,
        `  ${pc.cyan('Ollama')}        — brew install ollama`,
      ].join('\n'),
      'Getting started'
    );
    const cont = await p.confirm({ message: 'Continue anyway? (you can configure clients later)', initialValue: false });
    if (p.isCancel(cont) || !cont) { p.cancel('Install an AI client and re-run.'); process.exit(0); }
  } else if (detectedClients.length > 0) {
    // Build options — detected clients pre-checked, plus local LLM option
    const clientOptions = detectedClients.map(c => ({
      value: c.id,
      label: c.name,
      hint: c.hint || c.configPath.replace(homedir(), '~'),
    }));

    if (hasLocalLLM) {
      clientOptions.push({
        value: 'local',
        label: `Local SLM (${system.localBackend} on port ${system.localPort})`,
        hint: 'No cloud LLM needed',
      });
    }

    const selectedClients = await p.multiselect({
      message: `Configure Legion for these AI clients? (Space to toggle, Enter to confirm)`,
      options: clientOptions,
      initialValues: detectedClients.map(c => c.id), // all detected pre-selected
      required: false,
    });
    if (p.isCancel(selectedClients)) { p.cancel('Setup cancelled.'); process.exit(0); }

    // Write configs for selected clients
    const writeResults: string[] = [];
    for (const clientId of selectedClients) {
      if (clientId === 'local') continue; // handled separately
      const client = system.mcpClients.find(c => c.id === clientId);
      if (!client) continue;

      const autoWrite = await p.confirm({
        message: `Write Legion to ${client.name} config? (${client.configPath.replace(homedir(), '~')})`,
        initialValue: true,
      });

      if (p.isCancel(autoWrite)) continue;

      if (autoWrite) {
        const result = writeMcpConfig(client);
        if (result.success) {
          if (result.error === 'already configured') {
            writeResults.push(`${pc.green('✓')} ${client.name} — already configured`);
          } else {
            writeResults.push(`${pc.green('✓')} ${client.name} — configured`);
          }
          configuredClients.push(clientId);
        } else {
          writeResults.push(`${pc.yellow('!')} ${client.name} — ${result.error}`);
        }
      } else {
        // Show the JSON for manual copy
        const serverEntry = { legion: { command: 'npx', args: ['@epicai/legion', '--serve'] } };
        const configStr = JSON.stringify({ [client.configKey]: serverEntry }, null, 2);
        p.note(
          [
            `Add this to ${pc.cyan(client.configPath.replace(homedir(), '~'))}:`,
            '',
            pc.white('─'.repeat(42)),
            configStr,
            pc.white('─'.repeat(42)),
          ].join('\n'),
          `${client.name} — manual config`
        );
        configuredClients.push(clientId);
      }
    }

    if (writeResults.length > 0) {
      p.note(writeResults.join('\n'), 'MCP Clients Configured');
    }

    // Handle local SLM if selected
    if (selectedClients.includes('local')) {
      p.log.success(`Using ${system.localBackend} on port ${system.localPort}`);
      configuredClients.push('local');
    }

    if (configuredClients.length === 0) {
      p.note(
        [
          `Add adapters later:  ${pc.cyan('npx @epicai/legion add <name>')}`,
          `Check health:        ${pc.cyan('npx @epicai/legion health')}`,
          `List all adapters:   ${pc.cyan('npx @epicai/legion list')}`,
        ].join('\n'),
        'Quick reference'
      );
      saveConfig({ selectedAdapters: [], secretsProvider: 'manual', aiClient: 'none' });
      p.outro(`${pc.green('Done.')} Configure your AI clients and run this wizard again.\n  Your credentials never leave this machine.`);
      return;
    }
  } else if (hasLocalLLM) {
    // Only local LLM detected, no MCP clients
    p.log.success(`Using ${system.localBackend} on port ${system.localPort}`);
    configuredClients.push('local');
  }

  // Step 3: Auto-configure all curated (vetted zero-credential) adapters
  // IMPORTANT: Only add adapters to CURATED after manual vetting — confirm they
  // return real data, contain no adult/inappropriate content, and are stable.
  const CURATED = [
    {
      id: 'com-claude-mcp-pubmed-pubmed',
      name: 'PubMed',
      desc: 'Search 36 million biomedical research papers',
      tools: 7,
      demoQuery: 'Recent clinical trials on GLP-1 drugs for obesity',
      exampleQuery: 'legion query "recent clinical trials on GLP-1 drugs for obesity"',
    },
    {
      id: 'govbase-mcp',
      name: 'Govbase',
      desc: 'Government data — legislators, bills, committees',
      tools: 10,
      demoQuery: 'Who chairs the Senate Armed Services Committee?',
      exampleQuery: 'legion query "who chairs the Senate Armed Services Committee?"',
    },
    {
      id: 'searchcode',
      name: 'Searchcode',
      desc: 'Search 75 billion lines of open source code',
      tools: 6,
      demoQuery: 'Open source implementations of rate limiting in Go',
      exampleQuery: 'legion query "open source implementations of rate limiting in Go"',
    },
    {
      id: 'robtex',
      name: 'Robtex',
      desc: 'Network intelligence — DNS, IP, ASN lookups',
      tools: 45,
      demoQuery: 'DNS records and ASN for cloudflare.com',
      exampleQuery: 'legion query "DNS records and ASN for cloudflare.com"',
    },
  ];

  const s2 = p.spinner();
  s2.start('Configuring curated data sources');

  const state = loadState();
  const curatedAdapterEntries = CURATED.map(c => allAdapters.find(a => a.id === c.id)).filter(Boolean) as AdapterEntry[];
  for (const c of CURATED) {
    const adapter = allAdapters.find(a => a.id === c.id);
    state.adapters[c.id] = {
      type: adapter?.type || 'mcp',
      status: 'configured',
      toolCount: c.tools,
      lastVerified: null,
    };
  }
  saveState(state);
  saveConfig({
    selectedAdapters: CURATED.map(c => c.id),
    secretsProvider: 'manual',
    aiClient: configuredClients.join(','),
    localBackend: system.localBackend || undefined,
  });

  s2.stop('Curated data sources configured');

  p.note(
    CURATED.map(c => `${pc.green('✓')} ${c.name.padEnd(14)} ${String(c.tools).padStart(2)} tools   ${pc.white(c.desc)}`).join('\n'),
    `Curated (${CURATED.length}) — no credentials required`
  );

  // Step 4: Routing demo — prove intelligence in-process, no network calls
  const { ToolPreFilter } = await import('../federation/ToolPreFilter.js');
  const demoFilter = new ToolPreFilter();
  demoFilter.index(buildToolsForRouting(curatedAdapterEntries));

  const routingLines: string[] = [];
  for (const c of CURATED) {
    const matches = await demoFilter.select(c.demoQuery, { maxTools: 3, maxPerServer: 2 });
    const topId = matches[0]?.server;
    const routed = topId === c.id;
    const arrow = routed ? pc.green('→') : pc.yellow('→');
    const adapterLabel = routed ? pc.green(c.name) : pc.yellow(topId || '?');
    routingLines.push(`  ${pc.white(`"${c.demoQuery.slice(0, 48)}${c.demoQuery.length > 48 ? '…' : ''}"`)}`);
    routingLines.push(`  ${arrow} ${adapterLabel}`);
    routingLines.push('');
  }

  p.note(routingLines.join('\n').trimEnd(), 'Routing intelligence');

  // Step 5: Outro — hand off to shell
  p.note(
    [
      pc.bold('Try these yourself:'),
      '',
      ...CURATED.map(c => `  ${pc.cyan(c.exampleQuery)}`),
    ].join('\n'),
    'Test it'
  );

  p.note(
    [
      `  ${pc.cyan('legion configure')}   connect your APIs and credentials`,
      `  ${pc.cyan('legion help')}        see all commands`,
    ].join('\n'),
    'When you\'re ready to connect your own APIs'
  );

  p.outro(`${pc.green('Legion is ready.')} Your data never leaves this machine.`);
}

// ─── Main router ────────────────────────────────────────────

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];

  if (args.includes('--serve')) {
    await startMcpServer();
    return;
  }

  switch (command) {
    case 'add':
      if (!args[1]) { console.error('Usage: legion add <adapter-id>  (run "legion search <term>" to find one)'); process.exit(1); }
      await cmdAdd(args[1]);
      break;
    case 'remove':
      if (!args[1]) { console.error('Usage: legion remove <adapter-id>'); process.exit(1); }
      await cmdRemove(args[1]);
      break;
    case 'health':
      await cmdHealth();
      break;
    case 'list':
      await cmdList();
      break;
    case 'search':
      await cmdSearch(args[1]);
      break;
    case 'configure':
      await cmdConfigure();
      break;
    case 'help':
    case '--help':
    case '-h':
      await cmdHelp();
      break;
    case 'query': {
      const q = args.slice(1).join(' ');
      if (!q) { console.error('Usage: legion query "<question>"'); process.exit(1); }
      await cmdQuery(q);
      break;
    }
    case 'serve':
      await startMcpServer();
      break;
    default:
      await runSetupWizard();
      break;
  }
}

main().catch(err => {
  console.error('Legion error:', err.message || err);
  process.exit(1);
});
