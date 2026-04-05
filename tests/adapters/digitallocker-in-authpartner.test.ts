import { describe, it, expect } from 'vitest';
import { DigiLockerAuthPartnerMCPServer } from '../../src/mcp-servers/digitallocker-in-authpartner.js';

describe('DigiLockerAuthPartnerMCPServer', () => {
  const adapter = new DigiLockerAuthPartnerMCPServer({
    accessToken: 'test-token',
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret',
  });

  it('instantiates without error', () => {
    expect(adapter).toBeDefined();
  });

  it('instantiates with no config', () => {
    const bare = new DigiLockerAuthPartnerMCPServer();
    expect(bare).toBeDefined();
  });

  it('exposes tools', () => {
    const tools = adapter.tools;
    expect(tools.length).toBeGreaterThan(0);
  });

  it('every tool has required fields', () => {
    for (const tool of adapter.tools) {
      expect(tool.name).toBeTruthy();
      expect(tool.description).toBeTruthy();
      expect(tool.inputSchema).toBeDefined();
      expect(tool.inputSchema.type).toBe('object');
    }
  });

  it('catalog returns expected shape', () => {
    const cat = DigiLockerAuthPartnerMCPServer.catalog();
    expect(cat.name).toBe('digitallocker-in-authpartner');
    expect(cat.category).toBe('government');
    expect(cat.toolNames).toContain('get_authorization_url');
    expect(cat.toolNames).toContain('get_user_details');
    expect(cat.toolNames).toContain('list_issued_documents');
    expect(cat.toolNames).toContain('pull_document');
    expect(cat.author).toBe('protectnil');
  });

  it('get_authorization_url returns error when required params missing', async () => {
    const result = await adapter.callTool('get_authorization_url', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('client_id');
  });

  it('get_authorization_url returns a URL when valid args provided', async () => {
    const result = await adapter.callTool('get_authorization_url', {
      client_id: 'my-client',
      redirect_uri: 'https://example.com/callback',
      state: 'random-state-string',
    });
    expect(result.isError).toBe(false);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.authorization_url).toContain('/oauth2/1/authorize');
    expect(parsed.authorization_url).toContain('client_id=my-client');
    expect(parsed.authorization_url).toContain('state=random-state-string');
  });

  it('exchange_code_for_token returns error when required params missing', async () => {
    const result = await adapter.callTool('exchange_code_for_token', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('code');
  });

  it('get_device_code returns error when client_id missing', async () => {
    const result = await adapter.callTool('get_device_code', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('client_id');
  });

  it('revoke_token returns error when token missing', async () => {
    const result = await adapter.callTool('revoke_token', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('token');
  });

  it('get_document_file returns error when uri missing', async () => {
    const result = await adapter.callTool('get_document_file', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('uri');
  });

  it('get_document_xml returns error when uri missing', async () => {
    const result = await adapter.callTool('get_document_xml', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('uri');
  });

  it('list_document_types returns error when orgid missing', async () => {
    const result = await adapter.callTool('list_document_types', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('orgid');
  });

  it('get_issuer_parameters returns error when orgid or doctype missing', async () => {
    const result = await adapter.callTool('get_issuer_parameters', { orgid: 'test-org' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('doctype');
  });

  it('pull_document returns error when required params missing', async () => {
    const result = await adapter.callTool('pull_document', { orgid: 'test-org' });
    expect(result.isError).toBe(true);
  });

  it('verify_account returns error when neither mobile nor uid provided', async () => {
    const result = await adapter.callTool('verify_account', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('mobile');
  });

  it('push_uri returns error when required fields missing', async () => {
    const result = await adapter.callTool('push_uri', { digilockerid: 'test-id' });
    expect(result.isError).toBe(true);
  });

  it('unknown tool returns error, not throw', async () => {
    const result = await adapter.callTool('nonexistent_tool_xyz', {});
    expect(result.isError).toBe(true);
  });
});
