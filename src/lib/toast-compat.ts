/**
 * Backward compatibility layer for react-hot-toast
 *
 * This allows existing code using `toast.success()` etc to continue working
 * while we gradually migrate to Syncfusion ToastComponent.
 *
 * Usage:
 * import { toast } from '@/lib/toast-compat'; // Instead of 'react-hot-toast'
 *
 * toast.success('Message');
 * toast.error('Error');
 */

import { showToast } from '@/services/toast';

export const toast = {
  success: (message: string, _options?: { duration?: number; icon?: string }) => {
    showToast.success(message);
  },

  error: (message: string, _options?: { duration?: number; icon?: string }) => {
    showToast.error(message);
  },

  loading: (message: string, _options?: { duration?: number }) => {
    showToast.info(message, 'Laddar...');
  },

  custom: (message: string, _options?: any) => {
    showToast.info(message);
  },

  // Alias för vanliga användningar
  promise: <T,>(
    promise: Promise<T>,
    messages: { loading: string; success: string; error: string }
  ): Promise<T> => {
    showToast.info(messages.loading, 'Laddar...');
    return promise
      .then((result) => {
        showToast.success(messages.success);
        return result;
      })
      .catch((error) => {
        showToast.error(messages.error);
        throw error;
      });
  },
};
