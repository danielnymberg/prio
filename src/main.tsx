import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { Toaster } from 'react-hot-toast';
import { ErrorBoundary } from './components/ErrorBoundary';
import { logDebugInfo } from './utils/debug';
import { registerLicense, enableRipple } from '@syncfusion/ej2-base';

// Import Syncfusion CSS FIRST - Fluent2 theme (clean, modern, monochrome-friendly)
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
import '@syncfusion/ej2-react-gantt/styles/fluent2.css';

// Then import our custom CSS
import './index.css';
import './styles/app.css';

// Register Syncfusion license FIRST (before any component loads)
// HARDCODED for testing - ska ersättas med env var
const syncfusionLicense = 'Ngo9BigBOggjHTQxAR8/V1JFaF5cXGRCf1FpRmJGdld5fUVHYVZUTXxaS00DNHVRdkdmWH9cc3VTRmdZWUFzVkFWYEg=';
console.log('[SF License] Key loaded:', syncfusionLicense ? `${syncfusionLicense.substring(0, 20)}...` : 'NOT FOUND');
registerLicense(syncfusionLicense);
console.log('[SF License] ✓ Registered (HARDCODED Enterprise Edition v31.x.x)');

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
