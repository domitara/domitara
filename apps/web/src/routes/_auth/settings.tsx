import { createFileRoute, redirect } from '@tanstack/react-router';
import { auth } from '../../auth';
import { AdminSettingsScreen } from '../../screens/AdminSettingsScreen';

export const Route = createFileRoute('/_auth/settings')({
  beforeLoad: () => {
    if (!auth.isAdmin()) throw redirect({ to: '/dashboard' });
  },
  component: AdminSettingsScreen,
});
