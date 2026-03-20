/**
 * @epic-ai/core — Persona Manager
 * Register, switch, and manage personas for voice routing.
 * Built on the Epic AI Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

import type { PersonaConfig, ConversationContext } from '../types/index.js';
import { SystemPromptBuilder } from './SystemPromptBuilder.js';

export class PersonaManager {
  private readonly personas = new Map<string, PersonaConfig>();
  private activeName: string | null = null;

  /**
   * Register a persona. Chainable.
   */
  register(config: PersonaConfig): this {
    this.personas.set(config.name, config);
    if (this.activeName === null) {
      this.activeName = config.name;
    }
    return this;
  }

  /**
   * Switch to a registered persona. Chainable.
   * Throws if the persona is not registered.
   */
  switch(name: string): this {
    if (!this.personas.has(name)) {
      throw new Error(`Persona "${name}" is not registered. Available: ${this.list().map(p => p.name).join(', ')}`);
    }
    this.activeName = name;
    return this;
  }

  /**
   * Get the active persona configuration.
   * Throws if no persona is registered.
   */
  active(): PersonaConfig {
    if (!this.activeName) {
      throw new Error('No persona registered');
    }
    const persona = this.personas.get(this.activeName);
    if (!persona) {
      throw new Error(`Active persona "${this.activeName}" not found`);
    }
    return persona;
  }

  /**
   * List all registered personas.
   */
  list(): PersonaConfig[] {
    return Array.from(this.personas.values());
  }

  /**
   * Build a system prompt for the active persona with the given context.
   */
  buildSystemPrompt(context?: ConversationContext): string {
    return SystemPromptBuilder.build(this.active(), context);
  }

  /**
   * Check if a persona is registered.
   */
  has(name: string): boolean {
    return this.personas.has(name);
  }

  /**
   * Number of registered personas.
   */
  get size(): number {
    return this.personas.size;
  }
}
