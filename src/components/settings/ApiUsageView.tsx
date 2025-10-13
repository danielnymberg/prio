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
      case 'free': return { bg: 'var(--e-surface-secondary, #f5f5f4)', color: 'var(--e-text, #44403c)' };
      case 'pro': return { bg: 'var(--primary-100)', color: 'var(--primary-700)' };
      case 'business': return { bg: 'rgba(220, 252, 231, 0.5)', color: 'var(--success-700, #15803d)' };
      default: return { bg: 'var(--e-surface-secondary, #f5f5f4)', color: 'var(--e-text, #44403c)' };
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
      <div className="e-flex e-align-center e-justify-center" style={{ padding: '48px 0' }}>
        <div className="e-animate-spin e-rounded-full" style={{
          height: '32px',
          width: '32px',
          border: '2px solid transparent',
          borderBottomColor: 'var(--primary-600)'
        }} />
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
    <div className="e-flex e-flex-column e-gap-24">
      {/* Header */}
      <div>
        <h2 className="e-text-2xl e-font-bold" style={{ color: 'var(--e-text, #1c1917)' }}>
          API-användning
        </h2>
        <p className="e-text-sm e-mt-4" style={{ color: 'var(--e-text-secondary, #57534e)' }}>
          Håll koll på din AI-förbrukning och kostnader
        </p>
      </div>

      {/* Pricing Tier Badge */}
      {settings && (
        <div className="e-flex e-align-center e-gap-12">
          <span className="e-px-12 e-py-4 e-rounded-full e-text-sm e-font-medium" style={{
            backgroundColor: getTierColor(settings.pricing_tier).bg,
            color: getTierColor(settings.pricing_tier).color
          }}>
            {settings.pricing_tier.toUpperCase()}
          </span>
          {settings.use_own_api_keys && (
            <span className="e-flex e-align-center e-gap-4 e-px-12 e-py-4 e-rounded-full e-text-sm e-font-medium" style={{
              backgroundColor: 'rgba(233, 213, 255, 0.5)',
              color: 'var(--primary-700)'
            }}>
              <Key style={{ height: '12px', width: '12px' }} />
              Egen API-nyckel
            </span>
          )}
        </div>
      )}

      {/* Usage Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '16px'
      }}>
        {/* Today's Requests */}
        <div style={{
          backgroundColor: 'var(--e-surface, #ffffff)',
          borderRadius: '12px',
          padding: '24px',
          border: '1px solid var(--e-border, #e7e5e4)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div style={{ padding: '8px', backgroundColor: 'var(--primary-100)', borderRadius: '8px' }}>
              <Zap style={{ height: '20px', width: '20px', color: 'var(--primary-600)' }} />
            </div>
            <span style={{ fontSize: '12px', color: 'var(--e-text-secondary, #78716c)' }}>
              Idag
            </span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--e-text, #1c1917)' }}>
            {usage?.claude_requests_today || 0}
          </div>
          <div style={{ fontSize: '14px', color: 'var(--e-text-secondary, #57534e)' }}>
            av {settings?.daily_claude_quota || 0} requests
          </div>
          <div style={{ marginTop: '12px', backgroundColor: 'var(--e-border, #e5e7eb)', borderRadius: '9999px', height: '8px' }}>
            <div
              style={{
                backgroundColor: 'var(--primary-600)',
                height: '8px',
                borderRadius: '9999px',
                transition: 'width 0.3s',
                width: `${dailyPercentage}%`
              }}
            />
          </div>
          <div style={{ fontSize: '12px', color: 'var(--e-text-secondary, #78716c)', marginTop: '8px' }}>
            Återställs om {usage && getTimeUntilReset(usage.daily_reset_at)}
          </div>
        </div>

        {/* Month's Requests */}
        <div style={{
          backgroundColor: 'var(--e-surface, #ffffff)',
          borderRadius: '12px',
          padding: '24px',
          border: '1px solid var(--e-border, #e7e5e4)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div style={{ padding: '8px', backgroundColor: 'rgba(254, 243, 199, 0.5)', borderRadius: '8px' }}>
              <TrendingUp style={{ height: '20px', width: '20px', color: 'var(--warning-500, var(--warning-500))' }} />
            </div>
            <span style={{ fontSize: '12px', color: 'var(--e-text-secondary, #78716c)' }}>
              Denna månad
            </span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--e-text, #1c1917)' }}>
            {usage?.claude_requests_month || 0}
          </div>
          <div style={{ fontSize: '14px', color: 'var(--e-text-secondary, #57534e)' }}>
            av {settings?.monthly_claude_quota || 0} requests
          </div>
          <div style={{ marginTop: '12px', backgroundColor: 'var(--e-border, #e5e7eb)', borderRadius: '9999px', height: '8px' }}>
            <div
              style={{
                backgroundColor: 'var(--warning-500, var(--warning-500))',
                height: '8px',
                borderRadius: '9999px',
                transition: 'width 0.3s',
                width: `${monthlyPercentage}%`
              }}
            />
          </div>
          <div style={{ fontSize: '12px', color: 'var(--e-text-secondary, #78716c)', marginTop: '8px' }}>
            Återställs om {usage && getTimeUntilReset(usage.monthly_reset_at)}
          </div>
        </div>

        {/* Cost Today */}
        <div style={{
          backgroundColor: 'var(--e-surface, #ffffff)',
          borderRadius: '12px',
          padding: '24px',
          border: '1px solid var(--e-border, #e7e5e4)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div style={{ padding: '8px', backgroundColor: 'rgba(220, 252, 231, 0.5)', borderRadius: '8px' }}>
              <DollarSign style={{ height: '20px', width: '20px', color: 'var(--success-500, #10b981)' }} />
            </div>
            <span style={{ fontSize: '12px', color: 'var(--e-text-secondary, #78716c)' }}>
              Kostnad idag
            </span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--e-text, #1c1917)' }}>
            {usage ? formatCost(usage.estimated_cost_today_cents) : '$0.00'}
          </div>
          <div style={{ fontSize: '14px', color: 'var(--e-text-secondary, #57534e)' }}>
            Uppskattad kostnad
          </div>
        </div>

        {/* Cost Month */}
        <div style={{
          backgroundColor: 'var(--e-surface, #ffffff)',
          borderRadius: '12px',
          padding: '24px',
          border: '1px solid var(--e-border, #e7e5e4)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div style={{ padding: '8px', backgroundColor: 'rgba(254, 226, 226, 0.5)', borderRadius: '8px' }}>
              <DollarSign style={{ height: '20px', width: '20px', color: 'var(--error-500, #ef4444)' }} />
            </div>
            <span style={{ fontSize: '12px', color: 'var(--e-text-secondary, #78716c)' }}>
              Kostnad månad
            </span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--e-text, #1c1917)' }}>
            {usage ? formatCost(usage.estimated_cost_month_cents) : '$0.00'}
          </div>
          <div style={{ fontSize: '14px', color: 'var(--e-text-secondary, #57534e)' }}>
            Uppskattad kostnad
          </div>
        </div>
      </div>

      {/* Token Details */}
      {usage && (usage.claude_input_tokens_month > 0 || usage.claude_output_tokens_month > 0) && (
        <div style={{
          backgroundColor: 'var(--e-surface, #ffffff)',
          borderRadius: '12px',
          padding: '24px',
          border: '1px solid var(--e-border, #e7e5e4)'
        }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--e-text, #1c1917)', marginBottom: '16px' }}>
            Token-användning denna månad
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div>
              <div style={{ fontSize: '14px', color: 'var(--e-text-secondary, #57534e)', marginBottom: '4px' }}>
                Input tokens
              </div>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--e-text, #1c1917)' }}>
                {usage.claude_input_tokens_month.toLocaleString()}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--e-text-tertiary, #78716c)' }}>
                $3 per miljon tokens
              </div>
            </div>
            <div>
              <div style={{ fontSize: '14px', color: 'var(--e-text-secondary, #57534e)', marginBottom: '4px' }}>
                Output tokens
              </div>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--e-text, #1c1917)' }}>
                {usage.claude_output_tokens_month.toLocaleString()}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--e-text-tertiary, #78716c)' }}>
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
            <div style={{
              backgroundColor: 'rgba(254, 243, 199, 0.3)',
              border: '1px solid #fde68a',
              borderRadius: '12px',
              padding: '16px'
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <AlertCircle style={{ height: '20px', width: '20px', color: 'var(--warning-500, var(--warning-500))', marginTop: '2px' }} />
                <div>
                  <h4 style={{ fontWeight: '600', color: '#b45309' }}>
                    Nära daglig gräns
                  </h4>
                  <p style={{ fontSize: '14px', color: 'var(--warning-600)', marginTop: '4px' }}>
                    Du har använt {dailyPercentage.toFixed(0)}% av dina dagliga requests.
                    {settings.pricing_tier === 'free' && ' Uppgradera till Pro för fler requests.'}
                  </p>
                </div>
              </div>
            </div>
          )}
          {monthlyPercentage >= 80 && (
            <div style={{
              backgroundColor: 'rgba(254, 226, 226, 0.3)',
              border: '1px solid #fca5a5',
              borderRadius: '12px',
              padding: '16px'
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <AlertCircle style={{ height: '20px', width: '20px', color: 'var(--error-500, #ef4444)', marginTop: '2px' }} />
                <div>
                  <h4 style={{ fontWeight: '600', color: '#991b1b' }}>
                    Nära månadsgräns
                  </h4>
                  <p style={{ fontSize: '14px', color: '#dc2626', marginTop: '4px' }}>
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
      <div style={{
        backgroundColor: 'var(--e-surface, #ffffff)',
        borderRadius: '12px',
        padding: '24px',
        border: '1px solid var(--e-border, #e7e5e4)'
      }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--e-text, #1c1917)', marginBottom: '8px' }}>
          Använd din egen Claude API-nyckel
        </h3>
        <p style={{ fontSize: '14px', color: 'var(--e-text-secondary, #57534e)', marginBottom: '16px' }}>
          Koppla din egen Anthropic API-nyckel för obegränsad användning. Du betalar direkt till Anthropic istället.
        </p>

        {settings?.use_own_api_keys ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px',
              backgroundColor: 'rgba(220, 252, 231, 0.3)',
              border: '1px solid #bbf7d0',
              borderRadius: '8px'
            }}>
              <Lock style={{ height: '16px', width: '16px', color: 'var(--success-500, #10b981)' }} />
              <span style={{ fontSize: '14px', color: 'var(--success-700, #15803d)', fontWeight: '500' }}>
                Egen API-nyckel aktiv
              </span>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--e-text-secondary, #57534e)' }}>
              Din API-nyckel är krypterad och lagras säkert. Endast du kan se den.
            </p>
            <Button
              variant="ghost"
              onClick={removeApiKey}
              disabled={saving}
              style={{ color: 'var(--error-500, #ef4444)' }}
            >
              Ta bort API-nyckel
            </Button>
          </div>
        ) : (
          <>
            {!showApiKeyInput ? (
              <Button onClick={() => setShowApiKeyInput(true)}>
                <Key style={{ height: '16px', width: '16px', marginRight: '8px' }} />
                Lägg till egen API-nyckel
              </Button>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <Input
                  type="password"
                  value={claudeApiKey}
                  onChange={(e) => setClaudeApiKey(e.target.value)}
                  placeholder="sk-ant-api03-..."
                  style={{ fontFamily: 'monospace', fontSize: '14px' }}
                />
                <div style={{ display: 'flex', gap: '8px' }}>
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
                <p style={{ fontSize: '12px', color: 'var(--e-text-secondary, #57534e)' }}>
                  <strong>Hur får jag en API-nyckel?</strong><br />
                  1. Gå till <a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary-600)', textDecoration: 'underline' }}>console.anthropic.com</a><br />
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
        <div style={{
          background: 'linear-gradient(to right, var(--primary-50), var(--sand-50, #fafaf9))',
          borderRadius: '12px',
          padding: '24px',
          border: '1px solid var(--primary-200)'
        }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--e-text, #1c1917)', marginBottom: '16px' }}>
            Uppgradera för mer kapacitet
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            {/* Free */}
            <div style={{
              backgroundColor: 'var(--e-surface, #ffffff)',
              borderRadius: '8px',
              padding: '16px',
              border: '2px solid var(--primary-600)'
            }}>
              <h4 style={{ fontWeight: '600', color: 'var(--e-text, #1c1917)', marginBottom: '8px' }}>Free</h4>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--primary-600)', marginBottom: '12px' }}>$0</div>
              <ul style={{ fontSize: '14px', color: 'var(--e-text-secondary, #57534e)', listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <li>• 50 requests/dag</li>
                <li>• 1,500 requests/månad</li>
                <li>• Grundläggande support</li>
              </ul>
            </div>

            {/* Pro */}
            <div style={{
              backgroundColor: 'var(--e-surface, #ffffff)',
              borderRadius: '8px',
              padding: '16px',
              border: '1px solid var(--e-border, #e7e5e4)'
            }}>
              <h4 style={{ fontWeight: '600', color: 'var(--e-text, #1c1917)', marginBottom: '8px' }}>Pro</h4>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--primary-600)', marginBottom: '12px' }}>
                $9<span style={{ fontSize: '14px', color: 'var(--e-text-tertiary, #78716c)' }}>/månad</span>
              </div>
              <ul style={{ fontSize: '14px', color: 'var(--e-text-secondary, #57534e)', listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <li>• 500 requests/dag</li>
                <li>• 15,000 requests/månad</li>
                <li>• Prioriterad support</li>
              </ul>
            </div>

            {/* Business */}
            <div style={{
              backgroundColor: 'var(--e-surface, #ffffff)',
              borderRadius: '8px',
              padding: '16px',
              border: '1px solid var(--e-border, #e7e5e4)'
            }}>
              <h4 style={{ fontWeight: '600', color: 'var(--e-text, #1c1917)', marginBottom: '8px' }}>Business</h4>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--primary-600)', marginBottom: '12px' }}>
                $29<span style={{ fontSize: '14px', color: 'var(--e-text-tertiary, #78716c)' }}>/månad</span>
              </div>
              <ul style={{ fontSize: '14px', color: 'var(--e-text-secondary, #57534e)', listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <li>• Obegränsat requests</li>
                <li>• Premium support</li>
                <li>• Dedikerad API-endpoint</li>
              </ul>
            </div>
          </div>
          <div style={{ marginTop: '16px', textAlign: 'center' }}>
            <Button style={{ backgroundColor: 'var(--primary-600)', color: '#ffffff' }}>
              Uppgradera nu
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
