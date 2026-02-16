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
                // Master Admin Login (Env Variables)
                if (formData.email === import.meta.env.VITE_ADMIN_EMAIL && formData.password === import.meta.env.VITE_ADMIN_PASS) {
                    login({ username: 'Master Admin', email: import.meta.env.VITE_ADMIN_EMAIL, isAdmin: true, _id: 'master-admin' });
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
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-base-200 font-['Hind_Siliguri']">
            {/* Background Decor */}
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/10 blur-[120px] animate-pulse"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-secondary/10 blur-[120px] animate-pulse delay-700"></div>

            <div className="card w-full max-w-lg bg-base-100/80 backdrop-blur-2xl shadow-2xl border border-white/10 relative z-10 transition-all duration-300">
                <div className="card-body p-8 sm:p-12">
                    <div className="text-center mb-10">
                        <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-primary to-secondary rounded-3xl flex items-center justify-center shadow-lg shadow-primary/20 transform rotate-3 hover:rotate-6 transition-transform duration-500">
                            <img src="/HMT Logo White.png" alt="Logo" className="w-20 h-20 object-contain drop-shadow-md" />
                        </div>
                        <h2 className="text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary tracking-tight">
                            H.M. Tutoring
                        </h2>
                        <p className="text-base-content/60 text-lg mt-3 font-medium">Welcome back! Please sign in.</p>
                    </div>

                    {error && (
                        <div role="alert" className="alert alert-error text-sm p-4 mb-6 rounded-xl shadow-lg border border-error/20 flex items-center gap-3 animate-bounce-short bg-error/10 text-error-content">
                            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            <span className="font-semibold">{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="form-control group">
                            <label className="label pl-1">
                                <span className="label-text font-bold text-base-content/70 group-focus-within:text-primary transition-colors">Email Address</span>
                            </label>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-base-content/40 group-focus-within:text-primary transition-colors">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M3 4a2 2 0 00-2 2v1.161l8.441 4.221a1.25 1.25 0 001.118 0L19 7.162V6a2 2 0 00-2-2H3z" /><path d="M19 8.839l-7.77 3.885a2.75 2.75 0 01-2.46 0L1 8.839V14a2 2 0 002 2h14a2 2 0 002-2V8.839z" /></svg>
                                </span>
                                <input
                                    type="email"
                                    name="email"
                                    className="input input-lg input-bordered w-full pl-12 focus:input-primary focus:ring-4 focus:ring-primary/10 transition-all duration-300 bg-base-200/40 hover:bg-base-200/60 font-medium text-base rounded-2xl border-base-300"
                                    placeholder="student@example.com"
                                    value={formData.email}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-control group">
                            <label className="label pl-1">
                                <span className="label-text font-bold text-base-content/70 group-focus-within:text-primary transition-colors">Password</span>
                            </label>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-base-content/40 group-focus-within:text-primary transition-colors">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" /></svg>
                                </span>
                                <input
                                    type="password"
                                    name="password"
                                    className="input input-lg input-bordered w-full pl-12 focus:input-primary focus:ring-4 focus:ring-primary/10 transition-all duration-300 bg-base-200/40 hover:bg-base-200/60 font-medium text-base rounded-2xl border-base-300"
                                    placeholder="••••••••"
                                    value={formData.password}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-control mt-10">
                            <button
                                className={`btn btn-lg btn-primary w-full text-white font-bold text-xl shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:-translate-y-1 transition-all duration-300 rounded-2xl disabled:opacity-70 disabled:transform-none`}
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <span className="flex items-center justify-center gap-3">
                                        <span className="loading loading-spinner loading-md"></span>
                                        Logging in...
                                    </span>
                                ) : (
                                    'Sign In'
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            <footer className="absolute bottom-6 text-center text-sm text-base-content/40 font-semibold tracking-wide">
                © {new Date().getFullYear()} H.M. Tutoring. All rights reserved.
            </footer>
        </div>
    );
};

export default LoginPage;
