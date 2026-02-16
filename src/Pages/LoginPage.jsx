import React, { useState } from 'react';
import { useAuth } from '../Context/AuthContext';
import { useNavigate } from 'react-router-dom';

const LoginPage = () => {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const response = await fetch('https://geminiai-render.onrender.com/api/students/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
            const data = await response.json();

            if (data.success) {
                login(data.user);
                navigate(data.user.isAdmin ? '/admin' : '/dashboard');
            } else {
                // Master Admin Login (Hardcoded for safety/fallback)
                if (formData.email === 'admin@gmail.com' && formData.password === '123456') {
                    login({ username: 'Master Admin', email: 'admin@gmail.com', isAdmin: true });
                    navigate('/admin');
                } else {
                    setError(data.message || 'Login failed');
                }
            }
        } catch (err) {
            console.error(err);
            setError('Login failed. Server error.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-base-200">
            {/* Background Decor */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/20 blur-[100px] animate-pulse"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-secondary/20 blur-[100px] animate-pulse delay-700"></div>

            <div className="card w-full max-w-md bg-base-100/70 backdrop-blur-xl shadow-2xl border border-white/20 relative z-10 transition-all duration-300 hover:shadow-primary/10">
                <div className="card-body p-8 sm:p-10">
                    <div className="text-center mb-8">
                        <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-tr from-primary to-secondary rounded-2xl flex items-center justify-center shadow-lg transform rotate-3 hover:rotate-6 transition-transform duration-300">
                            <img src="/HMT Logo White.png" alt="Logo" className="w-16 h-16 object-contain drop-shadow-md" />
                        </div>
                        <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
                            H.M. Tutoring
                        </h2>
                        <p className="text-base-content/60 text-sm mt-2 font-medium">Welcome back! Please sign in.</p>
                    </div>

                    {error && (
                        <div role="alert" className="alert alert-error text-sm p-3 mb-6 rounded-lg shadow-md border border-error/20 flex items-center gap-2 animate-bounce-short">
                            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-5 w-5" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="form-control">
                            <label className="label pl-1">
                                <span className="label-text font-semibold text-base-content/80">Email</span>
                            </label>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-base-content/40">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-5 h-5"><path d="M2.5 3A1.5 1.5 0 0 0 1 4.5v.793c.026.009.051.02.076.032L7.674 8.51c.206.1.446.1.652 0l6.598-3.185A.755.755 0 0 1 15 5.293V4.5A1.5 1.5 0 0 0 13.5 3h-11Z" /><path d="M15 6.954 8.978 9.86a2.25 2.25 0 0 1-1.956 0L1 6.954V11.5A1.5 1.5 0 0 0 2.5 13h11a1.5 1.5 0 0 0 1.5-1.5V6.954Z" /></svg>
                                </span>
                                <input
                                    type="email"
                                    name="email"
                                    className="input input-bordered w-full pl-10 focus:input-primary focus:ring-4 focus:ring-primary/20 transition-all duration-300 bg-base-200/50"
                                    placeholder="student@example.com"
                                    value={formData.email}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-control">
                            <label className="label pl-1">
                                <span className="label-text font-semibold text-base-content/80">Password</span>
                            </label>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-base-content/40">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M14 6a4 4 0 0 1-4.899 3.899l-1.955 1.955a.5.5 0 0 1-.353.146H5v1.5a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1-.5-.5v-2.293a.5.5 0 0 1 .146-.353l3.955-3.955A4 4 0 1 1 14 6Zm-4-2a.75.75 0 0 0 0 1.5.5.5 0 0 1 .5.5.75.75 0 0 0 1.5 0 2 2 0 0 0-2-2Z" clipRule="evenodd" /></svg>
                                </span>
                                <input
                                    type="password"
                                    name="password"
                                    className="input input-bordered w-full pl-10 focus:input-primary focus:ring-4 focus:ring-primary/20 transition-all duration-300 bg-base-200/50"
                                    placeholder="••••••••"
                                    value={formData.password}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-control mt-8">
                            <button
                                className={`btn btn-primary w-full text-white font-bold text-lg shadow-lg hover:shadow-primary/40 hover:-translate-y-1 transition-all duration-300 disabled:bg-primary disabled:text-white disabled:opacity-70`}
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <span className="loading loading-spinner loading-md"></span>
                                        Signing In...
                                    </span>
                                ) : (
                                    'Sign In'
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            <footer className="absolute bottom-4 text-center text-xs text-base-content/40 font-medium">
                © {new Date().getFullYear()} H.M. Tutoring. All rights reserved.
            </footer>
        </div>
    );
};

export default LoginPage;
