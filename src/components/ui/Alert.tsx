import { AlertTriangle, Info, CheckCircle, XCircle } from 'lucide-react';

interface AlertProps {
  variant?: 'info' | 'warning' | 'success' | 'error';
  title?: string;
  children: React.ReactNode;
}

const variantConfig = {
  info: {
    icon: Info,
    bg: 'bg-sand-100 dark:bg-charcoal-850',
    border: 'border-sand-300 dark:border-charcoal-700',
    iconColor: 'text-copper-600 dark:text-copper-400',
    titleColor: 'text-stone-600 dark:text-sand-100',
    textColor: 'text-stone-600 dark:text-sand-200',
  },
  warning: {
    icon: AlertTriangle,
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    border: 'border-amber-200 dark:border-amber-800',
    iconColor: 'text-amber-600 dark:text-amber-400',
    titleColor: 'text-amber-900 dark:text-amber-100',
    textColor: 'text-amber-800 dark:text-amber-200',
  },
  success: {
    icon: CheckCircle,
    bg: 'bg-green-50 dark:bg-green-900/20',
    border: 'border-green-200 dark:border-green-800',
    iconColor: 'text-green-600 dark:text-green-400',
    titleColor: 'text-green-900 dark:text-green-100',
    textColor: 'text-green-800 dark:text-green-200',
  },
  error: {
    icon: XCircle,
    bg: 'bg-red-50 dark:bg-red-900/20',
    border: 'border-red-200 dark:border-red-800',
    iconColor: 'text-red-600 dark:text-red-400',
    titleColor: 'text-red-900 dark:text-red-100',
    textColor: 'text-red-800 dark:text-red-200',
  },
};

export function Alert({ variant = 'info', title, children }: AlertProps) {
  const config = variantConfig[variant];
  const Icon = config.icon;

  return (
    <div className={`${config.bg} border ${config.border} rounded-lg p-4`}>
      <div className="flex items-start gap-3">
        <Icon className={`h-5 w-5 ${config.iconColor} flex-shrink-0 mt-0.5`} />
        <div className="flex-1">
          {title && (
            <h3 className={`font-semibold ${config.titleColor} mb-1`}>
              {title}
            </h3>
          )}
          <div className={`text-sm ${config.textColor}`}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
