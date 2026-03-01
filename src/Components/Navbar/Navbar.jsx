import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../Context/AuthContext';

function Navbar() {
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [themeKey, setThemeKey] = useState(0); // force re-render on theme change
  const [currentTheme, setCurrentTheme] = useState('light');
  // Set theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const html = document.documentElement;
    if (savedTheme === 'dark') {
      html.setAttribute('data-theme', 'dark');
      html.classList.add('dark');
      setCurrentTheme('dark');
    } else {
      html.setAttribute('data-theme', 'light');
      html.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      setCurrentTheme('light');
    }
    setThemeKey((k) => k + 1); // force re-render
  }, []);

  const toggleTheme = () => {
    const html = document.documentElement;
    const themeNow = html.getAttribute('data-theme');
    const newTheme = themeNow === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', newTheme);
    if (newTheme === 'dark') {
      html.classList.add('dark');
      setCurrentTheme('dark');
    } else {
      html.classList.remove('dark');
      setCurrentTheme('light');
    }
    localStorage.setItem('theme', newTheme);
    setThemeKey((k) => k + 1); // force re-render
  };
  const handleDropdown = (open) => setDropdownOpen(open);
  const handleMenuClick = () => setDropdownOpen(false);
  return (
    <div className="fixed w-full top-0 z-50">
      <div className="navbar bg-base-100 shadow-sm" style={{ fontFamily: "'Hind Siliguri', sans-serif" }}>
        <div className="navbar-start">
          <div
            className="dropdown"
            tabIndex={0}
          >
            <button
              type="button"
              className="btn btn-ghost btn-circle"
              onClick={() => handleDropdown(!dropdownOpen)}
              aria-expanded={dropdownOpen}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"> <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h7" /> </svg>
            </button>
            {dropdownOpen && (
              <ul className="menu menu-sm dropdown-content bg-base-100 rounded-box z-1 mt-3 w-52 p-2 shadow">
                <li><Link to="/creative-cq" onClick={() => setTimeout(() => handleMenuClick(), 50)}>প্রশ্ন ব্যাংক</Link></li>
                <li><Link to="/board-cq" onClick={() => setTimeout(() => handleMenuClick(), 50)}>বোর্ড প্রশ্নব্যাংক</Link></li>
                <li><Link to="/newsfeed" onClick={() => setTimeout(() => handleMenuClick(), 50)}>নিউজ ফিড</Link></li>

                {/* Admin Only Routes */}
                {(user?.isAdmin || user?.username === 'admin') && (
                  <>
                    <li><Link to="/bookcontent" onClick={() => setTimeout(() => handleMenuClick(), 50)}>পাঠ্যবই</Link></li>
                    <li><Link to="/selftest" onClick={() => setTimeout(() => handleMenuClick(), 50)}>সেলফ টেস্ট</Link></li>
                    <li><Link to="/chapter-pdf" onClick={() => setTimeout(() => handleMenuClick(), 50)}>PDF Generator</Link></li>
                  </>
                )}

                <li><Link to="/ai-chatbot" onClick={() => setTimeout(() => handleMenuClick(), 50)}>AI Chatbot</Link></li>
                <li><Link to="/ai-aggregator" onClick={() => setTimeout(() => handleMenuClick(), 50)}>AI টিউটর</Link></li>

                {(user?.isAdmin || user?.username === 'admin') && (
                  <>
                    <li><Link to="/ai-aggregator-2" onClick={() => setTimeout(() => handleMenuClick(), 50)}>AI টিউটর (সকল শ্রেণি)</Link></li>
                    <li><Link to="/chatpdf" onClick={() => setTimeout(() => handleMenuClick(), 50)}>AI Chat PDF</Link></li>
                  </>
                )}

                <li><Link to="/tools" onClick={() => setTimeout(() => handleMenuClick(), 50)}>প্রয়োজনীয় টুলস</Link></li>
                <li className="divider" />
                <li><Link to="/privacy-policy" onClick={() => setTimeout(() => handleMenuClick(), 50)}>Privacy Policy</Link></li>
                <li><Link to="/terms-of-service" onClick={() => setTimeout(() => handleMenuClick(), 50)}>Terms of Service</Link></li>
              </ul>
            )}
          </div>
        </div>
        <div className="navbar-center">
          <Link to="/" className="btn btn-ghost px-2">
            <span className="relative block h-12" style={{ width: '100px', maxWidth: '100%' }} key={themeKey}>
              <img
                src={currentTheme === 'dark' ? '/HMT Logo White.png' : '/HMT Logo.png'}
                alt="HMT Logo"
                className="absolute inset-0 h-12 object-contain"
                style={{ maxHeight: '48px', width: '180px', maxWidth: '100%' }}
              />
            </span>
          </Link>
        </div>
        <div className="navbar-end">
          {/* Theme toggle button */}
          <button
            className="btn btn-ghost btn-circle"
            onClick={toggleTheme}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </button>

          {user ? (
            <div className="dropdown dropdown-end">
              <label tabIndex={0} className="btn btn-ghost btn-circle avatar">
                <div className="w-10 rounded-full border border-base-content/10">
                  <img
                    src={(user.isAdmin || user.username === 'admin')
                      ? "https://img.icons8.com/3d-fluency/94/manager.png"
                      : "https://img.icons8.com/3d-fluency/94/student-male--v3.png"}
                    alt="user"
                  />
                </div>
              </label>
              <ul tabIndex={0} className="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-100 rounded-box w-52">
                <li>
                  <a className="justify-between">
                    {user.username}
                    <span className="badge badge-primary badge-outline">{(user.isAdmin || user.username === 'admin') ? 'Admin' : 'Student'}</span>
                  </a>
                </li>
                {(user?.isAdmin || user?.username === 'admin') && (
                  <>
                    <li><Link to="/admin">Admin Panel</Link></li>
                    <li><Link to="/attendance">Attendance Tracker</Link></li>
                  </>
                )}
                {/* Only show Routine for active students (or admins) */}
                {(!user?.status || user?.status.toLowerCase() === 'active' || user?.isAdmin) && (
                  <li><Link to="/routine">Class Routine</Link></li>
                )}
                <li><Link to="/profile">Profile</Link></li>
                <li><a onClick={logout}>Logout</a></li>
              </ul>
            </div>
          ) : (
            <Link to="/login" className="btn btn-primary btn-sm ml-2">Login</Link>
          )}
        </div>
      </div>
    </div>
  );
}

export default Navbar;