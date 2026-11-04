import React from 'react';

export default function iOSSpinner({ size = 'md', className = '' }) {
  const sizes = { sm: 'w-4 h-4 border-2', md: 'w-6 h-6 border-2', lg: 'w-8 h-8 border-[3px]' };
  return (
    <span
      className={`inline-block rounded-full border-current border-r-transparent animate-spin ${sizes[size] || sizes.md} ${className}`}
      style={{ animation: 'ios-spin 0.7s linear infinite' }}
    />
  );
}
