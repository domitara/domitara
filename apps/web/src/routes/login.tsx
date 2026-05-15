import { createFileRoute, isRedirect, redirect, useNavigate } from '@tanstack/react-router';
import { auth } from '../auth';
import { LoginScreen } from '../screens/LoginScreen';

export const Route = createFileRoute('/login')({
  beforeLoad: async () => {
    try {
      const resp = await fetch('/api/v1/system/status');
      if (resp.ok) {
        const data = await resp.json() as { setup_complete: boolean };
        if (!data.setup_complete) throw redirect({ to: '/setup' });
      }
    } catch (e) {
      if (isRedirect(e)) throw e;
      // API unreachable or returned non-JSON — let the login page render
    }
    if (auth.isAuthenticated()) throw redirect({ to: '/dashboard' });
  },
  component: LoginRoute,
});

function LoginRoute() {
  const navigate = useNavigate();
  return (
    <LoginScreen
      onLogin={token => {
        auth.setToken(token);
        navigate({ to: '/dashboard' });
      }}
    />
  );
}
