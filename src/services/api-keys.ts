// API Key Management Service
// Stores user's personal API keys in localStorage (encrypted in browser)

export interface ApiKeyConfig {
  anthropic?: string;
  speechmatics?: string;
  azureSpeech?: {
    key: string;
    region: string;
  };
}

export interface ApiCostEstimate {
  anthropic: {
    inputCostPer1M: number; // USD per 1M tokens
    outputCostPer1M: number;
    estimatedMonthly: string;
  };
  speechmatics: {
    costPerHour: number; // USD per hour
    estimatedMonthly: string;
  };
  azureSpeech: {
    costPerHour: number;
    estimatedMonthly: string;
  };
}

const STORAGE_KEY = 'prio_api_keys';
const USAGE_TRACKING_KEY = 'prio_api_usage';

// Cost estimates (as of 2025)
export const API_COSTS: ApiCostEstimate = {
  anthropic: {
    inputCostPer1M: 3.00, // Claude 3.5 Sonnet
    outputCostPer1M: 15.00,
    estimatedMonthly: '~$5-20/månad för normal användning',
  },
  speechmatics: {
    costPerHour: 0.03, // Real-time STT
    estimatedMonthly: '~$2-10/månad beroende på användning',
  },
  azureSpeech: {
    costPerHour: 1.00, // TTS standard
    estimatedMonthly: '~$1-5/månad för normalt bruk',
  },
};

export function getApiKeys(): ApiKeyConfig {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return {};
    }
  }
  return {};
}

export function saveApiKeys(config: ApiKeyConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function deleteApiKeys(): void {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(USAGE_TRACKING_KEY);
}

export function hasApiKey(service: 'anthropic' | 'speechmatics' | 'azureSpeech'): boolean {
  const keys = getApiKeys();
  if (service === 'azureSpeech') {
    return !!(keys.azureSpeech?.key && keys.azureSpeech?.region);
  }
  return !!keys[service];
}

export function getApiKeyForService(service: 'anthropic' | 'speechmatics'): string | undefined {
  const keys = getApiKeys();
  return keys[service];
}

export function getAzureSpeechConfig(): { key: string; region: string } | undefined {
  const keys = getApiKeys();
  return keys.azureSpeech;
}

// Track usage for cost estimation
interface UsageStats {
  anthropic: {
    inputTokens: number;
    outputTokens: number;
    lastReset: string;
  };
  speechmatics: {
    minutesUsed: number;
    lastReset: string;
  };
  azureSpeech: {
    minutesUsed: number;
    lastReset: string;
  };
}

export function getUsageStats(): UsageStats {
  const stored = localStorage.getItem(USAGE_TRACKING_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return createEmptyUsageStats();
    }
  }
  return createEmptyUsageStats();
}

function createEmptyUsageStats(): UsageStats {
  const now = new Date().toISOString();
  return {
    anthropic: { inputTokens: 0, outputTokens: 0, lastReset: now },
    speechmatics: { minutesUsed: 0, lastReset: now },
    azureSpeech: { minutesUsed: 0, lastReset: now },
  };
}

export function saveUsageStats(stats: UsageStats): void {
  localStorage.setItem(USAGE_TRACKING_KEY, JSON.stringify(stats));
}

export function trackAnthropicUsage(inputTokens: number, outputTokens: number): void {
  const stats = getUsageStats();
  stats.anthropic.inputTokens += inputTokens;
  stats.anthropic.outputTokens += outputTokens;
  saveUsageStats(stats);
}

export function trackSpeechUsage(service: 'speechmatics' | 'azureSpeech', minutes: number): void {
  const stats = getUsageStats();
  stats[service].minutesUsed += minutes;
  saveUsageStats(stats);
}

export function calculateMonthlyCost(stats: UsageStats): {
  anthropic: number;
  speechmatics: number;
  azureSpeech: number;
  total: number;
} {
  const anthropicCost =
    (stats.anthropic.inputTokens / 1_000_000) * API_COSTS.anthropic.inputCostPer1M +
    (stats.anthropic.outputTokens / 1_000_000) * API_COSTS.anthropic.outputCostPer1M;

  const speechmaticsCost = (stats.speechmatics.minutesUsed / 60) * API_COSTS.speechmatics.costPerHour;
  const azureCost = (stats.azureSpeech.minutesUsed / 60) * API_COSTS.azureSpeech.costPerHour;

  return {
    anthropic: anthropicCost,
    speechmatics: speechmaticsCost,
    azureSpeech: azureCost,
    total: anthropicCost + speechmaticsCost + azureCost,
  };
}

export function resetUsageStats(): void {
  saveUsageStats(createEmptyUsageStats());
}
