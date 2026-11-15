import React from 'react';
import { Link } from 'react-router-dom';
import './NotFound.css';

const NotFound = () => (
  <div className="notfound">
    <div className="notfound__inner">
      <div className="notfound__code" aria-hidden="true">404</div>
      <h1 className="notfound__title">Page not found</h1>
      <p className="notfound__sub">
        Looks like this page went on a campus tour and never came back.
      </p>
      <Link to="/" className="btn btn-primary btn-lg">
        Back to Home
      </Link>
    </div>
  </div>
);

export default NotFound;
