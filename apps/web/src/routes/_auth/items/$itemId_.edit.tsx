import { createFileRoute } from '@tanstack/react-router';
import { EditItemScreen } from '../../../screens/EditItemScreen';

export const Route = createFileRoute('/_auth/items/$itemId_/edit')({
  component: EditItemRoute,
});

function EditItemRoute() {
  const { itemId } = Route.useParams();
  return <EditItemScreen itemId={itemId} />;
}
