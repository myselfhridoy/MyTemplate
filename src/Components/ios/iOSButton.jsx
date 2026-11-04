import React from 'react';

export default function iOSButton({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  disabled = false,
  className = '',
  ...props
}) {
  const variants = {
    primary: 'ios-btn ios-btn-primary',
    secondary: 'ios-btn ios-btn-secondary',
    ghost: 'ios-btn ios-btn-ghost',
    danger: 'ios-btn ios-btn-danger',
  };
  const sizes = {
    sm: 'text-[15px] py-2 px-3.5',
    md: '',
    lg: 'text-[19px] py-3.5 px-6',
  };

  return (
    <button
      className={`${variants[variant] || variants.primary} ${sizes[size] || sizes.md} ${fullWidth ? 'w-full' : ''} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <span className="ios-spinner" aria-label="Loading" /> : children}
    </button>
  );
}
