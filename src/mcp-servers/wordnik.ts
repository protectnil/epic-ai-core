/**
 * Wordnik MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Base URL: https://api.wordnik.com/v4
// Auth: api_key query parameter on every request
// Docs: http://developer.wordnik.com/
// Spec: https://api.apis.guru/v2/specs/wordnik.com/4.0/openapi.json
// Description: World's biggest online English dictionary — definitions, examples,
//   pronunciations, etymology, frequency, related words, and word of the day.
// Rate limits: Varies by API key tier; free keys have limited daily requests.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface WordnikConfig {
  apiKey: string;
  baseUrl?: string;
}

export class WordnikMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: WordnikConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.wordnik.com/v4';
  }

  static catalog() {
    return {
      name: 'wordnik',
      displayName: 'Wordnik',
      version: '1.0.0',
      category: 'data',
      keywords: [
        'wordnik', 'dictionary', 'english', 'definition', 'definitions', 'word',
        'etymology', 'pronunciation', 'hyphenation', 'syllable', 'example',
        'related words', 'synonym', 'antonym', 'rhyme', 'frequency', 'scrabble',
        'word of the day', 'random word', 'reverse dictionary', 'thesaurus',
        'part of speech', 'phrases', 'audio', 'nlp', 'linguistic',
      ],
      toolNames: [
        'get_definitions',
        'get_examples',
        'get_top_example',
        'get_related_words',
        'get_pronunciations',
        'get_hyphenation',
        'get_frequency',
        'get_phrases',
        'get_etymologies',
        'get_audio',
        'get_scrabble_score',
        'get_random_word',
        'get_random_words',
        'search_words',
        'reverse_dictionary',
        'get_word_of_the_day',
      ],
      description: 'Wordnik dictionary API: definitions, examples, pronunciations, etymology, related words, frequency statistics, hyphenation, phrases, Scrabble scores, random words, word search, and word of the day.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Single word lookups ────────────────────────────────────────────────
      {
        name: 'get_definitions',
        description: 'Get definitions for a word from one or more dictionaries (AHD-5, Wiktionary, Webster, Century, WordNet). Returns part of speech, source, and definition text.',
        inputSchema: {
          type: 'object',
          properties: {
            word: {
              type: 'string',
              description: 'The word to look up',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of definitions to return (default: 200)',
            },
            partOfSpeech: {
              type: 'string',
              description: 'Filter by part of speech: noun, verb, adjective, adverb, etc.',
            },
            sourceDictionaries: {
              type: 'string',
              description: 'Comma-separated list of dictionaries: ahd-5, wiktionary, webster, century, wordnet, or all',
            },
            useCanonical: {
              type: 'boolean',
              description: 'If true, look up the canonical/root form of the word (e.g. "cats" → "cat")',
            },
          },
          required: ['word'],
        },
      },
      {
        name: 'get_examples',
        description: 'Get example sentences demonstrating real-world usage of a word, sourced from published text.',
        inputSchema: {
          type: 'object',
          properties: {
            word: {
              type: 'string',
              description: 'The word to find examples for',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of examples to return (default: 5)',
            },
            skip: {
              type: 'number',
              description: 'Number of results to skip for pagination',
            },
            useCanonical: {
              type: 'boolean',
              description: 'If true, use the canonical form of the word',
            },
          },
          required: ['word'],
        },
      },
      {
        name: 'get_top_example',
        description: 'Get the single best/top example sentence for a word.',
        inputSchema: {
          type: 'object',
          properties: {
            word: {
              type: 'string',
              description: 'The word to get the top example for',
            },
            useCanonical: {
              type: 'boolean',
              description: 'If true, use the canonical form of the word',
            },
          },
          required: ['word'],
        },
      },
      {
        name: 'get_related_words',
        description: 'Get words related to a given word — synonyms, antonyms, cross-references, hypernyms, hyponyms, and other relationship types.',
        inputSchema: {
          type: 'object',
          properties: {
            word: {
              type: 'string',
              description: 'The word to find related words for',
            },
            relationshipTypes: {
              type: 'string',
              description: 'Comma-separated relationship types: synonym, antonym, cross-reference, related-word, rhyme, form, etymologically-related-term, hypernym, hyponym, variant, verb-form, same-context, reverse-relation',
            },
            limitPerRelationshipType: {
              type: 'number',
              description: 'Maximum number of words per relationship type (default: 10)',
            },
            useCanonical: {
              type: 'boolean',
              description: 'If true, use the canonical form of the word',
            },
          },
          required: ['word'],
        },
      },
      {
        name: 'get_pronunciations',
        description: 'Get text pronunciations for a word — IPA, ahd, respell, and other notation formats.',
        inputSchema: {
          type: 'object',
          properties: {
            word: {
              type: 'string',
              description: 'The word to get pronunciations for',
            },
            typeFormat: {
              type: 'string',
              description: 'Pronunciation notation format: ahd, arpabet, gcide-diacritical, IPA, respell, or string',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results to return (default: 50)',
            },
            useCanonical: {
              type: 'boolean',
              description: 'If true, use the canonical form of the word',
            },
          },
          required: ['word'],
        },
      },
      {
        name: 'get_hyphenation',
        description: 'Get syllable hyphenation breakdown for a word, including stress indicators.',
        inputSchema: {
          type: 'object',
          properties: {
            word: {
              type: 'string',
              description: 'The word to hyphenate',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results (default: 50)',
            },
            useCanonical: {
              type: 'boolean',
              description: 'If true, use the canonical form of the word',
            },
          },
          required: ['word'],
        },
      },
      {
        name: 'get_frequency',
        description: 'Get frequency statistics showing how often a word appears in published text, broken down by year.',
        inputSchema: {
          type: 'object',
          properties: {
            word: {
              type: 'string',
              description: 'The word to get frequency data for',
            },
            startYear: {
              type: 'number',
              description: 'Starting year for frequency data (default: 1800)',
            },
            endYear: {
              type: 'number',
              description: 'Ending year for frequency data (default: 2012)',
            },
            useCanonical: {
              type: 'boolean',
              description: 'If true, use the canonical form of the word',
            },
          },
          required: ['word'],
        },
      },
      {
        name: 'get_phrases',
        description: 'Get bi-gram phrases (two-word collocations) that commonly contain the given word.',
        inputSchema: {
          type: 'object',
          properties: {
            word: {
              type: 'string',
              description: 'The word to find common phrases for',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of phrases (default: 5)',
            },
            wlmi: {
              type: 'number',
              description: 'Minimum weighted lexical mutual information score (default: 0)',
            },
            useCanonical: {
              type: 'boolean',
              description: 'If true, use the canonical form of the word',
            },
          },
          required: ['word'],
        },
      },
      {
        name: 'get_etymologies',
        description: 'Get etymological history (word origin) for a word — language of origin, historical form changes, and evolution.',
        inputSchema: {
          type: 'object',
          properties: {
            word: {
              type: 'string',
              description: 'The word to get etymology for',
            },
            useCanonical: {
              type: 'boolean',
              description: 'If true, use the canonical form of the word',
            },
          },
          required: ['word'],
        },
      },
      {
        name: 'get_audio',
        description: 'Get audio pronunciation metadata for a word — returns time-expiring file URLs for mp3 audio files from the American Heritage Dictionary.',
        inputSchema: {
          type: 'object',
          properties: {
            word: {
              type: 'string',
              description: 'The word to get audio for',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of audio results (default: 50)',
            },
            useCanonical: {
              type: 'boolean',
              description: 'If true, use the canonical form of the word',
            },
          },
          required: ['word'],
        },
      },
      {
        name: 'get_scrabble_score',
        description: 'Get the Scrabble score for a word based on official letter point values.',
        inputSchema: {
          type: 'object',
          properties: {
            word: {
              type: 'string',
              description: 'The word to score',
            },
          },
          required: ['word'],
        },
      },
      // ── Words collection ───────────────────────────────────────────────────
      {
        name: 'get_random_word',
        description: 'Get a single random English word, with optional filters for length, corpus frequency, and part of speech.',
        inputSchema: {
          type: 'object',
          properties: {
            minCorpusCount: {
              type: 'number',
              description: 'Minimum corpus occurrence count (higher = more common word)',
            },
            maxCorpusCount: {
              type: 'number',
              description: 'Maximum corpus occurrence count (lower = more obscure word)',
            },
            minLength: {
              type: 'number',
              description: 'Minimum word length in characters',
            },
            maxLength: {
              type: 'number',
              description: 'Maximum word length in characters',
            },
            includePartOfSpeech: {
              type: 'string',
              description: 'Comma-separated parts of speech to include (e.g. noun,verb)',
            },
            excludePartOfSpeech: {
              type: 'string',
              description: 'Comma-separated parts of speech to exclude',
            },
            hasDictionaryDef: {
              type: 'boolean',
              description: 'If true, only return words that have dictionary definitions',
            },
          },
        },
      },
      {
        name: 'get_random_words',
        description: 'Get multiple random English words at once, with optional filters for length, frequency, and part of speech.',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Number of random words to return (default: 10, max: 100)',
            },
            minCorpusCount: {
              type: 'number',
              description: 'Minimum corpus occurrence count',
            },
            maxCorpusCount: {
              type: 'number',
              description: 'Maximum corpus occurrence count',
            },
            minLength: {
              type: 'number',
              description: 'Minimum word length in characters',
            },
            maxLength: {
              type: 'number',
              description: 'Maximum word length in characters',
            },
            includePartOfSpeech: {
              type: 'string',
              description: 'Comma-separated parts of speech to include',
            },
            hasDictionaryDef: {
              type: 'boolean',
              description: 'If true, only return words that have dictionary definitions',
            },
          },
        },
      },
      {
        name: 'search_words',
        description: 'Search for English words matching a query pattern — supports prefix, suffix, contains, and wildcard matching.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query string (supports * wildcard)',
            },
            caseSensitive: {
              type: 'boolean',
              description: 'Whether the search is case sensitive (default: true)',
            },
            includePartOfSpeech: {
              type: 'string',
              description: 'Comma-separated parts of speech to include in results',
            },
            excludePartOfSpeech: {
              type: 'string',
              description: 'Comma-separated parts of speech to exclude',
            },
            minCorpusCount: {
              type: 'number',
              description: 'Minimum corpus count for results',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results (default: 10)',
            },
            skip: {
              type: 'number',
              description: 'Number of results to skip for pagination',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'reverse_dictionary',
        description: 'Find words by their definition — provide a description or meaning and get matching words back (reverse dictionary / thesaurus lookup).',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Definition or description to search for (e.g. "a large grey mammal with a trunk")',
            },
            findSenseForWord: {
              type: 'string',
              description: 'Expand results for a specific sense of a given word',
            },
            includeSourceDictionaries: {
              type: 'string',
              description: 'Comma-separated source dictionaries to include',
            },
            excludeSourceDictionaries: {
              type: 'string',
              description: 'Comma-separated source dictionaries to exclude',
            },
            includePartOfSpeech: {
              type: 'string',
              description: 'Comma-separated parts of speech to include',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results (default: 10)',
            },
            skip: {
              type: 'number',
              description: 'Number of results to skip',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_word_of_the_day',
        description: 'Get the Wordnik word of the day — includes the word, definitions, examples, and publication date.',
        inputSchema: {
          type: 'object',
          properties: {
            date: {
              type: 'string',
              description: 'Date in YYYY-MM-DD format to get the word of that day (default: today)',
            },
          },
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_definitions':      return this.getDefinitions(args);
        case 'get_examples':         return this.getExamples(args);
        case 'get_top_example':      return this.getTopExample(args);
        case 'get_related_words':    return this.getRelatedWords(args);
        case 'get_pronunciations':   return this.getPronunciations(args);
        case 'get_hyphenation':      return this.getHyphenation(args);
        case 'get_frequency':        return this.getFrequency(args);
        case 'get_phrases':          return this.getPhrases(args);
        case 'get_etymologies':      return this.getEtymologies(args);
        case 'get_audio':            return this.getAudio(args);
        case 'get_scrabble_score':   return this.getScrabbleScore(args);
        case 'get_random_word':      return this.getRandomWord(args);
        case 'get_random_words':     return this.getRandomWords(args);
        case 'search_words':         return this.searchWords(args);
        case 'reverse_dictionary':   return this.reverseDictionary(args);
        case 'get_word_of_the_day':  return this.getWordOfTheDay(args);
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


  private async get(path: string, query?: Record<string, string | number | boolean | undefined>): Promise<ToolResult> {
    const url = new URL(`${this.baseUrl}${path}`);
    url.searchParams.set('api_key', this.apiKey);
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v !== undefined) url.searchParams.set(k, String(v));
      }
    }
    const response = await this.fetchWithRetry(url.toString(), {
      headers: { 'Accept': 'application/json' },
    });
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      return {
        content: [{ type: 'text', text: `API error ${response.status} ${response.statusText}: ${text.slice(0, 500)}` }],
        isError: true,
      };
    }
    const data = await response.json() as unknown;
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  // ── Word methods ───────────────────────────────────────────────────────────

  private async getDefinitions(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.word) return { content: [{ type: 'text', text: 'word is required' }], isError: true };
    return this.get(`/word.json/${encodeURIComponent(args.word as string)}/definitions`, {
      limit:                args.limit as number,
      partOfSpeech:         args.partOfSpeech as string,
      sourceDictionaries:   args.sourceDictionaries as string,
      useCanonical:         args.useCanonical as boolean,
    });
  }

  private async getExamples(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.word) return { content: [{ type: 'text', text: 'word is required' }], isError: true };
    return this.get(`/word.json/${encodeURIComponent(args.word as string)}/examples`, {
      limit:        args.limit as number,
      skip:         args.skip as number,
      useCanonical: args.useCanonical as boolean,
    });
  }

  private async getTopExample(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.word) return { content: [{ type: 'text', text: 'word is required' }], isError: true };
    return this.get(`/word.json/${encodeURIComponent(args.word as string)}/topExample`, {
      useCanonical: args.useCanonical as boolean,
    });
  }

  private async getRelatedWords(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.word) return { content: [{ type: 'text', text: 'word is required' }], isError: true };
    return this.get(`/word.json/${encodeURIComponent(args.word as string)}/relatedWords`, {
      relationshipTypes:          args.relationshipTypes as string,
      limitPerRelationshipType:   args.limitPerRelationshipType as number,
      useCanonical:               args.useCanonical as boolean,
    });
  }

  private async getPronunciations(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.word) return { content: [{ type: 'text', text: 'word is required' }], isError: true };
    return this.get(`/word.json/${encodeURIComponent(args.word as string)}/pronunciations`, {
      typeFormat:   args.typeFormat as string,
      limit:        args.limit as number,
      useCanonical: args.useCanonical as boolean,
    });
  }

  private async getHyphenation(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.word) return { content: [{ type: 'text', text: 'word is required' }], isError: true };
    return this.get(`/word.json/${encodeURIComponent(args.word as string)}/hyphenation`, {
      limit:        args.limit as number,
      useCanonical: args.useCanonical as boolean,
    });
  }

  private async getFrequency(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.word) return { content: [{ type: 'text', text: 'word is required' }], isError: true };
    return this.get(`/word.json/${encodeURIComponent(args.word as string)}/frequency`, {
      startYear:    args.startYear as number,
      endYear:      args.endYear as number,
      useCanonical: args.useCanonical as boolean,
    });
  }

  private async getPhrases(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.word) return { content: [{ type: 'text', text: 'word is required' }], isError: true };
    return this.get(`/word.json/${encodeURIComponent(args.word as string)}/phrases`, {
      limit:        args.limit as number,
      wlmi:         args.wlmi as number,
      useCanonical: args.useCanonical as boolean,
    });
  }

  private async getEtymologies(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.word) return { content: [{ type: 'text', text: 'word is required' }], isError: true };
    return this.get(`/word.json/${encodeURIComponent(args.word as string)}/etymologies`, {
      useCanonical: args.useCanonical as boolean,
    });
  }

  private async getAudio(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.word) return { content: [{ type: 'text', text: 'word is required' }], isError: true };
    return this.get(`/word.json/${encodeURIComponent(args.word as string)}/audio`, {
      limit:        args.limit as number,
      useCanonical: args.useCanonical as boolean,
    });
  }

  private async getScrabbleScore(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.word) return { content: [{ type: 'text', text: 'word is required' }], isError: true };
    return this.get(`/word.json/${encodeURIComponent(args.word as string)}/scrabbleScore`);
  }

  // ── Words collection methods ───────────────────────────────────────────────

  private async getRandomWord(args: Record<string, unknown>): Promise<ToolResult> {
    return this.get('/words.json/randomWord', {
      minCorpusCount:       args.minCorpusCount as number,
      maxCorpusCount:       args.maxCorpusCount as number,
      minLength:            args.minLength as number,
      maxLength:            args.maxLength as number,
      includePartOfSpeech:  args.includePartOfSpeech as string,
      excludePartOfSpeech:  args.excludePartOfSpeech as string,
      hasDictionaryDef:     args.hasDictionaryDef !== undefined ? String(args.hasDictionaryDef) : undefined,
    });
  }

  private async getRandomWords(args: Record<string, unknown>): Promise<ToolResult> {
    return this.get('/words.json/randomWords', {
      limit:                args.limit as number,
      minCorpusCount:       args.minCorpusCount as number,
      maxCorpusCount:       args.maxCorpusCount as number,
      minLength:            args.minLength as number,
      maxLength:            args.maxLength as number,
      includePartOfSpeech:  args.includePartOfSpeech as string,
      hasDictionaryDef:     args.hasDictionaryDef !== undefined ? String(args.hasDictionaryDef) : undefined,
    });
  }

  private async searchWords(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.query) return { content: [{ type: 'text', text: 'query is required' }], isError: true };
    return this.get(`/words.json/search/${encodeURIComponent(args.query as string)}`, {
      caseSensitive:        args.caseSensitive !== undefined ? String(args.caseSensitive) : undefined,
      includePartOfSpeech:  args.includePartOfSpeech as string,
      excludePartOfSpeech:  args.excludePartOfSpeech as string,
      minCorpusCount:       args.minCorpusCount as number,
      limit:                args.limit as number,
      skip:                 args.skip as number,
    });
  }

  private async reverseDictionary(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.query) return { content: [{ type: 'text', text: 'query is required' }], isError: true };
    return this.get('/words.json/reverseDictionary', {
      query:                        args.query as string,
      findSenseForWord:             args.findSenseForWord as string,
      includeSourceDictionaries:    args.includeSourceDictionaries as string,
      excludeSourceDictionaries:    args.excludeSourceDictionaries as string,
      includePartOfSpeech:          args.includePartOfSpeech as string,
      limit:                        args.limit as number,
      skip:                         args.skip as number,
    });
  }

  private async getWordOfTheDay(args: Record<string, unknown>): Promise<ToolResult> {
    return this.get('/words.json/wordOfTheDay', {
      date: args.date as string,
    });
  }
}
