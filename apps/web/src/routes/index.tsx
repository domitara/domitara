import { createFileRoute, redirect } from '@tanstack/react-router';
import { auth } from '../auth';

export const Route = createFileRoute('/')({
  beforeLoad: async () => {
    try {
      const resp = await fetch('/api/v1/system/status');
      const data = await resp.json() as { setup_complete: boolean };
      if (!data.setup_complete) throw redirect({ to: '/setup' });
    } catch (e) {
      if (e && typeof e === 'object' && 'to' in e) throw e;
      // Server unreachable — fall through to login
    }
    if (auth.isAuthenticated()) throw redirect({ to: '/dashboard' });
    throw redirect({ to: '/login' });
  },
  component: () => null,
});
