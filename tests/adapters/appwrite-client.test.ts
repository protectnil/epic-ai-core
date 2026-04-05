import { describe, it, expect } from 'vitest';
import { AppwriteClientMCPServer } from '../../src/mcp-servers/appwrite-client.js';

describe('AppwriteClientMCPServer', () => {
  const adapter = new AppwriteClientMCPServer({ projectId: 'test-project-id' });
  const authed = new AppwriteClientMCPServer({ projectId: 'test-project-id', jwt: 'test-jwt' });

  it('instantiates without error', () => {
    expect(adapter).toBeDefined();
  });

  it('instantiates with jwt', () => {
    expect(authed).toBeDefined();
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

  it('unknown tool returns error, not throw', async () => {
    const result = await adapter.callTool('nonexistent_tool_xyz', {});
    expect(result.isError).toBe(true);
  });

  it('catalog returns required fields', () => {
    const cat = AppwriteClientMCPServer.catalog();
    expect(cat.name).toBe('appwrite-client');
    expect(cat.category).toBe('cloud');
    expect(cat.toolNames.length).toBeGreaterThan(0);
    expect(cat.author).toBeTruthy();
  });

  it('tool names in catalog match tools getter', () => {
    const cat = AppwriteClientMCPServer.catalog();
    const toolNames = adapter.tools.map(t => t.name);
    for (const name of cat.toolNames) {
      expect(toolNames).toContain(name);
    }
  });

  // ── Account ────────────────────────────────────────────────────────────────

  it('create_account returns error without email', async () => {
    const result = await adapter.callTool('create_account', { password: 'pass123' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('email');
  });

  it('create_account returns error without password', async () => {
    const result = await adapter.callTool('create_account', { email: 'test@example.com' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('password');
  });

  it('update_account_email returns error without required fields', async () => {
    const result = await adapter.callTool('update_account_email', { email: 'a@b.com' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('password');
  });

  it('update_account_name returns error without name', async () => {
    const result = await adapter.callTool('update_account_name', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('name');
  });

  it('update_account_password returns error without password', async () => {
    const result = await adapter.callTool('update_account_password', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('password');
  });

  it('update_account_prefs returns error without prefs', async () => {
    const result = await adapter.callTool('update_account_prefs', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('prefs');
  });

  it('create_session returns error without credentials', async () => {
    const result = await adapter.callTool('create_session', {});
    expect(result.isError).toBe(true);
  });

  it('delete_session returns error without sessionId', async () => {
    const result = await adapter.callTool('delete_session', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('sessionId');
  });

  it('get_session returns error without sessionId', async () => {
    const result = await adapter.callTool('get_session', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('sessionId');
  });

  it('create_oauth2_session returns error without provider', async () => {
    const result = await adapter.callTool('create_oauth2_session', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('provider');
  });

  it('create_email_verification returns error without url', async () => {
    const result = await adapter.callTool('create_email_verification', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('url');
  });

  it('complete_email_verification returns error without userId', async () => {
    const result = await adapter.callTool('complete_email_verification', { secret: 'abc' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('userId');
  });

  it('create_password_recovery returns error without email', async () => {
    const result = await adapter.callTool('create_password_recovery', { url: 'https://example.com' });
    expect(result.isError).toBe(true);
  });

  it('complete_password_recovery returns error without required fields', async () => {
    const result = await adapter.callTool('complete_password_recovery', { userId: 'uid' });
    expect(result.isError).toBe(true);
  });

  // ── Database ───────────────────────────────────────────────────────────────

  it('list_documents returns error without collectionId', async () => {
    const result = await adapter.callTool('list_documents', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('collectionId');
  });

  it('get_document returns error without documentId', async () => {
    const result = await adapter.callTool('get_document', { collectionId: 'col123' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('documentId');
  });

  it('create_document returns error without data', async () => {
    const result = await adapter.callTool('create_document', { collectionId: 'col123' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('data');
  });

  it('update_document returns error without data', async () => {
    const result = await adapter.callTool('update_document', { collectionId: 'col123', documentId: 'doc456' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('data');
  });

  it('delete_document returns error without documentId', async () => {
    const result = await adapter.callTool('delete_document', { collectionId: 'col123' });
    expect(result.isError).toBe(true);
  });

  // ── Storage ────────────────────────────────────────────────────────────────

  it('get_file returns error without fileId', async () => {
    const result = await adapter.callTool('get_file', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('fileId');
  });

  it('create_file returns error without file', async () => {
    const result = await adapter.callTool('create_file', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('file');
  });

  it('update_file returns error without read and write', async () => {
    const result = await adapter.callTool('update_file', { fileId: 'f123' });
    expect(result.isError).toBe(true);
  });

  it('delete_file returns error without fileId', async () => {
    const result = await adapter.callTool('delete_file', {});
    expect(result.isError).toBe(true);
  });

  it('get_file_download returns error without fileId', async () => {
    const result = await adapter.callTool('get_file_download', {});
    expect(result.isError).toBe(true);
  });

  it('get_file_preview returns error without fileId', async () => {
    const result = await adapter.callTool('get_file_preview', {});
    expect(result.isError).toBe(true);
  });

  // ── Teams ──────────────────────────────────────────────────────────────────

  it('get_team returns error without teamId', async () => {
    const result = await adapter.callTool('get_team', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('teamId');
  });

  it('create_team returns error without name', async () => {
    const result = await adapter.callTool('create_team', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('name');
  });

  it('update_team returns error without name', async () => {
    const result = await adapter.callTool('update_team', { teamId: 't123' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('name');
  });

  it('delete_team returns error without teamId', async () => {
    const result = await adapter.callTool('delete_team', {});
    expect(result.isError).toBe(true);
  });

  it('get_team_memberships returns error without teamId', async () => {
    const result = await adapter.callTool('get_team_memberships', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('teamId');
  });

  it('create_team_membership returns error without required fields', async () => {
    const result = await adapter.callTool('create_team_membership', { teamId: 't123' });
    expect(result.isError).toBe(true);
  });

  it('update_membership_roles returns error without roles', async () => {
    const result = await adapter.callTool('update_membership_roles', { teamId: 't123', membershipId: 'm456' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('roles');
  });

  it('delete_team_membership returns error without membershipId', async () => {
    const result = await adapter.callTool('delete_team_membership', { teamId: 't123' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('membershipId');
  });

  // ── Functions ──────────────────────────────────────────────────────────────

  it('list_executions returns error without functionId', async () => {
    const result = await adapter.callTool('list_executions', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('functionId');
  });

  it('get_execution returns error without executionId', async () => {
    const result = await adapter.callTool('get_execution', { functionId: 'fn123' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('executionId');
  });

  it('create_execution returns error without functionId', async () => {
    const result = await adapter.callTool('create_execution', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('functionId');
  });

  // ── Avatars ────────────────────────────────────────────────────────────────

  it('get_browser_icon returns error without code', async () => {
    const result = await adapter.callTool('get_browser_icon', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('code');
  });

  it('get_credit_card_icon returns error without code', async () => {
    const result = await adapter.callTool('get_credit_card_icon', {});
    expect(result.isError).toBe(true);
  });

  it('get_favicon returns error without url', async () => {
    const result = await adapter.callTool('get_favicon', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('url');
  });

  it('get_flag returns error without code', async () => {
    const result = await adapter.callTool('get_flag', {});
    expect(result.isError).toBe(true);
  });

  it('get_image returns error without url', async () => {
    const result = await adapter.callTool('get_image', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('url');
  });

  it('get_qr_code returns error without text', async () => {
    const result = await adapter.callTool('get_qr_code', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('text');
  });

  it('accepts custom baseUrl', () => {
    const custom = new AppwriteClientMCPServer({
      projectId: 'pid',
      baseUrl: 'https://self-hosted.example.com/v1',
    });
    expect(custom).toBeDefined();
  });
});
