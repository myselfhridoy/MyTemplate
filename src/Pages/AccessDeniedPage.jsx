import React from 'react';
import { useNavigate } from 'react-router-dom';
import IOSButton from '../Components/ios/iOSButton';

export default function AccessDeniedPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-base-200">
      <div className="text-center max-w-sm">
        <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-error/10 flex items-center justify-center">
          <svg
            className="w-12 h-12 text-error"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h1 className="ios-title mb-2">Access Denied</h1>
        <p className="ios-subhead mb-8">
          আপনি এই পেজে প্রবেশ করার অনুমতি রাখেন না।
        </p>
        {React.createElement(
          IOSButton,
          { onClick: () => navigate('/'), fullWidth: true, size: 'lg' },
          'হোমে ফিরে যান'
        )}
      </div>
    </div>
  );
}
