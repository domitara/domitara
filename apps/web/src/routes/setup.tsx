import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { auth } from '../auth';
import { SetupScreen } from '../screens/SetupScreen';

export const Route = createFileRoute('/setup')({
  beforeLoad: async () => {
    const resp = await fetch('/api/v1/system/status');
    const data = await resp.json() as { setup_complete: boolean };
    if (data.setup_complete) {
      throw redirect({ to: auth.isAuthenticated() ? '/dashboard' : '/login' });
    }
  },
  component: SetupRoute,
});

function SetupRoute() {
  const navigate = useNavigate();
  return (
    <SetupScreen
      onComplete={token => {
        auth.setToken(token);
        navigate({ to: '/dashboard' });
      }}
    />
  );
}
