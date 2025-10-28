import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { PublicClientApplication, InteractionRequiredAuthError } from '@azure/msal-browser';

interface MicrosoftGraphContextType {
  isConnected: boolean;
  accessToken: string | null;
  tokenExpiry: Date | null;
  login: () => Promise<boolean>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  getValidToken: () => Promise<string | null>;
}

const MicrosoftGraphContext = createContext<MicrosoftGraphContextType | undefined>(undefined);

const msalConfig = {
  auth: {
    clientId: import.meta.env.VITE_AZURE_CLIENT_ID || '',
    authority: 'https://login.microsoftonline.com/organizations',
    redirectUri: window.location.origin,
    navigateToLoginRequestUrl: false,
  },
  cache: {
    cacheLocation: 'localStorage' as 'localStorage',
    storeAuthStateInCookie: true,
  },
};

const loginRequest = {
  scopes: [
    'User.Read',
    'Calendars.Read',
    'Calendars.ReadWrite',
    'Mail.Read',
    'Mail.ReadWrite',
    'Contacts.Read',
  ],
};

let msalInstance: PublicClientApplication | null = null;

async function getMsalInstance() {
  if (!msalInstance && import.meta.env.VITE_AZURE_CLIENT_ID) {
    msalInstance = new PublicClientApplication(msalConfig);
    await msalInstance.initialize();
    try {
      await msalInstance.handleRedirectPromise();
    } catch (error) {
      console.error('Error handling redirect:', error);
    }
  }
  return msalInstance;
}

export function MicrosoftGraphProvider({ children }: { children: React.ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [tokenExpiry, setTokenExpiry] = useState<Date | null>(null);

  // Check initial login status
  useEffect(() => {
    const checkStatus = async () => {
      const msal = await getMsalInstance();
      if (!msal) return;

      const accounts = msal.getAllAccounts();
      if (accounts.length > 0) {
        console.log('✅ MS Graph: User already logged in');
        setIsConnected(true);
        // Fetch token immediately
        await refreshTokenInternal();
      } else {
        console.log('❌ MS Graph: Not logged in');
        setIsConnected(false);
      }
    };

    checkStatus();
  }, []);

  // Auto-refresh token 5 min before expiry
  useEffect(() => {
    if (!tokenExpiry) return;

    const msUntilRefresh = tokenExpiry.getTime() - Date.now() - (5 * 60 * 1000);
    if (msUntilRefresh <= 0) {
      // Token already expired or expires soon, refresh now
      refreshTokenInternal();
      return;
    }

    console.log(`⏰ MS Graph token auto-refresh scheduled in ${(msUntilRefresh / 1000 / 60).toFixed(1)} minutes`);

    const timeout = setTimeout(async () => {
      console.log('🔄 Auto-refreshing MS Graph token');
      await refreshTokenInternal();
    }, msUntilRefresh);

    return () => clearTimeout(timeout);
  }, [tokenExpiry]);

  const refreshTokenInternal = useCallback(async () => {
    const msal = await getMsalInstance();
    if (!msal) return;

    const accounts = msal.getAllAccounts();
    if (accounts.length === 0) {
      console.log('❌ No MS account found');
      setIsConnected(false);
      setAccessToken(null);
      setTokenExpiry(null);
      return;
    }

    try {
      const response = await msal.acquireTokenSilent({
        ...loginRequest,
        account: accounts[0],
        forceRefresh: true, // Always force refresh when explicitly called
      });

      setAccessToken(response.accessToken);
      setTokenExpiry(response.expiresOn || null);
      setIsConnected(true);

      const minutesUntilExpiry = response.expiresOn
        ? (response.expiresOn.getTime() - Date.now()) / (1000 * 60)
        : 0;

      console.log(`🔑 MS Graph token refreshed, expires in ${minutesUntilExpiry.toFixed(1)} minutes`);
    } catch (error) {
      if (error instanceof InteractionRequiredAuthError) {
        console.warn('⚠️ Interactive login required for token refresh');
        // Don't auto-popup, let user trigger manually
        setIsConnected(false);
        setAccessToken(null);
        setTokenExpiry(null);
      } else {
        console.error('Failed to refresh token:', error);
      }
    }
  }, []);

  const login = useCallback(async (): Promise<boolean> => {
    const msal = await getMsalInstance();
    if (!msal) {
      throw new Error('Azure Client ID not configured');
    }

    try {
      await msal.loginPopup({
        ...loginRequest,
        redirectUri: window.location.origin,
        prompt: 'select_account',
      });

      console.log('✅ MS Graph login successful');
      setIsConnected(true);

      // Fetch token after login
      await refreshTokenInternal();

      return true;
    } catch (error) {
      console.error('MS Graph login failed:', error);
      return false;
    }
  }, [refreshTokenInternal]);

  const logout = useCallback(async () => {
    const msal = await getMsalInstance();
    if (!msal) return;

    const accounts = msal.getAllAccounts();
    if (accounts.length > 0) {
      await msal.logoutPopup({ account: accounts[0] });
    }

    setIsConnected(false);
    setAccessToken(null);
    setTokenExpiry(null);
    console.log('👋 MS Graph logged out');
  }, []);

  const getValidToken = useCallback(async (): Promise<string | null> => {
    // If we have a valid token, return it
    if (accessToken && tokenExpiry) {
      const minutesUntilExpiry = (tokenExpiry.getTime() - Date.now()) / (1000 * 60);

      // If token expires in >5 min, return cached token
      if (minutesUntilExpiry > 5) {
        return accessToken;
      }

      // Token expiring soon, refresh it
      console.log('🔄 Token expiring soon, refreshing...');
      await refreshTokenInternal();
      return accessToken; // Return refreshed token
    }

    // No token or expired, try to get one silently
    const msal = await getMsalInstance();
    if (!msal) return null;

    const accounts = msal.getAllAccounts();
    if (accounts.length === 0) return null;

    try {
      const response = await msal.acquireTokenSilent({
        ...loginRequest,
        account: accounts[0],
        forceRefresh: false, // Use cache if valid
      });

      const minutesUntilExpiry = response.expiresOn
        ? (response.expiresOn.getTime() - Date.now()) / (1000 * 60)
        : 0;

      console.log(`🔑 Got MS Graph token, expires in ${minutesUntilExpiry.toFixed(1)} minutes`);

      setAccessToken(response.accessToken);
      setTokenExpiry(response.expiresOn || null);
      setIsConnected(true);

      return response.accessToken;
    } catch (error) {
      if (error instanceof InteractionRequiredAuthError) {
        console.warn('⚠️ Interactive login required');
        setIsConnected(false);
        return null;
      }
      throw error;
    }
  }, [accessToken, tokenExpiry, refreshTokenInternal]);

  const value: MicrosoftGraphContextType = {
    isConnected,
    accessToken,
    tokenExpiry,
    login,
    logout,
    refreshToken: refreshTokenInternal,
    getValidToken,
  };

  return (
    <MicrosoftGraphContext.Provider value={value}>
      {children}
    </MicrosoftGraphContext.Provider>
  );
}

export function useMicrosoftGraph() {
  const context = useContext(MicrosoftGraphContext);
  if (context === undefined) {
    throw new Error('useMicrosoftGraph must be used within a MicrosoftGraphProvider');
  }
  return context;
}
