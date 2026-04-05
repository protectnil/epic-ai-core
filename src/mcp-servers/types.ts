/**
 * Shared MCP server types — imported by all adapter files.
 * Standardized to MCP spec: inputSchema (not parameters), content Array<{type:'text';text:string}>.
 */

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface ToolResult {
  content: Array<{ type: 'text'; text: string }>;
  isError: boolean;
}
