import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'financial';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  className?: string;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', className = '', children, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
    
    const variantStyles = {
      primary: 'bg-primary text-white hover:bg-primary-500 focus:ring-primary',
      secondary: 'bg-obsidian text-white hover:bg-ink focus:ring-obsidian',
      outline: 'border-2 border-primary text-primary hover:bg-primary-50 focus:ring-primary',
      ghost: 'text-ink hover:bg-primary-50 focus:ring-primary',
      destructive: 'bg-destructive text-white hover:bg-destructive-600 focus:ring-destructive',
      financial: 'bg-financial text-ink hover:bg-financial-500 focus:ring-financial',
    };
    
    const sizeStyles = {
      sm: 'px-3 py-1.5 text-sm rounded-small',
      md: 'px-4 py-2 text-base rounded-medium',
      lg: 'px-6 py-3 text-lg rounded-large',
    };
    
    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
