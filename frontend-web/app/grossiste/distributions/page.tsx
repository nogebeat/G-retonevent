

import { Suspense } from 'react';
import TicketDistribution from './TicketsDistributions';

export default function Page() {
  return (
    <Suspense fallback={<div>Chargement...</div>}>
      <TicketDistribution />
    </Suspense>
  );
}
