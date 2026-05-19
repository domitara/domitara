import { createFileRoute } from '@tanstack/react-router';
import { HomeDetailScreen } from '../../../screens/HomeDetailScreen';

export const Route = createFileRoute('/_auth/home/')({
  component: HomeDetailScreen,
});
