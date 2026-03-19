import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/useAuth';

/** Shows a full-screen spinner while the session check is in flight, then
 *  redirects to /login if unauthenticated — preserving the intended destination. */
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div
        className="flex h-screen items-center justify-center"
        style={{ background: 'rgb(var(--color-bg-base))' }}
      >
        <div className="flex flex-col items-center gap-3">
          <div
            className="h-7 w-7 animate-spin rounded-full border-2"
            style={{ borderColor: 'rgb(var(--color-border))', borderTopColor: 'rgb(99 102 241)' }}
          />
          <p className="text-sm" style={{ color: 'rgb(var(--color-text-muted))' }}>Loading…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return <>{children}</>;
}
