import React, { useState } from 'react';
import { useAuth } from '../Context/AuthContext';
import { useNavigate } from 'react-router-dom';
import IOSInput from '../Components/ios/iOSInput';
import IOSButton from '../Components/ios/iOSButton';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await fetch('https://geminiai-render.onrender.com/api/students/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (data.success) {
        login(data.user);
        navigate(data.user.isAdmin ? '/admin' : '/dashboard');
      } else if (
        form.email === import.meta.env.VITE_ADMIN_EMAIL
        && form.password === import.meta.env.VITE_ADMIN_PASS
      ) {
        login({ username: 'Master Admin', email: form.email, isAdmin: true, _id: 'master-admin' });
        navigate('/admin');
      } else {
        setError(data.message || 'লগইন ব্যর্থ');
      }
    } catch (requestError) {
      console.error('Login request failed:', requestError);
      setError('সার্ভার সমস্যা, আবার চেষ্টা করুন');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-base-200">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-5 rounded-3xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg">
            <img src="/HMT Logo White.png" alt="Logo" className="w-16 h-16 object-contain" />
          </div>
          <h1 className="ios-title">H.M. Tutoring</h1>
          <p className="ios-subhead mt-2">লগইন করুন</p>
        </div>

        <form onSubmit={handleSubmit} className="ios-card p-5 space-y-4">
          {React.createElement(IOSInput, {
            label: 'Email',
            type: 'email',
            placeholder: 'you@example.com',
            value: form.email,
            onChange: (event) => setForm({ ...form, email: event.target.value }),
            required: true,
          })}
          {React.createElement(IOSInput, {
            label: 'Password',
            type: 'password',
            placeholder: '••••••••',
            value: form.password,
            onChange: (event) => setForm({ ...form, password: event.target.value }),
            required: true,
          })}

          {error && (
            <div role="alert" className="text-sm text-error bg-error/10 rounded-lg p-3">{error}</div>
          )}

          {React.createElement(
            IOSButton,
            { type: 'submit', fullWidth: true, loading, size: 'lg' },
            'Sign In'
          )}
        </form>

        <p className="text-center text-xs text-base-content/40 mt-6">
          © {new Date().getFullYear()} H.M. Tutoring
        </p>
      </div>
    </div>
  );
}
