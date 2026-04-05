/**
 * Gitea MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03-28
// No official Gitea MCP server was found on GitHub or the Gitea project site.
//
// Base URL: {instance}/api/v1  (e.g. https://gitea.example.com/api/v1)
// Auth: API token via Authorization: token <TOKEN> header (recommended)
//       Also supports: Basic auth, OAuth2 bearer, query param access_token
// Docs: https://gitea.io/api/swagger (per-instance) or https://codeberg.org/api/swagger
// Rate limits: Configurable per instance; typically 30-60 req/s per user

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface GiteaConfig {
  token: string;
  baseUrl?: string;
}

export class GiteaMCPServer extends MCPAdapterBase {
  private readonly token: string;
  private readonly baseUrl: string;

  constructor(config: GiteaConfig) {
    super();
    this.token = config.token;
    this.baseUrl = (config.baseUrl ?? 'https://gitea.example.com/api/v1').replace(/\/$/, '');
  }

  static catalog() {
    return {
      name: 'gitea',
      displayName: 'Gitea',
      version: '1.0.0',
      category: 'devops' as const,
      keywords: [
        'gitea', 'git', 'self-hosted', 'repository', 'repo', 'issue', 'pull request',
        'pr', 'branch', 'commit', 'release', 'tag', 'milestone', 'label', 'organization',
        'user', 'webhook', 'hook', 'fork', 'star', 'wiki', 'notification', 'review',
        'merge', 'collaborator', 'team', 'package', 'topic', 'version control',
      ],
      toolNames: [
        'get_version',
        'search_repos', 'get_repo', 'create_repo', 'delete_repo', 'fork_repo',
        'list_branches', 'get_branch', 'create_branch', 'delete_branch',
        'list_commits', 'get_commit',
        'get_file_contents', 'create_file', 'update_file', 'delete_file',
        'list_releases', 'get_release', 'create_release', 'delete_release',
        'list_tags', 'create_tag', 'delete_tag',
        'list_issues', 'get_issue', 'create_issue', 'edit_issue', 'delete_issue',
        'list_issue_comments', 'create_issue_comment', 'edit_issue_comment', 'delete_issue_comment',
        'list_labels', 'create_label', 'edit_label', 'delete_label',
        'list_milestones', 'create_milestone', 'edit_milestone', 'delete_milestone',
        'list_pull_requests', 'get_pull_request', 'create_pull_request', 'edit_pull_request', 'merge_pull_request',
        'list_notifications', 'mark_notifications_read',
        'list_orgs', 'get_org', 'list_org_repos', 'list_org_members',
        'get_current_user', 'get_user', 'search_users',
        'list_repo_hooks', 'create_repo_hook', 'delete_repo_hook',
        'list_repo_topics', 'update_repo_topics',
        'list_collaborators', 'add_collaborator', 'remove_collaborator',
      ],
      description: 'Gitea self-hosted Git service: manage repositories, branches, issues, pull requests, releases, users, organizations, and webhooks via the Gitea REST API.',
      author: 'protectnil' as const,
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_version',
        description: 'Return the version of the Gitea instance',
        inputSchema: { type: 'object', properties: {} },
      },
      // --- Repository ---
      {
        name: 'search_repos',
        description: 'Search for repositories by keyword, topic, language, or owner across the Gitea instance',
        inputSchema: {
          type: 'object',
          properties: {
            q: { type: 'string', description: 'Search keyword or repository name' },
            topic: { type: 'boolean', description: 'If true, search by topic name instead of repo name (default: false)' },
            language: { type: 'string', description: 'Filter by primary programming language' },
            owner: { type: 'string', description: 'Filter by owner username or organization' },
            limit: { type: 'number', description: 'Maximum results to return (default: 20, max: 50)' },
            page: { type: 'number', description: 'Page number for pagination (default: 1)' },
          },
        },
      },
      {
        name: 'get_repo',
        description: 'Get a specific repository by owner and repo name',
        inputSchema: {
          type: 'object',
          properties: {
            owner: { type: 'string', description: 'Repository owner username or organization name' },
            repo: { type: 'string', description: 'Repository name' },
          },
          required: ['owner', 'repo'],
        },
      },
      {
        name: 'create_repo',
        description: 'Create a new repository for the authenticated user with optional settings',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Repository name' },
            description: { type: 'string', description: 'Short description of the repository' },
            private: { type: 'boolean', description: 'Whether the repository is private (default: false)' },
            auto_init: { type: 'boolean', description: 'Initialize repository with a README (default: false)' },
            default_branch: { type: 'string', description: 'Default branch name (default: main)' },
            gitignores: { type: 'string', description: 'Gitignore template name, e.g. Go, Node, Python' },
            license: { type: 'string', description: 'License template name, e.g. Apache-2.0, MIT' },
          },
          required: ['name'],
        },
      },
      {
        name: 'delete_repo',
        description: 'Delete a repository — irreversible, requires admin or owner permissions',
        inputSchema: {
          type: 'object',
          properties: {
            owner: { type: 'string', description: 'Repository owner username or organization name' },
            repo: { type: 'string', description: 'Repository name' },
          },
          required: ['owner', 'repo'],
        },
      },
      {
        name: 'fork_repo',
        description: 'Fork a repository into the authenticated user account or a specified organization',
        inputSchema: {
          type: 'object',
          properties: {
            owner: { type: 'string', description: 'Owner of the repository to fork' },
            repo: { type: 'string', description: 'Repository name to fork' },
            organization: { type: 'string', description: 'Organization to fork into; defaults to authenticated user' },
            name: { type: 'string', description: 'Name for the forked repository; defaults to original name' },
          },
          required: ['owner', 'repo'],
        },
      },
      // --- Branches ---
      {
        name: 'list_branches',
        description: 'List all branches in a repository with pagination',
        inputSchema: {
          type: 'object',
          properties: {
            owner: { type: 'string', description: 'Repository owner username or organization name' },
            repo: { type: 'string', description: 'Repository name' },
            limit: { type: 'number', description: 'Maximum results per page (default: 20)' },
            page: { type: 'number', description: 'Page number (default: 1)' },
          },
          required: ['owner', 'repo'],
        },
      },
      {
        name: 'get_branch',
        description: 'Get details of a specific branch including its protection settings',
        inputSchema: {
          type: 'object',
          properties: {
            owner: { type: 'string', description: 'Repository owner username or organization name' },
            repo: { type: 'string', description: 'Repository name' },
            branch: { type: 'string', description: 'Branch name' },
          },
          required: ['owner', 'repo', 'branch'],
        },
      },
      {
        name: 'create_branch',
        description: 'Create a new branch from an existing branch or commit SHA',
        inputSchema: {
          type: 'object',
          properties: {
            owner: { type: 'string', description: 'Repository owner username or organization name' },
            repo: { type: 'string', description: 'Repository name' },
            new_branch_name: { type: 'string', description: 'Name for the new branch' },
            old_branch_name: { type: 'string', description: 'Source branch name to create from (default: default branch)' },
          },
          required: ['owner', 'repo', 'new_branch_name'],
        },
      },
      {
        name: 'delete_branch',
        description: 'Delete a specific branch from a repository',
        inputSchema: {
          type: 'object',
          properties: {
            owner: { type: 'string', description: 'Repository owner username or organization name' },
            repo: { type: 'string', description: 'Repository name' },
            branch: { type: 'string', description: 'Branch name to delete' },
          },
          required: ['owner', 'repo', 'branch'],
        },
      },
      // --- Commits ---
      {
        name: 'list_commits',
        description: 'List commits in a repository with optional branch/file/date filters',
        inputSchema: {
          type: 'object',
          properties: {
            owner: { type: 'string', description: 'Repository owner username or organization name' },
            repo: { type: 'string', description: 'Repository name' },
            sha: { type: 'string', description: 'Branch, tag, or commit SHA to list commits from' },
            path: { type: 'string', description: 'Filter commits by file path' },
            limit: { type: 'number', description: 'Maximum commits to return (default: 20)' },
            page: { type: 'number', description: 'Page number (default: 1)' },
          },
          required: ['owner', 'repo'],
        },
      },
      {
        name: 'get_commit',
        description: 'Get details of a single commit by SHA including diff and stats',
        inputSchema: {
          type: 'object',
          properties: {
            owner: { type: 'string', description: 'Repository owner username or organization name' },
            repo: { type: 'string', description: 'Repository name' },
            sha: { type: 'string', description: 'Full or abbreviated commit SHA' },
          },
          required: ['owner', 'repo', 'sha'],
        },
      },
      // --- File contents ---
      {
        name: 'get_file_contents',
        description: 'Get metadata and contents of a file or directory at a given path in a repository',
        inputSchema: {
          type: 'object',
          properties: {
            owner: { type: 'string', description: 'Repository owner username or organization name' },
            repo: { type: 'string', description: 'Repository name' },
            filepath: { type: 'string', description: 'File or directory path within the repository' },
            ref: { type: 'string', description: 'Branch, tag, or commit SHA to read from (default: default branch)' },
          },
          required: ['owner', 'repo', 'filepath'],
        },
      },
      {
        name: 'create_file',
        description: 'Create a new file in a repository with a commit message and base64-encoded content',
        inputSchema: {
          type: 'object',
          properties: {
            owner: { type: 'string', description: 'Repository owner username or organization name' },
            repo: { type: 'string', description: 'Repository name' },
            filepath: { type: 'string', description: 'Path for the new file within the repository' },
            message: { type: 'string', description: 'Commit message for the file creation' },
            content: { type: 'string', description: 'Base64-encoded file content' },
            branch: { type: 'string', description: 'Target branch (default: default branch)' },
          },
          required: ['owner', 'repo', 'filepath', 'message', 'content'],
        },
      },
      {
        name: 'update_file',
        description: 'Update an existing file in a repository, requires current file SHA for conflict detection',
        inputSchema: {
          type: 'object',
          properties: {
            owner: { type: 'string', description: 'Repository owner username or organization name' },
            repo: { type: 'string', description: 'Repository name' },
            filepath: { type: 'string', description: 'Path of the file to update' },
            message: { type: 'string', description: 'Commit message for the file update' },
            content: { type: 'string', description: 'Base64-encoded new file content' },
            sha: { type: 'string', description: 'Current blob SHA of the file (required for conflict detection)' },
            branch: { type: 'string', description: 'Target branch (default: default branch)' },
          },
          required: ['owner', 'repo', 'filepath', 'message', 'content', 'sha'],
        },
      },
      {
        name: 'delete_file',
        description: 'Delete a file from a repository with a commit message, requires current file SHA',
        inputSchema: {
          type: 'object',
          properties: {
            owner: { type: 'string', description: 'Repository owner username or organization name' },
            repo: { type: 'string', description: 'Repository name' },
            filepath: { type: 'string', description: 'Path of the file to delete' },
            message: { type: 'string', description: 'Commit message for the deletion' },
            sha: { type: 'string', description: 'Current blob SHA of the file (required)' },
            branch: { type: 'string', description: 'Target branch (default: default branch)' },
          },
          required: ['owner', 'repo', 'filepath', 'message', 'sha'],
        },
      },
      // --- Releases ---
      {
        name: 'list_releases',
        description: 'List releases in a repository with pagination',
        inputSchema: {
          type: 'object',
          properties: {
            owner: { type: 'string', description: 'Repository owner username or organization name' },
            repo: { type: 'string', description: 'Repository name' },
            limit: { type: 'number', description: 'Maximum releases to return (default: 10)' },
            page: { type: 'number', description: 'Page number (default: 1)' },
          },
          required: ['owner', 'repo'],
        },
      },
      {
        name: 'get_release',
        description: 'Get a specific release by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            owner: { type: 'string', description: 'Repository owner username or organization name' },
            repo: { type: 'string', description: 'Repository name' },
            id: { type: 'number', description: 'Release ID' },
          },
          required: ['owner', 'repo', 'id'],
        },
      },
      {
        name: 'create_release',
        description: 'Create a new release for a tag with optional release notes and draft/prerelease flags',
        inputSchema: {
          type: 'object',
          properties: {
            owner: { type: 'string', description: 'Repository owner username or organization name' },
            repo: { type: 'string', description: 'Repository name' },
            tag_name: { type: 'string', description: 'Tag name for the release, e.g. v1.0.0' },
            name: { type: 'string', description: 'Release title' },
            body: { type: 'string', description: 'Release notes in markdown' },
            draft: { type: 'boolean', description: 'Create as draft release (default: false)' },
            prerelease: { type: 'boolean', description: 'Mark as pre-release (default: false)' },
            target_commitish: { type: 'string', description: 'Branch or commit to tag; defaults to default branch' },
          },
          required: ['owner', 'repo', 'tag_name'],
        },
      },
      {
        name: 'delete_release',
        description: 'Delete a release by ID from a repository',
        inputSchema: {
          type: 'object',
          properties: {
            owner: { type: 'string', description: 'Repository owner username or organization name' },
            repo: { type: 'string', description: 'Repository name' },
            id: { type: 'number', description: 'Release ID to delete' },
          },
          required: ['owner', 'repo', 'id'],
        },
      },
      // --- Tags ---
      {
        name: 'list_tags',
        description: 'List all tags in a repository with pagination',
        inputSchema: {
          type: 'object',
          properties: {
            owner: { type: 'string', description: 'Repository owner username or organization name' },
            repo: { type: 'string', description: 'Repository name' },
            limit: { type: 'number', description: 'Maximum tags to return (default: 20)' },
            page: { type: 'number', description: 'Page number (default: 1)' },
          },
          required: ['owner', 'repo'],
        },
      },
      {
        name: 'create_tag',
        description: 'Create a new git tag in a repository pointing to a branch or commit',
        inputSchema: {
          type: 'object',
          properties: {
            owner: { type: 'string', description: 'Repository owner username or organization name' },
            repo: { type: 'string', description: 'Repository name' },
            tag_name: { type: 'string', description: 'Name for the new tag, e.g. v2.1.0' },
            target: { type: 'string', description: 'Branch, tag, or commit SHA to tag (default: default branch)' },
            message: { type: 'string', description: 'Tag annotation message for annotated tags' },
          },
          required: ['owner', 'repo', 'tag_name'],
        },
      },
      {
        name: 'delete_tag',
        description: 'Delete a tag from a repository by tag name',
        inputSchema: {
          type: 'object',
          properties: {
            owner: { type: 'string', description: 'Repository owner username or organization name' },
            repo: { type: 'string', description: 'Repository name' },
            tag: { type: 'string', description: 'Tag name to delete' },
          },
          required: ['owner', 'repo', 'tag'],
        },
      },
      // --- Issues ---
      {
        name: 'list_issues',
        description: 'List issues in a repository with optional filters for type, state, labels, and assignee',
        inputSchema: {
          type: 'object',
          properties: {
            owner: { type: 'string', description: 'Repository owner username or organization name' },
            repo: { type: 'string', description: 'Repository name' },
            type: { type: 'string', description: 'Filter by type: issues or pulls (default: issues)' },
            state: { type: 'string', description: 'Filter by state: open, closed, or all (default: open)' },
            labels: { type: 'string', description: 'Comma-separated list of label names to filter by' },
            assignee: { type: 'string', description: 'Filter by assignee username' },
            milestone: { type: 'number', description: 'Filter by milestone ID' },
            limit: { type: 'number', description: 'Maximum issues to return (default: 20)' },
            page: { type: 'number', description: 'Page number (default: 1)' },
          },
          required: ['owner', 'repo'],
        },
      },
      {
        name: 'get_issue',
        description: 'Get a specific issue by its index number',
        inputSchema: {
          type: 'object',
          properties: {
            owner: { type: 'string', description: 'Repository owner username or organization name' },
            repo: { type: 'string', description: 'Repository name' },
            index: { type: 'number', description: 'Issue index number' },
          },
          required: ['owner', 'repo', 'index'],
        },
      },
      {
        name: 'create_issue',
        description: 'Create a new issue in a repository with optional assignees, labels, and milestone',
        inputSchema: {
          type: 'object',
          properties: {
            owner: { type: 'string', description: 'Repository owner username or organization name' },
            repo: { type: 'string', description: 'Repository name' },
            title: { type: 'string', description: 'Issue title' },
            body: { type: 'string', description: 'Issue body in markdown' },
            assignees: { type: 'array', description: 'List of usernames to assign to this issue' },
            labels: { type: 'array', description: 'List of label IDs to add to this issue' },
            milestone: { type: 'number', description: 'Milestone ID to associate with this issue' },
          },
          required: ['owner', 'repo', 'title'],
        },
      },
      {
        name: 'edit_issue',
        description: 'Edit an existing issue: update title, body, state, assignees, labels, or milestone',
        inputSchema: {
          type: 'object',
          properties: {
            owner: { type: 'string', description: 'Repository owner username or organization name' },
            repo: { type: 'string', description: 'Repository name' },
            index: { type: 'number', description: 'Issue index number' },
            title: { type: 'string', description: 'New title for the issue' },
            body: { type: 'string', description: 'New body for the issue in markdown' },
            state: { type: 'string', description: 'New state: open or closed' },
            assignees: { type: 'array', description: 'Replacement list of assignee usernames' },
          },
          required: ['owner', 'repo', 'index'],
        },
      },
      {
        name: 'delete_issue',
        description: 'Permanently delete an issue from a repository (admin only)',
        inputSchema: {
          type: 'object',
          properties: {
            owner: { type: 'string', description: 'Repository owner username or organization name' },
            repo: { type: 'string', description: 'Repository name' },
            index: { type: 'number', description: 'Issue index number to delete' },
          },
          required: ['owner', 'repo', 'index'],
        },
      },
      // --- Issue comments ---
      {
        name: 'list_issue_comments',
        description: 'List all comments on a specific issue in a repository',
        inputSchema: {
          type: 'object',
          properties: {
            owner: { type: 'string', description: 'Repository owner username or organization name' },
            repo: { type: 'string', description: 'Repository name' },
            index: { type: 'number', description: 'Issue index number' },
            limit: { type: 'number', description: 'Maximum comments to return (default: 20)' },
            page: { type: 'number', description: 'Page number (default: 1)' },
          },
          required: ['owner', 'repo', 'index'],
        },
      },
      {
        name: 'create_issue_comment',
        description: 'Add a new comment to an issue',
        inputSchema: {
          type: 'object',
          properties: {
            owner: { type: 'string', description: 'Repository owner username or organization name' },
            repo: { type: 'string', description: 'Repository name' },
            index: { type: 'number', description: 'Issue index number' },
            body: { type: 'string', description: 'Comment body in markdown' },
          },
          required: ['owner', 'repo', 'index', 'body'],
        },
      },
      {
        name: 'edit_issue_comment',
        description: 'Edit an existing comment on an issue by comment ID',
        inputSchema: {
          type: 'object',
          properties: {
            owner: { type: 'string', description: 'Repository owner username or organization name' },
            repo: { type: 'string', description: 'Repository name' },
            id: { type: 'number', description: 'Comment ID to edit' },
            body: { type: 'string', description: 'New comment body in markdown' },
          },
          required: ['owner', 'repo', 'id', 'body'],
        },
      },
      {
        name: 'delete_issue_comment',
        description: 'Delete an existing comment on an issue by comment ID',
        inputSchema: {
          type: 'object',
          properties: {
            owner: { type: 'string', description: 'Repository owner username or organization name' },
            repo: { type: 'string', description: 'Repository name' },
            id: { type: 'number', description: 'Comment ID to delete' },
          },
          required: ['owner', 'repo', 'id'],
        },
      },
      // --- Labels ---
      {
        name: 'list_labels',
        description: 'List all labels in a repository',
        inputSchema: {
          type: 'object',
          properties: {
            owner: { type: 'string', description: 'Repository owner username or organization name' },
            repo: { type: 'string', description: 'Repository name' },
            limit: { type: 'number', description: 'Maximum labels to return (default: 20)' },
            page: { type: 'number', description: 'Page number (default: 1)' },
          },
          required: ['owner', 'repo'],
        },
      },
      {
        name: 'create_label',
        description: 'Create a new label in a repository with a name and hex color',
        inputSchema: {
          type: 'object',
          properties: {
            owner: { type: 'string', description: 'Repository owner username or organization name' },
            repo: { type: 'string', description: 'Repository name' },
            name: { type: 'string', description: 'Label name' },
            color: { type: 'string', description: 'Label color in hex format, e.g. #ff0000' },
            description: { type: 'string', description: 'Optional description for the label' },
          },
          required: ['owner', 'repo', 'name', 'color'],
        },
      },
      {
        name: 'edit_label',
        description: 'Edit an existing label name, color, or description by label ID',
        inputSchema: {
          type: 'object',
          properties: {
            owner: { type: 'string', description: 'Repository owner username or organization name' },
            repo: { type: 'string', description: 'Repository name' },
            id: { type: 'number', description: 'Label ID to update' },
            name: { type: 'string', description: 'New label name' },
            color: { type: 'string', description: 'New label color in hex format, e.g. #00ff00' },
            description: { type: 'string', description: 'New label description' },
          },
          required: ['owner', 'repo', 'id'],
        },
      },
      {
        name: 'delete_label',
        description: 'Delete a label from a repository by label ID',
        inputSchema: {
          type: 'object',
          properties: {
            owner: { type: 'string', description: 'Repository owner username or organization name' },
            repo: { type: 'string', description: 'Repository name' },
            id: { type: 'number', description: 'Label ID to delete' },
          },
          required: ['owner', 'repo', 'id'],
        },
      },
      // --- Milestones ---
      {
        name: 'list_milestones',
        description: 'List all milestones in a repository filtered by state',
        inputSchema: {
          type: 'object',
          properties: {
            owner: { type: 'string', description: 'Repository owner username or organization name' },
            repo: { type: 'string', description: 'Repository name' },
            state: { type: 'string', description: 'Filter by state: open, closed, or all (default: open)' },
            limit: { type: 'number', description: 'Maximum milestones to return (default: 20)' },
            page: { type: 'number', description: 'Page number (default: 1)' },
          },
          required: ['owner', 'repo'],
        },
      },
      {
        name: 'create_milestone',
        description: 'Create a new milestone in a repository with optional due date',
        inputSchema: {
          type: 'object',
          properties: {
            owner: { type: 'string', description: 'Repository owner username or organization name' },
            repo: { type: 'string', description: 'Repository name' },
            title: { type: 'string', description: 'Milestone title' },
            description: { type: 'string', description: 'Milestone description' },
            due_on: { type: 'string', description: 'Due date in ISO 8601 format, e.g. 2026-12-31T00:00:00Z' },
          },
          required: ['owner', 'repo', 'title'],
        },
      },
      {
        name: 'edit_milestone',
        description: 'Edit a milestone title, description, state, or due date by milestone ID',
        inputSchema: {
          type: 'object',
          properties: {
            owner: { type: 'string', description: 'Repository owner username or organization name' },
            repo: { type: 'string', description: 'Repository name' },
            id: { type: 'number', description: 'Milestone ID to update' },
            title: { type: 'string', description: 'New milestone title' },
            description: { type: 'string', description: 'New milestone description' },
            state: { type: 'string', description: 'New state: open or closed' },
            due_on: { type: 'string', description: 'New due date in ISO 8601 format' },
          },
          required: ['owner', 'repo', 'id'],
        },
      },
      {
        name: 'delete_milestone',
        description: 'Delete a milestone from a repository by milestone ID',
        inputSchema: {
          type: 'object',
          properties: {
            owner: { type: 'string', description: 'Repository owner username or organization name' },
            repo: { type: 'string', description: 'Repository name' },
            id: { type: 'number', description: 'Milestone ID to delete' },
          },
          required: ['owner', 'repo', 'id'],
        },
      },
      // --- Pull requests ---
      {
        name: 'list_pull_requests',
        description: 'List pull requests in a repository filtered by state, label, or milestone',
        inputSchema: {
          type: 'object',
          properties: {
            owner: { type: 'string', description: 'Repository owner username or organization name' },
            repo: { type: 'string', description: 'Repository name' },
            state: { type: 'string', description: 'Filter by state: open, closed, or all (default: open)' },
            sort: { type: 'string', description: 'Sort order: oldest, recentupdate, leastupdate, mostcomment, or fewestcomment' },
            limit: { type: 'number', description: 'Maximum pull requests to return (default: 20)' },
            page: { type: 'number', description: 'Page number (default: 1)' },
          },
          required: ['owner', 'repo'],
        },
      },
      {
        name: 'get_pull_request',
        description: 'Get a specific pull request by its index number',
        inputSchema: {
          type: 'object',
          properties: {
            owner: { type: 'string', description: 'Repository owner username or organization name' },
            repo: { type: 'string', description: 'Repository name' },
            index: { type: 'number', description: 'Pull request index number' },
          },
          required: ['owner', 'repo', 'index'],
        },
      },
      {
        name: 'create_pull_request',
        description: 'Create a new pull request to merge a head branch into a base branch',
        inputSchema: {
          type: 'object',
          properties: {
            owner: { type: 'string', description: 'Repository owner username or organization name' },
            repo: { type: 'string', description: 'Repository name' },
            title: { type: 'string', description: 'Pull request title' },
            head: { type: 'string', description: 'Source branch name, e.g. feature/my-feature' },
            base: { type: 'string', description: 'Target branch to merge into, e.g. main' },
            body: { type: 'string', description: 'Pull request description in markdown' },
            assignees: { type: 'array', description: 'List of usernames to assign as reviewers' },
            labels: { type: 'array', description: 'List of label IDs to attach' },
          },
          required: ['owner', 'repo', 'title', 'head', 'base'],
        },
      },
      {
        name: 'edit_pull_request',
        description: 'Edit an existing pull request title, body, state, base branch, or assignees',
        inputSchema: {
          type: 'object',
          properties: {
            owner: { type: 'string', description: 'Repository owner username or organization name' },
            repo: { type: 'string', description: 'Repository name' },
            index: { type: 'number', description: 'Pull request index number' },
            title: { type: 'string', description: 'New pull request title' },
            body: { type: 'string', description: 'New pull request description in markdown' },
            state: { type: 'string', description: 'New state: open or closed' },
            base: { type: 'string', description: 'New target base branch' },
          },
          required: ['owner', 'repo', 'index'],
        },
      },
      {
        name: 'merge_pull_request',
        description: 'Merge a pull request using merge, rebase, squash, or fast-forward-only strategy',
        inputSchema: {
          type: 'object',
          properties: {
            owner: { type: 'string', description: 'Repository owner username or organization name' },
            repo: { type: 'string', description: 'Repository name' },
            index: { type: 'number', description: 'Pull request index number to merge' },
            Do: { type: 'string', description: 'Merge strategy: merge, rebase, squash, or rebase-merge (default: merge)' },
            merge_message_field: { type: 'string', description: 'Custom merge commit message' },
            delete_branch_after_merge: { type: 'boolean', description: 'Delete the head branch after merging (default: false)' },
          },
          required: ['owner', 'repo', 'index'],
        },
      },
      // --- Notifications ---
      {
        name: 'list_notifications',
        description: 'List unread notification threads for the authenticated user with optional read/all filter',
        inputSchema: {
          type: 'object',
          properties: {
            all: { type: 'boolean', description: 'If true, include already-read notifications (default: false)' },
            limit: { type: 'number', description: 'Maximum notifications to return (default: 20)' },
            page: { type: 'number', description: 'Page number (default: 1)' },
          },
        },
      },
      {
        name: 'mark_notifications_read',
        description: 'Mark all notification threads as read for the authenticated user',
        inputSchema: {
          type: 'object',
          properties: {
            last_read_at: { type: 'string', description: 'Mark all notifications before this ISO 8601 timestamp as read' },
          },
        },
      },
      // --- Organizations ---
      {
        name: 'list_orgs',
        description: 'List all visible organizations on the Gitea instance with pagination',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Maximum organizations to return (default: 20)' },
            page: { type: 'number', description: 'Page number (default: 1)' },
          },
        },
      },
      {
        name: 'get_org',
        description: 'Get details of a specific organization by name',
        inputSchema: {
          type: 'object',
          properties: {
            org: { type: 'string', description: 'Organization name' },
          },
          required: ['org'],
        },
      },
      {
        name: 'list_org_repos',
        description: 'List all repositories belonging to an organization',
        inputSchema: {
          type: 'object',
          properties: {
            org: { type: 'string', description: 'Organization name' },
            limit: { type: 'number', description: 'Maximum repositories to return (default: 20)' },
            page: { type: 'number', description: 'Page number (default: 1)' },
          },
          required: ['org'],
        },
      },
      {
        name: 'list_org_members',
        description: 'List all members of an organization',
        inputSchema: {
          type: 'object',
          properties: {
            org: { type: 'string', description: 'Organization name' },
            limit: { type: 'number', description: 'Maximum members to return (default: 20)' },
            page: { type: 'number', description: 'Page number (default: 1)' },
          },
          required: ['org'],
        },
      },
      // --- Users ---
      {
        name: 'get_current_user',
        description: 'Get the profile of the authenticated user',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'get_user',
        description: 'Get the public profile of a user by username',
        inputSchema: {
          type: 'object',
          properties: {
            username: { type: 'string', description: 'Username to look up' },
          },
          required: ['username'],
        },
      },
      {
        name: 'search_users',
        description: 'Search for users by keyword across the Gitea instance',
        inputSchema: {
          type: 'object',
          properties: {
            q: { type: 'string', description: 'Search keyword — matches username and full name' },
            limit: { type: 'number', description: 'Maximum results to return (default: 20)' },
            page: { type: 'number', description: 'Page number (default: 1)' },
          },
          required: ['q'],
        },
      },
      // --- Webhooks ---
      {
        name: 'list_repo_hooks',
        description: 'List all webhooks configured for a repository',
        inputSchema: {
          type: 'object',
          properties: {
            owner: { type: 'string', description: 'Repository owner username or organization name' },
            repo: { type: 'string', description: 'Repository name' },
            limit: { type: 'number', description: 'Maximum webhooks to return (default: 20)' },
            page: { type: 'number', description: 'Page number (default: 1)' },
          },
          required: ['owner', 'repo'],
        },
      },
      {
        name: 'create_repo_hook',
        description: 'Create a new webhook for a repository to receive push, issue, or PR events',
        inputSchema: {
          type: 'object',
          properties: {
            owner: { type: 'string', description: 'Repository owner username or organization name' },
            repo: { type: 'string', description: 'Repository name' },
            type: { type: 'string', description: 'Hook type: gitea, slack, discord, dingtalk, telegram, msteams, feishu, wechatwork, packagist (default: gitea)' },
            url: { type: 'string', description: 'Payload URL to receive webhook events' },
            events: { type: 'array', description: 'List of events to subscribe to, e.g. ["push","issues","pull_request"]' },
            active: { type: 'boolean', description: 'Whether the webhook is active (default: true)' },
            content_type: { type: 'string', description: 'Payload content type: json or form (default: json)' },
          },
          required: ['owner', 'repo', 'type', 'url'],
        },
      },
      {
        name: 'delete_repo_hook',
        description: 'Delete a webhook from a repository by hook ID',
        inputSchema: {
          type: 'object',
          properties: {
            owner: { type: 'string', description: 'Repository owner username or organization name' },
            repo: { type: 'string', description: 'Repository name' },
            id: { type: 'number', description: 'Webhook ID to delete' },
          },
          required: ['owner', 'repo', 'id'],
        },
      },
      // --- Topics ---
      {
        name: 'list_repo_topics',
        description: 'List all topics associated with a repository',
        inputSchema: {
          type: 'object',
          properties: {
            owner: { type: 'string', description: 'Repository owner username or organization name' },
            repo: { type: 'string', description: 'Repository name' },
          },
          required: ['owner', 'repo'],
        },
      },
      {
        name: 'update_repo_topics',
        description: 'Replace all topics for a repository with a new list of topic names',
        inputSchema: {
          type: 'object',
          properties: {
            owner: { type: 'string', description: 'Repository owner username or organization name' },
            repo: { type: 'string', description: 'Repository name' },
            topics: { type: 'array', description: 'Complete replacement list of topic strings' },
          },
          required: ['owner', 'repo', 'topics'],
        },
      },
      // --- Collaborators ---
      {
        name: 'list_collaborators',
        description: 'List all collaborators on a repository',
        inputSchema: {
          type: 'object',
          properties: {
            owner: { type: 'string', description: 'Repository owner username or organization name' },
            repo: { type: 'string', description: 'Repository name' },
            limit: { type: 'number', description: 'Maximum collaborators to return (default: 20)' },
            page: { type: 'number', description: 'Page number (default: 1)' },
          },
          required: ['owner', 'repo'],
        },
      },
      {
        name: 'add_collaborator',
        description: 'Add a user as a collaborator to a repository with a specified permission level',
        inputSchema: {
          type: 'object',
          properties: {
            owner: { type: 'string', description: 'Repository owner username or organization name' },
            repo: { type: 'string', description: 'Repository name' },
            collaborator: { type: 'string', description: 'Username to add as collaborator' },
            permission: { type: 'string', description: 'Permission level: read, write, or admin (default: write)' },
          },
          required: ['owner', 'repo', 'collaborator'],
        },
      },
      {
        name: 'remove_collaborator',
        description: 'Remove a collaborator from a repository',
        inputSchema: {
          type: 'object',
          properties: {
            owner: { type: 'string', description: 'Repository owner username or organization name' },
            repo: { type: 'string', description: 'Repository name' },
            collaborator: { type: 'string', description: 'Username to remove from collaborators' },
          },
          required: ['owner', 'repo', 'collaborator'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_version': return this.getVersion();
        case 'search_repos': return this.searchRepos(args);
        case 'get_repo': return this.getRepo(args);
        case 'create_repo': return this.createRepo(args);
        case 'delete_repo': return this.deleteRepo(args);
        case 'fork_repo': return this.forkRepo(args);
        case 'list_branches': return this.listBranches(args);
        case 'get_branch': return this.getBranch(args);
        case 'create_branch': return this.createBranch(args);
        case 'delete_branch': return this.deleteBranch(args);
        case 'list_commits': return this.listCommits(args);
        case 'get_commit': return this.getCommit(args);
        case 'get_file_contents': return this.getFileContents(args);
        case 'create_file': return this.createFile(args);
        case 'update_file': return this.updateFile(args);
        case 'delete_file': return this.deleteFile(args);
        case 'list_releases': return this.listReleases(args);
        case 'get_release': return this.getRelease(args);
        case 'create_release': return this.createRelease(args);
        case 'delete_release': return this.deleteRelease(args);
        case 'list_tags': return this.listTags(args);
        case 'create_tag': return this.createTag(args);
        case 'delete_tag': return this.deleteTag(args);
        case 'list_issues': return this.listIssues(args);
        case 'get_issue': return this.getIssue(args);
        case 'create_issue': return this.createIssue(args);
        case 'edit_issue': return this.editIssue(args);
        case 'delete_issue': return this.deleteIssue(args);
        case 'list_issue_comments': return this.listIssueComments(args);
        case 'create_issue_comment': return this.createIssueComment(args);
        case 'edit_issue_comment': return this.editIssueComment(args);
        case 'delete_issue_comment': return this.deleteIssueComment(args);
        case 'list_labels': return this.listLabels(args);
        case 'create_label': return this.createLabel(args);
        case 'edit_label': return this.editLabel(args);
        case 'delete_label': return this.deleteLabel(args);
        case 'list_milestones': return this.listMilestones(args);
        case 'create_milestone': return this.createMilestone(args);
        case 'edit_milestone': return this.editMilestone(args);
        case 'delete_milestone': return this.deleteMilestone(args);
        case 'list_pull_requests': return this.listPullRequests(args);
        case 'get_pull_request': return this.getPullRequest(args);
        case 'create_pull_request': return this.createPullRequest(args);
        case 'edit_pull_request': return this.editPullRequest(args);
        case 'merge_pull_request': return this.mergePullRequest(args);
        case 'list_notifications': return this.listNotifications(args);
        case 'mark_notifications_read': return this.markNotificationsRead(args);
        case 'list_orgs': return this.listOrgs(args);
        case 'get_org': return this.getOrg(args);
        case 'list_org_repos': return this.listOrgRepos(args);
        case 'list_org_members': return this.listOrgMembers(args);
        case 'get_current_user': return this.getCurrentUser();
        case 'get_user': return this.getUser(args);
        case 'search_users': return this.searchUsers(args);
        case 'list_repo_hooks': return this.listRepoHooks(args);
        case 'create_repo_hook': return this.createRepoHook(args);
        case 'delete_repo_hook': return this.deleteRepoHook(args);
        case 'list_repo_topics': return this.listRepoTopics(args);
        case 'update_repo_topics': return this.updateRepoTopics(args);
        case 'list_collaborators': return this.listCollaborators(args);
        case 'add_collaborator': return this.addCollaborator(args);
        case 'remove_collaborator': return this.removeCollaborator(args);
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

  private authHeaders(): Record<string, string> {
    return {
      'Authorization': `token ${this.token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  }

  private async doGet(url: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(url, { headers: this.authHeaders() });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    const text = JSON.stringify(data, null, 2);
    return {
      content: [{ type: 'text', text: text.length > 10_000 ? text.slice(0, 10_000) + '\n... [truncated, ' + text.length + ' total chars]' : text }],
      isError: false,
    };
  }

  private async doPost(url: string, body: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers: this.authHeaders(),
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = response.status === 204 ? {} : await response.json();
    const text = JSON.stringify(data, null, 2);
    return {
      content: [{ type: 'text', text: text.length > 10_000 ? text.slice(0, 10_000) + '\n... [truncated, ' + text.length + ' total chars]' : text }],
      isError: false,
    };
  }

  private async doPatch(url: string, body: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(url, {
      method: 'PATCH',
      headers: this.authHeaders(),
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json();
    const text = JSON.stringify(data, null, 2);
    return {
      content: [{ type: 'text', text: text.length > 10_000 ? text.slice(0, 10_000) + '\n... [truncated, ' + text.length + ' total chars]' : text }],
      isError: false,
    };
  }

  private async doPut(url: string, body: unknown): Promise<ToolResult> {
    const response = await this.fetchWithRetry(url, {
      method: 'PUT',
      headers: this.authHeaders(),
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = response.status === 204 ? { status: 'ok' } : await response.json();
    const text = JSON.stringify(data, null, 2);
    return {
      content: [{ type: 'text', text: text.length > 10_000 ? text.slice(0, 10_000) + '\n... [truncated, ' + text.length + ' total chars]' : text }],
      isError: false,
    };
  }

  private async doDelete(url: string): Promise<ToolResult> {
    const response = await this.fetchWithRetry(url, { method: 'DELETE', headers: this.authHeaders() });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    return { content: [{ type: 'text', text: '{"status":"deleted"}' }], isError: false };
  }

  private qs(params: Record<string, string | number | boolean | undefined>): string {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) p.set(k, String(v));
    }
    const s = p.toString();
    return s ? '?' + s : '';
  }

  // --- Implementations ---

  private async getVersion(): Promise<ToolResult> {
    return this.doGet(`${this.baseUrl}/version`);
  }

  private async searchRepos(args: Record<string, unknown>): Promise<ToolResult> {
    return this.doGet(`${this.baseUrl}/repos/search${this.qs({ q: args.q as string, topic: args.topic as boolean, language: args.language as string, owner: args.owner as string, limit: args.limit as number, page: args.page as number })}`);
  }

  private async getRepo(args: Record<string, unknown>): Promise<ToolResult> {
    return this.doGet(`${this.baseUrl}/repos/${args.owner}/${args.repo}`);
  }

  private async createRepo(args: Record<string, unknown>): Promise<ToolResult> {
    const { name, description, private: priv, auto_init, default_branch, gitignores, license } = args;
    return this.doPost(`${this.baseUrl}/user/repos`, { name, description, private: priv, auto_init, default_branch, gitignores, license });
  }

  private async deleteRepo(args: Record<string, unknown>): Promise<ToolResult> {
    return this.doDelete(`${this.baseUrl}/repos/${args.owner}/${args.repo}`);
  }

  private async forkRepo(args: Record<string, unknown>): Promise<ToolResult> {
    return this.doPost(`${this.baseUrl}/repos/${args.owner}/${args.repo}/forks`, { organization: args.organization, name: args.name });
  }

  private async listBranches(args: Record<string, unknown>): Promise<ToolResult> {
    return this.doGet(`${this.baseUrl}/repos/${args.owner}/${args.repo}/branches${this.qs({ limit: args.limit as number, page: args.page as number })}`);
  }

  private async getBranch(args: Record<string, unknown>): Promise<ToolResult> {
    return this.doGet(`${this.baseUrl}/repos/${args.owner}/${args.repo}/branches/${args.branch}`);
  }

  private async createBranch(args: Record<string, unknown>): Promise<ToolResult> {
    return this.doPost(`${this.baseUrl}/repos/${args.owner}/${args.repo}/branches`, { new_branch_name: args.new_branch_name, old_branch_name: args.old_branch_name });
  }

  private async deleteBranch(args: Record<string, unknown>): Promise<ToolResult> {
    return this.doDelete(`${this.baseUrl}/repos/${args.owner}/${args.repo}/branches/${args.branch}`);
  }

  private async listCommits(args: Record<string, unknown>): Promise<ToolResult> {
    return this.doGet(`${this.baseUrl}/repos/${args.owner}/${args.repo}/commits${this.qs({ sha: args.sha as string, path: args.path as string, limit: args.limit as number, page: args.page as number })}`);
  }

  private async getCommit(args: Record<string, unknown>): Promise<ToolResult> {
    return this.doGet(`${this.baseUrl}/repos/${args.owner}/${args.repo}/git/commits/${args.sha}`);
  }

  private async getFileContents(args: Record<string, unknown>): Promise<ToolResult> {
    return this.doGet(`${this.baseUrl}/repos/${args.owner}/${args.repo}/contents/${args.filepath}${this.qs({ ref: args.ref as string })}`);
  }

  private async createFile(args: Record<string, unknown>): Promise<ToolResult> {
    return this.doPost(`${this.baseUrl}/repos/${args.owner}/${args.repo}/contents/${args.filepath}`, { message: args.message, content: args.content, branch: args.branch });
  }

  private async updateFile(args: Record<string, unknown>): Promise<ToolResult> {
    return this.doPut(`${this.baseUrl}/repos/${args.owner}/${args.repo}/contents/${args.filepath}`, { message: args.message, content: args.content, sha: args.sha, branch: args.branch });
  }

  private async deleteFile(args: Record<string, unknown>): Promise<ToolResult> {
    // Gitea DELETE /contents/{filepath} requires a JSON body — use fetch directly
    const response = await this.fetchWithRetry(`${this.baseUrl}/repos/${args.owner}/${args.repo}/contents/${args.filepath}`, {
      method: 'DELETE',
      headers: this.authHeaders(),
      body: JSON.stringify({ message: args.message, sha: args.sha, branch: args.branch }),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = response.status === 204 ? { status: 'deleted' } : await response.json();
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError: false };
  }

  private async listReleases(args: Record<string, unknown>): Promise<ToolResult> {
    return this.doGet(`${this.baseUrl}/repos/${args.owner}/${args.repo}/releases${this.qs({ limit: args.limit as number, page: args.page as number })}`);
  }

  private async getRelease(args: Record<string, unknown>): Promise<ToolResult> {
    return this.doGet(`${this.baseUrl}/repos/${args.owner}/${args.repo}/releases/${args.id}`);
  }

  private async createRelease(args: Record<string, unknown>): Promise<ToolResult> {
    const { owner, repo, tag_name, name, body, draft, prerelease, target_commitish } = args;
    return this.doPost(`${this.baseUrl}/repos/${owner}/${repo}/releases`, { tag_name, name, body, draft, prerelease, target_commitish });
  }

  private async deleteRelease(args: Record<string, unknown>): Promise<ToolResult> {
    return this.doDelete(`${this.baseUrl}/repos/${args.owner}/${args.repo}/releases/${args.id}`);
  }

  private async listTags(args: Record<string, unknown>): Promise<ToolResult> {
    return this.doGet(`${this.baseUrl}/repos/${args.owner}/${args.repo}/tags${this.qs({ limit: args.limit as number, page: args.page as number })}`);
  }

  private async createTag(args: Record<string, unknown>): Promise<ToolResult> {
    return this.doPost(`${this.baseUrl}/repos/${args.owner}/${args.repo}/tags`, { tag_name: args.tag_name, target: args.target, message: args.message });
  }

  private async deleteTag(args: Record<string, unknown>): Promise<ToolResult> {
    return this.doDelete(`${this.baseUrl}/repos/${args.owner}/${args.repo}/tags/${args.tag}`);
  }

  private async listIssues(args: Record<string, unknown>): Promise<ToolResult> {
    return this.doGet(`${this.baseUrl}/repos/${args.owner}/${args.repo}/issues${this.qs({ type: args.type as string, state: args.state as string, labels: args.labels as string, assignee: args.assignee as string, milestone: args.milestone as number, limit: args.limit as number, page: args.page as number })}`);
  }

  private async getIssue(args: Record<string, unknown>): Promise<ToolResult> {
    return this.doGet(`${this.baseUrl}/repos/${args.owner}/${args.repo}/issues/${args.index}`);
  }

  private async createIssue(args: Record<string, unknown>): Promise<ToolResult> {
    const { owner, repo, title, body, assignees, labels, milestone } = args;
    return this.doPost(`${this.baseUrl}/repos/${owner}/${repo}/issues`, { title, body, assignees, labels, milestone });
  }

  private async editIssue(args: Record<string, unknown>): Promise<ToolResult> {
    const { owner, repo, index, title, body, state, assignees } = args;
    return this.doPatch(`${this.baseUrl}/repos/${owner}/${repo}/issues/${index}`, { title, body, state, assignees });
  }

  private async deleteIssue(args: Record<string, unknown>): Promise<ToolResult> {
    return this.doDelete(`${this.baseUrl}/repos/${args.owner}/${args.repo}/issues/${args.index}`);
  }

  private async listIssueComments(args: Record<string, unknown>): Promise<ToolResult> {
    return this.doGet(`${this.baseUrl}/repos/${args.owner}/${args.repo}/issues/${args.index}/comments${this.qs({ limit: args.limit as number, page: args.page as number })}`);
  }

  private async createIssueComment(args: Record<string, unknown>): Promise<ToolResult> {
    return this.doPost(`${this.baseUrl}/repos/${args.owner}/${args.repo}/issues/${args.index}/comments`, { body: args.body });
  }

  private async editIssueComment(args: Record<string, unknown>): Promise<ToolResult> {
    return this.doPatch(`${this.baseUrl}/repos/${args.owner}/${args.repo}/issues/comments/${args.id}`, { body: args.body });
  }

  private async deleteIssueComment(args: Record<string, unknown>): Promise<ToolResult> {
    return this.doDelete(`${this.baseUrl}/repos/${args.owner}/${args.repo}/issues/comments/${args.id}`);
  }

  private async listLabels(args: Record<string, unknown>): Promise<ToolResult> {
    return this.doGet(`${this.baseUrl}/repos/${args.owner}/${args.repo}/labels${this.qs({ limit: args.limit as number, page: args.page as number })}`);
  }

  private async createLabel(args: Record<string, unknown>): Promise<ToolResult> {
    return this.doPost(`${this.baseUrl}/repos/${args.owner}/${args.repo}/labels`, { name: args.name, color: args.color, description: args.description });
  }

  private async editLabel(args: Record<string, unknown>): Promise<ToolResult> {
    return this.doPatch(`${this.baseUrl}/repos/${args.owner}/${args.repo}/labels/${args.id}`, { name: args.name, color: args.color, description: args.description });
  }

  private async deleteLabel(args: Record<string, unknown>): Promise<ToolResult> {
    return this.doDelete(`${this.baseUrl}/repos/${args.owner}/${args.repo}/labels/${args.id}`);
  }

  private async listMilestones(args: Record<string, unknown>): Promise<ToolResult> {
    return this.doGet(`${this.baseUrl}/repos/${args.owner}/${args.repo}/milestones${this.qs({ state: args.state as string, limit: args.limit as number, page: args.page as number })}`);
  }

  private async createMilestone(args: Record<string, unknown>): Promise<ToolResult> {
    return this.doPost(`${this.baseUrl}/repos/${args.owner}/${args.repo}/milestones`, { title: args.title, description: args.description, due_on: args.due_on });
  }

  private async editMilestone(args: Record<string, unknown>): Promise<ToolResult> {
    return this.doPatch(`${this.baseUrl}/repos/${args.owner}/${args.repo}/milestones/${args.id}`, { title: args.title, description: args.description, state: args.state, due_on: args.due_on });
  }

  private async deleteMilestone(args: Record<string, unknown>): Promise<ToolResult> {
    return this.doDelete(`${this.baseUrl}/repos/${args.owner}/${args.repo}/milestones/${args.id}`);
  }

  private async listPullRequests(args: Record<string, unknown>): Promise<ToolResult> {
    return this.doGet(`${this.baseUrl}/repos/${args.owner}/${args.repo}/pulls${this.qs({ state: args.state as string, sort: args.sort as string, limit: args.limit as number, page: args.page as number })}`);
  }

  private async getPullRequest(args: Record<string, unknown>): Promise<ToolResult> {
    return this.doGet(`${this.baseUrl}/repos/${args.owner}/${args.repo}/pulls/${args.index}`);
  }

  private async createPullRequest(args: Record<string, unknown>): Promise<ToolResult> {
    const { owner, repo, title, head, base, body, assignees, labels } = args;
    return this.doPost(`${this.baseUrl}/repos/${owner}/${repo}/pulls`, { title, head, base, body, assignees, labels });
  }

  private async editPullRequest(args: Record<string, unknown>): Promise<ToolResult> {
    const { owner, repo, index, title, body, state, base } = args;
    return this.doPatch(`${this.baseUrl}/repos/${owner}/${repo}/pulls/${index}`, { title, body, state, base });
  }

  private async mergePullRequest(args: Record<string, unknown>): Promise<ToolResult> {
    const { owner, repo, index, Do, merge_message_field, delete_branch_after_merge } = args;
    return this.doPost(`${this.baseUrl}/repos/${owner}/${repo}/pulls/${index}/merge`, {
      Do: Do ?? 'merge',
      merge_message_field,
      delete_branch_after_merge,
    });
  }

  private async listNotifications(args: Record<string, unknown>): Promise<ToolResult> {
    return this.doGet(`${this.baseUrl}/notifications${this.qs({ all: args.all as boolean, limit: args.limit as number, page: args.page as number })}`);
  }

  private async markNotificationsRead(args: Record<string, unknown>): Promise<ToolResult> {
    return this.doPut(`${this.baseUrl}/notifications${this.qs({ last_read_at: args.last_read_at as string })}`, {});
  }

  private async listOrgs(args: Record<string, unknown>): Promise<ToolResult> {
    return this.doGet(`${this.baseUrl}/admin/orgs${this.qs({ limit: args.limit as number, page: args.page as number })}`);
  }

  private async getOrg(args: Record<string, unknown>): Promise<ToolResult> {
    return this.doGet(`${this.baseUrl}/orgs/${args.org}`);
  }

  private async listOrgRepos(args: Record<string, unknown>): Promise<ToolResult> {
    return this.doGet(`${this.baseUrl}/orgs/${args.org}/repos${this.qs({ limit: args.limit as number, page: args.page as number })}`);
  }

  private async listOrgMembers(args: Record<string, unknown>): Promise<ToolResult> {
    return this.doGet(`${this.baseUrl}/orgs/${args.org}/members${this.qs({ limit: args.limit as number, page: args.page as number })}`);
  }

  private async getCurrentUser(): Promise<ToolResult> {
    return this.doGet(`${this.baseUrl}/user`);
  }

  private async getUser(args: Record<string, unknown>): Promise<ToolResult> {
    return this.doGet(`${this.baseUrl}/users/${args.username}`);
  }

  private async searchUsers(args: Record<string, unknown>): Promise<ToolResult> {
    return this.doGet(`${this.baseUrl}/users/search${this.qs({ q: args.q as string, limit: args.limit as number, page: args.page as number })}`);
  }

  private async listRepoHooks(args: Record<string, unknown>): Promise<ToolResult> {
    return this.doGet(`${this.baseUrl}/repos/${args.owner}/${args.repo}/hooks${this.qs({ limit: args.limit as number, page: args.page as number })}`);
  }

  private async createRepoHook(args: Record<string, unknown>): Promise<ToolResult> {
    const { owner, repo, type, url, events, active, content_type } = args;
    return this.doPost(`${this.baseUrl}/repos/${owner}/${repo}/hooks`, {
      type: type ?? 'gitea',
      active: active ?? true,
      events: events ?? ['push'],
      config: { url, content_type: content_type ?? 'json' },
    });
  }

  private async deleteRepoHook(args: Record<string, unknown>): Promise<ToolResult> {
    return this.doDelete(`${this.baseUrl}/repos/${args.owner}/${args.repo}/hooks/${args.id}`);
  }

  private async listRepoTopics(args: Record<string, unknown>): Promise<ToolResult> {
    return this.doGet(`${this.baseUrl}/repos/${args.owner}/${args.repo}/topics`);
  }

  private async updateRepoTopics(args: Record<string, unknown>): Promise<ToolResult> {
    return this.doPut(`${this.baseUrl}/repos/${args.owner}/${args.repo}/topics`, { topics: args.topics ?? [] });
  }

  private async listCollaborators(args: Record<string, unknown>): Promise<ToolResult> {
    return this.doGet(`${this.baseUrl}/repos/${args.owner}/${args.repo}/collaborators${this.qs({ limit: args.limit as number, page: args.page as number })}`);
  }

  private async addCollaborator(args: Record<string, unknown>): Promise<ToolResult> {
    return this.doPut(`${this.baseUrl}/repos/${args.owner}/${args.repo}/collaborators/${args.collaborator}`, { permission: args.permission ?? 'write' });
  }

  private async removeCollaborator(args: Record<string, unknown>): Promise<ToolResult> {
    return this.doDelete(`${this.baseUrl}/repos/${args.owner}/${args.repo}/collaborators/${args.collaborator}`);
  }
}
