import { createFileRoute } from '@tanstack/react-router';
import { LocationsScreen } from '../../../screens/LocationsScreen';

export const Route = createFileRoute('/_auth/locations/')({
  component: LocationsScreen,
});
