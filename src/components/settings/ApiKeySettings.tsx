import { useState, useEffect } from 'react';
import { Key, DollarSign, Info, Eye, EyeOff, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import {
  getApiKeys,
  saveApiKeys,
  deleteApiKeys,
  hasApiKey,
  getUsageStats,
  calculateMonthlyCost,
  resetUsageStats,
  API_COSTS,
  ApiKeyConfig,
} from '@/services/api-keys';
import { toast } from 'react-hot-toast';

export function ApiKeySettings() {
  const [apiKeys, setApiKeys] = useState<ApiKeyConfig>(getApiKeys());
  const [showKeys, setShowKeys] = useState({
    anthropic: false,
    speechmatics: false,
    azureSpeech: false,
  });
  const [monthlyCost, setMonthlyCost] = useState(calculateMonthlyCost(getUsageStats()));

  useEffect(() => {
    // Update cost calculation every minute
    const interval = setInterval(() => {
      setMonthlyCost(calculateMonthlyCost(getUsageStats()));
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const handleSaveKey = (service: 'anthropic' | 'speechmatics', value: string) => {
    const newKeys = { ...apiKeys, [service]: value.trim() };
    setApiKeys(newKeys);
    saveApiKeys(newKeys);
    toast.success(`${service === 'anthropic' ? 'Claude API' : 'Speechmatics'} nyckel sparad`);
  };

  const handleSaveAzureKey = (key: string, region: string) => {
    const newKeys = {
      ...apiKeys,
      azureSpeech: { key: key.trim(), region: region.trim() },
    };
    setApiKeys(newKeys);
    saveApiKeys(newKeys);
    toast.success('Azure Speech nyckel sparad');
  };

  const handleDeleteKey = (service: 'anthropic' | 'speechmatics' | 'azureSpeech') => {
    if (!confirm(`Är du säker på att du vill radera ${service}-nyckeln?`)) return;

    const newKeys = { ...apiKeys };
    delete newKeys[service];
    setApiKeys(newKeys);
    saveApiKeys(newKeys);
    toast.success('API-nyckel raderad');
  };

  const handleResetUsage = () => {
    if (!confirm('Är du säker på att du vill nollställa användningsstatistik?')) return;
    resetUsageStats();
    setMonthlyCost(calculateMonthlyCost(getUsageStats()));
    toast.success('Användningsstatistik nollställd');
  };

  const maskKey = (key: string) => {
    if (!key || key.length < 8) return '••••••••';
    return `${key.slice(0, 4)}••••${key.slice(-4)}`;
  };

  return (
    <div className="space-y-6">
      {/* Header with cost overview */}
      <div className="bg-gradient-to-r from-sand-50 to-sand-100 dark:from-charcoal-850 dark:to-charcoal-800 rounded-xl p-6 border border-sand-300 dark:border-charcoal-700">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-white dark:bg-charcoal-900 rounded-lg">
            <DollarSign className="h-6 w-6 text-copper-600 dark:text-copper-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-stone-900 dark:text-cream-50 mb-2">
              Månadskostnad (uppskattad)
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-stone-500 dark:text-stone-400">Claude AI</p>
                <p className="text-2xl font-bold text-stone-900 dark:text-cream-50">
                  ${monthlyCost.anthropic.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-xs text-stone-500 dark:text-stone-400">Speechmatics</p>
                <p className="text-2xl font-bold text-stone-900 dark:text-cream-50">
                  ${monthlyCost.speechmatics.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-xs text-stone-500 dark:text-stone-400">Azure TTS</p>
                <p className="text-2xl font-bold text-stone-900 dark:text-cream-50">
                  ${monthlyCost.azureSpeech.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-xs text-stone-500 dark:text-stone-400">Totalt</p>
                <p className="text-2xl font-bold text-copper-600 dark:text-copper-400">
                  ${monthlyCost.total.toFixed(2)}
                </p>
              </div>
            </div>
            <button
              onClick={handleResetUsage}
              className="mt-3 text-xs text-stone-600 dark:text-stone-400 hover:text-copper-600 dark:hover:text-copper-400 flex items-center gap-1"
            >
              <RefreshCw className="h-3 w-3" />
              Nollställ statistik
            </button>
          </div>
        </div>
      </div>

      {/* Claude API Key */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-sand-100 dark:bg-charcoal-850 rounded-lg">
            <Key className="h-6 w-6 text-copper-600 dark:text-copper-400" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Claude API (Anthropic)
              </h3>
              {hasApiKey('anthropic') ? (
                <span className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
                  <CheckCircle className="h-4 w-4" />
                  Aktiv
                </span>
              ) : (
                <span className="flex items-center gap-1 text-sm text-gray-500">
                  <XCircle className="h-4 w-4" />
                  Inaktiv
                </span>
              )}
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              För AI-assisterad task creation, röstassistent och smart prioritering.
            </p>

            <div className="bg-sand-100 dark:bg-charcoal-850 border border-sand-300 dark:border-charcoal-700 rounded-lg p-3 mb-4">
              <div className="flex gap-2">
                <Info className="h-5 w-5 text-copper-600 dark:text-copper-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-stone-600 dark:text-sand-200">
                  <p className="font-medium mb-1">Kostnad</p>
                  <p className="mb-1">
                    Input: ${API_COSTS.anthropic.inputCostPer1M}/1M tokens ({(API_COSTS.anthropic.inputCostPer1M / 10).toFixed(2)}¢ per 10k)
                  </p>
                  <p className="mb-1">
                    Output: ${API_COSTS.anthropic.outputCostPer1M}/1M tokens ({(API_COSTS.anthropic.outputCostPer1M / 10).toFixed(2)}¢ per 10k)
                  </p>
                  <p className="text-stone-500 dark:text-stone-400">
                    {API_COSTS.anthropic.estimatedMonthly}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  API-nyckel
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showKeys.anthropic ? 'text' : 'password'}
                      value={apiKeys.anthropic || ''}
                      onChange={(e) => setApiKeys({ ...apiKeys, anthropic: e.target.value })}
                      placeholder="sk-ant-..."
                      className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                    <button
                      onClick={() => setShowKeys({ ...showKeys, anthropic: !showKeys.anthropic })}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                    >
                      {showKeys.anthropic ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <Button
                    onClick={() => handleSaveKey('anthropic', apiKeys.anthropic || '')}
                    variant="primary"
                    size="sm"
                    disabled={!apiKeys.anthropic?.trim()}
                  >
                    Spara
                  </Button>
                  {hasApiKey('anthropic') && (
                    <Button
                      onClick={() => handleDeleteKey('anthropic')}
                      variant="ghost"
                      size="sm"
                      className="text-error-600"
                    >
                      Radera
                    </Button>
                  )}
                </div>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Skaffa nyckel på{' '}
                <a
                  href="https://console.anthropic.com/settings/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-copper-600 hover:text-copper-700 dark:text-copper-400 dark:hover:text-copper-300"
                >
                  console.anthropic.com
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Speechmatics API Key */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-sand-100 dark:bg-charcoal-850 rounded-lg">
            <Key className="h-6 w-6 text-copper-600 dark:text-copper-400" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Speechmatics (Röst → Text)
              </h3>
              {hasApiKey('speechmatics') ? (
                <span className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
                  <CheckCircle className="h-4 w-4" />
                  Aktiv
                </span>
              ) : (
                <span className="flex items-center gap-1 text-sm text-gray-500">
                  <XCircle className="h-4 w-4" />
                  Inaktiv
                </span>
              )}
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              För röst-till-text i röstassistenten. Bättre svenskstöd än Azure.
            </p>

            <div className="bg-sand-100 dark:bg-charcoal-850 border border-sand-300 dark:border-charcoal-700 rounded-lg p-3 mb-4">
              <div className="flex gap-2">
                <Info className="h-5 w-5 text-copper-600 dark:text-copper-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-stone-600 dark:text-sand-200">
                  <p className="font-medium mb-1">Kostnad</p>
                  <p className="mb-1">${API_COSTS.speechmatics.costPerHour}/timme real-time transkribering</p>
                  <p className="text-stone-500 dark:text-stone-400">
                    {API_COSTS.speechmatics.estimatedMonthly}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  API-nyckel
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showKeys.speechmatics ? 'text' : 'password'}
                      value={apiKeys.speechmatics || ''}
                      onChange={(e) => setApiKeys({ ...apiKeys, speechmatics: e.target.value })}
                      placeholder="Pk..."
                      className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                    <button
                      onClick={() => setShowKeys({ ...showKeys, speechmatics: !showKeys.speechmatics })}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                    >
                      {showKeys.speechmatics ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <Button
                    onClick={() => handleSaveKey('speechmatics', apiKeys.speechmatics || '')}
                    variant="primary"
                    size="sm"
                    disabled={!apiKeys.speechmatics?.trim()}
                  >
                    Spara
                  </Button>
                  {hasApiKey('speechmatics') && (
                    <Button
                      onClick={() => handleDeleteKey('speechmatics')}
                      variant="ghost"
                      size="sm"
                      className="text-error-600"
                    >
                      Radera
                    </Button>
                  )}
                </div>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Skaffa nyckel på{' '}
                <a
                  href="https://portal.speechmatics.com/manage"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-copper-600 hover:text-copper-700 dark:text-copper-400 dark:hover:text-copper-300"
                >
                  portal.speechmatics.com
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Azure Speech API Key */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-sand-100 dark:bg-charcoal-850 rounded-lg">
            <Key className="h-6 w-6 text-copper-600 dark:text-copper-400" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Azure Speech (Text → Röst)
              </h3>
              {hasApiKey('azureSpeech') ? (
                <span className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
                  <CheckCircle className="h-4 w-4" />
                  Aktiv
                </span>
              ) : (
                <span className="flex items-center gap-1 text-sm text-gray-500">
                  <XCircle className="h-4 w-4" />
                  Inaktiv
                </span>
              )}
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              För text-till-röst i röstassistenten. Naturliga svenska röster.
            </p>

            <div className="bg-sand-100 dark:bg-charcoal-850 border border-sand-300 dark:border-charcoal-700 rounded-lg p-3 mb-4">
              <div className="flex gap-2">
                <Info className="h-5 w-5 text-copper-600 dark:text-copper-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-stone-600 dark:text-sand-200">
                  <p className="font-medium mb-1">Kostnad</p>
                  <p className="mb-1">${API_COSTS.azureSpeech.costPerHour}/timme neural TTS</p>
                  <p className="text-stone-500 dark:text-stone-400">
                    {API_COSTS.azureSpeech.estimatedMonthly}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  API-nyckel
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showKeys.azureSpeech ? 'text' : 'password'}
                      value={apiKeys.azureSpeech?.key || ''}
                      onChange={(e) =>
                        setApiKeys({
                          ...apiKeys,
                          azureSpeech: { ...apiKeys.azureSpeech!, key: e.target.value },
                        })
                      }
                      placeholder="Azure Speech API Key"
                      className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                    <button
                      onClick={() => setShowKeys({ ...showKeys, azureSpeech: !showKeys.azureSpeech })}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                    >
                      {showKeys.azureSpeech ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Region
                </label>
                <input
                  type="text"
                  value={apiKeys.azureSpeech?.region || ''}
                  onChange={(e) =>
                    setApiKeys({
                      ...apiKeys,
                      azureSpeech: { ...apiKeys.azureSpeech!, region: e.target.value },
                    })
                  }
                  placeholder="westeurope"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() =>
                    handleSaveAzureKey(apiKeys.azureSpeech?.key || '', apiKeys.azureSpeech?.region || '')
                  }
                  variant="primary"
                  size="sm"
                  disabled={!apiKeys.azureSpeech?.key?.trim() || !apiKeys.azureSpeech?.region?.trim()}
                >
                  Spara
                </Button>
                {hasApiKey('azureSpeech') && (
                  <Button
                    onClick={() => handleDeleteKey('azureSpeech')}
                    variant="ghost"
                    size="sm"
                    className="text-error-600"
                  >
                    Radera
                  </Button>
                )}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Skaffa nyckel på{' '}
                <a
                  href="https://portal.azure.com/#create/Microsoft.CognitiveServicesSpeechServices"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-copper-600 hover:text-copper-700 dark:text-copper-400 dark:hover:text-copper-300"
                >
                  Azure Portal
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
