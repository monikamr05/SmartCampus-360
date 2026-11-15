import React from 'react';
import { Link } from 'react-router-dom';
import Features from '../components/Features';
import './FeaturesPage.css';

const FeaturesPage = () => (
  <div className="features-page">
    {/* Page hero */}
    <section className="features-page__hero" aria-labelledby="features-page-heading">
      <div className="features-page__hero-bg" aria-hidden="true" />
      <div className="container features-page__hero-inner">
        <span className="section-label">Platform Features</span>
        <h1 className="features-page__title" id="features-page-heading">
          Built for every corner<br />
          <span className="gradient-text">of campus life</span>
        </h1>
        <p className="features-page__sub">
          Explore the complete suite of tools that make Smart Campus 360 the most
          comprehensive campus platform available today.
        </p>
        <Link to="/login" className="btn btn-white btn-lg">
          Try It Free
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
      </div>
    </section>

    {/* Reuse the Features component */}
    <Features />
  </div>
);

export default FeaturesPage;
