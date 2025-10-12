import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './styles/syncfusion-dark.css';
import './styles/dialog.css';
import './styles/button.css';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { Toaster } from 'react-hot-toast';
import { ErrorBoundary } from './components/ErrorBoundary';
import { logDebugInfo } from './utils/debug';
import { registerLicense, enableRipple, setCulture } from '@syncfusion/ej2-base';

// Import Syncfusion CSS
import '@syncfusion/ej2-base/styles/material.css';
import '@syncfusion/ej2-buttons/styles/material.css';
import '@syncfusion/ej2-calendars/styles/material.css';
import '@syncfusion/ej2-dropdowns/styles/material.css';
import '@syncfusion/ej2-inputs/styles/material.css';
import '@syncfusion/ej2-lists/styles/material.css';
import '@syncfusion/ej2-navigations/styles/material.css';
import '@syncfusion/ej2-popups/styles/material.css';
import '@syncfusion/ej2-splitbuttons/styles/material.css';
import '@syncfusion/ej2-react-schedule/styles/material.css';
import '@syncfusion/ej2-react-kanban/styles/material.css';
import '@syncfusion/ej2-notifications/styles/material.css';

// Register Syncfusion license
const syncfusionLicense = import.meta.env.VITE_SYNCFUSION_LICENSE_KEY;
if (syncfusionLicense) {
  registerLicense(syncfusionLicense);
} else {
  console.warn('Syncfusion license key not found. Add VITE_SYNCFUSION_LICENSE_KEY to .env.local');
}

// Enable ripple effect globally for Material design
enableRipple(true);

// Set Swedish culture globally
setCulture('sv');

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
