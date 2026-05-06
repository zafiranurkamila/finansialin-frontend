"use client";

import { useEffect, useMemo, useState, useRef } from 'react';
import { apiRequest, type ResourceRecord } from '@/lib/api';

export type TransactionFormValues = {
  type: 'income' | 'expense';
  amount: string;
  description: string;
  source: string;
  date: string;
  idCategory?: number | string | null;
  idResource?: number | string | null;
};

export type CategoryRecord = {
  idCategory: number;
  name: string;
  type: string;
};

type Props = {
  open: boolean;
  mode: 'create' | 'edit';
  sources: ResourceRecord[];
  initialValues: TransactionFormValues;
  loading?: boolean;
  error?: string;
  onClose: () => void;
  onSubmit: (values: TransactionFormValues) => Promise<void> | void;
};

type EntryMode = 'select' | 'manual' | 'ocr';

export function TransactionModal({
  open,
  mode,
  sources,
  initialValues,
  loading = false,
  error = '',
  onClose,
  onSubmit,
}: Props) {
  const [values, setValues] = useState(initialValues);
  const [entryMode, setEntryMode] = useState<EntryMode>('select');
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrError, setOcrError] = useState('');
  const [categories, setCategories] = useState<CategoryRecord[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setValues(initialValues);
      setEntryMode(mode === 'edit' ? 'manual' : 'select');
      setOcrError('');
      setNewCategoryName('');
      apiRequest<CategoryRecord[]>('/categories')
        .then(data => setCategories(data))
        .catch(() => {});
    }
  }, [initialValues, open, mode]);

  const sourceOptions = useMemo(() => sources.map((source) => source.source), [sources]);
  const filteredCategories = useMemo(() => categories.filter(c => c.type === values.type), [categories, values.type]);

  if (!open) {
    return null;
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setOcrLoading(true);
    setOcrError('');

    const formData = new FormData();
    formData.append('receiptImage', file);

    try {
      // Assuming OCR API returns { amount, description, date } or similar
      const result = await apiRequest<any>('/ai/receipt-ocr', {
        method: 'POST',
        body: formData,
      });

      // Map OCR results to values
      // Depending on the actual OCR response, adjust the property names
      const ocrAmount = result.amount ?? result.total_amount ?? '';
      const ocrDate = result.date ?? result.transaction_date ?? initialValues.date;
      const ocrDesc = result.description ?? result.merchant_name ?? 'Hasil Scan OCR';

      setValues(prev => ({
        ...prev,
        amount: ocrAmount.toString().replace(/[^0-9]/g, ''),
        description: ocrDesc,
        date: ocrDate,
        type: 'expense' // Receipts are usually expenses
      }));

      // Go to manual form for review
      setEntryMode('manual');
    } catch (err) {
      setOcrError(err instanceof Error ? err.message : 'Gagal membaca struk.');
    } finally {
      setOcrLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleModalSubmit = async () => {
    if (values.idCategory === 'new') {
      if (!newCategoryName.trim()) {
        alert('Nama kategori tidak boleh kosong.');
        return;
      }
      setIsCreatingCategory(true);
      try {
        const newCat = await apiRequest<CategoryRecord>('/categories', {
          method: 'POST',
          body: JSON.stringify({ name: newCategoryName.trim(), type: values.type }),
        });
        await onSubmit({ ...values, idCategory: newCat.idCategory });
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Gagal membuat kategori baru.');
      } finally {
        setIsCreatingCategory(false);
      }
    } else {
      await onSubmit(values);
    }
  };

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal-card" role="dialog" aria-modal="true" aria-label="Transaction modal">
        <div className="modal-head">
          <div>
            <p className="eyebrow">{mode === 'edit' ? 'Edit Transaksi' : 'Tambah transaksi'}</p>
            <h2>{mode === 'edit' ? 'Perbarui detail transaksi' : 'Catat income atau expense'}</h2>
            <p>{mode === 'edit' ? 'Sesuaikan data transaksi Anda yang sudah ada.' : 'Gunakan ini untuk top up e-wallet, mbanking, cash, atau belanja keluar.'}</p>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Tutup">
            ×
          </button>
        </div>

        {entryMode === 'select' && (
          <div className="modal-form" style={{ display: 'grid', gap: '16px', gridTemplateColumns: '1fr 1fr' }}>
            <button 
              type="button" 
              className="outline-btn" 
              style={{ padding: '32px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', borderRadius: '16px' }}
              onClick={() => setEntryMode('ocr')}
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"></path><path d="M12 12v9"></path><path d="m16 16-4-4-4 4"></path></svg>
              <span style={{ fontWeight: 600 }}>Foto/Kirim Struk (OCR)</span>
              <span style={{ fontSize: '0.8rem', color: '#666' }}>Otomatis isi nominal & detail</span>
            </button>

            <button 
              type="button" 
              className="outline-btn"
              style={{ padding: '32px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', borderRadius: '16px' }}
              onClick={() => setEntryMode('manual')}
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"></path></svg>
              <span style={{ fontWeight: 600 }}>Isi Manual</span>
              <span style={{ fontSize: '0.8rem', color: '#666' }}>Ketik sendiri data transaksinya</span>
            </button>
          </div>
        )}

        {entryMode === 'ocr' && (
          <div className="modal-form" style={{ textAlign: 'center', padding: '32px 0' }}>
            <input 
              type="file" 
              accept="image/*" 
              ref={fileInputRef}
              onChange={handleFileUpload}
              style={{ display: 'none' }}
              id="ocr-upload"
            />
            
            {ocrLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                <div className="spinner" style={{ width: '40px', height: '40px', border: '4px solid #f1c74a', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                <p>AI sedang membaca struk Anda...</p>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </div>
            ) : (
              <label 
                htmlFor="ocr-upload" 
                style={{ 
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', 
                  border: '2px dashed #ccc', borderRadius: '16px', padding: '48px 24px', cursor: 'pointer' 
                }}
              >
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                <div>
                  <strong>Pilih atau ambil foto struk</strong>
                  <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '8px' }}>Mendukung JPG, PNG, WEBP (Max 4MB)</p>
                </div>
                <span className="solid-button" style={{ marginTop: '16px', padding: '8px 24px' }}>Browse File</span>
              </label>
            )}

            {ocrError && <p className="modal-error" style={{ marginTop: '16px' }}>{ocrError}</p>}
          </div>
        )}

        {entryMode === 'manual' && (
          <div className="modal-form">
            <label className="field modal-field">
              <span>Type</span>
              <select
                className="premium-select"
                value={values.type}
                onChange={(event) => setValues((current) => ({ ...current, type: event.target.value as 'income' | 'expense' }))}
              >
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
            </label>

            <label className="field modal-field">
              <span>Source dompet</span>
              <select className="premium-select" value={values.source} onChange={(event) => setValues((current) => ({ ...current, source: event.target.value }))}>
                <option value="">Pilih dompet</option>
                {sourceOptions.map((source) => (
                  <option key={source} value={source}>
                    {source}
                  </option>
                ))}
              </select>
            </label>

            <label className="field modal-field">
              <span>Category</span>
              <select 
                className="premium-select"
                value={values.idCategory || ''} 
                onChange={(event) => {
                  const val = event.target.value;
                  setValues((current) => ({ ...current, idCategory: val === 'new' ? 'new' : Number(val) }));
                }}
              >
                <option value="">Pilih kategori (Opsional)</option>
                {filteredCategories.map(cat => (
                  <option key={cat.idCategory} value={cat.idCategory}>{cat.name}</option>
                ))}
                <option value="new">+ Tambah Kategori Baru</option>
              </select>
            </label>

            {values.idCategory === 'new' && (
              <label className="field modal-field">
                <span>Nama Kategori Baru</span>
                <input
                  value={newCategoryName}
                  onChange={(event) => setNewCategoryName(event.target.value)}
                  placeholder="Misal: Uang Makan"
                  autoFocus
                />
              </label>
            )}

            <label className="field modal-field">
              <span>Amount</span>
              <input
                value={values.amount}
                onChange={(event) => setValues((current) => ({ ...current, amount: event.target.value }))}
                inputMode="numeric"
                placeholder="500000"
              />
            </label>

            <label className="field modal-field">
              <span>Description</span>
              <input
                value={values.description}
                onChange={(event) => setValues((current) => ({ ...current, description: event.target.value }))}
                placeholder="Top up e-money"
              />
            </label>

            <label className="field modal-field">
              <span>Date</span>
              <input
                value={values.date}
                onChange={(event) => setValues((current) => ({ ...current, date: event.target.value }))}
                type="date"
              />
            </label>
          </div>
        )}

        {error && entryMode === 'manual' ? <p className="modal-error">{error}</p> : null}

        <div className="modal-actions">
          <button type="button" className="text-button" onClick={() => (entryMode === 'select' || mode === 'edit') ? onClose() : setEntryMode('select')}>
            {(entryMode === 'select' || mode === 'edit') ? 'Batal' : 'Kembali'}
          </button>
          {entryMode === 'manual' && (
            <button type="button" className="solid-button" onClick={handleModalSubmit} disabled={loading || isCreatingCategory}>
              {loading || isCreatingCategory ? 'Menyimpan...' : (mode === 'edit' ? 'Update Transaksi' : 'Simpan transaksi')}
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
