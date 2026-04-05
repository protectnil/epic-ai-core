/**
 * Docker Engine MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official Docker Engine API MCP server was found on GitHub for the local engine REST API.
// We build a full REST wrapper for the Docker Engine API v1.33 (Docker 17.04+).
//
// Base URL: http://localhost/v1.33 (via Unix socket — use a TCP proxy or socat for HTTP access)
// Auth: None by default (local socket); TLS client certificates for remote access
// Docs: https://docs.docker.com/engine/api/v1.33/
// Spec: https://api.apis.guru/v2/specs/docker.com/engine/1.33/openapi.json
// Category: devops
// Rate limits: None — local Unix socket API

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface DockerEngineConfig {
  baseUrl?: string;
  apiToken?: string;
}

export class DockerEngineMCPServer extends MCPAdapterBase {
  private readonly baseUrl: string;

  constructor(config: DockerEngineConfig) {
    super();
    this.baseUrl = config.baseUrl || 'http://localhost/v1.33';
  }

  static catalog() {
    return {
      name: 'docker-engine',
      displayName: 'Docker Engine',
      version: '1.0.0',
      category: 'devops',
      keywords: [
        'docker', 'container', 'image', 'volume', 'network', 'swarm',
        'service', 'node', 'stack', 'secret', 'config', 'exec',
        'devops', 'orchestration', 'deployment', 'build', 'registry',
        'plugin', 'task', 'prune', 'logs', 'stats', 'inspect',
      ],
      toolNames: [
        // System
        'ping', 'get_version', 'get_system_info', 'get_data_usage', 'get_events',
        // Containers
        'list_containers', 'create_container', 'inspect_container', 'list_container_processes',
        'get_container_logs', 'get_container_changes', 'get_container_stats',
        'start_container', 'stop_container', 'restart_container', 'kill_container',
        'update_container', 'rename_container', 'pause_container', 'unpause_container',
        'wait_container', 'delete_container', 'prune_containers',
        // Images
        'list_images', 'create_image', 'inspect_image', 'get_image_history',
        'push_image', 'tag_image', 'delete_image', 'search_images', 'prune_images',
        'build_image',
        // Networks
        'list_networks', 'create_network', 'inspect_network', 'delete_network',
        'connect_container_to_network', 'disconnect_container_from_network', 'prune_networks',
        // Volumes
        'list_volumes', 'create_volume', 'inspect_volume', 'delete_volume', 'prune_volumes',
        // Exec
        'create_exec', 'start_exec', 'inspect_exec',
        // Swarm
        'inspect_swarm', 'init_swarm', 'join_swarm', 'leave_swarm', 'update_swarm',
        'get_swarm_unlock_key', 'unlock_swarm',
        // Services
        'list_services', 'create_service', 'inspect_service', 'get_service_logs',
        'update_service', 'delete_service',
        // Tasks
        'list_tasks', 'inspect_task',
        // Nodes
        'list_nodes', 'inspect_node', 'update_node', 'delete_node',
        // Secrets
        'list_secrets', 'create_secret', 'inspect_secret', 'delete_secret',
        // Configs
        'list_configs', 'create_config', 'inspect_config', 'delete_config',
      ],
      description: 'Docker Engine API: manage containers, images, networks, volumes, swarm services, nodes, secrets, and configs on a local or remote Docker daemon.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // ── System ─────────────────────────────────────────────────────────────
      {
        name: 'ping',
        description: 'Ping the Docker daemon to check if it is reachable and running',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'get_version',
        description: 'Get Docker Engine version information — engine version, API version, OS, architecture',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'get_system_info',
        description: 'Get system-wide Docker information — containers running, images, storage driver, swarm status, resource limits',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'get_data_usage',
        description: 'Get a summary of Docker disk usage — images, containers, volumes, and build cache',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'get_events',
        description: 'Stream Docker daemon events (container, image, network, volume events) with optional time range and filter',
        inputSchema: {
          type: 'object',
          properties: {
            since: { type: 'string', description: 'Show events since this Unix timestamp or RFC3339 date' },
            until: { type: 'string', description: 'Show events until this Unix timestamp or RFC3339 date' },
            filters: { type: 'string', description: 'JSON-encoded filter map (e.g. {"type":["container"],"event":["start"]})' },
          },
        },
      },
      // ── Containers ─────────────────────────────────────────────────────────
      {
        name: 'list_containers',
        description: 'List Docker containers with optional filters for running/all/exited/etc.',
        inputSchema: {
          type: 'object',
          properties: {
            all: { type: 'boolean', description: 'If true, list all containers (default: only running)' },
            limit: { type: 'number', description: 'Maximum number of containers to return' },
            size: { type: 'boolean', description: 'If true, include container filesystem sizes' },
            filters: { type: 'string', description: 'JSON-encoded filter map (e.g. {"status":["running"],"name":["myapp"]})' },
          },
        },
      },
      {
        name: 'create_container',
        description: 'Create a new Docker container from an image (does not start it — use start_container)',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Assign a name to the container' },
            image: { type: 'string', description: 'Image name and tag (e.g. nginx:latest, ubuntu:22.04)' },
            cmd: {
              type: 'array',
              description: 'Command to run in the container (overrides image default)',
              items: { type: 'string' },
            },
            env: {
              type: 'array',
              description: 'Environment variables (e.g. ["NODE_ENV=production", "PORT=3000"])',
              items: { type: 'string' },
            },
            ports: {
              type: 'object',
              description: 'Port bindings — ExposedPorts map (e.g. {"80/tcp": {}})',
            },
            volumes: {
              type: 'object',
              description: 'Volume mount points (e.g. {"/data": {}})',
            },
            host_config: {
              type: 'object',
              description: 'Host-level configuration: PortBindings, Binds, RestartPolicy, Memory, CpuShares, etc.',
            },
            labels: {
              type: 'object',
              description: 'Key-value labels to apply to the container',
            },
            working_dir: { type: 'string', description: 'Working directory inside the container' },
            entrypoint: {
              type: 'array',
              description: 'Override the default entrypoint',
              items: { type: 'string' },
            },
          },
          required: ['image'],
        },
      },
      {
        name: 'inspect_container',
        description: 'Return detailed information about a container — configuration, state, network settings, mounts',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Container ID or name' },
            size: { type: 'boolean', description: 'If true, include filesystem size information' },
          },
          required: ['id'],
        },
      },
      {
        name: 'list_container_processes',
        description: 'List processes running inside a container (equivalent to docker top)',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Container ID or name' },
            ps_args: { type: 'string', description: 'Arguments to pass to ps (default: -ef)' },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_container_logs',
        description: 'Get stdout/stderr logs from a container with optional tail, timestamps, and time range',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Container ID or name' },
            stdout: { type: 'boolean', description: 'Include stdout (default: true)' },
            stderr: { type: 'boolean', description: 'Include stderr (default: true)' },
            since: { type: 'string', description: 'Show logs since Unix timestamp or RFC3339 date' },
            until: { type: 'string', description: 'Show logs until Unix timestamp or RFC3339 date' },
            timestamps: { type: 'boolean', description: 'Add timestamps to each log line' },
            tail: { type: 'string', description: 'Number of lines from end of logs (e.g. "100" or "all")' },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_container_changes',
        description: 'Get a list of filesystem changes made inside a container since it was created',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Container ID or name' },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_container_stats',
        description: 'Get real-time resource usage statistics for a container — CPU, memory, network I/O, block I/O',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Container ID or name' },
            stream: { type: 'boolean', description: 'If true, stream stats continuously (default: false — single snapshot)' },
          },
          required: ['id'],
        },
      },
      {
        name: 'start_container',
        description: 'Start a stopped container by ID or name',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Container ID or name' },
            detach_keys: { type: 'string', description: 'Key sequence to detach from the container (e.g. ctrl-c)' },
          },
          required: ['id'],
        },
      },
      {
        name: 'stop_container',
        description: 'Stop a running container gracefully (sends SIGTERM, then SIGKILL after timeout)',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Container ID or name' },
            t: { type: 'number', description: 'Seconds to wait before sending SIGKILL (default: 10)' },
          },
          required: ['id'],
        },
      },
      {
        name: 'restart_container',
        description: 'Restart a container (stop then start)',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Container ID or name' },
            t: { type: 'number', description: 'Seconds to wait before sending SIGKILL on stop (default: 10)' },
          },
          required: ['id'],
        },
      },
      {
        name: 'kill_container',
        description: 'Send a signal to a container (default: SIGKILL)',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Container ID or name' },
            signal: { type: 'string', description: 'Signal to send (e.g. SIGKILL, SIGTERM, SIGHUP — default: SIGKILL)' },
          },
          required: ['id'],
        },
      },
      {
        name: 'update_container',
        description: 'Update a running container — change resource limits (CPU, memory) and restart policy without recreating it',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Container ID or name' },
            memory: { type: 'number', description: 'Memory limit in bytes (0 = unlimited)' },
            cpu_shares: { type: 'number', description: 'CPU shares (relative weight vs other containers)' },
            restart_policy: {
              type: 'object',
              description: 'Restart policy: {Name: "always"|"unless-stopped"|"on-failure"|"no", MaximumRetryCount: N}',
            },
          },
          required: ['id'],
        },
      },
      {
        name: 'rename_container',
        description: 'Rename a container',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Container ID or current name' },
            name: { type: 'string', description: 'New container name' },
          },
          required: ['id', 'name'],
        },
      },
      {
        name: 'pause_container',
        description: 'Pause all processes within a container using the cgroups freezer',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Container ID or name' },
          },
          required: ['id'],
        },
      },
      {
        name: 'unpause_container',
        description: 'Resume all processes that have been paused in a container',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Container ID or name' },
          },
          required: ['id'],
        },
      },
      {
        name: 'wait_container',
        description: 'Wait for a container to stop and return its exit code',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Container ID or name' },
            condition: { type: 'string', description: 'Condition to wait for: not-running (default), next-exit, removed' },
          },
          required: ['id'],
        },
      },
      {
        name: 'delete_container',
        description: 'Remove a stopped container by ID or name',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Container ID or name' },
            v: { type: 'boolean', description: 'If true, remove associated anonymous volumes' },
            force: { type: 'boolean', description: 'If true, force-remove a running container (sends SIGKILL)' },
            link: { type: 'boolean', description: 'If true, remove specified link' },
          },
          required: ['id'],
        },
      },
      {
        name: 'prune_containers',
        description: 'Remove all stopped containers to free disk space',
        inputSchema: {
          type: 'object',
          properties: {
            filters: { type: 'string', description: 'JSON-encoded filter map (e.g. {"until":["24h"]})' },
          },
        },
      },
      // ── Images ─────────────────────────────────────────────────────────────
      {
        name: 'list_images',
        description: 'List Docker images available on the local daemon',
        inputSchema: {
          type: 'object',
          properties: {
            all: { type: 'boolean', description: 'If true, show all images including intermediate layers' },
            filters: { type: 'string', description: 'JSON-encoded filter map (e.g. {"dangling":["true"],"label":["env=prod"]})' },
          },
        },
      },
      {
        name: 'create_image',
        description: 'Pull an image from a registry or import from a tarball URL (docker pull equivalent)',
        inputSchema: {
          type: 'object',
          properties: {
            from_image: { type: 'string', description: 'Image name to pull (e.g. ubuntu or nginx:latest)' },
            from_src: { type: 'string', description: 'URL to import from (use - for stdin tarball)' },
            repo: { type: 'string', description: 'Repository to tag the pulled image' },
            tag: { type: 'string', description: 'Tag for the image (default: latest)' },
          },
        },
      },
      {
        name: 'inspect_image',
        description: 'Return detailed low-level information about an image — layers, config, size, labels',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Image name or ID' },
          },
          required: ['name'],
        },
      },
      {
        name: 'get_image_history',
        description: 'Get the history of an image — each layer, command, size, and creation time',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Image name or ID' },
          },
          required: ['name'],
        },
      },
      {
        name: 'push_image',
        description: 'Push an image to a registry (requires appropriate auth credentials)',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Image name (e.g. registry.example.com/myapp)' },
            tag: { type: 'string', description: 'Tag to push (default: latest)' },
          },
          required: ['name'],
        },
      },
      {
        name: 'tag_image',
        description: 'Tag an image to a repository name — creates an alias without copying the image',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Source image name or ID' },
            repo: { type: 'string', description: 'Target repository (e.g. myregistry.com/myapp)' },
            tag: { type: 'string', description: 'Target tag (default: latest)' },
          },
          required: ['name', 'repo'],
        },
      },
      {
        name: 'delete_image',
        description: 'Remove a Docker image by name or ID — fails if any container uses it unless forced',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Image name or ID to remove' },
            force: { type: 'boolean', description: 'Force removal of the image' },
            noprune: { type: 'boolean', description: 'If true, do not delete untagged parent images' },
          },
          required: ['name'],
        },
      },
      {
        name: 'search_images',
        description: 'Search Docker Hub for images by name with optional filtering',
        inputSchema: {
          type: 'object',
          properties: {
            term: { type: 'string', description: 'Search term (e.g. nginx, postgres, redis)' },
            limit: { type: 'number', description: 'Maximum number of results (default: 25)' },
            filters: { type: 'string', description: 'JSON-encoded filter map (e.g. {"is-official":["true"]})' },
          },
          required: ['term'],
        },
      },
      {
        name: 'prune_images',
        description: 'Remove unused (dangling) images to free disk space',
        inputSchema: {
          type: 'object',
          properties: {
            filters: { type: 'string', description: 'JSON-encoded filter map (e.g. {"until":["24h"]})' },
          },
        },
      },
      {
        name: 'build_image',
        description: 'Build a Docker image from a Dockerfile (provide tarball as context via remote URL)',
        inputSchema: {
          type: 'object',
          properties: {
            dockerfile: { type: 'string', description: 'Path to the Dockerfile within the build context (default: Dockerfile)' },
            t: { type: 'string', description: 'Name and optional tag (e.g. myapp:1.0)' },
            remote: { type: 'string', description: 'Remote URL (git repo or tarball) to use as build context' },
            no_cache: { type: 'boolean', description: 'If true, do not use cache when building' },
            pull: { type: 'boolean', description: 'If true, always pull a newer version of the base image' },
            buildargs: { type: 'string', description: 'JSON-encoded build argument map (e.g. {"VERSION":"1.0"})' },
            labels: { type: 'string', description: 'JSON-encoded labels to apply to the image (e.g. {"env":"prod"})' },
          },
        },
      },
      // ── Networks ───────────────────────────────────────────────────────────
      {
        name: 'list_networks',
        description: 'List all Docker networks on the daemon',
        inputSchema: {
          type: 'object',
          properties: {
            filters: { type: 'string', description: 'JSON-encoded filter map (e.g. {"driver":["bridge"],"name":["mynet"]})' },
          },
        },
      },
      {
        name: 'create_network',
        description: 'Create a new Docker network with specified driver and options',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Network name (must be unique)' },
            driver: { type: 'string', description: 'Network driver: bridge, overlay, host, none (default: bridge)' },
            internal: { type: 'boolean', description: 'If true, restrict external access to the network' },
            attachable: { type: 'boolean', description: 'If true, allow manual container attachment (swarm overlay networks)' },
            enable_ipv6: { type: 'boolean', description: 'Enable IPv6 on this network' },
            labels: { type: 'object', description: 'Key-value labels for the network' },
            options: { type: 'object', description: 'Driver-specific options' },
          },
          required: ['name'],
        },
      },
      {
        name: 'inspect_network',
        description: 'Return detailed information about a Docker network — containers, IPAM config, driver options',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Network ID or name' },
            verbose: { type: 'boolean', description: 'If true, include detailed task/service info for swarm networks' },
          },
          required: ['id'],
        },
      },
      {
        name: 'delete_network',
        description: 'Remove a Docker network by ID or name (must have no active endpoints)',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Network ID or name' },
          },
          required: ['id'],
        },
      },
      {
        name: 'connect_container_to_network',
        description: 'Connect a running container to a network',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Network ID or name' },
            container: { type: 'string', description: 'Container ID or name to connect' },
            aliases: {
              type: 'array',
              description: 'DNS aliases for the container in this network',
              items: { type: 'string' },
            },
          },
          required: ['id', 'container'],
        },
      },
      {
        name: 'disconnect_container_from_network',
        description: 'Disconnect a container from a network',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Network ID or name' },
            container: { type: 'string', description: 'Container ID or name to disconnect' },
            force: { type: 'boolean', description: 'If true, force disconnect' },
          },
          required: ['id', 'container'],
        },
      },
      {
        name: 'prune_networks',
        description: 'Remove all unused Docker networks',
        inputSchema: {
          type: 'object',
          properties: {
            filters: { type: 'string', description: 'JSON-encoded filter map' },
          },
        },
      },
      // ── Volumes ────────────────────────────────────────────────────────────
      {
        name: 'list_volumes',
        description: 'List all Docker volumes on the daemon',
        inputSchema: {
          type: 'object',
          properties: {
            filters: { type: 'string', description: 'JSON-encoded filter map (e.g. {"dangling":["true"],"driver":["local"]})' },
          },
        },
      },
      {
        name: 'create_volume',
        description: 'Create a new Docker volume',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Volume name (auto-generated if omitted)' },
            driver: { type: 'string', description: 'Volume driver (default: local)' },
            driver_opts: { type: 'object', description: 'Driver-specific options' },
            labels: { type: 'object', description: 'Key-value labels for the volume' },
          },
        },
      },
      {
        name: 'inspect_volume',
        description: 'Return detailed information about a Docker volume — mount point, driver, labels',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Volume name' },
          },
          required: ['name'],
        },
      },
      {
        name: 'delete_volume',
        description: 'Remove a Docker volume by name (must not be in use by any containers)',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Volume name to delete' },
            force: { type: 'boolean', description: 'If true, force removal of the volume' },
          },
          required: ['name'],
        },
      },
      {
        name: 'prune_volumes',
        description: 'Remove all unused Docker volumes to free disk space',
        inputSchema: {
          type: 'object',
          properties: {
            filters: { type: 'string', description: 'JSON-encoded filter map' },
          },
        },
      },
      // ── Exec ───────────────────────────────────────────────────────────────
      {
        name: 'create_exec',
        description: 'Create an exec instance to run a command inside a running container',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Container ID or name to exec into' },
            cmd: {
              type: 'array',
              description: 'Command to execute (e.g. ["/bin/sh", "-c", "ls -la"])',
              items: { type: 'string' },
            },
            attach_stdin: { type: 'boolean', description: 'Attach to stdin of the exec' },
            attach_stdout: { type: 'boolean', description: 'Attach to stdout of the exec (default: true)' },
            attach_stderr: { type: 'boolean', description: 'Attach to stderr of the exec (default: true)' },
            tty: { type: 'boolean', description: 'Allocate a pseudo-TTY' },
            env: {
              type: 'array',
              description: 'Environment variables for the exec process',
              items: { type: 'string' },
            },
            working_dir: { type: 'string', description: 'Working directory for the exec process' },
            user: { type: 'string', description: 'User to run the exec as (e.g. root, 1000:1000)' },
          },
          required: ['id', 'cmd'],
        },
      },
      {
        name: 'start_exec',
        description: 'Start a previously created exec instance',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Exec instance ID (returned by create_exec)' },
            detach: { type: 'boolean', description: 'If true, run in detached mode (do not wait for output)' },
            tty: { type: 'boolean', description: 'Allocate a pseudo-TTY' },
          },
          required: ['id'],
        },
      },
      {
        name: 'inspect_exec',
        description: 'Return low-level information about an exec instance — exit code, running status, container',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Exec instance ID' },
          },
          required: ['id'],
        },
      },
      // ── Swarm ──────────────────────────────────────────────────────────────
      {
        name: 'inspect_swarm',
        description: 'Inspect the current swarm — cluster configuration, join tokens, spec, version',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'init_swarm',
        description: 'Initialize a new Docker Swarm on this daemon as the first manager node',
        inputSchema: {
          type: 'object',
          properties: {
            advertise_addr: { type: 'string', description: 'Advertised address for other nodes to reach this manager (e.g. 192.168.1.10:2377)' },
            listen_addr: { type: 'string', description: 'Listen address for swarm management traffic (default: 0.0.0.0:2377)' },
            force_new_cluster: { type: 'boolean', description: 'If true, force-create a new cluster from this single node' },
          },
        },
      },
      {
        name: 'join_swarm',
        description: 'Join an existing Docker Swarm as a manager or worker node',
        inputSchema: {
          type: 'object',
          properties: {
            remote_addrs: {
              type: 'array',
              description: 'Addresses of existing swarm manager nodes to join',
              items: { type: 'string' },
            },
            join_token: { type: 'string', description: 'Join token for the target role (worker or manager token)' },
            advertise_addr: { type: 'string', description: 'Advertised address for this node' },
            listen_addr: { type: 'string', description: 'Listen address for swarm traffic' },
          },
          required: ['remote_addrs', 'join_token'],
        },
      },
      {
        name: 'leave_swarm',
        description: 'Leave the current Docker Swarm',
        inputSchema: {
          type: 'object',
          properties: {
            force: { type: 'boolean', description: 'If true, force leave even if this is the last manager (destructive)' },
          },
        },
      },
      {
        name: 'update_swarm',
        description: 'Update the swarm configuration — rotation policies, dispatcher heartbeat, CA certificates',
        inputSchema: {
          type: 'object',
          properties: {
            version: { type: 'number', description: 'Current swarm version (required for optimistic locking)' },
            spec: { type: 'object', description: 'Updated SwarmSpec object' },
            rotate_worker_token: { type: 'boolean', description: 'If true, rotate the worker join token' },
            rotate_manager_token: { type: 'boolean', description: 'If true, rotate the manager join token' },
          },
          required: ['version'],
        },
      },
      {
        name: 'get_swarm_unlock_key',
        description: 'Get the unlock key for a locked swarm manager (required after manager restart if autolock is enabled)',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'unlock_swarm',
        description: 'Unlock a locked swarm manager using the unlock key',
        inputSchema: {
          type: 'object',
          properties: {
            unlock_key: { type: 'string', description: 'Unlock key obtained from get_swarm_unlock_key' },
          },
          required: ['unlock_key'],
        },
      },
      // ── Services ───────────────────────────────────────────────────────────
      {
        name: 'list_services',
        description: 'List all services in the Docker Swarm',
        inputSchema: {
          type: 'object',
          properties: {
            filters: { type: 'string', description: 'JSON-encoded filter map (e.g. {"name":["myservice"],"label":["env=prod"]})' },
          },
        },
      },
      {
        name: 'create_service',
        description: 'Create a new service in the Docker Swarm',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Service name' },
            image: { type: 'string', description: 'Image to use for service tasks' },
            replicas: { type: 'number', description: 'Number of desired replicas (for replicated mode)' },
            env: {
              type: 'array',
              description: 'Environment variables for service containers',
              items: { type: 'string' },
            },
            ports: {
              type: 'array',
              description: 'Published ports array (e.g. [{Protocol: "tcp", TargetPort: 80, PublishedPort: 8080}])',
              items: { type: 'object' },
            },
            labels: { type: 'object', description: 'Service-level labels' },
            constraints: {
              type: 'array',
              description: 'Placement constraints (e.g. ["node.role==manager"])',
              items: { type: 'string' },
            },
            cmd: {
              type: 'array',
              description: 'Override command for service tasks',
              items: { type: 'string' },
            },
          },
          required: ['name', 'image'],
        },
      },
      {
        name: 'inspect_service',
        description: 'Return detailed information about a Swarm service — spec, version, endpoint',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Service ID or name' },
          },
          required: ['id'],
        },
      },
      {
        name: 'get_service_logs',
        description: 'Get logs from all tasks of a Swarm service',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Service ID or name' },
            stdout: { type: 'boolean', description: 'Include stdout (default: true)' },
            stderr: { type: 'boolean', description: 'Include stderr (default: true)' },
            since: { type: 'string', description: 'Show logs since Unix timestamp or RFC3339 date' },
            timestamps: { type: 'boolean', description: 'Add timestamps to log lines' },
            tail: { type: 'string', description: 'Number of lines from end of logs (e.g. "100" or "all")' },
          },
          required: ['id'],
        },
      },
      {
        name: 'update_service',
        description: 'Update a Swarm service — change image, replicas, env, ports, or any other spec field',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Service ID or name' },
            version: { type: 'number', description: 'Current service version (required for optimistic locking — get from inspect_service)' },
            spec: { type: 'object', description: 'Updated ServiceSpec (full replacement — include all desired fields)' },
          },
          required: ['id', 'version', 'spec'],
        },
      },
      {
        name: 'delete_service',
        description: 'Remove a Swarm service and all its tasks',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Service ID or name to delete' },
          },
          required: ['id'],
        },
      },
      // ── Tasks ──────────────────────────────────────────────────────────────
      {
        name: 'list_tasks',
        description: 'List all tasks (service instances) in the Docker Swarm',
        inputSchema: {
          type: 'object',
          properties: {
            filters: { type: 'string', description: 'JSON-encoded filter map (e.g. {"service":["myservice"],"node":["node1"],"desired-state":["running"]})' },
          },
        },
      },
      {
        name: 'inspect_task',
        description: 'Return detailed information about a Swarm task — status, container spec, node assignment',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Task ID' },
          },
          required: ['id'],
        },
      },
      // ── Nodes ──────────────────────────────────────────────────────────────
      {
        name: 'list_nodes',
        description: 'List all nodes in the Docker Swarm',
        inputSchema: {
          type: 'object',
          properties: {
            filters: { type: 'string', description: 'JSON-encoded filter map (e.g. {"role":["manager"],"membership":["accepted"]})' },
          },
        },
      },
      {
        name: 'inspect_node',
        description: 'Return detailed information about a Swarm node — role, state, resources, labels',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Node ID or hostname' },
          },
          required: ['id'],
        },
      },
      {
        name: 'update_node',
        description: 'Update a Swarm node — change role (worker/manager), availability, or labels',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Node ID' },
            version: { type: 'number', description: 'Current node version (required — get from inspect_node)' },
            spec: {
              type: 'object',
              description: 'Updated NodeSpec: {Role: "worker"|"manager", Availability: "active"|"pause"|"drain", Labels: {}, Name: ""}',
            },
          },
          required: ['id', 'version', 'spec'],
        },
      },
      {
        name: 'delete_node',
        description: 'Remove a node from the Docker Swarm',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Node ID to remove' },
            force: { type: 'boolean', description: 'If true, force remove even if the node is still active' },
          },
          required: ['id'],
        },
      },
      // ── Secrets ────────────────────────────────────────────────────────────
      {
        name: 'list_secrets',
        description: 'List all secrets in the Docker Swarm (names only — secret data is never returned)',
        inputSchema: {
          type: 'object',
          properties: {
            filters: { type: 'string', description: 'JSON-encoded filter map (e.g. {"name":["db-password"],"label":["env=prod"]})' },
          },
        },
      },
      {
        name: 'create_secret',
        description: 'Create a new secret in the Docker Swarm (secret data is stored encrypted in Raft)',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Secret name' },
            data: { type: 'string', description: 'Base64-encoded secret data' },
            labels: { type: 'object', description: 'Key-value labels for the secret' },
          },
          required: ['name', 'data'],
        },
      },
      {
        name: 'inspect_secret',
        description: 'Return detailed information about a secret (name, labels, version — NOT the secret data)',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Secret ID or name' },
          },
          required: ['id'],
        },
      },
      {
        name: 'delete_secret',
        description: 'Remove a secret from the Docker Swarm by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Secret ID to delete' },
          },
          required: ['id'],
        },
      },
      // ── Configs ────────────────────────────────────────────────────────────
      {
        name: 'list_configs',
        description: 'List all configs in the Docker Swarm',
        inputSchema: {
          type: 'object',
          properties: {
            filters: { type: 'string', description: 'JSON-encoded filter map (e.g. {"name":["my-config"]})' },
          },
        },
      },
      {
        name: 'create_config',
        description: 'Create a new config in the Docker Swarm (non-sensitive config data stored in Raft)',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Config name' },
            data: { type: 'string', description: 'Base64-encoded config data (e.g. Nginx config file contents)' },
            labels: { type: 'object', description: 'Key-value labels for the config' },
          },
          required: ['name', 'data'],
        },
      },
      {
        name: 'inspect_config',
        description: 'Return detailed information about a Swarm config including its data',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Config ID or name' },
          },
          required: ['id'],
        },
      },
      {
        name: 'delete_config',
        description: 'Remove a config from the Docker Swarm by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Config ID to delete' },
          },
          required: ['id'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        // System
        case 'ping':                          return this.ping();
        case 'get_version':                   return this.getVersion();
        case 'get_system_info':               return this.getSystemInfo();
        case 'get_data_usage':                return this.getDataUsage();
        case 'get_events':                    return this.getEvents(args);
        // Containers
        case 'list_containers':               return this.listContainers(args);
        case 'create_container':              return this.createContainer(args);
        case 'inspect_container':             return this.inspectContainer(args);
        case 'list_container_processes':      return this.listContainerProcesses(args);
        case 'get_container_logs':            return this.getContainerLogs(args);
        case 'get_container_changes':         return this.getContainerChanges(args);
        case 'get_container_stats':           return this.getContainerStats(args);
        case 'start_container':               return this.startContainer(args);
        case 'stop_container':                return this.stopContainer(args);
        case 'restart_container':             return this.restartContainer(args);
        case 'kill_container':                return this.killContainer(args);
        case 'update_container':              return this.updateContainer(args);
        case 'rename_container':              return this.renameContainer(args);
        case 'pause_container':               return this.pauseContainer(args);
        case 'unpause_container':             return this.unpauseContainer(args);
        case 'wait_container':                return this.waitContainer(args);
        case 'delete_container':              return this.deleteContainer(args);
        case 'prune_containers':              return this.pruneContainers(args);
        // Images
        case 'list_images':                   return this.listImages(args);
        case 'create_image':                  return this.createImage(args);
        case 'inspect_image':                 return this.inspectImage(args);
        case 'get_image_history':             return this.getImageHistory(args);
        case 'push_image':                    return this.pushImage(args);
        case 'tag_image':                     return this.tagImage(args);
        case 'delete_image':                  return this.deleteImage(args);
        case 'search_images':                 return this.searchImages(args);
        case 'prune_images':                  return this.pruneImages(args);
        case 'build_image':                   return this.buildImage(args);
        // Networks
        case 'list_networks':                 return this.listNetworks(args);
        case 'create_network':                return this.createNetwork(args);
        case 'inspect_network':               return this.inspectNetwork(args);
        case 'delete_network':                return this.deleteNetwork(args);
        case 'connect_container_to_network':  return this.connectContainerToNetwork(args);
        case 'disconnect_container_from_network': return this.disconnectContainerFromNetwork(args);
        case 'prune_networks':                return this.pruneNetworks(args);
        // Volumes
        case 'list_volumes':                  return this.listVolumes(args);
        case 'create_volume':                 return this.createVolume(args);
        case 'inspect_volume':                return this.inspectVolume(args);
        case 'delete_volume':                 return this.deleteVolume(args);
        case 'prune_volumes':                 return this.pruneVolumes(args);
        // Exec
        case 'create_exec':                   return this.createExec(args);
        case 'start_exec':                    return this.startExec(args);
        case 'inspect_exec':                  return this.inspectExec(args);
        // Swarm
        case 'inspect_swarm':                 return this.inspectSwarm();
        case 'init_swarm':                    return this.initSwarm(args);
        case 'join_swarm':                    return this.joinSwarm(args);
        case 'leave_swarm':                   return this.leaveSwarm(args);
        case 'update_swarm':                  return this.updateSwarm(args);
        case 'get_swarm_unlock_key':          return this.getSwarmUnlockKey();
        case 'unlock_swarm':                  return this.unlockSwarm(args);
        // Services
        case 'list_services':                 return this.listServices(args);
        case 'create_service':                return this.createService(args);
        case 'inspect_service':               return this.inspectService(args);
        case 'get_service_logs':              return this.getServiceLogs(args);
        case 'update_service':                return this.updateService(args);
        case 'delete_service':                return this.deleteService(args);
        // Tasks
        case 'list_tasks':                    return this.listTasks(args);
        case 'inspect_task':                  return this.inspectTask(args);
        // Nodes
        case 'list_nodes':                    return this.listNodes(args);
        case 'inspect_node':                  return this.inspectNode(args);
        case 'update_node':                   return this.updateNode(args);
        case 'delete_node':                   return this.deleteNode(args);
        // Secrets
        case 'list_secrets':                  return this.listSecrets(args);
        case 'create_secret':                 return this.createSecret(args);
        case 'inspect_secret':                return this.inspectSecret(args);
        case 'delete_secret':                 return this.deleteSecret(args);
        // Configs
        case 'list_configs':                  return this.listConfigs(args);
        case 'create_config':                 return this.createConfig(args);
        case 'inspect_config':                return this.inspectConfig(args);
        case 'delete_config':                 return this.deleteConfig(args);
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

  // ── Private helpers ────────────────────────────────────────────────────────


  private buildQuery(params: Record<string, unknown>): string {
    const q = Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== null)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join('&');
    return q ? `?${q}` : '';
  }

  private async request(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    body?: Record<string, unknown>,
  ): Promise<ToolResult> {
    const url = `${this.baseUrl}${path}`;
    const init: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    };
    if (body && Object.keys(body).length > 0) init.body = JSON.stringify(body);
    const response = await this.fetchWithRetry(url, init);
    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${errText}` }],
        isError: true,
      };
    }
    if (response.status === 204 || response.status === 201) {
      const text = await response.text().catch(() => '');
      if (!text) return { content: [{ type: 'text', text: '{"success":true}' }], isError: false };
      try {
        const data = JSON.parse(text);
        return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
      } catch {
        return { content: [{ type: 'text', text: text || '{"success":true}' }], isError: false };
      }
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  // ── System ─────────────────────────────────────────────────────────────────

  private async ping(): Promise<ToolResult> {
    return this.request('GET', '/_ping');
  }

  private async getVersion(): Promise<ToolResult> {
    return this.request('GET', '/version');
  }

  private async getSystemInfo(): Promise<ToolResult> {
    return this.request('GET', '/info');
  }

  private async getDataUsage(): Promise<ToolResult> {
    return this.request('GET', '/system/df');
  }

  private async getEvents(args: Record<string, unknown>): Promise<ToolResult> {
    const q = this.buildQuery({
      ...(args.since ? { since: args.since } : {}),
      ...(args.until ? { until: args.until } : {}),
      ...(args.filters ? { filters: args.filters } : {}),
    });
    return this.request('GET', `/events${q}`);
  }

  // ── Containers ─────────────────────────────────────────────────────────────

  private async listContainers(args: Record<string, unknown>): Promise<ToolResult> {
    const q = this.buildQuery({
      ...(args.all !== undefined ? { all: args.all } : {}),
      ...(args.limit !== undefined ? { limit: args.limit } : {}),
      ...(args.size !== undefined ? { size: args.size } : {}),
      ...(args.filters ? { filters: args.filters } : {}),
    });
    return this.request('GET', `/containers/json${q}`);
  }

  private async createContainer(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.image) return { content: [{ type: 'text', text: 'image is required' }], isError: true };
    const q = this.buildQuery({ ...(args.name ? { name: args.name } : {}) });
    const body: Record<string, unknown> = { Image: args.image };
    if (args.cmd) body.Cmd = args.cmd;
    if (args.env) body.Env = args.env;
    if (args.ports) body.ExposedPorts = args.ports;
    if (args.volumes) body.Volumes = args.volumes;
    if (args.host_config) body.HostConfig = args.host_config;
    if (args.labels) body.Labels = args.labels;
    if (args.working_dir) body.WorkingDir = args.working_dir;
    if (args.entrypoint) body.Entrypoint = args.entrypoint;
    return this.request('POST', `/containers/create${q}`, body);
  }

  private async inspectContainer(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    const q = this.buildQuery({ ...(args.size !== undefined ? { size: args.size } : {}) });
    return this.request('GET', `/containers/${args.id}/json${q}`);
  }

  private async listContainerProcesses(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    const q = this.buildQuery({ ...(args.ps_args ? { ps_args: args.ps_args } : {}) });
    return this.request('GET', `/containers/${args.id}/top${q}`);
  }

  private async getContainerLogs(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    const q = this.buildQuery({
      stdout: args.stdout !== false ? true : false,
      stderr: args.stderr !== false ? true : false,
      ...(args.since ? { since: args.since } : {}),
      ...(args.until ? { until: args.until } : {}),
      ...(args.timestamps !== undefined ? { timestamps: args.timestamps } : {}),
      ...(args.tail ? { tail: args.tail } : {}),
    });
    return this.request('GET', `/containers/${args.id}/logs${q}`);
  }

  private async getContainerChanges(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.request('GET', `/containers/${args.id}/changes`);
  }

  private async getContainerStats(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    const q = this.buildQuery({ stream: args.stream === true ? true : false });
    return this.request('GET', `/containers/${args.id}/stats${q}`);
  }

  private async startContainer(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    const q = this.buildQuery({ ...(args.detach_keys ? { detachKeys: args.detach_keys } : {}) });
    return this.request('POST', `/containers/${args.id}/start${q}`);
  }

  private async stopContainer(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    const q = this.buildQuery({ ...(args.t !== undefined ? { t: args.t } : {}) });
    return this.request('POST', `/containers/${args.id}/stop${q}`);
  }

  private async restartContainer(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    const q = this.buildQuery({ ...(args.t !== undefined ? { t: args.t } : {}) });
    return this.request('POST', `/containers/${args.id}/restart${q}`);
  }

  private async killContainer(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    const q = this.buildQuery({ ...(args.signal ? { signal: args.signal } : {}) });
    return this.request('POST', `/containers/${args.id}/kill${q}`);
  }

  private async updateContainer(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.memory !== undefined) body.Memory = args.memory;
    if (args.cpu_shares !== undefined) body.CpuShares = args.cpu_shares;
    if (args.restart_policy) body.RestartPolicy = args.restart_policy;
    return this.request('POST', `/containers/${args.id}/update`, body);
  }

  private async renameContainer(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id || !args.name) {
      return { content: [{ type: 'text', text: 'id and name are required' }], isError: true };
    }
    const q = this.buildQuery({ name: args.name });
    return this.request('POST', `/containers/${args.id}/rename${q}`);
  }

  private async pauseContainer(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.request('POST', `/containers/${args.id}/pause`);
  }

  private async unpauseContainer(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.request('POST', `/containers/${args.id}/unpause`);
  }

  private async waitContainer(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    const q = this.buildQuery({ ...(args.condition ? { condition: args.condition } : {}) });
    return this.request('POST', `/containers/${args.id}/wait${q}`);
  }

  private async deleteContainer(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    const q = this.buildQuery({
      ...(args.v !== undefined ? { v: args.v } : {}),
      ...(args.force !== undefined ? { force: args.force } : {}),
      ...(args.link !== undefined ? { link: args.link } : {}),
    });
    return this.request('DELETE', `/containers/${args.id}${q}`);
  }

  private async pruneContainers(args: Record<string, unknown>): Promise<ToolResult> {
    const q = this.buildQuery({ ...(args.filters ? { filters: args.filters } : {}) });
    return this.request('POST', `/containers/prune${q}`);
  }

  // ── Images ─────────────────────────────────────────────────────────────────

  private async listImages(args: Record<string, unknown>): Promise<ToolResult> {
    const q = this.buildQuery({
      ...(args.all !== undefined ? { all: args.all } : {}),
      ...(args.filters ? { filters: args.filters } : {}),
    });
    return this.request('GET', `/images/json${q}`);
  }

  private async createImage(args: Record<string, unknown>): Promise<ToolResult> {
    const q = this.buildQuery({
      ...(args.from_image ? { fromImage: args.from_image } : {}),
      ...(args.from_src ? { fromSrc: args.from_src } : {}),
      ...(args.repo ? { repo: args.repo } : {}),
      ...(args.tag ? { tag: args.tag } : {}),
    });
    return this.request('POST', `/images/create${q}`);
  }

  private async inspectImage(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    return this.request('GET', `/images/${encodeURIComponent(args.name as string)}/json`);
  }

  private async getImageHistory(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    return this.request('GET', `/images/${encodeURIComponent(args.name as string)}/history`);
  }

  private async pushImage(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    const q = this.buildQuery({ ...(args.tag ? { tag: args.tag } : {}) });
    return this.request('POST', `/images/${encodeURIComponent(args.name as string)}/push${q}`);
  }

  private async tagImage(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name || !args.repo) {
      return { content: [{ type: 'text', text: 'name and repo are required' }], isError: true };
    }
    const q = this.buildQuery({
      repo: args.repo,
      ...(args.tag ? { tag: args.tag } : {}),
    });
    return this.request('POST', `/images/${encodeURIComponent(args.name as string)}/tag${q}`);
  }

  private async deleteImage(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    const q = this.buildQuery({
      ...(args.force !== undefined ? { force: args.force } : {}),
      ...(args.noprune !== undefined ? { noprune: args.noprune } : {}),
    });
    return this.request('DELETE', `/images/${encodeURIComponent(args.name as string)}${q}`);
  }

  private async searchImages(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.term) return { content: [{ type: 'text', text: 'term is required' }], isError: true };
    const q = this.buildQuery({
      term: args.term,
      ...(args.limit !== undefined ? { limit: args.limit } : {}),
      ...(args.filters ? { filters: args.filters } : {}),
    });
    return this.request('GET', `/images/search${q}`);
  }

  private async pruneImages(args: Record<string, unknown>): Promise<ToolResult> {
    const q = this.buildQuery({ ...(args.filters ? { filters: args.filters } : {}) });
    return this.request('POST', `/images/prune${q}`);
  }

  private async buildImage(args: Record<string, unknown>): Promise<ToolResult> {
    const q = this.buildQuery({
      ...(args.dockerfile ? { dockerfile: args.dockerfile } : {}),
      ...(args.t ? { t: args.t } : {}),
      ...(args.remote ? { remote: args.remote } : {}),
      ...(args.no_cache !== undefined ? { nocache: args.no_cache } : {}),
      ...(args.pull !== undefined ? { pull: args.pull } : {}),
      ...(args.buildargs ? { buildargs: args.buildargs } : {}),
      ...(args.labels ? { labels: args.labels } : {}),
    });
    return this.request('POST', `/build${q}`);
  }

  // ── Networks ───────────────────────────────────────────────────────────────

  private async listNetworks(args: Record<string, unknown>): Promise<ToolResult> {
    const q = this.buildQuery({ ...(args.filters ? { filters: args.filters } : {}) });
    return this.request('GET', `/networks${q}`);
  }

  private async createNetwork(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    const body: Record<string, unknown> = { Name: args.name };
    if (args.driver) body.Driver = args.driver;
    if (args.internal !== undefined) body.Internal = args.internal;
    if (args.attachable !== undefined) body.Attachable = args.attachable;
    if (args.enable_ipv6 !== undefined) body.EnableIPv6 = args.enable_ipv6;
    if (args.labels) body.Labels = args.labels;
    if (args.options) body.Options = args.options;
    return this.request('POST', '/networks/create', body);
  }

  private async inspectNetwork(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    const q = this.buildQuery({ ...(args.verbose !== undefined ? { verbose: args.verbose } : {}) });
    return this.request('GET', `/networks/${args.id}${q}`);
  }

  private async deleteNetwork(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.request('DELETE', `/networks/${args.id}`);
  }

  private async connectContainerToNetwork(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id || !args.container) {
      return { content: [{ type: 'text', text: 'id and container are required' }], isError: true };
    }
    const body: Record<string, unknown> = { Container: args.container };
    if (args.aliases) body.EndpointConfig = { Aliases: args.aliases };
    return this.request('POST', `/networks/${args.id}/connect`, body);
  }

  private async disconnectContainerFromNetwork(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id || !args.container) {
      return { content: [{ type: 'text', text: 'id and container are required' }], isError: true };
    }
    const body: Record<string, unknown> = { Container: args.container };
    if (args.force !== undefined) body.Force = args.force;
    return this.request('POST', `/networks/${args.id}/disconnect`, body);
  }

  private async pruneNetworks(args: Record<string, unknown>): Promise<ToolResult> {
    const q = this.buildQuery({ ...(args.filters ? { filters: args.filters } : {}) });
    return this.request('POST', `/networks/prune${q}`);
  }

  // ── Volumes ────────────────────────────────────────────────────────────────

  private async listVolumes(args: Record<string, unknown>): Promise<ToolResult> {
    const q = this.buildQuery({ ...(args.filters ? { filters: args.filters } : {}) });
    return this.request('GET', `/volumes${q}`);
  }

  private async createVolume(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {};
    if (args.name) body.Name = args.name;
    if (args.driver) body.Driver = args.driver;
    if (args.driver_opts) body.DriverOpts = args.driver_opts;
    if (args.labels) body.Labels = args.labels;
    return this.request('POST', '/volumes/create', body);
  }

  private async inspectVolume(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    return this.request('GET', `/volumes/${args.name}`);
  }

  private async deleteVolume(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name) return { content: [{ type: 'text', text: 'name is required' }], isError: true };
    const q = this.buildQuery({ ...(args.force !== undefined ? { force: args.force } : {}) });
    return this.request('DELETE', `/volumes/${args.name}${q}`);
  }

  private async pruneVolumes(args: Record<string, unknown>): Promise<ToolResult> {
    const q = this.buildQuery({ ...(args.filters ? { filters: args.filters } : {}) });
    return this.request('POST', `/volumes/prune${q}`);
  }

  // ── Exec ───────────────────────────────────────────────────────────────────

  private async createExec(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id || !args.cmd) {
      return { content: [{ type: 'text', text: 'id and cmd are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      Cmd: args.cmd,
      AttachStdout: args.attach_stdout !== false,
      AttachStderr: args.attach_stderr !== false,
    };
    if (args.attach_stdin !== undefined) body.AttachStdin = args.attach_stdin;
    if (args.tty !== undefined) body.Tty = args.tty;
    if (args.env) body.Env = args.env;
    if (args.working_dir) body.WorkingDir = args.working_dir;
    if (args.user) body.User = args.user;
    return this.request('POST', `/containers/${args.id}/exec`, body);
  }

  private async startExec(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    const body: Record<string, unknown> = {};
    if (args.detach !== undefined) body.Detach = args.detach;
    if (args.tty !== undefined) body.Tty = args.tty;
    return this.request('POST', `/exec/${args.id}/start`, body);
  }

  private async inspectExec(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.request('GET', `/exec/${args.id}/json`);
  }

  // ── Swarm ──────────────────────────────────────────────────────────────────

  private async inspectSwarm(): Promise<ToolResult> {
    return this.request('GET', '/swarm');
  }

  private async initSwarm(args: Record<string, unknown>): Promise<ToolResult> {
    const body: Record<string, unknown> = {};
    if (args.advertise_addr) body.AdvertiseAddr = args.advertise_addr;
    if (args.listen_addr) body.ListenAddr = args.listen_addr;
    if (args.force_new_cluster !== undefined) body.ForceNewCluster = args.force_new_cluster;
    return this.request('POST', '/swarm/init', body);
  }

  private async joinSwarm(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.remote_addrs || !args.join_token) {
      return { content: [{ type: 'text', text: 'remote_addrs and join_token are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      RemoteAddrs: args.remote_addrs,
      JoinToken: args.join_token,
    };
    if (args.advertise_addr) body.AdvertiseAddr = args.advertise_addr;
    if (args.listen_addr) body.ListenAddr = args.listen_addr;
    return this.request('POST', '/swarm/join', body);
  }

  private async leaveSwarm(args: Record<string, unknown>): Promise<ToolResult> {
    const q = this.buildQuery({ ...(args.force !== undefined ? { force: args.force } : {}) });
    return this.request('POST', `/swarm/leave${q}`);
  }

  private async updateSwarm(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.version === undefined) {
      return { content: [{ type: 'text', text: 'version is required' }], isError: true };
    }
    const q = this.buildQuery({
      version: args.version,
      ...(args.rotate_worker_token !== undefined ? { rotateWorkerToken: args.rotate_worker_token } : {}),
      ...(args.rotate_manager_token !== undefined ? { rotateManagerToken: args.rotate_manager_token } : {}),
    });
    return this.request('POST', `/swarm/update${q}`, (args.spec as Record<string, unknown>) || {});
  }

  private async getSwarmUnlockKey(): Promise<ToolResult> {
    return this.request('GET', '/swarm/unlockkey');
  }

  private async unlockSwarm(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.unlock_key) return { content: [{ type: 'text', text: 'unlock_key is required' }], isError: true };
    return this.request('POST', '/swarm/unlock', { UnlockKey: args.unlock_key });
  }

  // ── Services ───────────────────────────────────────────────────────────────

  private async listServices(args: Record<string, unknown>): Promise<ToolResult> {
    const q = this.buildQuery({ ...(args.filters ? { filters: args.filters } : {}) });
    return this.request('GET', `/services${q}`);
  }

  private async createService(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name || !args.image) {
      return { content: [{ type: 'text', text: 'name and image are required' }], isError: true };
    }
    const taskSpec: Record<string, unknown> = {
      ContainerSpec: { Image: args.image } as Record<string, unknown>,
    };
    if (args.cmd) (taskSpec.ContainerSpec as Record<string, unknown>).Command = args.cmd;
    if (args.env) (taskSpec.ContainerSpec as Record<string, unknown>).Env = args.env;
    if (args.constraints) taskSpec.Placement = { Constraints: args.constraints };

    const body: Record<string, unknown> = {
      Name: args.name,
      TaskTemplate: taskSpec,
    };
    if (args.replicas !== undefined) {
      body.Mode = { Replicated: { Replicas: args.replicas } };
    }
    if (args.ports) body.EndpointSpec = { Ports: args.ports };
    if (args.labels) body.Labels = args.labels;
    return this.request('POST', '/services/create', body);
  }

  private async inspectService(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.request('GET', `/services/${args.id}`);
  }

  private async getServiceLogs(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    const q = this.buildQuery({
      stdout: args.stdout !== false ? true : false,
      stderr: args.stderr !== false ? true : false,
      ...(args.since ? { since: args.since } : {}),
      ...(args.timestamps !== undefined ? { timestamps: args.timestamps } : {}),
      ...(args.tail ? { tail: args.tail } : {}),
    });
    return this.request('GET', `/services/${args.id}/logs${q}`);
  }

  private async updateService(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id || args.version === undefined || !args.spec) {
      return { content: [{ type: 'text', text: 'id, version, and spec are required' }], isError: true };
    }
    const q = this.buildQuery({ version: args.version });
    return this.request('POST', `/services/${args.id}/update${q}`, args.spec as Record<string, unknown>);
  }

  private async deleteService(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.request('DELETE', `/services/${args.id}`);
  }

  // ── Tasks ──────────────────────────────────────────────────────────────────

  private async listTasks(args: Record<string, unknown>): Promise<ToolResult> {
    const q = this.buildQuery({ ...(args.filters ? { filters: args.filters } : {}) });
    return this.request('GET', `/tasks${q}`);
  }

  private async inspectTask(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.request('GET', `/tasks/${args.id}`);
  }

  // ── Nodes ──────────────────────────────────────────────────────────────────

  private async listNodes(args: Record<string, unknown>): Promise<ToolResult> {
    const q = this.buildQuery({ ...(args.filters ? { filters: args.filters } : {}) });
    return this.request('GET', `/nodes${q}`);
  }

  private async inspectNode(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.request('GET', `/nodes/${args.id}`);
  }

  private async updateNode(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id || args.version === undefined || !args.spec) {
      return { content: [{ type: 'text', text: 'id, version, and spec are required' }], isError: true };
    }
    const q = this.buildQuery({ version: args.version });
    return this.request('POST', `/nodes/${args.id}/update${q}`, args.spec as Record<string, unknown>);
  }

  private async deleteNode(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    const q = this.buildQuery({ ...(args.force !== undefined ? { force: args.force } : {}) });
    return this.request('DELETE', `/nodes/${args.id}${q}`);
  }

  // ── Secrets ────────────────────────────────────────────────────────────────

  private async listSecrets(args: Record<string, unknown>): Promise<ToolResult> {
    const q = this.buildQuery({ ...(args.filters ? { filters: args.filters } : {}) });
    return this.request('GET', `/secrets${q}`);
  }

  private async createSecret(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name || !args.data) {
      return { content: [{ type: 'text', text: 'name and data are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      Name: args.name,
      Data: args.data,
    };
    if (args.labels) body.Labels = args.labels;
    return this.request('POST', '/secrets/create', body);
  }

  private async inspectSecret(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.request('GET', `/secrets/${args.id}`);
  }

  private async deleteSecret(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.request('DELETE', `/secrets/${args.id}`);
  }

  // ── Configs ────────────────────────────────────────────────────────────────

  private async listConfigs(args: Record<string, unknown>): Promise<ToolResult> {
    const q = this.buildQuery({ ...(args.filters ? { filters: args.filters } : {}) });
    return this.request('GET', `/configs${q}`);
  }

  private async createConfig(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.name || !args.data) {
      return { content: [{ type: 'text', text: 'name and data are required' }], isError: true };
    }
    const body: Record<string, unknown> = {
      Name: args.name,
      Data: args.data,
    };
    if (args.labels) body.Labels = args.labels;
    return this.request('POST', '/configs/create', body);
  }

  private async inspectConfig(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.request('GET', `/configs/${args.id}`);
  }

  private async deleteConfig(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    return this.request('DELETE', `/configs/${args.id}`);
  }
}
