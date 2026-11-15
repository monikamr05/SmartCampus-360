import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

const ROLE_DASHBOARD = {
  admin:   '/dashboard/admin',
  faculty: '/dashboard/faculty',
  student: '/dashboard/student',
};

const ROLE_BADGE = {
  admin:   { label: 'Admin',   color: '#7c3aed' },
  faculty: { label: 'Faculty', color: '#0891b2' },
  student: { label: 'Student', color: '#059669' },
};

const Navbar = () => {
  const [isScrolled, setIsScrolled]   = useState(false);
  const [menuOpen,   setMenuOpen]     = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

  const location  = useLocation();
  const navigate  = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => { setMenuOpen(false); }, [location]);

  // Close user dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/', { replace: true });
  };

  const navLinks = [
    { label: 'Home',     to: '/' },
    { label: 'About',    to: '/about' },
    { label: 'Features', to: '/features' },
  ];

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  const badge = ROLE_BADGE[user?.role] || { label: 'User', color: '#64748b' };

  return (
    <header className={`navbar ${isScrolled ? 'navbar--scrolled' : ''}`}>
      <div className="container navbar__inner">

        {/* Logo */}
        <Link to="/" className="navbar__logo" aria-label="Smart Campus 360 Home">
          <div className="navbar__logo-icon">
            <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <rect width="40" height="40" rx="10" fill="url(#navLogoGrad)" />
              <path d="M20 8 L32 15 L32 25 L20 32 L8 25 L8 15 Z" fill="none" stroke="white" strokeWidth="2" />
              <circle cx="20" cy="20" r="4" fill="white" />
              <defs>
                <linearGradient id="navLogoGrad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#2563eb" />
                  <stop offset="1" stopColor="#7c3aed" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <span className="navbar__logo-text">Smart<span>Campus</span> 360</span>
        </Link>

        {/* Desktop nav links */}
        <nav className="navbar__links" aria-label="Main navigation">
          {navLinks.map(({ label, to }) => (
            <Link
              key={to} to={to}
              className={`navbar__link ${location.pathname === to ? 'navbar__link--active' : ''}`}
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* Desktop actions */}
        <div className="navbar__actions">
          {isAuthenticated && user ? (
            <>
              <Link to={ROLE_DASHBOARD[user.role] || '/dashboard'} className="btn btn-outline navbar__dashboard-btn">
                Dashboard
              </Link>
              <div className="navbar__user" ref={userMenuRef}>
                <button
                  className="navbar__user-btn"
                  onClick={() => setUserMenuOpen(o => !o)}
                  aria-expanded={userMenuOpen}
                  aria-label="User menu"
                >
                  <div className="navbar__avatar" aria-hidden="true">{initials}</div>
                  <div className="navbar__user-info">
                    <span className="navbar__user-name">{user.name}</span>
                    <span className="navbar__user-role" style={{ color: badge.color }}>{badge.label}</span>
                  </div>
                  <svg className={`navbar__chevron ${userMenuOpen ? 'navbar__chevron--open' : ''}`}
                    width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2"
                      strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>

                {userMenuOpen && (
                  <div className="navbar__dropdown" role="menu">
                    <div className="navbar__dropdown-header">
                      <div className="navbar__dropdown-avatar" aria-hidden="true">{initials}</div>
                      <div>
                        <div className="navbar__dropdown-name">{user.name}</div>
                        <div className="navbar__dropdown-email">{user.email}</div>
                      </div>
                    </div>
                    <div className="navbar__dropdown-divider" />
                    <Link
                      to={ROLE_DASHBOARD[user.role] || '/dashboard'}
                      className="navbar__dropdown-item"
                      role="menuitem"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
                        <rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
                        <rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
                        <rect x="14" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                      My Dashboard
                    </Link>
                    <div className="navbar__dropdown-divider" />
                    <button
                      className="navbar__dropdown-item navbar__dropdown-item--danger"
                      role="menuitem"
                      onClick={handleLogout}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"
                          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-outline navbar__login-btn">Login</Link>
              <Link to="/login" className="btn btn-primary">Get Started</Link>
            </>
          )}
        </div>

        {/* Hamburger */}
        <button
          className={`navbar__hamburger ${menuOpen ? 'navbar__hamburger--open' : ''}`}
          onClick={() => setMenuOpen(o => !o)}
          aria-label="Toggle menu" aria-expanded={menuOpen}
        >
          <span /><span /><span />
        </button>
      </div>

      {/* Mobile menu */}
      <div className={`navbar__mobile ${menuOpen ? 'navbar__mobile--open' : ''}`} aria-hidden={!menuOpen}>
        <nav className="navbar__mobile-links">
          {navLinks.map(({ label, to }) => (
            <Link key={to} to={to}
              className={`navbar__mobile-link ${location.pathname === to ? 'navbar__mobile-link--active' : ''}`}
            >
              {label}
            </Link>
          ))}

          {isAuthenticated && user ? (
            <>
              <div className="navbar__mobile-user">
                <div className="navbar__avatar navbar__avatar--mobile" aria-hidden="true">{initials}</div>
                <div>
                  <div className="navbar__user-name">{user.name}</div>
                  <div className="navbar__user-role" style={{ color: badge.color }}>{badge.label}</div>
                </div>
              </div>
              <Link to={ROLE_DASHBOARD[user.role] || '/dashboard'} className="btn btn-outline navbar__mobile-dash">
                My Dashboard
              </Link>
              <button className="btn navbar__mobile-logout" onClick={handleLogout}>
                Sign Out
              </button>
            </>
          ) : (
            <div className="navbar__mobile-actions">
              <Link to="/login" className="btn btn-outline">Login</Link>
              <Link to="/login" className="btn btn-primary">Get Started</Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Navbar;
