/**
 * Postmark Account API MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official Postmark MCP server was found on GitHub or the Postmark developer portal.
//
// Base URL: https://api.postmarkapp.com
// Auth: X-Postmark-Account-Token header (account-level API token from account settings)
// Docs: https://postmarkapp.com/developer/api/account-api
// Rate limits: Not officially documented; standard Postmark rate limits apply per account.
// Note: This adapter covers account-level operations (servers, domains, sender signatures).
//       For sending email, see the Postmark Server API (separate adapter / server token).

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface PostmarkAppAccountConfig {
  /** Postmark Account API token (from Account Settings → API Tokens → Account) */
  accountToken: string;
  /** Optional base URL override */
  baseUrl?: string;
}

export class PostmarkAppAccountMCPServer extends MCPAdapterBase {
  private readonly accountToken: string;
  private readonly baseUrl: string;

  constructor(config: PostmarkAppAccountConfig) {
    super();
    this.accountToken = config.accountToken;
    this.baseUrl = config.baseUrl ?? 'https://api.postmarkapp.com';
  }

  static catalog() {
    return {
      name: 'postmarkapp-account',
      displayName: 'Postmark Account API',
      version: '1.0.0',
      category: 'communication',
      keywords: [
        'postmark', 'email', 'transactional', 'smtp', 'sending', 'domain',
        'dkim', 'spf', 'sender signature', 'server', 'bounce', 'webhook',
        'mail', 'deliverability', 'dns', 'return path',
      ],
      toolNames: [
        'list_servers', 'get_server', 'create_server', 'update_server', 'delete_server',
        'list_domains', 'get_domain', 'create_domain', 'update_domain', 'delete_domain',
        'verify_domain_dkim', 'verify_domain_spf', 'verify_domain_return_path', 'rotate_domain_dkim',
        'list_sender_signatures', 'get_sender_signature', 'create_sender_signature',
        'update_sender_signature', 'delete_sender_signature',
        'resend_sender_signature_confirmation', 'request_sender_signature_dkim',
        'verify_sender_signature_spf',
        'push_templates',
      ],
      description: 'Postmark account-level management: servers, domains, DKIM/SPF/return-path DNS verification, sender signatures, and template deployment across servers.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Servers ────────────────────────────────────────────────────────────
      {
        name: 'list_servers',
        description: 'List all Postmark servers on the account with optional name filter and pagination',
        inputSchema: {
          type: 'object',
          properties: {
            count: { type: 'number', description: 'Number of servers to return (default: 100, max: 500)' },
            offset: { type: 'number', description: 'Pagination offset (default: 0)' },
            name: { type: 'string', description: 'Filter servers by name (partial match)' },
          },
        },
      },
      {
        name: 'get_server',
        description: 'Get full configuration and API token details for a specific Postmark server by ID',
        inputSchema: {
          type: 'object',
          properties: {
            server_id: { type: 'number', description: 'Numeric Postmark server ID' },
          },
          required: ['server_id'],
        },
      },
      {
        name: 'create_server',
        description: 'Create a new Postmark server with webhook URLs, tracking settings, and inbound configuration',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Server name (required, must be unique within account)' },
            color: { type: 'string', description: 'Server color label: purple, blue, turquoise, green, red, yellow, grey' },
            smtp_api_activated: { type: 'boolean', description: 'Enable SMTP API for this server (default: true)' },
            raw_email_enabled: { type: 'boolean', description: 'Include raw email content in webhooks (default: false)' },
            delivery_hook_url: { type: 'string', description: 'Webhook URL for delivery events' },
            inbound_hook_url: { type: 'string', description: 'Webhook URL for inbound email events' },
            bounce_hook_url: { type: 'string', description: 'Webhook URL for bounce events' },
            open_hook_url: { type: 'string', description: 'Webhook URL for email open events' },
            click_hook_url: { type: 'string', description: 'Webhook URL for link click events' },
            post_first_open_only: { type: 'boolean', description: 'Fire open webhook only on first open (default: false)' },
            track_opens: { type: 'boolean', description: 'Enable open tracking by default (default: false)' },
            track_links: { type: 'string', description: 'Link tracking mode: None, HtmlAndText, HtmlOnly, TextOnly' },
            inbound_domain: { type: 'string', description: 'Custom inbound domain for this server' },
            inbound_spam_threshold: { type: 'number', description: 'Spam threshold for inbound (0-30, default: 0 = disabled)' },
          },
          required: ['name'],
        },
      },
      {
        name: 'update_server',
        description: 'Update configuration for an existing Postmark server including webhooks and tracking options',
        inputSchema: {
          type: 'object',
          properties: {
            server_id: { type: 'number', description: 'Numeric Postmark server ID to update' },
            name: { type: 'string', description: 'New server name' },
            color: { type: 'string', description: 'Server color: purple, blue, turquoise, green, red, yellow, grey' },
            smtp_api_activated: { type: 'boolean', description: 'Enable or disable SMTP API' },
            raw_email_enabled: { type: 'boolean', description: 'Include raw email in webhooks' },
            delivery_hook_url: { type: 'string', description: 'Webhook URL for delivery events' },
            inbound_hook_url: { type: 'string', description: 'Webhook URL for inbound email' },
            bounce_hook_url: { type: 'string', description: 'Webhook URL for bounces' },
            open_hook_url: { type: 'string', description: 'Webhook URL for opens' },
            click_hook_url: { type: 'string', description: 'Webhook URL for clicks' },
            post_first_open_only: { type: 'boolean', description: 'Fire open hook only on first open' },
            track_opens: { type: 'boolean', description: 'Default open tracking enabled' },
            track_links: { type: 'string', description: 'Link tracking: None, HtmlAndText, HtmlOnly, TextOnly' },
            inbound_domain: { type: 'string', description: 'Custom inbound domain' },
            inbound_spam_threshold: { type: 'number', description: 'Inbound spam threshold (0-30)' },
          },
          required: ['server_id'],
        },
      },
      {
        name: 'delete_server',
        description: 'Permanently delete a Postmark server and all its associated data from the account',
        inputSchema: {
          type: 'object',
          properties: {
            server_id: { type: 'number', description: 'Numeric Postmark server ID to delete' },
          },
          required: ['server_id'],
        },
      },

