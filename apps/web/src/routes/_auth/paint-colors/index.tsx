import { createFileRoute } from '@tanstack/react-router';
import { PaintColorsScreen } from '../../../screens/PaintColorsScreen';

export const Route = createFileRoute('/_auth/paint-colors/')({
  component: PaintColorsScreen,
});
