import React, { useState } from 'react';
import sha256 from 'js-sha256';
import { useNavigate } from 'react-router-dom';
import ReCAPTCHA from 'react-google-recaptcha';

export default function SelfTestRegister() {
  const navigate = useNavigate();
  const [mobile, setMobile] = useState('');
  const [captchaValue, setCaptchaValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [otpStep, setOtpStep] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const [setPasswordStep, setSetPasswordStep] = useState(false);
  const [fullName, setFullName] = useState('');
  const [password1, setPassword1] = useState('');
  const [password2, setPassword2] = useState('');
  const [setPasswordLoading, setSetPasswordLoading] = useState(false);
  const [setPasswordError, setSetPasswordError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('');
    if (!mobile.match(/^01[3-9]\d{8}$/)) {
      setStatus('সঠিক মোবাইল নম্বর দিন (১১ ডিজিট)');
      return;
    }
    if (!captchaValue) {
      setStatus('reCAPTCHA সম্পন্ন করুন');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('https://api.daricomma.com/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile, captchaValue })
      });
      const data = await res.json();
      if (data.status === 'success' && data.code === 202 && data.message?.toLowerCase().includes('otp')) {
        setOtpStep(true);
        setResendTimer(30);
        setStatus('');
        // Start resend timer
        let timer = setInterval(() => {
          setResendTimer(prev => {
            if (prev <= 1) { clearInterval(timer); return 0; }
            return prev - 1;
          });
        }, 1000);
      } else if (data.status === 'success') {
        setStatus('রেজিস্ট্রেশন সফল!');
        setTimeout(() => navigate('/selftest/login'), 1500);
      } else {
        setStatus(data.message || 'রেজিস্ট্রেশন ব্যর্থ');
      }
    } catch (err) {
      setStatus('ত্রুটি: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    setOtpLoading(true);
    setOtpError('');
    try {
      const res = await fetch('https://api.daricomma.com/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile, otp })
      });
      const data = await res.json();
      if ((data.status === 'success' || data.status === 'sucess')) {
        setOtpStep(false);
        setSetPasswordStep(true);
      } else {
        setOtpError(data.message || 'OTP যাচাই ব্যর্থ');
      }
    } catch (err) {
      setOtpError('ত্রুটি: ' + err.message);
    } finally {
      setOtpLoading(false);
    }
  };

  const handleSetPassword = async (e) => {
    e.preventDefault();
    setSetPasswordError('');
    if (!fullName.trim()) {
      setSetPasswordError('নাম লিখুন');
      return;
    }
    if (!password1 || password1.length < 6) {
      setSetPasswordError('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে');
      return;
    }
    if (password1 !== password2) {
      setSetPasswordError('পাসওয়ার্ড মিলছে না');
      return;
    }
    setSetPasswordLoading(true);
    try {
      const hashedPassword = sha256(password1);
      const res = await fetch('https://api.daricomma.com/auth/v3/register-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullname: fullName,
          password: hashedPassword,
          mobile,
          referred_by_link: 'referral'
        })
      });
      const data = await res.json();
      if (data.status === 'success' && data.access_token) {
        // Auto sign in: save token and redirect
        localStorage.setItem('daricomma_access_token', data.access_token);
        setStatus('রেজিস্ট্রেশন সম্পন্ন! স্বয়ংক্রিয়ভাবে লগইন করা হচ্ছে...');
        setSetPasswordStep(false);
        setTimeout(() => navigate('/selftest'), 1200);
      } else {
        setSetPasswordError(data.message || 'রেজিস্ট্রেশন ব্যর্থ');
      }
    } catch (err) {
      setSetPasswordError('ত্রুটি: ' + err.message);
    } finally {
      setSetPasswordLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setOtpError('');
    setResendTimer(30);
    try {
      await fetch('https://api.daricomma.com/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile, captchaValue })
      });
    } catch {}
    // Start resend timer
    let timer = setInterval(() => {
      setResendTimer(prev => {
        if (prev <= 1) { clearInterval(timer); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
      {!otpStep && !setPasswordStep && (
        <>
        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 p-6 rounded shadow-md w-full max-w-sm">
          <h2 className="text-xl font-bold mb-4 text-center text-gray-900 dark:text-gray-100">SelfTest রেজিস্ট্রেশন</h2>
          <input
            type="text"
            className="input input-bordered w-full mb-3"
            placeholder="মোবাইল নম্বর"
            value={mobile}
            onChange={e => setMobile(e.target.value)}
            disabled={loading}
          />
          <div className="mb-3 flex justify-center">
            <ReCAPTCHA
              sitekey="6LcpqCgqAAAAABDbsWdfnN31_qBn2RE04EFcFToy"
              onChange={setCaptchaValue}
            />
          </div>
          <button type="submit" className="btn btn-primary w-full" disabled={loading}>
            {loading ? 'রেজিস্ট্রেশন হচ্ছে...' : 'রেজিস্টার করুন'}
          </button>
          {status && <div className="mt-3 text-center text-red-600 dark:text-red-300">{status}</div>}
        </form>
        <div className="mt-4 text-center">
          <span className="text-gray-700 dark:text-gray-200">ইতিমধ্যে একাউন্ট আছে?</span>
          <button className="ml-2 text-blue-600 dark:text-blue-400 underline" type="button" onClick={() => navigate('/selftest/login')}>লগইন করুন</button>
        </div>
        </>
      )}
      {otpStep && !setPasswordStep && (
        <form onSubmit={handleOtpSubmit} className="bg-white dark:bg-gray-800 p-6 rounded shadow-md w-full max-w-sm">
          <h2 className="text-xl font-bold mb-4 text-center text-gray-900 dark:text-gray-100">ওটিপি ভেরিফাই করুন!!</h2>
          <div className="mb-2 text-center text-gray-700 dark:text-gray-200">{mobile.replace(/(\d{4})\d{3}(\d{3})/, '$1****$2')} নাম্বারে পাঠানো ৪ ডিজিটের কোডটি লিখুন</div>
          <input
            type="text"
            className="input input-bordered w-full mb-3"
            placeholder="OTP ভেরিফিকেশন কোড *"
            value={otp}
            onChange={e => setOtp(e.target.value)}
            maxLength={4}
            required
            disabled={otpLoading}
          />
          <div className="flex justify-between items-center mb-3">
            <button type="button" className="btn btn-link p-0 text-blue-600 dark:text-blue-400" onClick={handleResendOtp} disabled={resendTimer > 0}>
              আবার কোড পাঠান {resendTimer > 0 ? `(${resendTimer})` : ''}
            </button>
            <button type="button" className="btn btn-link p-0 text-gray-600 dark:text-gray-300" onClick={() => { setOtpStep(false); setOtp(''); setStatus(''); setOtpError(''); }}>নাম্বার পরিবর্তন করুন</button>
          </div>
          <button type="submit" className="btn btn-primary w-full" disabled={otpLoading}>
            {otpLoading ? 'ভেরিফাই হচ্ছে...' : 'সাবমিট করুন'}
          </button>
          {otpError && <div className="mt-3 text-center text-red-600 dark:text-red-300">{otpError}</div>}
          {status && <div className="mt-3 text-center text-green-600 dark:text-green-300">{status}</div>}
        </form>
      )}
      {setPasswordStep && (
        <form onSubmit={handleSetPassword} className="bg-white dark:bg-gray-800 p-6 rounded shadow-md w-full max-w-sm">
          <h2 className="text-xl font-bold mb-4 text-center text-gray-900 dark:text-gray-100">আপনার পাসওয়ার্ড সেট করুন</h2>
          <div className="mb-2 text-center text-gray-700 dark:text-gray-200">পুনরায় একাউন্টে লগ ইন এর ক্ষেত্রে পাসওয়ার্ড দিয়ে লগইন করতে হবে।</div>
          <input
            type="text"
            className="input input-bordered w-full mb-3"
            placeholder="নাম *"
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            required
            disabled={setPasswordLoading}
          />
          <input
            type="text"
            className="input input-bordered w-full mb-3"
            value={mobile}
            disabled
          />
          <input
            type="password"
            className="input input-bordered w-full mb-3"
            placeholder="পাসওয়ার্ড *"
            value={password1}
            onChange={e => setPassword1(e.target.value)}
            required
            disabled={setPasswordLoading}
          />
          <input
            type="password"
            className="input input-bordered w-full mb-3"
            placeholder="কনফার্ম পাসওয়ার্ড *"
            value={password2}
            onChange={e => setPassword2(e.target.value)}
            required
            disabled={setPasswordLoading}
          />
          <button type="submit" className="btn btn-primary w-full" disabled={setPasswordLoading}>
            {setPasswordLoading ? 'সেট হচ্ছে...' : 'সাবমিট করুন'}
          </button>
          {setPasswordError && <div className="mt-3 text-center text-red-600 dark:text-red-300">{setPasswordError}</div>}
          {status && <div className="mt-3 text-center text-green-600 dark:text-green-300">{status}</div>}
        </form>
      )}
    </div>
  );
}
