import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth, validateLogin, validateRegister } from '../context/AuthContext';
import './Login.css';

const ROLE_DASHBOARD = {
  admin:   '/dashboard/admin',
  faculty: '/dashboard/faculty',
  student: '/dashboard/student',
};

const Login = () => {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { login, register, isAuthenticated, user } = useAuth();

  const [mode,    setMode]    = useState('login');
  const [loading, setLoading] = useState(false);
  const [alert,   setAlert]   = useState({ type: '', text: '' });
  const [errors,  setErrors]  = useState({});

  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [regData,   setRegData]   = useState({
    name: '', email: '', password: '', confirmPassword: '', role: 'student',
  });

  // If already authenticated redirect immediately
  useEffect(() => {
    if (isAuthenticated && user) {
      const from = location.state?.from?.pathname;
      const dest = (from && from !== '/login') ? from : (ROLE_DASHBOARD[user.role] || '/');
      navigate(dest, { replace: true });
    }
  }, [isAuthenticated, user, navigate, location]);

  const switchMode = (m) => { setMode(m); setAlert({ type: '', text: '' }); setErrors({}); };

  /* ── Login ── */
  const handleLogin = async (e) => {
    e.preventDefault();
    const errs = validateLogin(loginData);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setLoading(true);
    setAlert({ type: '', text: '' });
    try {
      const userData = await login(loginData);
      setAlert({ type: 'success', text: `Welcome back, ${userData.name}!` });
      const from = location.state?.from?.pathname;
      const dest = (from && from !== '/login') ? from : (ROLE_DASHBOARD[userData.role] || '/');
      setTimeout(() => navigate(dest, { replace: true }), 600);
    } catch (err) {
      setAlert({ type: 'error', text: err.message || 'Login failed. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  /* ── Register ── */
  const handleRegister = async (e) => {
    e.preventDefault();
    const errs = validateRegister(regData);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setLoading(true);
    setAlert({ type: '', text: '' });
    try {
      const userData = await register({
        name: regData.name, email: regData.email,
        password: regData.password, role: regData.role,
      });
      setAlert({ type: 'success', text: `Account created! Redirecting to your dashboard...` });
      const dest = ROLE_DASHBOARD[userData.role] || '/';
      setTimeout(() => navigate(dest, { replace: true }), 800);
    } catch (err) {
      setAlert({ type: 'error', text: err.message || 'Registration failed. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const setLogin = (field, val) => { setLoginData(p => ({ ...p, [field]: val })); setErrors(p => ({ ...p, [field]: '' })); };
  const setReg   = (field, val) => { setRegData(p  => ({ ...p, [field]: val })); setErrors(p => ({ ...p, [field]: '' })); };

  return (
    <div className="login-page">
      {/* ── Left decorative panel ── */}
      <div className="login-page__left" aria-hidden="true">
        <div className="login-page__left-bg" />
        <div className="login-page__left-content">
          <div className="login-page__logo">
            <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="48" height="48" rx="12" fill="rgba(255,255,255,0.15)" />
              <path d="M24 8L38 16L38 30L24 38L10 30L10 16Z" fill="none" stroke="white" strokeWidth="2.5" />
              <circle cx="24" cy="24" r="5" fill="white" />
            </svg>
            <span>Smart Campus 360</span>
          </div>
          <h2 className="login-page__left-title">Your campus,<br />in your hands.</h2>
          <p className="login-page__left-sub">
            Join thousands of students and faculty who manage their campus life smarter.
          </p>
          <ul className="login-page__perks">
            {[
              'Real-time grades & attendance tracking',
              'Smart event and schedule management',
              'Digital library access from anywhere',
              'Role-based dashboards for every user',
            ].map(p => (
              <li key={p} className="login-page__perk">
                <span className="login-page__perk-icon">✓</span>{p}
              </li>
            ))}
          </ul>

          {/* Role cards */}
          <div className="login-page__roles">
            {[
              { role: 'Admin',   icon: '🛡️', desc: 'Full system control' },
              { role: 'Faculty', icon: '🧑‍🏫', desc: 'Courses & grades' },
              { role: 'Student', icon: '🎓', desc: 'Academic portal' },
            ].map(({ role, icon, desc }) => (
              <div key={role} className="login-page__role-card">
                <span>{icon}</span>
                <div>
                  <div className="login-page__role-name">{role}</div>
                  <div className="login-page__role-desc">{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="login-page__right">
        <div className="login-page__form-wrap">
          <Link to="/" className="login-page__back">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M19 12H5M12 5l-7 7 7 7" stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Back to Home
          </Link>

          {/* Tabs */}
          <div className="login-page__tabs" role="tablist">
            {['login', 'register'].map(m => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={mode === m}
                className={`login-page__tab ${mode === m ? 'login-page__tab--active' : ''}`}
                onClick={() => switchMode(m)}
              >
                {m === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>

          <h1 className="login-page__title">
            {mode === 'login' ? 'Welcome back 👋' : 'Join Smart Campus 360'}
          </h1>
          <p className="login-page__subtitle">
            {mode === 'login'
              ? 'Sign in to access your personalised dashboard.'
              : 'Create your account and choose your role to get started.'}
          </p>

          {alert.text && (
            <div className={`login-page__alert login-page__alert--${alert.type}`} role="alert">
              {alert.type === 'error' && <span>⚠️ </span>}
              {alert.type === 'success' && <span>✅ </span>}
              {alert.text}
            </div>
          )}

          {/* ── LOGIN FORM ── */}
          {mode === 'login' && (
            <form className="login-page__form" onSubmit={handleLogin} noValidate>
              <div className="form-group">
                <label className="form-label" htmlFor="login-email">Email address</label>
                <input
                  id="login-email" type="email" className={`form-input ${errors.email ? 'form-input--error' : ''}`}
                  placeholder="you@university.edu" value={loginData.email}
                  onChange={e => setLogin('email', e.target.value)}
                  autoComplete="email" required
                />
                {errors.email && <span className="form-error">{errors.email}</span>}
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="login-password">Password</label>
                <input
                  id="login-password" type="password" className={`form-input ${errors.password ? 'form-input--error' : ''}`}
                  placeholder="••••••••" value={loginData.password}
                  onChange={e => setLogin('password', e.target.value)}
                  autoComplete="current-password" required
                />
                {errors.password && <span className="form-error">{errors.password}</span>}
              </div>
              <button type="submit" className="btn btn-primary login-page__submit" disabled={loading}>
                {loading ? <span className="login-page__spinner" /> : 'Sign In →'}
              </button>
            </form>
          )}

          {/* ── REGISTER FORM ── */}
          {mode === 'register' && (
            <form className="login-page__form" onSubmit={handleRegister} noValidate>
              <div className="form-group">
                <label className="form-label" htmlFor="reg-name">Full name</label>
                <input
                  id="reg-name" type="text" className={`form-input ${errors.name ? 'form-input--error' : ''}`}
                  placeholder="Jane Smith" value={regData.name}
                  onChange={e => setReg('name', e.target.value)} autoComplete="name" required
                />
                {errors.name && <span className="form-error">{errors.name}</span>}
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="reg-email">Email address</label>
                <input
                  id="reg-email" type="email" className={`form-input ${errors.email ? 'form-input--error' : ''}`}
                  placeholder="you@university.edu" value={regData.email}
                  onChange={e => setReg('email', e.target.value)} autoComplete="email" required
                />
                {errors.email && <span className="form-error">{errors.email}</span>}
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="reg-role">I am a…</label>
                <select
                  id="reg-role" className="form-input"
                  value={regData.role} onChange={e => setReg('role', e.target.value)}
                >
                  <option value="student">🎓 Student</option>
                  <option value="faculty">🧑‍🏫 Faculty</option>
                  <option value="admin">🛡️ Administrator</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="reg-password">Password</label>
                <input
                  id="reg-password" type="password" className={`form-input ${errors.password ? 'form-input--error' : ''}`}
                  placeholder="Min 6 chars, 1 uppercase, 1 number" value={regData.password}
                  onChange={e => setReg('password', e.target.value)} autoComplete="new-password" required
                />
                {errors.password && <span className="form-error">{errors.password}</span>}
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="reg-confirm">Confirm password</label>
                <input
                  id="reg-confirm" type="password" className={`form-input ${errors.confirmPassword ? 'form-input--error' : ''}`}
                  placeholder="••••••••" value={regData.confirmPassword}
                  onChange={e => setReg('confirmPassword', e.target.value)} autoComplete="new-password" required
                />
                {errors.confirmPassword && <span className="form-error">{errors.confirmPassword}</span>}
              </div>
              <button type="submit" className="btn btn-primary login-page__submit" disabled={loading}>
                {loading ? <span className="login-page__spinner" /> : 'Create Account →'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
