
'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';

const FinansialinOnboarding = dynamic(() => import('@/components/FinansialinOnboarding').then(mod => ({ default: mod.FinansialinOnboarding })), {
  loading: () => <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', fontSize: '18px' }}>Loading...</div>,
  ssr: true,
});

export default function Home() {
  return (
    <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', fontSize: '18px' }}>Loading...</div>}>
      <FinansialinOnboarding />
    </Suspense>
  );
}
