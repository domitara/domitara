import { createFileRoute } from '@tanstack/react-router';
import { MaintenanceScreen } from '../../screens/MaintenanceScreen';

export const Route = createFileRoute('/_auth/maintenance')({
  component: MaintenanceScreen,
});
