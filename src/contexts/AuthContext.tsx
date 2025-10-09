import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { loginToMicrosoft, logoutFromMicrosoft, isMicrosoftLoggedIn } from '@/services/microsoft-graph';
import { toast } from 'react-hot-toast';
import { WelcomeModal } from '@/components/onboarding/WelcomeModal';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const inactivityTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const INACTIVITY_TIMEOUT = 6 * 60 * 60 * 1000; // 6 hours in milliseconds

  // Reset inactivity timer
  const resetInactivityTimer = useRef(() => {
    if (inactivityTimeoutRef.current) {
      clearTimeout(inactivityTimeoutRef.current);
    }

    inactivityTimeoutRef.current = setTimeout(async () => {
      toast.error('Utloggad efter 6 timmars inaktivitet');
      await signOut();
    }, INACTIVITY_TIMEOUT);
  });

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      // Start inactivity timer if logged in
      if (session?.user) {
        resetInactivityTimer.current();
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      // Auto-login to Microsoft when user logs into Prio
      if (session?.user && _event === 'SIGNED_IN') {
        try {
          const isMsftConnected = await isMicrosoftLoggedIn();

          if (!isMsftConnected) {
            // Kolla om detta är första inloggningen
            const { data: profile } = await supabase
              .from('profiles')
              .select('onboarding_completed')
              .eq('id', session.user.id)
              .single();

            const isFirstLogin = !profile || !profile.onboarding_completed;

            if (isFirstLogin) {
              // Visa välkomstmodal för nya användare
              setShowWelcomeModal(true);
            } else {
              // Befintlig användare - visa bara notis
              toast('Kopplar till Microsoft för kalender och mejl...', {
                icon: '🔗',
                duration: 3000,
              });

              await new Promise(resolve => setTimeout(resolve, 500));
              await loginToMicrosoft(true);
            }
          }
        } catch (error) {
          console.error('Auto-MSFT login failed:', error);
          toast.error('Kunde inte ansluta till Microsoft. Du kan logga in manuellt i inställningar.');
        }

        // Start inactivity timer
        resetInactivityTimer.current();
      }

      // Clear timer on logout
      if (!session?.user && inactivityTimeoutRef.current) {
        clearTimeout(inactivityTimeoutRef.current);
      }
    });

    return () => {
      subscription.unsubscribe();
      if (inactivityTimeoutRef.current) {
        clearTimeout(inactivityTimeoutRef.current);
      }
    };
  }, []);

  // Track user activity to reset timer
  useEffect(() => {
    if (!user) return;

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];

    const handleActivity = () => {
      resetInactivityTimer.current();
    };

    events.forEach(event => {
      window.addEventListener(event, handleActivity);
    });

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [user]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    // Logout from Microsoft first
    try {
      await logoutFromMicrosoft();
    } catch (error) {
      console.error('Microsoft logout failed:', error);
    }
    // Then logout from Prio
    await supabase.auth.signOut({ scope: 'local' });
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error };
  };

  const handleConnectMicrosoft = async () => {
    setShowWelcomeModal(false);

    toast('Kopplar till Microsoft...', {
      icon: '🔗',
      duration: 3000,
    });

    await new Promise(resolve => setTimeout(resolve, 500));

    try {
      await loginToMicrosoft(true);

      // Markera onboarding som klar
      if (user) {
        await supabase
          .from('profiles')
          .upsert({ id: user.id, onboarding_completed: true });
      }

      toast.success('Microsoft-konto kopplat!');
    } catch (error) {
      console.error('Microsoft connection failed:', error);
      toast.error('Kunde inte ansluta. Försök igen via Inställningar.');
    }
  };

  const handleSkipMicrosoft = async () => {
    setShowWelcomeModal(false);

    // Markera onboarding som klar även om de skippar
    if (user) {
      await supabase
        .from('profiles')
        .upsert({ id: user.id, onboarding_completed: true });
    }

    toast('Du kan koppla Microsoft när som helst via Inställningar', {
      icon: 'ℹ️',
      duration: 4000,
    });
  };

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
      {showWelcomeModal && (
        <WelcomeModal
          onClose={() => setShowWelcomeModal(false)}
          onConnectMicrosoft={handleConnectMicrosoft}
          onSkip={handleSkipMicrosoft}
        />
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
