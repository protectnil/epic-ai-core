/**
 * @epicai/core — Test Harness Canonical Tool Definitions
 * 8 tools shared across all three harness backends.
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import type { ToolInfo } from '../types.js';

export const CANONICAL_TOOL_NAMES = [
  'echo', 'sleep', 'fail', 'malformed',
  'approval_target', 'multi_step', 'stateful_counter', 'ping',
] as const;

export type CanonicalToolName = (typeof CANONICAL_TOOL_NAMES)[number];

export const CANONICAL_TOOLS: ToolInfo[] = [
  {
    name: 'echo',
    description: 'Returns the input unchanged. Proves basic tool invocation.',
    parameters: {
      type: 'object',
      properties: {
        message: { type: 'string', description: 'Message to echo back' },
      },
      required: ['message'],
    },
  },
  {
    name: 'sleep',
    description: 'Delays for the specified duration. Proves timeout and latency handling.',
    parameters: {
      type: 'object',
      properties: {
        ms: { type: 'number', description: 'Milliseconds to sleep (max 5000)' },
      },
      required: ['ms'],
    },
  },
  {
    name: 'fail',
    description: 'Always returns a structured error. Proves error propagation.',
    parameters: {
      type: 'object',
      properties: {
        reason: { type: 'string', description: 'Optional failure reason' },
      },
    },
  },
  {
    name: 'malformed',
    description: 'Returns partial or invalid data. Proves parser and resilience behavior.',
    parameters: {
      type: 'object',
      properties: {
        variant: { type: 'number', description: 'Malformed variant index (0-2)' },
      },
    },
  },
  {
    name: 'approval_target',
    description: 'Requires approval gating in config. Proves approval-needed event flow.',
    parameters: {
      type: 'object',
      properties: {
        action: { type: 'string', description: 'Action requiring approval' },
      },
      required: ['action'],
    },
  },
  {
    name: 'multi_step',
    description: 'Returns data that triggers follow-up tool calls. Proves planner iteration.',
    parameters: {
      type: 'object',
      properties: {
        step: { type: 'number', description: 'Current step number (1-based)' },
      },
      required: ['step'],
    },
  },
  {
    name: 'stateful_counter',
    description: 'Increments per call. Proves connection state, isolation, and reset.',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'ping',
    description: 'Returns health status and backend identity. Proves liveness.',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
];
