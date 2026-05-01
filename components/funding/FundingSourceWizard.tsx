"use client";

import { useMemo, useState } from 'react';

export type FundingSourceDraft = {
  name: string;
  initialBalance: string;
};

type Props = {
  open: boolean;
  title?: string;
  description?: string;
  submitLabel?: string;
  onClose?: () => void;
  onSubmit: (items: FundingSourceDraft[]) => Promise<void> | void;
  loading?: boolean;
};

const defaultDrafts: FundingSourceDraft[] = [
  { name: 'MBanking', initialBalance: '100000000' },
  { name: 'E Money', initialBalance: '50000000' },
  { name: 'Cash', initialBalance: '50000000' },
];

export function FundingSourceWizard({
  open,
  title = 'Tambah dompet dulu',
  description = 'Isi dompet utama sebelum masuk dashboard. Data ini akan disimpan ke backend Finansialin.',
  submitLabel = 'Simpan dompet',
  onClose,
  onSubmit,
  loading = false,
}: Props) {
  const [drafts, setDrafts] = useState<FundingSourceDraft[]>(defaultDrafts);
  const [error, setError] = useState('');

  const totalBalance = useMemo(() => {
    return drafts.reduce((sum, item) => sum + (Number(item.initialBalance) || 0), 0);
  }, [drafts]);

  if (!open) {
    return null;
  }

  const updateDraft = (index: number, key: keyof FundingSourceDraft, value: string) => {
    setDrafts((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? { ...item, [key]: value } : item)),
    );
  };

  const handleSubmit = async () => {
    const validItems = drafts
      .map((item) => ({
        name: item.name.trim(),
        initialBalance: item.initialBalance.trim(),
      }))
      .filter((item) => item.name !== '');

    if (validItems.length === 0) {
      setError('Isi minimal satu dompet dulu.');
      return;
    }

    setError('');
    await onSubmit(validItems);
  };

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal-card modal-wide" role="dialog" aria-modal="true" aria-label="Tambah dompet">
        <div className="modal-head">
          <div>
            <p className="eyebrow">Wallet setup</p>
            <h2>{title}</h2>
            <p>{description}</p>
          </div>
          {onClose ? (
            <button type="button" className="modal-close" onClick={onClose} aria-label="Tutup">
              ×
            </button>
          ) : null}
        </div>

        <div className="wallet-summary">
          <span>Total saldo awal</span>
          <strong>Rp{totalBalance.toLocaleString('id-ID')}</strong>
        </div>

        <div className="wallet-grid">
          {drafts.map((item, index) => (
            <div className="wallet-draft-card" key={`${item.name}-${index}`}>
              <div className="wallet-draft-title">Dompet {index + 1}</div>
              <label className="field modal-field">
                <span>Nama dompet</span>
                <input
                  value={item.name}
                  onChange={(event) => updateDraft(index, 'name', event.target.value)}
                  placeholder="MBanking / E Money / Cash"
                />
              </label>
              <label className="field modal-field">
                <span>Saldo awal</span>
                <input
                  value={item.initialBalance}
                  onChange={(event) => updateDraft(index, 'initialBalance', event.target.value)}
                  inputMode="numeric"
                  placeholder="50000000"
                />
              </label>
            </div>
          ))}
        </div>

        {error ? <p className="modal-error">{error}</p> : null}

        <div className="modal-actions">
          {onClose ? (
            <button type="button" className="text-button" onClick={onClose}>
              Batal
            </button>
          ) : null}
          <button type="button" className="solid-button" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Menyimpan...' : submitLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
