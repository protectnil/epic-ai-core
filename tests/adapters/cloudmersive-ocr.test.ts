import { describe, it, expect } from 'vitest';
import { CloudmersiveOCRMCPServer } from '../../src/mcp-servers/cloudmersive-ocr.js';

describe('CloudmersiveOCRMCPServer', () => {
  const adapter = new CloudmersiveOCRMCPServer({ apiKey: 'test-key' });

  it('instantiates', () => {
    expect(adapter).toBeDefined();
  });

  it('exposes tools', () => {
    expect(adapter.tools.length).toBeGreaterThan(0);
  });

  it('every tool has required fields', () => {
    for (const tool of adapter.tools) {
      expect(tool.name).toBeTruthy();
      expect(tool.description).toBeTruthy();
      expect(tool.inputSchema).toBeDefined();
      expect(tool.inputSchema.type).toBe('object');
    }
  });

  it('unknown tool returns error', async () => {
    const result = await adapter.callTool('nonexistent_tool', {});
    expect(result.isError).toBe(true);
  });
});
