/**
 * @epicai/legion — Auth Middleware
 * Framework-agnostic identity handler. Extracts and verifies identity
 * from a Node.js IncomingMessage. NOT Express middleware.
 * Built on the Epic AI Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import type { IncomingMessage } from 'node:http';
import type { TLSSocket } from 'node:tls';
import { createLogger } from '../logger.js';
import type { TenantContext, AuthConfig, JWTAuthConfig, MTLSConfig } from './types.js';
import { createDevContext, contextFromJWT, contextFromCert } from './TenantContext.js';

const log = createLogger('trust.auth');

export class AuthError extends Error {
  constructor(message: string, public readonly statusCode: number = 401) {
    super(message);
    this.name = 'AuthError';
  }
}

export class AuthMiddleware {
  private jwksGetKey: ((header: unknown) => Promise<unknown>) | null = null;

  constructor(private readonly config: AuthConfig | null) {}

  /**
   * Authenticate a request. Returns TenantContext on success.
   * Throws AuthError on failure.
   *
   * In development mode (config is null): returns dev context with warning.
   * In production mode (config is set): validates credentials strictly.
   */
  async authenticate(req: IncomingMessage): Promise<TenantContext> {
    if (!this.config) {
      log.warn('no auth configured — using dev context');
      return createDevContext();
    }

    if (this.config.type === 'jwt') {
      return this.authenticateJWT(req, this.config);
    }

    if (this.config.type === 'mtls') {
      return this.authenticateMTLS(req, this.config);
    }

    throw new AuthError('Unknown auth type');
  }

  // ---------------------------------------------------------------------------
  // JWT
  // ---------------------------------------------------------------------------

  private async authenticateJWT(req: IncomingMessage, config: JWTAuthConfig): Promise<TenantContext> {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthError('Missing or invalid Authorization header');
    }

    const token = authHeader.slice(7);

    try {
      const { jwtVerify, createRemoteJWKSet } = await import('jose');

      if (!this.jwksGetKey) {
        const jwksUrl = new URL(config.jwksUri);
        this.jwksGetKey = createRemoteJWKSet(jwksUrl) as (header: unknown) => Promise<unknown>;
      }

      const { payload } = await jwtVerify(token, this.jwksGetKey as Parameters<typeof jwtVerify>[1], {
        issuer: config.issuer,
        audience: config.audience,
        clockTolerance: `${config.clockSkewSeconds}s`,
      });

      return contextFromJWT(payload as Record<string, unknown>);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'JWT verification failed';
      log.warn('JWT auth failed', { error: message });
      throw new AuthError(message);
    }
  }

  // ---------------------------------------------------------------------------
  // mTLS
  // ---------------------------------------------------------------------------

  private authenticateMTLS(req: IncomingMessage, _config: MTLSConfig): TenantContext {
    const socket = req.socket as TLSSocket;

    if (!socket.authorized) {
      throw new AuthError('Client certificate not authorized', 403);
    }

    const cert = socket.getPeerCertificate();
    if (!cert || !cert.subject) {
      throw new AuthError('No client certificate presented');
    }

    return contextFromCert(cert as { subject: { CN?: string }; subjectaltname?: string });
  }
}
