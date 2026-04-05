/**
 * Presalytics OOXML Automation MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03. Presalytics has not published an official MCP server.
//
// Base URL: https://api.presalytics.io/ooxml-automation
// Auth: JWT Bearer token — Authorization: Bearer <token>
// Docs: https://presalytics.io/docs/
// Spec: https://api.apis.guru/v2/specs/presalytics.io/ooxml/0.1.0/openapi.json
// Rate limits: Not publicly documented.
// Note: Converts Excel and PowerPoint documents into live dashboards and stories.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface PresalyticsOoxmlConfig {
  accessToken: string;
  baseUrl?: string;
}

export class PresalyticsOoxmlMCPServer extends MCPAdapterBase {
  private readonly accessToken: string;
  private readonly baseUrl: string;

  constructor(config: PresalyticsOoxmlConfig) {
    super();
    this.accessToken = config.accessToken;
    this.baseUrl = config.baseUrl || 'https://api.presalytics.io/ooxml-automation';
  }

  static catalog() {
    return {
      name: 'presalytics-ooxml',
      displayName: 'Presalytics OOXML Automation',
      version: '1.0.0',
      category: 'productivity' as const,
      keywords: [
        'presalytics', 'ooxml', 'powerpoint', 'excel', 'openxml',
        'document', 'slide', 'chart', 'table', 'shape', 'image',
        'theme', 'svg', 'xml', 'automation', 'conversion', 'dashboard',
      ],
      toolNames: [
        'upload_document', 'get_document', 'delete_document', 'download_document',
        'clone_document', 'get_document_children', 'list_document_types',
        'get_chart', 'get_chart_details', 'get_chart_children',
        'get_chart_data', 'update_chart_data',
        'get_chart_xml', 'update_chart_xml', 'get_chart_svg',
        'get_slide', 'get_slide_details', 'get_slide_children',
        'get_slide_xml', 'update_slide_xml', 'get_slide_svg',
        'get_table', 'get_table_details', 'get_table_children',
        'get_table_data', 'update_table_data',
        'get_table_xml', 'update_table_xml', 'get_table_svg',
        'get_shape', 'get_shape_details', 'get_shape_children',
        'get_shape_xml', 'update_shape_xml', 'get_shape_svg',
        'get_image', 'get_image_details', 'download_image',
        'get_image_xml', 'update_image_xml', 'get_image_svg', 'get_image_children',
        'get_theme', 'get_theme_details', 'get_theme_children',
        'get_theme_xml', 'update_theme_xml', 'get_theme_svg',
        'get_connection_shape', 'get_connection_shape_details',
        'get_connection_shape_xml', 'update_connection_shape_xml', 'get_connection_shape_svg',
        'get_connection_shape_children',
        'get_group', 'get_group_details',
        'get_group_xml', 'update_group_xml', 'get_group_svg', 'get_group_children',
        'get_smart_art', 'get_smart_art_details',
        'get_smart_art_xml', 'update_smart_art_xml', 'get_smart_art_svg', 'get_smart_art_children',
        'get_shape_tree', 'get_shape_tree_details',
        'get_shape_tree_xml', 'update_shape_tree_xml', 'get_shape_tree_svg', 'get_shape_tree_children',
      ],
      description: 'Convert and manipulate Excel and PowerPoint OOXML documents: upload documents, read and update charts, tables, slides, shapes, images, and themes, retrieve SVG renders and underlying XML via the Presalytics OOXML Automation REST API.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // -- Documents --------------------------------------------------------
      {
        name: 'upload_document',
        description: 'Upload a new OOXML document (Excel or PowerPoint) for automation processing',
        inputSchema: {
          type: 'object',
          properties: {
            file_content: { type: 'string', description: 'Base64-encoded file content' },
            filename: { type: 'string', description: 'Original filename including extension (.pptx, .xlsx, etc.)' },
          },
          required: ['file_content', 'filename'],
        },
      },
      {
        name: 'get_document',
        description: 'Get metadata and details for an OOXML document by ID',
        inputSchema: {
          type: 'object',
          properties: {
            document_id: { type: 'string', description: 'The document ID' },
          },
          required: ['document_id'],
        },
      },
      {
        name: 'delete_document',
        description: 'Delete an OOXML document by ID',
        inputSchema: {
          type: 'object',
          properties: {
            document_id: { type: 'string', description: 'The document ID to delete' },
          },
          required: ['document_id'],
        },
      },
      {
        name: 'download_document',
        description: 'Download the original OOXML document file by ID',
        inputSchema: {
          type: 'object',
          properties: {
            document_id: { type: 'string', description: 'The document ID to download' },
          },
          required: ['document_id'],
        },
      },
      {
        name: 'clone_document',
        description: 'Clone an existing OOXML document to a new parent story',
        inputSchema: {
          type: 'object',
          properties: {
            document_id: { type: 'string', description: 'The document ID to clone' },
            target_story_id: { type: 'string', description: 'Target story ID for the cloned document' },
          },
          required: ['document_id'],
        },
      },
      {
        name: 'get_document_children',
        description: 'Get the dependent objects tree for a document',
        inputSchema: {
          type: 'object',
          properties: {
            document_id: { type: 'string', description: 'The document ID' },
          },
          required: ['document_id'],
        },
      },
      {
        name: 'list_document_types',
        description: 'List all supported document types for OOXML automation',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      // -- Charts -----------------------------------------------------------
      {
        name: 'get_chart',
        description: 'Get an OOXML chart element by ID',
        inputSchema: {
          type: 'object',
          properties: {
            chart_id: { type: 'string', description: 'The chart ID' },
          },
          required: ['chart_id'],
        },
      },
      {
        name: 'get_chart_details',
        description: 'Get full details and metadata for a chart',
        inputSchema: {
          type: 'object',
          properties: {
            chart_id: { type: 'string', description: 'The chart ID' },
          },
          required: ['chart_id'],
        },
      },
      {
        name: 'get_chart_children',
        description: 'Get the dependent objects tree for a chart',
        inputSchema: {
          type: 'object',
          properties: {
            chart_id: { type: 'string', description: 'The chart ID' },
          },
          required: ['chart_id'],
        },
      },
      {
        name: 'get_chart_data',
        description: 'Get the underlying data for a chart (rows, columns, data points)',
        inputSchema: {
          type: 'object',
          properties: {
            chart_id: { type: 'string', description: 'The chart ID' },
          },
          required: ['chart_id'],
        },
      },
      {
        name: 'update_chart_data',
        description: 'Update the underlying data for a chart',
        inputSchema: {
          type: 'object',
          properties: {
            chart_id: { type: 'string', description: 'The chart ID' },
            data: { type: 'object', description: 'Updated chart data payload' },
          },
          required: ['chart_id', 'data'],
        },
      },
      {
        name: 'get_chart_xml',
        description: 'Get the underlying OOXML markup for a chart',
        inputSchema: {
          type: 'object',
          properties: {
            chart_id: { type: 'string', description: 'The chart ID' },
          },
          required: ['chart_id'],
        },
      },
      {
        name: 'update_chart_xml',
        description: 'Modify the underlying OOXML markup for a chart',
        inputSchema: {
          type: 'object',
          properties: {
            chart_id: { type: 'string', description: 'The chart ID' },
            xml_content: { type: 'string', description: 'Updated OOXML markup for the chart' },
          },
          required: ['chart_id', 'xml_content'],
        },
      },
      {
        name: 'get_chart_svg',
        description: 'Get the SVG rendering of a chart',
        inputSchema: {
          type: 'object',
          properties: {
            chart_id: { type: 'string', description: 'The chart ID' },
          },
          required: ['chart_id'],
        },
      },
      // -- Slides -----------------------------------------------------------
      {
        name: 'get_slide',
        description: 'Get a slide element by ID',
        inputSchema: {
          type: 'object',
          properties: {
            slide_id: { type: 'string', description: 'The slide ID' },
          },
          required: ['slide_id'],
        },
      },
      {
        name: 'get_slide_details',
        description: 'Get full details and metadata for a slide',
        inputSchema: {
          type: 'object',
          properties: {
            slide_id: { type: 'string', description: 'The slide ID' },
          },
          required: ['slide_id'],
        },
      },
      {
        name: 'get_slide_children',
        description: 'Get the dependent objects tree for a slide',
        inputSchema: {
          type: 'object',
          properties: {
            slide_id: { type: 'string', description: 'The slide ID' },
          },
          required: ['slide_id'],
        },
      },
      {
        name: 'get_slide_xml',
        description: 'Get the underlying OOXML markup for a slide',
        inputSchema: {
          type: 'object',
          properties: {
            slide_id: { type: 'string', description: 'The slide ID' },
          },
          required: ['slide_id'],
        },
      },
      {
        name: 'update_slide_xml',
        description: 'Modify the underlying OOXML markup for a slide',
        inputSchema: {
          type: 'object',
          properties: {
            slide_id: { type: 'string', description: 'The slide ID' },
            xml_content: { type: 'string', description: 'Updated OOXML markup for the slide' },
          },
          required: ['slide_id', 'xml_content'],
        },
      },
      {
        name: 'get_slide_svg',
        description: 'Get the SVG rendering of a slide',
        inputSchema: {
          type: 'object',
          properties: {
            slide_id: { type: 'string', description: 'The slide ID' },
          },
          required: ['slide_id'],
        },
      },
      // -- Tables -----------------------------------------------------------
      {
        name: 'get_table',
        description: 'Get a table element by ID',
        inputSchema: {
          type: 'object',
          properties: {
            table_id: { type: 'string', description: 'The table ID' },
          },
          required: ['table_id'],
        },
      },
      {
        name: 'get_table_details',
        description: 'Get full details and metadata for a table',
        inputSchema: {
          type: 'object',
          properties: {
            table_id: { type: 'string', description: 'The table ID' },
          },
          required: ['table_id'],
        },
      },
      {
        name: 'get_table_children',
        description: 'Get the dependent objects tree for a table',
        inputSchema: {
          type: 'object',
          properties: {
            table_id: { type: 'string', description: 'The table ID' },
          },
          required: ['table_id'],
        },
      },
      {
        name: 'get_table_data',
        description: 'Get the underlying data for a table (rows, columns, cells)',
        inputSchema: {
          type: 'object',
          properties: {
            table_id: { type: 'string', description: 'The table ID' },
          },
          required: ['table_id'],
        },
      },
      {
        name: 'update_table_data',
        description: 'Update the underlying data for a table',
        inputSchema: {
          type: 'object',
          properties: {
            table_id: { type: 'string', description: 'The table ID' },
            data: { type: 'object', description: 'Updated table data payload' },
          },
          required: ['table_id', 'data'],
        },
      },
      {
        name: 'get_table_xml',
        description: 'Get the underlying OOXML markup for a table',
        inputSchema: {
          type: 'object',
          properties: {
            table_id: { type: 'string', description: 'The table ID' },
          },
          required: ['table_id'],
        },
      },
      {
        name: 'update_table_xml',
        description: 'Modify the underlying OOXML markup for a table',
        inputSchema: {
          type: 'object',
          properties: {
            table_id: { type: 'string', description: 'The table ID' },
            xml_content: { type: 'string', description: 'Updated OOXML markup for the table' },
          },
          required: ['table_id', 'xml_content'],
        },
      },
      {
        name: 'get_table_svg',
        description: 'Get the SVG rendering of a table',
        inputSchema: {
          type: 'object',
          properties: {
            table_id: { type: 'string', description: 'The table ID' },
          },
          required: ['table_id'],
        },
      },
      // -- Shapes -----------------------------------------------------------
      {
        name: 'get_shape',
        description: 'Get a shape element by ID',
        inputSchema: {
          type: 'object',
          properties: {
            shape_id: { type: 'string', description: 'The shape ID' },
          },
          required: ['shape_id'],
        },
      },
      {
        name: 'get_shape_details',
        description: 'Get full details and metadata for a shape',
        inputSchema: {
          type: 'object',
          properties: {
            shape_id: { type: 'string', description: 'The shape ID' },
          },
          required: ['shape_id'],
        },
      },
      {
        name: 'get_shape_children',
        description: 'Get the dependent objects tree for a shape',
        inputSchema: {
          type: 'object',
          properties: {
            shape_id: { type: 'string', description: 'The shape ID' },
          },
          required: ['shape_id'],
        },
      },
      {
        name: 'get_shape_xml',
        description: 'Get the underlying OOXML markup for a shape',
        inputSchema: {
          type: 'object',
          properties: {
            shape_id: { type: 'string', description: 'The shape ID' },
          },
          required: ['shape_id'],
        },
      },
      {
        name: 'update_shape_xml',
        description: 'Modify the underlying OOXML markup for a shape',
        inputSchema: {
          type: 'object',
          properties: {
            shape_id: { type: 'string', description: 'The shape ID' },
            xml_content: { type: 'string', description: 'Updated OOXML markup for the shape' },
          },
          required: ['shape_id', 'xml_content'],
        },
      },
      {
        name: 'get_shape_svg',
        description: 'Get the SVG rendering of a shape',
        inputSchema: {
          type: 'object',
          properties: {
            shape_id: { type: 'string', description: 'The shape ID' },
          },
          required: ['shape_id'],
        },
      },
      // -- Images -----------------------------------------------------------
      {
        name: 'get_image',
        description: 'Get an image element by ID',
        inputSchema: {
          type: 'object',
          properties: {
            image_id: { type: 'string', description: 'The image ID' },
          },
          required: ['image_id'],
        },
      },
      {
        name: 'get_image_details',
        description: 'Get full details and metadata for an image',
        inputSchema: {
          type: 'object',
          properties: {
            image_id: { type: 'string', description: 'The image ID' },
          },
          required: ['image_id'],
        },
      },
      {
        name: 'download_image',
        description: 'Download the image file by ID',
        inputSchema: {
          type: 'object',
          properties: {
            image_id: { type: 'string', description: 'The image ID to download' },
          },
          required: ['image_id'],
        },
      },
      {
        name: 'get_image_xml',
        description: 'Get the underlying OOXML markup for an image',
        inputSchema: {
          type: 'object',
          properties: {
            image_id: { type: 'string', description: 'The image ID' },
          },
          required: ['image_id'],
        },
      },
      {
        name: 'update_image_xml',
        description: 'Modify the underlying OOXML markup for an image',
        inputSchema: {
          type: 'object',
          properties: {
            image_id: { type: 'string', description: 'The image ID' },
            xml_content: { type: 'string', description: 'Updated OOXML markup for the image' },
          },
          required: ['image_id', 'xml_content'],
        },
      },
      {
        name: 'get_image_svg',
        description: 'Get the SVG rendering of an image',
        inputSchema: {
          type: 'object',
          properties: {
            image_id: { type: 'string', description: 'The image ID' },
          },
          required: ['image_id'],
        },
      },
      {
        name: 'get_image_children',
        description: 'Get the dependent objects tree for an image',
        inputSchema: {
          type: 'object',
          properties: {
            image_id: { type: 'string', description: 'The image ID' },
          },
          required: ['image_id'],
        },
      },
      // -- Themes -----------------------------------------------------------
      {
        name: 'get_theme',
        description: 'Get a theme element by ID',
        inputSchema: {
          type: 'object',
          properties: {
            theme_id: { type: 'string', description: 'The theme ID' },
          },
          required: ['theme_id'],
        },
      },
      {
        name: 'get_theme_details',
        description: 'Get full details and metadata for a theme',
        inputSchema: {
          type: 'object',
          properties: {
            theme_id: { type: 'string', description: 'The theme ID' },
          },
          required: ['theme_id'],
        },
      },
      {
        name: 'get_theme_children',
        description: 'Get the dependent objects tree for a theme',
        inputSchema: {
          type: 'object',
          properties: {
            theme_id: { type: 'string', description: 'The theme ID' },
          },
          required: ['theme_id'],
        },
      },
      {
        name: 'get_theme_xml',
        description: 'Get the underlying OOXML markup for a theme',
        inputSchema: {
          type: 'object',
          properties: {
            theme_id: { type: 'string', description: 'The theme ID' },
          },
          required: ['theme_id'],
        },
      },
      {
        name: 'update_theme_xml',
        description: 'Modify the underlying OOXML markup for a theme',
        inputSchema: {
          type: 'object',
          properties: {
            theme_id: { type: 'string', description: 'The theme ID' },
            xml_content: { type: 'string', description: 'Updated OOXML markup for the theme' },
          },
          required: ['theme_id', 'xml_content'],
        },
      },
      {
        name: 'get_theme_svg',
        description: 'Get the SVG rendering of a theme',
        inputSchema: {
          type: 'object',
          properties: {
            theme_id: { type: 'string', description: 'The theme ID' },
          },
          required: ['theme_id'],
        },
      },
      // -- Connection Shapes ------------------------------------------------
      {
        name: 'get_connection_shape',
        description: 'Get a connection shape element by ID',
        inputSchema: {
          type: 'object',
          properties: {
            shape_id: { type: 'string', description: 'The connection shape ID' },
          },
          required: ['shape_id'],
        },
      },
      {
        name: 'get_connection_shape_details',
        description: 'Get full details and metadata for a connection shape',
        inputSchema: {
          type: 'object',
          properties: {
            shape_id: { type: 'string', description: 'The connection shape ID' },
          },
          required: ['shape_id'],
        },
      },
      {
        name: 'get_connection_shape_xml',
        description: 'Get the underlying OOXML markup for a connection shape',
        inputSchema: {
          type: 'object',
          properties: {
            shape_id: { type: 'string', description: 'The connection shape ID' },
          },
          required: ['shape_id'],
        },
      },
      {
        name: 'update_connection_shape_xml',
        description: 'Modify the underlying OOXML markup for a connection shape',
        inputSchema: {
          type: 'object',
          properties: {
            shape_id: { type: 'string', description: 'The connection shape ID' },
            xml_content: { type: 'string', description: 'Updated OOXML markup for the connection shape' },
          },
          required: ['shape_id', 'xml_content'],
        },
      },
      {
        name: 'get_connection_shape_svg',
        description: 'Get the SVG rendering of a connection shape',
        inputSchema: {
          type: 'object',
          properties: {
            shape_id: { type: 'string', description: 'The connection shape ID' },
          },
          required: ['shape_id'],
        },
      },
      {
        name: 'get_connection_shape_children',
        description: 'Get the dependent objects tree for a connection shape',
        inputSchema: {
          type: 'object',
          properties: {
            shape_id: { type: 'string', description: 'The connection shape ID' },
          },
          required: ['shape_id'],
        },
      },
      // -- Groups -----------------------------------------------------------
      {
        name: 'get_group',
        description: 'Get a group element by ID',
        inputSchema: {
          type: 'object',
          properties: {
            group_id: { type: 'string', description: 'The group ID' },
          },
          required: ['group_id'],
        },
      },
      {
        name: 'get_group_details',
        description: 'Get full details and metadata for a group',
        inputSchema: {
          type: 'object',
          properties: {
            group_id: { type: 'string', description: 'The group ID' },
          },
          required: ['group_id'],
        },
      },
      {
        name: 'get_group_xml',
        description: 'Get the underlying OOXML markup for a group',
        inputSchema: {
          type: 'object',
          properties: {
            group_id: { type: 'string', description: 'The group ID' },
          },
          required: ['group_id'],
        },
      },
      {
        name: 'update_group_xml',
        description: 'Modify the underlying OOXML markup for a group',
        inputSchema: {
          type: 'object',
          properties: {
            group_id: { type: 'string', description: 'The group ID' },
            xml_content: { type: 'string', description: 'Updated OOXML markup for the group' },
          },
          required: ['group_id', 'xml_content'],
        },
      },
      {
        name: 'get_group_svg',
        description: 'Get the SVG rendering of a group',
        inputSchema: {
          type: 'object',
          properties: {
            group_id: { type: 'string', description: 'The group ID' },
          },
          required: ['group_id'],
        },
      },
      {
        name: 'get_group_children',
        description: 'Get the dependent objects tree for a group',
        inputSchema: {
          type: 'object',
          properties: {
            group_id: { type: 'string', description: 'The group ID' },
          },
          required: ['group_id'],
        },
      },
      // -- SmartArts --------------------------------------------------------
      {
        name: 'get_smart_art',
        description: 'Get a SmartArt element by ID',
        inputSchema: {
          type: 'object',
          properties: {
            smart_art_id: { type: 'string', description: 'The SmartArt ID' },
          },
          required: ['smart_art_id'],
        },
      },
      {
        name: 'get_smart_art_details',
        description: 'Get full details and metadata for a SmartArt element',
        inputSchema: {
          type: 'object',
          properties: {
            smart_art_id: { type: 'string', description: 'The SmartArt ID' },
          },
          required: ['smart_art_id'],
        },
      },
      {
        name: 'get_smart_art_xml',
        description: 'Get the underlying OOXML markup for a SmartArt element',
        inputSchema: {
          type: 'object',
          properties: {
            smart_art_id: { type: 'string', description: 'The SmartArt ID' },
          },
          required: ['smart_art_id'],
        },
      },
      {
        name: 'update_smart_art_xml',
        description: 'Modify the underlying OOXML markup for a SmartArt element',
        inputSchema: {
          type: 'object',
          properties: {
            smart_art_id: { type: 'string', description: 'The SmartArt ID' },
            xml_content: { type: 'string', description: 'Updated OOXML markup for the SmartArt element' },
          },
          required: ['smart_art_id', 'xml_content'],
        },
      },
      {
        name: 'get_smart_art_svg',
        description: 'Get the SVG rendering of a SmartArt element',
        inputSchema: {
          type: 'object',
          properties: {
            smart_art_id: { type: 'string', description: 'The SmartArt ID' },
          },
          required: ['smart_art_id'],
        },
      },
      {
        name: 'get_smart_art_children',
        description: 'Get the dependent objects tree for a SmartArt element',
        inputSchema: {
          type: 'object',
          properties: {
            smart_art_id: { type: 'string', description: 'The SmartArt ID' },
          },
          required: ['smart_art_id'],
        },
      },
      // -- ShapeTrees -------------------------------------------------------
      {
        name: 'get_shape_tree',
        description: 'Get a shape tree element by ID',
        inputSchema: {
          type: 'object',
          properties: {
            shape_tree_id: { type: 'string', description: 'The shape tree ID' },
          },
          required: ['shape_tree_id'],
        },
      },
      {
        name: 'get_shape_tree_details',
        description: 'Get full details and metadata for a shape tree',
        inputSchema: {
          type: 'object',
          properties: {
            shape_tree_id: { type: 'string', description: 'The shape tree ID' },
          },
          required: ['shape_tree_id'],
        },
      },
      {
        name: 'get_shape_tree_xml',
        description: 'Get the underlying OOXML markup for a shape tree',
        inputSchema: {
          type: 'object',
          properties: {
            shape_tree_id: { type: 'string', description: 'The shape tree ID' },
          },
          required: ['shape_tree_id'],
        },
      },
      {
        name: 'update_shape_tree_xml',
        description: 'Modify the underlying OOXML markup for a shape tree',
        inputSchema: {
          type: 'object',
          properties: {
            shape_tree_id: { type: 'string', description: 'The shape tree ID' },
            xml_content: { type: 'string', description: 'Updated OOXML markup for the shape tree' },
          },
          required: ['shape_tree_id', 'xml_content'],
        },
      },
      {
        name: 'get_shape_tree_svg',
        description: 'Get the SVG rendering of a shape tree',
        inputSchema: {
          type: 'object',
          properties: {
            shape_tree_id: { type: 'string', description: 'The shape tree ID' },
          },
          required: ['shape_tree_id'],
        },
      },
      {
        name: 'get_shape_tree_children',
        description: 'Get the dependent objects tree for a shape tree',
        inputSchema: {
          type: 'object',
          properties: {
            shape_tree_id: { type: 'string', description: 'The shape tree ID' },
          },
          required: ['shape_tree_id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        // Documents
        case 'upload_document':              return await this.uploadDocument(args);
        case 'get_document':                 return await this.getDocument(args);
        case 'delete_document':              return await this.deleteDocument(args);
        case 'download_document':            return await this.downloadDocument(args);
        case 'clone_document':               return await this.cloneDocument(args);
        case 'get_document_children':        return await this.getDocumentChildren(args);
        case 'list_document_types':          return await this.listDocumentTypes();
        // Charts
        case 'get_chart':                    return await this.getChart(args);
        case 'get_chart_details':            return await this.getChartDetails(args);
        case 'get_chart_children':           return await this.getChartChildren(args);
        case 'get_chart_data':               return await this.getChartData(args);
        case 'update_chart_data':            return await this.updateChartData(args);
        case 'get_chart_xml':                return await this.getChartXml(args);
        case 'update_chart_xml':             return await this.updateChartXml(args);
        case 'get_chart_svg':                return await this.getChartSvg(args);
        // Slides
        case 'get_slide':                    return await this.getSlide(args);
        case 'get_slide_details':            return await this.getSlideDetails(args);
        case 'get_slide_children':           return await this.getSlideChildren(args);
        case 'get_slide_xml':                return await this.getSlideXml(args);
        case 'update_slide_xml':             return await this.updateSlideXml(args);
        case 'get_slide_svg':                return await this.getSlideSvg(args);
        // Tables
        case 'get_table':                    return await this.getTable(args);
        case 'get_table_details':            return await this.getTableDetails(args);
        case 'get_table_children':           return await this.getTableChildren(args);
        case 'get_table_data':               return await this.getTableData(args);
        case 'update_table_data':            return await this.updateTableData(args);
        case 'get_table_xml':                return await this.getTableXml(args);
        case 'update_table_xml':             return await this.updateTableXml(args);
        case 'get_table_svg':                return await this.getTableSvg(args);
        // Shapes
        case 'get_shape':                    return await this.getShape(args);
        case 'get_shape_details':            return await this.getShapeDetails(args);
        case 'get_shape_children':           return await this.getShapeChildren(args);
        case 'get_shape_xml':                return await this.getShapeXml(args);
        case 'update_shape_xml':             return await this.updateShapeXml(args);
        case 'get_shape_svg':                return await this.getShapeSvg(args);
        // Images
        case 'get_image':                    return await this.getImage(args);
        case 'get_image_details':            return await this.getImageDetails(args);
        case 'download_image':               return await this.downloadImage(args);
        case 'get_image_xml':                return await this.getImageXml(args);
        case 'update_image_xml':             return await this.updateImageXml(args);
        case 'get_image_svg':                return await this.getImageSvg(args);
        case 'get_image_children':           return await this.getImageChildren(args);
        // Themes
        case 'get_theme':                    return await this.getTheme(args);
        case 'get_theme_details':            return await this.getThemeDetails(args);
        case 'get_theme_children':           return await this.getThemeChildren(args);
        case 'get_theme_xml':                return await this.getThemeXml(args);
        case 'update_theme_xml':             return await this.updateThemeXml(args);
        case 'get_theme_svg':                return await this.getThemeSvg(args);
        // Connection Shapes
        case 'get_connection_shape':         return await this.getConnectionShape(args);
        case 'get_connection_shape_details': return await this.getConnectionShapeDetails(args);
        case 'get_connection_shape_xml':     return await this.getConnectionShapeXml(args);
        case 'update_connection_shape_xml':  return await this.updateConnectionShapeXml(args);
        case 'get_connection_shape_svg':     return await this.getConnectionShapeSvg(args);
        case 'get_connection_shape_children':return await this.getConnectionShapeChildren(args);
        // Groups
        case 'get_group':                    return await this.getGroup(args);
        case 'get_group_details':            return await this.getGroupDetails(args);
        case 'get_group_xml':                return await this.getGroupXml(args);
        case 'update_group_xml':             return await this.updateGroupXml(args);
        case 'get_group_svg':                return await this.getGroupSvg(args);
        case 'get_group_children':           return await this.getGroupChildren(args);
        // SmartArts
        case 'get_smart_art':                return await this.getSmartArt(args);
        case 'get_smart_art_details':        return await this.getSmartArtDetails(args);
        case 'get_smart_art_xml':            return await this.getSmartArtXml(args);
        case 'update_smart_art_xml':         return await this.updateSmartArtXml(args);
        case 'get_smart_art_svg':            return await this.getSmartArtSvg(args);
        case 'get_smart_art_children':       return await this.getSmartArtChildren(args);
        // ShapeTrees
        case 'get_shape_tree':               return await this.getShapeTree(args);
        case 'get_shape_tree_details':       return await this.getShapeTreeDetails(args);
        case 'get_shape_tree_xml':           return await this.getShapeTreeXml(args);
        case 'update_shape_tree_xml':        return await this.updateShapeTreeXml(args);
        case 'get_shape_tree_svg':           return await this.getShapeTreeSvg(args);
        case 'get_shape_tree_children':      return await this.getShapeTreeChildren(args);
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

  // -- Private helpers ------------------------------------------------------

  private buildHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
    };
  }

  private async request(url: string, options: RequestInit = {}): Promise<ToolResult> {
    const mergedHeaders = { ...this.buildHeaders(), ...(options.headers as Record<string, string> | undefined) };
    const response = await this.fetchWithRetry(url, { ...options, headers: mergedHeaders });

    if (!response.ok) {
      let detail = '';
      try { detail = await response.text(); } catch { /* ignore */ }
      return {
        content: [{ type: 'text', text: `Presalytics OOXML API error ${response.status} ${response.statusText}${detail ? ': ' + detail.slice(0, 400) : ''}` }],
        isError: true,
      };
    }

    if (response.status === 204) {
      return { content: [{ type: 'text', text: 'Success (no content)' }], isError: false };
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      const text = await response.text().catch(() => '');
      return { content: [{ type: 'text', text: text || `Success (HTTP ${response.status})` }], isError: false };
    }

    const text = JSON.stringify(data, null, 2);
    const truncated = text.length > 10_000
      ? text.slice(0, 10_000) + `\n... [truncated, ${text.length} total chars]`
      : text;
    return { content: [{ type: 'text', text: truncated }], isError: false };
  }

  private url(path: string): string {
    return `${this.baseUrl}${path}`;
  }

  // -- Documents ------------------------------------------------------------

  private async uploadDocument(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(
      this.url('/Documents'),
      { method: 'POST', body: JSON.stringify({ file_content: args.file_content, filename: args.filename }) },
    );
  }

  private async getDocument(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(this.url(`/Documents/${encodeURIComponent(args.document_id as string)}`));
  }

  private async deleteDocument(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(
      this.url(`/Documents/${encodeURIComponent(args.document_id as string)}`),
      { method: 'DELETE' },
    );
  }

  private async downloadDocument(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(this.url(`/Documents/Download/${encodeURIComponent(args.document_id as string)}`));
  }

  private async cloneDocument(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {};
    if (args.target_story_id) body.story_id = args.target_story_id;
    return this.request(
      this.url(`/Documents/Clone/${encodeURIComponent(args.document_id as string)}`),
      { method: 'POST', body: JSON.stringify(body) },
    );
  }

  private async getDocumentChildren(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(this.url(`/Documents/ChildObjects/${encodeURIComponent(args.document_id as string)}`));
  }

  private async listDocumentTypes(): Promise<ToolResult> {
    return this.request(this.url('/Documents/DocumentType'));
  }

  // -- Charts ---------------------------------------------------------------

  private async getChart(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(this.url(`/Charts/${encodeURIComponent(args.chart_id as string)}`));
  }

  private async getChartDetails(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(this.url(`/Charts/Details/${encodeURIComponent(args.chart_id as string)}`));
  }

  private async getChartChildren(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(this.url(`/Charts/ChildObjects/${encodeURIComponent(args.chart_id as string)}`));
  }

  private async getChartData(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(this.url(`/Charts/ChartUpdate/${encodeURIComponent(args.chart_id as string)}`));
  }

  private async updateChartData(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(
      this.url(`/Charts/ChartUpdate/${encodeURIComponent(args.chart_id as string)}`),
      { method: 'PUT', body: JSON.stringify(args.data) },
    );
  }

  private async getChartXml(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(this.url(`/Charts/OpenOfficeXml/${encodeURIComponent(args.chart_id as string)}`));
  }

  private async updateChartXml(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(
      this.url(`/Charts/OpenOfficeXml/${encodeURIComponent(args.chart_id as string)}`),
      { method: 'PUT', body: JSON.stringify({ xml: args.xml_content }) },
    );
  }

  private async getChartSvg(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(this.url(`/Charts/Svg/${encodeURIComponent(args.chart_id as string)}`));
  }

  // -- Slides ---------------------------------------------------------------

  private async getSlide(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(this.url(`/Slides/${encodeURIComponent(args.slide_id as string)}`));
  }

  private async getSlideDetails(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(this.url(`/Slides/Details/${encodeURIComponent(args.slide_id as string)}`));
  }

  private async getSlideChildren(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(this.url(`/Slides/ChildObjects/${encodeURIComponent(args.slide_id as string)}`));
  }

  private async getSlideXml(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(this.url(`/Slides/OpenOfficeXml/${encodeURIComponent(args.slide_id as string)}`));
  }

  private async updateSlideXml(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(
      this.url(`/Slides/OpenOfficeXml/${encodeURIComponent(args.slide_id as string)}`),
      { method: 'PUT', body: JSON.stringify({ xml: args.xml_content }) },
    );
  }

  private async getSlideSvg(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(this.url(`/Slides/Svg/${encodeURIComponent(args.slide_id as string)}`));
  }

  // -- Tables ---------------------------------------------------------------

  private async getTable(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(this.url(`/Tables/${encodeURIComponent(args.table_id as string)}`));
  }

  private async getTableDetails(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(this.url(`/Tables/Details/${encodeURIComponent(args.table_id as string)}`));
  }

  private async getTableChildren(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(this.url(`/Tables/ChildObjects/${encodeURIComponent(args.table_id as string)}`));
  }

  private async getTableData(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(this.url(`/Tables/TableUpdate/${encodeURIComponent(args.table_id as string)}`));
  }

  private async updateTableData(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(
      this.url(`/Tables/TableUpdate/${encodeURIComponent(args.table_id as string)}`),
      { method: 'PUT', body: JSON.stringify(args.data) },
    );
  }

  private async getTableXml(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(this.url(`/Tables/OpenOfficeXml/${encodeURIComponent(args.table_id as string)}`));
  }

  private async updateTableXml(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(
      this.url(`/Tables/OpenOfficeXml/${encodeURIComponent(args.table_id as string)}`),
      { method: 'PUT', body: JSON.stringify({ xml: args.xml_content }) },
    );
  }

  private async getTableSvg(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(this.url(`/Tables/Svg/${encodeURIComponent(args.table_id as string)}`));
  }

  // -- Shapes ---------------------------------------------------------------

  private async getShape(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(this.url(`/Shapes/${encodeURIComponent(args.shape_id as string)}`));
  }

  private async getShapeDetails(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(this.url(`/Shapes/Details/${encodeURIComponent(args.shape_id as string)}`));
  }

  private async getShapeChildren(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(this.url(`/Shapes/ChildObjects/${encodeURIComponent(args.shape_id as string)}`));
  }

  private async getShapeXml(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(this.url(`/Shapes/OpenOfficeXml/${encodeURIComponent(args.shape_id as string)}`));
  }

  private async updateShapeXml(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(
      this.url(`/Shapes/OpenOfficeXml/${encodeURIComponent(args.shape_id as string)}`),
      { method: 'PUT', body: JSON.stringify({ xml: args.xml_content }) },
    );
  }

  private async getShapeSvg(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(this.url(`/Shapes/Svg/${encodeURIComponent(args.shape_id as string)}`));
  }

  // -- Images ---------------------------------------------------------------

  private async getImage(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(this.url(`/Images/${encodeURIComponent(args.image_id as string)}`));
  }

  private async getImageDetails(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(this.url(`/Images/Details/${encodeURIComponent(args.image_id as string)}`));
  }

  private async downloadImage(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(
      this.url(`/Images/GetImage/${encodeURIComponent(args.image_id as string)}`),
      { method: 'PUT', body: JSON.stringify({}) },
    );
  }

  private async getImageXml(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(this.url(`/Images/OpenOfficeXml/${encodeURIComponent(args.image_id as string)}`));
  }

  private async updateImageXml(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(
      this.url(`/Images/OpenOfficeXml/${encodeURIComponent(args.image_id as string)}`),
      { method: 'PUT', body: JSON.stringify({ xml: args.xml_content }) },
    );
  }

  private async getImageSvg(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(this.url(`/Images/Svg/${encodeURIComponent(args.image_id as string)}`));
  }

  private async getImageChildren(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(this.url(`/Images/ChildObjects/${encodeURIComponent(args.image_id as string)}`));
  }

  // -- Themes ---------------------------------------------------------------

  private async getTheme(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(this.url(`/Themes/${encodeURIComponent(args.theme_id as string)}`));
  }

  private async getThemeDetails(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(this.url(`/Themes/Details/${encodeURIComponent(args.theme_id as string)}`));
  }

  private async getThemeChildren(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(this.url(`/Themes/ChildObjects/${encodeURIComponent(args.theme_id as string)}`));
  }

  private async getThemeXml(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(this.url(`/Themes/OpenOfficeXml/${encodeURIComponent(args.theme_id as string)}`));
  }

  private async updateThemeXml(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(
      this.url(`/Themes/OpenOfficeXml/${encodeURIComponent(args.theme_id as string)}`),
      { method: 'PUT', body: JSON.stringify({ xml: args.xml_content }) },
    );
  }

  private async getThemeSvg(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(this.url(`/Themes/Svg/${encodeURIComponent(args.theme_id as string)}`));
  }

  // -- Connection Shapes ----------------------------------------------------

  private async getConnectionShape(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(this.url(`/ConnectionShapes/${encodeURIComponent(args.shape_id as string)}`));
  }

  private async getConnectionShapeDetails(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(this.url(`/ConnectionShapes/Details/${encodeURIComponent(args.shape_id as string)}`));
  }

  private async getConnectionShapeXml(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(this.url(`/ConnectionShapes/OpenOfficeXml/${encodeURIComponent(args.shape_id as string)}`));
  }

  private async updateConnectionShapeXml(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(
      this.url(`/ConnectionShapes/OpenOfficeXml/${encodeURIComponent(args.shape_id as string)}`),
      { method: 'PUT', body: JSON.stringify({ xml: args.xml_content }) },
    );
  }

  private async getConnectionShapeSvg(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(this.url(`/ConnectionShapes/Svg/${encodeURIComponent(args.shape_id as string)}`));
  }

  private async getConnectionShapeChildren(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(this.url(`/ConnectionShapes/ChildObjects/${encodeURIComponent(args.shape_id as string)}`));
  }

  // -- Groups ---------------------------------------------------------------

  private async getGroup(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(this.url(`/Groups/${encodeURIComponent(args.group_id as string)}`));
  }

  private async getGroupDetails(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(this.url(`/Groups/Details/${encodeURIComponent(args.group_id as string)}`));
  }

  private async getGroupXml(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(this.url(`/Groups/OpenOfficeXml/${encodeURIComponent(args.group_id as string)}`));
  }

  private async updateGroupXml(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(
      this.url(`/Groups/OpenOfficeXml/${encodeURIComponent(args.group_id as string)}`),
      { method: 'PUT', body: JSON.stringify({ xml: args.xml_content }) },
    );
  }

  private async getGroupSvg(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(this.url(`/Groups/Svg/${encodeURIComponent(args.group_id as string)}`));
  }

  private async getGroupChildren(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(this.url(`/Groups/ChildObjects/${encodeURIComponent(args.group_id as string)}`));
  }

  // -- SmartArts ------------------------------------------------------------

  private async getSmartArt(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(this.url(`/SmartArts/${encodeURIComponent(args.smart_art_id as string)}`));
  }

  private async getSmartArtDetails(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(this.url(`/SmartArts/Details/${encodeURIComponent(args.smart_art_id as string)}`));
  }

  private async getSmartArtXml(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(this.url(`/SmartArts/OpenOfficeXml/${encodeURIComponent(args.smart_art_id as string)}`));
  }

  private async updateSmartArtXml(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(
      this.url(`/SmartArts/OpenOfficeXml/${encodeURIComponent(args.smart_art_id as string)}`),
      { method: 'PUT', body: JSON.stringify({ xml: args.xml_content }) },
    );
  }

  private async getSmartArtSvg(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(this.url(`/SmartArts/Svg/${encodeURIComponent(args.smart_art_id as string)}`));
  }

  private async getSmartArtChildren(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(this.url(`/SmartArts/ChildObjects/${encodeURIComponent(args.smart_art_id as string)}`));
  }

  // -- ShapeTrees -----------------------------------------------------------

  private async getShapeTree(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(this.url(`/ShapeTrees/${encodeURIComponent(args.shape_tree_id as string)}`));
  }

  private async getShapeTreeDetails(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(this.url(`/ShapeTrees/Details/${encodeURIComponent(args.shape_tree_id as string)}`));
  }

  private async getShapeTreeXml(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(this.url(`/ShapeTrees/OpenOfficeXml/${encodeURIComponent(args.shape_tree_id as string)}`));
  }

  private async updateShapeTreeXml(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(
      this.url(`/ShapeTrees/OpenOfficeXml/${encodeURIComponent(args.shape_tree_id as string)}`),
      { method: 'PUT', body: JSON.stringify({ xml: args.xml_content }) },
    );
  }

  private async getShapeTreeSvg(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(this.url(`/ShapeTrees/Svg/${encodeURIComponent(args.shape_tree_id as string)}`));
  }

  private async getShapeTreeChildren(args: Record<string, unknown>): Promise<ToolResult> {
    return this.request(this.url(`/ShapeTrees/ChildObjects/${encodeURIComponent(args.shape_tree_id as string)}`));
  }
}
