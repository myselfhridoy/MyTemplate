import React from 'react';

export function iOSCard({ children, className = '', onClick }) {
  return (
    <div
      className={`ios-card ${onClick ? 'ios-pressable cursor-pointer' : ''} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

export function iOSCardHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between p-4 pb-2">
      <div className="flex-1 min-w-0">
        {title && <h3 className="ios-headline">{title}</h3>}
        {subtitle && <p className="ios-caption mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function iOSCardBody({ children, className = '' }) {
  return <div className={`p-4 pt-2 ${className}`}>{children}</div>;
}

export default iOSCard;
