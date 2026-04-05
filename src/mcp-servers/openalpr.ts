/**
 * OpenALPR MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official OpenALPR MCP server was found on GitHub or npm.
// We build a full REST wrapper covering all endpoints of the CarCheck API v3.
//
// Base URL: https://api.openalpr.com/v3
// Auth: API key passed as query parameter `secret_key` on every request
// Docs: https://cloud.openalpr.com/api/docs/
// Rate limits: Not publicly documented; varies by subscription plan

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface OpenALPRConfig {
  secretKey: string;
  /** Optional base URL override (default: https://api.openalpr.com/v3) */
  baseUrl?: string;
}

export class OpenALPRMCPServer extends MCPAdapterBase {
  private readonly secretKey: string;
  private readonly baseUrl: string;

  constructor(config: OpenALPRConfig) {
    super();
    this.secretKey = config.secretKey;
    this.baseUrl = config.baseUrl ?? 'https://api.openalpr.com/v3';
  }

  static catalog() {
    return {
      name: 'openalpr',
      displayName: 'OpenALPR',
      version: '1.0.0',
      category: 'misc',
      keywords: [
        'openalpr', 'alpr', 'license plate', 'plate recognition', 'lpr',
        'vehicle recognition', 'carcheck', 'automotive', 'ocr', 'camera',
        'parking', 'traffic', 'make', 'model', 'plate number', 'image analysis',
      ],
      toolNames: [
        'get_config',
        'recognize_plate_from_url',
        'recognize_plate_from_bytes',
        'recognize_plate_from_file',
      ],
      description: 'OpenALPR CarCheck API: recognize license plates and vehicle make/model from image URLs, base64-encoded images, or uploaded files.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_config',
        description: 'Get a list of available countries and recognition options supported by the OpenALPR API for plate and vehicle recognition',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'recognize_plate_from_url',
        description: 'Recognize license plates and optionally vehicle make/model from a publicly accessible image URL; returns plate candidates with confidence scores',
        inputSchema: {
          type: 'object',
          properties: {
            image_url: {
              type: 'string',
              description: 'A publicly accessible URL to the image to analyze',
            },
            country: {
              type: 'string',
              description: 'Training data country: "us" for North American plates, "eu" for European plates',
            },
            recognize_vehicle: {
              type: 'number',
              description: 'Set to 1 to also recognize vehicle make/model (costs an additional credit); default: 0',
            },
            return_image: {
              type: 'number',
              description: 'Set to 1 to include the analyzed image base64-encoded in the response; default: 0',
            },
            topn: {
              type: 'number',
              description: 'Number of plate candidates and vehicle classifications to return (1-1000, default: 10)',
            },
          },
          required: ['image_url', 'country'],
        },
      },
      {
        name: 'recognize_plate_from_bytes',
        description: 'Recognize license plates and optionally vehicle make/model from a base64-encoded image string; returns plate candidates with confidence scores',
        inputSchema: {
          type: 'object',
          properties: {
            image_bytes: {
              type: 'string',
              description: 'The image file content encoded as a base64 string',
            },
            country: {
              type: 'string',
              description: 'Training data country: "us" for North American plates, "eu" for European plates',
            },
            recognize_vehicle: {
              type: 'number',
              description: 'Set to 1 to also recognize vehicle make/model (costs an additional credit); default: 0',
            },
            return_image: {
              type: 'number',
              description: 'Set to 1 to include the analyzed image base64-encoded in the response; default: 0',
            },
            topn: {
              type: 'number',
              description: 'Number of plate candidates and vehicle classifications to return (1-1000, default: 10)',
            },
          },
          required: ['image_bytes', 'country'],
        },
      },
      {
        name: 'recognize_plate_from_file',
        description: 'Recognize license plates and optionally vehicle make/model by uploading a base64-encoded image as multipart form-data; returns plate candidates with confidence scores',
        inputSchema: {
          type: 'object',
          properties: {
            image_base64: {
              type: 'string',
              description: 'The image file content encoded as a base64 string (adapter decodes and uploads as binary)',
            },
            country: {
              type: 'string',
              description: 'Training data country: "us" for North American plates, "eu" for European plates',
            },
            recognize_vehicle: {
              type: 'number',
              description: 'Set to 1 to also recognize vehicle make/model (costs an additional credit); default: 0',
            },
            return_image: {
              type: 'number',
              description: 'Set to 1 to include the analyzed image base64-encoded in the response; default: 0',
            },
            topn: {
              type: 'number',
              description: 'Number of plate candidates and vehicle classifications to return (1-1000, default: 10)',
            },
            is_cropped: {
              type: 'number',
              description: 'Set to 1 if the image is already a cropped plate/vehicle crop (skips localization); default: 0',
            },
          },
          required: ['image_base64', 'country'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_config':
          return this.getConfig();
        case 'recognize_plate_from_url':
          return this.recognizePlateFromUrl(args);
        case 'recognize_plate_from_bytes':
          return this.recognizePlateFromBytes(args);
        case 'recognize_plate_from_file':
          return this.recognizePlateFromFile(args);
        default:
          return {
            content: [{ type: 'text', text: `Unknown tool: ${name}` }],
            isError: true,
          };
      }
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Tool execution failed: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      };
    }
  }

