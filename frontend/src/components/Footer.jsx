import React from 'react';
import { Link } from 'react-router-dom';
import './Footer.css';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  const links = {
    Platform: [
      { label: 'Features',    to: '/features' },
      { label: 'About Us',    to: '/about' },
      { label: 'Get Started', to: '/login' },
    ],
    Resources: [
      { label: 'Documentation', href: '#' },
      { label: 'API Reference',  href: '#' },
      { label: 'Help Center',    href: '#' },
    ],
    Company: [
      { label: 'Privacy Policy', href: '#' },
      { label: 'Terms of Use',   href: '#' },
      { label: 'Contact Us',     href: '#' },
    ],
  };

  return (
    <footer className="footer" role="contentinfo">
      {/* Wave separator */}
      <div className="footer__wave" aria-hidden="true">
        <svg viewBox="0 0 1440 80" preserveAspectRatio="none">
          <path
            d="M0,40 C360,80 1080,0 1440,40 L1440,80 L0,80 Z"
            fill="var(--blue-900)"
          />
        </svg>
      </div>

      <div className="footer__main">
        <div className="container footer__grid">
          {/* Brand column */}
          <div className="footer__brand">
            <Link to="/" className="footer__logo" aria-label="Smart Campus 360">
              <div className="footer__logo-icon" aria-hidden="true">
                <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect width="40" height="40" rx="10" fill="url(#footerLogoGrad)" />
                  <path d="M20 8 L32 15 L32 25 L20 32 L8 25 L8 15 Z" fill="none"
                    stroke="white" strokeWidth="2" />
                  <circle cx="20" cy="20" r="4" fill="white" />
                  <defs>
                    <linearGradient id="footerLogoGrad" x1="0" y1="0" x2="40" y2="40"
                      gradientUnits="userSpaceOnUse">
                      <stop stopColor="#60a5fa" />
                      <stop offset="1" stopColor="#c084fc" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              <span className="footer__logo-text">Smart<span>Campus</span> 360</span>
            </Link>

            <p className="footer__tagline">
              Empowering institutions with next-generation digital infrastructure
              for connected campus communities.
            </p>

            {/* Social icons */}
            <div className="footer__socials" aria-label="Social media links">
              {[
                {
                  name: 'Twitter',
                  href: '#',
                  path: 'M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z',
                },
                {
                  name: 'LinkedIn',
                  href: '#',
                  path: 'M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z M4 6a2 2 0 100-4 2 2 0 000 4z',
                },
                {
                  name: 'GitHub',
                  href: '#',
                  path: 'M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 00-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0020 4.77 5.07 5.07 0 0019.91 1S18.73.65 16 2.48a13.38 13.38 0 00-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 005 4.77a5.44 5.44 0 00-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 009 18.13V22',
                },
              ].map(({ name, href, path }) => (
                <a
                  key={name}
                  href={href}
                  className="footer__social-link"
                  aria-label={name}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                    strokeLinejoin="round" aria-hidden="true">
                    <path d={path} />
                  </svg>
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(links).map(([heading, items]) => (
            <div key={heading} className="footer__col">
              <h3 className="footer__col-heading">{heading}</h3>
              <ul className="footer__col-links">
                {items.map(({ label, to, href }) => (
                  <li key={label}>
                    {to ? (
                      <Link to={to} className="footer__link">{label}</Link>
                    ) : (
                      <a href={href} className="footer__link">{label}</a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="footer__bottom">
        <div className="container footer__bottom-inner">
          <p className="footer__copy">
            &copy; {currentYear} Smart Campus 360. All rights reserved.
          </p>
          <p className="footer__credit">
            Built with ❤️ for the future of education
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
