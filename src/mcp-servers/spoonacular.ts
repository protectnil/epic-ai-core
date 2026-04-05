/**
 * Spoonacular MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03. No official Spoonacular-maintained MCP server found on GitHub.
// Our adapter covers: 16 tools (recipe search, ingredient lookup, meal planning, nutrition analysis,
//   wine pairing, food product search, restaurant search, and random food trivia).
//
// Base URL: https://api.spoonacular.com
// Auth: API key passed as query parameter `apiKey` on every request.
// Docs: https://spoonacular.com/food-api/docs
// Spec: https://api.apis.guru/v2/specs/spoonacular.com/1.1/openapi.json
// Rate limits: Free tier: 150 points/day (each request costs 1+ points). Paid tiers scale up.
//   HTTP 402 returned when daily quota is exceeded.

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface SpoonacularConfig {
  /** Spoonacular API key — passed as apiKey query parameter */
  apiKey: string;
  /** Optional base URL override (default: https://api.spoonacular.com) */
  baseUrl?: string;
}


export class SpoonacularMCPServer extends MCPAdapterBase {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: SpoonacularConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? 'https://api.spoonacular.com';
  }

  static catalog() {
    return {
      name: 'spoonacular',
      displayName: 'Spoonacular',
      version: '1.0.0',
      category: 'food',
      keywords: [
        'spoonacular', 'food', 'recipe', 'cooking', 'nutrition', 'ingredient',
        'meal', 'meal plan', 'diet', 'calories', 'protein', 'carbs', 'vegan',
        'vegetarian', 'gluten free', 'keto', 'paleo', 'restaurant', 'wine',
        'grocery', 'product', 'barcode', 'UPC', 'menu item',
      ],
      toolNames: [
        'search_recipes',
        'get_recipe_information',
        'get_recipe_nutrition',
        'get_similar_recipes',
        'get_random_recipes',
        'search_recipes_by_ingredients',
        'autocomplete_recipe_search',
        'search_ingredients',
        'get_ingredient_information',
        'convert_ingredient_amounts',
        'analyze_recipe_nutrition',
        'search_grocery_products',
        'get_product_information',
        'search_menu_items',
        'search_restaurants',
        'get_wine_pairing',
        'generate_meal_plan',
        'get_random_food_trivia',
      ],
      description: 'Spoonacular food and recipe API: search recipes by ingredients, diet, or cuisine; analyze nutrition; look up grocery products by UPC; get wine pairings; generate meal plans; and find nearby restaurants.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      {
        name: 'search_recipes',
        description: 'Search recipes by keyword, cuisine, diet, intolerances, ingredients, or nutritional constraints — returns ranked results with IDs and metadata',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query text (e.g. "pasta", "low carb breakfast", "Thai curry")',
            },
            cuisine: {
              type: 'string',
              description: 'Filter by cuisine type (e.g. italian, mexican, thai, american, indian)',
            },
            diet: {
              type: 'string',
              description: 'Filter by diet: vegan, vegetarian, pescetarian, gluten free, ketogenic, paleo, whole30',
            },
            intolerances: {
              type: 'string',
              description: 'Comma-separated intolerances to exclude: dairy, egg, gluten, peanut, sesame, seafood, shellfish, soy, sulfite, tree nut, wheat',
            },
            include_ingredients: {
              type: 'string',
              description: 'Comma-separated ingredients that must be included in recipes',
            },
            exclude_ingredients: {
              type: 'string',
              description: 'Comma-separated ingredients to exclude from recipes',
            },
            max_ready_time: {
              type: 'number',
              description: 'Maximum time to prepare in minutes (e.g. 30 for quick meals)',
            },
            number: {
              type: 'number',
              description: 'Number of results to return, 1-100 (default: 10)',
            },
            offset: {
              type: 'number',
              description: 'Pagination offset (default: 0)',
            },
            add_recipe_nutrition: {
              type: 'boolean',
              description: 'Include basic nutrition data in results (default: false)',
            },
          },
        },
      },
      {
        name: 'get_recipe_information',
        description: 'Get full recipe details by ID including ingredients, instructions, servings, ready time, cuisine, diet tags, and source URL',
        inputSchema: {
          type: 'object',
          properties: {
            recipe_id: {
              type: 'number',
              description: 'Spoonacular recipe ID (integer, e.g. 716429)',
            },
            include_nutrition: {
              type: 'boolean',
              description: 'Include full nutrition breakdown per serving (default: false)',
            },
          },
          required: ['recipe_id'],
        },
      },
      {
        name: 'get_recipe_nutrition',
        description: "Get detailed nutritional information for a recipe including macro and micronutrients per serving and as a percentage of daily value",
        inputSchema: {
          type: 'object',
          properties: {
            recipe_id: {
              type: 'number',
              description: 'Spoonacular recipe ID',
            },
          },
          required: ['recipe_id'],
        },
      },
      {
        name: 'get_similar_recipes',
        description: 'Get a list of recipes similar to a given recipe based on ingredients and cuisine type',
        inputSchema: {
          type: 'object',
          properties: {
            recipe_id: {
              type: 'number',
              description: 'Spoonacular recipe ID to find similar recipes for',
            },
            number: {
              type: 'number',
              description: 'Number of similar recipes to return, 1-10 (default: 5)',
            },
          },
          required: ['recipe_id'],
        },
      },
      {
        name: 'get_random_recipes',
        description: 'Get random recipes optionally filtered by diet tags — useful for meal inspiration and discovery',
        inputSchema: {
          type: 'object',
          properties: {
            tags: {
              type: 'string',
              description: 'Comma-separated tags to filter random recipes (e.g. vegetarian,dessert,quick)',
            },
            number: {
              type: 'number',
              description: 'Number of random recipes to return, 1-100 (default: 5)',
            },
          },
        },
      },
      {
        name: 'search_recipes_by_ingredients',
        description: 'Find recipes that use a given list of ingredients — minimizes missing ingredients and maximizes ingredient usage',
        inputSchema: {
          type: 'object',
          properties: {
            ingredients: {
              type: 'string',
              description: 'Comma-separated list of ingredients you have (e.g. apples,flour,sugar)',
            },
            number: {
              type: 'number',
              description: 'Number of recipes to return, 1-100 (default: 10)',
            },
            ranking: {
              type: 'number',
              description: 'Ranking strategy: 1 = maximize used ingredients, 2 = minimize missing ingredients (default: 1)',
            },
            ignore_pantry: {
              type: 'boolean',
              description: 'Ignore pantry staples (salt, oil, etc.) when matching (default: true)',
            },
          },
          required: ['ingredients'],
        },
      },
      {
        name: 'autocomplete_recipe_search',
        description: 'Autocomplete recipe title search — useful for search-as-you-type interfaces',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Partial recipe name to autocomplete (e.g. "spag" → "spaghetti carbonara")',
            },
            number: {
              type: 'number',
              description: 'Number of autocomplete suggestions, 1-25 (default: 10)',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'search_ingredients',
        description: 'Search the Spoonacular ingredient database for nutrition info, aisle location, and possible units by ingredient name',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Ingredient name to search (e.g. "apple", "whole milk", "brown rice")',
            },
            number: {
              type: 'number',
              description: 'Number of results to return, 1-100 (default: 10)',
            },
            add_children: {
              type: 'boolean',
              description: 'Add child ingredients (e.g. return "butter" when searching "fat") (default: false)',
            },
            meta_information: {
              type: 'boolean',
              description: 'Include meta information such as possible units and aisle (default: false)',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_ingredient_information',
        description: 'Get full ingredient details by ID including nutritional data per specified amount, aisle, consistency, and possible units',
        inputSchema: {
          type: 'object',
          properties: {
            ingredient_id: {
              type: 'number',
              description: 'Spoonacular ingredient ID (integer)',
            },
            amount: {
              type: 'number',
              description: 'Amount of ingredient for nutrition calculation (default: 100)',
            },
            unit: {
              type: 'string',
              description: 'Unit for the amount (e.g. grams, cups, oz — default: grams)',
            },
          },
          required: ['ingredient_id'],
        },
      },
      {
        name: 'convert_ingredient_amounts',
        description: 'Convert ingredient amounts between units (e.g. cups to grams, tablespoons to milliliters)',
        inputSchema: {
          type: 'object',
          properties: {
            ingredient_name: {
              type: 'string',
              description: 'Name of the ingredient to convert (e.g. "flour", "butter")',
            },
            source_amount: {
              type: 'number',
              description: 'Amount in the source unit to convert from',
            },
            source_unit: {
              type: 'string',
              description: 'Source unit (e.g. cups, tablespoons, oz)',
            },
            target_unit: {
              type: 'string',
              description: 'Target unit to convert to (e.g. grams, ml, teaspoons)',
            },
          },
          required: ['ingredient_name', 'source_amount', 'source_unit', 'target_unit'],
        },
      },
      {
        name: 'analyze_recipe_nutrition',
        description: 'Analyze nutritional content of a recipe from ingredient list text — returns calories, macros, and micronutrients without needing a recipe ID',
        inputSchema: {
          type: 'object',
          properties: {
            ingredient_list: {
              type: 'string',
              description: 'Newline-separated list of ingredients with amounts (e.g. "2 cups flour\\n1 cup sugar\\n3 eggs")',
            },
            servings: {
              type: 'number',
              description: 'Number of servings the ingredient list makes (default: 1)',
            },
          },
          required: ['ingredient_list'],
        },
      },
      {
        name: 'search_grocery_products',
        description: 'Search grocery products by name or UPC barcode — returns brand, nutrition, and ingredient data for packaged foods',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Product name to search (e.g. "greek yogurt", "oat milk")',
            },
            upc: {
              type: 'string',
              description: 'UPC barcode to look up a specific product (takes priority over query if both provided)',
            },
            number: {
              type: 'number',
              description: 'Number of results, 1-100 (default: 10)',
            },
            offset: {
              type: 'number',
              description: 'Pagination offset (default: 0)',
            },
          },
        },
      },
      {
        name: 'get_product_information',
        description: 'Get full grocery product details by ID including ingredients, nutrition facts, badges, and store aisle',
        inputSchema: {
          type: 'object',
          properties: {
            product_id: {
              type: 'number',
              description: 'Spoonacular grocery product ID (integer)',
            },
          },
          required: ['product_id'],
        },
      },
      {
        name: 'search_menu_items',
        description: 'Search restaurant menu items across chain restaurants — returns item name, restaurant, calories, and serving size',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Menu item to search for (e.g. "Big Mac", "Chick-fil-A sandwich", "Starbucks latte")',
            },
            number: {
              type: 'number',
              description: 'Number of results, 1-100 (default: 10)',
            },
            offset: {
              type: 'number',
              description: 'Pagination offset (default: 0)',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'search_restaurants',
        description: 'Search for restaurants near a location by cuisine, budget, and dietary restrictions',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search term for restaurant name or type (e.g. "pizza", "sushi", "farm to table")',
            },
            lat: {
              type: 'number',
              description: 'Latitude for location-based search (e.g. 37.7749)',
            },
            lng: {
              type: 'number',
              description: 'Longitude for location-based search (e.g. -122.4194)',
            },
            distance: {
              type: 'number',
              description: 'Search radius in miles (default: 5)',
            },
            budget: {
              type: 'number',
              description: 'Max budget per person in USD (e.g. 30)',
            },
            cuisine: {
              type: 'string',
              description: 'Cuisine type filter (e.g. italian, mexican, thai)',
            },
            is_open: {
              type: 'boolean',
              description: 'Filter to currently open restaurants only (default: false)',
            },
          },
          required: ['lat', 'lng'],
        },
      },
      {
        name: 'get_wine_pairing',
        description: 'Get wine pairing recommendations for a food or dish — returns wine types, descriptions, and product suggestions',
        inputSchema: {
          type: 'object',
          properties: {
            food: {
              type: 'string',
              description: 'Food or dish to find wine pairing for (e.g. "steak", "salmon", "pasta with tomato sauce")',
            },
            max_price: {
              type: 'number',
              description: 'Maximum price per bottle in USD for product recommendations',
            },
          },
          required: ['food'],
        },
      },
      {
        name: 'generate_meal_plan',
        description: 'Generate a day or week meal plan meeting calorie and macro targets with diet and exclusion constraints',
        inputSchema: {
          type: 'object',
          properties: {
            time_frame: {
              type: 'string',
              description: 'Meal plan duration: day or week (default: day)',
            },
            target_calories: {
              type: 'number',
              description: 'Target daily calorie intake (e.g. 2000)',
            },
            diet: {
              type: 'string',
              description: 'Diet constraint: vegan, vegetarian, pescetarian, gluten free, ketogenic, paleo',
            },
            exclude: {
              type: 'string',
              description: 'Comma-separated ingredients or cuisine types to exclude from the plan',
            },
          },
        },
      },
      {
        name: 'get_random_food_trivia',
        description: 'Get a random food trivia fact — useful for chatbot responses, food education, or app icebreakers',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      switch (name) {
        case 'search_recipes':               return this.searchRecipes(args);
        case 'get_recipe_information':       return this.getRecipeInformation(args);
        case 'get_recipe_nutrition':         return this.getRecipeNutrition(args);
        case 'get_similar_recipes':          return this.getSimilarRecipes(args);
        case 'get_random_recipes':           return this.getRandomRecipes(args);
        case 'search_recipes_by_ingredients':return this.searchRecipesByIngredients(args);
        case 'autocomplete_recipe_search':   return this.autocompleteRecipeSearch(args);
        case 'search_ingredients':           return this.searchIngredients(args);
        case 'get_ingredient_information':   return this.getIngredientInformation(args);
        case 'convert_ingredient_amounts':   return this.convertIngredientAmounts(args);
        case 'analyze_recipe_nutrition':     return this.analyzeRecipeNutrition(args);
        case 'search_grocery_products':      return this.searchGroceryProducts(args);
        case 'get_product_information':      return this.getProductInformation(args);
        case 'search_menu_items':            return this.searchMenuItems(args);
        case 'search_restaurants':           return this.searchRestaurants(args);
        case 'get_wine_pairing':             return this.getWinePairing(args);
        case 'generate_meal_plan':           return this.generateMealPlan(args);
        case 'get_random_food_trivia':       return this.getRandomFoodTrivia();
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

  // ── Helpers ─────────────────────────────────────────────────────────────────

  private buildUrl(path: string, params: Record<string, string | number | boolean | undefined> = {}): string {
    const qs = new URLSearchParams({ apiKey: this.apiKey });
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) qs.set(k, String(v));
    }
    return `${this.baseUrl}${path}?${qs.toString()}`;
  }

  private async get(path: string, params: Record<string, string | number | boolean | undefined> = {}): Promise<ToolResult> {
    const url = this.buildUrl(path, params);
    const response = await this.fetchWithRetry(url, { method: 'GET' });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Spoonacular returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  private async post(path: string, body: Record<string, unknown>, params: Record<string, string | number | undefined> = {}): Promise<ToolResult> {
    const url = this.buildUrl(path, params);
    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(Object.fromEntries(Object.entries(body).map(([k, v]) => [k, String(v)]))).toString(),
    });
    if (!response.ok) {
      return { content: [{ type: 'text', text: `API error: ${response.status} ${response.statusText}` }], isError: true };
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error(`Spoonacular returned non-JSON (HTTP ${response.status})`); }
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }

  // ── Tool implementations ─────────────────────────────────────────────────────

  private async searchRecipes(args: Record<string, unknown>): Promise<ToolResult> {
    const params: Record<string, string | number | boolean | undefined> = {
      query: args.query as string | undefined,
      cuisine: args.cuisine as string | undefined,
      diet: args.diet as string | undefined,
      intolerances: args.intolerances as string | undefined,
      includeIngredients: args.include_ingredients as string | undefined,
      excludeIngredients: args.exclude_ingredients as string | undefined,
      maxReadyTime: args.max_ready_time as number | undefined,
      number: (args.number as number) ?? 10,
      offset: (args.offset as number) ?? 0,
      addRecipeNutrition: args.add_recipe_nutrition as boolean | undefined,
    };
    return this.get('/recipes/complexSearch', params);
  }

  private async getRecipeInformation(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.recipe_id) return { content: [{ type: 'text', text: 'recipe_id is required' }], isError: true };
    return this.get(`/recipes/${encodeURIComponent(String(args.recipe_id))}/information`, {
      includeNutrition: args.include_nutrition as boolean | undefined,
    });
  }

  private async getRecipeNutrition(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.recipe_id) return { content: [{ type: 'text', text: 'recipe_id is required' }], isError: true };
    return this.get(`/recipes/${encodeURIComponent(String(args.recipe_id))}/nutritionWidget.json`);
  }

  private async getSimilarRecipes(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.recipe_id) return { content: [{ type: 'text', text: 'recipe_id is required' }], isError: true };
    return this.get(`/recipes/${encodeURIComponent(String(args.recipe_id))}/similar`, {
      number: (args.number as number) ?? 5,
    });
  }

  private async getRandomRecipes(args: Record<string, unknown>): Promise<ToolResult> {
    return this.get('/recipes/random', {
      tags: args.tags as string | undefined,
      number: (args.number as number) ?? 5,
    });
  }

  private async searchRecipesByIngredients(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.ingredients) return { content: [{ type: 'text', text: 'ingredients is required' }], isError: true };
    return this.get('/recipes/findByIngredients', {
      ingredients: args.ingredients as string,
      number: (args.number as number) ?? 10,
      ranking: (args.ranking as number) ?? 1,
      ignorePantry: args.ignore_pantry !== false,
    });
  }

  private async autocompleteRecipeSearch(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.query) return { content: [{ type: 'text', text: 'query is required' }], isError: true };
    return this.get('/recipes/autocomplete', {
      query: args.query as string,
      number: (args.number as number) ?? 10,
    });
  }

  private async searchIngredients(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.query) return { content: [{ type: 'text', text: 'query is required' }], isError: true };
    return this.get('/food/ingredients/search', {
      query: args.query as string,
      number: (args.number as number) ?? 10,
      addChildren: args.add_children as boolean | undefined,
      metaInformation: args.meta_information as boolean | undefined,
    });
  }

  private async getIngredientInformation(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.ingredient_id) return { content: [{ type: 'text', text: 'ingredient_id is required' }], isError: true };
    return this.get(`/food/ingredients/${encodeURIComponent(String(args.ingredient_id))}/information`, {
      amount: (args.amount as number) ?? 100,
      unit: (args.unit as string) ?? 'grams',
    });
  }

  private async convertIngredientAmounts(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.ingredient_name) return { content: [{ type: 'text', text: 'ingredient_name is required' }], isError: true };
    if (args.source_amount === undefined) return { content: [{ type: 'text', text: 'source_amount is required' }], isError: true };
    if (!args.source_unit) return { content: [{ type: 'text', text: 'source_unit is required' }], isError: true };
    if (!args.target_unit) return { content: [{ type: 'text', text: 'target_unit is required' }], isError: true };
    return this.get('/recipes/convert', {
      ingredientName: args.ingredient_name as string,
      sourceAmount: args.source_amount as number,
      sourceUnit: args.source_unit as string,
      targetUnit: args.target_unit as string,
    });
  }

  private async analyzeRecipeNutrition(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.ingredient_list) return { content: [{ type: 'text', text: 'ingredient_list is required' }], isError: true };
    return this.post('/recipes/parseIngredients', {
      ingredientList: args.ingredient_list as string,
      servings: (args.servings as number) ?? 1,
    });
  }

  private async searchGroceryProducts(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.upc) {
      return this.get(`/food/products/upc/${encodeURIComponent(args.upc as string)}`);
    }
    return this.get('/food/products/search', {
      query: args.query as string | undefined,
      number: (args.number as number) ?? 10,
      offset: (args.offset as number) ?? 0,
    });
  }

  private async getProductInformation(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.product_id) return { content: [{ type: 'text', text: 'product_id is required' }], isError: true };
    return this.get(`/food/products/${encodeURIComponent(String(args.product_id))}`);
  }

  private async searchMenuItems(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.query) return { content: [{ type: 'text', text: 'query is required' }], isError: true };
    return this.get('/food/menuItems/search', {
      query: args.query as string,
      number: (args.number as number) ?? 10,
      offset: (args.offset as number) ?? 0,
    });
  }

  private async searchRestaurants(args: Record<string, unknown>): Promise<ToolResult> {
    if (args.lat === undefined) return { content: [{ type: 'text', text: 'lat is required' }], isError: true };
    if (args.lng === undefined) return { content: [{ type: 'text', text: 'lng is required' }], isError: true };
    return this.get('/food/restaurants/search', {
      query: args.query as string | undefined,
      lat: args.lat as number,
      lng: args.lng as number,
      distance: (args.distance as number) ?? 5,
      budget: args.budget as number | undefined,
      cuisine: args.cuisine as string | undefined,
      isOpen: args.is_open as boolean | undefined,
    });
  }

  private async getWinePairing(args: Record<string, unknown>): Promise<ToolResult> {
    if (!args.food) return { content: [{ type: 'text', text: 'food is required' }], isError: true };
    return this.get('/food/wine/pairing', {
      food: args.food as string,
      maxPrice: args.max_price as number | undefined,
    });
  }

  private async generateMealPlan(args: Record<string, unknown>): Promise<ToolResult> {
    return this.get('/mealplanner/generate', {
      timeFrame: (args.time_frame as string) ?? 'day',
      targetCalories: args.target_calories as number | undefined,
      diet: args.diet as string | undefined,
      exclude: args.exclude as string | undefined,
    });
  }

  private async getRandomFoodTrivia(): Promise<ToolResult> {
    return this.get('/food/trivia/random');
  }
}
