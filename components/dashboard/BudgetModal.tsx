"use client";

import { useState, useEffect } from 'react';

type Category = {
  idCategory: number;
  name: string;
};

type BudgetFormValues = {
  idCategory: string;
  amount: string;
  period: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
  periodStart: string;
  periodEnd: string;
};

interface BudgetModalProps {
  open: boolean;
  mode?: 'create' | 'edit';
  initialValues?: BudgetFormValues;
  categories: Category[];
  loading: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (values: BudgetFormValues) => void;
}

export function BudgetModal({ open, mode = 'create', initialValues, categories, loading, error, onClose, onSubmit }: BudgetModalProps) {
  const getInitialDates = (period: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom') => {
    const now = new Date();
    let start = new Date(now);
    let end = new Date(now);

    if (period === 'monthly') {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    } else if (period === 'weekly') {
      const day = now.getDay() || 7;
      if (day !== 1) start.setHours(-24 * (day - 1));
      end = new Date(start);
      end.setDate(start.getDate() + 6);
    } else if (period === 'yearly') {
      start = new Date(now.getFullYear(), 0, 1);
      end = new Date(now.getFullYear(), 11, 31);
    } else if (period === 'custom') {
      // Keep current values or default to now
      return null;
    }

    return {
      start: start.toISOString().slice(0, 10),
      end: end.toISOString().slice(0, 10)
    };
  };

  const [values, setValues] = useState<BudgetFormValues>({
    idCategory: '',
    amount: '',
    period: 'monthly',
    periodStart: getInitialDates('monthly').start,
    periodEnd: getInitialDates('monthly').end,
  });

  useEffect(() => {
    if (open) {
      if (mode === 'edit' && initialValues) {
        setValues(initialValues);
      } else {
        const dates = getInitialDates('monthly');
        setValues({
          idCategory: '',
          amount: '',
          period: 'monthly',
          periodStart: dates.start,
          periodEnd: dates.end,
        });
      }
    }
  }, [open, mode, initialValues]);

  const handlePeriodChange = (p: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom') => {
    const dates = getInitialDates(p);
    if (dates) {
      setValues(prev => ({ 
        ...prev, 
        period: p, 
        periodStart: dates.start, 
        periodEnd: dates.end 
      }));
    } else {
      setValues(prev => ({ ...prev, period: p }));
    }
  };

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
            <h2>{mode === 'edit' ? 'Update Budget' : 'Set New Budget'}</h2>
            <p>{mode === 'edit' ? 'Adjust your spending limits.' : 'Define spending limits for your category.'}</p>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {error && <p className="modal-error">{error}</p>}

          <label className="field modal-field">
            <span>Category</span>
            <select
              className="premium-select"
              value={values.idCategory}
              onChange={(e) => setValues(prev => ({ ...prev, idCategory: e.target.value }))}
              required
              disabled={mode === 'edit'}
            >
              <option value="">Select Category</option>
              {categories.map(cat => (
                <option key={cat.idCategory} value={cat.idCategory}>{cat.name}</option>
              ))}
            </select>
            {mode === 'edit' && <p style={{ fontSize: '0.75rem', color: '#888', marginTop: '4px' }}>Category cannot be changed during edit.</p>}
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
              className="premium-select"
              value={values.period}
              onChange={(e) => handlePeriodChange(e.target.value as any)}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
              <option value="custom">Custom Range</option>
            </select>
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <label className="field modal-field" style={{ opacity: values.period === 'custom' ? 1 : 0.7 }}>
              <span>Start Date</span>
              <input
                type="date"
                value={values.periodStart}
                onChange={(e) => setValues(prev => ({ ...prev, periodStart: e.target.value }))}
                required
                readOnly={values.period !== 'custom'}
              />
            </label>
            <label className="field modal-field" style={{ opacity: values.period === 'custom' ? 1 : 0.7 }}>
              <span>End Date</span>
              <input
                type="date"
                value={values.periodEnd}
                onChange={(e) => setValues(prev => ({ ...prev, periodEnd: e.target.value }))}
                required
                readOnly={values.period !== 'custom'}
              />
            </label>
          </div>
          {values.period !== 'custom' && (
            <p style={{ fontSize: '0.7rem', color: '#888', marginTop: '-8px', marginBottom: '12px' }}>
              Dates are automatically set for {values.period} period. Use "Custom Range" to edit dates manually.
            </p>
          )}

          <div className="modal-actions">
            <button type="button" className="text-button" onClick={onClose} disabled={loading} style={{ marginRight: '10px' }}>
              Cancel
            </button>
            <button type="submit" className="solid-button" disabled={loading}>
              {loading ? 'Saving...' : (mode === 'edit' ? 'Update Budget' : 'Set Budget')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
