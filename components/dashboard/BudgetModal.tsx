"use client";

import { useState, useEffect } from 'react';

type Category = {
  idCategory: number;
  name: string;
};

type BudgetFormValues = {
  idCategory: string;
  amount: string;
  period: 'daily' | 'weekly' | 'monthly' | 'yearly';
  periodStart: string;
  periodEnd: string;
};

interface BudgetModalProps {
  open: boolean;
  categories: Category[];
  loading: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (values: BudgetFormValues) => void;
}

export function BudgetModal({ open, categories, loading, error, onClose, onSubmit }: BudgetModalProps) {
  const [values, setValues] = useState<BudgetFormValues>({
    idCategory: '',
    amount: '',
    period: 'monthly',
    periodStart: new Date().toISOString().slice(0, 10),
    periodEnd: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().slice(0, 10),
  });

  useEffect(() => {
    if (open) {
      setValues({
        idCategory: '',
        amount: '',
        period: 'monthly',
        periodStart: new Date().toISOString().slice(0, 10),
        periodEnd: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().slice(0, 10),
      });
    }
  }, [open]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(values);
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <div className="modal-head">
          <div>
            <h2>Set New Budget</h2>
            <p>Define spending limits for your category.</p>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {error && <p className="modal-error">{error}</p>}

          <label className="field modal-field">
            <span>Category</span>
            <select
              value={values.idCategory}
              onChange={(e) => setValues(prev => ({ ...prev, idCategory: e.target.value }))}
              required
            >
              <option value="">Select Category</option>
              {categories.map(cat => (
                <option key={cat.idCategory} value={cat.idCategory}>{cat.name}</option>
              ))}
            </select>
          </label>

          <label className="field modal-field">
            <span>Limit Amount (Rp)</span>
            <input
              type="number"
              placeholder="e.g. 1000000"
              value={values.amount}
              onChange={(e) => setValues(prev => ({ ...prev, amount: e.target.value }))}
              required
            />
          </label>

          <label className="field modal-field">
            <span>Period</span>
            <select
              value={values.period}
              onChange={(e) => setValues(prev => ({ ...prev, period: e.target.value as any }))}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <label className="field modal-field">
              <span>Start Date</span>
              <input
                type="date"
                value={values.periodStart}
                onChange={(e) => setValues(prev => ({ ...prev, periodStart: e.target.value }))}
                required
              />
            </label>
            <label className="field modal-field">
              <span>End Date</span>
              <input
                type="date"
                value={values.periodEnd}
                onChange={(e) => setValues(prev => ({ ...prev, periodEnd: e.target.value }))}
                required
              />
            </label>
          </div>

          <div className="modal-actions">
            <button type="button" className="text-button" onClick={onClose} disabled={loading} style={{ marginRight: '10px' }}>
              Cancel
            </button>
            <button type="submit" className="solid-button" disabled={loading}>
              {loading ? 'Saving...' : 'Set Budget'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
