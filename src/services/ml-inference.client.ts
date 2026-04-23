/**
 * CargoBit ML Inference Client
 * 
 * TypeScript client for calling the ml-inference service.
 * Used by matching-ml.service.ts for real-time predictions.
 * 
 * Features:
 * - Canary routing support (modelVersion = null triggers routing)
 * - Full response with model version and routing decision
 * - Health check with canary configuration
 * 
 * Python equivalent:
 * ```python
 * def call_ml_score(features: dict) -> float:
 *     r = requests.post(
 *         "http://ml-inference-svc/score",
 *         json={"features": features},  # Version empty = Routing
 *         timeout=0.2,
 *     )
 *     r.raise_for_status()
 *     body = r.json()
 *     # body["modelVersion"] kannst du im Log/Feature-Store mitführen
 *     return body["scoreMl"]
 * ```
 */

// ============================================
// TYPES
// ============================================

export interface ScoreRequest {
  modelVersion?: string | null;  // null = use canary routing
  features: Record<string, number>;
  jobId?: string;                // For logging
  transporterId?: string;        // For logging
}

export interface ScoreResponse {
  scoreMl: number;
  modelVersion: string;
  routing: 'stable' | 'canary' | 'explicit';
}

export interface HealthResponse {
  status: string;
  stableVersion: string;
  canaryVersion: string | null;
  canaryTraffic: number;
  loadedModels: string[];
}

export interface RegistryResponse {
  stable: string;
  canary: string | null;
  canaryTraffic: number;
  models: string[];
}

export interface UpdateRegistryRequest {
  stable?: string;
  canary?: string;
  canaryTraffic?: number;
}

export interface InferenceLog {
  ts: string;
  modelVersion: string;
  score: number;
  jobId: string | null;
  transporterId: string | null;
  label: string | null;
}

// ============================================
// CONFIGURATION
// ============================================

const ML_INFERENCE_URL = process.env.ML_INFERENCE_URL || 'http://localhost:8080';
const DEFAULT_TIMEOUT = 200; // 200ms as per Python spec

// ============================================
// ML INFERENCE CLIENT
// ============================================

/**
 * Call the ML inference service to get a score.
 * 
 * If modelVersion is null/undefined, canary routing is applied:
 * - 90% traffic → stable model
 * - 10% traffic → canary model (configurable)
 * 
 * @param features - Feature vector (11 features)
 * @param modelVersion - null for canary routing, or specific version
 * @param context - Optional context for logging (jobId, transporterId)
 * @returns ML score between 0 and 1
 */
export async function callMlScore(
  features: Record<string, number>,
  modelVersion?: string | null,
  context?: { jobId?: string; transporterId?: string }
): Promise<number> {
  const response = await fetch(`${ML_INFERENCE_URL}/score`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      modelVersion: modelVersion ?? null,
      features,
      jobId: context?.jobId,
      transporterId: context?.transporterId,
    } as ScoreRequest),
    signal: AbortSignal.timeout(DEFAULT_TIMEOUT),
  });

  if (!response.ok) {
    throw new Error(`ML inference failed: ${response.status} ${response.statusText}`);
  }

  const data: ScoreResponse = await response.json();
  return data.scoreMl;
}

/**
 * Call ML inference with full response including model version and routing.
 * 
 * Use this when you need to:
 * - Log which model version was used
 * - Track canary vs stable routing decisions
 * - Debug A/B test results
 * 
 * @param features - Feature vector (11 features)
 * @param modelVersion - null for canary routing, or specific version
 * @param context - Optional context for logging (jobId, transporterId)
 * @returns Full response with score, version, and routing decision
 */
