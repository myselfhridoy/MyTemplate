import React, { Component } from 'react'
import { Link } from 'react-router-dom'

export default class Navbar extends Component {
  toggleTheme = () => {
    const html = document.documentElement
    html.getAttribute('data-theme') === 'dark' 
      ? html.setAttribute('data-theme', 'light')
      : html.setAttribute('data-theme', 'dark')
  }

  render() {
    return (
      <div className="fixed w-full top-0 z-50">
        <div className="navbar bg-base-100 shadow-sm">
  <div className="navbar-start">
    <div className="dropdown">
      <div tabIndex={0} role="button" className="btn btn-ghost btn-circle">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"> <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h7" /> </svg>
      </div>
      <ul
        tabIndex={0}
        className="menu menu-sm dropdown-content bg-base-100 rounded-box z-1 mt-3 w-52 p-2 shadow">
        <li><Link to="/dashboard">Dashboard</Link></li>
        {/* <li><Link to="/portfolio">Portfolio</Link></li> */}
        {/* <li><Link to="/about">About</Link></li> */}
        {/* <li><Link to="/example">Example CQ</Link></li> */}
        {/* <li><Link to="/example-with-answer">CQ With Answer</Link></li> */}
        {/* <li><Link to="/cq-filter">CQ Filter</Link></li> */}
        <li><Link to="/creative-cq">প্রশ্ন ব্যাংক</Link></li>
        <li><Link to="/selftest">সেলফ টেস্ট</Link></li>
      </ul>
    </div>
  </div>
  <div className="navbar-center">
    <Link to="/" className="btn btn-ghost text-xl">H.M. Tutoring</Link>
  </div>
  <div className="navbar-end">
    {/* Theme toggle button */}
    <button 
      className="btn btn-ghost btn-circle"
      onClick={this.toggleTheme}
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
    )
  }
}
