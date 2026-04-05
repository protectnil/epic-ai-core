/**
 * ClickSend MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03.
// No official ClickSend MCP server was found on GitHub.
//
// Base URL: https://rest.clicksend.com/v3
// Auth: HTTP Basic — username (email) + API key as password.
//       Encoded as Base64(username:apiKey) in Authorization header.
// Docs: https://developers.clicksend.com/docs/
// Rate limits: Not specified in OpenAPI spec; standard account-based limits apply.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface ClickSendConfig {
  username: string;
  apiKey: string;
  baseUrl?: string;
}

export class ClickSendMCPServer extends MCPAdapterBase {
  private readonly username: string;
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: ClickSendConfig) {
    super();
    this.username = config.username;
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? 'https://rest.clicksend.com/v3';
  }

  private get authHeaders(): Record<string, string> {
    const encoded = Buffer.from(`${this.username}:${this.apiKey}`).toString('base64');
    return {
      Authorization: `Basic ${encoded}`,
      'Content-Type': 'application/json',
    };
  }

  static catalog() {
    return {
      name: 'clicksend',
      displayName: 'ClickSend',
      version: '1.0.0',
      category: 'communication' as const,
      keywords: [
        'clicksend', 'sms', 'mms', 'email', 'fax', 'voice', 'postcard', 'letter',
        'direct mail', 'messaging', 'bulk sms', 'transactional', 'contact list',
        'campaign', 'automation', 'receipts', 'subaccount',
      ],
      toolNames: [
        'get_account', 'update_account', 'get_account_usage',
        'list_contact_lists', 'create_contact_list', 'get_contact_list', 'update_contact_list', 'delete_contact_list',
        'list_contacts', 'create_contact', 'get_contact', 'update_contact', 'delete_contact', 'import_contacts',
        'send_sms', 'get_sms_history', 'get_sms_receipts', 'get_sms_inbound', 'cancel_sms', 'cancel_all_sms',
        'list_sms_templates', 'create_sms_template', 'update_sms_template', 'delete_sms_template',
        'get_sms_statistics',
        'send_mms', 'get_mms_history', 'get_mms_receipts', 'cancel_mms', 'cancel_all_mms',
        'send_email', 'get_email_history',
        'list_email_templates', 'create_email_template', 'get_email_template', 'update_email_template', 'delete_email_template',
        'list_allowed_email_addresses', 'create_allowed_email_address', 'delete_allowed_email_address',
        'send_fax', 'get_fax_history', 'get_fax_receipts',
        'send_voice', 'get_voice_history', 'get_voice_receipts', 'cancel_voice', 'cancel_all_voice',
        'get_voice_statistics',
        'send_postcard', 'get_postcard_history',
        'send_letter', 'get_letter_history',
        'send_direct_mail', 'list_direct_mail_campaigns',
        'list_post_return_addresses', 'create_post_return_address', 'get_post_return_address',
        'update_post_return_address', 'delete_post_return_address',
        'list_sms_campaigns', 'send_sms_campaign', 'get_sms_campaign', 'update_sms_campaign', 'cancel_sms_campaign',
        'list_email_campaigns', 'send_email_campaign', 'get_email_campaign', 'update_email_campaign', 'cancel_email_campaign',
        'list_subaccounts', 'create_subaccount', 'get_subaccount', 'update_subaccount', 'delete_subaccount',
        'list_dedicated_numbers', 'search_dedicated_numbers', 'buy_dedicated_number',
        'get_country_pricing', 'list_transactions', 'get_transaction',
        'list_timezones', 'list_countries',
        'get_sms_automations_inbound', 'create_sms_automation_inbound',
        'get_sms_automations_receipts', 'create_sms_automation_receipt',
        'upload_file',
      ],
      description:
        'Send and manage SMS, MMS, email, fax, voice calls, postcards, and letters via ClickSend. ' +
        'Manage contact lists, campaigns, subaccounts, dedicated numbers, and delivery receipts.',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // Account
      {
        name: 'get_account',
        description: 'Retrieve the current ClickSend account details and balance.',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'update_account',
        description: 'Update current ClickSend account settings such as name, phone, and country.',
        inputSchema: {
          type: 'object',
          properties: {
            first_name: { type: 'string', description: 'Account holder first name' },
            last_name: { type: 'string', description: 'Account holder last name' },
            phone_number: { type: 'string', description: 'Account phone number' },
            default_country: { type: 'string', description: 'Default country code (e.g. US)' },
          },
        },
      },
      {
        name: 'get_account_usage',
        description: 'Retrieve monthly account usage statistics by channel type for a given year and month.',
        inputSchema: {
          type: 'object',
          properties: {
            year: { type: 'number', description: 'Year (e.g. 2024)' },
            month: { type: 'number', description: 'Month number 1-12' },
            type: { type: 'string', description: 'Channel type: sms, mms, email, fax, voice, post' },
          },
          required: ['year', 'month', 'type'],
        },
      },
      // Contact Lists
      {
        name: 'list_contact_lists',
        description: 'List all contact lists in the ClickSend account with pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Page number (default: 1)' },
            limit: { type: 'number', description: 'Results per page (default: 15)' },
          },
        },
      },
      {
        name: 'create_contact_list',
        description: 'Create a new contact list with a given name in ClickSend.',
        inputSchema: {
          type: 'object',
          properties: {
            list_name: { type: 'string', description: 'Name for the new contact list' },
          },
          required: ['list_name'],
        },
      },
      {
        name: 'get_contact_list',
        description: 'Get details of a specific contact list by list ID.',
        inputSchema: {
          type: 'object',
          properties: {
            list_id: { type: 'number', description: 'Contact list ID' },
          },
          required: ['list_id'],
        },
      },
      {
        name: 'update_contact_list',
        description: 'Update the name of a specific contact list by ID.',
        inputSchema: {
          type: 'object',
          properties: {
            list_id: { type: 'number', description: 'Contact list ID to update' },
            list_name: { type: 'string', description: 'New name for the contact list' },
          },
          required: ['list_id', 'list_name'],
        },
      },
      {
        name: 'delete_contact_list',
        description: 'Permanently delete a contact list and all its contacts.',
        inputSchema: {
          type: 'object',
          properties: {
            list_id: { type: 'number', description: 'Contact list ID to delete' },
          },
          required: ['list_id'],
        },
      },
      // Contacts
      {
        name: 'list_contacts',
        description: 'List all contacts in a specific contact list with pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            list_id: { type: 'number', description: 'Contact list ID' },
            page: { type: 'number', description: 'Page number' },
            limit: { type: 'number', description: 'Results per page' },
          },
          required: ['list_id'],
        },
      },
      {
        name: 'create_contact',
        description: 'Create a new contact in a specific ClickSend contact list.',
        inputSchema: {
          type: 'object',
          properties: {
            list_id: { type: 'number', description: 'Contact list ID to add the contact to' },
            phone_number: { type: 'string', description: 'Contact phone number in E.164 format' },
            first_name: { type: 'string', description: 'Contact first name' },
            last_name: { type: 'string', description: 'Contact last name' },
            email: { type: 'string', description: 'Contact email address' },
          },
          required: ['list_id', 'phone_number'],
        },
      },
      {
        name: 'get_contact',
        description: 'Get details of a specific contact by contact ID within a list.',
        inputSchema: {
          type: 'object',
          properties: {
            list_id: { type: 'number', description: 'Contact list ID' },
            contact_id: { type: 'number', description: 'Contact ID' },
          },
          required: ['list_id', 'contact_id'],
        },
      },
      {
        name: 'update_contact',
        description: 'Update an existing contact in a ClickSend contact list.',
        inputSchema: {
          type: 'object',
          properties: {
            list_id: { type: 'number', description: 'Contact list ID' },
            contact_id: { type: 'number', description: 'Contact ID to update' },
            phone_number: { type: 'string', description: 'Updated phone number in E.164 format' },
            first_name: { type: 'string', description: 'Updated first name' },
            last_name: { type: 'string', description: 'Updated last name' },
            email: { type: 'string', description: 'Updated email address' },
          },
          required: ['list_id', 'contact_id'],
        },
      },
      {
        name: 'delete_contact',
        description: 'Delete a specific contact from a contact list.',
        inputSchema: {
          type: 'object',
          properties: {
            list_id: { type: 'number', description: 'Contact list ID' },
            contact_id: { type: 'number', description: 'Contact ID to delete' },
          },
          required: ['list_id', 'contact_id'],
        },
      },
      {
        name: 'import_contacts',
        description: 'Import contacts from a public CSV or vCard URL into a contact list.',
        inputSchema: {
          type: 'object',
          properties: {
            list_id: { type: 'number', description: 'Contact list ID to import into' },
            file_url: { type: 'string', description: 'Public URL of the CSV or vCard file to import' },
          },
          required: ['list_id', 'file_url'],
        },
      },
      // SMS
      {
        name: 'send_sms',
        description: 'Send one or more SMS messages to recipients with optional scheduling.',
        inputSchema: {
          type: 'object',
          properties: {
            messages: {
              type: 'array',
              description: 'Array of SMS objects each with to, body, from (optional), schedule (optional Unix timestamp)',
              items: { type: 'object' },
            },
          },
          required: ['messages'],
        },
      },
      {
        name: 'get_sms_history',
        description: 'Retrieve SMS send history with optional date range filters.',
        inputSchema: {
          type: 'object',
          properties: {
            date_from: { type: 'number', description: 'Start Unix timestamp' },
            date_to: { type: 'number', description: 'End Unix timestamp' },
            page: { type: 'number', description: 'Page number' },
            limit: { type: 'number', description: 'Results per page' },
          },
        },
      },
      {
        name: 'get_sms_receipts',
        description: 'List all SMS delivery receipts for the account.',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Page number' },
            limit: { type: 'number', description: 'Results per page' },
          },
        },
      },
      {
        name: 'get_sms_inbound',
        description: 'Retrieve all inbound SMS messages received by the account.',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Page number' },
            limit: { type: 'number', description: 'Results per page' },
          },
        },
      },
      {
        name: 'cancel_sms',
        description: 'Cancel a specific scheduled SMS message by message ID.',
        inputSchema: {
          type: 'object',
          properties: {
            message_id: { type: 'string', description: 'Scheduled SMS message ID to cancel' },
          },
          required: ['message_id'],
        },
      },
      {
        name: 'cancel_all_sms',
        description: 'Cancel all scheduled SMS messages in the account immediately.',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'get_sms_statistics',
        description: 'Get overall SMS statistics for the ClickSend account.',
        inputSchema: { type: 'object', properties: {} },
      },
      // SMS Templates
      {
        name: 'list_sms_templates',
        description: 'List all saved SMS message templates in the account.',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Page number' },
            limit: { type: 'number', description: 'Results per page' },
          },
        },
      },
      {
        name: 'create_sms_template',
        description: 'Create a new reusable SMS message template with a name and body.',
        inputSchema: {
          type: 'object',
          properties: {
            template_name: { type: 'string', description: 'Name for the SMS template' },
            body: { type: 'string', description: 'SMS message body content' },
          },
          required: ['template_name', 'body'],
        },
      },
      {
        name: 'update_sms_template',
        description: 'Update an existing SMS template by template ID.',
        inputSchema: {
          type: 'object',
          properties: {
            template_id: { type: 'number', description: 'SMS template ID to update' },
            template_name: { type: 'string', description: 'Updated template name' },
            body: { type: 'string', description: 'Updated message body' },
          },
          required: ['template_id'],
        },
      },
      {
        name: 'delete_sms_template',
        description: 'Delete a specific SMS template by template ID.',
        inputSchema: {
          type: 'object',
          properties: {
            template_id: { type: 'number', description: 'SMS template ID to delete' },
          },
          required: ['template_id'],
        },
      },
      // MMS
      {
        name: 'send_mms',
        description: 'Send one or more MMS messages with media attachments to recipients.',
        inputSchema: {
          type: 'object',
          properties: {
            messages: {
              type: 'array',
              description: 'Array of MMS objects each with to, body, from (optional), media_file (URL)',
              items: { type: 'object' },
            },
          },
          required: ['messages'],
        },
      },
      {
        name: 'get_mms_history',
        description: 'Retrieve MMS send history with optional date range filters.',
        inputSchema: {
          type: 'object',
          properties: {
            date_from: { type: 'number', description: 'Start Unix timestamp' },
            date_to: { type: 'number', description: 'End Unix timestamp' },
            page: { type: 'number', description: 'Page number' },
            limit: { type: 'number', description: 'Results per page' },
          },
        },
      },
      {
        name: 'get_mms_receipts',
        description: 'List all MMS delivery receipts for the account.',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Page number' },
            limit: { type: 'number', description: 'Results per page' },
          },
        },
      },
      {
        name: 'cancel_mms',
        description: 'Cancel a specific scheduled MMS message by message ID.',
        inputSchema: {
          type: 'object',
          properties: {
            message_id: { type: 'string', description: 'Scheduled MMS message ID to cancel' },
          },
          required: ['message_id'],
        },
      },
      {
        name: 'cancel_all_mms',
        description: 'Cancel all pending scheduled MMS messages in the account.',
        inputSchema: { type: 'object', properties: {} },
      },
      // Email
      {
        name: 'send_email',
        description: 'Send a transactional email via ClickSend to one or more recipients.',
        inputSchema: {
          type: 'object',
          properties: {
            to: {
              type: 'array',
              description: 'Array of recipient objects each with email and optionally name',
              items: { type: 'object' },
            },
            from: { type: 'object', description: 'Sender object with email_address_id field' },
            subject: { type: 'string', description: 'Email subject line' },
            body: { type: 'string', description: 'HTML email body content' },
            template_id: { type: 'number', description: 'Optional email template ID to use' },
          },
          required: ['to', 'from', 'subject', 'body'],
        },
      },
      {
        name: 'get_email_history',
        description: 'Retrieve email send history for the account with pagination.',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Page number' },
            limit: { type: 'number', description: 'Results per page' },
          },
        },
      },
      // Email Templates
      {
        name: 'list_email_templates',
        description: 'List all custom email templates in the ClickSend account.',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Page number' },
            limit: { type: 'number', description: 'Results per page' },
          },
        },
      },
      {
        name: 'create_email_template',
        description: 'Create a new email template from a master template in ClickSend.',
        inputSchema: {
          type: 'object',
          properties: {
            template_name: { type: 'string', description: 'Name for the new email template' },
            master_template_id: { type: 'number', description: 'Master template ID to base the new template on' },
          },
          required: ['template_name', 'master_template_id'],
        },
      },
      {
        name: 'get_email_template',
        description: 'Get a specific email template by template ID.',
        inputSchema: {
          type: 'object',
          properties: {
            template_id: { type: 'number', description: 'Email template ID' },
          },
          required: ['template_id'],
        },
      },
      {
        name: 'update_email_template',
        description: 'Update an existing email template in ClickSend by template ID.',
        inputSchema: {
          type: 'object',
          properties: {
            template_id: { type: 'number', description: 'Email template ID to update' },
            template_name: { type: 'string', description: 'Updated template name' },
          },
          required: ['template_id'],
        },
      },
      {
        name: 'delete_email_template',
        description: 'Delete a specific email template from the account.',
        inputSchema: {
          type: 'object',
          properties: {
            template_id: { type: 'number', description: 'Email template ID to delete' },
          },
          required: ['template_id'],
        },
      },
      // Allowed Email Addresses
      {
        name: 'list_allowed_email_addresses',
        description: 'List all verified sender email addresses allowed in ClickSend.',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Page number' },
            limit: { type: 'number', description: 'Results per page' },
          },
        },
      },
      {
        name: 'create_allowed_email_address',
        description: 'Add a new sender email address for verification in ClickSend.',
        inputSchema: {
          type: 'object',
          properties: {
            email_address: { type: 'string', description: 'Email address to add as an allowed sender' },
          },
          required: ['email_address'],
        },
      },
      {
        name: 'delete_allowed_email_address',
        description: 'Remove a verified sender email address from ClickSend.',
        inputSchema: {
          type: 'object',
          properties: {
            email_address_id: { type: 'number', description: 'Allowed email address ID to delete' },
          },
          required: ['email_address_id'],
        },
      },
      // Fax
      {
        name: 'send_fax',
        description: 'Send a fax to one or more recipients with a file URL attachment.',
        inputSchema: {
          type: 'object',
          properties: {
            messages: {
              type: 'array',
              description: 'Array of fax objects each with to, file_url, and optionally from',
              items: { type: 'object' },
            },
          },
          required: ['messages'],
        },
      },
      {
        name: 'get_fax_history',
        description: 'Retrieve fax send history with optional date range filters.',
        inputSchema: {
          type: 'object',
          properties: {
            date_from: { type: 'number', description: 'Start Unix timestamp' },
            date_to: { type: 'number', description: 'End Unix timestamp' },
            page: { type: 'number', description: 'Page number' },
            limit: { type: 'number', description: 'Results per page' },
          },
        },
      },
      {
        name: 'get_fax_receipts',
        description: 'List all fax delivery receipts for the account.',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Page number' },
            limit: { type: 'number', description: 'Results per page' },
          },
        },
      },
      // Voice
      {
        name: 'send_voice',
        description: 'Send text-to-speech voice calls to one or more phone numbers.',
        inputSchema: {
          type: 'object',
          properties: {
            messages: {
              type: 'array',
              description: 'Array of voice objects each with to, body, voice (male/female), and lang',
              items: { type: 'object' },
            },
          },
          required: ['messages'],
        },
      },
      {
        name: 'get_voice_history',
        description: 'Retrieve voice call history with optional date range filters.',
        inputSchema: {
          type: 'object',
          properties: {
            date_from: { type: 'number', description: 'Start Unix timestamp' },
            date_to: { type: 'number', description: 'End Unix timestamp' },
            page: { type: 'number', description: 'Page number' },
            limit: { type: 'number', description: 'Results per page' },
          },
        },
      },
      {
        name: 'get_voice_receipts',
        description: 'List all voice call delivery receipts for the account.',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Page number' },
            limit: { type: 'number', description: 'Results per page' },
          },
        },
      },
      {
        name: 'cancel_voice',
        description: 'Cancel a specific scheduled voice call by message ID.',
        inputSchema: {
          type: 'object',
          properties: {
            message_id: { type: 'string', description: 'Voice call message ID to cancel' },
          },
          required: ['message_id'],
        },
      },
      {
        name: 'cancel_all_voice',
        description: 'Cancel all pending scheduled voice calls in the account.',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'get_voice_statistics',
        description: 'Get overall voice call statistics for the account.',
        inputSchema: { type: 'object', properties: {} },
      },
      // Postcard
      {
        name: 'send_postcard',
        description: 'Send printed postcards to physical mailing addresses via ClickSend.',
        inputSchema: {
          type: 'object',
          properties: {
            messages: {
              type: 'array',
              description: 'Array of postcard objects each with to (address), front, back, and return_address_id',
              items: { type: 'object' },
            },
          },
          required: ['messages'],
        },
      },
      {
        name: 'get_postcard_history',
        description: 'Retrieve postcard send history for the account.',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Page number' },
            limit: { type: 'number', description: 'Results per page' },
          },
        },
      },
      // Letters
      {
        name: 'send_letter',
        description: 'Send a printed letter to a physical address via ClickSend mail service.',
        inputSchema: {
          type: 'object',
          properties: {
            messages: {
              type: 'array',
              description: 'Array of letter objects each with to (address), file_url, and return_address_id',
              items: { type: 'object' },
            },
          },
          required: ['messages'],
        },
      },
      {
        name: 'get_letter_history',
        description: 'Retrieve letter send history for the account.',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Page number' },
            limit: { type: 'number', description: 'Results per page' },
          },
        },
      },
      // Direct Mail
      {
        name: 'send_direct_mail',
        description: 'Create and send a direct mail campaign to a geographic area.',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Campaign name' },
            locations: {
              type: 'array',
              description: 'Array of location objects defining delivery area',
              items: { type: 'object' },
            },
            front_artwork_url: { type: 'string', description: 'URL of the front artwork file' },
            back_artwork_url: { type: 'string', description: 'URL of the back artwork file' },
          },
          required: ['name'],
        },
      },
      {
        name: 'list_direct_mail_campaigns',
        description: 'List all direct mail campaigns in the account.',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Page number' },
            limit: { type: 'number', description: 'Results per page' },
          },
        },
      },
      // Post Return Addresses
      {
        name: 'list_post_return_addresses',
        description: 'List all return addresses configured for post and mail sending.',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Page number' },
            limit: { type: 'number', description: 'Results per page' },
          },
        },
      },
      {
        name: 'create_post_return_address',
        description: 'Create a new return address for use with letters, postcards, and direct mail.',
        inputSchema: {
          type: 'object',
          properties: {
            address_name: { type: 'string', description: 'Friendly name for the return address' },
            address_line_1: { type: 'string', description: 'Street address line 1' },
            address_city: { type: 'string', description: 'City' },
            address_state: { type: 'string', description: 'State or province' },
            address_postal_code: { type: 'string', description: 'Postal or ZIP code' },
            address_country: { type: 'string', description: 'Country code (e.g. AU, US)' },
          },
          required: ['address_name', 'address_line_1', 'address_city', 'address_country'],
        },
      },
      {
        name: 'get_post_return_address',
        description: 'Get a specific post return address by return address ID.',
        inputSchema: {
          type: 'object',
          properties: {
            return_address_id: { type: 'number', description: 'Return address ID' },
          },
          required: ['return_address_id'],
        },
      },
      {
        name: 'update_post_return_address',
        description: 'Update an existing post return address by ID.',
        inputSchema: {
          type: 'object',
          properties: {
            return_address_id: { type: 'number', description: 'Return address ID to update' },
            address_name: { type: 'string', description: 'Updated friendly name' },
            address_line_1: { type: 'string', description: 'Updated street address' },
            address_city: { type: 'string', description: 'Updated city' },
            address_country: { type: 'string', description: 'Updated country code' },
          },
          required: ['return_address_id'],
        },
      },
      {
        name: 'delete_post_return_address',
        description: 'Delete a post return address by return address ID.',
        inputSchema: {
          type: 'object',
          properties: {
            return_address_id: { type: 'number', description: 'Return address ID to delete' },
          },
          required: ['return_address_id'],
        },
      },
      // SMS Campaigns
      {
        name: 'list_sms_campaigns',
        description: 'List all SMS campaigns in the ClickSend account.',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Page number' },
            limit: { type: 'number', description: 'Results per page' },
          },
        },
      },
      {
        name: 'send_sms_campaign',
        description: 'Create and send an SMS campaign to a contact list.',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Campaign name' },
            body: { type: 'string', description: 'SMS campaign message body' },
            list_id: { type: 'number', description: 'Contact list ID to send to' },
            from: { type: 'string', description: 'Sender ID or phone number' },
            schedule: { type: 'number', description: 'Unix timestamp to schedule; omit for immediate send' },
          },
          required: ['name', 'body', 'list_id'],
        },
      },
      {
        name: 'get_sms_campaign',
        description: 'Get details of a specific SMS campaign by campaign ID.',
        inputSchema: {
          type: 'object',
          properties: {
            sms_campaign_id: { type: 'number', description: 'SMS campaign ID' },
          },
          required: ['sms_campaign_id'],
        },
      },
      {
        name: 'update_sms_campaign',
        description: 'Update an existing SMS campaign by campaign ID.',
        inputSchema: {
          type: 'object',
          properties: {
            sms_campaign_id: { type: 'number', description: 'SMS campaign ID to update' },
            name: { type: 'string', description: 'Updated campaign name' },
            body: { type: 'string', description: 'Updated campaign body' },
          },
          required: ['sms_campaign_id'],
        },
      },
      {
        name: 'cancel_sms_campaign',
        description: 'Cancel a scheduled SMS campaign by campaign ID.',
        inputSchema: {
          type: 'object',
          properties: {
            sms_campaign_id: { type: 'number', description: 'SMS campaign ID to cancel' },
          },
          required: ['sms_campaign_id'],
        },
      },
      // Email Campaigns
      {
        name: 'list_email_campaigns',
        description: 'List all email campaigns in the ClickSend account.',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Page number' },
            limit: { type: 'number', description: 'Results per page' },
          },
        },
      },
      {
        name: 'send_email_campaign',
        description: 'Create and send an email campaign to a contact list.',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Campaign name' },
            subject: { type: 'string', description: 'Email subject line' },
            list_id: { type: 'number', description: 'Contact list ID to send to' },
            from_email_address_id: { type: 'number', description: 'Sender email address ID from allowed addresses' },
            template_id: { type: 'number', description: 'Email template ID to use for campaign body' },
            schedule: { type: 'number', description: 'Unix timestamp to schedule; omit for immediate send' },
          },
          required: ['name', 'subject', 'list_id', 'from_email_address_id'],
        },
      },
      {
        name: 'get_email_campaign',
        description: 'Get details of a specific email campaign by campaign ID.',
        inputSchema: {
          type: 'object',
          properties: {
            email_campaign_id: { type: 'number', description: 'Email campaign ID' },
          },
          required: ['email_campaign_id'],
        },
      },
      {
        name: 'update_email_campaign',
        description: 'Update an existing email campaign by campaign ID.',
        inputSchema: {
          type: 'object',
          properties: {
            email_campaign_id: { type: 'number', description: 'Email campaign ID to update' },
            name: { type: 'string', description: 'Updated campaign name' },
            subject: { type: 'string', description: 'Updated email subject line' },
          },
          required: ['email_campaign_id'],
        },
      },
      {
        name: 'cancel_email_campaign',
        description: 'Cancel a scheduled email campaign by campaign ID.',
        inputSchema: {
          type: 'object',
          properties: {
            email_campaign_id: { type: 'number', description: 'Email campaign ID to cancel' },
          },
          required: ['email_campaign_id'],
        },
      },
      // Subaccounts
      {
        name: 'list_subaccounts',
        description: 'List all subaccounts under the ClickSend master account.',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Page number' },
            limit: { type: 'number', description: 'Results per page' },
          },
        },
      },
      {
        name: 'create_subaccount',
        description: 'Create a new subaccount under the master ClickSend account.',
        inputSchema: {
          type: 'object',
          properties: {
            username: { type: 'string', description: 'Subaccount username (email)' },
            password: { type: 'string', description: 'Subaccount password' },
            first_name: { type: 'string', description: 'Subaccount holder first name' },
            last_name: { type: 'string', description: 'Subaccount holder last name' },
          },
          required: ['username', 'password'],
        },
      },
      {
        name: 'get_subaccount',
        description: 'Get details of a specific subaccount by subaccount ID.',
        inputSchema: {
          type: 'object',
          properties: {
            subaccount_id: { type: 'number', description: 'Subaccount ID' },
          },
          required: ['subaccount_id'],
        },
      },
      {
        name: 'update_subaccount',
        description: 'Update an existing subaccount details by subaccount ID.',
        inputSchema: {
          type: 'object',
          properties: {
            subaccount_id: { type: 'number', description: 'Subaccount ID to update' },
            first_name: { type: 'string', description: 'Updated first name' },
            last_name: { type: 'string', description: 'Updated last name' },
          },
          required: ['subaccount_id'],
        },
      },
      {
        name: 'delete_subaccount',
        description: 'Delete a subaccount by subaccount ID.',
        inputSchema: {
          type: 'object',
          properties: {
            subaccount_id: { type: 'number', description: 'Subaccount ID to delete' },
          },
          required: ['subaccount_id'],
        },
      },
      // Dedicated Numbers
      {
        name: 'list_dedicated_numbers',
        description: 'List all dedicated phone numbers owned by the account.',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Page number' },
            limit: { type: 'number', description: 'Results per page' },
          },
        },
      },
      {
        name: 'search_dedicated_numbers',
        description: 'Search available dedicated numbers to purchase by country and optional pattern.',
        inputSchema: {
          type: 'object',
          properties: {
            country: { type: 'string', description: 'Two-letter ISO country code (e.g. US, AU)' },
            search: { type: 'string', description: 'Optional number pattern to search for' },
            search_type: { type: 'number', description: 'Search type: 0=contains, 1=startsWith, 2=endsWith' },
          },
          required: ['country'],
        },
      },
      {
        name: 'buy_dedicated_number',
        description: 'Purchase a specific dedicated phone number for the account.',
        inputSchema: {
          type: 'object',
          properties: {
            dedicated_number: { type: 'string', description: 'Phone number to purchase in E.164 format' },
          },
          required: ['dedicated_number'],
        },
      },
      // Pricing & Billing
      {
        name: 'get_country_pricing',
        description: 'Retrieve messaging pricing for a specific country.',
        inputSchema: {
          type: 'object',
          properties: {
            country: { type: 'string', description: 'Two-letter ISO country code (e.g. US, GB)' },
            currency: { type: 'string', description: 'Currency code for pricing (e.g. USD)' },
          },
          required: ['country'],
        },
      },
      {
        name: 'list_transactions',
        description: 'List all billing transactions for the account.',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Page number' },
            limit: { type: 'number', description: 'Results per page' },
          },
        },
      },
      {
        name: 'get_transaction',
        description: 'Get details of a specific billing transaction by transaction ID.',
        inputSchema: {
          type: 'object',
          properties: {
            transaction_id: { type: 'string', description: 'Transaction ID' },
          },
          required: ['transaction_id'],
        },
      },
      // Utilities
      {
        name: 'list_timezones',
        description: 'List all supported timezones available in ClickSend.',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'list_countries',
        description: 'List all countries supported by ClickSend.',
        inputSchema: { type: 'object', properties: {} },
      },
      // SMS Automations
      {
        name: 'get_sms_automations_inbound',
        description: 'List all inbound SMS automation rules configured in the account.',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Page number' },
            limit: { type: 'number', description: 'Results per page' },
          },
        },
      },
      {
        name: 'create_sms_automation_inbound',
        description: 'Create a new inbound SMS automation rule triggered by incoming messages.',
        inputSchema: {
          type: 'object',
          properties: {
            rule_name: { type: 'string', description: 'Name for the automation rule' },
            trigger_string: { type: 'string', description: 'Keyword that triggers this rule' },
            action: { type: 'string', description: 'Action to take when triggered (e.g. forward, reply)' },
          },
          required: ['rule_name'],
        },
      },
      {
        name: 'get_sms_automations_receipts',
        description: 'List all SMS delivery receipt automation rules in the account.',
        inputSchema: {
          type: 'object',
          properties: {
            page: { type: 'number', description: 'Page number' },
            limit: { type: 'number', description: 'Results per page' },
          },
        },
      },
      {
        name: 'create_sms_automation_receipt',
        description: 'Create a new SMS delivery receipt automation rule.',
        inputSchema: {
          type: 'object',
          properties: {
            rule_name: { type: 'string', description: 'Name for the receipt automation rule' },
            trigger_status: { type: 'string', description: 'Delivery status that triggers the rule (e.g. delivered, failed)' },
          },
          required: ['rule_name'],
        },
      },
      // File Upload
      {
        name: 'upload_file',
        description: 'Upload a file to ClickSend from a public URL with optional format conversion.',
        inputSchema: {
          type: 'object',
          properties: {
            url: { type: 'string', description: 'Publicly accessible URL of the file to upload' },
            convert: { type: 'string', description: 'Conversion format if needed (e.g. pdf, jpg)' },
          },
          required: ['url'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_account': return await this.request('GET', '/account');
        case 'update_account': return await this.request('PUT', '/account', args);
        case 'get_account_usage': return await this.getAccountUsage(args);
        case 'list_contact_lists': return await this.request('GET', '/lists', undefined, this.pageParams(args));
        case 'create_contact_list': return await this.request('POST', '/lists', { list_name: args.list_name });
        case 'get_contact_list': return await this.request('GET', `/lists/${args.list_id}`);
        case 'update_contact_list': return await this.request('PUT', `/lists/${args.list_id}`, { list_name: args.list_name });
        case 'delete_contact_list': return await this.request('DELETE', `/lists/${args.list_id}`);
        case 'list_contacts': return await this.request('GET', `/lists/${args.list_id}/contacts`, undefined, this.pageParams(args));
        case 'create_contact': return await this.createContact(args);
        case 'get_contact': return await this.request('GET', `/lists/${args.list_id}/contacts/${args.contact_id}`);
        case 'update_contact': return await this.updateContact(args);
        case 'delete_contact': return await this.request('DELETE', `/lists/${args.list_id}/contacts/${args.contact_id}`);
        case 'import_contacts': return await this.request('POST', `/lists/${args.list_id}/import`, { file_url: args.file_url });
        case 'send_sms': return await this.request('POST', '/sms/send', { messages: args.messages });
        case 'get_sms_history': return await this.getHistoryWithDates('/sms/history', args);
        case 'get_sms_receipts': return await this.request('GET', '/sms/receipts', undefined, this.pageParams(args));
        case 'get_sms_inbound': return await this.request('GET', '/sms/inbound', undefined, this.pageParams(args));
        case 'cancel_sms': return await this.request('PUT', `/sms/${args.message_id}/cancel`);
        case 'cancel_all_sms': return await this.request('PUT', '/sms/cancel-all');
        case 'get_sms_statistics': return await this.request('GET', '/statistics/sms');
        case 'list_sms_templates': return await this.request('GET', '/sms/templates', undefined, this.pageParams(args));
        case 'create_sms_template': return await this.request('POST', '/sms/templates', { template_name: args.template_name, body: args.body });
        case 'update_sms_template': return await this.request('PUT', `/sms/templates/${args.template_id}`, args);
        case 'delete_sms_template': return await this.request('DELETE', `/sms/templates/${args.template_id}`);
        case 'send_mms': return await this.request('POST', '/mms/send', { messages: args.messages });
        case 'get_mms_history': return await this.getHistoryWithDates('/mms/history', args);
        case 'get_mms_receipts': return await this.request('GET', '/mms/receipts', undefined, this.pageParams(args));
        case 'cancel_mms': return await this.request('PUT', `/mms/${args.message_id}/cancel`);
        case 'cancel_all_mms': return await this.request('PUT', '/mms/cancel-all');
        case 'send_email': return await this.request('POST', '/email/send', args);
        case 'get_email_history': return await this.request('GET', '/email/history', undefined, this.pageParams(args));
        case 'list_email_templates': return await this.request('GET', '/email/templates', undefined, this.pageParams(args));
        case 'create_email_template': return await this.request('POST', '/email/templates', { template_name: args.template_name, master_template_id: args.master_template_id });
        case 'get_email_template': return await this.request('GET', `/email/templates/${args.template_id}`);
        case 'update_email_template': return await this.request('PUT', `/email/templates/${args.template_id}`, args);
        case 'delete_email_template': return await this.request('DELETE', `/email/templates/${args.template_id}`);
        case 'list_allowed_email_addresses': return await this.request('GET', '/email/addresses', undefined, this.pageParams(args));
        case 'create_allowed_email_address': return await this.request('POST', '/email/addresses', { email_address: args.email_address });
        case 'delete_allowed_email_address': return await this.request('DELETE', `/email/addresses/${args.email_address_id}`);
        case 'send_fax': return await this.request('POST', '/fax/send', { messages: args.messages });
        case 'get_fax_history': return await this.getHistoryWithDates('/fax/history', args);
        case 'get_fax_receipts': return await this.request('GET', '/fax/receipts', undefined, this.pageParams(args));
        case 'send_voice': return await this.request('POST', '/voice/send', { messages: args.messages });
        case 'get_voice_history': return await this.getHistoryWithDates('/voice/history', args);
        case 'get_voice_receipts': return await this.request('GET', '/voice/receipts', undefined, this.pageParams(args));
        case 'cancel_voice': return await this.request('PUT', `/voice/${args.message_id}/cancel`);
        case 'cancel_all_voice': return await this.request('PUT', '/voice/cancel-all');
        case 'get_voice_statistics': return await this.request('GET', '/statistics/voice');
        case 'send_postcard': return await this.request('POST', '/post/postcards/send', { messages: args.messages });
        case 'get_postcard_history': return await this.request('GET', '/post/postcards/history', undefined, this.pageParams(args));
        case 'send_letter': return await this.request('POST', '/post/letters/send', { messages: args.messages });
        case 'get_letter_history': return await this.request('GET', '/post/letters/history', undefined, this.pageParams(args));
        case 'send_direct_mail': return await this.request('POST', '/post/direct-mail/campaigns/send', args);
        case 'list_direct_mail_campaigns': return await this.request('GET', '/post/direct-mail/campaigns', undefined, this.pageParams(args));
        case 'list_post_return_addresses': return await this.request('GET', '/post/return-addresses', undefined, this.pageParams(args));
        case 'create_post_return_address': return await this.request('POST', '/post/return-addresses', args);
        case 'get_post_return_address': return await this.request('GET', `/post/return-addresses/${args.return_address_id}`);
        case 'update_post_return_address': return await this.request('PUT', `/post/return-addresses/${args.return_address_id}`, args);
        case 'delete_post_return_address': return await this.request('DELETE', `/post/return-addresses/${args.return_address_id}`);
        case 'list_sms_campaigns': return await this.request('GET', '/sms-campaigns', undefined, this.pageParams(args));
        case 'send_sms_campaign': return await this.request('POST', '/sms-campaigns/send', args);
        case 'get_sms_campaign': return await this.request('GET', `/sms-campaigns/${args.sms_campaign_id}`);
        case 'update_sms_campaign': return await this.request('PUT', `/sms-campaigns/${args.sms_campaign_id}`, args);
        case 'cancel_sms_campaign': return await this.request('PUT', `/sms-campaigns/${args.sms_campaign_id}/cancel`);
        case 'list_email_campaigns': return await this.request('GET', '/email-campaigns', undefined, this.pageParams(args));
        case 'send_email_campaign': return await this.request('POST', '/email-campaigns/send', args);
        case 'get_email_campaign': return await this.request('GET', `/email-campaigns/${args.email_campaign_id}`);
        case 'update_email_campaign': return await this.request('PUT', `/email-campaigns/${args.email_campaign_id}`, args);
        case 'cancel_email_campaign': return await this.request('PUT', `/email-campaigns/${args.email_campaign_id}/cancel`);
        case 'list_subaccounts': return await this.request('GET', '/subaccounts', undefined, this.pageParams(args));
        case 'create_subaccount': return await this.request('POST', '/subaccounts', args);
        case 'get_subaccount': return await this.request('GET', `/subaccounts/${args.subaccount_id}`);
        case 'update_subaccount': return await this.request('PUT', `/subaccounts/${args.subaccount_id}`, args);
        case 'delete_subaccount': return await this.request('DELETE', `/subaccounts/${args.subaccount_id}`);
        case 'list_dedicated_numbers': return await this.request('GET', '/numbers', undefined, this.pageParams(args));
        case 'search_dedicated_numbers': return await this.searchDedicatedNumbers(args);
        case 'buy_dedicated_number': return await this.request('POST', `/numbers/buy/${encodeURIComponent(args.dedicated_number as string)}`);
        case 'get_country_pricing': return await this.getCountryPricing(args);
        case 'list_transactions': return await this.request('GET', '/recharge/transactions', undefined, this.pageParams(args));
        case 'get_transaction': return await this.request('GET', `/recharge/transactions/${args.transaction_id}`);
        case 'list_timezones': return await this.request('GET', '/timezones');
        case 'list_countries': return await this.request('GET', '/countries');
        case 'get_sms_automations_inbound': return await this.request('GET', '/automations/sms/inbound', undefined, this.pageParams(args));
        case 'create_sms_automation_inbound': return await this.request('POST', '/automations/sms/inbound/', args);
        case 'get_sms_automations_receipts': return await this.request('GET', '/automations/sms/receipts', undefined, this.pageParams(args));
        case 'create_sms_automation_receipt': return await this.request('POST', '/automations/sms/receipts', args);
        case 'upload_file': return await this.uploadFile(args);
        default:
          return {
            content: [{ type: 'text', text: `Unknown tool: ${name}` }],
            isError: true,
          };
      }
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }

  private pageParams(args: Record<string, unknown>): URLSearchParams | undefined {
    const params = new URLSearchParams();
    if (args.page) params.set('page', String(args.page as number));
    if (args.limit) params.set('limit', String(args.limit as number));
    return params.toString() ? params : undefined;
  }

  private async request(
    method: string,
    path: string,
    body?: Record<string, unknown>,
    params?: URLSearchParams,
  ): Promise<ToolResult> {
    const qs = params && params.toString() ? `?${params.toString()}` : '';
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}${qs}`, {
      method,
      headers: this.authHeaders,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (response.status === 204) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ status: 204, message: 'Success (no content)' }) }],
        isError: false,
      };
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      const txt = await response.text().catch(() => '');
      return {
        content: [{ type: 'text', text: this.truncate(txt || JSON.stringify({ status: response.status })) }],
        isError: !response.ok,
      };
    }

    if (!response.ok) {
      return {
        content: [
          {
            type: 'text',
            text: `ClickSend API error ${response.status}: ${this.truncate(JSON.stringify(data))}`,
          },
        ],
        isError: true,
      };
    }

    return {
      content: [{ type: 'text', text: this.truncate(JSON.stringify(data, null, 2)) }],
      isError: false,
    };
  }

  private async getAccountUsage(args: Record<string, unknown>): Promise<ToolResult> {
    const { year, month, type } = args;
    if (!year || !month || !type) {
      return { content: [{ type: 'text', text: 'year, month, and type are required' }], isError: true };
    }
    return this.request('GET', `/account/usage/${year}/${month}/${type}`);
  }

  private async createContact(args: Record<string, unknown>): Promise<ToolResult> {
    const { list_id, ...rest } = args;
    return this.request('POST', `/lists/${list_id}/contacts`, rest);
  }

  private async updateContact(args: Record<string, unknown>): Promise<ToolResult> {
    const { list_id, contact_id, ...rest } = args;
    return this.request('PUT', `/lists/${list_id}/contacts/${contact_id}`, rest);
  }

  private async getHistoryWithDates(path: string, args: Record<string, unknown>): Promise<ToolResult> {
    const params = new URLSearchParams();
    if (args.date_from) params.set('date_from', String(args.date_from as number));
    if (args.date_to) params.set('date_to', String(args.date_to as number));
    if (args.page) params.set('page', String(args.page as number));
    if (args.limit) params.set('limit', String(args.limit as number));
    return this.request('GET', path, undefined, params.toString() ? params : undefined);
  }

  private async searchDedicatedNumbers(args: Record<string, unknown>): Promise<ToolResult> {
    const country = args.country as string;
    if (!country) {
      return { content: [{ type: 'text', text: 'country is required' }], isError: true };
    }
    const params = new URLSearchParams();
    if (args.search) params.set('search', String(args.search));
    if (args.search_type !== undefined) params.set('search_type', String(args.search_type as number));
    return this.request('GET', `/numbers/search/${encodeURIComponent(country)}`, undefined, params.toString() ? params : undefined);
  }

  private async getCountryPricing(args: Record<string, unknown>): Promise<ToolResult> {
    const country = args.country as string;
    if (!country) {
      return { content: [{ type: 'text', text: 'country is required' }], isError: true };
    }
    const params = new URLSearchParams();
    if (args.currency) params.set('currency', args.currency as string);
    return this.request('GET', `/pricing/${encodeURIComponent(country)}`, undefined, params.toString() ? params : undefined);
  }

  private async uploadFile(args: Record<string, unknown>): Promise<ToolResult> {
    const url = args.url as string;
    if (!url) {
      return { content: [{ type: 'text', text: 'url is required' }], isError: true };
    }
    const params = new URLSearchParams();
    if (args.convert) params.set('convert', args.convert as string);
    return this.request('POST', '/uploads', { url }, params.toString() ? params : undefined);
  }
}
