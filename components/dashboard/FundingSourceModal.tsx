"use client";

import { useEffect, useState } from 'react';

export type FundingSourceFormValues = {
  name: string;
  initialBalance: string;
};

type Props = {
  open: boolean;
  mode: 'create' | 'edit';
  initialValues: FundingSourceFormValues;
  loading?: boolean;
  error?: string;
  onClose: () => void;
  onSubmit: (values: FundingSourceFormValues) => Promise<void> | void;
};

export function FundingSourceModal({
  open,
  mode,
  initialValues,
  loading = false,
  error = '',
  onClose,
  onSubmit,
}: Props) {
  const [values, setValues] = useState(initialValues);

  useEffect(() => {
    if (open) {
      setValues(initialValues);
    }
  }, [initialValues, open]);

  if (!open) {
    return null;
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal-card" role="dialog" aria-modal="true" aria-label="Funding source modal">
        <div className="modal-head">
          <div>
            <p className="eyebrow">{mode === 'create' ? 'Tambah dompet' : 'Edit dompet'}</p>
            <h2>{mode === 'create' ? 'Buat dompet baru' : 'Perbarui dompet'}</h2>
            <p>Data ini langsung disimpan ke backend Finansialin.</p>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Tutup">
            ×
          </button>
        </div>

        <div className="modal-form">
          <label className="field modal-field">
            <span>Nama dompet</span>
            <input
              value={values.name}
              onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))}
              placeholder="MBanking"
            />
          </label>

          <label className="field modal-field">
            <span>Saldo awal</span>
            <input
              value={values.initialBalance}
              onChange={(event) => setValues((current) => ({ ...current, initialBalance: event.target.value }))}
              inputMode="numeric"
              placeholder="50000000"
            />
          </label>
        </div>

        {error ? <p className="modal-error">{error}</p> : null}

        <div className="modal-actions">
          <button type="button" className="text-button" onClick={onClose}>
            Batal
          </button>
          <button type="button" className="solid-button" onClick={() => onSubmit(values)} disabled={loading}>
            {loading ? 'Menyimpan...' : mode === 'create' ? 'Simpan dompet' : 'Update dompet'}
          </button>
        </div>
      </section>
    </div>
  );
}
