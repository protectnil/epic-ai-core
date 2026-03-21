#!/usr/bin/env node
/**
 * @epicai/core — Test Harness STDIO Server Process
 * Standalone MCP server for the STDIO harness profile.
 * Spawned as a child process by StdioHarnessBackend.
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { HarnessProfile } from '../types.js';
import { createHandlerState, resetHandlerState, handleTool } from '../shared/handlers.js';

const state = createHandlerState(HarnessProfile.Stdio);
const server = new McpServer({ name: 'harness-stdio', version: '1.0.0' });

server.tool('echo', { message: z.string() }, async (args) => {
  const r = await handleTool('echo', args, state);
  return { content: [{ type: 'text' as const, text: JSON.stringify(r.content) }], isError: r.isError };
});

server.tool('sleep', { ms: z.number() }, async (args) => {
  const r = await handleTool('sleep', args, state);
  return { content: [{ type: 'text' as const, text: JSON.stringify(r.content) }], isError: r.isError };
});

server.tool('fail', { reason: z.string().optional() }, async (args) => {
  const r = await handleTool('fail', args, state);
  return { content: [{ type: 'text' as const, text: JSON.stringify(r.content) }], isError: r.isError };
});

server.tool('malformed', { variant: z.number().optional() }, async (args) => {
  const r = await handleTool('malformed', args, state);
  return { content: [{ type: 'text' as const, text: JSON.stringify(r.content) }], isError: r.isError };
});

server.tool('approval_target', { action: z.string() }, async (args) => {
  const r = await handleTool('approval_target', args, state);
  return { content: [{ type: 'text' as const, text: JSON.stringify(r.content) }], isError: r.isError };
});

server.tool('multi_step', { step: z.number() }, async (args) => {
  const r = await handleTool('multi_step', args, state);
  return { content: [{ type: 'text' as const, text: JSON.stringify(r.content) }], isError: r.isError };
});

server.tool('stateful_counter', {}, async () => {
  const r = await handleTool('stateful_counter', {}, state);
  return { content: [{ type: 'text' as const, text: JSON.stringify(r.content) }], isError: r.isError };
});

server.tool('ping', {}, async () => {
  const r = await handleTool('ping', {}, state);
  return { content: [{ type: 'text' as const, text: JSON.stringify(r.content) }], isError: r.isError };
});

// Handle reset via a special tool (since stdio has no out-of-band channel)
server.tool('_harness_reset', {}, async () => {
  resetHandlerState(state);
  return { content: [{ type: 'text' as const, text: JSON.stringify({ reset: true }) }], isError: false };
});

const transport = new StdioServerTransport();
await server.connect(transport);
