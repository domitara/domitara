import { createFileRoute } from '@tanstack/react-router';
import { AddItemScreen } from '../../../screens/AddItemScreen';

export const Route = createFileRoute('/_auth/items/new')({
  component: AddItemScreen,
});
