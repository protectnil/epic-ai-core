/**
 * Yardi MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official Yardi MCP server was found on GitHub. Yardi does not publish a public REST API —
// its integration platform uses SOAP/WSDL web services (ItfResidentTransactions, ItfGuestCard, etc.)
// accessed through client-specific tenant URLs. Access requires Yardi Interface Partner enrollment.
//
// Base URL: https://{client-instance}.yardiasp13.com/{client-path}/webservices (client-specific)
// Auth: Yardi credentials (username, password, server, database, platform) passed per-request in SOAP body
// Docs: Available to certified Yardi Interface Partners via the Yardi Store Developer eXchange
// Rate limits: Not publicly documented; governed by individual Yardi instance configuration

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface YardiConfig {
  baseUrl: string;
  username: string;
  password: string;
  serverName: string;
  database: string;
  platform: string;
  yardiPropertyId?: string;
}

export class YardiMCPServer extends MCPAdapterBase {
  private readonly baseUrl: string;
  private readonly username: string;
  private readonly password: string;
  private readonly serverName: string;
  private readonly database: string;
  private readonly platform: string;
  private readonly yardiPropertyId: string;

  constructor(config: YardiConfig) {
    super();
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.username = config.username;
    this.password = config.password;
    this.serverName = config.serverName;
    this.database = config.database;
    this.platform = config.platform;
    this.yardiPropertyId = config.yardiPropertyId || '';
  }

  static catalog() {
    return {
      name: 'yardi',
      displayName: 'Yardi',
      version: '1.0.0',
      category: 'misc',
      keywords: ['yardi', 'property-management', 'voyager', 'real-estate', 'residents', 'units', 'leases', 'rent', 'maintenance', 'work-orders', 'guest-card', 'prospects'],
      toolNames: [
        'get_property_configurations',
        'get_resident_transactions',
        'get_residents',
        'get_unit_availability',
        'get_guest_cards',
        'add_guest_card',
        'update_guest_card',
        'get_lease_charges',
        'post_resident_charge',
        'get_work_orders',
        'get_vendor_catalog',
        'get_financial_export',
        'get_chart_of_accounts',
        'get_property_list',
        'ping',
      ],
      description: 'Yardi Voyager property management: residents, unit availability, leases, charges, guest cards/prospects, work orders, and financial exports.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_property_configurations',
        description: 'Get property configuration data including unit types, amenities, and rent schedules from Yardi Voyager',
        inputSchema: {
          type: 'object',
          properties: {
            property_id: { type: 'string', description: 'Yardi property ID (defaults to configured yardiPropertyId)' },
          },
        },
      },
      {
        name: 'get_resident_transactions',
        description: 'Retrieve resident ledger transactions including charges, payments, and credits for a property',
        inputSchema: {
          type: 'object',
          properties: {
            property_id: { type: 'string', description: 'Yardi property ID (defaults to configured yardiPropertyId)' },
            from_date: { type: 'string', description: 'Start date for transactions in MM/DD/YYYY format' },
            to_date: { type: 'string', description: 'End date for transactions in MM/DD/YYYY format' },
          },
        },
      },
      {
        name: 'get_residents',
        description: 'Get current resident roster for a Yardi property with lease and unit information',
        inputSchema: {
          type: 'object',
          properties: {
            property_id: { type: 'string', description: 'Yardi property ID (defaults to configured yardiPropertyId)' },
          },
        },
      },
      {
        name: 'get_unit_availability',
        description: 'Get available units for a Yardi property with unit type, size, rent, and availability date',
        inputSchema: {
          type: 'object',
          properties: {
            property_id: { type: 'string', description: 'Yardi property ID (defaults to configured yardiPropertyId)' },
            unit_type: { type: 'string', description: 'Filter by unit type code (e.g. 1BR, 2BR, STU)' },
          },
        },
      },
      {
        name: 'get_guest_cards',
        description: 'Retrieve prospect guest cards (leads) for a Yardi property with contact and follow-up information',
        inputSchema: {
          type: 'object',
          properties: {
            property_id: { type: 'string', description: 'Yardi property ID (defaults to configured yardiPropertyId)' },
            from_date: { type: 'string', description: 'Start date for guest card creation in MM/DD/YYYY format' },
            to_date: { type: 'string', description: 'End date for guest card creation in MM/DD/YYYY format' },
          },
        },
      },
      {
        name: 'add_guest_card',
        description: 'Create a new prospect guest card (lead) in Yardi with contact and leasing preference details',
        inputSchema: {
          type: 'object',
          properties: {
            property_id: { type: 'string', description: 'Yardi property ID (defaults to configured yardiPropertyId)' },
            first_name: { type: 'string', description: 'Prospect first name' },
            last_name: { type: 'string', description: 'Prospect last name' },
            email: { type: 'string', description: 'Prospect email address' },
            phone: { type: 'string', description: 'Prospect phone number' },
            desired_move_in: { type: 'string', description: 'Desired move-in date in MM/DD/YYYY format' },
            desired_unit_type: { type: 'string', description: 'Desired unit type code (e.g. 1BR, 2BR)' },
            source: { type: 'string', description: 'Lead source (e.g. Website, Walk-in, Referral)' },
          },
          required: ['first_name', 'last_name'],
        },
      },
      {
        name: 'update_guest_card',
        description: 'Update an existing Yardi prospect guest card with new contact or follow-up information',
        inputSchema: {
          type: 'object',
          properties: {
            property_id: { type: 'string', description: 'Yardi property ID (defaults to configured yardiPropertyId)' },
            guest_card_id: { type: 'string', description: 'Yardi guest card ID to update' },
            first_name: { type: 'string', description: 'Updated first name' },
            last_name: { type: 'string', description: 'Updated last name' },
            email: { type: 'string', description: 'Updated email address' },
            phone: { type: 'string', description: 'Updated phone number' },
            notes: { type: 'string', description: 'Follow-up notes or comments' },
            stage: { type: 'string', description: 'Leasing stage: Prospect, Application, Approved, Denied' },
          },
          required: ['guest_card_id'],
        },
      },
      {
        name: 'get_lease_charges',
        description: 'Get scheduled lease charges for residents in a Yardi property (rent, fees, utilities)',
        inputSchema: {
          type: 'object',
          properties: {
            property_id: { type: 'string', description: 'Yardi property ID (defaults to configured yardiPropertyId)' },
            tenant_code: { type: 'string', description: 'Filter by specific resident/tenant code' },
          },
        },
      },
      {
        name: 'post_resident_charge',
        description: 'Post a charge or payment to a resident ledger in Yardi Voyager',
        inputSchema: {
          type: 'object',
          properties: {
            property_id: { type: 'string', description: 'Yardi property ID (defaults to configured yardiPropertyId)' },
            tenant_code: { type: 'string', description: 'Resident tenant code' },
            charge_code: { type: 'string', description: 'Charge code (e.g. RNT for rent, LAT for late fee)' },
            amount: { type: 'number', description: 'Charge amount (positive for charge, negative for credit)' },
            transaction_date: { type: 'string', description: 'Transaction date in MM/DD/YYYY format' },
            description: { type: 'string', description: 'Description of the charge or payment' },
          },
          required: ['tenant_code', 'charge_code', 'amount'],
        },
      },
      {
        name: 'get_work_orders',
        description: 'Get maintenance work orders for a Yardi property with status and priority information',
        inputSchema: {
          type: 'object',
          properties: {
            property_id: { type: 'string', description: 'Yardi property ID (defaults to configured yardiPropertyId)' },
            status: { type: 'string', description: 'Filter by status: Open, In Progress, Completed, Cancelled (default: all)' },
            from_date: { type: 'string', description: 'Start date in MM/DD/YYYY format' },
            to_date: { type: 'string', description: 'End date in MM/DD/YYYY format' },
          },
        },
      },
      {
        name: 'get_vendor_catalog',
        description: 'Get vendor information from the Yardi vendor catalog for a property',
        inputSchema: {
          type: 'object',
          properties: {
            property_id: { type: 'string', description: 'Yardi property ID (defaults to configured yardiPropertyId)' },
          },
        },
      },
      {
        name: 'get_financial_export',
        description: 'Export financial data (general ledger, journal entries) from Yardi for a date range',
        inputSchema: {
          type: 'object',
          properties: {
            property_id: { type: 'string', description: 'Yardi property ID (defaults to configured yardiPropertyId)' },
            from_date: { type: 'string', description: 'Start date in MM/DD/YYYY format' },
            to_date: { type: 'string', description: 'End date in MM/DD/YYYY format' },
            account_code: { type: 'string', description: 'Filter by GL account code (optional)' },
          },
        },
      },
      {
        name: 'get_chart_of_accounts',
        description: 'Get the chart of accounts (GL account codes and descriptions) for a Yardi property',
        inputSchema: {
          type: 'object',
          properties: {
            property_id: { type: 'string', description: 'Yardi property ID (defaults to configured yardiPropertyId)' },
          },
        },
      },
      {
        name: 'get_property_list',
        description: 'Get the list of all properties accessible with the configured Yardi credentials',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'ping',
        description: 'Test connectivity to the Yardi Voyager instance and verify credentials are valid',
        inputSchema: { type: 'object', properties: {} },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_property_configurations': return this.getPropertyConfigurations(args);
        case 'get_resident_transactions': return this.getResidentTransactions(args);
        case 'get_residents': return this.getResidents(args);
        case 'get_unit_availability': return this.getUnitAvailability(args);
        case 'get_guest_cards': return this.getGuestCards(args);
        case 'add_guest_card': return this.addGuestCard(args);
        case 'update_guest_card': return this.updateGuestCard(args);
        case 'get_lease_charges': return this.getLeaseCharges(args);
        case 'post_resident_charge': return this.postResidentCharge(args);
        case 'get_work_orders': return this.getWorkOrders(args);
        case 'get_vendor_catalog': return this.getVendorCatalog(args);
        case 'get_financial_export': return this.getFinancialExport(args);
        case 'get_chart_of_accounts': return this.getChartOfAccounts(args);
        case 'get_property_list': return this.getPropertyList();
        case 'ping': return this.ping();
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

  private propId(args: Record<string, unknown>): string {
    return (args.property_id as string) || this.yardiPropertyId;
  }

  /**
   * Build a SOAP envelope for the given Yardi SOAP action and inner body XML.
   * Yardi SOAP services use standard WS-SOAP with credentials embedded in the body.
   */
  private soapEnvelope(bodyXml: string): string {
    return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  <soap:Body>
    ${bodyXml}
  </soap:Body>
</soap:Envelope>`;
  }

  private credentials(propertyId: string): string {
    return `<UserName>${this.username}</UserName>
        <Password>${this.password}</Password>
        <ServerName>${this.serverName}</ServerName>
        <Database>${this.database}</Database>
        <Platform>${this.platform}</Platform>
        <YardiPropertyId>${propertyId}</YardiPropertyId>
        <InterfaceEntity>YardiMCP</InterfaceEntity>
        <InterfaceLicense></InterfaceLicense>`;
  }

  private async soapCall(endpoint: string, soapAction: string, bodyXml: string): Promise<ToolResult> {
    const url = `${this.baseUrl}/${endpoint}`;
    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': `"${soapAction}"`,
      },
      body: this.soapEnvelope(bodyXml),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const text = await response.text();
    // Return raw XML as text — Yardi returns XML, not JSON
    const truncated = text.length > 10_000
      ? text.slice(0, 10_000) + `\n... [truncated, ${text.length} total chars]`
      : text;
    return { content: [{ type: 'text', text: truncated }], isError: false };
  }

  private async getPropertyConfigurations(args: Record<string, unknown>): Promise<ToolResult> {
    const pid = this.propId(args);
    const body = `<GetPropertyConfigurations xmlns="http://tempuri.org/YSI.Interfaces.WebServices/ItfILSGuestCard">
      ${this.credentials(pid)}
    </GetPropertyConfigurations>`;
    return this.soapCall('ItfILSGuestCard.asmx', 'GetPropertyConfigurations', body);
  }

  private async getResidentTransactions(args: Record<string, unknown>): Promise<ToolResult> {
    const pid = this.propId(args);
    const fromDate = (args.from_date as string) || '';
    const toDate = (args.to_date as string) || '';
    const body = `<GetResidentTransactions_Login xmlns="http://tempuri.org/YSI.Interfaces.WebServices/ItfResidentTransactions20">
      ${this.credentials(pid)}
      <FromDate>${fromDate}</FromDate>
      <ToDate>${toDate}</ToDate>
    </GetResidentTransactions_Login>`;
    return this.soapCall('ItfResidentTransactions20.asmx', 'GetResidentTransactions_Login', body);
  }

  private async getResidents(args: Record<string, unknown>): Promise<ToolResult> {
    const pid = this.propId(args);
    const body = `<GetResidents_Login xmlns="http://tempuri.org/YSI.Interfaces.WebServices/ItfResidentTransactions20">
      ${this.credentials(pid)}
    </GetResidents_Login>`;
    return this.soapCall('ItfResidentTransactions20.asmx', 'GetResidents_Login', body);
  }

  private async getUnitAvailability(args: Record<string, unknown>): Promise<ToolResult> {
    const pid = this.propId(args);
    const unitType = (args.unit_type as string) || '';
    const body = `<GetPropertyAvailability xmlns="http://tempuri.org/YSI.Interfaces.WebServices/ItfILSGuestCard">
      ${this.credentials(pid)}
      <UnitType>${unitType}</UnitType>
    </GetPropertyAvailability>`;
    return this.soapCall('ItfILSGuestCard.asmx', 'GetPropertyAvailability', body);
  }

  private async getGuestCards(args: Record<string, unknown>): Promise<ToolResult> {
    const pid = this.propId(args);
    const fromDate = (args.from_date as string) || '';
    const toDate = (args.to_date as string) || '';
    const body = `<GetGuestCards_Login xmlns="http://tempuri.org/YSI.Interfaces.WebServices/ItfILSGuestCard">
      ${this.credentials(pid)}
      <FromDate>${fromDate}</FromDate>
      <ToDate>${toDate}</ToDate>
    </GetGuestCards_Login>`;
    return this.soapCall('ItfILSGuestCard.asmx', 'GetGuestCards_Login', body);
  }

  private async addGuestCard(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.first_name || !args.last_name) {
      return { content: [{ type: 'text', text: 'first_name and last_name are required' }], isError: true };
    }
    const pid = this.propId(args);
    const body = `<AddGuestCard_Login xmlns="http://tempuri.org/YSI.Interfaces.WebServices/ItfILSGuestCard">
      ${this.credentials(pid)}
      <FirstName>${encodeURIComponent(args.first_name as string)}</FirstName>
      <LastName>${encodeURIComponent(args.last_name as string)}</LastName>
      <EmailAddress>${args.email ?? ''}</EmailAddress>
      <PhoneNumber>${args.phone ?? ''}</PhoneNumber>
      <DesiredMoveIn>${args.desired_move_in ?? ''}</DesiredMoveIn>
      <DesiredUnitType>${args.desired_unit_type ?? ''}</DesiredUnitType>
      <LeadSource>${args.source ?? ''}</LeadSource>
    </AddGuestCard_Login>`;
    return this.soapCall('ItfILSGuestCard.asmx', 'AddGuestCard_Login', body);
  }

  private async updateGuestCard(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.guest_card_id) {
      return { content: [{ type: 'text', text: 'guest_card_id is required' }], isError: true };
    }
    const pid = this.propId(args);
    const body = `<EditGuestCard_Login xmlns="http://tempuri.org/YSI.Interfaces.WebServices/ItfILSGuestCard">
      ${this.credentials(pid)}
      <GuestCardId>${encodeURIComponent(args.guest_card_id as string)}</GuestCardId>
      <FirstName>${args.first_name ?? ''}</FirstName>
      <LastName>${args.last_name ?? ''}</LastName>
      <EmailAddress>${args.email ?? ''}</EmailAddress>
      <PhoneNumber>${args.phone ?? ''}</PhoneNumber>
      <Notes>${args.notes ?? ''}</Notes>
      <Stage>${args.stage ?? ''}</Stage>
    </EditGuestCard_Login>`;
    return this.soapCall('ItfILSGuestCard.asmx', 'EditGuestCard_Login', body);
  }

  private async getLeaseCharges(args: Record<string, unknown>): Promise<ToolResult> {
    const pid = this.propId(args);
    const tenantCode = (args.tenant_code as string) || '';
    const body = `<GetLeaseCharges_Login xmlns="http://tempuri.org/YSI.Interfaces.WebServices/ItfResidentTransactions20">
      ${this.credentials(pid)}
      <TenantCode>${tenantCode}</TenantCode>
    </GetLeaseCharges_Login>`;
    return this.soapCall('ItfResidentTransactions20.asmx', 'GetLeaseCharges_Login', body);
  }

  private async postResidentCharge(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.tenant_code || !args.charge_code || args.amount === undefined) {
      return { content: [{ type: 'text', text: 'tenant_code, charge_code, and amount are required' }], isError: true };
    }
    const pid = this.propId(args);
    const body = `<PostResidentTransaction_Login xmlns="http://tempuri.org/YSI.Interfaces.WebServices/ItfResidentTransactions20">
      ${this.credentials(pid)}
      <TenantCode>${encodeURIComponent(args.tenant_code as string)}</TenantCode>
      <ChargeCode>${encodeURIComponent(args.charge_code as string)}</ChargeCode>
      <Amount>${encodeURIComponent(args.amount as string)}</Amount>
      <TransactionDate>${args.transaction_date ?? ''}</TransactionDate>
      <Description>${args.description ?? ''}</Description>
    </PostResidentTransaction_Login>`;
    return this.soapCall('ItfResidentTransactions20.asmx', 'PostResidentTransaction_Login', body);
  }

  private async getWorkOrders(args: Record<string, unknown>): Promise<ToolResult> {
    const pid = this.propId(args);
    const body = `<GetWorkOrders_Login xmlns="http://tempuri.org/YSI.Interfaces.WebServices/ItfWorkOrder">
      ${this.credentials(pid)}
      <Status>${args.status ?? ''}</Status>
      <FromDate>${args.from_date ?? ''}</FromDate>
      <ToDate>${args.to_date ?? ''}</ToDate>
    </GetWorkOrders_Login>`;
    return this.soapCall('ItfWorkOrder.asmx', 'GetWorkOrders_Login', body);
  }

  private async getVendorCatalog(args: Record<string, unknown>): Promise<ToolResult> {
    const pid = this.propId(args);
    const body = `<GetVendorCatalog_Login xmlns="http://tempuri.org/YSI.Interfaces.WebServices/ItfResidentTransactions20">
      ${this.credentials(pid)}
    </GetVendorCatalog_Login>`;
    return this.soapCall('ItfResidentTransactions20.asmx', 'GetVendorCatalog_Login', body);
  }

  private async getFinancialExport(args: Record<string, unknown>): Promise<ToolResult> {
    const pid = this.propId(args);
    const body = `<GetFinancialExport_Login xmlns="http://tempuri.org/YSI.Interfaces.WebServices/ItfResidentTransactions20">
      ${this.credentials(pid)}
      <FromDate>${args.from_date ?? ''}</FromDate>
      <ToDate>${args.to_date ?? ''}</ToDate>
      <AccountCode>${args.account_code ?? ''}</AccountCode>
    </GetFinancialExport_Login>`;
    return this.soapCall('ItfResidentTransactions20.asmx', 'GetFinancialExport_Login', body);
  }

  private async getChartOfAccounts(args: Record<string, unknown>): Promise<ToolResult> {
    const pid = this.propId(args);
    const body = `<GetChartOfAccounts_Login xmlns="http://tempuri.org/YSI.Interfaces.WebServices/ItfResidentTransactions20">
      ${this.credentials(pid)}
    </GetChartOfAccounts_Login>`;
    return this.soapCall('ItfResidentTransactions20.asmx', 'GetChartOfAccounts_Login', body);
  }

  private async getPropertyList(): Promise<ToolResult> {
    const body = `<GetPropertyList_Login xmlns="http://tempuri.org/YSI.Interfaces.WebServices/ItfResidentTransactions20">
      <UserName>${this.username}</UserName>
      <Password>${this.password}</Password>
      <ServerName>${this.serverName}</ServerName>
      <Database>${this.database}</Database>
      <Platform>${this.platform}</Platform>
      <InterfaceEntity>YardiMCP</InterfaceEntity>
      <InterfaceLicense></InterfaceLicense>
    </GetPropertyList_Login>`;
    return this.soapCall('ItfResidentTransactions20.asmx', 'GetPropertyList_Login', body);
  }

  private async ping(): Promise<ToolResult> {
    const pid = this.yardiPropertyId || 'PING';
    const body = `<Ping_Login xmlns="http://tempuri.org/YSI.Interfaces.WebServices/ItfResidentTransactions20">
      ${this.credentials(pid)}
    </Ping_Login>`;
    return this.soapCall('ItfResidentTransactions20.asmx', 'Ping_Login', body);
  }
}
