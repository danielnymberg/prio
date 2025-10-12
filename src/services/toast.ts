import { ToastComponent } from '@syncfusion/ej2-react-notifications';
import { createRef } from 'react';

// Global toast reference
export const globalToastRef = createRef<ToastComponent>();

// Toast utility functions
export const showToast = {
  success: (message: string, title: string = 'Klart!') => {
    if (globalToastRef.current) {
      globalToastRef.current.show({
        title,
        content: message,
        cssClass: 'e-toast-success',
        icon: 'e-success toast-icons',
        showCloseButton: true,
        timeOut: 3000,
      });
    }
  },

  error: (message: string, title: string = 'Fel') => {
    if (globalToastRef.current) {
      globalToastRef.current.show({
        title,
        content: message,
        cssClass: 'e-toast-danger',
        icon: 'e-error toast-icons',
        showCloseButton: true,
        timeOut: 5000,
      });
    }
  },

  info: (message: string, title: string = 'Info') => {
    if (globalToastRef.current) {
      globalToastRef.current.show({
        title,
        content: message,
        cssClass: 'e-toast-info',
        icon: 'e-info toast-icons',
        showCloseButton: true,
        timeOut: 3000,
      });
    }
  },

  warning: (message: string, title: string = 'Varning') => {
    if (globalToastRef.current) {
      globalToastRef.current.show({
        title,
        content: message,
        cssClass: 'e-toast-warning',
        icon: 'e-warning toast-icons',
        showCloseButton: true,
        timeOut: 4000,
      });
    }
  },

  // Custom toast with all options
  custom: (options: {
    title: string;
    content: string;
    cssClass?: string;
    icon?: string;
    timeOut?: number;
    showCloseButton?: boolean;
  }) => {
    if (globalToastRef.current) {
      globalToastRef.current.show({
        showCloseButton: true,
        timeOut: 3000,
        ...options,
      });
    }
  },
};
