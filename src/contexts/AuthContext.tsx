import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { logoutFromMicrosoft } from '@/services/microsoft-graph';
import { toast } from 'react-hot-toast';

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
  const inactivityTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const INACTIVITY_TIMEOUT = 6 * 60 * 60 * 1000; // 6 hours in milliseconds

  // Forward declare signOut
  const signOutRef = useRef<() => Promise<void>>();

  // Reset inactivity timer with useCallback for stable reference
  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimeoutRef.current) {
      clearTimeout(inactivityTimeoutRef.current);
    }

    inactivityTimeoutRef.current = setTimeout(async () => {
      toast.error('Utloggad efter 6 timmars inaktivitet');
      if (signOutRef.current) {
        await signOutRef.current();
      }
    }, INACTIVITY_TIMEOUT);
  }, [INACTIVITY_TIMEOUT]);

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      // Start inactivity timer if logged in
      if (session?.user) {
        resetInactivityTimer();
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      // Start inactivity timer when user signs in
      if (session?.user && _event === 'SIGNED_IN') {
        resetInactivityTimer();
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

    events.forEach(event => {
      window.addEventListener(event, resetInactivityTimer);
    });

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, resetInactivityTimer);
      });
    };
  }, [user, resetInactivityTimer]);

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

  const signOut = useCallback(async () => {
    // Logout from Microsoft first
    try {
      await logoutFromMicrosoft();
    } catch (error) {
      console.error('Microsoft logout failed:', error);
    }
    // Then logout from Prio
    await supabase.auth.signOut({ scope: 'local' });
  }, []);

  // Store signOut ref for inactivity timer
  signOutRef.current = signOut;

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error };
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
