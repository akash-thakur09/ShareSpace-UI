import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/useAuth';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string })?.from;
  const redirectTo = from && !from.startsWith('/login') && !from.startsWith('/register') ? from : '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login(email, password);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'rgb(var(--color-bg-base))' }}>
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 shadow-sm">
            <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <span className="text-xl font-bold tracking-tight" style={{ color: 'rgb(var(--color-text-primary))' }}>
            ShareSpace
          </span>
        </div>

        <div
          className="rounded-2xl p-8"
          style={{
            background: 'rgb(var(--color-bg-surface))',
            border: '1px solid rgb(var(--color-border))',
            boxShadow: '0 4px 24px rgb(0 0 0 / 0.06)',
          }}
        >
          <h1 className="text-lg font-semibold mb-1" style={{ color: 'rgb(var(--color-text-primary))' }}>
            Welcome back
          </h1>
          <p className="text-sm mb-6" style={{ color: 'rgb(var(--color-text-muted))' }}>
            Sign in to your account
          </p>

          {error && (
            <div
              className="mb-4 rounded-lg px-3 py-2.5 text-sm"
              style={{ background: 'rgb(254 242 242)', color: 'rgb(185 28 28)', border: '1px solid rgb(254 202 202)' }}
              role="alert"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                Email
              </label>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="input"
                disabled={submitting}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium" style={{ color: 'rgb(var(--color-text-secondary))' }}>
                Password
              </label>
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input"
                disabled={submitting}
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="btn btn-primary mt-1 justify-center"
              style={{ opacity: submitting ? 0.7 : 1 }}
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Signing in…
                </span>
              ) : 'Sign in'}
            </button>
          </form>
        </div>

        <p className="mt-4 text-center text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>
          Don't have an account?{' '}
          <Link to="/register" className="font-medium text-indigo-500 hover:text-indigo-400 transition-colors">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
