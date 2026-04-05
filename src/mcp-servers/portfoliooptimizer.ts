/**
 * Portfolio Optimizer MCP Adapter
 * Built on the Epic AI® Intelligence Platform
 * Copyright 2026 protectNIL Inc. Apache-2.0
 */

// Official MCP: None found as of 2026-03
// No official Portfolio Optimizer MCP server was found on GitHub. We build a full REST wrapper
// for complete API coverage.
//
// Base URL: https://api.portfoliooptimizer.io/v1
// Auth: API key header (X-API-Key)
// Docs: https://portfoliooptimizer.io/api/
// Spec: https://api.apis.guru/v2/specs/portfoliooptimizer.io/1.0.9/openapi.json
// Category: finance
// Rate limits: See portfoliooptimizer.io pricing — free tier included

import { ToolDefinition, ToolResult } from './types.js';
import { MCPAdapterBase } from './base.js';

interface PortfolioOptimizerConfig {
  apiKey?: string;
  baseUrl?: string;
}

export class PortfolioOptimizerMCPServer extends MCPAdapterBase {
  private readonly apiKey: string | undefined;
  private readonly baseUrl: string;

  constructor(config: PortfolioOptimizerConfig) {
    super();
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.portfoliooptimizer.io/v1';
  }

  static catalog() {
    return {
      name: 'portfoliooptimizer',
      displayName: 'Portfolio Optimizer',
      version: '1.0.0',
      category: 'finance',
      keywords: [
        'portfolio', 'optimization', 'finance', 'investment', 'asset allocation',
        'mean-variance', 'sharpe ratio', 'risk', 'return', 'covariance', 'correlation',
        'efficient frontier', 'rebalancing', 'diversification', 'volatility',
        'portfolio analysis', 'quant', 'factor', 'minimum variance', 'maximum return',
      ],
      toolNames: [
        // Assets - Analysis
        'assets_absorption_ratio',
        'assets_turbulence_index',
        // Assets - Correlation
        'assets_correlation_matrix',
        'assets_correlation_matrix_bounds',
        'assets_correlation_matrix_denoised',
        'assets_correlation_matrix_distance',
        'assets_correlation_matrix_effective_rank',
        'assets_correlation_matrix_informativeness',
        'assets_correlation_matrix_nearest',
        'assets_correlation_matrix_random',
        'assets_correlation_matrix_shrinkage',
        'assets_correlation_matrix_theory_implied',
        'assets_correlation_matrix_validation',
        // Assets - Covariance
        'assets_covariance_matrix',
        'assets_covariance_matrix_effective_rank',
        'assets_covariance_matrix_ewma',
        'assets_covariance_matrix_validation',
        // Assets - Statistics
        'assets_kurtosis',
        'assets_prices_adjusted',
        'assets_prices_adjusted_forward',
        'assets_returns',
        'assets_returns_average',
        'assets_returns_simulation_bootstrap',
        'assets_skewness',
        'assets_variance',
        'assets_volatility',
        // Factors
        'factors_residualization',
        // Portfolio - Analysis
        'portfolio_analysis_alpha',
        'portfolio_analysis_beta',
        'portfolio_analysis_cvar',
        'portfolio_analysis_contributions_return',
        'portfolio_analysis_contributions_risk',
        'portfolio_analysis_correlation_spectrum',
        'portfolio_analysis_diversification_ratio',
        'portfolio_analysis_drawdowns',
        'portfolio_analysis_effective_number_of_bets',
        'portfolio_analysis_factor_exposures',
        'portfolio_analysis_efficient_frontier',
        'portfolio_analysis_minimum_variance_frontier',
        'portfolio_analysis_return',
        'portfolio_analysis_returns_average',
        'portfolio_analysis_sharpe_ratio',
        'portfolio_analysis_sharpe_ratio_bias_adjusted',
        'portfolio_analysis_sharpe_ratio_confidence_interval',
        'portfolio_analysis_sharpe_ratio_probabilistic',
        'portfolio_analysis_sharpe_ratio_minimum_track_record_length',
        'portfolio_analysis_tracking_error',
        'portfolio_analysis_ulcer_index',
        'portfolio_analysis_ulcer_performance_index',
        'portfolio_analysis_var',
        'portfolio_analysis_volatility',
        // Portfolio - Construction
        'portfolio_construction_investable',
        'portfolio_construction_mimicking',
        'portfolio_construction_random',
        // Portfolio - Optimization
        'portfolio_optimization_equal_risk_contributions',
        'portfolio_optimization_equal_sharpe_ratio_contributions',
        'portfolio_optimization_equal_volatility_weighted',
        'portfolio_optimization_equal_weighted',
        'portfolio_optimization_hierarchical_risk_parity',
        'portfolio_optimization_hierarchical_risk_parity_clustering',
        'portfolio_optimization_inverse_variance_weighted',
        'portfolio_optimization_inverse_volatility_weighted',
        'portfolio_optimization_market_cap_weighted',
        'portfolio_optimization_maximum_decorrelation',
        'portfolio_optimization_maximum_return',
        'portfolio_optimization_maximum_return_diversified',
        'portfolio_optimization_maximum_return_subset_resampling',
        'portfolio_optimization_maximum_sharpe_ratio',
        'portfolio_optimization_maximum_sharpe_ratio_diversified',
        'portfolio_optimization_maximum_sharpe_ratio_subset_resampling',
        'portfolio_optimization_maximum_ulcer_performance_index',
        'portfolio_optimization_mean_variance_efficient',
        'portfolio_optimization_mean_variance_efficient_diversified',
        'portfolio_optimization_mean_variance_efficient_subset_resampling',
        'portfolio_optimization_minimum_correlation',
        'portfolio_optimization_minimum_ulcer_index',
        'portfolio_optimization_minimum_variance',
        'portfolio_optimization_minimum_variance_diversified',
        'portfolio_optimization_minimum_variance_subset_resampling',
        'portfolio_optimization_most_diversified',
        // Portfolio - Simulation
        'portfolio_simulation_drift_weight_rebalancing',
        'portfolio_simulation_fixed_weight_rebalancing',
        'portfolio_simulation_random_weight_rebalancing',
      ],
      description: 'Portfolio Optimizer API: quantitative portfolio analysis, optimization (mean-variance, Sharpe ratio, risk parity, hierarchical risk parity, and more), asset statistics (covariance, correlation, returns), and portfolio simulation/rebalancing.',
      author: 'protectnil',
    };
  }

