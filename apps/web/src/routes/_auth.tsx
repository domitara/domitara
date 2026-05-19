import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { auth } from '../auth';
import { DomitaraShell } from '../components/Shell';

export const Route = createFileRoute('/_auth')({
  beforeLoad: async () => {
    try {
      const resp = await fetch('/api/v1/system/status');
      const data = (await resp.json()) as { setup_complete: boolean };
      if (!data.setup_complete) throw redirect({ to: '/setup' });
    } catch (e) {
      if (e && typeof e === 'object' && 'to' in e) throw e;
    }
    if (!auth.isAuthenticated()) throw redirect({ to: '/login' });
  },
  component: () => (
    <DomitaraShell>
      <Outlet />
    </DomitaraShell>
  ),
});
