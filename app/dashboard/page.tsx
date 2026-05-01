
import dynamic from 'next/dynamic';
import { Suspense } from 'react';

const FinanceDashboard = dynamic(() => import('@/components/dashboard/FinanceDashboard').then(mod => ({ default: mod.FinanceDashboard })), {
  ssr: true,
});

export default function DashboardPage() {
  return (
    <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>Loading...</div>}>
      <FinanceDashboard />
    </Suspense>
  );
}
