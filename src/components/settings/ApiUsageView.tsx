import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { SyncButton as Button } from '@/components/ui/SyncButton';
import { Input } from '@/components/ui/Input';
import { toast } from 'react-hot-toast';
import { Zap, DollarSign, TrendingUp, AlertCircle, Key, Lock } from 'lucide-react';

interface ApiUsage {
  claude_requests_today: number;
  claude_requests_month: number;
  claude_input_tokens_month: number;
  claude_output_tokens_month: number;
  estimated_cost_today_cents: number;
  estimated_cost_month_cents: number;
  daily_reset_at: string;
  monthly_reset_at: string;
}

interface UserSettings {
  pricing_tier: 'free' | 'pro' | 'business';
  use_own_api_keys: boolean;
  own_claude_api_key?: string;
  daily_claude_quota: number;
  monthly_claude_quota: number;
}

export function ApiUsageView() {
  const { user } = useAuth();
  const [usage, setUsage] = useState<ApiUsage | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [claudeApiKey, setClaudeApiKey] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      loadUsageData();
    }
  }, [user]);

  const loadUsageData = async () => {
    try {
      setLoading(true);

      // Hämta usage stats
      const { data: usageData, error: usageError } = await supabase
        .from('api_usage')
        .select('*')
        .eq('user_id', user!.id)
        .single();

      if (usageError && usageError.code !== 'PGRST116') {
        throw usageError;
      }

      // Hämta user settings
      const { data: settingsData, error: settingsError } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user!.id)
        .single();

      if (settingsError && settingsError.code !== 'PGRST116') {
        throw settingsError;
      }

      setUsage(usageData || null);
      setSettings(settingsData || null);
    } catch (error) {
      console.error('Failed to load API usage:', error);
      toast.error('Kunde inte ladda API-användning');
    } finally {
      setLoading(false);
    }
  };

  const saveApiKey = async () => {
    if (!claudeApiKey.trim()) {
      toast.error('Ange en giltig API-nyckel');
      return;
    }

    if (!claudeApiKey.startsWith('sk-ant-')) {
      toast.error('Claude API-nycklar börjar med "sk-ant-"');
      return;
    }

    try {
      setSaving(true);

      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user!.id,
          use_own_api_keys: true,
          own_claude_api_key: claudeApiKey,
        });

      if (error) throw error;

      toast.success('API-nyckel sparad!');
      setShowApiKeyInput(false);
      setClaudeApiKey('');
      loadUsageData();
    } catch (error) {
      console.error('Failed to save API key:', error);
      toast.error('Kunde inte spara API-nyckel');
    } finally {
      setSaving(false);
    }
  };

  const removeApiKey = async () => {
    if (!confirm('Är du säker på att du vill ta bort din egen API-nyckel?')) {
      return;
    }

    try {
      setSaving(true);

      const { error } = await supabase
        .from('user_settings')
        .update({
          use_own_api_keys: false,
          own_claude_api_key: null,
        })
        .eq('user_id', user!.id);

      if (error) throw error;

      toast.success('API-nyckel borttagen');
      loadUsageData();
    } catch (error) {
      console.error('Failed to remove API key:', error);
      toast.error('Kunde inte ta bort API-nyckel');
    } finally {
      setSaving(false);
    }
  };

  const getTimeUntilReset = (resetAt: string) => {
    const now = new Date();
    const reset = new Date(resetAt);
    const diff = reset.getTime() - now.getTime();

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    return `${hours}h ${minutes}min`;
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'free': return 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300';
      case 'pro': return 'bg-copper-100 text-copper-700 dark:bg-copper-900 dark:text-copper-300';
      case 'business': return 'bg-success-100 text-success-700 dark:bg-success-900 dark:text-success-300';
      default: return 'bg-stone-100 text-stone-700';
    }
  };

  const formatCost = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const getUsagePercentage = (current: number, quota: number) => {
    return Math.min((current / quota) * 100, 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-copper-600" />
      </div>
    );
  }

  const dailyPercentage = settings
    ? getUsagePercentage(usage?.claude_requests_today || 0, settings.daily_claude_quota)
    : 0;
  const monthlyPercentage = settings
    ? getUsagePercentage(usage?.claude_requests_month || 0, settings.monthly_claude_quota)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-stone-900 dark:text-cream-50">
          API-användning
        </h2>
        <p className="text-sm text-stone-600 dark:text-stone-400 mt-1">
          Håll koll på din AI-förbrukning och kostnader
        </p>
      </div>

      {/* Pricing Tier Badge */}
      {settings && (
        <div className="flex items-center gap-3">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getTierColor(settings.pricing_tier)}`}>
            {settings.pricing_tier.toUpperCase()}
          </span>
          {settings.use_own_api_keys && (
            <span className="flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
              <Key className="h-3 w-3" />
              Egen API-nyckel
            </span>
          )}
        </div>
      )}

      {/* Usage Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Requests */}
        <div className="bg-white dark:bg-charcoal-850 rounded-xl p-6 border border-sand-200 dark:border-charcoal-800">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-copper-100 dark:bg-copper-900 rounded-lg">
              <Zap className="h-5 w-5 text-copper-600 dark:text-copper-400" />
            </div>
            <span className="text-xs text-stone-500 dark:text-stone-400">
              Idag
            </span>
          </div>
          <div className="text-2xl font-bold text-stone-900 dark:text-cream-50">
            {usage?.claude_requests_today || 0}
          </div>
          <div className="text-sm text-stone-600 dark:text-stone-400">
            av {settings?.daily_claude_quota || 0} requests
          </div>
          <div className="mt-3 bg-stone-200 dark:bg-charcoal-700 rounded-full h-2">
            <div
              className="bg-copper-600 h-2 rounded-full transition-all"
              style={{ width: `${dailyPercentage}%` }}
            />
          </div>
          <div className="text-xs text-stone-500 dark:text-stone-400 mt-2">
            Återställs om {usage && getTimeUntilReset(usage.daily_reset_at)}
          </div>
        </div>

        {/* Month's Requests */}
        <div className="bg-white dark:bg-charcoal-850 rounded-xl p-6 border border-sand-200 dark:border-charcoal-800">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-warning-100 dark:bg-warning-900 rounded-lg">
              <TrendingUp className="h-5 w-5 text-warning-600 dark:text-warning-400" />
            </div>
            <span className="text-xs text-stone-500 dark:text-stone-400">
              Denna månad
            </span>
          </div>
          <div className="text-2xl font-bold text-stone-900 dark:text-cream-50">
            {usage?.claude_requests_month || 0}
          </div>
          <div className="text-sm text-stone-600 dark:text-stone-400">
            av {settings?.monthly_claude_quota || 0} requests
          </div>
          <div className="mt-3 bg-stone-200 dark:bg-charcoal-700 rounded-full h-2">
            <div
              className="bg-warning-600 h-2 rounded-full transition-all"
              style={{ width: `${monthlyPercentage}%` }}
            />
          </div>
          <div className="text-xs text-stone-500 dark:text-stone-400 mt-2">
            Återställs om {usage && getTimeUntilReset(usage.monthly_reset_at)}
          </div>
        </div>

        {/* Cost Today */}
        <div className="bg-white dark:bg-charcoal-850 rounded-xl p-6 border border-sand-200 dark:border-charcoal-800">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-success-100 dark:bg-success-900 rounded-lg">
              <DollarSign className="h-5 w-5 text-success-600 dark:text-success-400" />
            </div>
            <span className="text-xs text-stone-500 dark:text-stone-400">
              Kostnad idag
            </span>
          </div>
          <div className="text-2xl font-bold text-stone-900 dark:text-cream-50">
            {usage ? formatCost(usage.estimated_cost_today_cents) : '$0.00'}
          </div>
          <div className="text-sm text-stone-600 dark:text-stone-400">
            Uppskattad kostnad
          </div>
        </div>

        {/* Cost Month */}
        <div className="bg-white dark:bg-charcoal-850 rounded-xl p-6 border border-sand-200 dark:border-charcoal-800">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-error-100 dark:bg-error-900 rounded-lg">
              <DollarSign className="h-5 w-5 text-error-600 dark:text-error-400" />
            </div>
            <span className="text-xs text-stone-500 dark:text-stone-400">
              Kostnad månad
            </span>
          </div>
          <div className="text-2xl font-bold text-stone-900 dark:text-cream-50">
            {usage ? formatCost(usage.estimated_cost_month_cents) : '$0.00'}
          </div>
          <div className="text-sm text-stone-600 dark:text-stone-400">
            Uppskattad kostnad
          </div>
        </div>
      </div>

      {/* Token Details */}
      {usage && (usage.claude_input_tokens_month > 0 || usage.claude_output_tokens_month > 0) && (
        <div className="bg-white dark:bg-charcoal-850 rounded-xl p-6 border border-sand-200 dark:border-charcoal-800">
          <h3 className="text-lg font-semibold text-stone-900 dark:text-cream-50 mb-4">
            Token-användning denna månad
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-stone-600 dark:text-stone-400 mb-1">
                Input tokens
              </div>
              <div className="text-xl font-bold text-stone-900 dark:text-cream-50">
                {usage.claude_input_tokens_month.toLocaleString()}
              </div>
              <div className="text-xs text-stone-500 dark:text-stone-400">
                $3 per miljon tokens
              </div>
            </div>
            <div>
              <div className="text-sm text-stone-600 dark:text-stone-400 mb-1">
                Output tokens
              </div>
              <div className="text-xl font-bold text-stone-900 dark:text-cream-50">
                {usage.claude_output_tokens_month.toLocaleString()}
              </div>
              <div className="text-xs text-stone-500 dark:text-stone-400">
                $15 per miljon tokens
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Warning if nearing quota */}
      {settings && usage && (
        <>
          {dailyPercentage >= 80 && (
            <div className="bg-warning-50 dark:bg-warning-950 border border-warning-200 dark:border-warning-800 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-warning-600 dark:text-warning-400 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-warning-900 dark:text-warning-200">
                    Nära daglig gräns
                  </h4>
                  <p className="text-sm text-warning-700 dark:text-warning-300 mt-1">
                    Du har använt {dailyPercentage.toFixed(0)}% av dina dagliga requests.
                    {settings.pricing_tier === 'free' && ' Uppgradera till Pro för fler requests.'}
                  </p>
                </div>
              </div>
            </div>
          )}
          {monthlyPercentage >= 80 && (
            <div className="bg-error-50 dark:bg-error-950 border border-error-200 dark:border-error-800 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-error-600 dark:text-error-400 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-error-900 dark:text-error-200">
                    Nära månadsgräns
                  </h4>
                  <p className="text-sm text-error-700 dark:text-error-300 mt-1">
                    Du har använt {monthlyPercentage.toFixed(0)}% av dina månatliga requests.
                    {settings.pricing_tier === 'free' && ' Uppgradera till Pro för obegränsade requests.'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Own API Key Section */}
      <div className="bg-white dark:bg-charcoal-850 rounded-xl p-6 border border-sand-200 dark:border-charcoal-800">
        <h3 className="text-lg font-semibold text-stone-900 dark:text-cream-50 mb-2">
          Använd din egen Claude API-nyckel
        </h3>
        <p className="text-sm text-stone-600 dark:text-stone-400 mb-4">
          Koppla din egen Anthropic API-nyckel för obegränsad användning. Du betalar direkt till Anthropic istället.
        </p>

        {settings?.use_own_api_keys ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 bg-success-50 dark:bg-success-950 border border-success-200 dark:border-success-800 rounded-lg">
              <Lock className="h-4 w-4 text-success-600 dark:text-success-400" />
              <span className="text-sm text-success-700 dark:text-success-300 font-medium">
                Egen API-nyckel aktiv
              </span>
            </div>
            <p className="text-xs text-stone-600 dark:text-stone-400">
              Din API-nyckel är krypterad och lagras säkert. Endast du kan se den.
            </p>
            <Button
              variant="ghost"
              onClick={removeApiKey}
              disabled={saving}
              className="text-error-600 hover:text-error-700 dark:text-error-400"
            >
              Ta bort API-nyckel
            </Button>
          </div>
        ) : (
          <>
            {!showApiKeyInput ? (
              <Button onClick={() => setShowApiKeyInput(true)}>
                <Key className="h-4 w-4 mr-2" />
                Lägg till egen API-nyckel
              </Button>
            ) : (
              <div className="space-y-3">
                <Input
                  type="password"
                  value={claudeApiKey}
                  onChange={(e) => setClaudeApiKey(e.target.value)}
                  placeholder="sk-ant-api03-..."
                  className="font-mono text-sm"
                />
                <div className="flex gap-2">
                  <Button onClick={saveApiKey} disabled={saving}>
                    {saving ? 'Sparar...' : 'Spara nyckel'}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setShowApiKeyInput(false);
                      setClaudeApiKey('');
                    }}
                  >
                    Avbryt
                  </Button>
                </div>
                <p className="text-xs text-stone-600 dark:text-stone-400">
                  <strong>Hur får jag en API-nyckel?</strong><br />
                  1. Gå till <a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer" className="text-copper-600 hover:underline">console.anthropic.com</a><br />
                  2. Skapa konto och gå till Settings → API Keys<br />
                  3. Klicka "Create Key" och kopiera nyckeln hit
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Pricing Tiers */}
      {settings?.pricing_tier === 'free' && (
        <div className="bg-gradient-to-r from-copper-50 to-sand-50 dark:from-copper-950 dark:to-charcoal-850 rounded-xl p-6 border border-copper-200 dark:border-copper-800">
          <h3 className="text-lg font-semibold text-stone-900 dark:text-cream-50 mb-4">
            Uppgradera för mer kapacitet
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Free */}
            <div className="bg-white dark:bg-charcoal-850 rounded-lg p-4 border-2 border-copper-600">
              <h4 className="font-semibold text-stone-900 dark:text-cream-50 mb-2">Free</h4>
              <div className="text-2xl font-bold text-copper-600 mb-3">$0</div>
              <ul className="text-sm text-stone-600 dark:text-stone-400 space-y-1">
                <li>• 50 requests/dag</li>
                <li>• 1,500 requests/månad</li>
                <li>• Grundläggande support</li>
              </ul>
            </div>

            {/* Pro */}
            <div className="bg-white dark:bg-charcoal-850 rounded-lg p-4 border border-sand-200 dark:border-charcoal-800">
              <h4 className="font-semibold text-stone-900 dark:text-cream-50 mb-2">Pro</h4>
              <div className="text-2xl font-bold text-copper-600 mb-3">$9<span className="text-sm text-stone-500">/månad</span></div>
              <ul className="text-sm text-stone-600 dark:text-stone-400 space-y-1">
                <li>• 500 requests/dag</li>
                <li>• 15,000 requests/månad</li>
                <li>• Prioriterad support</li>
              </ul>
            </div>

            {/* Business */}
            <div className="bg-white dark:bg-charcoal-850 rounded-lg p-4 border border-sand-200 dark:border-charcoal-800">
              <h4 className="font-semibold text-stone-900 dark:text-cream-50 mb-2">Business</h4>
              <div className="text-2xl font-bold text-copper-600 mb-3">$29<span className="text-sm text-stone-500">/månad</span></div>
              <ul className="text-sm text-stone-600 dark:text-stone-400 space-y-1">
                <li>• Obegränsat requests</li>
                <li>• Premium support</li>
                <li>• Dedikerad API-endpoint</li>
              </ul>
            </div>
          </div>
          <div className="mt-4 text-center">
            <Button className="bg-copper-600 hover:bg-copper-700 text-white">
              Uppgradera nu
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
