import React from 'react';
import './Features.css';

const featuresList = [
  {
    icon: '🎓',
    title: 'Academic Management',
    description:
      'Track grades, assignments, and course schedules in one unified dashboard. Get real-time updates on academic performance.',
    color: 'blue',
  },
  {
    icon: '📊',
    title: 'Smart Analytics',
    description:
      'Powerful insights into attendance, performance trends, and campus engagement with visual dashboards.',
    color: 'purple',
  },
  {
    icon: '📅',
    title: 'Event Scheduling',
    description:
      'Discover, register, and manage campus events seamlessly. Get reminders and never miss an important activity.',
    color: 'cyan',
  },
  {
    icon: '🏛️',
    title: 'Campus Navigation',
    description:
      'Interactive campus maps with real-time room availability, facility booking, and indoor navigation support.',
    color: 'blue',
  },
  {
    icon: '💬',
    title: 'Collaboration Hub',
    description:
      'Connect with classmates, faculty, and student clubs. Share resources, join study groups, and collaborate live.',
    color: 'purple',
  },
  {
    icon: '🔔',
    title: 'Smart Notifications',
    description:
      'Personalized alerts for deadlines, exam schedules, fee dues, and campus announcements — all in one place.',
    color: 'cyan',
  },
  {
    icon: '📚',
    title: 'Digital Library',
    description:
      'Access thousands of e-books, research papers, and journals from anywhere. Reserve physical books online.',
    color: 'blue',
  },
  {
    icon: '🏥',
    title: 'Health & Wellness',
    description:
      'Book medical appointments, access mental health resources, and track fitness goals with our wellness portal.',
    color: 'purple',
  },
  {
    icon: '💼',
    title: 'Career Services',
    description:
      'Explore internships, job fairs, and career counseling. Build your resume and connect with alumni networks.',
    color: 'cyan',
  },
];

const FeatureCard = ({ icon, title, description, color }) => (
  <article className={`feature-card feature-card--${color}`}>
    <div className="feature-card__icon-wrap" aria-hidden="true">
      <span className="feature-card__icon">{icon}</span>
    </div>
    <h3 className="feature-card__title">{title}</h3>
    <p className="feature-card__desc">{description}</p>
    <div className="feature-card__arrow" aria-hidden="true">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  </article>
);

const Features = () => {
  return (
    <section className="features-section section" id="features" aria-labelledby="features-heading">
      <div className="container">
        {/* Header */}
        <div className="features-section__header">
          <span className="section-label">Platform Features</span>
          <h2 className="section-title" id="features-heading">
            Everything your campus <span>needs</span>
          </h2>
          <p className="section-subtitle">
            A comprehensive suite of tools designed to make campus life
            more efficient, connected, and enjoyable for everyone.
          </p>
        </div>

        {/* Grid */}
        <div className="features-section__grid" role="list">
          {featuresList.map((feature) => (
            <div key={feature.title} role="listitem">
              <FeatureCard {...feature} />
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="features-section__cta">
          <p>Ready to transform your campus experience?</p>
          <a href="/login" className="btn btn-primary btn-lg">
            Start For Free
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2.5"
                strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
};

export default Features;