      // ── Domains ────────────────────────────────────────────────────────────
      {
        name: 'list_domains',
        description: 'List all sending domains on the Postmark account with pagination',
        inputSchema: {
          type: 'object',
          properties: {
            count: { type: 'number', description: 'Number of domains to return (default: 100, max: 500)' },
            offset: { type: 'number', description: 'Pagination offset (default: 0)' },
          },
        },
      },
      {
        name: 'get_domain',
        description: 'Get full DNS and DKIM/SPF/return-path verification status for a specific domain by ID',
        inputSchema: {
          type: 'object',
          properties: {
            domain_id: { type: 'number', description: 'Numeric Postmark domain ID' },
          },
          required: ['domain_id'],
        },
      },
      {
        name: 'create_domain',
        description: 'Add a new sending domain to the Postmark account with optional custom return-path domain',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Domain name to add (e.g. example.com)' },
            return_path_domain: { type: 'string', description: 'Custom return-path subdomain (e.g. pm-bounces.example.com)' },
          },
          required: ['name'],
        },
      },
      {
        name: 'update_domain',
        description: 'Update the return-path domain configuration for an existing Postmark domain',
        inputSchema: {
          type: 'object',
          properties: {
            domain_id: { type: 'number', description: 'Numeric Postmark domain ID to update' },
            return_path_domain: { type: 'string', description: 'New custom return-path domain (e.g. pm-bounces.example.com)' },
          },
          required: ['domain_id'],
        },
      },
      {
        name: 'delete_domain',
        description: 'Permanently delete a sending domain from the Postmark account',
        inputSchema: {
          type: 'object',
          properties: {
            domain_id: { type: 'number', description: 'Numeric Postmark domain ID to delete' },
          },
          required: ['domain_id'],
        },
      },
      {
        name: 'verify_domain_dkim',
        description: 'Trigger DNS verification check for DKIM on a Postmark domain and return updated DKIM status',
        inputSchema: {
          type: 'object',
          properties: {
            domain_id: { type: 'number', description: 'Numeric Postmark domain ID' },
          },
          required: ['domain_id'],
        },
      },
      {
        name: 'verify_domain_spf',
        description: 'Trigger DNS verification check for SPF on a Postmark domain and return updated SPF status',
        inputSchema: {
          type: 'object',
          properties: {
            domain_id: { type: 'number', description: 'Numeric Postmark domain ID' },
          },
          required: ['domain_id'],
        },
      },
      {
        name: 'verify_domain_return_path',
        description: 'Trigger DNS verification for the return-path CNAME bounce record on a Postmark domain',
        inputSchema: {
          type: 'object',
          properties: {
            domain_id: { type: 'number', description: 'Numeric Postmark domain ID' },
          },
          required: ['domain_id'],
        },
      },
      {
        name: 'rotate_domain_dkim',
        description: 'Rotate the DKIM key for a Postmark domain, generating a new pending DKIM key for DNS update',
        inputSchema: {
          type: 'object',
          properties: {
            domain_id: { type: 'number', description: 'Numeric Postmark domain ID' },
          },
          required: ['domain_id'],
        },
      },

      // ── Sender Signatures ──────────────────────────────────────────────────
      {
        name: 'list_sender_signatures',
        description: 'List all sender signatures (from-address identities) on the Postmark account with pagination',
        inputSchema: {
          type: 'object',
          properties: {
            count: { type: 'number', description: 'Number of sender signatures to return (default: 100, max: 500)' },
            offset: { type: 'number', description: 'Pagination offset (default: 0)' },
          },
        },
      },
      {
        name: 'get_sender_signature',
        description: 'Get full DKIM/SPF verification status and settings for a specific sender signature by ID',
        inputSchema: {
          type: 'object',
          properties: {
            signature_id: { type: 'number', description: 'Numeric Postmark sender signature ID' },
          },
          required: ['signature_id'],
        },
      },
      {
        name: 'create_sender_signature',
        description: 'Create a new sender signature (from-email identity) with display name and reply-to address',
        inputSchema: {
          type: 'object',
          properties: {
            from_email: { type: 'string', description: 'From email address for this sender signature (e.g. hello@example.com)' },
            name: { type: 'string', description: 'Display name shown in the From field' },
            reply_to_email: { type: 'string', description: 'Reply-to email address (optional)' },
            return_path_domain: { type: 'string', description: 'Custom return-path subdomain for bounces (optional)' },
          },
          required: ['from_email', 'name'],
        },
      },
      {
        name: 'update_sender_signature',
        description: 'Update display name, reply-to address, or return-path domain for an existing sender signature',
        inputSchema: {
          type: 'object',
          properties: {
            signature_id: { type: 'number', description: 'Numeric Postmark sender signature ID to update' },
            name: { type: 'string', description: 'New display name for the sender signature' },
            reply_to_email: { type: 'string', description: 'New reply-to email address' },
            return_path_domain: { type: 'string', description: 'New custom return-path domain' },
          },
          required: ['signature_id'],
        },
      },
      {
        name: 'delete_sender_signature',
        description: 'Permanently delete a sender signature from the Postmark account',
        inputSchema: {
          type: 'object',
          properties: {
            signature_id: { type: 'number', description: 'Numeric Postmark sender signature ID to delete' },
          },
          required: ['signature_id'],
        },
      },
      {
        name: 'resend_sender_signature_confirmation',
        description: 'Resend the confirmation email for an unconfirmed Postmark sender signature',
        inputSchema: {
          type: 'object',
          properties: {
            signature_id: { type: 'number', description: 'Numeric Postmark sender signature ID' },
          },
          required: ['signature_id'],
        },
      },
      {
        name: 'request_sender_signature_dkim',
        description: 'Request generation of a new DKIM key for a sender signature to improve deliverability',
        inputSchema: {
          type: 'object',
          properties: {
            signature_id: { type: 'number', description: 'Numeric Postmark sender signature ID' },
          },
          required: ['signature_id'],
        },
      },
      {
        name: 'verify_sender_signature_spf',
        description: 'Trigger DNS verification for SPF on a specific Postmark sender signature',
        inputSchema: {
          type: 'object',
          properties: {
            signature_id: { type: 'number', description: 'Numeric Postmark sender signature ID' },
          },
          required: ['signature_id'],
        },
      },

      // ── Templates ──────────────────────────────────────────────────────────
      {
        name: 'push_templates',
        description: 'Copy email templates from one Postmark server to another, with dry-run support via perform_changes flag',
        inputSchema: {
          type: 'object',
          properties: {
            source_server_id: { type: 'number', description: 'Source server ID to copy templates from' },
            destination_server_id: { type: 'number', description: 'Destination server ID to copy templates to' },
            perform_changes: { type: 'boolean', description: 'Set true to apply changes; false for dry-run preview (default: false)' },
          },
          required: ['source_server_id', 'destination_server_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_servers': return await this.listServers(args);
        case 'get_server': return await this.getServer(args);
        case 'create_server': return await this.createServer(args);
        case 'update_server': return await this.updateServer(args);
        case 'delete_server': return await this.deleteServer(args);
        case 'list_domains': return await this.listDomains(args);
        case 'get_domain': return await this.getDomain(args);
        case 'create_domain': return await this.createDomain(args);
        case 'update_domain': return await this.updateDomain(args);
        case 'delete_domain': return await this.deleteDomain(args);
        case 'verify_domain_dkim': return await this.verifyDomainDkim(args);
        case 'verify_domain_spf': return await this.verifyDomainSpf(args);
        case 'verify_domain_return_path': return await this.verifyDomainReturnPath(args);
        case 'rotate_domain_dkim': return await this.rotateDomainDkim(args);
        case 'list_sender_signatures': return await this.listSenderSignatures(args);
        case 'get_sender_signature': return await this.getSenderSignature(args);
        case 'create_sender_signature': return await this.createSenderSignature(args);
        case 'update_sender_signature': return await this.updateSenderSignature(args);
        case 'delete_sender_signature': return await this.deleteSenderSignature(args);
        case 'resend_sender_signature_confirmation': return await this.resendSenderSignatureConfirmation(args);
        case 'request_sender_signature_dkim': return await this.requestSenderSignatureDkim(args);
        case 'verify_sender_signature_spf': return await this.verifySenderSignatureSpf(args);
        case 'push_templates': return await this.pushTemplates(args);
        default:
          return {
            content: [{ type: 'text', text: `Unknown tool: ${name}` }],
            isError: true,
          };
      }
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Tool execution failed: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      };
    }
  }

  // ── Private helpers ──────────────────────────────────────────────────────

  private headers(): Record<string, string> {
    return {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'X-Postmark-Account-Token': this.accountToken,
    };
  }

  private async request(method: string, path: string, body?: unknown): Promise<ToolResult> {
    const url = `${this.baseUrl}${path}`;
    const init: RequestInit = { method, headers: this.headers() };
    if (body !== undefined) {
      init.body = JSON.stringify(body);
    }

    const response = await this.fetchWithRetry(url, init);

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      return {
        content: [{ type: 'text', text: `API error ${response.status} ${response.statusText}: ${errText}` }],
        isError: true,
      };
    }

    const data = await response.json();
    const text = JSON.stringify(data, null, 2);
    const truncated = text.length > 10_000
      ? text.slice(0, 10_000) + `\n... [truncated, ${text.length} total chars]`
      : text;

    return {
      content: [{ type: 'text', text: truncated }],
      isError: false,
    };
  }

  // ── Servers ──────────────────────────────────────────────────────────────

  private async listServers(args: Record<string, unknown>): Promise<ToolResult> {
    const count = (args.count as number) ?? 100;
    const offset = (args.offset as number) ?? 0;
    const nameFilter = args.name ? `&name=${encodeURIComponent(args.name as string)}` : '';
    return this.request('GET', `/servers?count=${count}&offset=${offset}${nameFilter}`);
  }

  private async getServer(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('GET', `/servers/${args.server_id}`);
  }

  private async createServer(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = { Name: args.name };
    if (args.color !== undefined) body.Color = args.color;
    if (args.smtp_api_activated !== undefined) body.SmtpApiActivated = args.smtp_api_activated;
    if (args.raw_email_enabled !== undefined) body.RawEmailEnabled = args.raw_email_enabled;
    if (args.delivery_hook_url !== undefined) body.DeliveryHookUrl = args.delivery_hook_url;
    if (args.inbound_hook_url !== undefined) body.InboundHookUrl = args.inbound_hook_url;
    if (args.bounce_hook_url !== undefined) body.BounceHookUrl = args.bounce_hook_url;
    if (args.open_hook_url !== undefined) body.OpenHookUrl = args.open_hook_url;
    if (args.click_hook_url !== undefined) body.ClickHookUrl = args.click_hook_url;
    if (args.post_first_open_only !== undefined) body.PostFirstOpenOnly = args.post_first_open_only;
    if (args.track_opens !== undefined) body.TrackOpens = args.track_opens;
    if (args.track_links !== undefined) body.TrackLinks = args.track_links;
    if (args.inbound_domain !== undefined) body.InboundDomain = args.inbound_domain;
    if (args.inbound_spam_threshold !== undefined) body.InboundSpamThreshold = args.inbound_spam_threshold;
    return this.request('POST', '/servers', body);
  }

  private async updateServer(args: Record<string, unknown>): Promise<ToolResult> {
    const serverId = args.server_id;
    const body: Record<string, unknown> = {};
    if (args.name !== undefined) body.Name = args.name;
    if (args.color !== undefined) body.Color = args.color;
    if (args.smtp_api_activated !== undefined) body.SmtpApiActivated = args.smtp_api_activated;
    if (args.raw_email_enabled !== undefined) body.RawEmailEnabled = args.raw_email_enabled;
    if (args.delivery_hook_url !== undefined) body.DeliveryHookUrl = args.delivery_hook_url;
    if (args.inbound_hook_url !== undefined) body.InboundHookUrl = args.inbound_hook_url;
    if (args.bounce_hook_url !== undefined) body.BounceHookUrl = args.bounce_hook_url;
    if (args.open_hook_url !== undefined) body.OpenHookUrl = args.open_hook_url;
    if (args.click_hook_url !== undefined) body.ClickHookUrl = args.click_hook_url;
    if (args.post_first_open_only !== undefined) body.PostFirstOpenOnly = args.post_first_open_only;
    if (args.track_opens !== undefined) body.TrackOpens = args.track_opens;
    if (args.track_links !== undefined) body.TrackLinks = args.track_links;
    if (args.inbound_domain !== undefined) body.InboundDomain = args.inbound_domain;
    if (args.inbound_spam_threshold !== undefined) body.InboundSpamThreshold = args.inbound_spam_threshold;
    return this.request('PUT', `/servers/${serverId}`, body);
  }

  private async deleteServer(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('DELETE', `/servers/${args.server_id}`);
  }

  // ── Domains ──────────────────────────────────────────────────────────────

  private async listDomains(args: Record<string, unknown>): Promise<ToolResult> {
    const count = (args.count as number) ?? 100;
    const offset = (args.offset as number) ?? 0;
    return this.request('GET', `/domains?count=${count}&offset=${offset}`);
  }

  private async getDomain(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('GET', `/domains/${args.domain_id}`);
  }

  private async createDomain(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = { Name: args.name };
    if (args.return_path_domain !== undefined) body.ReturnPathDomain = args.return_path_domain;
    return this.request('POST', '/domains', body);
  }

  private async updateDomain(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {};
    if (args.return_path_domain !== undefined) body.ReturnPathDomain = args.return_path_domain;
    return this.request('PUT', `/domains/${args.domain_id}`, body);
  }

  private async deleteDomain(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('DELETE', `/domains/${args.domain_id}`);
  }

  private async verifyDomainDkim(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('PUT', `/domains/${args.domain_id}/verifydkim`);
  }

  private async verifyDomainSpf(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('POST', `/domains/${args.domain_id}/verifyspf`);
  }

  private async verifyDomainReturnPath(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('PUT', `/domains/${args.domain_id}/verifyreturnpath`);
  }

  private async rotateDomainDkim(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('POST', `/domains/${args.domain_id}/rotatedkim`);
  }

  // ── Sender Signatures ─────────────────────────────────────────────────────

  private async listSenderSignatures(args: Record<string, unknown>): Promise<ToolResult> {
    const count = (args.count as number) ?? 100;
    const offset = (args.offset as number) ?? 0;
    return this.request('GET', `/senders?count=${count}&offset=${offset}`);
  }

  private async getSenderSignature(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('GET', `/senders/${args.signature_id}`);
  }

  private async createSenderSignature(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      FromEmail: args.from_email,
      Name: args.name,
    };
    if (args.reply_to_email !== undefined) body.ReplyToEmail = args.reply_to_email;
    if (args.return_path_domain !== undefined) body.ReturnPathDomain = args.return_path_domain;
    return this.request('POST', '/senders', body);
  }

  private async updateSenderSignature(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {};
    if (args.name !== undefined) body.Name = args.name;
    if (args.reply_to_email !== undefined) body.ReplyToEmail = args.reply_to_email;
    if (args.return_path_domain !== undefined) body.ReturnPathDomain = args.return_path_domain;
    return this.request('PUT', `/senders/${args.signature_id}`, body);
  }

  private async deleteSenderSignature(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('DELETE', `/senders/${args.signature_id}`);
  }

  private async resendSenderSignatureConfirmation(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('POST', `/senders/${args.signature_id}/resend`);
  }

  private async requestSenderSignatureDkim(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('POST', `/senders/${args.signature_id}/requestnewdkim`);
  }

  private async verifySenderSignatureSpf(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request('POST', `/senders/${args.signature_id}/verifyspf`);
  }

  // ── Templates ─────────────────────────────────────────────────────────────

  private async pushTemplates(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {
      SourceServerId: args.source_server_id,
      DestinationServerId: args.destination_server_id,
      PerformChanges: (args.perform_changes as boolean) ?? false,
    };
    return this.request('PUT', '/templates/push', body);
  }
}
