import { createFileRoute } from '@tanstack/react-router';
import { AddHomeScreen } from '../../../screens/AddHomeScreen';

export const Route = createFileRoute('/_auth/home/new')({
  component: AddHomeScreen,
});
