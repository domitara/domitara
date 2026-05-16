import { createFileRoute } from '@tanstack/react-router';
import { AllItemsScreen } from '../../../screens/AllItemsScreen';

export const Route = createFileRoute('/_auth/labels/$labelId')({
  component: LabelRoute,
});

function LabelRoute() {
  const { labelId } = Route.useParams();
  return <AllItemsScreen filterLabelId={labelId} />;
}
