import { ButtonHTMLAttributes, forwardRef } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', children, ...props }, ref) => {
    // Touch-optimerade styles med active states
    const baseStyles = 'rounded-xl font-medium transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.97]';

    const variants = {
      primary: 'bg-copper-500 hover:bg-copper-600 active:bg-copper-700 text-white focus:ring-copper-400 shadow-subtle hover:shadow-soft',
      secondary: 'bg-sand-200 hover:bg-sand-300 active:bg-sand-300 text-stone-700 dark:bg-charcoal-800 dark:hover:bg-charcoal-700 dark:active:bg-charcoal-700 dark:text-stone-200 focus:ring-copper-400',
      ghost: 'bg-transparent hover:bg-sand-100 active:bg-sand-200 text-stone-700 dark:hover:bg-charcoal-850 dark:active:bg-charcoal-800 dark:text-stone-300 focus:ring-copper-400',
    };

    // Touch-optimerade storlekar (min 44px höjd enligt Apple Touch Guidelines)
    const sizes = {
      sm: 'px-4 py-2.5 text-sm min-h-[44px]',
      md: 'px-6 py-3 text-base min-h-[44px]',
      lg: 'px-7 py-4 text-lg min-h-[48px]',
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
