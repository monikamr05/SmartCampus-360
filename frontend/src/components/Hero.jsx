import React from 'react';
import { Link } from 'react-router-dom';
import './Hero.css';

const Hero = () => {
  return (
    <section className="hero" aria-label="Hero section">
      {/* Animated background shapes */}
      <div className="hero__bg" aria-hidden="true">
        <div className="hero__blob hero__blob--1" />
        <div className="hero__blob hero__blob--2" />
        <div className="hero__blob hero__blob--3" />
        <div className="hero__grid" />
      </div>

      <div className="container hero__inner">
        <div className="hero__content">
          {/* Badge */}
          <div className="hero__badge">
            <span className="hero__badge-dot" aria-hidden="true" />
            Next-Generation Campus Platform
          </div>

          {/* Headline */}
          <h1 className="hero__title">
            Your Campus,{' '}
            <span className="gradient-text">Smarter</span>{' '}
            Than Ever
          </h1>

          {/* Subtext */}
          <p className="hero__subtitle">
            Smart Campus 360 unifies academics, administration, events, and 
            campus life into one powerful digital platform — built for 
            students, faculty, and staff.
          </p>

          {/* CTA Buttons */}
          <div className="hero__actions">
            <Link to="/login" className="btn btn-white btn-lg hero__cta-primary">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2.5"
                  strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Get Started Free
            </Link>
            <a href="#features" className="btn hero__cta-secondary">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                <path d="M10 8l6 4-6 4V8z" fill="currentColor" />
              </svg>
              See Features
            </a>
          </div>

          {/* Social proof */}
          <div className="hero__stats">
            {[
              { value: '50K+', label: 'Students' },
              { value: '200+', label: 'Institutions' },
              { value: '99.9%', label: 'Uptime' },
            ].map(({ value, label }) => (
              <div key={label} className="hero__stat">
                <span className="hero__stat-value">{value}</span>
                <span className="hero__stat-label">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Hero visual */}
        <div className="hero__visual" aria-hidden="true">
          <div className="hero__dashboard">
            <div className="hero__dashboard-bar">
              <span /><span /><span />
            </div>
            <div className="hero__dashboard-content">
              <div className="hero__dash-header">
                <div className="hero__dash-avatar" />
                <div className="hero__dash-info">
                  <div className="hero__dash-line hero__dash-line--sm" />
                  <div className="hero__dash-line hero__dash-line--xs" />
                </div>
              </div>
              <div className="hero__dash-cards">
                {['Attendance', 'Grades', 'Events', 'Library'].map((item) => (
                  <div key={item} className="hero__dash-card">
                    <div className="hero__dash-card-icon" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
              <div className="hero__dash-chart">
                {[65, 80, 55, 90, 70, 85, 75].map((h, i) => (
                  <div
                    key={i}
                    className="hero__dash-bar"
                    style={{ '--bar-h': `${h}%`, '--bar-delay': `${i * 0.1}s` }}
                  />
                ))}
              </div>
              <div className="hero__dash-rows">
                <div className="hero__dash-row" />
                <div className="hero__dash-row" />
                <div className="hero__dash-row hero__dash-row--sm" />
              </div>
            </div>
          </div>

          {/* Floating badges */}
          <div className="hero__float hero__float--1">
            <span className="hero__float-icon">📅</span>
            <div>
              <div className="hero__float-title">Class Schedule</div>
              <div className="hero__float-sub">8 classes today</div>
            </div>
          </div>
          <div className="hero__float hero__float--2">
            <span className="hero__float-icon">✅</span>
            <div>
              <div className="hero__float-title">Attendance</div>
              <div className="hero__float-sub">96% this semester</div>
            </div>
          </div>
          <div className="hero__float hero__float--3">
            <span className="hero__float-icon">🏆</span>
            <div>
              <div className="hero__float-title">Top Performer</div>
              <div className="hero__float-sub">GPA 3.9</div>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <a href="#features" className="hero__scroll" aria-label="Scroll to features">
        <div className="hero__scroll-line" />
      </a>
    </section>
  );
};

export default Hero;
