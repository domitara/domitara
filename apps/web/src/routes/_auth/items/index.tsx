import { createFileRoute } from '@tanstack/react-router';
import { AllItemsScreen } from '../../../screens/AllItemsScreen';

export const Route = createFileRoute('/_auth/items/')({
  component: AllItemsScreen,
});
