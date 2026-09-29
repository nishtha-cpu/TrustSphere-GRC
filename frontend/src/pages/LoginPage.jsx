import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tenantId, setTenantId] = useState('1');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!email.trim() || !password) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    setIsSubmitting(true);

    try {
      await login(email, password, tenantId);
    } catch (err) {
      setErrorMessage(err.message || 'Invalid email or password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">T</div>
          <h1 className="login-title">TrustSphere-GRC</h1>
          <p className="login-subtitle">Enterprise Governance, Risk & Compliance</p>
        </div>

        {errorMessage && (
          <div className="alert alert-error login-alert" role="alert">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              className="form-control"
              placeholder="user@organization.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSubmitting}
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className="form-control"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isSubmitting}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="tenantId">Tenant ID (Dev Mode)</label>
            <input
              id="tenantId"
              type="number"
              className="form-control"
              value={tenantId}
              onChange={(e) => setTenantId(e.target.value)}
              disabled={isSubmitting}
              min="1"
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary login-btn"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <div className="login-footer">
          <p>Protected by Enterprise Auth Architecture</p>
        </div>
      </div>
    </div>
  );
}
