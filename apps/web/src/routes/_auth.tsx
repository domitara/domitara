import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { auth } from '../auth';
import { DomitaraShell } from '../components/Shell';

export const Route = createFileRoute('/_auth')({
  beforeLoad: () => {
    if (!auth.isAuthenticated()) throw redirect({ to: '/login' });
  },
  component: () => (
    <DomitaraShell>
      <Outlet/>
    </DomitaraShell>
  ),
});
