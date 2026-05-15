import { createFileRoute } from '@tanstack/react-router';
import { AllItemsScreen } from '../../../screens/AllItemsScreen';

export const Route = createFileRoute('/_auth/locations/$locationId')({
  component: LocationRoute,
});

function LocationRoute() {
  const { locationId } = Route.useParams();
  return <AllItemsScreen filterLocationId={locationId}/>;
}
