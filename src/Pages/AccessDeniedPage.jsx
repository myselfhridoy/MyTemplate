import React from 'react';
import { useNavigate } from 'react-router-dom';

const AccessDeniedPage = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen flex items-center justify-center bg-base-200 px-4">
            <div className="text-center">
                <div className="text-9xl font-bold text-error opacity-20 select-none">403</div>
                <div className="relative -mt-12 z-10">
                    <div className="mx-auto w-24 h-24 bg-error/10 rounded-full flex items-center justify-center mb-6">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                    </div>
                    <h1 className="text-4xl font-bold text-base-content mb-2">Access Denied</h1>
                    <p className="text-base-content/60 mb-8 max-w-md mx-auto">
                        Sorry, you don't have permission to access this page. This area is restricted to administrators only.
                    </p>
                    <button
                        onClick={() => navigate('/')}
                        className="btn btn-primary px-8"
                    >
                        Go Back Home
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AccessDeniedPage;
