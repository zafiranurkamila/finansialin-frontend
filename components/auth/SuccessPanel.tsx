"use client";

import { BrandLogo } from '@/components/BrandLogo';
import { FundingSourceWizard, type FundingSourceDraft } from '@/components/funding/FundingSourceWizard';
import { apiRequest, type ResourceRecord } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

type Props = {
  onBack: () => void;
};

async function upsertFundingSource(name: string, initialBalance: string) {
  const balanceValue = Number(initialBalance || 0);
  const response = await apiRequest<{ data: ResourceRecord[] }>('/resources');
  const existingSources = response.data || [];
  
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const targetNameNormalized = normalize(name);
  
  const existing = existingSources.find((source) => normalize(source.source) === targetNameNormalized);

  if (existing) {
    return apiRequest<{ data: ResourceRecord }>(`/resources/${existing.idResource}`, {
      method: 'PUT',
      body: JSON.stringify({
        name: name,
        initialBalance: balanceValue,
      }),
    });
  }

  return apiRequest<{ data: ResourceRecord }>('/resources', {
    method: 'POST',
    body: JSON.stringify({
      name: name,
      initialBalance: balanceValue,
    }),
  });
}

export function SuccessPanel({ onBack }: Props) {
  const router = useRouter();
  const [walletSetupOpen, setWalletSetupOpen] = useState(false);
  const [walletSetupLoading, setWalletSetupLoading] = useState(false);
  const [walletSetupError, setWalletSetupError] = useState('');

  const handleWalletSetupSubmit = async (items: FundingSourceDraft[]) => {
    setWalletSetupLoading(true);
    setWalletSetupError('');

    try {
      for (const item of items) {
        if (!item.name.trim()) {
          continue;
        }
        await upsertFundingSource(item.name.trim(), item.initialBalance);
      }

      setWalletSetupOpen(false);
      await router.push('/dashboard');
      try {
        (router as any).refresh?.();
      } catch {
        window.location.assign('/dashboard');
      }
    } catch (error) {
      setWalletSetupError(error instanceof Error ? error.message : 'Gagal menyimpan dompet.');
    } finally {
      setWalletSetupLoading(false);
    }
  };

  return (
    <>
      <div className="success-card">
        <BrandLogo compact className="form-brand" />
        <div className="badge">Verified</div>
        <h2>Pendaftaran berhasil</h2>
        <p>Selanjutnya isi dompet utama dulu. Setelah disimpan, kamu akan masuk ke dashboard.</p>
        <div className="success-actions">
          <button type="button" className="text-button" onClick={onBack}>
            Kembali ke awal
          </button>
          <button type="button" className="solid-button" onClick={() => setWalletSetupOpen(true)}>
            Isi dompet
          </button>
        </div>
      </div>

      <FundingSourceWizard
        open={walletSetupOpen}
        title="Isi dompet utama dulu"
        description="Masukkan MBanking, E Money, dan Cash sebelum dashboard dibuka."
        submitLabel="Simpan & masuk dashboard"
        loading={walletSetupLoading}
        onSubmit={handleWalletSetupSubmit}
      />

      {walletSetupError ? <p className="global-toast">{walletSetupError}</p> : null}
    </>
  );
}
