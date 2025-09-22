import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

function Navbar() {
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
                <li><Link to="/bookcontent" onClick={() => setTimeout(() => handleMenuClick(), 50)}>পাঠ্যবই</Link></li>
                <li><Link to="/selftest" onClick={() => setTimeout(() => handleMenuClick(), 50)}>সেলফ টেস্ট</Link></li>
                {/* <li><Link to="/ai-assistant" onClick={() => setTimeout(() => handleMenuClick(), 50)}>AI সহকারী</Link></li> */}
                {/* <li><Link to="/unlimited-ai-qa" onClick={() => setTimeout(() => handleMenuClick(), 50)}>আনলিমিটেড AI প্রশ্ন-উত্তর</Link></li> */}
                {/* <li><Link to="/ai-chat" onClick={() => setTimeout(() => handleMenuClick(), 50)}>AI Chat</Link></li> */}
                {/* <li><Link to="/doubt-solve" onClick={() => setTimeout(() => handleMenuClick(), 50)}>ডাউট সলভ</Link></li> */}
                <li><Link to="/ai-aggregator" onClick={() => setTimeout(() => handleMenuClick(), 50)}>AI টিউটর</Link></li>
                <li><Link to="/ai-aggregator-2" onClick={() => setTimeout(() => handleMenuClick(), 50)}>AI টিউটর (সকল শ্রেণি)</Link></li>
                <li><Link to="/chatpdf" onClick={() => setTimeout(() => handleMenuClick(), 50)}>AI Chat PDF</Link></li>
                <li><Link to="/tools" onClick={() => setTimeout(() => handleMenuClick(), 50)}>Tools</Link></li>
              </ul>
            )}
          </div>
        </div>
        <div className="navbar-center">
          <Link to="/" className="btn btn-ghost px-2">
            <span className="relative block h-12" style={{width:'100px', maxWidth:'100%'}} key={themeKey}>
              <img
                src={currentTheme === 'dark' ? '/HMT Logo White.png' : '/HMT Logo.png'}
                alt="HMT Logo"
                className="absolute inset-0 h-12 object-contain"
                style={{maxHeight:'48px', width:'180px', maxWidth:'100%'}}
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
          <button className="btn btn-ghost btn-circle">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"> <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /> </svg>
          </button>
          <button className="btn btn-ghost btn-circle">
            <div className="indicator">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"> <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /> </svg>
              <span className="badge badge-xs badge-primary indicator-item"></span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

export default Navbar;