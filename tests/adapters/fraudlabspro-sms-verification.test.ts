import { describe, it, expect } from 'vitest';
import { FraudLabsProSMSVerificationMCPServer } from '../../src/mcp-servers/fraudlabspro-sms-verification.js';

describe('FraudLabsProSMSVerificationMCPServer', () => {
  const adapter = new FraudLabsProSMSVerificationMCPServer({ apiKey: 'test-key' });

  it('instantiates without error', () => {
    expect(adapter).toBeDefined();
  });

  it('exposes tools with required fields', () => {
    const tools = adapter.tools;
    expect(tools.length).toBeGreaterThan(0);
    for (const tool of tools) {
      expect(tool.name).toBeTruthy();
      expect(tool.description).toBeTruthy();
      expect(tool.inputSchema).toBeDefined();
      expect(tool.inputSchema.type).toBe('object');
    }
  });

  it('catalog returns correct metadata', () => {
    const cat = FraudLabsProSMSVerificationMCPServer.catalog();
    expect(cat.name).toBe('fraudlabspro-sms-verification');
    expect(cat.category).toBe('communication');
    expect(cat.toolNames).toContain('send_sms_verification');
    expect(cat.toolNames).toContain('verify_sms_otp');
    expect(cat.author).toBe('protectnil');
  });

  it('unknown tool returns error, not throw', async () => {
    const result = await adapter.callTool('nonexistent_tool_xyz', {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Unknown tool');
  });
});
