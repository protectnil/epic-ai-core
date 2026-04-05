/**
 * @epicai/legion — Artifact Verifier
 * Verifies adapter package integrity via SHA-256 digest and
 * Sigstore/Cosign signature. Checks SLSA provenance attestations.
 * Built on the Epic AI Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createLogger } from '../logger.js';

const log = createLogger('trust.artifact-verifier');

// =============================================================================
// Types
// =============================================================================

export interface VerificationResult {
  valid: boolean;
  artifactDigest: string;
  signerIdentity?: string;
  slsaLevel?: 'SLSA_L1' | 'SLSA_L2' | 'SLSA_L3';
  reason?: string;
}

export interface ArtifactVerifierConfig {
  verifyDigests: boolean;
  enforceSLSA?: 'SLSA_L1' | 'SLSA_L2' | 'SLSA_L3';
}

// Verification result cache: digest → result (immutable, never cleared)
const verificationCache = new Map<string, VerificationResult>();

// =============================================================================
// Verifier
// =============================================================================

export class ArtifactVerifier {
  constructor(private readonly config: ArtifactVerifierConfig) {}

  /**
   * Verify an adapter's installed files against the catalog entry.
   * Returns cached result if the same digest was previously verified.
   */
  async verify(
    adapterName: string,
    installedPath: string,
    expectedDigest?: string,
    cosignBundle?: string,
  ): Promise<VerificationResult> {
    // Compute digest of installed file
    const fileContent = await readFile(installedPath);
    const actualDigest = `sha256:${createHash('sha256').update(fileContent).digest('hex')}`;

    // Check cache
    const cached = verificationCache.get(actualDigest);
    if (cached) return cached;

    // Digest verification
    if (this.config.verifyDigests && expectedDigest) {
      if (actualDigest !== expectedDigest) {
        const result: VerificationResult = {
          valid: false,
          artifactDigest: actualDigest,
          reason: `Digest mismatch: expected ${expectedDigest}, got ${actualDigest}`,
        };
        log.error('artifact digest mismatch', { adapterName, expected: expectedDigest, actual: actualDigest });
        // Do NOT cache failures — file may be corrected
        return result;
      }
    }

    // Sigstore verification (if bundle provided)
    let signerIdentity: string | undefined;
    if (cosignBundle) {
      try {
        signerIdentity = await this.verifySigstore(fileContent, cosignBundle);
      } catch (err) {
        const result: VerificationResult = {
          valid: false,
          artifactDigest: actualDigest,
          reason: `Sigstore verification failed: ${err instanceof Error ? err.message : String(err)}`,
        };
        log.error('sigstore verification failed', { adapterName, error: String(err) });
        return result;
      }
    }

    // SLSA provenance check (extracted from cosign bundle DSSE envelope)
    let slsaLevel: 'SLSA_L1' | 'SLSA_L2' | 'SLSA_L3' | undefined;
    if (cosignBundle && this.config.enforceSLSA) {
      slsaLevel = await this.checkSLSA(cosignBundle, actualDigest);
      if (!slsaLevel) {
        const result: VerificationResult = {
          valid: false,
          artifactDigest: actualDigest,
          signerIdentity,
          reason: `SLSA provenance not found or below required level (${this.config.enforceSLSA})`,
        };
        log.error('SLSA provenance check failed', { adapterName, required: this.config.enforceSLSA });
        return result;
      }

      // Verify level meets minimum
      const levels = ['SLSA_L1', 'SLSA_L2', 'SLSA_L3'] as const;
      const requiredIdx = levels.indexOf(this.config.enforceSLSA);
      const actualIdx = levels.indexOf(slsaLevel);
      if (actualIdx < requiredIdx) {
        const result: VerificationResult = {
          valid: false,
          artifactDigest: actualDigest,
          signerIdentity,
          slsaLevel,
          reason: `SLSA level ${slsaLevel} below required ${this.config.enforceSLSA}`,
        };
        return result;
      }
    }

    const result: VerificationResult = {
      valid: true,
      artifactDigest: actualDigest,
      signerIdentity,
      slsaLevel,
    };

    // Cache successful verifications (digest → result is immutable)
    verificationCache.set(actualDigest, result);
    log.info('artifact verified', { adapterName, digest: actualDigest, signer: signerIdentity, slsa: slsaLevel });

    return result;
  }

  // ---------------------------------------------------------------------------
  // Sigstore
  // ---------------------------------------------------------------------------

  private async verifySigstore(content: Buffer, bundleB64: string): Promise<string> {
    try {
      // @ts-expect-error — sigstore is an optional runtime dependency
      const { verify } = await import('sigstore');
      const bundleJson = Buffer.from(bundleB64, 'base64').toString('utf-8');
      const bundle = JSON.parse(bundleJson);

      await verify(bundle, content);

      // Best-effort signer identity extraction from certificate.
      // This is heuristic — regex on decoded cert text, not ASN.1 parsing.
      // Reliable identity extraction requires a proper x509 library.
      const cert = bundle?.verificationMaterial?.x509CertificateChain?.certificates?.[0]?.rawBytes;
      if (cert) {
        try {
          const certPem = Buffer.from(cert, 'base64').toString('utf-8');
          const emailMatch = certPem.match(/emailAddress=([^\s,]+)/);
          const uriMatch = certPem.match(/URI:([^\s,]+)/);
          return emailMatch?.[1] || uriMatch?.[1] || 'sigstore-verified (identity not extractable)';
        } catch {
          return 'sigstore-verified (identity not extractable)';
        }
      }

      return 'sigstore-verified (no certificate in bundle)';
    } catch (err) {
      throw new Error(`Sigstore verify: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // ---------------------------------------------------------------------------
  // SLSA
  // ---------------------------------------------------------------------------

  private async checkSLSA(bundleB64: string, expectedDigest: string): Promise<'SLSA_L1' | 'SLSA_L2' | 'SLSA_L3' | undefined> {
    try {
      const bundleJson = Buffer.from(bundleB64, 'base64').toString('utf-8');
      const bundle = JSON.parse(bundleJson);

      // DSSE envelope is in the bundle
      const dsseEnvelope = bundle?.dsseEnvelope;
      if (!dsseEnvelope) return undefined;

      const payloadB64 = dsseEnvelope.payload;
      if (!payloadB64) return undefined;

      const payload = JSON.parse(Buffer.from(payloadB64, 'base64').toString('utf-8'));

      // Check predicate type
      if (payload.predicateType !== 'https://slsa.dev/provenance/v1' &&
          payload.predicateType !== 'https://slsa.dev/provenance/v0.2') {
        return undefined;
      }

      // Verify subject digest matches
      const subjects = payload.subject ?? [];
      const digestMatch = subjects.some((s: { digest?: { sha256?: string } }) => {
        const sha = s.digest?.sha256;
        return sha && expectedDigest === `sha256:${sha}`;
      });

      if (!digestMatch) {
        log.warn('SLSA subject digest does not match artifact', { expectedDigest });
        return undefined;
      }

      // Determine SLSA level from builder
      const builderId = payload.predicate?.builder?.id ?? '';
      if (builderId.includes('github.com/slsa-framework/slsa-github-generator')) {
        return 'SLSA_L3';
      }
      if (builderId.includes('github.com')) {
        return 'SLSA_L2';
      }
      return 'SLSA_L1';
    } catch {
      return undefined;
    }
  }
}