export async function callMlScoreWithVersion(
  features: Record<string, number>,
  modelVersion?: string | null,
  context?: { jobId?: string; transporterId?: string }
): Promise<ScoreResponse> {
  const response = await fetch(`${ML_INFERENCE_URL}/score`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      modelVersion: modelVersion ?? null,
      features,
      jobId: context?.jobId,
      transporterId: context?.transporterId,
    } as ScoreRequest),
    signal: AbortSignal.timeout(DEFAULT_TIMEOUT),
  });

  if (!response.ok) {
    throw new Error(`ML inference failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Check ML inference service health.
 * 
 * Returns:
 * - stableVersion: Current stable model
 * - canaryVersion: Current canary model (may be null)
 * - canaryTraffic: Percentage of traffic to canary (0.0 - 1.0)
 * - loadedModels: Models currently in memory
 */
export async function checkMlHealth(): Promise<HealthResponse> {
  const response = await fetch(`${ML_INFERENCE_URL}/health`, {
    signal: AbortSignal.timeout(5000),
  });

  if (!response.ok) {
    throw new Error(`ML health check failed: ${response.status}`);
  }

  return response.json();
}

/**
 * Get current registry configuration.
 */
export async function getRegistry(): Promise<RegistryResponse> {
  const response = await fetch(`${ML_INFERENCE_URL}/registry`, {
    signal: AbortSignal.timeout(5000),
  });

  if (!response.ok) {
    throw new Error(`Failed to get registry: ${response.status}`);
  }

  return response.json();
}

/**
 * Update registry configuration.
 * 
 * Use this for canary rollouts:
 * 1. Set canary to new version
 * 2. Gradually increase canaryTraffic
 * 3. When satisfied, set stable = canary and canaryTraffic = 0
 */
export async function updateRegistry(
  updates: UpdateRegistryRequest
): Promise<RegistryResponse> {
  const response = await fetch(`${ML_INFERENCE_URL}/registry`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
    signal: AbortSignal.timeout(5000),
  });

  if (!response.ok) {
    throw new Error(`Failed to update registry: ${response.status}`);
  }

  return response.json();
}

/**
 * List available models.
 */
export async function listModels(): Promise<{
  stable: string;
  canary: string | null;
  canaryTraffic: number;
  available: string[];
  loaded: string[];
}> {
  const response = await fetch(`${ML_INFERENCE_URL}/models`, {
    signal: AbortSignal.timeout(5000),
  });

  if (!response.ok) {
    throw new Error(`Failed to list models: ${response.status}`);
  }

  return response.json();
}

/**
 * Get recent inference logs.
 */
export async function getInferenceLogs(limit: number = 100): Promise<{
  count: number;
  logs: InferenceLog[];
}> {
  const response = await fetch(`${ML_INFERENCE_URL}/logs?limit=${limit}`, {
    signal: AbortSignal.timeout(5000),
  });

  if (!response.ok) {
    throw new Error(`Failed to get logs: ${response.status}`);
  }

  return response.json();
}

/**
 * Load a model into cache.
 */
export async function loadModel(version: string): Promise<{ status: string; version: string }> {
  const response = await fetch(`${ML_INFERENCE_URL}/models/${version}/load`, {
    method: 'POST',
    signal: AbortSignal.timeout(30000), // 30s for model loading
  });

  if (!response.ok) {
    throw new Error(`Failed to load model ${version}: ${response.status}`);
  }

  return response.json();
}

/**
 * Unload a model from cache.
 */
export async function unloadModel(version: string): Promise<{ status: string; version: string }> {
  const response = await fetch(`${ML_INFERENCE_URL}/models/${version}/unload`, {
    method: 'DELETE',
    signal: AbortSignal.timeout(5000),
  });

  if (!response.ok) {
    throw new Error(`Failed to unload model ${version}: ${response.status}`);
  }

  return response.json();
}

/**
 * Get Prometheus-style metrics.
 */
export async function getMetrics(): Promise<string> {
  const response = await fetch(`${ML_INFERENCE_URL}/metrics`, {
    signal: AbortSignal.timeout(5000),
  });

  if (!response.ok) {
    throw new Error(`Failed to get metrics: ${response.status}`);
  }

  return response.text();
}

// ============================================
// EXPORT
// ============================================

export const mlInferenceClient = {
  callMlScore,
  callMlScoreWithVersion,
  checkMlHealth,
  getRegistry,
  updateRegistry,
  listModels,
  getInferenceLogs,
  loadModel,
  unloadModel,
  getMetrics,
};
