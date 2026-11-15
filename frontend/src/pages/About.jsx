import React from 'react';
import { Link } from 'react-router-dom';
import './About.css';

const stats = [
  { value: '50K+',  label: 'Active Students' },
  { value: '200+',  label: 'Institutions' },
  { value: '99.9%', label: 'Uptime SLA' },
  { value: '4.9★',  label: 'User Rating' },
];

const team = [
  { name: 'Dr. Eleanor Hayes',  role: 'CEO & Co-Founder',       avatar: 'EH', color: 'blue' },
  { name: 'James Okonkwo',      role: 'CTO & Co-Founder',       avatar: 'JO', color: 'purple' },
  { name: 'Priya Nair',         role: 'Head of Product Design',  avatar: 'PN', color: 'cyan' },
  { name: 'Carlos Mendez',      role: 'Lead Engineer',           avatar: 'CM', color: 'blue' },
];

const values = [
  { icon: '🎯', title: 'Student-First',  desc: 'Every decision starts with how it impacts the student experience.' },
  { icon: '🔒', title: 'Privacy First',  desc: 'Campus data is kept secure, private, and never sold.' },
  { icon: '🌍', title: 'Inclusive',      desc: 'Designed for everyone — regardless of ability or background.' },
  { icon: '⚡', title: 'Always Evolving',desc: 'We iterate fast based on real feedback from real campuses.' },
];

const About = () => (
  <div className="about-page">
    {/* Hero */}
    <section className="about-hero" aria-labelledby="about-hero-heading">
      <div className="about-hero__bg" aria-hidden="true" />
      <div className="container about-hero__inner">
        <span className="section-label">About Us</span>
        <h1 className="about-hero__title" id="about-hero-heading">
          We're building the future<br />
          <span className="gradient-text">of campus life</span>
        </h1>
        <p className="about-hero__sub">
          Smart Campus 360 was founded with a single belief: that every student
          deserves a seamless, modern, and empowering educational environment.
        </p>
      </div>
    </section>

    {/* Stats */}
    <section className="about-stats section" aria-label="Platform statistics">
      <div className="container about-stats__grid">
        {stats.map(({ value, label }) => (
          <div key={label} className="about-stats__item">
            <span className="about-stats__value gradient-text">{value}</span>
            <span className="about-stats__label">{label}</span>
          </div>
        ))}
      </div>
    </section>

    {/* Mission */}
    <section className="about-mission section" aria-labelledby="mission-heading">
      <div className="container about-mission__grid">
        <div className="about-mission__visual" aria-hidden="true">
          <div className="about-mission__blob" />
          <div className="about-mission__card">
            <span className="about-mission__card-icon">🎓</span>
            <h3>Our Mission</h3>
            <p>To make higher education more accessible, efficient, and connected through thoughtful technology.</p>
          </div>
        </div>
        <div className="about-mission__content">
          <span className="section-label">Our Story</span>
          <h2 className="section-title" id="mission-heading">
            Born on a <span>campus</span>, built for all campuses
          </h2>
          <p className="about-mission__text">
            Smart Campus 360 started as a final-year project at a mid-sized university
            where three students were frustrated by outdated systems, missed deadlines,
            and disconnected campus services.
          </p>
          <p className="about-mission__text">
            What began as a simple dashboard evolved into a full-featured platform
            now trusted by hundreds of institutions across the globe. Our team blends
            engineering, design, and education expertise to build tools that actually work.
          </p>
          <Link to="/login" className="btn btn-primary btn-lg">
            Join the Platform
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2.5"
                strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </div>
      </div>
    </section>

    {/* Values */}
    <section className="about-values section" aria-labelledby="values-heading">
      <div className="container">
        <div className="about-values__header">
          <span className="section-label">What We Believe</span>
          <h2 className="section-title" id="values-heading">Our <span>core values</span></h2>
        </div>
        <div className="about-values__grid">
          {values.map(({ icon, title, desc }) => (
            <div key={title} className="about-values__card card">
              <span className="about-values__icon" aria-hidden="true">{icon}</span>
              <h3 className="about-values__title">{title}</h3>
              <p className="about-values__desc">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* Team */}
    <section className="about-team section" aria-labelledby="team-heading">
      <div className="container">
        <div className="about-team__header">
          <span className="section-label">The Team</span>
          <h2 className="section-title" id="team-heading">Meet the <span>people</span> behind it</h2>
          <p className="section-subtitle">
            A passionate group of educators, engineers, and designers united
            by a shared belief in the power of education.
          </p>
        </div>
        <div className="about-team__grid">
          {team.map(({ name, role, avatar, color }) => (
            <div key={name} className="about-team__card card">
              <div className={`about-team__avatar about-team__avatar--${color}`} aria-hidden="true">
                {avatar}
              </div>
              <h3 className="about-team__name">{name}</h3>
              <p className="about-team__role">{role}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  </div>
);

export default About;
