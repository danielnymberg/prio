import { ButtonHTMLAttributes, forwardRef } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', children, ...props }, ref) => {
    // Kompaktare design men fortfarande touch-friendly
    const baseStyles = 'rounded-lg font-medium transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] whitespace-nowrap inline-flex items-center justify-center gap-2';

    const variants = {
      primary: 'bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white focus:ring-amber-400 shadow-sm hover:shadow-md',
      secondary: 'bg-sand-200 hover:bg-sand-300 active:bg-sand-300 text-stone-700 dark:bg-charcoal-800 dark:hover:bg-charcoal-700 dark:active:bg-charcoal-700 dark:text-stone-200 focus:ring-amber-400',
      ghost: 'bg-transparent hover:bg-sand-100 active:bg-sand-200 text-stone-700 dark:hover:bg-charcoal-850 dark:active:bg-charcoal-800 dark:text-stone-300 focus:ring-amber-400',
    };

    // Kompaktare men fortfarande tillräckligt stora för touch
    const sizes = {
      sm: 'px-3 py-1.5 text-xs min-h-[36px]',
      md: 'px-4 py-2 text-sm min-h-[40px]',
      lg: 'px-5 py-2.5 text-base min-h-[44px]',
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
