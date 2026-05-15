import { createFileRoute } from '@tanstack/react-router';
import { AssetIDsScreen } from '../../../screens/AssetIDsScreen';

export const Route = createFileRoute('/_auth/asset-ids/')({
  component: AssetIDsScreen,
});