  private async getConfig(): Promise<ToolResult> {
    const url = `${this.baseUrl}/config?secret_key=${encodeURIComponent(this.secretKey)}`;
    const response = await this.fetchWithRetry(url, {});

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    const data = await response.json();
    const text = JSON.stringify(data, null, 2);
    const truncated = text.length > 10_000
      ? text.slice(0, 10_000) + '\n... [truncated, ' + text.length + ' total chars]'
      : text;

    return {
      content: [{ type: 'text', text: truncated }],
      isError: false,
    };
  }

  private async recognizePlateFromUrl(args: Record<string, unknown>): Promise<ToolResult> {
    const imageUrl = args.image_url as string;
    const country = args.country as string;
    const recognizeVehicle = (args.recognize_vehicle as number) ?? 0;
    const returnImage = (args.return_image as number) ?? 0;
    const topn = (args.topn as number) ?? 10;

    const params = new URLSearchParams({
      secret_key: this.secretKey,
      image_url: imageUrl,
      country,
      recognize_vehicle: String(recognizeVehicle),
      return_image: String(returnImage),
      topn: String(topn),
    });

    const response = await this.fetchWithRetry(`${this.baseUrl}/recognize_url?${params.toString()}`, {
      method: 'POST',
    });

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    const data = await response.json();
    const text = JSON.stringify(data, null, 2);
    const truncated = text.length > 10_000
      ? text.slice(0, 10_000) + '\n... [truncated, ' + text.length + ' total chars]'
      : text;

    return {
      content: [{ type: 'text', text: truncated }],
      isError: false,
    };
  }

  private async recognizePlateFromBytes(args: Record<string, unknown>): Promise<ToolResult> {
    const imageBytes = args.image_bytes as string;
    const country = args.country as string;
    const recognizeVehicle = (args.recognize_vehicle as number) ?? 0;
    const returnImage = (args.return_image as number) ?? 0;
    const topn = (args.topn as number) ?? 10;

    const params = new URLSearchParams({
      secret_key: this.secretKey,
      country,
      recognize_vehicle: String(recognizeVehicle),
      return_image: String(returnImage),
      topn: String(topn),
    });

    const response = await this.fetchWithRetry(`${this.baseUrl}/recognize_bytes?${params.toString()}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(imageBytes),
    });

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    const data = await response.json();
    const text = JSON.stringify(data, null, 2);
    const truncated = text.length > 10_000
      ? text.slice(0, 10_000) + '\n... [truncated, ' + text.length + ' total chars]'
      : text;

    return {
      content: [{ type: 'text', text: truncated }],
      isError: false,
    };
  }

  private async recognizePlateFromFile(args: Record<string, unknown>): Promise<ToolResult> {
    const imageBase64 = args.image_base64 as string;
    const country = args.country as string;
    const recognizeVehicle = (args.recognize_vehicle as number) ?? 0;
    const returnImage = (args.return_image as number) ?? 0;
    const topn = (args.topn as number) ?? 10;
    const isCropped = (args.is_cropped as number) ?? 0;

    // Decode base64 to binary for multipart upload
    const binaryStr = atob(imageBase64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }

    const params = new URLSearchParams({
      secret_key: this.secretKey,
      country,
      recognize_vehicle: String(recognizeVehicle),
      return_image: String(returnImage),
      topn: String(topn),
      is_cropped: String(isCropped),
    });

    const formData = new FormData();
    formData.append('image', new Blob([bytes]), 'image.jpg');

    const response = await this.fetchWithRetry(`${this.baseUrl}/recognize?${params.toString()}`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }],
        isError: true,
      };
    }

    const data = await response.json();
    const text = JSON.stringify(data, null, 2);
    const truncated = text.length > 10_000
      ? text.slice(0, 10_000) + '\n... [truncated, ' + text.length + ' total chars]'
      : text;

    return {
      content: [{ type: 'text', text: truncated }],
      isError: false,
    };
  }
}
