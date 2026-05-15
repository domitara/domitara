import { createFileRoute } from '@tanstack/react-router';
import { ItemDetailScreen } from '../../../screens/ItemDetailScreen';

export const Route = createFileRoute('/_auth/items/$itemId')({
  component: ItemDetailRoute,
});

function ItemDetailRoute() {
  const { itemId } = Route.useParams();
  return <ItemDetailScreen itemId={itemId}/>;
}
