import { createFileRoute } from '@tanstack/react-router';
import { DashboardScreen } from '../../screens/DashboardScreen';

export const Route = createFileRoute('/_auth/dashboard')({
  component: DashboardScreen,
});
