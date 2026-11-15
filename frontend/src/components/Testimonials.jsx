import React from 'react';
import './Testimonials.css';

const testimonials = [
  {
    name: 'Aisha Patel',
    role: 'Computer Science Student',
    avatar: 'AP',
    color: 'blue',
    quote:
      'Smart Campus 360 completely changed how I manage my academics. Everything from grades to library books is right in my pocket.',
    rating: 5,
  },
  {
    name: 'Dr. Marcus Chen',
    role: 'Professor of Engineering',
    avatar: 'MC',
    color: 'purple',
    quote:
      'As a faculty member, the analytics dashboard gives me real insights into student performance so I can intervene early and help them succeed.',
    rating: 5,
  },
  {
    name: 'Sofia Romero',
    role: 'Student Council President',
    avatar: 'SR',
    color: 'cyan',
    quote:
      'Organizing campus events has never been smoother. The event management tools saved us hours every week and boosted attendance by 40%.',
    rating: 5,
  },
];

const StarRating = ({ count }) => (
  <div className="testimonial__stars" aria-label={`${count} out of 5 stars`}>
    {Array.from({ length: count }).map((_, i) => (
      <svg key={i} width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    ))}
  </div>
);

const TestimonialCard = ({ name, role, avatar, color, quote, rating }) => (
  <article className={`testimonial-card testimonial-card--${color}`}>
    <div className="testimonial-card__quote-icon" aria-hidden="true">"</div>
    <p className="testimonial-card__quote">{quote}</p>
    <StarRating count={rating} />
    <div className="testimonial-card__author">
      <div className={`testimonial-card__avatar testimonial-card__avatar--${color}`} aria-hidden="true">
        {avatar}
      </div>
      <div className="testimonial-card__info">
        <span className="testimonial-card__name">{name}</span>
        <span className="testimonial-card__role">{role}</span>
      </div>
    </div>
  </article>
);

const Testimonials = () => (
  <section className="testimonials section" aria-labelledby="testimonials-heading">
    <div className="container">
      <div className="testimonials__header">
        <span className="section-label">Testimonials</span>
        <h2 className="section-title" id="testimonials-heading">
          Loved by the <span>campus community</span>
        </h2>
        <p className="section-subtitle">
          Hear from students, faculty, and administrators who use Smart Campus 360 every day.
        </p>
      </div>
      <div className="testimonials__grid">
        {testimonials.map((t) => (
          <TestimonialCard key={t.name} {...t} />
        ))}
      </div>
    </div>
  </section>
);

export default Testimonials;
