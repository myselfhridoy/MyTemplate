import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../Context/AuthContext';

const MAIN_TABS = [
  { to: '/', label: 'হোম', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { to: '/board-cq', label: 'প্রশ্ন', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' },
  { to: '/ai-models', label: 'AI', icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z' },
  { to: '/newsfeed', label: 'ফিড', icon: 'M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z' },
  { to: '/profile', label: 'প্রোফাইল', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
];

function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [theme, setTheme] = useState('light');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
    document.documentElement.classList.toggle('dark', savedTheme === 'dark');
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
    document.documentElement.classList.toggle('dark', nextTheme === 'dark');
    localStorage.setItem('theme', nextTheme);
  };

  const isActive = (path) => (
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)
  );

  return (
    <>
      <header className="fixed top-0 inset-x-0 z-40 ios-glass border-b border-base-content/10 safe-top">
        <div className="max-w-6xl mx-auto h-14 px-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 ios-pressable">
            <img
              src={theme === 'dark' ? '/HMT Logo White.png' : '/HMT Logo.png'}
              alt="H.M. Tutoring"
              className="h-9 w-auto object-contain"
            />
          </Link>

          <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
            {MAIN_TABS.slice(0, 4).map((tab) => (
              <Link
                key={tab.to}
                to={tab.to}
                aria-current={isActive(tab.to) ? 'page' : undefined}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                  isActive(tab.to)
                    ? 'bg-primary/10 text-primary'
                    : 'text-base-content/70 hover:bg-base-content/5'
                }`}
              >
                {tab.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={toggleTheme}
              className="w-10 h-10 rounded-full hover:bg-base-content/10 flex items-center justify-center ios-pressable"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? '🌙' : '☀️'}
            </button>
            {user ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  aria-expanded={mobileMenuOpen}
                  aria-label="Open account menu"
                  className="w-10 h-10 rounded-full overflow-hidden border-2 border-base-content/10 ios-pressable"
                >
                  <img
                    src={
                      user.isAdmin || user.username === 'admin'
                        ? 'https://img.icons8.com/3d-fluency/94/manager.png'
                        : 'https://img.icons8.com/3d-fluency/94/student-male--v3.png'
                    }
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </button>

                {mobileMenuOpen && (
                  <>
                    <button
                      type="button"
                      aria-label="Close account menu"
                      className="fixed inset-0 z-40 cursor-default"
                      onClick={() => setMobileMenuOpen(false)}
                    />
                    <div className="absolute right-0 top-12 z-50 w-56 ios-card p-1.5 ios-pop">
                      <div className="px-3 py-2 border-b border-base-content/10">
                        <p className="font-semibold text-sm truncate">{user.username}</p>
                        <p className="text-xs text-base-content/50">
                          {user.isAdmin || user.username === 'admin' ? 'Administrator' : 'Student'}
                        </p>
                      </div>
                      <Link to="/profile" className="ios-list-item rounded-lg text-sm">
                        👤 Profile
                      </Link>
                      {(!user.status || user.status.toLowerCase() === 'active' || user.isAdmin) && (
                        <Link to="/routine" className="ios-list-item rounded-lg text-sm">
                          📅 Class Routine
                        </Link>
                      )}
                      {(user.isAdmin || user.username === 'admin') && (
                        <>
                          <Link to="/chatpdf" className="ios-list-item rounded-lg text-sm">
                            📄 AI Chat PDF
                          </Link>
                          <Link to="/admin" className="ios-list-item rounded-lg text-sm">
                            🛡️ Admin Panel
                          </Link>
                          <Link to="/attendance" className="ios-list-item rounded-lg text-sm">
                            ✅ Attendance
                          </Link>
                        </>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setMobileMenuOpen(false);
                          logout();
                          navigate('/login');
                        }}
                        className="ios-list-item rounded-lg text-sm text-error w-full text-left"
                      >
                        🚪 Logout
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <Link
                to="/login"
                className="px-4 py-2 rounded-xl bg-primary text-white font-semibold text-sm ios-pressable"
              >
                Login
              </Link>
            )}
          </div>
        </div>
      </header>

      {user && (
        <nav className="ios-tabbar md:hidden" aria-label="Main navigation">
          {MAIN_TABS.map((tab) => (
            <Link
              key={tab.to}
              to={tab.to}
              aria-current={isActive(tab.to) ? 'page' : undefined}
              className={`ios-tabbar-item ${isActive(tab.to) ? 'active' : ''}`}
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d={tab.icon} />
              </svg>
              <span>{tab.label}</span>
            </Link>
          ))}
        </nav>
      )}
    </>
  );
}

export default Navbar;
