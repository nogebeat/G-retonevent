'use client';


import { Suspense } from 'react';
import TicketDistribution from './TicketDistribution';

export default function Page() {
  return (
    <Suspense fallback={<div>Chargement...</div>}>
      <TicketDistribution />
    </Suspense>
  );
}




