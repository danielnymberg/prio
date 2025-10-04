import { ButtonHTMLAttributes, forwardRef } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', children, ...props }, ref) => {
    // Touch-optimerade styles med active states
    const baseStyles = 'rounded-lg font-medium transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95';

    const variants = {
      primary: 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white focus:ring-blue-500 shadow-sm hover:shadow-md',
      secondary: 'bg-gray-200 hover:bg-gray-300 active:bg-gray-400 text-gray-900 dark:bg-gray-700 dark:hover:bg-gray-600 dark:active:bg-gray-500 dark:text-white focus:ring-gray-500',
      ghost: 'bg-transparent hover:bg-gray-100 active:bg-gray-200 text-gray-700 dark:hover:bg-gray-800 dark:active:bg-gray-700 dark:text-gray-300 focus:ring-gray-500',
    };

    // Touch-optimerade storlekar (min 44px höjd enligt Apple Touch Guidelines)
    const sizes = {
      sm: 'px-4 py-2.5 text-sm min-h-[44px]',
      md: 'px-5 py-3 text-base min-h-[44px]',
      lg: 'px-6 py-4 text-lg min-h-[48px]',
    };

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
