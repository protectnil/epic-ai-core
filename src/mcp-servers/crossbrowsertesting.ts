/**
 * Crossbrowsertesting.com Screenshot Comparisons MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official CrossBrowserTesting MCP server was found on GitHub. We build a full REST wrapper
// for complete Screenshot Comparisons API coverage.
//
// Base URL: https://crossbrowsertesting.com/api/v3
// Auth: HTTP Basic auth (CBT username + API key)
// Docs: https://crossbrowsertesting.com/apidocs/v3/screenshots-comparisons.html
// Spec: https://api.apis.guru/v2/specs/crossbrowsertesting.com/3.0.0/openapi.json
// Category: devops
// Rate limits: See CBT docs

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface CrossBrowserTestingConfig {
  username: string;
  apiKey: string;
  baseUrl?: string;
}

export class CrossBrowserTestingMCPServer extends MCPAdapterBase {
  private readonly username: string;
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: CrossBrowserTestingConfig) {
    super();
    this.username = config.username;
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://crossbrowsertesting.com/api/v3';
  }

  static catalog() {
    return {
      name: 'crossbrowsertesting',
      displayName: 'CrossBrowserTesting Screenshot Comparisons',
      version: '1.0.0',
      category: 'devops',
      keywords: [
        'crossbrowsertesting', 'cbt', 'screenshot', 'comparison', 'browser testing',
        'cross-browser', 'visual regression', 'layout diff', 'ui testing', 'devops',
        'qa', 'test automation', 'screenshot test', 'regression testing',
      ],
      toolNames: [
        'compare_screenshot_test_versions',
        'compare_full_screenshot_test',
        'compare_single_screenshot',
      ],
      description: 'CrossBrowserTesting Screenshot Comparisons API: compare browser screenshots for visual layout differences across test versions and individual results.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Screenshot Comparisons ─────────────────────────────────────────────
      {
        name: 'compare_screenshot_test_versions',
        description: 'Compare all browsers in a target screenshot test version against matching browsers in a base screenshot test version. Each OS/Browser/Resolution pair is matched across test versions — good for regression testing across test runs. Returns an array of comparison results.',
        inputSchema: {
          type: 'object',
          properties: {
            target_screenshot_test_id: {
              type: 'integer',
              description: 'Test ID of the target screenshot test',
            },
            target_version_id: {
              type: 'integer',
              description: 'Version ID of the target screenshot test',
            },
            base_version_id: {
              type: 'integer',
              description: 'Version ID of the base screenshot test to compare against',
            },
            tolerance: {
              type: 'number',
              description: 'Pixel tolerance threshold (0–100) for detecting layout differences. Default is 30px. Lower values catch smaller differences.',
            },
            format: {
              type: 'string',
              description: 'Response format: "json" (default) or "jsonp"',
            },
            callback: {
              type: 'string',
              description: 'JSONP callback method name (only used when format is "jsonp")',
            },
          },
          required: ['target_screenshot_test_id', 'target_version_id', 'base_version_id'],
        },
      },
      {
        name: 'compare_full_screenshot_test',
        description: 'Compare all browsers in a target screenshot test version against a single base screenshot result. This is a one-to-many comparison — every browser in the target version is compared to the same base result.',
        inputSchema: {
          type: 'object',
          properties: {
            target_screenshot_test_id: {
              type: 'integer',
              description: 'Test ID of the target screenshot test',
            },
            target_version_id: {
              type: 'integer',
              description: 'Version ID of the target screenshot test',
            },
            base_result_id: {
              type: 'integer',
              description: 'Result ID of the base screenshot to compare all target browsers against',
            },
            tolerance: {
              type: 'number',
              description: 'Pixel tolerance threshold (0–100) for detecting layout differences. Default is 30px.',
            },
            format: {
              type: 'string',
              description: 'Response format: "json" (default) or "jsonp"',
            },
            callback: {
              type: 'string',
              description: 'JSONP callback method name (only used when format is "jsonp")',
            },
          },
          required: ['target_screenshot_test_id', 'target_version_id', 'base_result_id'],
        },
      },
      {
        name: 'compare_single_screenshot',
        description: 'Compare a single target screenshot result against a single base screenshot result. This is a one-to-one comparison — useful for checking a specific browser configuration against a known-good baseline.',
        inputSchema: {
          type: 'object',
          properties: {
            target_screenshot_test_id: {
              type: 'integer',
              description: 'Test ID of the target screenshot test',
            },
            target_version_id: {
              type: 'integer',
              description: 'Version ID of the target screenshot test',
            },
            target_result_id: {
              type: 'integer',
              description: 'Result ID of the specific target screenshot to compare',
            },
            base_result_id: {
              type: 'integer',
              description: 'Result ID of the base screenshot to compare against',
            },
            tolerance: {
              type: 'number',
              description: 'Pixel tolerance threshold (0–100) for detecting layout differences. Default is 30px.',
            },
            format: {
              type: 'string',
              description: 'Response format: "json" (default) or "jsonp"',
            },
            callback: {
              type: 'string',
              description: 'JSONP callback method name (only used when format is "jsonp")',
            },
          },
          required: ['target_screenshot_test_id', 'target_version_id', 'target_result_id', 'base_result_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'compare_screenshot_test_versions': return this.compareScreenshotTestVersions(args);
        case 'compare_full_screenshot_test':     return this.compareFullScreenshotTest(args);
        case 'compare_single_screenshot':        return this.compareSingleScreenshot(args);
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

  // ── Private helpers ────────────────────────────────────────────────────────

  private get authHeader(): string {
    const encoded = Buffer.from(`${this.username}:${this.apiKey}`).toString('base64');
    return `Basic ${encoded}`;
  }


  private buildQuery(params: Record<string, unknown>): string {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null) q.set(k, String(v));
    }
    const s = q.toString();
    return s ? `?${s}` : '';
  }

  private async request(path: string): Promise<ToolResult> {
    const url = `${this.baseUrl}${path}`;
    const response = await this.fetchWithRetry(url, {
      method: 'GET',
      headers: {
        Authorization: this.authHeader,
        Accept: 'application/json',
      },
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${errText}` }],
        isError: true,
      };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  // ── Screenshot Comparisons ─────────────────────────────────────────────────

  private async compareScreenshotTestVersions(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.target_screenshot_test_id || !args.target_version_id || !args.base_version_id) {
      return {
        content: [{ type: 'text', text: 'target_screenshot_test_id, target_version_id, and base_version_id are required' }],
        isError: true,
      };
    }
    const { target_screenshot_test_id, target_version_id, base_version_id, tolerance, format, callback } = args;
    const query = this.buildQuery({ tolerance, format, callback });
    return this.request(
      `/screenshots/${encodeURIComponent(String(target_screenshot_test_id))}/${encodeURIComponent(String(target_version_id))}/comparison/parallel/${encodeURIComponent(String(base_version_id))}${query}`,
    );
  }

  private async compareFullScreenshotTest(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.target_screenshot_test_id || !args.target_version_id || !args.base_result_id) {
      return {
        content: [{ type: 'text', text: 'target_screenshot_test_id, target_version_id, and base_result_id are required' }],
        isError: true,
      };
    }
    const { target_screenshot_test_id, target_version_id, base_result_id, tolerance, format, callback } = args;
    const query = this.buildQuery({ tolerance, format, callback });
    return this.request(
      `/screenshots/${encodeURIComponent(String(target_screenshot_test_id))}/${encodeURIComponent(String(target_version_id))}/comparison/${encodeURIComponent(String(base_result_id))}${query}`,
    );
  }

  private async compareSingleScreenshot(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.target_screenshot_test_id || !args.target_version_id || !args.target_result_id || !args.base_result_id) {
      return {
        content: [{ type: 'text', text: 'target_screenshot_test_id, target_version_id, target_result_id, and base_result_id are required' }],
        isError: true,
      };
    }
    const { target_screenshot_test_id, target_version_id, target_result_id, base_result_id, tolerance, format, callback } = args;
    const query = this.buildQuery({ tolerance, format, callback });
    return this.request(
      `/screenshots/${encodeURIComponent(String(target_screenshot_test_id))}/${encodeURIComponent(String(target_version_id))}/${encodeURIComponent(String(target_result_id))}/comparison/${encodeURIComponent(String(base_result_id))}${query}`,
    );
  }
}