  get tools(): ToolDefinition[] {
    return [
      // ── Assets / Analysis ──────────────────────────────────────────────────
      {
        name: 'assets_absorption_ratio',
        description: 'Compute the absorption ratio for a set of assets — measures systemic risk by quantifying how much variance is explained by a small number of eigenvectors',
        inputSchema: {
          type: 'object',
          properties: {
            body: { type: 'object', description: 'Request body: assets (integer), assetsCovarianceMatrix (2D array)' },
          },
          required: ['body'],
        },
      },
      {
        name: 'assets_turbulence_index',
        description: 'Compute the turbulence index for assets — measures how unusual current asset returns are relative to historical patterns',
        inputSchema: {
          type: 'object',
          properties: {
            body: { type: 'object', description: 'Request body: assets, assetsAverageReturns (array), assetsCovarianceMatrix (2D array), assetsReturns (array)' },
          },
          required: ['body'],
        },
      },
      // ── Assets / Correlation ────────────────────────────────────────────────
      {
        name: 'assets_correlation_matrix',
        description: 'Compute the sample correlation matrix for a set of assets from historical returns',
        inputSchema: {
          type: 'object',
          properties: {
            body: { type: 'object', description: 'Request body: assets array with assetReturns arrays, OR assets count + assetsReturns matrix' },
          },
          required: ['body'],
        },
      },
      {
        name: 'assets_correlation_matrix_bounds',
        description: 'Compute lower and upper bounds of a correlation matrix given a partial set of known correlations',
        inputSchema: {
          type: 'object',
          properties: {
            body: { type: 'object', description: 'Request body: assets (integer), assetsCorrelationMatrix (partial 2D array with nulls)' },
          },
          required: ['body'],
        },
      },
      {
        name: 'assets_correlation_matrix_denoised',
        description: 'Compute a denoised correlation matrix using random matrix theory to remove noise from the empirical correlation matrix',
        inputSchema: {
          type: 'object',
          properties: {
            body: { type: 'object', description: 'Request body: assets, assetsCorrelationMatrix (2D array)' },
          },
          required: ['body'],
        },
      },
      {
        name: 'assets_correlation_matrix_distance',
        description: 'Compute a distance matrix from a correlation matrix, useful for hierarchical clustering of assets',
        inputSchema: {
          type: 'object',
          properties: {
            body: { type: 'object', description: 'Request body: assets, assetsCorrelationMatrix (2D array)' },
          },
          required: ['body'],
        },
      },
      {
        name: 'assets_correlation_matrix_effective_rank',
        description: 'Compute the effective rank of a correlation matrix — measures diversification potential across assets',
        inputSchema: {
          type: 'object',
          properties: {
            body: { type: 'object', description: 'Request body: assets, assetsCorrelationMatrix (2D array)' },
          },
          required: ['body'],
        },
      },
      {
        name: 'assets_correlation_matrix_informativeness',
        description: 'Compute the informativeness of a correlation matrix — quantifies how much information it contains relative to the identity matrix',
        inputSchema: {
          type: 'object',
          properties: {
            body: { type: 'object', description: 'Request body: assets, assetsCorrelationMatrix (2D array)' },
          },
          required: ['body'],
        },
      },
      {
        name: 'assets_correlation_matrix_nearest',
        description: 'Compute the nearest valid (positive semi-definite) correlation matrix to a given non-PSD matrix',
        inputSchema: {
          type: 'object',
          properties: {
            body: { type: 'object', description: 'Request body: assets, assetsCorrelationMatrix (2D array that may not be PSD)' },
          },
          required: ['body'],
        },
      },
      {
        name: 'assets_correlation_matrix_random',
        description: 'Generate a random valid correlation matrix with specified number of assets',
        inputSchema: {
          type: 'object',
          properties: {
            body: { type: 'object', description: 'Request body: assets (integer, minimum 2)' },
          },
          required: ['body'],
        },
      },
      {
        name: 'assets_correlation_matrix_shrinkage',
        description: 'Apply shrinkage to a sample correlation matrix to improve estimation accuracy (Ledoit-Wolf or Oracle estimator)',
        inputSchema: {
          type: 'object',
          properties: {
            body: { type: 'object', description: 'Request body: assets, assetsCorrelationMatrix (2D array), optional shrinkage parameters' },
          },
          required: ['body'],
        },
      },
      {
        name: 'assets_correlation_matrix_theory_implied',
        description: 'Compute a theory-implied correlation matrix based on a hierarchical tree structure of assets',
        inputSchema: {
          type: 'object',
          properties: {
            body: { type: 'object', description: 'Request body: assets, assetsCorrelationMatrix (2D array), assetsClustersHierarchyTree' },
          },
          required: ['body'],
        },
      },
      {
        name: 'assets_correlation_matrix_validation',
        description: 'Validate whether a given matrix is a valid correlation matrix (symmetric, diagonal 1s, all entries in [-1,1], PSD)',
        inputSchema: {
          type: 'object',
          properties: {
            body: { type: 'object', description: 'Request body: assets, assetsCorrelationMatrix (2D array)' },
          },
          required: ['body'],
        },
      },
      // ── Assets / Covariance ─────────────────────────────────────────────────
      {
        name: 'assets_covariance_matrix',
        description: 'Compute the sample covariance matrix for a set of assets from historical returns',
        inputSchema: {
          type: 'object',
          properties: {
            body: { type: 'object', description: 'Request body: assets array with assetReturns, OR assets count + assetsReturns matrix' },
          },
          required: ['body'],
        },
      },
      {
        name: 'assets_covariance_matrix_effective_rank',
        description: 'Compute the effective rank of an assets covariance matrix',
        inputSchema: {
          type: 'object',
          properties: {
            body: { type: 'object', description: 'Request body: assets, assetsCovarianceMatrix (2D array)' },
          },
          required: ['body'],
        },
      },
      {
        name: 'assets_covariance_matrix_ewma',
        description: 'Compute an exponentially weighted moving average (EWMA) covariance matrix, giving more weight to recent observations',
        inputSchema: {
          type: 'object',
          properties: {
            body: { type: 'object', description: 'Request body: assets array with assetReturns, optional decayFactor (lambda)' },
          },
          required: ['body'],
        },
      },
      {
        name: 'assets_covariance_matrix_validation',
        description: 'Validate whether a given matrix is a valid covariance matrix (symmetric, positive semi-definite)',
        inputSchema: {
          type: 'object',
          properties: {
            body: { type: 'object', description: 'Request body: assets, assetsCovarianceMatrix (2D array)' },
          },
          required: ['body'],
        },
      },
      // ── Assets / Statistics ─────────────────────────────────────────────────
      {
        name: 'assets_kurtosis',
        description: 'Compute the excess kurtosis of asset returns — measures fat-tail risk',
        inputSchema: {
          type: 'object',
          properties: {
            body: { type: 'object', description: 'Request body: assets array with assetReturns arrays' },
          },
          required: ['body'],
        },
      },
      {
        name: 'assets_prices_adjusted',
        description: 'Compute split- and dividend-adjusted asset prices from raw prices and corporate actions',
        inputSchema: {
          type: 'object',
          properties: {
            body: { type: 'object', description: 'Request body: assets array with assetDividends, assetSplits, assetPrices arrays' },
          },
          required: ['body'],
        },
      },
      {
        name: 'assets_prices_adjusted_forward',
        description: 'Compute forward-adjusted asset prices, anchored to the most recent price',
        inputSchema: {
          type: 'object',
          properties: {
            body: { type: 'object', description: 'Request body: assets array with assetDividends, assetSplits, assetPrices arrays' },
          },
          required: ['body'],
        },
      },
      {
        name: 'assets_returns',
        description: 'Compute arithmetic (simple) returns from a time series of asset prices',
        inputSchema: {
          type: 'object',
          properties: {
            body: { type: 'object', description: 'Request body: assets array with assetPrices arrays' },
          },
          required: ['body'],
        },
      },
      {
        name: 'assets_returns_average',
        description: 'Compute the arithmetic average return for each asset over a historical period',
        inputSchema: {
          type: 'object',
          properties: {
            body: { type: 'object', description: 'Request body: assets array with assetReturns arrays' },
          },
          required: ['body'],
        },
      },
      {
        name: 'assets_returns_simulation_bootstrap',
        description: 'Simulate future asset returns using bootstrap resampling from historical returns',
        inputSchema: {
          type: 'object',
          properties: {
            body: { type: 'object', description: 'Request body: assets array with assetReturns, simulationsCount, simulationLength' },
          },
          required: ['body'],
        },
      },
      {
        name: 'assets_skewness',
        description: 'Compute the skewness of asset returns — measures asymmetry of the return distribution',
        inputSchema: {
          type: 'object',
          properties: {
            body: { type: 'object', description: 'Request body: assets array with assetReturns arrays' },
          },
          required: ['body'],
        },
      },
      {
        name: 'assets_variance',
        description: 'Compute the variance of asset returns',
        inputSchema: {
          type: 'object',
          properties: {
            body: { type: 'object', description: 'Request body: assets array with assetReturns arrays' },
          },
          required: ['body'],
        },
      },
      {
        name: 'assets_volatility',
        description: 'Compute the volatility (standard deviation) of asset returns',
        inputSchema: {
          type: 'object',
          properties: {
            body: { type: 'object', description: 'Request body: assets array with assetReturns arrays' },
          },
          required: ['body'],
        },
      },
      // ── Factors ─────────────────────────────────────────────────────────────
      {
        name: 'factors_residualization',
        description: 'Residualize asset returns against factor returns to remove systematic factor exposures',
        inputSchema: {
          type: 'object',
          properties: {
            body: { type: 'object', description: 'Request body: assets array with assetReturns, factors array with factorReturns' },
          },
          required: ['body'],
        },
      },
      // ── Portfolio / Analysis ────────────────────────────────────────────────
      {
        name: 'portfolio_analysis_alpha',
        description: 'Compute the portfolio alpha (excess return over a benchmark) using a factor model',
        inputSchema: {
          type: 'object',
          properties: {
            body: { type: 'object', description: 'Request body: portfolioReturns (array), benchmarkReturns (array)' },
          },
          required: ['body'],
        },
      },
      {
        name: 'portfolio_analysis_beta',
        description: 'Compute the portfolio beta (sensitivity to benchmark movements)',
        inputSchema: {
          type: 'object',
          properties: {
            body: { type: 'object', description: 'Request body: portfolioReturns (array), benchmarkReturns (array)' },
          },
          required: ['body'],
        },
      },
      {
        name: 'portfolio_analysis_cvar',
        description: 'Compute the Conditional Value at Risk (CVaR / Expected Shortfall) of a portfolio',
        inputSchema: {
          type: 'object',
          properties: {
            body: { type: 'object', description: 'Request body: portfolioReturns (array), confidenceLevel (number, e.g. 0.95)' },
          },
          required: ['body'],
        },
      },
      {
        name: 'portfolio_analysis_contributions_return',
        description: 'Compute the return contribution of each asset in a portfolio',
        inputSchema: {
          type: 'object',
          properties: {
            body: { type: 'object', description: 'Request body: assets, assetsReturns (array), assetsWeights (array)' },
          },
          required: ['body'],
        },
      },
      {
        name: 'portfolio_analysis_contributions_risk',
        description: 'Compute the risk contribution of each asset in a portfolio (marginal risk contribution)',
        inputSchema: {
          type: 'object',
          properties: {
            body: { type: 'object', description: 'Request body: assets, assetsCovarianceMatrix (2D array), assetsWeights (array)' },
          },
          required: ['body'],
        },
      },
      {
        name: 'portfolio_analysis_correlation_spectrum',
        description: 'Compute the correlation spectrum of a portfolio — eigenvalue distribution of the correlation matrix',
        inputSchema: {
          type: 'object',
          properties: {
            body: { type: 'object', description: 'Request body: assets, assetsCorrelationMatrix (2D array)' },
          },
          required: ['body'],
        },
      },
      {
        name: 'portfolio_analysis_diversification_ratio',
        description: 'Compute the diversification ratio of a portfolio — ratio of weighted average volatility to portfolio volatility',
        inputSchema: {
          type: 'object',
          properties: {
            body: { type: 'object', description: 'Request body: assets, assetsCovarianceMatrix (2D array), assetsWeights (array)' },
          },
          required: ['body'],
        },
      },
      {
        name: 'portfolio_analysis_drawdowns',
        description: 'Compute the drawdowns (peak-to-trough losses) of a portfolio over time',
        inputSchema: {
          type: 'object',
          properties: {
            body: { type: 'object', description: 'Request body: portfolioValues (array of portfolio value over time)' },
          },
          required: ['body'],
        },
      },
      {
        name: 'portfolio_analysis_effective_number_of_bets',
        description: 'Compute the effective number of independent bets in a portfolio — measures true diversification',
        inputSchema: {
          type: 'object',
          properties: {
            body: { type: 'object', description: 'Request body: assets, assetsCovarianceMatrix (2D array), assetsWeights (array)' },
          },
          required: ['body'],
        },
      },
      {
        name: 'portfolio_analysis_factor_exposures',
        description: 'Compute the factor exposures (betas) of a portfolio to a set of risk factors',
        inputSchema: {
          type: 'object',
          properties: {
            body: { type: 'object', description: 'Request body: portfolioReturns (array), factors array with factorReturns' },
          },
          required: ['body'],
        },
      },
      {
        name: 'portfolio_analysis_efficient_frontier',
        description: 'Compute the mean-variance efficient frontier — set of portfolios maximizing return for each level of risk',
        inputSchema: {
          type: 'object',
          properties: {
            body: { type: 'object', description: 'Request body: assets, assetsReturns (array), assetsCovarianceMatrix (2D array), optional constraints' },
          },
          required: ['body'],
        },
      },
      {
        name: 'portfolio_analysis_minimum_variance_frontier',
        description: 'Compute the minimum variance frontier — set of portfolios with minimum variance for each level of return',
        inputSchema: {
          type: 'object',
          properties: {
            body: { type: 'object', description: 'Request body: assets, assetsCovarianceMatrix (2D array), optional constraints' },
          },
          required: ['body'],
        },
      },
      {
        name: 'portfolio_analysis_return',
        description: 'Compute the arithmetic return of a portfolio given asset weights and returns',
        inputSchema: {
          type: 'object',
          properties: {
            body: { type: 'object', description: 'Request body: assets, assetsReturns (array), assetsWeights (array)' },
          },
          required: ['body'],
        },
      },
      {
        name: 'portfolio_analysis_returns_average',
        description: 'Compute the average return of a portfolio over a historical period',
        inputSchema: {
          type: 'object',
          properties: {
            body: { type: 'object', description: 'Request body: portfolioReturns (array)' },
          },
          required: ['body'],
        },
      },
      {
        name: 'portfolio_analysis_sharpe_ratio',
        description: 'Compute the Sharpe ratio of a portfolio — risk-adjusted return measure',
        inputSchema: {
          type: 'object',
          properties: {
            body: { type: 'object', description: 'Request body: portfolioReturns (array), riskFreeRate (number, annualized)' },
          },
          required: ['body'],
        },
      },
      {
        name: 'portfolio_analysis_sharpe_ratio_bias_adjusted',
        description: 'Compute the bias-adjusted Sharpe ratio to correct for estimation bias in finite samples',
        inputSchema: {
          type: 'object',
          properties: {
            body: { type: 'object', description: 'Request body: portfolioReturns (array), riskFreeRate (number)' },
          },
          required: ['body'],
        },
      },
      {
        name: 'portfolio_analysis_sharpe_ratio_confidence_interval',
        description: 'Compute the confidence interval for the Sharpe ratio estimate',
        inputSchema: {
          type: 'object',
          properties: {
            body: { type: 'object', description: 'Request body: portfolioReturns (array), riskFreeRate (number), confidenceLevel (number)' },
          },
          required: ['body'],
        },
      },
      {
        name: 'portfolio_analysis_sharpe_ratio_probabilistic',
        description: 'Compute the probabilistic Sharpe ratio — probability that the true Sharpe ratio exceeds a benchmark',
        inputSchema: {
          type: 'object',
          properties: {
            body: { type: 'object', description: 'Request body: portfolioReturns (array), riskFreeRate (number), benchmarkSharpeRatio (number)' },
          },
          required: ['body'],
        },
      },
      {
        name: 'portfolio_analysis_sharpe_ratio_minimum_track_record_length',
        description: 'Compute the minimum track record length needed to statistically validate a Sharpe ratio',
        inputSchema: {
          type: 'object',
          properties: {
            body: { type: 'object', description: 'Request body: portfolioSharpeRatio, portfolioReturnsSkewness, portfolioReturnsKurtosis, confidenceLevel, benchmarkSharpeRatio' },
          },
          required: ['body'],
        },
      },
      {
        name: 'portfolio_analysis_tracking_error',
        description: 'Compute the tracking error of a portfolio relative to a benchmark',
        inputSchema: {
          type: 'object',
          properties: {
            body: { type: 'object', description: 'Request body: portfolioReturns (array), benchmarkReturns (array)' },
          },
          required: ['body'],
        },
      },
      {
        name: 'portfolio_analysis_ulcer_index',
        description: 'Compute the Ulcer Index — measures downside risk by penalizing deep and prolonged drawdowns',
        inputSchema: {
          type: 'object',
          properties: {
            body: { type: 'object', description: 'Request body: portfolioValues (array)' },
          },
          required: ['body'],
        },
      },
      {
        name: 'portfolio_analysis_ulcer_performance_index',
        description: 'Compute the Ulcer Performance Index (UPI / Martin Ratio) — return-to-Ulcer-Index ratio',
        inputSchema: {
          type: 'object',
          properties: {
            body: { type: 'object', description: 'Request body: portfolioReturns (array), riskFreeRate (number)' },
          },
          required: ['body'],
        },
      },
      {
        name: 'portfolio_analysis_var',
        description: 'Compute the Value at Risk (VaR) of a portfolio at a given confidence level',
        inputSchema: {
          type: 'object',
          properties: {
            body: { type: 'object', description: 'Request body: portfolioReturns (array), confidenceLevel (number, e.g. 0.95)' },
          },
          required: ['body'],
        },
      },
      {
        name: 'portfolio_analysis_volatility',
        description: 'Compute the volatility (annualized standard deviation) of a portfolio',
        inputSchema: {
          type: 'object',
          properties: {
            body: { type: 'object', description: 'Request body: portfolioReturns (array), optional annualizationFactor' },
          },
          required: ['body'],
        },
      },
      // ── Portfolio / Construction ─────────────────────────────────────────────
      {
        name: 'portfolio_construction_investable',
        description: 'Round portfolio weights to comply with lot-size constraints while minimizing deviation from target weights',
        inputSchema: {
          type: 'object',
          properties: {
            body: { type: 'object', description: 'Request body: assets, assetsWeights (target weights), assetsPrices (array), portfolioValue (number)' },
          },
          required: ['body'],
        },
      },
      {
        name: 'portfolio_construction_mimicking',
        description: 'Construct a sparse portfolio that mimics a target portfolio using fewer assets',
        inputSchema: {
          type: 'object',
          properties: {
            body: { type: 'object', description: 'Request body: assets, assetsReturns, targetPortfolioWeights, optional number of assets in mimicking portfolio' },
          },
          required: ['body'],
        },
      },
      {
        name: 'portfolio_construction_random',
        description: 'Generate one or more random long-only portfolio weight vectors summing to 1',
        inputSchema: {
          type: 'object',
          properties: {
            body: { type: 'object', description: 'Request body: assets (integer), optional portfoliosCount, optional constraints (min/max weights per asset)' },
          },
          required: ['body'],
        },
      },
      // ── Portfolio / Optimization ─────────────────────────────────────────────
      {
        name: 'portfolio_optimization_equal_risk_contributions',
        description: 'Compute the equal risk contributions (ERC) portfolio where each asset contributes equally to total portfolio risk',
        inputSchema: {
          type: 'object',
          properties: {
            body: { type: 'object', description: 'Request body: assets, assetsCovarianceMatrix (2D array), optional constraints' },
          },
          required: ['body'],
        },
      },
      {
        name: 'portfolio_optimization_equal_sharpe_ratio_contributions',
        description: 'Compute the portfolio where each asset contributes equally to the total Sharpe ratio',
        inputSchema: {
          type: 'object',
          properties: {
            body: { type: 'object', description: 'Request body: assets, assetsReturns (array), assetsCovarianceMatrix (2D array), riskFreeRate' },
          },
          required: ['body'],
        },
      },
      {
        name: 'portfolio_optimization_equal_volatility_weighted',
        description: 'Compute the equal volatility weighted portfolio — inverse of each asset\'s volatility as weight',
        inputSchema: {
          type: 'object',
          properties: {
            body: { type: 'object', description: 'Request body: assets, assetsVolatilities (array), optional constraints' },
          },
          required: ['body'],
        },
      },
      {
        name: 'portfolio_optimization_equal_weighted',
        description: 'Compute the equal weighted (1/N) portfolio — uniform allocation across all assets',
        inputSchema: {
          type: 'object',
          properties: {
            body: { type: 'object', description: 'Request body: assets (integer)' },
          },
          required: ['body'],
        },
      },
      {
        name: 'portfolio_optimization_hierarchical_risk_parity',
        description: 'Compute the hierarchical risk parity (HRP) portfolio using hierarchical clustering of assets',
        inputSchema: {
          type: 'object',
          properties: {
            body: { type: 'object', description: 'Request body: assets, assetsCovarianceMatrix (2D array), optional assetsCorrelationMatrix, linkageMethod' },
          },
          required: ['body'],
        },
      },
      {
        name: 'portfolio_optimization_hierarchical_risk_parity_clustering',
        description: 'Compute the hierarchical clustering-based risk parity portfolio with explicit cluster assignments',
        inputSchema: {
          type: 'object',
          properties: {
            body: { type: 'object', description: 'Request body: assets, assetsCovarianceMatrix, assetsClusters array' },
          },
          required: ['body'],
        },
      },
      {
        name: 'portfolio_optimization_inverse_variance_weighted',
        description: 'Compute the inverse variance weighted portfolio — weights proportional to 1/variance',
        inputSchema: {
          type: 'object',
          properties: {
            body: { type: 'object', description: 'Request body: assets, assetsVariances (array), optional constraints' },
          },
          required: ['body'],
        },
      },
      {
        name: 'portfolio_optimization_inverse_volatility_weighted',
        description: 'Compute the inverse volatility weighted portfolio — weights proportional to 1/volatility',
        inputSchema: {
          type: 'object',
          properties: {
            body: { type: 'object', description: 'Request body: assets, assetsVolatilities (array), optional constraints' },
          },
          required: ['body'],
        },
      },
      {
        name: 'portfolio_optimization_market_cap_weighted',
        description: 'Compute the market capitalization weighted portfolio — weights proportional to each asset\'s market cap',
        inputSchema: {
          type: 'object',
          properties: {
            body: { type: 'object', description: 'Request body: assets, assetsMarketCapitalizations (array), optional constraints' },
          },
          required: ['body'],
        },
      },
      {
        name: 'portfolio_optimization_maximum_decorrelation',
        description: 'Compute the maximum decorrelation portfolio — minimizes average pairwise correlation between assets',
        inputSchema: {
          type: 'object',
          properties: {
            body: { type: 'object', description: 'Request body: assets, assetsCorrelationMatrix (2D array), optional constraints' },
          },
          required: ['body'],
        },
      },
      {
        name: 'portfolio_optimization_maximum_return',
        description: 'Compute the maximum return portfolio subject to a risk or weight constraint',
        inputSchema: {
          type: 'object',
          properties: {
            body: { type: 'object', description: 'Request body: assets, assetsReturns (array), optional constraints (maxPortfolioVolatility, assetsWeights bounds)' },
          },
          required: ['body'],
        },
      },
      {
        name: 'portfolio_optimization_maximum_return_diversified',
        description: 'Compute the diversified maximum return portfolio using subset resampling',
        inputSchema: {
          type: 'object',
          properties: {
            body: { type: 'object', description: 'Request body: assets, assetsReturns, assetsCovarianceMatrix, optional constraints' },
          },
          required: ['body'],
        },
      },
      {
        name: 'portfolio_optimization_maximum_return_subset_resampling',
        description: 'Compute the maximum return portfolio using subset resampling to improve robustness',
        inputSchema: {
          type: 'object',
          properties: {
            body: { type: 'object', description: 'Request body: assets, assetsReturns, assetsCovarianceMatrix, subsetSize, subsetsNumber' },
          },
          required: ['body'],
        },
      },
      {
        name: 'portfolio_optimization_maximum_sharpe_ratio',
        description: 'Compute the maximum Sharpe ratio (tangency) portfolio — highest risk-adjusted return',
        inputSchema: {
          type: 'object',
          properties: {
            body: { type: 'object', description: 'Request body: assets, assetsReturns (array), assetsCovarianceMatrix (2D array), riskFreeRate (number), optional constraints' },
          },
          required: ['body'],
        },
      },
      {
        name: 'portfolio_optimization_maximum_sharpe_ratio_diversified',
        description: 'Compute the diversified maximum Sharpe ratio portfolio',
        inputSchema: {
          type: 'object',
          properties: {
            body: { type: 'object', description: 'Request body: assets, assetsReturns, assetsCovarianceMatrix, riskFreeRate, optional constraints' },
          },
          required: ['body'],
        },
      },
      {
        name: 'portfolio_optimization_maximum_sharpe_ratio_subset_resampling',
        description: 'Compute the maximum Sharpe ratio portfolio using subset resampling for robustness',
        inputSchema: {
          type: 'object',
          properties: {
            body: { type: 'object', description: 'Request body: assets, assetsReturns, assetsCovarianceMatrix, riskFreeRate, subsetSize, subsetsNumber' },
          },
          required: ['body'],
        },
      },
      {
        name: 'portfolio_optimization_maximum_ulcer_performance_index',
        description: 'Compute the portfolio that maximizes the Ulcer Performance Index (UPI)',
        inputSchema: {
          type: 'object',
          properties: {
            body: { type: 'object', description: 'Request body: assets, assetsReturns matrix (time x assets), riskFreeRate, optional constraints' },
          },
          required: ['body'],
        },
      },
      {
        name: 'portfolio_optimization_mean_variance_efficient',
        description: 'Compute a mean-variance efficient portfolio for a specified target return or risk',
        inputSchema: {
          type: 'object',
          properties: {
            body: { type: 'object', description: 'Request body: assets, assetsReturns (array), assetsCovarianceMatrix, targetPortfolioReturn or targetPortfolioVolatility' },
          },
          required: ['body'],
        },
      },
      {
        name: 'portfolio_optimization_mean_variance_efficient_diversified',
        description: 'Compute a diversified mean-variance efficient portfolio',
        inputSchema: {
          type: 'object',
          properties: {
            body: { type: 'object', description: 'Request body: assets, assetsReturns, assetsCovarianceMatrix, targetPortfolioReturn or targetPortfolioVolatility' },
          },
          required: ['body'],
        },
      },
      {
        name: 'portfolio_optimization_mean_variance_efficient_subset_resampling',
        description: 'Compute a mean-variance efficient portfolio using subset resampling for improved out-of-sample performance',
        inputSchema: {
          type: 'object',
          properties: {
            body: { type: 'object', description: 'Request body: assets, assetsReturns, assetsCovarianceMatrix, subsetSize, subsetsNumber, optional target' },
          },
          required: ['body'],
        },
      },
      {
        name: 'portfolio_optimization_minimum_correlation',
        description: 'Compute the minimum correlation portfolio — minimizes average pairwise asset correlation',
        inputSchema: {
          type: 'object',
          properties: {
            body: { type: 'object', description: 'Request body: assets, assetsCorrelationMatrix (2D array), optional constraints' },
          },
          required: ['body'],
        },
      },
      {
        name: 'portfolio_optimization_minimum_ulcer_index',
        description: 'Compute the portfolio that minimizes the Ulcer Index (minimizes drawdown risk)',
        inputSchema: {
          type: 'object',
          properties: {
            body: { type: 'object', description: 'Request body: assets, assetsReturns matrix (time x assets), optional constraints' },
          },
          required: ['body'],
        },
      },
      {
        name: 'portfolio_optimization_minimum_variance',
        description: 'Compute the global minimum variance portfolio — lowest possible portfolio volatility',
        inputSchema: {
          type: 'object',
          properties: {
            body: { type: 'object', description: 'Request body: assets, assetsCovarianceMatrix (2D array), optional constraints (min/max weights)' },
          },
          required: ['body'],
        },
      },
      {
        name: 'portfolio_optimization_minimum_variance_diversified',
        description: 'Compute the diversified minimum variance portfolio using subset resampling',
        inputSchema: {
          type: 'object',
          properties: {
            body: { type: 'object', description: 'Request body: assets, assetsCovarianceMatrix, optional constraints' },
          },
          required: ['body'],
        },
      },
      {
        name: 'portfolio_optimization_minimum_variance_subset_resampling',
        description: 'Compute the minimum variance portfolio using subset resampling for out-of-sample robustness',
        inputSchema: {
          type: 'object',
          properties: {
            body: { type: 'object', description: 'Request body: assets, assetsCovarianceMatrix, subsetSize, subsetsNumber' },
          },
          required: ['body'],
        },
      },
      {
        name: 'portfolio_optimization_most_diversified',
        description: 'Compute the most diversified portfolio — maximizes the diversification ratio',
        inputSchema: {
          type: 'object',
          properties: {
            body: { type: 'object', description: 'Request body: assets, assetsCovarianceMatrix (2D array), optional constraints' },
          },
          required: ['body'],
        },
      },
      // ── Portfolio / Simulation ───────────────────────────────────────────────
      {
        name: 'portfolio_simulation_drift_weight_rebalancing',
        description: 'Simulate portfolio value over time with drift-weight rebalancing (weights drift with returns between rebalancing dates)',
        inputSchema: {
          type: 'object',
          properties: {
            body: { type: 'object', description: 'Request body: assets, assetsReturns matrix, rebalancingDates (array of period indices), assetsWeights (array per rebalancing date)' },
          },
          required: ['body'],
        },
      },
      {
        name: 'portfolio_simulation_fixed_weight_rebalancing',
        description: 'Simulate portfolio value over time with fixed-weight rebalancing (portfolio reset to target weights on each rebalancing date)',
        inputSchema: {
          type: 'object',
          properties: {
            body: { type: 'object', description: 'Request body: assets, assetsReturns matrix, rebalancingDates (array), assetsWeights (array)' },
          },
          required: ['body'],
        },
      },
      {
        name: 'portfolio_simulation_random_weight_rebalancing',
        description: 'Simulate portfolio value over time using random weight rebalancing — Monte Carlo portfolio simulation',
        inputSchema: {
          type: 'object',
          properties: {
            body: { type: 'object', description: 'Request body: assets, assetsReturns matrix, rebalancingDates (array), portfoliosCount, optional constraints' },
          },
          required: ['body'],
        },
      },
    ];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    try {
      const routeMap: Record<string, string> = {
        // Assets / Analysis
        'assets_absorption_ratio':                                    '/assets/analysis/absorption-ratio',
        'assets_turbulence_index':                                    '/assets/analysis/turbulence-index',
        // Assets / Correlation
        'assets_correlation_matrix':                                  '/assets/correlation/matrix',
        'assets_correlation_matrix_bounds':                           '/assets/correlation/matrix/bounds',
        'assets_correlation_matrix_denoised':                         '/assets/correlation/matrix/denoised',
        'assets_correlation_matrix_distance':                         '/assets/correlation/matrix/distance',
        'assets_correlation_matrix_effective_rank':                   '/assets/correlation/matrix/effective-rank',
        'assets_correlation_matrix_informativeness':                  '/assets/correlation/matrix/informativeness',
        'assets_correlation_matrix_nearest':                          '/assets/correlation/matrix/nearest',
        'assets_correlation_matrix_random':                           '/assets/correlation/matrix/random',
        'assets_correlation_matrix_shrinkage':                        '/assets/correlation/matrix/shrinkage',
        'assets_correlation_matrix_theory_implied':                   '/assets/correlation/matrix/theory-implied',
        'assets_correlation_matrix_validation':                       '/assets/correlation/matrix/validation',
        // Assets / Covariance
        'assets_covariance_matrix':                                   '/assets/covariance/matrix',
        'assets_covariance_matrix_effective_rank':                    '/assets/covariance/matrix/effective-rank',
        'assets_covariance_matrix_ewma':                              '/assets/covariance/matrix/exponentially-weighted',
        'assets_covariance_matrix_validation':                        '/assets/covariance/matrix/validation',
        // Assets / Statistics
        'assets_kurtosis':                                            '/assets/kurtosis',
        'assets_prices_adjusted':                                     '/assets/prices/adjusted',
        'assets_prices_adjusted_forward':                             '/assets/prices/adjusted/forward',
        'assets_returns':                                             '/assets/returns',
        'assets_returns_average':                                     '/assets/returns/average',
        'assets_returns_simulation_bootstrap':                        '/assets/returns/simulation/bootstrap',
        'assets_skewness':                                            '/assets/skewness',
        'assets_variance':                                            '/assets/variance',
        'assets_volatility':                                          '/assets/volatility',
        // Factors
        'factors_residualization':                                    '/factors/residualization',
        // Portfolio / Analysis
        'portfolio_analysis_alpha':                                   '/portfolio/analysis/alpha',
        'portfolio_analysis_beta':                                    '/portfolio/analysis/beta',
        'portfolio_analysis_cvar':                                    '/portfolio/analysis/conditional-value-at-risk',
        'portfolio_analysis_contributions_return':                    '/portfolio/analysis/contributions/return',
        'portfolio_analysis_contributions_risk':                      '/portfolio/analysis/contributions/risk',
        'portfolio_analysis_correlation_spectrum':                    '/portfolio/analysis/correlation-spectrum',
        'portfolio_analysis_diversification_ratio':                   '/portfolio/analysis/diversification-ratio',
        'portfolio_analysis_drawdowns':                               '/portfolio/analysis/drawdowns',
        'portfolio_analysis_effective_number_of_bets':                '/portfolio/analysis/effective-number-of-bets',
        'portfolio_analysis_factor_exposures':                        '/portfolio/analysis/factors/exposures',
        'portfolio_analysis_efficient_frontier':                      '/portfolio/analysis/mean-variance/efficient-frontier',
        'portfolio_analysis_minimum_variance_frontier':               '/portfolio/analysis/mean-variance/minimum-variance-frontier',
        'portfolio_analysis_return':                                  '/portfolio/analysis/return',
        'portfolio_analysis_returns_average':                         '/portfolio/analysis/returns/average',
        'portfolio_analysis_sharpe_ratio':                            '/portfolio/analysis/sharpe-ratio',
        'portfolio_analysis_sharpe_ratio_bias_adjusted':              '/portfolio/analysis/sharpe-ratio/bias-adjusted',
        'portfolio_analysis_sharpe_ratio_confidence_interval':        '/portfolio/analysis/sharpe-ratio/confidence-interval',
        'portfolio_analysis_sharpe_ratio_probabilistic':              '/portfolio/analysis/sharpe-ratio/probabilistic',
        'portfolio_analysis_sharpe_ratio_minimum_track_record_length':'/portfolio/analysis/sharpe-ratio/probabilistic/minimum-track-record-length',
        'portfolio_analysis_tracking_error':                          '/portfolio/analysis/tracking-error',
        'portfolio_analysis_ulcer_index':                             '/portfolio/analysis/ulcer-index',
        'portfolio_analysis_ulcer_performance_index':                 '/portfolio/analysis/ulcer-performance-index',
        'portfolio_analysis_var':                                     '/portfolio/analysis/value-at-risk',
        'portfolio_analysis_volatility':                              '/portfolio/analysis/volatility',
        // Portfolio / Construction
        'portfolio_construction_investable':                          '/portfolio/construction/investable',
        'portfolio_construction_mimicking':                           '/portfolio/construction/mimicking',
        'portfolio_construction_random':                              '/portfolio/construction/random',
        // Portfolio / Optimization
        'portfolio_optimization_equal_risk_contributions':            '/portfolio/optimization/equal-risk-contributions',
        'portfolio_optimization_equal_sharpe_ratio_contributions':    '/portfolio/optimization/equal-sharpe-ratio-contributions',
        'portfolio_optimization_equal_volatility_weighted':           '/portfolio/optimization/equal-volatility-weighted',
        'portfolio_optimization_equal_weighted':                      '/portfolio/optimization/equal-weighted',
        'portfolio_optimization_hierarchical_risk_parity':            '/portfolio/optimization/hierarchical-risk-parity',
        'portfolio_optimization_hierarchical_risk_parity_clustering': '/portfolio/optimization/hierarchical-risk-parity/clustering-based',
        'portfolio_optimization_inverse_variance_weighted':           '/portfolio/optimization/inverse-variance-weighted',
        'portfolio_optimization_inverse_volatility_weighted':         '/portfolio/optimization/inverse-volatility-weighted',
        'portfolio_optimization_market_cap_weighted':                 '/portfolio/optimization/market-capitalization-weighted',
        'portfolio_optimization_maximum_decorrelation':               '/portfolio/optimization/maximum-decorrelation',
        'portfolio_optimization_maximum_return':                      '/portfolio/optimization/maximum-return',
        'portfolio_optimization_maximum_return_diversified':          '/portfolio/optimization/maximum-return/diversified',
        'portfolio_optimization_maximum_return_subset_resampling':    '/portfolio/optimization/maximum-return/subset-resampling-based',
        'portfolio_optimization_maximum_sharpe_ratio':                '/portfolio/optimization/maximum-sharpe-ratio',
        'portfolio_optimization_maximum_sharpe_ratio_diversified':    '/portfolio/optimization/maximum-sharpe-ratio/diversified',
        'portfolio_optimization_maximum_sharpe_ratio_subset_resampling': '/portfolio/optimization/maximum-sharpe-ratio/subset-resampling-based',
        'portfolio_optimization_maximum_ulcer_performance_index':     '/portfolio/optimization/maximum-ulcer-performance-index',
        'portfolio_optimization_mean_variance_efficient':             '/portfolio/optimization/mean-variance-efficient',
        'portfolio_optimization_mean_variance_efficient_diversified': '/portfolio/optimization/mean-variance-efficient/diversified',
        'portfolio_optimization_mean_variance_efficient_subset_resampling': '/portfolio/optimization/mean-variance-efficient/subset-resampling-based',
        'portfolio_optimization_minimum_correlation':                 '/portfolio/optimization/minimum-correlation',
        'portfolio_optimization_minimum_ulcer_index':                 '/portfolio/optimization/minimum-ulcer-index',
        'portfolio_optimization_minimum_variance':                    '/portfolio/optimization/minimum-variance',
        'portfolio_optimization_minimum_variance_diversified':        '/portfolio/optimization/minimum-variance/diversified',
        'portfolio_optimization_minimum_variance_subset_resampling':  '/portfolio/optimization/minimum-variance/subset-resampling-based',
        'portfolio_optimization_most_diversified':                    '/portfolio/optimization/most-diversified',
        // Portfolio / Simulation
        'portfolio_simulation_drift_weight_rebalancing':              '/portfolio/simulation/rebalancing/drift-weight',
        'portfolio_simulation_fixed_weight_rebalancing':              '/portfolio/simulation/rebalancing/fixed-weight',
        'portfolio_simulation_random_weight_rebalancing':             '/portfolio/simulation/rebalancing/random-weight',
      };

      const path = routeMap[name];
      if (!path) {
        return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
      }
      return this.postJson(path, args.body as Record<string, unknown>);
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Tool execution failed: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true,
      };
    }
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private async postJson(path: string, body: Record<string, unknown> | undefined): Promise<ToolResult> {
    if (!body || typeof body !== 'object') {
      return { content: [{ type: 'text', text: 'body object is required' }], isError: true };
    }
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    if (this.apiKey) headers['X-API-Key'] = this.apiKey;

    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText);
      return {
        content: [{ type: 'text', text: `API error: ${response.status} ${errText}` }],
        isError: true,
      };
    }
    const data = await response.json();
    return { content: [{ type: 'text', text: this.truncate(data) }], isError: false };
  }
}
