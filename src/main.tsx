import React from 'react';
import ReactDOM from 'react-dom/client';
import { registerLicense, enableRipple } from '@syncfusion/ej2-base';

// ============================================
// CRITICAL: Register Syncfusion license BEFORE any SF imports!
// ============================================
const syncfusionLicense = import.meta.env.VITE_SYNCFUSION_LICENSE_KEY || '';
console.log('[SF License] Key loaded:', syncfusionLicense ? `${syncfusionLicense.substring(0, 20)}...` : 'NOT FOUND');
if (!syncfusionLicense) {
  console.error('[SF License] ❌ License key not found in .env.local!');
} else {
  registerLicense(syncfusionLicense);
  console.log('[SF License] ✓ Registered from .env.local (Enterprise Edition)');
}

// NOW safe to import Syncfusion CSS - Fluent2 theme
import '@syncfusion/ej2-base/styles/fluent2.css';
import '@syncfusion/ej2-buttons/styles/fluent2.css';
import '@syncfusion/ej2-calendars/styles/fluent2.css';
import '@syncfusion/ej2-dropdowns/styles/fluent2.css';
import '@syncfusion/ej2-inputs/styles/fluent2.css';
import '@syncfusion/ej2-lists/styles/fluent2.css';
import '@syncfusion/ej2-navigations/styles/fluent2.css';
import '@syncfusion/ej2-popups/styles/fluent2.css';
import '@syncfusion/ej2-splitbuttons/styles/fluent2.css';
import '@syncfusion/ej2-grids/styles/fluent2.css';
import '@syncfusion/ej2-react-schedule/styles/fluent2.css';
import '@syncfusion/ej2-notifications/styles/fluent2.css';
import '@syncfusion/ej2-inplace-editor/styles/fluent2.css';
import '@syncfusion/ej2-layouts/styles/fluent2.css';
import '@syncfusion/ej2-richtexteditor/styles/fluent2.css';
import '@syncfusion/ej2-treegrid/styles/fluent2.css';
import '@syncfusion/ej2-gantt/styles/fluent2.css';
import '@syncfusion/ej2-interactive-chat/styles/fluent2.css';

// Then import our custom CSS (minimal body/root styling only)
import './index.css';

// Import app components AFTER license registration
import App from './App.tsx';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { Toaster } from 'react-hot-toast';
import { ErrorBoundary } from './components/ErrorBoundary';
import { logDebugInfo } from './utils/debug';

// Enable ripple effect globally for Material design
enableRipple(true);

// Load Swedish localization
import { L10n, setCulture as setSyncfusionCulture } from '@syncfusion/ej2-base';
import svSELocale from './locales/sv-SE.json';

// Load locale BEFORE setting culture
L10n.load(svSELocale);

// Set Swedish culture globally - use 'sv-SE' to match locale key
setSyncfusionCulture('sv-SE');

// Initialize Syncfusion theme system
import { initializeSyncfusionTheme } from './services/syncfusion-theme';
initializeSyncfusionTheme();

// Conditional StrictMode - endast i development
const AppWrapper = import.meta.env.DEV ? React.StrictMode : React.Fragment;

// Log debug info on mount (only in development)
if (import.meta.env.DEV) {
  logDebugInfo();
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <AppWrapper>
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <App />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3000,
              style: {
                background: '#333',
                color: '#fff',
              },
            }}
          />
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </AppWrapper>
);
