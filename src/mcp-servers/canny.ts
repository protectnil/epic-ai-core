/**
 * Canny MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// Community servers exist (opensourceops/canny-mcp-server ~37 tools; itsocialist/canny-mcp-server) but neither
// is published or maintained by Canny. Not official. Decision: use-rest-api.
// Recommendation: Use this REST adapter. No official Canny MCP server exists.
//
// Base URL: https://canny.io/api/v1
// Auth: All requests include apiKey as a JSON body field (POST requests only — Canny uses POST for all operations).
// Docs: https://developers.canny.io/api-reference
// Rate limits: Not formally documented; the API uses POST for all reads to protect API keys in logs.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface CannyConfig {
  apiKey: string;
  baseUrl?: string;
}

export class CannyMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: CannyConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://canny.io/api/v1';
  }

  get tools(): ToolDefinition[] {
    return [
      // Boards
      {
        name: 'list_boards',
        description: 'List all feedback boards for the company with post counts and settings',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_board',
        description: 'Retrieve a single feedback board by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'The board ID to retrieve' },
          },
          required: ['id'],
        },
      },
      // Posts
      {
        name: 'list_posts',
        description: 'List posts (feature requests) on a board with filtering by status, search, and sort order',
        inputSchema: {
          type: 'object',
          properties: {
            boardID: { type: 'string', description: 'ID of the board to list posts from' },
            status: { type: 'string', description: 'Filter by status: open, under review, planned, in progress, complete, closed' },
            search: { type: 'string', description: 'Text to search for in post titles and details' },
            sort: { type: 'string', description: 'Sort order: newest, oldest, relevance, score, statusChanged, trending (default: newest)' },
            authorID: { type: 'string', description: 'Filter posts by author user ID' },
            tagIDs: { type: 'string', description: 'Comma-separated tag IDs to filter posts by' },
            limit: { type: 'number', description: 'Number of posts to return (default: 10, max: 100)' },
            skip: { type: 'number', description: 'Number of posts to skip for pagination (default: 0)' },
          },
          required: ['boardID'],
        },
      },
      {
        name: 'get_post',
        description: 'Retrieve a single post by its ID including vote count, status, and comments',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'The post ID to retrieve' },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_post',
        description: 'Create a new feedback post on a board on behalf of a user',
        inputSchema: {
          type: 'object',
          properties: {
            authorID: { type: 'string', description: 'ID of the Canny user creating the post' },
            boardID: { type: 'string', description: 'ID of the board to create the post on' },
            title: { type: 'string', description: 'Post title (the feature request headline)' },
            details: { type: 'string', description: 'Additional details or description for the post' },
            categoryID: { type: 'string', description: 'ID of the category to assign the post to' },
            eta: { type: 'string', description: 'Estimated delivery date in MM/YYYY format (e.g. 03/2026)' },
          },
          required: ['authorID', 'boardID', 'title'],
        },
      },
      {
        name: 'update_post',
        description: 'Update a post title, details, category, or ETA',
        inputSchema: {
          type: 'object',
          properties: {
            postID: { type: 'string', description: 'ID of the post to update' },
            title: { type: 'string', description: 'Updated title' },
            details: { type: 'string', description: 'Updated description' },
            categoryID: { type: 'string', description: 'Updated category ID' },
            eta: { type: 'string', description: 'Updated ETA in MM/YYYY format' },
          },
          required: ['postID'],
        },
      },
      {
        name: 'change_post_status',
        description: 'Change the status of a post and optionally notify voters with a comment',
        inputSchema: {
          type: 'object',
          properties: {
            postID: { type: 'string', description: 'ID of the post to update' },
            status: { type: 'string', description: 'New status: open, under review, planned, in progress, complete, closed' },
            changerID: { type: 'string', description: 'ID of the admin user making the change' },
            shouldNotifyVoters: { type: 'boolean', description: 'Send notification to voters about the status change (default: true)' },
            commentValue: { type: 'string', description: 'Optional public comment posted alongside the status change' },
          },
          required: ['postID', 'status', 'changerID'],
        },
      },
      {
        name: 'delete_post',
        description: 'Permanently delete a post and all its votes and comments',
        inputSchema: {
          type: 'object',
          properties: {
            postID: { type: 'string', description: 'ID of the post to delete' },
          },
          required: ['postID'],
        },
      },
      {
        name: 'add_post_tag',
        description: 'Add a tag to a post for categorization and filtering',
        inputSchema: {
          type: 'object',
          properties: {
            postID: { type: 'string', description: 'ID of the post to tag' },
            tagID: { type: 'string', description: 'ID of the tag to add' },
          },
          required: ['postID', 'tagID'],
        },
      },
      {
        name: 'remove_post_tag',
        description: 'Remove a tag from a post',
        inputSchema: {
          type: 'object',
          properties: {
            postID: { type: 'string', description: 'ID of the post' },
            tagID: { type: 'string', description: 'ID of the tag to remove' },
          },
          required: ['postID', 'tagID'],
        },
      },
      // Votes
      {
        name: 'list_votes',
        description: 'List votes on a post or board with pagination',
        inputSchema: {
          type: 'object',
          properties: {
            postID: { type: 'string', description: 'ID of the post to list votes for' },
            boardID: { type: 'string', description: 'ID of the board to list all votes for' },
            userID: { type: 'string', description: 'Filter votes by user ID' },
            limit: { type: 'number', description: 'Number of votes to return (default: 10, max: 100)' },
            skip: { type: 'number', description: 'Number of votes to skip for pagination (default: 0)' },
          },
        },
      },
      {
        name: 'create_vote',
        description: 'Cast a vote on a post on behalf of a user',
        inputSchema: {
          type: 'object',
          properties: {
            postID: { type: 'string', description: 'ID of the post to vote on' },
            voterID: { type: 'string', description: 'ID of the Canny user casting the vote' },
          },
          required: ['postID', 'voterID'],
        },
      },
      {
        name: 'delete_vote',
        description: 'Remove a vote from a post on behalf of a user',
        inputSchema: {
          type: 'object',
          properties: {
            postID: { type: 'string', description: 'ID of the post to remove the vote from' },
            voterID: { type: 'string', description: 'ID of the user whose vote to remove' },
          },
          required: ['postID', 'voterID'],
        },
      },
      // Comments
      {
        name: 'list_comments',
        description: 'List comments on a post with pagination',
        inputSchema: {
          type: 'object',
          properties: {
            postID: { type: 'string', description: 'ID of the post to list comments for' },
            limit: { type: 'number', description: 'Number of comments to return (1-100, default: 10)' },
            skip: { type: 'number', description: 'Number of comments to skip for pagination (default: 0)' },
          },
          required: ['postID'],
        },
      },
      {
        name: 'get_comment',
        description: 'Retrieve a single comment by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'The comment ID to retrieve' },
          },
          required: ['id'],
        },
      },
      {
        name: 'create_comment',
        description: 'Create a public or internal comment on a post on behalf of a user',
        inputSchema: {
          type: 'object',
          properties: {
            authorID: { type: 'string', description: 'ID of the user posting the comment' },
            postID: { type: 'string', description: 'ID of the post to comment on' },
            value: { type: 'string', description: 'Text content of the comment (plain text or markdown)' },
            isInternal: { type: 'boolean', description: 'Make comment internal (visible only to admins, default: false)' },
            parentID: { type: 'string', description: 'ID of parent comment to create a reply' },
          },
          required: ['authorID', 'postID', 'value'],
        },
      },
      {
        name: 'delete_comment',
        description: 'Delete a comment by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            commentID: { type: 'string', description: 'ID of the comment to delete' },
          },
          required: ['commentID'],
        },
      },
      // Users
      {
        name: 'list_users',
        description: 'List users in the Canny company account with pagination',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Number of users to return (default: 10, max: 100)' },
            skip: { type: 'number', description: 'Number of users to skip for pagination (default: 0)' },
          },
        },
      },
      {
        name: 'find_user',
        description: 'Look up a user by their email address or external user ID',
        inputSchema: {
          type: 'object',
          properties: {
            email: { type: 'string', description: 'User email address to search for' },
            userID: { type: 'string', description: 'User ID to search for' },
          },
        },
      },
      {
        name: 'create_or_update_user',
        description: 'Create a new user or update an existing user by their external ID (upsert)',
        inputSchema: {
          type: 'object',
          properties: {
            userID: { type: 'string', description: 'Your internal/external user ID for this person' },
            name: { type: 'string', description: 'User display name' },
            email: { type: 'string', description: 'User email address' },
            avatarURL: { type: 'string', description: 'URL of the user avatar image' },
            created: { type: 'string', description: 'ISO 8601 date when the user signed up in your product' },
            companies: { type: 'string', description: 'JSON array of company objects with id and name fields' },
            customFields: { type: 'string', description: 'JSON object of custom field key-value pairs (e.g. {"plan":"pro"})' },
          },
          required: ['userID', 'name'],
        },
      },
      {
        name: 'delete_user',
        description: 'Permanently delete a user and all their associated data from Canny',
        inputSchema: {
          type: 'object',
          properties: {
            userID: { type: 'string', description: 'ID of the Canny user to delete' },
          },
          required: ['userID'],
        },
      },
      // Tags
      {
        name: 'list_tags',
        description: 'List all tags for a board used to categorize posts',
        inputSchema: {
          type: 'object',
          properties: {
            boardID: { type: 'string', description: 'Board ID to list tags for' },
            limit: { type: 'number', description: 'Number of tags to return (default: 10, max: 100)' },
            skip: { type: 'number', description: 'Number of tags to skip for pagination (default: 0)' },
          },
          required: ['boardID'],
        },
      },
      {
        name: 'create_tag',
        description: 'Create a new tag on a board for post categorization',
        inputSchema: {
          type: 'object',
          properties: {
            boardID: { type: 'string', description: 'Board ID to create the tag on' },
            name: { type: 'string', description: 'Tag name' },
          },
          required: ['boardID', 'name'],
        },
      },
      // Categories
      {
        name: 'list_categories',
        description: 'List all categories for a board used to group related posts',
        inputSchema: {
          type: 'object',
          properties: {
            boardID: { type: 'string', description: 'Board ID to list categories for' },
            limit: { type: 'number', description: 'Number of categories to return (default: 10, max: 100)' },
            skip: { type: 'number', description: 'Number of categories to skip for pagination (default: 0)' },
          },
          required: ['boardID'],
        },
      },
      {
        name: 'create_category',
        description: 'Create a new category on a board to organize posts',
        inputSchema: {
          type: 'object',
          properties: {
            boardID: { type: 'string', description: 'Board ID to create the category on' },
            name: { type: 'string', description: 'Category name' },
            userID: { type: 'string', description: 'User ID of the admin creating the category' },
          },
          required: ['boardID', 'name', 'userID'],
        },
      },
      // Changelog
      {
        name: 'list_changelog_entries',
        description: 'List changelog entries (public product updates) with optional type filter',
        inputSchema: {
          type: 'object',
          properties: {
            type: { type: 'string', description: 'Filter by type: new, improved, fixed (default: all)' },
            limit: { type: 'number', description: 'Number of entries to return (default: 10, max: 100)' },
            skip: { type: 'number', description: 'Number of entries to skip for pagination (default: 0)' },
          },
        },
      },
      {
        name: 'get_changelog_entry',
        description: 'Retrieve a single changelog entry by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'The changelog entry ID' },
          },
          required: ['id'],
        },
      },
      // Companies
      {
        name: 'list_companies',
        description: 'List all companies associated with the Canny account with optional search, segment filter, and cursor pagination',
        inputSchema: {
          type: 'object',
          properties: {
            search: { type: 'string', description: 'Filter companies by name substring search' },
            segment: { type: 'string', description: 'URL name of a segment to filter companies by' },
            limit: { type: 'number', description: 'Number of companies to return (default: 10, max: 100)' },
            cursor: { type: 'string', description: 'Cursor from a previous response for pagination' },
          },
        },
      },
      {
        name: 'update_company',
        description: 'Update metadata (name, custom fields, monthly spend) for an existing company by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'ID of the company to update' },
            name: { type: 'string', description: 'Updated company name' },
            customFields: { type: 'string', description: 'JSON object of custom field key-value pairs to update' },
            monthlySpend: { type: 'number', description: 'Updated monthly spend value for the company' },
          },
          required: ['id'],
        },
      },
      {
        name: 'delete_company',
        description: 'Permanently delete a company and disassociate it from all users in Canny',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'ID of the company to delete' },
          },
          required: ['id'],
        },
      },
      // Opportunities
      {
        name: 'list_opportunities',
        description: 'List opportunities (from Salesforce or HubSpot) linked to posts in Canny with pagination',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Number of opportunities to return (default: 10, max: 100)' },
            skip: { type: 'number', description: 'Number of opportunities to skip for pagination (default: 0)' },
          },
        },
      },
      // Status changes (admin audit)
      {
        name: 'list_status_changes',
        description: 'List status change history for posts on a board for audit and reporting',
        inputSchema: {
          type: 'object',
          properties: {
            boardID: { type: 'string', description: 'Board ID to list status changes for' },
            limit: { type: 'number', description: 'Number of entries to return (default: 10, max: 100)' },
            skip: { type: 'number', description: 'Number of entries to skip for pagination (default: 0)' },
          },
          required: ['boardID'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'list_boards': return this.listBoards();
        case 'get_board': return this.getBoard(args);
        case 'list_posts': return this.listPosts(args);
        case 'get_post': return this.getPost(args);
        case 'create_post': return this.createPost(args);
        case 'update_post': return this.updatePost(args);
        case 'change_post_status': return this.changePostStatus(args);
        case 'delete_post': return this.deletePost(args);
        case 'add_post_tag': return this.addPostTag(args);
        case 'remove_post_tag': return this.removePostTag(args);
        case 'list_votes': return this.listVotes(args);
        case 'create_vote': return this.createVote(args);
        case 'delete_vote': return this.deleteVote(args);
        case 'list_comments': return this.listComments(args);
        case 'get_comment': return this.getComment(args);
        case 'create_comment': return this.createComment(args);
        case 'delete_comment': return this.deleteComment(args);
        case 'list_users': return this.listUsers(args);
        case 'find_user': return this.findUser(args);
        case 'create_or_update_user': return this.createOrUpdateUser(args);
        case 'delete_user': return this.deleteUser(args);
        case 'list_tags': return this.listTags(args);
        case 'create_tag': return this.createTag(args);
        case 'list_categories': return this.listCategories(args);
        case 'create_category': return this.createCategory(args);
        case 'list_changelog_entries': return this.listChangelogEntries(args);
        case 'get_changelog_entry': return this.getChangelogEntry(args);
        case 'list_companies': return this.listCompanies(args);
        case 'update_company': return this.updateCompany(args);
        case 'delete_company': return this.deleteCompany(args);
        case 'list_opportunities': return this.listOpportunities(args);
        case 'list_status_changes': return this.listStatusChanges(args);
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

  private async post(path: string, params: Record<string, unknown>): Promise<ToolResult> {
    const body = JSON.stringify({ apiKey: this.apiKey, ...params });
    const response = await this.fetchWithRetry(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Canny returned non-JSON response (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async listBoards(): Promise<ToolResult> {
    return this.post('/boards/list', {});
  }

  private async getBoard(args: Record<string, unknown>): Promise<ToolResult> {
    return this.post('/boards/retrieve', { id: args.id });
  }

  private async listPosts(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, unknown> = { boardID: args.boardID };
    if (args.status) params.status = args.status;
    if (args.search) params.search = args.search;
    if (args.sort) params.sort = args.sort;
    if (args.authorID) params.authorID = args.authorID;
    if (args.tagIDs) params.tagIDs = (args.tagIDs as string).split(',').map(s => s.trim());
    if (args.limit) params.limit = args.limit;
    if (args.skip !== undefined) params.skip = args.skip;
    return this.post('/posts/list', params);
  }

  private async getPost(args: Record<string, unknown>): Promise<ToolResult> {
    return this.post('/posts/retrieve', { id: args.id });
  }

  private async createPost(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, unknown> = { authorID: args.authorID, boardID: args.boardID, title: args.title };
    if (args.details) params.details = args.details;
    if (args.categoryID) params.categoryID = args.categoryID;
    if (args.eta) params.eta = args.eta;
    return this.post('/posts/create', params);
  }

  private async updatePost(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, unknown> = { postID: args.postID };
    if (args.title) params.title = args.title;
    if (args.details !== undefined) params.details = args.details;
    if (args.categoryID) params.categoryID = args.categoryID;
    if (args.eta) params.eta = args.eta;
    return this.post('/posts/update', params);
  }

  private async changePostStatus(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, unknown> = {
      postID: args.postID,
      status: args.status,
      changerID: args.changerID,
      shouldNotifyVoters: args.shouldNotifyVoters !== false,
    };
    if (args.commentValue) params.commentValue = args.commentValue;
    return this.post('/posts/change_status', params);
  }

  private async deletePost(args: Record<string, unknown>): Promise<ToolResult> {
    return this.post('/posts/delete', { postID: args.postID });
  }

  private async addPostTag(args: Record<string, unknown>): Promise<ToolResult> {
    return this.post('/tags/add_post', { postID: args.postID, tagID: args.tagID });
  }

  private async removePostTag(args: Record<string, unknown>): Promise<ToolResult> {
    return this.post('/tags/remove_post', { postID: args.postID, tagID: args.tagID });
  }

  private async listVotes(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, unknown> = {};
    if (args.postID) params.postID = args.postID;
    if (args.boardID) params.boardID = args.boardID;
    if (args.userID) params.userID = args.userID;
    if (args.limit) params.limit = args.limit;
    if (args.skip !== undefined) params.skip = args.skip;
    return this.post('/votes/list', params);
  }

  private async createVote(args: Record<string, unknown>): Promise<ToolResult> {
    return this.post('/votes/create', { postID: args.postID, voterID: args.voterID });
  }

  private async deleteVote(args: Record<string, unknown>): Promise<ToolResult> {
    return this.post('/votes/delete', { postID: args.postID, voterID: args.voterID });
  }

  private async listComments(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, unknown> = { postID: args.postID };
    if (args.limit) params.limit = args.limit;
    if (args.skip !== undefined) params.skip = args.skip;
    return this.post('/comments/list', params);
  }

  private async getComment(args: Record<string, unknown>): Promise<ToolResult> {
    return this.post('/comments/retrieve', { id: args.id });
  }

  private async createComment(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, unknown> = { authorID: args.authorID, postID: args.postID, value: args.value };
    if (typeof args.isInternal === 'boolean') params.isInternal = args.isInternal;
    if (args.parentID) params.parentID = args.parentID;
    return this.post('/comments/create', params);
  }

  private async deleteComment(args: Record<string, unknown>): Promise<ToolResult> {
    return this.post('/comments/delete', { commentID: args.commentID });
  }

  private async listUsers(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, unknown> = {};
    if (args.limit) params.limit = args.limit;
    if (args.skip !== undefined) params.skip = args.skip;
    return this.post('/users/list', params);
  }

  private async findUser(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, unknown> = {};
    if (args.email) params.email = args.email;
    if (args.userID) params.userID = args.userID;
    return this.post('/users/find', params);
  }

  private async createOrUpdateUser(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, unknown> = { userID: args.userID, name: args.name };
    if (args.email) params.email = args.email;
    if (args.avatarURL) params.avatarURL = args.avatarURL;
    if (args.created) params.created = args.created;
    if (args.companies) {
      try { params.companies = JSON.parse(args.companies as string); } catch { params.companies = args.companies; }
    }
    if (args.customFields) {
      try { params.customFields = JSON.parse(args.customFields as string); } catch { params.customFields = args.customFields; }
    }
    return this.post('/users/create_or_update', params);
  }

  private async deleteUser(args: Record<string, unknown>): Promise<ToolResult> {
    return this.post('/users/delete', { userID: args.userID });
  }

  private async listTags(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, unknown> = { boardID: args.boardID };
    if (args.limit) params.limit = args.limit;
    if (args.skip !== undefined) params.skip = args.skip;
    return this.post('/tags/list', params);
  }

  private async createTag(args: Record<string, unknown>): Promise<ToolResult> {
    return this.post('/tags/create', { boardID: args.boardID, name: args.name });
  }

  private async listCategories(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, unknown> = { boardID: args.boardID };
    if (args.limit) params.limit = args.limit;
    if (args.skip !== undefined) params.skip = args.skip;
    return this.post('/categories/list', params);
  }

  private async createCategory(args: Record<string, unknown>): Promise<ToolResult> {
    return this.post('/categories/create', { boardID: args.boardID, name: args.name, userID: args.userID });
  }

  private async listChangelogEntries(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, unknown> = {};
    if (args.type) params.type = args.type;
    if (args.limit) params.limit = args.limit;
    if (args.skip !== undefined) params.skip = args.skip;
    return this.post('/entries/list', params);
  }

  private async getChangelogEntry(args: Record<string, unknown>): Promise<ToolResult> {
    return this.post('/entries/retrieve', { id: args.id });
  }

  private async listCompanies(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, unknown> = {};
    if (args.search) params.search = args.search;
    if (args.segment) params.segment = args.segment;
    if (args.limit) params.limit = args.limit;
    if (args.cursor) params.cursor = args.cursor;
    return this.post('/companies/list', params);
  }

  private async updateCompany(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, unknown> = { id: args.id };
    if (args.name) params.name = args.name;
    if (args.monthlySpend !== undefined) params.monthlySpend = args.monthlySpend;
    if (args.customFields) {
      try { params.customFields = JSON.parse(args.customFields as string); } catch { params.customFields = args.customFields; }
    }
    return this.post('/companies/update', params);
  }

  private async deleteCompany(args: Record<string, unknown>): Promise<ToolResult> {
    return this.post('/companies/delete', { id: args.id });
  }

  private async listOpportunities(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, unknown> = {};
    if (args.limit) params.limit = args.limit;
    if (args.skip !== undefined) params.skip = args.skip;
    return this.post('/opportunities/list', params);
  }

  private async listStatusChanges(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, unknown> = { boardID: args.boardID };
    if (args.limit) params.limit = args.limit;
    if (args.skip !== undefined) params.skip = args.skip;
    return this.post('/status_changes/list', params);
  }

  static catalog() {
    return {
      name: 'canny',
      displayName: 'Canny',
      version: '1.0.0',
      category: 'misc' as const,
      keywords: ['canny', 'feedback', 'feature request', 'product management', 'roadmap', 'vote', 'post', 'board', 'changelog', 'user research', 'customer feedback'],
      toolNames: ['list_boards', 'get_board', 'list_posts', 'get_post', 'create_post', 'update_post', 'change_post_status', 'delete_post', 'add_post_tag', 'remove_post_tag', 'list_votes', 'create_vote', 'delete_vote', 'list_comments', 'get_comment', 'create_comment', 'delete_comment', 'list_users', 'find_user', 'create_or_update_user', 'delete_user', 'list_tags', 'create_tag', 'list_categories', 'create_category', 'list_changelog_entries', 'get_changelog_entry', 'list_companies', 'update_company', 'delete_company', 'list_opportunities', 'list_status_changes'],
      description: 'Canny customer feedback management: feature requests, votes, comments, status updates, changelog, tags, categories, companies, opportunities, and user management.',
      author: 'protectnil' as const,
    };
  }
}
