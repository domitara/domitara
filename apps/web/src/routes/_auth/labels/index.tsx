import { createFileRoute } from '@tanstack/react-router';
import { LabelsScreen } from '../../../screens/LabelsScreen';

export const Route = createFileRoute('/_auth/labels/')({
  component: LabelsScreen,
});
