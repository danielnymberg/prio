import { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'sm' | 'md';
}

export function Badge({ children, variant = 'default', size = 'sm' }: BadgeProps) {
  const variants = {
    default: 'badge-default',
    success: 'badge-success',
    warning: 'badge-warning',
    danger: 'badge-danger',
    info: 'badge-info',
  };

  const sizes = {
    sm: 'e-px-8 e-py-4 e-text-xs',
    md: 'e-px-12 e-py-4 e-text-sm',
  };

  return (
    <span
      className={`e-inline-flex e-align-center e-rounded-full e-font-medium ${variants[variant]} ${sizes[size]}`}
    >
      {children}
    </span>
  );
}
