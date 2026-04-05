/**
 * US Census Bureau MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: https://github.com/uscensusbureau/us-census-bureau-data-api-mcp — transport: stdio, auth: API key (env var CENSUS_API_KEY)
// Our adapter covers: 14 tools. Vendor MCP covers: 5 tools (list-datasets, fetch-dataset-geography,
//   fetch-aggregate-data, resolve-geography-fips, search-data-tables). Last release: v0.1.2-beta Mar 6 2026.
// Recommendation: use-rest-api — vendor MCP fails the 10+ tools criterion (only 5 tools). Our adapter
//   provides broader coverage: dataset-specific query tools, convenience geo tools, variable search, and
//   business patterns. The vendor MCP's fetch-aggregate-data is equivalent to our get_acs5_data/get_acs1_data/
//   get_decennial_data tools. Use vendor MCP as optional supplement for air-gapped or stdio setups only.
//
// Base URL: https://api.census.gov/data
// Auth: API key as query parameter: ?key=<api_key>
//       API keys are free: https://api.census.gov/data/key_signup.html
//       Unauthenticated requests are rate-limited to 500/day; authenticated requests have higher limits.
// Docs: https://www.census.gov/data/developers/guidance/api-user-guide.html
//       https://api.census.gov/data.html
// Rate limits: ~500 unauthenticated requests/day; authenticated limit not published but substantially higher
// Note: Each dataset is a separate endpoint under /data/{year}/{dataset}/{series}
//       Variables and geographies differ per dataset. This adapter covers the most common datasets.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface CensusGovConfig {
  apiKey?: string;
  baseUrl?: string;
}

export class CensusGovMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: CensusGovConfig) {
    super();
    this.apiKey = config.apiKey ?? '';
    this.baseUrl = config.baseUrl ?? 'https://api.census.gov/data';
  }

  static catalog() {
    return {
      name: 'census-gov',
      displayName: 'US Census Bureau',
      version: '1.0.0',
      category: 'data',
      keywords: [
        'census', 'us census', 'census bureau', 'demographics', 'population',
        'acs', 'american community survey', 'decennial', 'income', 'poverty',
        'housing', 'employment', 'geography', 'county', 'state', 'zip code',
        'tract', 'block group', 'economic', 'business patterns',
      ],
      toolNames: [
        'get_acs5_data', 'get_acs1_data', 'get_decennial_data',
        'get_population_estimates', 'get_business_patterns',
        'list_variables', 'search_variables', 'list_geographies',
        'get_state_data', 'get_county_data', 'get_place_data',
        'get_tract_data', 'list_datasets', 'get_dataset_info',
      ],
      description: 'US Census Bureau Data API: query American Community Survey, Decennial Census, population estimates, business patterns, and demographic data by geography.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'get_acs5_data',
        description: 'Query American Community Survey 5-year estimates for demographic, social, economic, and housing variables at any geography level',
        inputSchema: {
          type: 'object',
          properties: {
            year: {
              type: 'number',
              description: 'Data year (e.g. 2023 for 2019-2023 5-year estimates). Available: 2009-2023.',
            },
            variables: {
              type: 'string',
              description: 'Comma-separated variable codes (e.g. B01003_001E for total population, B19013_001E for median household income, NAME for place name)',
            },
            geo_type: {
              type: 'string',
              description: 'Geography type: us, state, county, place, tract, block group, zip code tabulation area',
            },
            state_fips: {
              type: 'string',
              description: 'State FIPS code (e.g. 06 for California, 36 for New York). Use * for all states.',
            },
            county_fips: {
              type: 'string',
              description: 'County FIPS code (e.g. 001). Use * for all counties in the specified state. Required when geo_type is county, tract, or block group.',
            },
          },
          required: ['year', 'variables', 'geo_type'],
        },
      },
      {
        name: 'get_acs1_data',
        description: 'Query American Community Survey 1-year estimates for areas with populations 65,000+ — more current but less granular than 5-year',
        inputSchema: {
          type: 'object',
          properties: {
            year: {
              type: 'number',
              description: 'Data year (e.g. 2023). Available 2005-2023 (excluding 2020 due to COVID disruption).',
            },
            variables: {
              type: 'string',
              description: 'Comma-separated variable codes (e.g. B01003_001E,NAME for total population with place name)',
            },
            geo_type: {
              type: 'string',
              description: 'Geography type: us, state, county, place (populations 65k+)',
            },
            state_fips: {
              type: 'string',
              description: 'State FIPS code (e.g. 06 for California). Use * for all states.',
            },
          },
          required: ['year', 'variables', 'geo_type'],
        },
      },
      {
        name: 'get_decennial_data',
        description: 'Query Decennial Census data (2020 or 2010) for population counts and housing characteristics at detailed geography levels',
        inputSchema: {
          type: 'object',
          properties: {
            year: {
              type: 'number',
              description: 'Census year: 2020 or 2010',
            },
            dataset: {
              type: 'string',
              description: 'Decennial dataset: pl (Redistricting), dhc (Demographic and Housing), dp (Demographic Profile). Default: pl',
            },
            variables: {
              type: 'string',
              description: 'Comma-separated variable codes (e.g. P1_001N for total population in 2020 PL file, NAME)',
            },
            geo_type: {
              type: 'string',
              description: 'Geography type: us, state, county, tract, block group, block',
            },
            state_fips: {
              type: 'string',
              description: 'State FIPS code (e.g. 06). Use * for all states.',
            },
            county_fips: {
              type: 'string',
              description: 'County FIPS code. Use * for all counties in the state. Required for tract/block level.',
            },
          },
          required: ['year', 'variables', 'geo_type'],
        },
      },
      {
        name: 'get_population_estimates',
        description: 'Query Census Bureau Population Estimates Program (PEP) for current-year and intercensal population and housing unit estimates',
        inputSchema: {
          type: 'object',
          properties: {
            year: {
              type: 'number',
              description: 'Vintage year of estimates (e.g. 2023 for the 2023 vintage estimates series)',
            },
            variables: {
              type: 'string',
              description: 'Comma-separated variable codes (e.g. POP for population, NAME, DENSITY for population density)',
            },
            geo_type: {
              type: 'string',
              description: 'Geography type: us, state, county',
            },
            state_fips: {
              type: 'string',
              description: 'State FIPS code. Use * for all states.',
            },
          },
          required: ['year', 'variables', 'geo_type'],
        },
      },
      {
        name: 'get_business_patterns',
        description: 'Query County Business Patterns (CBP) or ZIP Business Patterns for employment and establishment counts by industry (NAICS)',
        inputSchema: {
          type: 'object',
          properties: {
            year: {
              type: 'number',
              description: 'Data year (e.g. 2021). CBP available 2000-2021.',
            },
            variables: {
              type: 'string',
              description: 'Comma-separated variable codes (e.g. ESTAB for establishments, EMP for employees, NAICS2017 for industry code, NAME)',
            },
            geo_type: {
              type: 'string',
              description: 'Geography type: us, state, county, zipcode',
            },
            state_fips: {
              type: 'string',
              description: 'State FIPS code. Use * for all states.',
            },
            naics_code: {
              type: 'string',
              description: 'NAICS industry code to filter by (e.g. 72 for accommodation/food, 54 for professional services). Omit for all industries.',
            },
          },
          required: ['year', 'variables', 'geo_type'],
        },
      },
      {
        name: 'list_variables',
        description: 'List all available variables for a specific Census dataset, year, and series to discover what data fields can be queried',
        inputSchema: {
          type: 'object',
          properties: {
            year: {
              type: 'number',
              description: 'Data year (e.g. 2023)',
            },
            dataset: {
              type: 'string',
              description: 'Dataset path (e.g. acs/acs5, acs/acs1, dec/pl, pep/population, cbp)',
            },
          },
          required: ['year', 'dataset'],
        },
      },
      {
        name: 'search_variables',
        description: 'Search Census dataset variables by keyword to find the right variable codes for a query',
        inputSchema: {
          type: 'object',
          properties: {
            year: {
              type: 'number',
              description: 'Data year (e.g. 2023)',
            },
            dataset: {
              type: 'string',
              description: 'Dataset path (e.g. acs/acs5, acs/acs1)',
            },
            keyword: {
              type: 'string',
              description: 'Keyword to search variable labels for (e.g. income, poverty, housing, race)',
            },
          },
          required: ['year', 'dataset', 'keyword'],
        },
      },
      {
        name: 'list_geographies',
        description: 'List all supported geography types and their required parameters for a specific Census dataset and year',
        inputSchema: {
          type: 'object',
          properties: {
            year: {
              type: 'number',
              description: 'Data year (e.g. 2023)',
            },
            dataset: {
              type: 'string',
              description: 'Dataset path (e.g. acs/acs5, dec/pl)',
            },
          },
          required: ['year', 'dataset'],
        },
      },
      {
        name: 'get_state_data',
        description: 'Convenience tool: query ACS 5-year data for all US states — returns the specified variables for every state in one call',
        inputSchema: {
          type: 'object',
          properties: {
            year: {
              type: 'number',
              description: 'ACS 5-year data year (e.g. 2023)',
            },
            variables: {
              type: 'string',
              description: 'Comma-separated variable codes plus NAME (e.g. NAME,B01003_001E,B19013_001E)',
            },
          },
          required: ['year', 'variables'],
        },
      },
      {
        name: 'get_county_data',
        description: 'Convenience tool: query ACS 5-year data for all counties in a state, or all counties in the US',
        inputSchema: {
          type: 'object',
          properties: {
            year: {
              type: 'number',
              description: 'ACS 5-year data year (e.g. 2023)',
            },
            variables: {
              type: 'string',
              description: 'Comma-separated variable codes plus NAME (e.g. NAME,B01003_001E)',
            },
            state_fips: {
              type: 'string',
              description: 'State FIPS code to scope results (e.g. 06 for California). Use * for all US counties.',
            },
          },
          required: ['year', 'variables'],
        },
      },
      {
        name: 'get_place_data',
        description: 'Convenience tool: query ACS 5-year data for all cities and towns (Census places) in a state',
        inputSchema: {
          type: 'object',
          properties: {
            year: {
              type: 'number',
              description: 'ACS 5-year data year (e.g. 2023)',
            },
            variables: {
              type: 'string',
              description: 'Comma-separated variable codes plus NAME (e.g. NAME,B01003_001E)',
            },
            state_fips: {
              type: 'string',
              description: 'State FIPS code (e.g. 06 for California). Use * for all states.',
            },
          },
          required: ['year', 'variables', 'state_fips'],
        },
      },
      {
        name: 'get_tract_data',
        description: 'Convenience tool: query ACS 5-year data for all census tracts in a county — provides neighborhood-level demographic detail',
        inputSchema: {
          type: 'object',
          properties: {
            year: {
              type: 'number',
              description: 'ACS 5-year data year (e.g. 2023)',
            },
            variables: {
              type: 'string',
              description: 'Comma-separated variable codes plus NAME (e.g. NAME,B01003_001E)',
            },
            state_fips: {
              type: 'string',
              description: 'State FIPS code (e.g. 06)',
            },
            county_fips: {
              type: 'string',
              description: 'County FIPS code (e.g. 037). Use * for all counties in the state.',
            },
          },
          required: ['year', 'variables', 'state_fips', 'county_fips'],
        },
      },
      {
        name: 'list_datasets',
        description: 'List all datasets available in the Census Data API including ACS, Decennial, Economic Census, and more',
        inputSchema: {
          type: 'object',
          properties: {
            vintage: {
              type: 'number',
              description: 'Filter by data year/vintage (e.g. 2023). Omit to list all years.',
            },
          },
        },
      },
      {
        name: 'get_dataset_info',
        description: 'Get metadata for a specific Census dataset including available years, variables, and geographies',
        inputSchema: {
          type: 'object',
          properties: {
            year: {
              type: 'number',
              description: 'Data year (e.g. 2023)',
            },
            dataset: {
              type: 'string',
              description: 'Dataset path (e.g. acs/acs5, dec/pl, pep/population, cbp)',
            },
          },
          required: ['year', 'dataset'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'get_acs5_data':
          return this.queryDataset(args, 'acs/acs5');
        case 'get_acs1_data':
          return this.queryDataset(args, 'acs/acs1');
        case 'get_decennial_data':
          return this.getDecennialData(args);
        case 'get_population_estimates':
          return this.queryDataset(args, 'pep/population');
        case 'get_business_patterns':
          return this.getBusinessPatterns(args);
        case 'list_variables':
          return this.listVariables(args);
        case 'search_variables':
          return this.searchVariables(args);
        case 'list_geographies':
          return this.listGeographies(args);
        case 'get_state_data':
          return this.getStateData(args);
        case 'get_county_data':
          return this.getCountyData(args);
        case 'get_place_data':
          return this.getPlaceData(args);
        case 'get_tract_data':
          return this.getTractData(args);
        case 'list_datasets':
          return this.listDatasets(args);
        case 'get_dataset_info':
          return this.getDatasetInfo(args);
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

  private buildGeoParam(geoType: string, stateFips?: string, countyFips?: string): { for: string; in?: string } {
    const normalized = geoType.toLowerCase().trim();
    switch (normalized) {
      case 'us':
        return { for: 'us:1' };
      case 'state':
        return { for: `state:${stateFips ?? '*'}` };
      case 'county':
        return {
          for: `county:${countyFips ?? '*'}`,
          ...(stateFips ? { in: `state:${stateFips}` } : {}),
        };
      case 'place':
        return {
          for: 'place:*',
          ...(stateFips ? { in: `state:${stateFips}` } : {}),
        };
      case 'tract':
        return {
          for: 'tract:*',
          in: `state:${stateFips ?? '*'} county:${countyFips ?? '*'}`,
        };
      case 'block group':
        return {
          for: 'block group:*',
          in: `state:${stateFips ?? '*'} county:${countyFips ?? '*'}`,
        };
      case 'zip code tabulation area':
      case 'zipcode':
      case 'zcta':
        return { for: 'zip code tabulation area:*' };
      default:
        return { for: `${geoType}:*` };
    }
  }

  private async censusApiGet(url: string): Promise<ToolResult> {
    const separator = url.includes('?') ? '&' : '?';
    const keyParam = this.apiKey ? `${separator}key=${encodeURIComponent(this.apiKey)}` : '';
    const fullUrl = `${url}${keyParam}`;

    const response = await this.fetchWithRetry(fullUrl, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      const body = await response.text().catch(() => response.statusText);
      return { content: [{ type: 'text', text: `API error: ${response.status} — ${body}` }], isError: true };
    }

    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async queryDataset(args: Record<string, unknown>, datasetPath: string): Promise<ToolResult> {
    if (!args.year || !args.variables || !args.geo_type) {
      return { content: [{ type: 'text', text: 'year, variables, and geo_type are required' }], isError: true };
    }

    const geoParams = this.buildGeoParam(
      args.geo_type as string,
      args.state_fips as string | undefined,
      args.county_fips as string | undefined,
    );

    const params = new URLSearchParams({
      get: args.variables as string,
      for: geoParams.for,
    });
    if (geoParams.in) params.set('in', geoParams.in);

    return this.censusApiGet(`${this.baseUrl}/${encodeURIComponent(args.year as string)}/${datasetPath}?${params.toString()}`);
  }

  private async getDecennialData(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.year || !args.variables || !args.geo_type) {
      return { content: [{ type: 'text', text: 'year, variables, and geo_type are required' }], isError: true };
    }
    const dataset = (args.dataset as string) ?? 'pl';
    return this.queryDataset(args, `dec/${dataset}`);
  }

  private async getBusinessPatterns(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.year || !args.variables || !args.geo_type) {
      return { content: [{ type: 'text', text: 'year, variables, and geo_type are required' }], isError: true };
    }

    const geoParams = this.buildGeoParam(
      args.geo_type as string,
      args.state_fips as string | undefined,
    );

    const params = new URLSearchParams({
      get: args.variables as string,
      for: geoParams.for,
    });
    if (geoParams.in) params.set('in', geoParams.in);
    if (args.naics_code) params.set('NAICS2017', args.naics_code as string);

    const datasetPath = (args.geo_type as string).toLowerCase() === 'zipcode' ? 'zbp' : 'cbp';
    return this.censusApiGet(`${this.baseUrl}/${encodeURIComponent(args.year as string)}/${datasetPath}?${params.toString()}`);
  }

  private async listVariables(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.year || !args.dataset) return { content: [{ type: 'text', text: 'year and dataset are required' }], isError: true };
    return this.censusApiGet(`${this.baseUrl}/${encodeURIComponent(args.year as string)}/${encodeURIComponent(args.dataset as string)}/variables.json`);
  }

  private async searchVariables(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.year || !args.dataset || !args.keyword) {
      return { content: [{ type: 'text', text: 'year, dataset, and keyword are required' }], isError: true };
    }

    const keyParam = this.apiKey ? `?key=${encodeURIComponent(this.apiKey)}` : '';
    const response = await this.fetchWithRetry(`${this.baseUrl}/${encodeURIComponent(args.year as string)}/${encodeURIComponent(args.dataset as string)}/variables.json${keyParam}`, {
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }

    const data = await response.json() as { variables: Record<string, { label: string; concept?: string }> };
    const keyword = (args.keyword as string).toLowerCase();
    const matches = Object.entries(data.variables ?? {})
      .filter(([, v]) =>
        (v.label ?? '').toLowerCase().includes(keyword) ||
        (v.concept ?? '').toLowerCase().includes(keyword),
      )
      .slice(0, 100)
      .map(([code, v]) => ({ code, label: v.label, concept: v.concept }));

    return { content: [{ type: 'text', text: this.truncate({ keyword: args.keyword, matches }) }], isError: false };
  }

  private async listGeographies(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.year || !args.dataset) return { content: [{ type: 'text', text: 'year and dataset are required' }], isError: true };
    return this.censusApiGet(`${this.baseUrl}/${encodeURIComponent(args.year as string)}/${encodeURIComponent(args.dataset as string)}/geography.json`);
  }

  private async getStateData(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.year || !args.variables) return { content: [{ type: 'text', text: 'year and variables are required' }], isError: true };
    return this.queryDataset({ ...args, geo_type: 'state', state_fips: '*' }, 'acs/acs5');
  }

  private async getCountyData(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.year || !args.variables) return { content: [{ type: 'text', text: 'year and variables are required' }], isError: true };
    return this.queryDataset({ ...args, geo_type: 'county' }, 'acs/acs5');
  }

  private async getPlaceData(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.year || !args.variables || !args.state_fips) return { content: [{ type: 'text', text: 'year, variables, and state_fips are required' }], isError: true };
    return this.queryDataset({ ...args, geo_type: 'place' }, 'acs/acs5');
  }

  private async getTractData(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.year || !args.variables || !args.state_fips || !args.county_fips) {
      return { content: [{ type: 'text', text: 'year, variables, state_fips, and county_fips are required' }], isError: true };
    }
    return this.queryDataset({ ...args, geo_type: 'tract' }, 'acs/acs5');
  }

  private async listDatasets(args: Record<string, unknown>): Promise<ToolResult> {
    // The Census discovery endpoint lists all datasets
    const url = 'https://api.census.gov/data.json';
    const response = await this.fetchWithRetry(url, { headers: { Accept: 'application/json' } });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    const data = await response.json() as { dataset: Array<{ c_vintage?: number; c_dataset: string[]; title: string }> };

    let datasets = (data.dataset ?? []).map(d => ({
      title: d.title,
      vintage: d.c_vintage,
      path: d.c_dataset?.join('/'),
    }));

    if (args.vintage) {
      datasets = datasets.filter(d => d.vintage === Number(args.vintage));
    }

    return { content: [{ type: 'text', text: this.truncate({ count: datasets.length, datasets: datasets.slice(0, 200) }) }], isError: false };
  }

  private async getDatasetInfo(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.year || !args.dataset) return { content: [{ type: 'text', text: 'year and dataset are required' }], isError: true };
    return this.censusApiGet(`${this.baseUrl}/${encodeURIComponent(args.year as string)}/${encodeURIComponent(args.dataset as string)}.json`);
  }
}
