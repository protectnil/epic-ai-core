/**
 * Clever Cloud API MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official Clever Cloud MCP server was found on GitHub. We build a full REST wrapper
// for complete Clever Cloud API coverage.
//
// Base URL: https://api.clever-cloud.com/v2
// Auth: OAuth1 (request token → authorize → access token) — pass as Authorization header
// Docs: https://www.clever-cloud.com/doc/api/
// Spec: https://api.apis.guru/v2/specs/clever-cloud.com/1.0.0/openapi.json
// Category: cloud
// Rate limits: See Clever Cloud docs

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface CleverCloudConfig {
  /** OAuth1 Authorization header value, e.g. "OAuth oauth_token=...,oauth_signature=..." */
  authorizationHeader: string;
  baseUrl?: string;
}

export class CleverCloudMCPServer extends MCPAdapterBase {
  private readonly authorizationHeader: string;
  private readonly baseUrl: string;

  constructor(config: CleverCloudConfig) {
    super();
    this.authorizationHeader = config.authorizationHeader;
    this.baseUrl = config.baseUrl || 'https://api.clever-cloud.com/v2';
  }

  static catalog() {
    return {
      name: 'clever-cloud',
      displayName: 'Clever Cloud API',
      version: '1.0.0',
      category: 'cloud',
      keywords: [
        'clever-cloud', 'cloud', 'paas', 'hosting', 'deployment', 'application',
        'addon', 'organisation', 'billing', 'logs', 'environment', 'domain',
        'vhost', 'instance', 'network', 'oauth', 'github', 'webhooks', 'notifications',
        'payment', 'consumer', 'token', 'zone', 'product',
      ],
      toolNames: [
        // Self (authenticated user)
        'get_self', 'update_self', 'delete_self',
        'get_self_applications', 'create_self_application',
        'get_self_application', 'update_self_application', 'delete_self_application',
        'get_self_application_env', 'put_self_application_env',
        'delete_self_application_env_var', 'put_self_application_env_var',
        'get_self_application_instances', 'start_self_application_instance',
        'stop_self_application_instances',
        'get_self_application_vhosts', 'add_self_application_vhost',
        'delete_self_application_vhost',
        'get_self_application_addons', 'link_self_application_addon',
        'unlink_self_application_addon',
        'get_self_application_branches', 'get_self_application_deployments',
        'get_self_application_tags', 'put_self_application_tag', 'delete_self_application_tag',
        'get_self_addons', 'create_self_addon',
        'get_self_addon', 'update_self_addon', 'delete_self_addon',
        'get_self_addon_env', 'get_self_addon_tags',
        'get_self_consumers', 'create_self_consumer',
        'get_self_consumer', 'update_self_consumer', 'delete_self_consumer',
        'get_self_consumer_secret',
        'get_self_emails', 'add_self_email', 'delete_self_email',
        'get_self_keys', 'add_self_key', 'delete_self_key',
        'get_self_tokens', 'revoke_self_tokens', 'revoke_self_token',
        'get_self_id', 'get_self_credits', 'get_self_instances',
        'get_self_payments_billings', 'get_self_payments_billing',
        'get_self_payments_methods', 'get_self_payment_method_default',
        'get_self_mfa_backup_codes',
        // Organisations
        'list_organisations', 'create_organisation',
        'get_organisation', 'update_organisation', 'delete_organisation',
        'get_org_applications', 'create_org_application',
        'get_org_application', 'update_org_application', 'delete_org_application',
        'get_org_application_env', 'put_org_application_env',
        'delete_org_application_env_var', 'put_org_application_env_var',
        'get_org_application_instances', 'start_org_application_instance',
        'stop_org_application_instances',
        'get_org_application_vhosts', 'add_org_application_vhost',
        'delete_org_application_vhost',
        'get_org_application_addons', 'link_org_application_addon',
        'unlink_org_application_addon',
        'get_org_application_branches', 'get_org_application_deployments',
        'get_org_application_tags', 'put_org_application_tag', 'delete_org_application_tag',
        'get_org_addons', 'create_org_addon',
        'get_org_addon', 'update_org_addon', 'delete_org_addon',
        'get_org_addon_env',
        'get_org_members', 'add_org_member', 'update_org_member', 'delete_org_member',
        'get_org_consumers', 'create_org_consumer',
        'get_org_consumer', 'update_org_consumer', 'delete_org_consumer',
        'get_org_consumer_secret',
        'get_org_credits', 'get_org_instances', 'get_org_deployments',
        'get_org_payments_billings', 'get_org_payments_methods',
        // Logs
        'get_app_logs', 'get_app_log_drains', 'add_app_log_drain', 'delete_app_log_drain',
        // Notifications
        'list_email_hooks', 'create_email_hook', 'update_email_hook', 'delete_email_hook',
        'list_webhook_hooks', 'create_webhook_hook', 'update_webhook_hook', 'delete_webhook_hook',
        'list_notification_events', 'list_webhook_formats',
        // Products
        'list_addon_providers', 'get_addon_provider', 'list_instances',
        'list_zones', 'list_countries', 'list_prices',
        // OAuth
        'get_oauth_rights',
        // Users
        'create_user', 'get_user', 'get_user_applications',
        // Summary
        'get_summary',
        // Network Groups
        'list_network_groups', 'create_network_group',
        'get_network_group', 'delete_network_group',
        'list_network_group_members', 'add_network_group_member', 'delete_network_group_member',
        'list_network_group_peers',
      ],
      description: 'Clever Cloud API: manage PaaS applications, add-ons, organisations, billing, logs, domains, instances, and network groups on the Clever Cloud platform.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Self ───────────────────────────────────────────────────────────────
      {
        name: 'get_self',
        description: 'Get the profile of the currently authenticated user',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'update_self',
        description: 'Update the profile of the currently authenticated user',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Display name' },
            email: { type: 'string', description: 'Email address' },
            lang: { type: 'string', description: 'Preferred language code' },
          },
        },
      },
      {
        name: 'delete_self',
        description: 'Delete the currently authenticated user account',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'get_self_id',
        description: 'Get the ID of the currently authenticated user',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'get_self_credits',
        description: 'Get the credit balance for the currently authenticated user',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'get_self_instances',
        description: 'Get all running instances for the currently authenticated user',
        inputSchema: { type: 'object', properties: {} },
      },
      // Self — Applications
      {
        name: 'get_self_applications',
        description: 'List all applications belonging to the currently authenticated user',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'create_self_application',
        description: 'Create a new application for the currently authenticated user',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Application name' },
            deploy: { type: 'string', description: 'Deployment type (git, ftp, etc.)' },
            instanceType: { type: 'string', description: 'Runtime instance type (e.g. node, java, php)' },
            minInstances: { type: 'number', description: 'Minimum number of instances' },
            maxInstances: { type: 'number', description: 'Maximum number of instances' },
            zone: { type: 'string', description: 'Deployment zone (e.g. par, rbx)' },
            description: { type: 'string', description: 'Application description' },
          },
          required: ['name'],
        },
      },
      {
        name: 'get_self_application',
        description: 'Get a specific application belonging to the currently authenticated user',
        inputSchema: {
          type: 'object',
          properties: { appId: { type: 'string', description: 'Application ID' } },
          required: ['appId'],
        },
      },
      {
        name: 'update_self_application',
        description: 'Update a specific application belonging to the currently authenticated user',
        inputSchema: {
          type: 'object',
          properties: {
            appId: { type: 'string', description: 'Application ID' },
            name: { type: 'string', description: 'New application name' },
            description: { type: 'string', description: 'New description' },
            minInstances: { type: 'number', description: 'Minimum instances' },
            maxInstances: { type: 'number', description: 'Maximum instances' },
          },
          required: ['appId'],
        },
      },
      {
        name: 'delete_self_application',
        description: 'Delete a specific application belonging to the currently authenticated user',
        inputSchema: {
          type: 'object',
          properties: { appId: { type: 'string', description: 'Application ID' } },
          required: ['appId'],
        },
      },
      {
        name: 'get_self_application_env',
        description: 'Get environment variables for a user application',
        inputSchema: {
          type: 'object',
          properties: { appId: { type: 'string', description: 'Application ID' } },
          required: ['appId'],
        },
      },
      {
        name: 'put_self_application_env',
        description: 'Set all environment variables for a user application (replaces existing)',
        inputSchema: {
          type: 'object',
          properties: {
            appId: { type: 'string', description: 'Application ID' },
            env: { type: 'array', description: 'Array of {name, value} environment variable objects' },
          },
          required: ['appId', 'env'],
        },
      },
      {
        name: 'delete_self_application_env_var',
        description: 'Delete a specific environment variable from a user application',
        inputSchema: {
          type: 'object',
          properties: {
            appId: { type: 'string', description: 'Application ID' },
            envName: { type: 'string', description: 'Environment variable name to delete' },
          },
          required: ['appId', 'envName'],
        },
      },
      {
        name: 'put_self_application_env_var',
        description: 'Set a specific environment variable for a user application',
        inputSchema: {
          type: 'object',
          properties: {
            appId: { type: 'string', description: 'Application ID' },
            envName: { type: 'string', description: 'Environment variable name' },
            value: { type: 'string', description: 'Environment variable value' },
          },
          required: ['appId', 'envName', 'value'],
        },
      },
      {
        name: 'get_self_application_instances',
        description: 'Get running instances for a user application',
        inputSchema: {
          type: 'object',
          properties: { appId: { type: 'string', description: 'Application ID' } },
          required: ['appId'],
        },
      },
      {
        name: 'start_self_application_instance',
        description: 'Start (deploy) a user application',
        inputSchema: {
          type: 'object',
          properties: { appId: { type: 'string', description: 'Application ID' } },
          required: ['appId'],
        },
      },
      {
        name: 'stop_self_application_instances',
        description: 'Stop all running instances of a user application',
        inputSchema: {
          type: 'object',
          properties: { appId: { type: 'string', description: 'Application ID' } },
          required: ['appId'],
        },
      },
      {
        name: 'get_self_application_vhosts',
        description: 'Get virtual hosts (custom domains) for a user application',
        inputSchema: {
          type: 'object',
          properties: { appId: { type: 'string', description: 'Application ID' } },
          required: ['appId'],
        },
      },
      {
        name: 'add_self_application_vhost',
        description: 'Add a virtual host (custom domain) to a user application',
        inputSchema: {
          type: 'object',
          properties: {
            appId: { type: 'string', description: 'Application ID' },
            domain: { type: 'string', description: 'Domain name to add (e.g. myapp.example.com)' },
          },
          required: ['appId', 'domain'],
        },
      },
      {
        name: 'delete_self_application_vhost',
        description: 'Remove a virtual host (custom domain) from a user application',
        inputSchema: {
          type: 'object',
          properties: {
            appId: { type: 'string', description: 'Application ID' },
            domain: { type: 'string', description: 'Domain name to remove' },
          },
          required: ['appId', 'domain'],
        },
      },
      {
        name: 'get_self_application_addons',
        description: 'Get add-ons linked to a user application',
        inputSchema: {
          type: 'object',
          properties: { appId: { type: 'string', description: 'Application ID' } },
          required: ['appId'],
        },
      },
      {
        name: 'link_self_application_addon',
        description: 'Link an add-on to a user application',
        inputSchema: {
          type: 'object',
          properties: {
            appId: { type: 'string', description: 'Application ID' },
            addonId: { type: 'string', description: 'Add-on ID to link' },
          },
          required: ['appId', 'addonId'],
        },
      },
      {
        name: 'unlink_self_application_addon',
        description: 'Unlink an add-on from a user application',
        inputSchema: {
          type: 'object',
          properties: {
            appId: { type: 'string', description: 'Application ID' },
            addonId: { type: 'string', description: 'Add-on ID to unlink' },
          },
          required: ['appId', 'addonId'],
        },
      },
      {
        name: 'get_self_application_branches',
        description: 'Get git branches available for a user application',
        inputSchema: {
          type: 'object',
          properties: { appId: { type: 'string', description: 'Application ID' } },
          required: ['appId'],
        },
      },
      {
        name: 'get_self_application_deployments',
        description: 'Get deployment history for a user application',
        inputSchema: {
          type: 'object',
          properties: { appId: { type: 'string', description: 'Application ID' } },
          required: ['appId'],
        },
      },
      {
        name: 'get_self_application_tags',
        description: 'Get tags for a user application',
        inputSchema: {
          type: 'object',
          properties: { appId: { type: 'string', description: 'Application ID' } },
          required: ['appId'],
        },
      },
      {
        name: 'put_self_application_tag',
        description: 'Add a tag to a user application',
        inputSchema: {
          type: 'object',
          properties: {
            appId: { type: 'string', description: 'Application ID' },
            tag: { type: 'string', description: 'Tag to add' },
          },
          required: ['appId', 'tag'],
        },
      },
      {
        name: 'delete_self_application_tag',
        description: 'Remove a tag from a user application',
        inputSchema: {
          type: 'object',
          properties: {
            appId: { type: 'string', description: 'Application ID' },
            tag: { type: 'string', description: 'Tag to remove' },
          },
          required: ['appId', 'tag'],
        },
      },
      // Self — Add-ons
      {
        name: 'get_self_addons',
        description: 'List all add-ons belonging to the currently authenticated user',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'create_self_addon',
        description: 'Provision a new add-on for the currently authenticated user',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Add-on name' },
            plan: { type: 'string', description: 'Plan ID (e.g. dev, xxs, xs)' },
            providerId: { type: 'string', description: 'Add-on provider ID (e.g. postgresql-addon)' },
            region: { type: 'string', description: 'Deployment region/zone' },
          },
          required: ['name', 'plan', 'providerId', 'region'],
        },
      },
      {
        name: 'get_self_addon',
        description: 'Get a specific add-on belonging to the currently authenticated user',
        inputSchema: {
          type: 'object',
          properties: { addonId: { type: 'string', description: 'Add-on ID' } },
          required: ['addonId'],
        },
      },
      {
        name: 'update_self_addon',
        description: 'Update (upgrade/downgrade plan) a user add-on',
        inputSchema: {
          type: 'object',
          properties: {
            addonId: { type: 'string', description: 'Add-on ID' },
            plan: { type: 'string', description: 'New plan ID' },
          },
          required: ['addonId', 'plan'],
        },
      },
      {
        name: 'delete_self_addon',
        description: 'Delete (deprovision) a user add-on',
        inputSchema: {
          type: 'object',
          properties: { addonId: { type: 'string', description: 'Add-on ID' } },
          required: ['addonId'],
        },
      },
      {
        name: 'get_self_addon_env',
        description: 'Get environment variables exposed by a user add-on',
        inputSchema: {
          type: 'object',
          properties: { addonId: { type: 'string', description: 'Add-on ID' } },
          required: ['addonId'],
        },
      },
      {
        name: 'get_self_addon_tags',
        description: 'Get tags for a user add-on',
        inputSchema: {
          type: 'object',
          properties: { addonId: { type: 'string', description: 'Add-on ID' } },
          required: ['addonId'],
        },
      },
      // Self — Consumers (OAuth)
      {
        name: 'get_self_consumers',
        description: 'List OAuth consumers registered for the currently authenticated user',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'create_self_consumer',
        description: 'Register a new OAuth consumer for the currently authenticated user',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Consumer name' },
            description: { type: 'string', description: 'Consumer description' },
            url: { type: 'string', description: 'Consumer callback URL' },
          },
          required: ['name'],
        },
      },
      {
        name: 'get_self_consumer',
        description: 'Get a specific OAuth consumer for the currently authenticated user',
        inputSchema: {
          type: 'object',
          properties: { key: { type: 'string', description: 'OAuth consumer key' } },
          required: ['key'],
        },
      },
      {
        name: 'update_self_consumer',
        description: 'Update an OAuth consumer for the currently authenticated user',
        inputSchema: {
          type: 'object',
          properties: {
            key: { type: 'string', description: 'OAuth consumer key' },
            name: { type: 'string', description: 'New consumer name' },
            description: { type: 'string', description: 'New description' },
          },
          required: ['key'],
        },
      },
      {
        name: 'delete_self_consumer',
        description: 'Delete an OAuth consumer for the currently authenticated user',
        inputSchema: {
          type: 'object',
          properties: { key: { type: 'string', description: 'OAuth consumer key' } },
          required: ['key'],
        },
      },
      {
        name: 'get_self_consumer_secret',
        description: 'Get the OAuth secret for a consumer belonging to the currently authenticated user',
        inputSchema: {
          type: 'object',
          properties: { key: { type: 'string', description: 'OAuth consumer key' } },
          required: ['key'],
        },
      },
      // Self — Emails, Keys, Tokens
      {
        name: 'get_self_emails',
        description: 'Get all email addresses for the currently authenticated user',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'add_self_email',
        description: 'Add an email address to the currently authenticated user account',
        inputSchema: {
          type: 'object',
          properties: { email: { type: 'string', description: 'Email address to add' } },
          required: ['email'],
        },
      },
      {
        name: 'delete_self_email',
        description: 'Remove an email address from the currently authenticated user account',
        inputSchema: {
          type: 'object',
          properties: { email: { type: 'string', description: 'Email address to remove' } },
          required: ['email'],
        },
      },
      {
        name: 'get_self_keys',
        description: 'Get SSH public keys for the currently authenticated user',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'add_self_key',
        description: 'Add an SSH public key to the currently authenticated user account',
        inputSchema: {
          type: 'object',
          properties: {
            key: { type: 'string', description: 'SSH public key identifier/name' },
            publicKey: { type: 'string', description: 'SSH public key value' },
          },
          required: ['key'],
        },
      },
      {
        name: 'delete_self_key',
        description: 'Remove an SSH public key from the currently authenticated user account',
        inputSchema: {
          type: 'object',
          properties: { key: { type: 'string', description: 'SSH public key identifier/name' } },
          required: ['key'],
        },
      },
      {
        name: 'get_self_tokens',
        description: 'List active OAuth tokens for the currently authenticated user',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'revoke_self_tokens',
        description: 'Revoke all OAuth tokens for the currently authenticated user',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'revoke_self_token',
        description: 'Revoke a specific OAuth token for the currently authenticated user',
        inputSchema: {
          type: 'object',
          properties: { token: { type: 'string', description: 'Token to revoke' } },
          required: ['token'],
        },
      },
      // Self — Payments & MFA
      {
        name: 'get_self_payments_billings',
        description: 'Get billing invoices for the currently authenticated user',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'get_self_payments_billing',
        description: 'Get a specific billing invoice for the currently authenticated user',
        inputSchema: {
          type: 'object',
          properties: { bid: { type: 'string', description: 'Billing invoice ID' } },
          required: ['bid'],
        },
      },
      {
        name: 'get_self_payments_methods',
        description: 'Get payment methods for the currently authenticated user',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'get_self_payment_method_default',
        description: 'Get the default payment method for the currently authenticated user',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'get_self_mfa_backup_codes',
        description: 'Get MFA backup codes for the currently authenticated user',
        inputSchema: {
          type: 'object',
          properties: { kind: { type: 'string', description: 'MFA kind (e.g. totp)' } },
          required: ['kind'],
        },
      },
      // ── Organisations ──────────────────────────────────────────────────────
      {
        name: 'list_organisations',
        description: 'List all organisations the currently authenticated user is a member of',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'create_organisation',
        description: 'Create a new organisation',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Organisation name' },
            description: { type: 'string', description: 'Organisation description' },
            url: { type: 'string', description: 'Organisation website URL' },
            company: { type: 'string', description: 'Company name' },
            vatState: { type: 'string', description: 'VAT state/country for billing' },
          },
          required: ['name'],
        },
      },
      {
        name: 'get_organisation',
        description: 'Get a specific organisation by ID',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'string', description: 'Organisation ID' } },
          required: ['id'],
        },
      },
      {
        name: 'update_organisation',
        description: 'Update an organisation',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Organisation ID' },
            name: { type: 'string', description: 'New organisation name' },
            description: { type: 'string', description: 'New description' },
          },
          required: ['id'],
        },
      },
      {
        name: 'delete_organisation',
        description: 'Delete an organisation',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'string', description: 'Organisation ID' } },
          required: ['id'],
        },
      },
      // Org — Applications
      {
        name: 'get_org_applications',
        description: 'List all applications in an organisation',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'string', description: 'Organisation ID' } },
          required: ['id'],
        },
      },
      {
        name: 'create_org_application',
        description: 'Create a new application in an organisation',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Organisation ID' },
            name: { type: 'string', description: 'Application name' },
            instanceType: { type: 'string', description: 'Runtime type (e.g. node, java, php)' },
            minInstances: { type: 'number', description: 'Minimum instances' },
            maxInstances: { type: 'number', description: 'Maximum instances' },
            zone: { type: 'string', description: 'Deployment zone' },
            description: { type: 'string', description: 'Application description' },
          },
          required: ['id', 'name'],
        },
      },
      {
        name: 'get_org_application',
        description: 'Get a specific application in an organisation',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Organisation ID' },
            appId: { type: 'string', description: 'Application ID' },
          },
          required: ['id', 'appId'],
        },
      },
      {
        name: 'update_org_application',
        description: 'Update an application in an organisation',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Organisation ID' },
            appId: { type: 'string', description: 'Application ID' },
            name: { type: 'string', description: 'New application name' },
            minInstances: { type: 'number', description: 'Minimum instances' },
            maxInstances: { type: 'number', description: 'Maximum instances' },
          },
          required: ['id', 'appId'],
        },
      },
      {
        name: 'delete_org_application',
        description: 'Delete an application from an organisation',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Organisation ID' },
            appId: { type: 'string', description: 'Application ID' },
          },
          required: ['id', 'appId'],
        },
      },
      {
        name: 'get_org_application_env',
        description: 'Get environment variables for an organisation application',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Organisation ID' },
            appId: { type: 'string', description: 'Application ID' },
          },
          required: ['id', 'appId'],
        },
      },
      {
        name: 'put_org_application_env',
        description: 'Set all environment variables for an organisation application (replaces existing)',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Organisation ID' },
            appId: { type: 'string', description: 'Application ID' },
            env: { type: 'array', description: 'Array of {name, value} environment variable objects' },
          },
          required: ['id', 'appId', 'env'],
        },
      },
      {
        name: 'delete_org_application_env_var',
        description: 'Delete a specific environment variable from an organisation application',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Organisation ID' },
            appId: { type: 'string', description: 'Application ID' },
            envName: { type: 'string', description: 'Environment variable name to delete' },
          },
          required: ['id', 'appId', 'envName'],
        },
      },
      {
        name: 'put_org_application_env_var',
        description: 'Set a specific environment variable for an organisation application',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Organisation ID' },
            appId: { type: 'string', description: 'Application ID' },
            envName: { type: 'string', description: 'Environment variable name' },
            value: { type: 'string', description: 'Environment variable value' },
          },
          required: ['id', 'appId', 'envName', 'value'],
        },
      },
      {
        name: 'get_org_application_instances',
        description: 'Get running instances for an organisation application',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Organisation ID' },
            appId: { type: 'string', description: 'Application ID' },
          },
          required: ['id', 'appId'],
        },
      },
      {
        name: 'start_org_application_instance',
        description: 'Start (deploy) an organisation application',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Organisation ID' },
            appId: { type: 'string', description: 'Application ID' },
          },
          required: ['id', 'appId'],
        },
      },
      {
        name: 'stop_org_application_instances',
        description: 'Stop all running instances of an organisation application',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Organisation ID' },
            appId: { type: 'string', description: 'Application ID' },
          },
          required: ['id', 'appId'],
        },
      },
      {
        name: 'get_org_application_vhosts',
        description: 'Get virtual hosts (custom domains) for an organisation application',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Organisation ID' },
            appId: { type: 'string', description: 'Application ID' },
          },
          required: ['id', 'appId'],
        },
      },
      {
        name: 'add_org_application_vhost',
        description: 'Add a virtual host (custom domain) to an organisation application',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Organisation ID' },
            appId: { type: 'string', description: 'Application ID' },
            domain: { type: 'string', description: 'Domain name to add' },
          },
          required: ['id', 'appId', 'domain'],
        },
      },
      {
        name: 'delete_org_application_vhost',
        description: 'Remove a virtual host (custom domain) from an organisation application',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Organisation ID' },
            appId: { type: 'string', description: 'Application ID' },
            domain: { type: 'string', description: 'Domain name to remove' },
          },
          required: ['id', 'appId', 'domain'],
        },
      },
      {
        name: 'get_org_application_addons',
        description: 'Get add-ons linked to an organisation application',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Organisation ID' },
            appId: { type: 'string', description: 'Application ID' },
          },
          required: ['id', 'appId'],
        },
      },
      {
        name: 'link_org_application_addon',
        description: 'Link an add-on to an organisation application',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Organisation ID' },
            appId: { type: 'string', description: 'Application ID' },
            addonId: { type: 'string', description: 'Add-on ID to link' },
          },
          required: ['id', 'appId', 'addonId'],
        },
      },
      {
        name: 'unlink_org_application_addon',
        description: 'Unlink an add-on from an organisation application',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Organisation ID' },
            appId: { type: 'string', description: 'Application ID' },
            addonId: { type: 'string', description: 'Add-on ID to unlink' },
          },
          required: ['id', 'appId', 'addonId'],
        },
      },
      {
        name: 'get_org_application_branches',
        description: 'Get git branches available for an organisation application',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Organisation ID' },
            appId: { type: 'string', description: 'Application ID' },
          },
          required: ['id', 'appId'],
        },
      },
      {
        name: 'get_org_application_deployments',
        description: 'Get deployment history for an organisation application',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Organisation ID' },
            appId: { type: 'string', description: 'Application ID' },
          },
          required: ['id', 'appId'],
        },
      },
      {
        name: 'get_org_application_tags',
        description: 'Get tags for an organisation application',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Organisation ID' },
            appId: { type: 'string', description: 'Application ID' },
          },
          required: ['id', 'appId'],
        },
      },
      {
        name: 'put_org_application_tag',
        description: 'Add a tag to an organisation application',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Organisation ID' },
            appId: { type: 'string', description: 'Application ID' },
            tag: { type: 'string', description: 'Tag to add' },
          },
          required: ['id', 'appId', 'tag'],
        },
      },
      {
        name: 'delete_org_application_tag',
        description: 'Remove a tag from an organisation application',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Organisation ID' },
            appId: { type: 'string', description: 'Application ID' },
            tag: { type: 'string', description: 'Tag to remove' },
          },
          required: ['id', 'appId', 'tag'],
        },
      },
      // Org — Add-ons
      {
        name: 'get_org_addons',
        description: 'List all add-ons in an organisation',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'string', description: 'Organisation ID' } },
          required: ['id'],
        },
      },
      {
        name: 'create_org_addon',
        description: 'Provision a new add-on in an organisation',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Organisation ID' },
            name: { type: 'string', description: 'Add-on name' },
            plan: { type: 'string', description: 'Plan ID' },
            providerId: { type: 'string', description: 'Add-on provider ID (e.g. postgresql-addon)' },
            region: { type: 'string', description: 'Deployment region/zone' },
          },
          required: ['id', 'name', 'plan', 'providerId', 'region'],
        },
      },
      {
        name: 'get_org_addon',
        description: 'Get a specific add-on in an organisation',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Organisation ID' },
            addonId: { type: 'string', description: 'Add-on ID' },
          },
          required: ['id', 'addonId'],
        },
      },
      {
        name: 'update_org_addon',
        description: 'Update (upgrade/downgrade plan) an organisation add-on',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Organisation ID' },
            addonId: { type: 'string', description: 'Add-on ID' },
            plan: { type: 'string', description: 'New plan ID' },
          },
          required: ['id', 'addonId', 'plan'],
        },
      },
      {
        name: 'delete_org_addon',
        description: 'Delete (deprovision) an organisation add-on',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Organisation ID' },
            addonId: { type: 'string', description: 'Add-on ID' },
          },
          required: ['id', 'addonId'],
        },
      },
      {
        name: 'get_org_addon_env',
        description: 'Get environment variables exposed by an organisation add-on',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Organisation ID' },
            addonId: { type: 'string', description: 'Add-on ID' },
          },
          required: ['id', 'addonId'],
        },
      },
      // Org — Members
      {
        name: 'get_org_members',
        description: 'List members of an organisation',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'string', description: 'Organisation ID' } },
          required: ['id'],
        },
      },
      {
        name: 'add_org_member',
        description: 'Add a member to an organisation by user ID or email',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Organisation ID' },
            userId: { type: 'string', description: 'User ID to add as member' },
            role: { type: 'string', description: 'Member role (ADMIN, MANAGER, DEVELOPER, ACCOUNTING)' },
          },
          required: ['id', 'userId'],
        },
      },
      {
        name: 'update_org_member',
        description: 'Update the role of an organisation member',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Organisation ID' },
            userId: { type: 'string', description: 'User ID' },
            role: { type: 'string', description: 'New role (ADMIN, MANAGER, DEVELOPER, ACCOUNTING)' },
          },
          required: ['id', 'userId', 'role'],
        },
      },
      {
        name: 'delete_org_member',
        description: 'Remove a member from an organisation',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Organisation ID' },
            userId: { type: 'string', description: 'User ID to remove' },
          },
          required: ['id', 'userId'],
        },
      },
      // Org — Consumers
      {
        name: 'get_org_consumers',
        description: 'List OAuth consumers for an organisation',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'string', description: 'Organisation ID' } },
          required: ['id'],
        },
      },
      {
        name: 'create_org_consumer',
        description: 'Register a new OAuth consumer for an organisation',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Organisation ID' },
            name: { type: 'string', description: 'Consumer name' },
            description: { type: 'string', description: 'Consumer description' },
          },
          required: ['id', 'name'],
        },
      },
      {
        name: 'get_org_consumer',
        description: 'Get an OAuth consumer for an organisation',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Organisation ID' },
            key: { type: 'string', description: 'OAuth consumer key' },
          },
          required: ['id', 'key'],
        },
      },
      {
        name: 'update_org_consumer',
        description: 'Update an OAuth consumer for an organisation',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Organisation ID' },
            key: { type: 'string', description: 'OAuth consumer key' },
            name: { type: 'string', description: 'New consumer name' },
          },
          required: ['id', 'key'],
        },
      },
      {
        name: 'delete_org_consumer',
        description: 'Delete an OAuth consumer from an organisation',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Organisation ID' },
            key: { type: 'string', description: 'OAuth consumer key' },
          },
          required: ['id', 'key'],
        },
      },
      {
        name: 'get_org_consumer_secret',
        description: 'Get the OAuth secret for an organisation consumer',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Organisation ID' },
            key: { type: 'string', description: 'OAuth consumer key' },
          },
          required: ['id', 'key'],
        },
      },
      // Org — Stats
      {
        name: 'get_org_credits',
        description: 'Get the credit balance for an organisation',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'string', description: 'Organisation ID' } },
          required: ['id'],
        },
      },
      {
        name: 'get_org_instances',
        description: 'Get all running instances for an organisation',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'string', description: 'Organisation ID' } },
          required: ['id'],
        },
      },
      {
        name: 'get_org_deployments',
        description: 'Get deployment history across all applications in an organisation',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'string', description: 'Organisation ID' } },
          required: ['id'],
        },
      },
      {
        name: 'get_org_payments_billings',
        description: 'Get billing invoices for an organisation',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'string', description: 'Organisation ID' } },
          required: ['id'],
        },
      },
      {
        name: 'get_org_payments_methods',
        description: 'Get payment methods for an organisation',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'string', description: 'Organisation ID' } },
          required: ['id'],
        },
      },
      // ── Logs ───────────────────────────────────────────────────────────────
      {
        name: 'get_app_logs',
        description: 'Fetch application logs for a given application ID',
        inputSchema: {
          type: 'object',
          properties: {
            appId: { type: 'string', description: 'Application ID' },
            limit: { type: 'number', description: 'Maximum number of log lines to return' },
            before: { type: 'string', description: 'Return logs before this timestamp (ISO 8601)' },
            after: { type: 'string', description: 'Return logs after this timestamp (ISO 8601)' },
            filter: { type: 'string', description: 'Filter log lines matching this string' },
          },
          required: ['appId'],
        },
      },
      {
        name: 'get_app_log_drains',
        description: 'Get log drains configured for a given application',
        inputSchema: {
          type: 'object',
          properties: { appId: { type: 'string', description: 'Application ID' } },
          required: ['appId'],
        },
      },
      {
        name: 'add_app_log_drain',
        description: 'Add a log drain (log forwarding destination) to an application',
        inputSchema: {
          type: 'object',
          properties: {
            appId: { type: 'string', description: 'Application ID' },
            url: { type: 'string', description: 'Drain destination URL (syslog, HTTP, etc.)' },
            drainType: { type: 'string', description: 'Drain type (TCPSyslog, UDPSyslog, HTTP, HTTPSBasicAuth)' },
          },
          required: ['appId', 'url'],
        },
      },
      {
        name: 'delete_app_log_drain',
        description: 'Delete a log drain from an application by drain ID or URL',
        inputSchema: {
          type: 'object',
          properties: {
            appId: { type: 'string', description: 'Application ID' },
            idOrUrl: { type: 'string', description: 'Drain ID or URL to delete' },
          },
          required: ['appId', 'idOrUrl'],
        },
      },
      // ── Notifications ──────────────────────────────────────────────────────
      {
        name: 'list_email_hooks',
        description: 'List email notification hooks for a given owner (user or organisation)',
        inputSchema: {
          type: 'object',
          properties: { ownerId: { type: 'string', description: 'Owner ID (user or organisation ID)' } },
          required: ['ownerId'],
        },
      },
      {
        name: 'create_email_hook',
        description: 'Create an email notification hook for a given owner',
        inputSchema: {
          type: 'object',
          properties: {
            ownerId: { type: 'string', description: 'Owner ID' },
            name: { type: 'string', description: 'Hook name' },
            events: { type: 'array', description: 'List of event types to notify on' },
            notified: { type: 'array', description: 'List of email addresses to notify' },
          },
          required: ['ownerId'],
        },
      },
      {
        name: 'update_email_hook',
        description: 'Update an email notification hook',
        inputSchema: {
          type: 'object',
          properties: {
            ownerId: { type: 'string', description: 'Owner ID' },
            id: { type: 'string', description: 'Hook ID to update' },
            name: { type: 'string', description: 'New hook name' },
            events: { type: 'array', description: 'Updated event types' },
          },
          required: ['ownerId', 'id'],
        },
      },
      {
        name: 'delete_email_hook',
        description: 'Delete an email notification hook',
        inputSchema: {
          type: 'object',
          properties: {
            ownerId: { type: 'string', description: 'Owner ID' },
            id: { type: 'string', description: 'Hook ID to delete' },
          },
          required: ['ownerId', 'id'],
        },
      },
      {
        name: 'list_webhook_hooks',
        description: 'List webhook notification hooks for a given owner',
        inputSchema: {
          type: 'object',
          properties: { ownerId: { type: 'string', description: 'Owner ID' } },
          required: ['ownerId'],
        },
      },
      {
        name: 'create_webhook_hook',
        description: 'Create a webhook notification hook for a given owner',
        inputSchema: {
          type: 'object',
          properties: {
            ownerId: { type: 'string', description: 'Owner ID' },
            url: { type: 'string', description: 'Webhook URL to deliver notifications to' },
            events: { type: 'array', description: 'List of event types to notify on' },
            format: { type: 'string', description: 'Webhook format (e.g. raw, slack, gitter)' },
          },
          required: ['ownerId', 'url'],
        },
      },
      {
        name: 'update_webhook_hook',
        description: 'Update a webhook notification hook',
        inputSchema: {
          type: 'object',
          properties: {
            ownerId: { type: 'string', description: 'Owner ID' },
            id: { type: 'string', description: 'Webhook hook ID to update' },
            url: { type: 'string', description: 'New webhook URL' },
            events: { type: 'array', description: 'Updated event types' },
          },
          required: ['ownerId', 'id'],
        },
      },
      {
        name: 'delete_webhook_hook',
        description: 'Delete a webhook notification hook',
        inputSchema: {
          type: 'object',
          properties: {
            ownerId: { type: 'string', description: 'Owner ID' },
            id: { type: 'string', description: 'Webhook hook ID to delete' },
          },
          required: ['ownerId', 'id'],
        },
      },
      {
        name: 'list_notification_events',
        description: 'List all available event types that can trigger notifications',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'list_webhook_formats',
        description: 'List available webhook payload formats (e.g. raw, slack, gitter)',
        inputSchema: { type: 'object', properties: {} },
      },
      // ── Products ───────────────────────────────────────────────────────────
      {
        name: 'list_addon_providers',
        description: 'List all available add-on providers (e.g. PostgreSQL, MySQL, Redis, MongoDB)',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'get_addon_provider',
        description: 'Get details for a specific add-on provider including available plans',
        inputSchema: {
          type: 'object',
          properties: { providerId: { type: 'string', description: 'Add-on provider ID (e.g. postgresql-addon)' } },
          required: ['providerId'],
        },
      },
      {
        name: 'list_instances',
        description: 'List all available runtime instance types (languages/runtimes supported by Clever Cloud)',
        inputSchema: {
          type: 'object',
          properties: {
            for: { type: 'string', description: 'Filter instances for a specific use case' },
          },
        },
      },
      {
        name: 'list_zones',
        description: 'List all available deployment zones on Clever Cloud',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'list_countries',
        description: 'List all supported countries for billing and deployment',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'list_prices',
        description: 'List pricing information for Clever Cloud resources',
        inputSchema: { type: 'object', properties: {} },
      },
      // ── OAuth ──────────────────────────────────────────────────────────────
      {
        name: 'get_oauth_rights',
        description: 'Get the OAuth rights/scopes available in the Clever Cloud API',
        inputSchema: { type: 'object', properties: {} },
      },
      // ── Users ──────────────────────────────────────────────────────────────
      {
        name: 'create_user',
        description: 'Register a new Clever Cloud user account',
        inputSchema: {
          type: 'object',
          properties: {
            email: { type: 'string', description: 'User email address' },
            password: { type: 'string', description: 'User password' },
            name: { type: 'string', description: 'Full name' },
            lang: { type: 'string', description: 'Preferred language code' },
          },
          required: ['email', 'password'],
        },
      },
      {
        name: 'get_user',
        description: 'Get a Clever Cloud user by ID',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'string', description: 'User ID' } },
          required: ['id'],
        },
      },
      {
        name: 'get_user_applications',
        description: 'Get applications belonging to a specific user by ID',
        inputSchema: {
          type: 'object',
          properties: { id: { type: 'string', description: 'User ID' } },
          required: ['id'],
        },
      },
      // ── Summary ────────────────────────────────────────────────────────────
      {
        name: 'get_summary',
        description: 'Get a summary of all resources owned by the authenticated user and their organisations',
        inputSchema: { type: 'object', properties: {} },
      },
      // ── Network Groups ─────────────────────────────────────────────────────
      {
        name: 'list_network_groups',
        description: 'List all Network Groups for an owner',
        inputSchema: {
          type: 'object',
          properties: { ownerId: { type: 'string', description: 'Owner ID (organisation or user ID)' } },
          required: ['ownerId'],
        },
      },
      {
        name: 'create_network_group',
        description: 'Create a new Network Group for an owner — connects applications in a private WireGuard network',
        inputSchema: {
          type: 'object',
          properties: {
            ownerId: { type: 'string', description: 'Owner ID' },
            label: { type: 'string', description: 'Network group label' },
            description: { type: 'string', description: 'Network group description' },
            tags: { type: 'array', description: 'Tags for the network group' },
          },
          required: ['ownerId', 'label'],
        },
      },
      {
        name: 'get_network_group',
        description: 'Get a specific Network Group by owner and network group ID',
        inputSchema: {
          type: 'object',
          properties: {
            ownerId: { type: 'string', description: 'Owner ID' },
            networkGroupId: { type: 'string', description: 'Network Group ID' },
          },
          required: ['ownerId', 'networkGroupId'],
        },
      },
      {
        name: 'delete_network_group',
        description: 'Delete a Network Group',
        inputSchema: {
          type: 'object',
          properties: {
            ownerId: { type: 'string', description: 'Owner ID' },
            networkGroupId: { type: 'string', description: 'Network Group ID' },
          },
          required: ['ownerId', 'networkGroupId'],
        },
      },
      {
        name: 'list_network_group_members',
        description: 'List members of a Network Group',
        inputSchema: {
          type: 'object',
          properties: {
            ownerId: { type: 'string', description: 'Owner ID' },
            networkGroupId: { type: 'string', description: 'Network Group ID' },
          },
          required: ['ownerId', 'networkGroupId'],
        },
      },
      {
        name: 'add_network_group_member',
        description: 'Add a member (application or add-on) to a Network Group',
        inputSchema: {
          type: 'object',
          properties: {
            ownerId: { type: 'string', description: 'Owner ID' },
            networkGroupId: { type: 'string', description: 'Network Group ID' },
            memberId: { type: 'string', description: 'Member ID (application or add-on ID)' },
            label: { type: 'string', description: 'Member label' },
            domainName: { type: 'string', description: 'Domain name for this member in the network group' },
          },
          required: ['ownerId', 'networkGroupId', 'memberId'],
        },
      },
      {
        name: 'delete_network_group_member',
        description: 'Remove a member from a Network Group',
        inputSchema: {
          type: 'object',
          properties: {
            ownerId: { type: 'string', description: 'Owner ID' },
            networkGroupId: { type: 'string', description: 'Network Group ID' },
            memberId: { type: 'string', description: 'Member ID to remove' },
          },
          required: ['ownerId', 'networkGroupId', 'memberId'],
        },
      },
      {
        name: 'list_network_group_peers',
        description: 'List WireGuard peers in a Network Group',
        inputSchema: {
          type: 'object',
          properties: {
            ownerId: { type: 'string', description: 'Owner ID' },
            networkGroupId: { type: 'string', description: 'Network Group ID' },
          },
          required: ['ownerId', 'networkGroupId'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        // Self
        case 'get_self':                        return this.req('GET', '/self');
        case 'update_self':                     return this.req('PUT', '/self', args);
        case 'delete_self':                     return this.req('DELETE', '/self');
        case 'get_self_id':                     return this.req('GET', '/self/id');
        case 'get_self_credits':                return this.req('GET', '/self/credits');
        case 'get_self_instances':              return this.req('GET', '/self/instances');
        // Self — Applications
        case 'get_self_applications':           return this.req('GET', '/self/applications');
        case 'create_self_application':         return this.req('POST', '/self/applications', args);
        case 'get_self_application':            return this.needsField('appId', args) || this.req('GET', `/self/applications/${enc(args.appId)}`);
        case 'update_self_application':         return this.needsField('appId', args) || this.req('PUT', `/self/applications/${enc(args.appId)}`, omit(args, ['appId']));
        case 'delete_self_application':         return this.needsField('appId', args) || this.req('DELETE', `/self/applications/${enc(args.appId)}`);
        case 'get_self_application_env':        return this.needsField('appId', args) || this.req('GET', `/self/applications/${enc(args.appId)}/env`);
        case 'put_self_application_env':        return this.needsField('appId', args) || this.req('PUT', `/self/applications/${enc(args.appId)}/env`, { env: args.env });
        case 'delete_self_application_env_var': return (this.needsField('appId', args) || this.needsField('envName', args)) ?? this.req('DELETE', `/self/applications/${enc(args.appId)}/env/${enc(args.envName)}`);
        case 'put_self_application_env_var':    return (this.needsField('appId', args) || this.needsField('envName', args)) ?? this.req('PUT', `/self/applications/${enc(args.appId)}/env/${enc(args.envName)}`, { value: args.value });
        case 'get_self_application_instances':  return this.needsField('appId', args) || this.req('GET', `/self/applications/${enc(args.appId)}/instances`);
        case 'start_self_application_instance': return this.needsField('appId', args) || this.req('POST', `/self/applications/${enc(args.appId)}/instances`);
        case 'stop_self_application_instances': return this.needsField('appId', args) || this.req('DELETE', `/self/applications/${enc(args.appId)}/instances`);
        case 'get_self_application_vhosts':     return this.needsField('appId', args) || this.req('GET', `/self/applications/${enc(args.appId)}/vhosts`);
        case 'add_self_application_vhost':      return (this.needsField('appId', args) || this.needsField('domain', args)) ?? this.req('PUT', `/self/applications/${enc(args.appId)}/vhosts/${enc(args.domain)}`);
        case 'delete_self_application_vhost':   return (this.needsField('appId', args) || this.needsField('domain', args)) ?? this.req('DELETE', `/self/applications/${enc(args.appId)}/vhosts/${enc(args.domain)}`);
        case 'get_self_application_addons':     return this.needsField('appId', args) || this.req('GET', `/self/applications/${enc(args.appId)}/addons`);
        case 'link_self_application_addon':     return (this.needsField('appId', args) || this.needsField('addonId', args)) ?? this.req('POST', `/self/applications/${enc(args.appId)}/addons`, { id: args.addonId });
        case 'unlink_self_application_addon':   return (this.needsField('appId', args) || this.needsField('addonId', args)) ?? this.req('DELETE', `/self/applications/${enc(args.appId)}/addons/${enc(args.addonId)}`);
        case 'get_self_application_branches':   return this.needsField('appId', args) || this.req('GET', `/self/applications/${enc(args.appId)}/branches`);
        case 'get_self_application_deployments':return this.needsField('appId', args) || this.req('GET', `/self/applications/${enc(args.appId)}/deployments`);
        case 'get_self_application_tags':       return this.needsField('appId', args) || this.req('GET', `/self/applications/${enc(args.appId)}/tags`);
        case 'put_self_application_tag':        return (this.needsField('appId', args) || this.needsField('tag', args)) ?? this.req('PUT', `/self/applications/${enc(args.appId)}/tags/${enc(args.tag)}`);
        case 'delete_self_application_tag':     return (this.needsField('appId', args) || this.needsField('tag', args)) ?? this.req('DELETE', `/self/applications/${enc(args.appId)}/tags/${enc(args.tag)}`);
        // Self — Add-ons
        case 'get_self_addons':                 return this.req('GET', '/self/addons');
        case 'create_self_addon':               return this.req('POST', '/self/addons', args);
        case 'get_self_addon':                  return this.needsField('addonId', args) || this.req('GET', `/self/addons/${enc(args.addonId)}`);
        case 'update_self_addon':               return this.needsField('addonId', args) || this.req('PUT', `/self/addons/${enc(args.addonId)}/plan`, { plan: args.plan });
        case 'delete_self_addon':               return this.needsField('addonId', args) || this.req('DELETE', `/self/addons/${enc(args.addonId)}`);
        case 'get_self_addon_env':              return this.needsField('addonId', args) || this.req('GET', `/self/addons/${enc(args.addonId)}/env`);
        case 'get_self_addon_tags':             return this.needsField('addonId', args) || this.req('GET', `/self/addons/${enc(args.addonId)}/tags`);
        // Self — Consumers
        case 'get_self_consumers':              return this.req('GET', '/self/consumers');
        case 'create_self_consumer':            return this.req('POST', '/self/consumers', args);
        case 'get_self_consumer':               return this.needsField('key', args) || this.req('GET', `/self/consumers/${enc(args.key)}`);
        case 'update_self_consumer':            return this.needsField('key', args) || this.req('PUT', `/self/consumers/${enc(args.key)}`, omit(args, ['key']));
        case 'delete_self_consumer':            return this.needsField('key', args) || this.req('DELETE', `/self/consumers/${enc(args.key)}`);
        case 'get_self_consumer_secret':        return this.needsField('key', args) || this.req('GET', `/self/consumers/${enc(args.key)}/secret`);
        // Self — Emails, Keys, Tokens
        case 'get_self_emails':                 return this.req('GET', '/self/emails');
        case 'add_self_email':                  return this.needsField('email', args) || this.req('PUT', `/self/emails/${enc(args.email)}`);
        case 'delete_self_email':               return this.needsField('email', args) || this.req('DELETE', `/self/emails/${enc(args.email)}`);
        case 'get_self_keys':                   return this.req('GET', '/self/keys');
        case 'add_self_key':                    return this.needsField('key', args) || this.req('PUT', `/self/keys/${enc(args.key)}`, args.publicKey ? { key: args.publicKey } : undefined);
        case 'delete_self_key':                 return this.needsField('key', args) || this.req('DELETE', `/self/keys/${enc(args.key)}`);
        case 'get_self_tokens':                 return this.req('GET', '/self/tokens');
        case 'revoke_self_tokens':              return this.req('DELETE', '/self/tokens');
        case 'revoke_self_token':               return this.needsField('token', args) || this.req('DELETE', `/self/tokens/${enc(args.token)}`);
        // Self — Payments & MFA
        case 'get_self_payments_billings':      return this.req('GET', '/self/payments/billings');
        case 'get_self_payments_billing':       return this.needsField('bid', args) || this.req('GET', `/self/payments/billings/${enc(args.bid)}`);
        case 'get_self_payments_methods':       return this.req('GET', '/self/payments/methods');
        case 'get_self_payment_method_default': return this.req('GET', '/self/payments/methods/default');
        case 'get_self_mfa_backup_codes':       return this.needsField('kind', args) || this.req('GET', `/self/mfa/${enc(args.kind)}/backupcodes`);
        // Organisations
        case 'list_organisations':              return this.req('GET', '/organisations');
        case 'create_organisation':             return this.req('POST', '/organisations', args);
        case 'get_organisation':                return this.needsField('id', args) || this.req('GET', `/organisations/${enc(args.id)}`);
        case 'update_organisation':             return this.needsField('id', args) || this.req('PUT', `/organisations/${enc(args.id)}`, omit(args, ['id']));
        case 'delete_organisation':             return this.needsField('id', args) || this.req('DELETE', `/organisations/${enc(args.id)}`);
        // Org — Applications
        case 'get_org_applications':            return this.needsField('id', args) || this.req('GET', `/organisations/${enc(args.id)}/applications`);
        case 'create_org_application':          return this.needsField('id', args) || this.req('POST', `/organisations/${enc(args.id)}/applications`, omit(args, ['id']));
        case 'get_org_application':             return (this.needsField('id', args) || this.needsField('appId', args)) ?? this.req('GET', `/organisations/${enc(args.id)}/applications/${enc(args.appId)}`);
        case 'update_org_application':          return (this.needsField('id', args) || this.needsField('appId', args)) ?? this.req('PUT', `/organisations/${enc(args.id)}/applications/${enc(args.appId)}`, omit(args, ['id', 'appId']));
        case 'delete_org_application':          return (this.needsField('id', args) || this.needsField('appId', args)) ?? this.req('DELETE', `/organisations/${enc(args.id)}/applications/${enc(args.appId)}`);
        case 'get_org_application_env':         return (this.needsField('id', args) || this.needsField('appId', args)) ?? this.req('GET', `/organisations/${enc(args.id)}/applications/${enc(args.appId)}/env`);
        case 'put_org_application_env':         return (this.needsField('id', args) || this.needsField('appId', args)) ?? this.req('PUT', `/organisations/${enc(args.id)}/applications/${enc(args.appId)}/env`, { env: args.env });
        case 'delete_org_application_env_var':  return (this.needsField('id', args) || this.needsField('appId', args) || this.needsField('envName', args)) ?? this.req('DELETE', `/organisations/${enc(args.id)}/applications/${enc(args.appId)}/env/${enc(args.envName)}`);
        case 'put_org_application_env_var':     return (this.needsField('id', args) || this.needsField('appId', args) || this.needsField('envName', args)) ?? this.req('PUT', `/organisations/${enc(args.id)}/applications/${enc(args.appId)}/env/${enc(args.envName)}`, { value: args.value });
        case 'get_org_application_instances':   return (this.needsField('id', args) || this.needsField('appId', args)) ?? this.req('GET', `/organisations/${enc(args.id)}/applications/${enc(args.appId)}/instances`);
        case 'start_org_application_instance':  return (this.needsField('id', args) || this.needsField('appId', args)) ?? this.req('POST', `/organisations/${enc(args.id)}/applications/${enc(args.appId)}/instances`);
        case 'stop_org_application_instances':  return (this.needsField('id', args) || this.needsField('appId', args)) ?? this.req('DELETE', `/organisations/${enc(args.id)}/applications/${enc(args.appId)}/instances`);
        case 'get_org_application_vhosts':      return (this.needsField('id', args) || this.needsField('appId', args)) ?? this.req('GET', `/organisations/${enc(args.id)}/applications/${enc(args.appId)}/vhosts`);
        case 'add_org_application_vhost':       return (this.needsField('id', args) || this.needsField('appId', args) || this.needsField('domain', args)) ?? this.req('PUT', `/organisations/${enc(args.id)}/applications/${enc(args.appId)}/vhosts/${enc(args.domain)}`);
        case 'delete_org_application_vhost':    return (this.needsField('id', args) || this.needsField('appId', args) || this.needsField('domain', args)) ?? this.req('DELETE', `/organisations/${enc(args.id)}/applications/${enc(args.appId)}/vhosts/${enc(args.domain)}`);
        case 'get_org_application_addons':      return (this.needsField('id', args) || this.needsField('appId', args)) ?? this.req('GET', `/organisations/${enc(args.id)}/applications/${enc(args.appId)}/addons`);
        case 'link_org_application_addon':      return (this.needsField('id', args) || this.needsField('appId', args) || this.needsField('addonId', args)) ?? this.req('POST', `/organisations/${enc(args.id)}/applications/${enc(args.appId)}/addons`, { id: args.addonId });
        case 'unlink_org_application_addon':    return (this.needsField('id', args) || this.needsField('appId', args) || this.needsField('addonId', args)) ?? this.req('DELETE', `/organisations/${enc(args.id)}/applications/${enc(args.appId)}/addons/${enc(args.addonId)}`);
        case 'get_org_application_branches':    return (this.needsField('id', args) || this.needsField('appId', args)) ?? this.req('GET', `/organisations/${enc(args.id)}/applications/${enc(args.appId)}/branches`);
        case 'get_org_application_deployments': return (this.needsField('id', args) || this.needsField('appId', args)) ?? this.req('GET', `/organisations/${enc(args.id)}/applications/${enc(args.appId)}/deployments`);
        case 'get_org_application_tags':        return (this.needsField('id', args) || this.needsField('appId', args)) ?? this.req('GET', `/organisations/${enc(args.id)}/applications/${enc(args.appId)}/tags`);
        case 'put_org_application_tag':         return (this.needsField('id', args) || this.needsField('appId', args) || this.needsField('tag', args)) ?? this.req('PUT', `/organisations/${enc(args.id)}/applications/${enc(args.appId)}/tags/${enc(args.tag)}`);
        case 'delete_org_application_tag':      return (this.needsField('id', args) || this.needsField('appId', args) || this.needsField('tag', args)) ?? this.req('DELETE', `/organisations/${enc(args.id)}/applications/${enc(args.appId)}/tags/${enc(args.tag)}`);
        // Org — Add-ons
        case 'get_org_addons':                  return this.needsField('id', args) || this.req('GET', `/organisations/${enc(args.id)}/addons`);
        case 'create_org_addon':                return this.needsField('id', args) || this.req('POST', `/organisations/${enc(args.id)}/addons`, omit(args, ['id']));
        case 'get_org_addon':                   return (this.needsField('id', args) || this.needsField('addonId', args)) ?? this.req('GET', `/organisations/${enc(args.id)}/addons/${enc(args.addonId)}`);
        case 'update_org_addon':                return (this.needsField('id', args) || this.needsField('addonId', args)) ?? this.req('PUT', `/organisations/${enc(args.id)}/addons/${enc(args.addonId)}`, { plan: args.plan });
        case 'delete_org_addon':                return (this.needsField('id', args) || this.needsField('addonId', args)) ?? this.req('DELETE', `/organisations/${enc(args.id)}/addons/${enc(args.addonId)}`);
        case 'get_org_addon_env':               return (this.needsField('id', args) || this.needsField('addonId', args)) ?? this.req('GET', `/organisations/${enc(args.id)}/addons/${enc(args.addonId)}/env`);
        // Org — Members
        case 'get_org_members':                 return this.needsField('id', args) || this.req('GET', `/organisations/${enc(args.id)}/members`);
        case 'add_org_member':                  return this.needsField('id', args) || this.req('POST', `/organisations/${enc(args.id)}/members`, omit(args, ['id']));
        case 'update_org_member':               return (this.needsField('id', args) || this.needsField('userId', args)) ?? this.req('PUT', `/organisations/${enc(args.id)}/members/${enc(args.userId)}`, { role: args.role });
        case 'delete_org_member':               return (this.needsField('id', args) || this.needsField('userId', args)) ?? this.req('DELETE', `/organisations/${enc(args.id)}/members/${enc(args.userId)}`);
        // Org — Consumers
        case 'get_org_consumers':               return this.needsField('id', args) || this.req('GET', `/organisations/${enc(args.id)}/consumers`);
        case 'create_org_consumer':             return this.needsField('id', args) || this.req('POST', `/organisations/${enc(args.id)}/consumers`, omit(args, ['id']));
        case 'get_org_consumer':                return (this.needsField('id', args) || this.needsField('key', args)) ?? this.req('GET', `/organisations/${enc(args.id)}/consumers/${enc(args.key)}`);
        case 'update_org_consumer':             return (this.needsField('id', args) || this.needsField('key', args)) ?? this.req('PUT', `/organisations/${enc(args.id)}/consumers/${enc(args.key)}`, omit(args, ['id', 'key']));
        case 'delete_org_consumer':             return (this.needsField('id', args) || this.needsField('key', args)) ?? this.req('DELETE', `/organisations/${enc(args.id)}/consumers/${enc(args.key)}`);
        case 'get_org_consumer_secret':         return (this.needsField('id', args) || this.needsField('key', args)) ?? this.req('GET', `/organisations/${enc(args.id)}/consumers/${enc(args.key)}/secret`);
        // Org — Stats
        case 'get_org_credits':                 return this.needsField('id', args) || this.req('GET', `/organisations/${enc(args.id)}/credits`);
        case 'get_org_instances':               return this.needsField('id', args) || this.req('GET', `/organisations/${enc(args.id)}/instances`);
        case 'get_org_deployments':             return this.needsField('id', args) || this.req('GET', `/organisations/${enc(args.id)}/deployments`);
        case 'get_org_payments_billings':       return this.needsField('id', args) || this.req('GET', `/organisations/${enc(args.id)}/payments/billings`);
        case 'get_org_payments_methods':        return this.needsField('id', args) || this.req('GET', `/organisations/${enc(args.id)}/payments/methods`);
        // Logs
        case 'get_app_logs': {
          const { appId, ...qp } = args;
          if (!appId) return this.err('appId is required');
          const qs = this.buildQuery(qp, ['limit', 'before', 'after', 'filter']);
          return this.req('GET', `/logs/${enc(appId)}${qs}`);
        }
        case 'get_app_log_drains':              return this.needsField('appId', args) || this.req('GET', `/logs/${enc(args.appId)}/drains`);
        case 'add_app_log_drain':               return this.needsField('appId', args) || this.req('POST', `/logs/${enc(args.appId)}/drains`, omit(args, ['appId']));
        case 'delete_app_log_drain':            return (this.needsField('appId', args) || this.needsField('idOrUrl', args)) ?? this.req('DELETE', `/logs/${enc(args.appId)}/drains/${enc(args.idOrUrl)}`);
        // Notifications
        case 'list_email_hooks':                return this.needsField('ownerId', args) || this.req('GET', `/notifications/emailhooks/${enc(args.ownerId)}`);
        case 'create_email_hook':               return this.needsField('ownerId', args) || this.req('POST', `/notifications/emailhooks/${enc(args.ownerId)}`, omit(args, ['ownerId']));
        case 'update_email_hook':               return (this.needsField('ownerId', args) || this.needsField('id', args)) ?? this.req('PUT', `/notifications/emailhooks/${enc(args.ownerId)}/:${enc(args.id)}`, omit(args, ['ownerId', 'id']));
        case 'delete_email_hook':               return (this.needsField('ownerId', args) || this.needsField('id', args)) ?? this.req('DELETE', `/notifications/emailhooks/${enc(args.ownerId)}/:${enc(args.id)}`);
        case 'list_webhook_hooks':              return this.needsField('ownerId', args) || this.req('GET', `/notifications/webhooks/${enc(args.ownerId)}`);
        case 'create_webhook_hook':             return this.needsField('ownerId', args) || this.req('POST', `/notifications/webhooks/${enc(args.ownerId)}`, omit(args, ['ownerId']));
        case 'update_webhook_hook':             return (this.needsField('ownerId', args) || this.needsField('id', args)) ?? this.req('PUT', `/notifications/webhooks/${enc(args.ownerId)}/:${enc(args.id)}`, omit(args, ['ownerId', 'id']));
        case 'delete_webhook_hook':             return (this.needsField('ownerId', args) || this.needsField('id', args)) ?? this.req('DELETE', `/notifications/webhooks/${enc(args.ownerId)}/:${enc(args.id)}`);
        case 'list_notification_events':        return this.req('GET', '/notifications/info/events');
        case 'list_webhook_formats':            return this.req('GET', '/notifications/info/webhookformats');
        // Products
        case 'list_addon_providers':            return this.req('GET', '/products/addonproviders');
        case 'get_addon_provider':              return this.needsField('providerId', args) || this.req('GET', `/products/addonproviders/${enc(args.providerId)}`);
        case 'list_instances': {
          const qs = args.for ? `?for=${encodeURIComponent(String(args.for))}` : '';
          return this.req('GET', `/products/instances${qs}`);
        }
        case 'list_zones':                      return this.req('GET', '/products/zones');
        case 'list_countries':                  return this.req('GET', '/products/countries');
        case 'list_prices':                     return this.req('GET', '/products/prices');
        // OAuth
        case 'get_oauth_rights':                return this.req('GET', '/oauth/rights');
        // Users
        case 'create_user':                     return this.req('POST', '/users', args);
        case 'get_user':                        return this.needsField('id', args) || this.req('GET', `/users/${enc(args.id)}`);
        case 'get_user_applications':           return this.needsField('id', args) || this.req('GET', `/users/${enc(args.id)}/applications`);
        // Summary
        case 'get_summary':                     return this.req('GET', '/summary');
        // Network Groups
        case 'list_network_groups':             return this.needsField('ownerId', args) || this.req('GET', `/v4/networkgroups/organisations/${enc(args.ownerId)}/networkgroups`);
        case 'create_network_group':            return this.needsField('ownerId', args) || this.req('POST', `/v4/networkgroups/organisations/${enc(args.ownerId)}/networkgroups`, omit(args, ['ownerId']));
        case 'get_network_group':               return (this.needsField('ownerId', args) || this.needsField('networkGroupId', args)) ?? this.req('GET', `/v4/networkgroups/organisations/${enc(args.ownerId)}/networkgroups/${enc(args.networkGroupId)}`);
        case 'delete_network_group':            return (this.needsField('ownerId', args) || this.needsField('networkGroupId', args)) ?? this.req('DELETE', `/v4/networkgroups/organisations/${enc(args.ownerId)}/networkgroups/${enc(args.networkGroupId)}`);
        case 'list_network_group_members':      return (this.needsField('ownerId', args) || this.needsField('networkGroupId', args)) ?? this.req('GET', `/v4/networkgroups/organisations/${enc(args.ownerId)}/networkgroups/${enc(args.networkGroupId)}/members`);
        case 'add_network_group_member':        return (this.needsField('ownerId', args) || this.needsField('networkGroupId', args) || this.needsField('memberId', args)) ?? this.req('POST', `/v4/networkgroups/organisations/${enc(args.ownerId)}/networkgroups/${enc(args.networkGroupId)}/members`, omit(args, ['ownerId', 'networkGroupId']));
        case 'delete_network_group_member':     return (this.needsField('ownerId', args) || this.needsField('networkGroupId', args) || this.needsField('memberId', args)) ?? this.req('DELETE', `/v4/networkgroups/organisations/${enc(args.ownerId)}/networkgroups/${enc(args.networkGroupId)}/members/${enc(args.memberId)}`);
        case 'list_network_group_peers':        return (this.needsField('ownerId', args) || this.needsField('networkGroupId', args)) ?? this.req('GET', `/v4/networkgroups/organisations/${enc(args.ownerId)}/networkgroups/${enc(args.networkGroupId)}/peers`);
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

  private err(msg: string): ToolResult {
    return { content: [{ type: 'text', text: msg }], isError: true };
  }

  private needsField(field: string, args: Record<string, unknown>): ToolResult | null {
    if (!args[field]) return this.err(`${field} is required`);
    return null;
  }

  private buildQuery(params: Record<string, unknown>, allowed: string[]): string {
    const parts: string[] = [];
    for (const key of allowed) {
      if (params[key] !== undefined) {
        parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(params[key]))}`);
      }
    }
    return parts.length > 0 ? `?${parts.join('&')}` : '';
  }

  private async req(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    body?: Record<string, unknown>,
  ): Promise<ToolResult> {
    const url = `${this.baseUrl}${path}`;
    const init: RequestInit = {
      method,
      headers: {
        Authorization: this.authorizationHeader,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    };
    if (body && Object.keys(body).length > 0) init.body = JSON.stringify(body);
    const response = await this.fetchWithRetry(url, init);
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${errText}` }],
        isError: true,
      };
    }
    if (response.status === 204) {
      return { content: [{ type: 'text', text: '{"success":true}' }], isError: false };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }
}

// ── Module-level helpers (avoid closure allocation per call) ───────────────

function enc(val: unknown): string {
  return encodeURIComponent(String(val));
}

function omit(obj: Record<string, unknown>, keys: string[]): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const k of Object.keys(obj)) {
    if (!keys.includes(k)) result[k] = obj[k];
  }
  return result;
}
