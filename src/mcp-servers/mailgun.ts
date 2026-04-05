/**
 * Mailgun MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/mailgun/mailgun-mcp-server — transport: stdio, auth: API key env var (MAILGUN_API_KEY)
// Vendor MCP is official (published by mailgun org), actively maintained (last commit Mar 17 2026),
// exposes 50+ operations across Sending, Domains, Analytics, Templates, Suppressions, Webhooks,
// Routes, Mailing Lists, IPs, Tracking. Meets all 4 MCP criteria.
// Our adapter covers: 16 tools. Vendor MCP covers: 50+ tools.
//
// OVERLAP ANALYSIS:
//   Shared (in both MCP and our adapter): send_email, send_mime_email, list_domains, get_domain,
//     create_domain, delete_domain, verify_domain, get_events, get_stats, list_bounces,
//     delete_bounce, list_unsubscribes, create_unsubscribe, delete_unsubscribe, list_routes,
//     create_route
//   MCP-only (50+ total — examples): list_mailing_lists, create_mailing_list,
//     list_mailing_list_members, create_mailing_list_member, list_templates, create_template,
//     list_webhooks, create_webhook, get_ip_pools, query_metrics, get_bounce_classification,
//     list_complaints, create_complaint, delete_complaint, list_allowlist, create_allowlist,
//     delete_allowlist, and many more (analytics, tracking config, stored messages, etc.)
//   API-only: none — vendor MCP is a superset of our REST adapter
//   Ours-only: none — all 16 tools map to verified API endpoints
//
// Integration: use-both
// MCP-sourced tools: all 50+ MCP tools (templates, webhooks, mailing lists, metrics, IPs, etc.)
// REST-sourced tools (16): send_email, send_mime_email, list_domains, get_domain, create_domain,
//   delete_domain, verify_domain, get_events, get_stats, list_bounces, delete_bounce,
//   list_unsubscribes, create_unsubscribe, delete_unsubscribe, list_routes, create_route
// Combined coverage: 50+ tools (MCP superset; REST adapter provides air-gapped fallback for the 16 core ops)
// Note: Our REST adapter is NOT redundant — it serves air-gapped deployments and provides
//   deterministic tool routing without spawning a subprocess. FederationManager routes shared
//   tools through MCP by default when MCP is available.
//
// Base URL: https://api.mailgun.net (US) or https://api.eu.mailgun.net (EU); methods append /v3/ or /v4/ per endpoint
// Auth: HTTP Basic auth — username "api", password is the Mailgun API key
// Docs: https://documentation.mailgun.com/docs/mailgun/api-reference/api-overview
// Rate limits: Domains API: 300 req/min per account. Events: 300/min. Tags: 1,000/min.
//              Suppressions: 10,000/min. Routes: 1,000/min.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface MailgunConfig {
  apiKey: string;
  domain?: string;          // default sending domain
  baseUrl?: string;         // override for EU: https://api.eu.mailgun.net
}

export class MailgunMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly domain: string;
  private readonly baseUrl: string;

  constructor(config: MailgunConfig) {
    super();
    this.apiKey = config.apiKey;
    this.domain = config.domain ?? '';
    this.baseUrl = (config.baseUrl ?? 'https://api.mailgun.net').replace(/\/$/, '');
  }

  static catalog() {
    return {
      name: 'mailgun',
      displayName: 'Mailgun',
      version: '1.0.0',
      category: 'communication',
      keywords: [
        'mailgun', 'sinch', 'email', 'send email', 'transactional email', 'smtp', 'domain',
        'bounce', 'unsubscribe', 'suppression', 'spam', 'route', 'template', 'event',
        'delivery', 'webhook', 'tracking', 'open rate', 'click rate',
      ],
      toolNames: [
        'send_email', 'send_mime_email',
        'list_domains', 'get_domain', 'create_domain', 'delete_domain', 'verify_domain',
        'get_events', 'get_stats',
        'list_bounces', 'delete_bounce',
        'list_unsubscribes', 'create_unsubscribe', 'delete_unsubscribe',
        'list_routes', 'create_route',
      ],
      description: 'Mailgun email delivery: send transactional emails, manage sending domains, query delivery events, handle bounces and unsubscribes, and configure routing rules.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'send_email',
        description: 'Send a transactional email via Mailgun with optional CC, BCC, attachments, and tracking options',
        inputSchema: {
          type: 'object',
          properties: {
            domain: {
              type: 'string',
              description: 'Sending domain (e.g. mg.example.com). Uses configured default if omitted.',
            },
            from: {
              type: 'string',
              description: 'Sender address (e.g. "Acme <noreply@mg.example.com>")',
            },
            to: {
              type: 'string',
              description: 'Recipient address or comma-separated list of recipients',
            },
            subject: {
              type: 'string',
              description: 'Email subject line',
            },
            text: {
              type: 'string',
              description: 'Plain-text body (at least one of text or html is required)',
            },
            html: {
              type: 'string',
              description: 'HTML body',
            },
            cc: {
              type: 'string',
              description: 'CC recipients, comma-separated',
            },
            bcc: {
              type: 'string',
              description: 'BCC recipients, comma-separated',
            },
            reply_to: {
              type: 'string',
              description: 'Reply-To address',
            },
            tag: {
              type: 'string',
              description: 'Tag to categorize the message (max 3 tags, comma-separated)',
            },
            tracking: {
              type: 'boolean',
              description: 'Enable open and click tracking (default: account setting)',
            },
            template: {
              type: 'string',
              description: 'Name of a stored Mailgun template to use as the body',
            },
            template_version: {
              type: 'string',
              description: 'Template version tag (default: active version)',
            },
          },
          required: ['from', 'to', 'subject'],
        },
      },
      {
        name: 'send_mime_email',
        description: 'Send an email by providing a raw MIME message string — useful when your application already constructs MIME',
        inputSchema: {
          type: 'object',
          properties: {
            domain: {
              type: 'string',
              description: 'Sending domain. Uses configured default if omitted.',
            },
            to: {
              type: 'string',
              description: 'Recipient address or comma-separated list',
            },
            message: {
              type: 'string',
              description: 'Full MIME message string (RFC 2822)',
            },
          },
          required: ['to', 'message'],
        },
      },
      {
        name: 'list_domains',
        description: 'List all sending domains registered on the Mailgun account with status and DNS verification info',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of domains to return (default: 100)',
            },
            skip: {
              type: 'number',
              description: 'Number of domains to skip for pagination (default: 0)',
            },
          },
        },
      },
      {
        name: 'get_domain',
        description: 'Get details and DNS records for a specific Mailgun sending domain',
        inputSchema: {
          type: 'object',
          properties: {
            domain: {
              type: 'string',
              description: 'Domain name to retrieve (e.g. mg.example.com)',
            },
          },
          required: ['domain'],
        },
      },
      {
        name: 'create_domain',
        description: 'Add a new sending domain to Mailgun with optional DKIM key size and spam action settings',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Domain name to add (e.g. mg.example.com)',
            },
            smtp_password: {
              type: 'string',
              description: 'Password for SMTP credentials (min 5 chars)',
            },
            spam_action: {
              type: 'string',
              description: 'Spam handling: disabled (default), block, or tag',
            },
            dkim_key_size: {
              type: 'number',
              description: 'DKIM key size in bits: 1024 or 2048 (default: 1024)',
            },
            wildcard: {
              type: 'boolean',
              description: 'Enable wildcard subdomain sending (default: false)',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'delete_domain',
        description: 'Remove a sending domain from Mailgun — all associated credentials and routes will be deleted',
        inputSchema: {
          type: 'object',
          properties: {
            domain: {
              type: 'string',
              description: 'Domain name to delete',
            },
          },
          required: ['domain'],
        },
      },
      {
        name: 'verify_domain',
        description: 'Trigger a DNS verification check for a domain and return updated DNS record status',
        inputSchema: {
          type: 'object',
          properties: {
            domain: {
              type: 'string',
              description: 'Domain name to verify',
            },
          },
          required: ['domain'],
        },
      },
      {
        name: 'get_events',
        description: 'Query the Mailgun event log for delivery, bounce, open, click, and complaint events with filtering',
        inputSchema: {
          type: 'object',
          properties: {
            domain: {
              type: 'string',
              description: 'Domain to query events for. Uses configured default if omitted.',
            },
            event: {
              type: 'string',
              description: 'Filter by event type: accepted, rejected, delivered, failed, opened, clicked, unsubscribed, complained, stored',
            },
            recipient: {
              type: 'string',
              description: 'Filter by recipient email address',
            },
            begin: {
              type: 'string',
              description: 'Start of time range as RFC 2822 date or Unix timestamp',
            },
            end: {
              type: 'string',
              description: 'End of time range as RFC 2822 date or Unix timestamp',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of events to return (default: 100, max: 300)',
            },
            severity: {
              type: 'string',
              description: 'For failed events — filter by severity: temporary or permanent',
            },
          },
        },
      },
      {
        name: 'get_stats',
        description: 'Get aggregated email delivery statistics by event type and time period for a domain',
        inputSchema: {
          type: 'object',
          properties: {
            domain: {
              type: 'string',
              description: 'Domain to get stats for. Uses configured default if omitted.',
            },
            event: {
              type: 'string',
              description: 'Comma-separated event types: accepted, delivered, failed, opened, clicked, unsubscribed, complained (default: all)',
            },
            start: {
              type: 'string',
              description: 'Start date for stats (default: 7 days ago)',
            },
            end: {
              type: 'string',
              description: 'End date for stats (default: now)',
            },
            resolution: {
              type: 'string',
              description: 'Aggregation period: hour, day, or month (default: day)',
            },
            duration: {
              type: 'string',
              description: 'Time duration string (e.g. 7d, 24h) — alternative to start/end',
            },
          },
        },
      },
      {
        name: 'list_bounces',
        description: 'List email addresses that permanently bounced, preventing future delivery from this domain',
        inputSchema: {
          type: 'object',
          properties: {
            domain: {
              type: 'string',
              description: 'Domain to list bounces for. Uses configured default if omitted.',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of bounce records to return (default: 100)',
            },
            page: {
              type: 'string',
              description: 'Pagination token — use the p value from a previous response',
            },
          },
        },
      },
      {
        name: 'delete_bounce',
        description: 'Remove an email address from the bounce list so it can receive mail again',
        inputSchema: {
          type: 'object',
          properties: {
            domain: {
              type: 'string',
              description: 'Domain to remove the bounce from. Uses configured default if omitted.',
            },
            address: {
              type: 'string',
              description: 'Email address to remove from the bounce list',
            },
          },
          required: ['address'],
        },
      },
      {
        name: 'list_unsubscribes',
        description: 'List email addresses that unsubscribed from a domain or tag',
        inputSchema: {
          type: 'object',
          properties: {
            domain: {
              type: 'string',
              description: 'Domain to list unsubscribes for. Uses configured default if omitted.',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of records to return (default: 100)',
            },
            page: {
              type: 'string',
              description: 'Pagination token from a previous response',
            },
          },
        },
      },
      {
        name: 'create_unsubscribe',
        description: 'Add an email address to the unsubscribe list to prevent future emails from a domain or tag',
        inputSchema: {
          type: 'object',
          properties: {
            domain: {
              type: 'string',
              description: 'Domain to suppress the address on. Uses configured default if omitted.',
            },
            address: {
              type: 'string',
              description: 'Email address to unsubscribe',
            },
            tag: {
              type: 'string',
              description: 'Tag to unsubscribe from (default: * which unsubscribes from all)',
            },
          },
          required: ['address'],
        },
      },
      {
        name: 'delete_unsubscribe',
        description: 'Remove an email address from the unsubscribe list so it can receive mail again',
        inputSchema: {
          type: 'object',
          properties: {
            domain: {
              type: 'string',
              description: 'Domain to remove the unsubscribe from. Uses configured default if omitted.',
            },
            address: {
              type: 'string',
              description: 'Email address to re-subscribe',
            },
          },
          required: ['address'],
        },
      },
      {
        name: 'list_routes',
        description: 'List inbound email routing rules that filter and forward incoming messages',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of routes to return (default: 100)',
            },
            skip: {
              type: 'number',
              description: 'Number of routes to skip for pagination (default: 0)',
            },
          },
        },
      },
      {
        name: 'create_route',
        description: 'Create an inbound routing rule to forward, store, or stop incoming emails matching a filter expression',
        inputSchema: {
          type: 'object',
          properties: {
            priority: {
              type: 'number',
              description: 'Route priority — lower number = higher priority (default: 0)',
            },
            description: {
              type: 'string',
              description: 'Human-readable label for this route',
            },
            expression: {
              type: 'string',
              description: 'Filter expression (e.g. match_recipient(".*@mg.example.com") or match_header("subject", "Order.*"))',
            },
            action: {
              type: 'string',
              description: 'Comma-separated actions: forward("url"), store(), stop(). Example: forward("https://example.com/receive"),stop()',
            },
          },
          required: ['expression', 'action'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'send_email':
          return this.sendEmail(args);
        case 'send_mime_email':
          return this.sendMimeEmail(args);
        case 'list_domains':
          return this.listDomains(args);
        case 'get_domain':
          return this.getDomain(args);
        case 'create_domain':
          return this.createDomain(args);
        case 'delete_domain':
          return this.deleteDomain(args);
        case 'verify_domain':
          return this.verifyDomain(args);
        case 'get_events':
          return this.getEvents(args);
        case 'get_stats':
          return this.getStats(args);
        case 'list_bounces':
          return this.listBounces(args);
        case 'delete_bounce':
          return this.deleteBounce(args);
        case 'list_unsubscribes':
          return this.listUnsubscribes(args);
        case 'create_unsubscribe':
          return this.createUnsubscribe(args);
        case 'delete_unsubscribe':
          return this.deleteUnsubscribe(args);
        case 'list_routes':
          return this.listRoutes(args);
        case 'create_route':
          return this.createRoute(args);
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

  private get authHeader(): string {
    return `Basic ${btoa(`api:${this.apiKey}`)}`;
  }

  private resolveDomain(args: Record<string, unknown>): string | null {
    return (args.domain as string | undefined) ?? (this.domain || null);
  }

  private async apiGet(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      headers: { Authorization: this.authHeader },
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiPost(path: string, form: Record<string, string>): Promise<ToolResult> {
    const body = new URLSearchParams(form);
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        Authorization: this.authHeader,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });
    if (!response.ok) {
      const err = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error: ${response.status} ${err}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async apiDelete(path: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'DELETE',
      headers: { Authorization: this.authHeader },
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async sendEmail(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.from || !args.to || !args.subject) {
      return { content: [{ type: 'text', text: 'from, to, and subject are required' }], isError: true };
    }
    const domain = this.resolveDomain(args);
    if (!domain) return { content: [{ type: 'text', text: 'domain is required (or set a default domain in config)' }], isError: true };

    const form: Record<string, string> = {
      from: args.from as string,
      to: args.to as string,
      subject: args.subject as string,
    };
    if (args.text) form.text = args.text as string;
    if (args.html) form.html = args.html as string;
    if (args.cc) form.cc = args.cc as string;
    if (args.bcc) form.bcc = args.bcc as string;
    if (args.reply_to) form['h:Reply-To'] = args.reply_to as string;
    if (args.tag) form['o:tag'] = args.tag as string;
    if (typeof args.tracking === 'boolean') form['o:tracking'] = args.tracking ? 'yes' : 'no';
    if (args.template) form.template = args.template as string;
    if (args.template_version) form['t:version'] = args.template_version as string;

    return this.apiPost(`/v3/${domain}/messages`, form);
  }

  private async sendMimeEmail(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.to || !args.message) {
      return { content: [{ type: 'text', text: 'to and message are required' }], isError: true };
    }
    const domain = this.resolveDomain(args);
    if (!domain) return { content: [{ type: 'text', text: 'domain is required' }], isError: true };

    // Multipart/form-data required for MIME send — encode as form-data via URLSearchParams
    const form: Record<string, string> = {
      to: args.to as string,
      message: args.message as string,
    };
    return this.apiPost(`/v3/${domain}/messages.mime`, form);
  }

  private async listDomains(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.set('limit', String((args.limit as number) ?? 100));
    if (args.skip) params.set('skip', String(args.skip));
    return this.apiGet(`/v3/domains?${params.toString()}`);
  }

  private async getDomain(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.domain) return { content: [{ type: 'text', text: 'domain is required' }], isError: true };
    return this.apiGet(`/v3/domains/${encodeURIComponent(args.domain as string)}`);
  }

  private async createDomain(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    const form: Record<string, string> = { name: args.name as string };
    if (args.smtp_password) form.smtp_password = args.smtp_password as string;
    if (args.spam_action) form.spam_action = args.spam_action as string;
    if (args.dkim_key_size) form.dkim_key_size = String(args.dkim_key_size);
    if (typeof args.wildcard === 'boolean') form.wildcard = String(args.wildcard);
    return this.apiPost('/v3/domains', form);
  }

  private async deleteDomain(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.domain) return { content: [{ type: 'text', text: 'domain is required' }], isError: true };
    return this.apiDelete(`/v3/domains/${encodeURIComponent(args.domain as string)}`);
  }

  private async verifyDomain(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.domain) return { content: [{ type: 'text', text: 'domain is required' }], isError: true };
    // Vendor docs: PUT /v4/domains/{name}/verify (not POST, not v3)
    const response = await this.fetchWithRetry(`${this.baseUrl.replace('/v3', '')}/v4/domains/${encodeURIComponent(args.domain as string)}/verify`, {
      method: 'PUT',
      headers: { Authorization: this.authHeader },
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async getEvents(args: Record<string, unknown>): Promise<ToolResult> {
    const domain = this.resolveDomain(args);
    if (!domain) return { content: [{ type: 'text', text: 'domain is required' }], isError: true };
    const params = new URLSearchParams();
    if (args.event) params.set('event', args.event as string);
    if (args.recipient) params.set('recipient', args.recipient as string);
    if (args.begin) params.set('begin', args.begin as string);
    if (args.end) params.set('end', args.end as string);
    if (args.limit) params.set('limit', String(args.limit));
    if (args.severity) params.set('severity', args.severity as string);
    return this.apiGet(`/v3/${domain}/events?${params.toString()}`);
  }

  private async getStats(args: Record<string, unknown>): Promise<ToolResult> {
    const domain = this.resolveDomain(args);
    if (!domain) return { content: [{ type: 'text', text: 'domain is required' }], isError: true };
    const params = new URLSearchParams();
    if (args.event) params.set('event', args.event as string);
    if (args.start) params.set('start', args.start as string);
    if (args.end) params.set('end', args.end as string);
    if (args.resolution) params.set('resolution', args.resolution as string);
    if (args.duration) params.set('duration', args.duration as string);
    return this.apiGet(`/v3/${domain}/stats/total?${params.toString()}`);
  }

  private async listBounces(args: Record<string, unknown>): Promise<ToolResult> {
    const domain = this.resolveDomain(args);
    if (!domain) return { content: [{ type: 'text', text: 'domain is required' }], isError: true };
    const params = new URLSearchParams();
    params.set('limit', String((args.limit as number) ?? 100));
    if (args.page) params.set('p', args.page as string);
    return this.apiGet(`/v3/${domain}/bounces?${params.toString()}`);
  }

  private async deleteBounce(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.address) return { content: [{ type: 'text', text: 'address is required' }], isError: true };
    const domain = this.resolveDomain(args);
    if (!domain) return { content: [{ type: 'text', text: 'domain is required' }], isError: true };
    return this.apiDelete(`/v3/${domain}/bounces/${encodeURIComponent(args.address as string)}`);
  }

  private async listUnsubscribes(args: Record<string, unknown>): Promise<ToolResult> {
    const domain = this.resolveDomain(args);
    if (!domain) return { content: [{ type: 'text', text: 'domain is required' }], isError: true };
    const params = new URLSearchParams();
    params.set('limit', String((args.limit as number) ?? 100));
    if (args.page) params.set('p', args.page as string);
    return this.apiGet(`/v3/${domain}/unsubscribes?${params.toString()}`);
  }

  private async createUnsubscribe(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.address) return { content: [{ type: 'text', text: 'address is required' }], isError: true };
    const domain = this.resolveDomain(args);
    if (!domain) return { content: [{ type: 'text', text: 'domain is required' }], isError: true };
    const form: Record<string, string> = {
      address: args.address as string,
      tag: (args.tag as string) ?? '*',
    };
    return this.apiPost(`/v3/${domain}/unsubscribes`, form);
  }

  private async deleteUnsubscribe(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.address) return { content: [{ type: 'text', text: 'address is required' }], isError: true };
    const domain = this.resolveDomain(args);
    if (!domain) return { content: [{ type: 'text', text: 'domain is required' }], isError: true };
    return this.apiDelete(`/v3/${domain}/unsubscribes/${encodeURIComponent(args.address as string)}`);
  }

  private async listRoutes(args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    params.set('limit', String((args.limit as number) ?? 100));
    if (args.skip) params.set('skip', String(args.skip));
    return this.apiGet(`/v3/routes?${params.toString()}`);
  }

  private async createRoute(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.expression || !args.action) {
      return { content: [{ type: 'text', text: 'expression and action are required' }], isError: true };
    }
    const form: Record<string, string> = {
      expression: args.expression as string,
      action: args.action as string,
      priority: String((args.priority as number) ?? 0),
    };
    if (args.description) form.description = args.description as string;
    return this.apiPost('/v3/routes', form);
  }
}
