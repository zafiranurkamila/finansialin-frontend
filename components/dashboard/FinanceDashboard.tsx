"use client";

import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import {
  apiRequest,
  type ResourceRecord,
  type TransactionRecord,
} from '@/lib/api';

const fetcher = <T,>(url: string): Promise<T> => apiRequest<T>(url);
import { BrandLogo } from '@/components/BrandLogo';
import { FundingSourceModal, type FundingSourceFormValues } from './FundingSourceModal';
import { TransactionModal, type TransactionFormValues } from './TransactionModal';
import { BudgetModal } from './BudgetModal';
import { AiChatView } from './AiChatView';
import { DashboardIcon, TransactionsIcon, BudgetingIcon, StatisticsIcon, SettingsIcon, LogoutIcon, BellIcon, UserIcon, PencilIcon, CpuIcon } from '@/components/icons';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import './dashboard.css';

const navigation = [
  { name: 'Dashboard', icon: <DashboardIcon /> },
  { name: 'Transactions', icon: <TransactionsIcon /> },
  { name: 'Budgeting', icon: <BudgetingIcon /> },
  { name: 'Statistics', icon: <StatisticsIcon /> },
  { name: 'FinBot AI', icon: <CpuIcon /> },
  { name: 'Settings', icon: <SettingsIcon /> },
];

const initialTransactionValues = (): TransactionFormValues => ({
  type: 'income',
  amount: '',
  description: '',
  source: '',
  date: new Date().toISOString().slice(0, 10),
});

function formatCurrency(value: number | string) {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  // Use Math.round to avoid 99.999... issues
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Math.round(num));
}

function formatDate(value?: string) {
  if (!value) {
    return '-';
  }

  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(value));
}

function toneFromIndex(index: number) {
  const tones = ['gold', 'orange', 'yellow'];
  return tones[index % tones.length];
}

function getChartMonths() {
  const months = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      name: d.toLocaleString('id-ID', { month: 'short' }),
      month: d.getMonth(),
      year: d.getFullYear(),
    });
  }
  return months;
}

function monthlyIncomeChart(transactions: TransactionRecord[]) {
  const months = getChartMonths();
  const values = months.map((m) => {
    const total = transactions.reduce((sum, transaction) => {
      if (transaction.type !== 'income' || !transaction.date) {
        return sum;
      }

      const parsed = new Date(transaction.date);
      if (parsed.getMonth() !== m.month || parsed.getFullYear() !== m.year) {
        return sum;
      }

      return sum + Number(transaction.amount || 0);
    }, 0);

    return total;
  });

  const max = Math.max(...values, 1);
  return values.map((value) => Math.round(20 + ((value / max) * 70)));
}

function chartPath(points: number[]) {
  const width = 100;
  const height = 100;
  const xStep = width / (points.length - 1);
  return points
    .map((y, index) => {
      const x = index * xStep;
      const yPos = height - y;
      return `${index === 0 ? 'M' : 'L'} ${x} ${yPos}`;
    })
    .join(' ');
}

export function FinanceDashboard() {
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  useEffect(() => {
    if (notice) {
      const timer = setTimeout(() => setNotice(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [notice]);
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 4000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const { data: sourcesResp, mutate: mutateSources } = useSWR<{ data: ResourceRecord[] }>('/resources', fetcher);
  const sources = sourcesResp?.data || [];

  const { data: txResp, mutate: mutateTransactions } = useSWR<{ data?: TransactionRecord[] }>('/transactions?per_page=50', fetcher);
  const transactions = txResp?.data || [];

  type UserProfile = {
    idUser?: number;
    name?: string;
    email?: string;
  };
  const { data: profileResp, mutate: mutateProfile } = useSWR<{ data?: UserProfile } | UserProfile | null>('/auth/profile', (url: string) => apiRequest<{ data?: UserProfile } | UserProfile>(url).catch(() => null));
  const userProfile = profileResp ? ('data' in profileResp && profileResp.data ? profileResp.data : (profileResp as UserProfile)) : null;
  const setUserProfile = (profile: UserProfile | null) => mutateProfile(profile as any, { revalidate: false });

  type NotificationRecord = {
    idNotification: number;
    title: string;
    message: string;
    type: string;
    read: boolean;
    createdAt: string;
  };
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const { data: unreadResp, mutate: mutateUnread } = useSWR<{ count: number }>('/notifications/unread/count', (url: string) => apiRequest<{ count: number }>(url).catch(() => ({ count: 0 })));
  const unreadCount = unreadResp?.count || 0;
  const setUnreadCount = (count: number) => mutateUnread({ count }, { revalidate: false });

  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [statsSubTab, setStatsSubTab] = useState<'Analytics' | 'Laporan'>('Analytics');
  const [reportMonth, setReportMonth] = useState(new Date().getMonth());
  const [reportYear, setReportYear] = useState(new Date().getFullYear());
  
  const { data: insightResp, mutate: mutateAiInsight, isValidating: loadingAi } = useSWR<{ summary: string }>('/ai/dashboard-summary', (url: string) => apiRequest<{ summary: string }>(url).catch(() => ({ summary: 'Belum ada insight AI saat ini. Terus catat transaksimu ya!' })));
  const aiInsight = insightResp?.summary || 'Belum ada insight AI saat ini. Terus catat transaksimu ya!';

  const [ocrLoading, setOcrLoading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [txFilterMonth, setTxFilterMonth] = useState(new Date().getMonth());
  const [txFilterYear, setTxFilterYear] = useState(new Date().getFullYear());
  const [settingsSubTab, setSettingsSubTab] = useState<'Profile' | 'Preferences' | 'Account'>('Profile');
  const [deleteAccountModalOpen, setDeleteAccountModalOpen] = useState(false);
  const [deleteAccountLoading, setDeleteAccountLoading] = useState(false);
  const [deleteAccountError, setDeleteAccountError] = useState('');

  const { data: prefData, mutate: mutatePreferences } = useSWR<any>('/users/preferences', (url: string) => apiRequest<any>(url).catch(() => null));
  const preferences = prefData || { hideBalance: false, dailyReminder: true, budgetLimitAlert: true, weeklySummary: true };
  const setPreferences = (prefs: any) => mutatePreferences(prefs, { revalidate: false });

  const getCategoryIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('food') || lower.includes('makan')) return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8zM6 1v3M10 1v3M14 1v3"/></svg>;
    if (lower.includes('transport') || lower.includes('pesawat') || lower.includes('travel')) return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21.5 4c0 0-2 .5-3.5 2L14.5 9.5 6.3 7.7 5 9l6 4-3.5 3.5L5 15.5 3 17l1.5 2 2-1.5L8 19l4.5-3.5 4 6 1.3-1.3z"/></svg>;
    if (lower.includes('shop') || lower.includes('belanja')) return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18M16 10a4 4 0 0 1-8 0"/></svg>;
    if (lower.includes('bill') || lower.includes('tagihan')) return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M12 8v8M8 12h8"/></svg>;
    return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="m16 10-4 4-4-4"/></svg>;
  };

  type CategoryRecord = {
    idCategory: number;
    name: string;
    type: string;
  };
  const { data: categoriesData } = useSWR<CategoryRecord[]>('/categories', (url: string) => apiRequest<CategoryRecord[]>(url).catch(() => []));
  const categories = categoriesData || [];

  type GoalRecord = {
    idCategory: number | null;
    name: string;
    budgetAmount: number;
    spent: number;
    percent: number;
    remaining: number;
    overBudget: boolean;
  };
  const { data: goalsResp, mutate: mutateGoals } = useSWR<{ data: GoalRecord[] }>('/budgets/goals', (url: string) => apiRequest<{ data: GoalRecord[] }>(url).catch(() => ({ data: [] })));
  const goals = goalsResp?.data || [];

  const [activeTab, setActiveTab] = useState('Dashboard');

  type BudgetRecord = {
    idBudget: number;
    idCategory: number;
    amount: number;
    spent: number;
    percent: number;
    period: string;
    periodStart: string;
    periodEnd: string;
    category?: { name: string };
  };
  const { data: budgetsData, mutate: mutateBudgets } = useSWR<BudgetRecord[]>('/budgets', (url: string) => apiRequest<BudgetRecord[]>(url).catch(() => []));
  const budgets = budgetsData || [];
  const [budgetModalOpen, setBudgetModalOpen] = useState(false);
  const [budgetMode, setBudgetMode] = useState<'create' | 'edit'>('create');
  const [selectedBudget, setSelectedBudget] = useState<any>(null);
  const [budgetSaving, setBudgetSaving] = useState(false);
  const [budgetError, setBudgetError] = useState('');
  const [budgetSearch, setBudgetSearch] = useState('');
  const [budgetFilterPeriod, setBudgetFilterPeriod] = useState('all');
  const [budgetFilterStatus, setBudgetFilterStatus] = useState<'all' | 'safe' | 'over'>('all');
  
  const [hasAlertedOverBudget, setHasAlertedOverBudget] = useState(false);
  const [overBudgetModalOpen, setOverBudgetModalOpen] = useState(false);
  const [overBudgetNames, setOverBudgetNames] = useState<string>('');

  useEffect(() => {
    if (activeTab === 'Budgeting' && budgets.length > 0 && !hasAlertedOverBudget) {
      const overBudgets = budgets.filter(b => (b.percent || 0) >= 100);
      if (overBudgets.length > 0) {
        setOverBudgetNames(overBudgets.map(b => b.category?.name || 'General').join(', '));
        setOverBudgetModalOpen(true);
      }
      setHasAlertedOverBudget(true);
    } else if (activeTab !== 'Budgeting') {
      setHasAlertedOverBudget(false);
    }
  }, [budgets, activeTab, hasAlertedOverBudget]);

  useEffect(() => {
    if (overBudgetModalOpen) {
      const timer = setTimeout(() => setOverBudgetModalOpen(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [overBudgetModalOpen]);

  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [walletMode, setWalletMode] = useState<'create' | 'edit'>('create');
  const [walletInitialValues, setWalletInitialValues] = useState<FundingSourceFormValues>({
    name: '',
    initialBalance: '',
  });
  const [walletSaving, setWalletSaving] = useState(false);
  const [walletError, setWalletError] = useState('');
  const [editingWalletId, setEditingWalletId] = useState<number | null>(null);

  const [transactionModalOpen, setTransactionModalOpen] = useState(false);
  const [transactionInitialValues, setTransactionInitialValues] = useState<TransactionFormValues>(initialTransactionValues());
  const [transactionMode, setTransactionMode] = useState<'create' | 'edit'>('create');
  const [editingTransactionId, setEditingTransactionId] = useState<number | null>(null);
  const [transactionSaving, setTransactionSaving] = useState(false);
  const [transactionError, setTransactionError] = useState('');

  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    title: string;
    message: string;
    confirmText?: string;
    type?: 'danger' | 'warning' | 'info';
    onConfirm: () => void;
  }>({
    open: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const loadDashboard = async () => {
    await Promise.all([
      mutateSources(),
      mutateTransactions(),
      mutateGoals(),
      mutateBudgets(),
      mutateAiInsight()
    ]);
  };

  const loading = !sourcesResp || !txResp;

  useEffect(() => {
    const handleUnauthorized = () => {
      window.location.assign('/');
    };
    window.addEventListener('finansialin:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('finansialin:unauthorized', handleUnauthorized);
  }, []);

  const toggleNotifications = async () => {
    if (!showNotifications) {
      try {
        const data = await apiRequest<NotificationRecord[]>('/notifications');
        setNotifications(data);
      } catch (err) {}
    }
    setShowNotifications(!showNotifications);
    setShowProfileMenu(false);
  };

  const markAllNotificationsRead = async () => {
    try {
      await apiRequest('/notifications/read-all', { method: 'PATCH' });
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (err) {}
  };

  const handleLogout = () => {
    setConfirmModal({
      open: true,
      title: 'Sign Out',
      message: 'Are you sure you want to log out from Finansialin?',
      confirmText: 'Sign Out',
      type: 'danger',
      onConfirm: () => {
        window.localStorage.removeItem('finansialin_auth_tokens');
        window.location.assign('/');
      }
    });
  };

  const fixedWalletNames = ['MBanking', 'E Money', 'Cash'];
  const displaySources = useMemo(() => {
    const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    const fixed = fixedWalletNames.map(name => {
      const targetNormalized = normalize(name);
      const existing = sources.find(s => normalize(s.source) === targetNormalized);
      if (existing) return existing;
      return { id: Math.floor(Math.random() * -10000), idResource: Math.floor(Math.random() * -10000), idUser: 0, source: name, balance: 0, isDummy: true } as ResourceRecord & { isDummy?: boolean };
    });
    
    const others = sources.filter(s => {
      const sNormalized = normalize(s.source);
      return !fixedWalletNames.some(name => normalize(name) === sNormalized);
    });
    
    return [...fixed, ...others];
  }, [sources]);

  const totalAvailable = useMemo(
    () => sources.reduce((sum, source) => sum + Number(source.balance || 0), 0),
    [sources],
  );

  const totalInitialBalance = useMemo(
    () => sources.reduce((sum, source) => sum + Number(source.balance || 0), 0),
    [sources],
  );

  const chartMonths = useMemo(() => getChartMonths(), []);
  const incomePoints = useMemo(() => monthlyIncomeChart(transactions), [transactions]);
  const chartLine = useMemo(() => chartPath(incomePoints), [incomePoints]);


  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const matchesSearch = (t.description || '').toLowerCase().includes(globalSearch.toLowerCase()) || 
                           (t.source || '').toLowerCase().includes(globalSearch.toLowerCase()) ||
                           (t.category?.name || '').toLowerCase().includes(globalSearch.toLowerCase());
      
      // If searching (min 2 chars), ignore date filter
      if (globalSearch.length >= 2) return matchesSearch;

      const d = new Date(t.date || '');
      const matchesDate = d.getMonth() === txFilterMonth && d.getFullYear() === txFilterYear;
      return matchesDate && matchesSearch;
    }).sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
  }, [transactions, txFilterMonth, txFilterYear, globalSearch]);

  const filteredBudgets = useMemo(() => {
    return budgets.filter(b => {
      // Prioritize budget-specific search if active, otherwise use globalSearch
      const search = budgetSearch || globalSearch;
      const matchesSearch = (b.category?.name || '').toLowerCase().includes(search.toLowerCase());
      const matchesPeriod = budgetFilterPeriod === 'all' || b.period === budgetFilterPeriod;
      
      let matchesStatus = true;
      const isOver = (b.percent || 0) >= 100;
      if (budgetFilterStatus === 'safe') matchesStatus = !isOver;
      if (budgetFilterStatus === 'over') matchesStatus = isOver;

      return matchesSearch && matchesPeriod && matchesStatus;
    });
  }, [budgets, budgetSearch, globalSearch, budgetFilterPeriod, budgetFilterStatus]);

  const topTransactions = useMemo(() => {
    return transactions
      .filter(t => (t.description || '').toLowerCase().includes(globalSearch.toLowerCase()) || (t.category?.name || '').toLowerCase().includes(globalSearch.toLowerCase()))
      .slice(0, 5);
  }, [transactions, globalSearch]);

  const quickSearchResults = useMemo(() => {
    if (globalSearch.length < 2) return null;
    const txMatches = transactions
      .filter(t => (t.description || '').toLowerCase().includes(globalSearch.toLowerCase()))
      .slice(0, 4);
    const budgetMatches = budgets
      .filter(b => (b.category?.name || '').toLowerCase().includes(globalSearch.toLowerCase()))
      .slice(0, 2);
    
    if (txMatches.length === 0 && budgetMatches.length === 0) return null;
    return { transactions: txMatches, budgets: budgetMatches };
  }, [transactions, budgets, globalSearch]);
  const activityBreakdown = useMemo(() => {
    const expenseItems = filteredTransactions.filter((transaction) => transaction.type === 'expense');
    const totals = expenseItems.reduce<Record<string, number>>((accumulator, transaction) => {
      const key = transaction.source?.trim() || transaction.category?.name || 'Other';
      accumulator[key] = (accumulator[key] ?? 0) + Number(transaction.amount || 0);
      return accumulator;
    }, {});

    const items = Object.entries(totals)
      .sort((left, right) => right[1] - left[1])
      .slice(0, 5);

    return items.length > 0
      ? items
      : ([
          ['Rumah', 42],
          ['Makan', 25],
          ['Investasi', 16],
          ['Belanja', 10],
          ['Kecantikan', 7],
        ] as [string, number][]);
  }, [filteredTransactions]);

  const totalIncome = useMemo(() => transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount || 0), 0), [transactions]);
  const totalExpense = useMemo(() => transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount || 0), 0), [transactions]);
  const totalSavings = useMemo(() => totalIncome - totalExpense, [totalIncome, totalExpense]);

  const { trendIncome, trendExpense, trendSavings, trendBalance } = useMemo(() => {
    const now = new Date();
    const currentM = now.getMonth();
    const currentY = now.getFullYear();
    const lastM = currentM === 0 ? 11 : currentM - 1;
    const lastY = currentM === 0 ? currentY - 1 : currentY;

    let cInc = 0, cExp = 0, lInc = 0, lExp = 0;
    transactions.forEach(t => {
      if (!t.date) return;
      const d = new Date(t.date);
      const amt = Number(t.amount || 0);
      if (d.getMonth() === currentM && d.getFullYear() === currentY) {
        if (t.type === 'income') cInc += amt;
        else cExp += amt;
      } else if (d.getMonth() === lastM && d.getFullYear() === lastY) {
        if (t.type === 'income') lInc += amt;
        else lExp += amt;
      }
    });
    const cSav = cInc - cExp;
    const lSav = lInc - lExp;

    const calcTrend = (c: number, l: number) => {
      if (l === 0) return c > 0 ? '+100%' : '0%';
      const pct = ((c - l) / l) * 100;
      return `${pct > 0 ? '+' : ''}${pct.toFixed(1)}%`;
    };

    return {
      trendIncome: calcTrend(cInc, lInc),
      trendExpense: calcTrend(cExp, lExp),
      trendSavings: calcTrend(cSav, lSav),
      trendBalance: calcTrend(totalAvailable, totalAvailable - cSav) // Rough estimate
    };
  }, [transactions, totalAvailable]);

  const categoryStats = useMemo(() => {
    const stats: Record<string, { amount: number, color: string }> = {};
    const colors = ['#f1c74a', '#171717', '#4ab2a6', '#ef4444', '#3b82f6', '#a855f7'];
    let colorIdx = 0;

    transactions.filter(t => t.type === 'expense').forEach(t => {
      const catName = t.category?.name || 'Uncategorized';
      if (!stats[catName]) {
        stats[catName] = { amount: 0, color: colors[colorIdx % colors.length] };
        colorIdx++;
      }
      stats[catName].amount += Number(t.amount || 0);
    });

    return Object.entries(stats)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.amount - a.amount);
  }, [transactions]);

  const reportData = useMemo(() => {
    const filteredTx = transactions.filter(t => {
      const d = new Date(t.date || '');
      return d.getMonth() === reportMonth && d.getFullYear() === reportYear;
    });

    const income = filteredTx.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
    const expense = filteredTx.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);

    const monthBudgets = budgets.filter(b => {
      const d = new Date(b.periodStart);
      return d.getMonth() === reportMonth && d.getFullYear() === reportYear;
    });

    return { transactions: filteredTx, income, expense, budgets: monthBudgets };
  }, [transactions, budgets, reportMonth, reportYear]);

  const activityColors = ['#f4c51a', '#f1d76a', '#c2a115', '#9a831c', '#6d5d14'];
  const donutGradient = useMemo(() => {
    const total = activityBreakdown.reduce((sum, [_, value]) => sum + value, 0);
    if (total === 0) return 'conic-gradient(#e0e0e0 0 100%)';

    let currentPercent = 0;
    const segments = activityBreakdown.map(([_, value], index) => {
      const percent = (value / total) * 100;
      const start = currentPercent;
      currentPercent += percent;
      return `${activityColors[index % activityColors.length]} ${start}% ${currentPercent}%`;
    });

    return `conic-gradient(${segments.join(', ')})`;
  }, [activityBreakdown]);

  const openCreateWallet = () => {
    setWalletMode('create');
    setEditingWalletId(null);
    setWalletInitialValues({ name: '', initialBalance: '' });
    setWalletError('');
    setWalletModalOpen(true);
  };

  const openEditWallet = (source: ResourceRecord) => {
    if ((source as any).isDummy) {
      setWalletMode('create');
      setEditingWalletId(null);
    } else {
      setWalletMode('edit');
      setEditingWalletId(source.idResource);
    }
    setWalletInitialValues({
      name: source.source,
      initialBalance: String(source.balance),
    });
    setWalletError('');
    setWalletModalOpen(true);
  };

  const openTopUpTransaction = (source?: ResourceRecord) => {
    setTransactionInitialValues({
      type: 'income',
      amount: '',
      description: source ? `Top up ${source.source}` : 'Top up dompet',
      source: source?.source ?? '',
      date: new Date().toISOString().slice(0, 10),
    });
    setTransactionMode('create');
    setEditingTransactionId(null);
    setTransactionError('');
    setTransactionModalOpen(true);
  };

  const openEditTransaction = (tx: TransactionRecord) => {
    setTransactionInitialValues({
      type: tx.type,
      amount: String(tx.amount),
      description: tx.description || '',
      source: tx.source || '',
      date: tx.date || new Date().toISOString().slice(0, 10),
      idCategory: tx.idCategory,
      idResource: tx.idResource
    });
    setTransactionMode('edit');
    setEditingTransactionId(tx.idTransaction || null);
    setTransactionError('');
    setTransactionModalOpen(true);
  };

  const handleDeleteTransaction = async (id: number) => {
    setConfirmModal({
      open: true,
      title: 'Delete Transaction',
      message: 'This action cannot be undone. Are you sure you want to delete this transaction?',
      confirmText: 'Delete',
      type: 'danger',
      onConfirm: async () => {
        try {
          await apiRequest(`/transactions/${id}`, { method: 'DELETE' });
          setNotice('Transaksi berhasil dihapus.');
          await loadDashboard();
        } catch (err) {
          setNotice(err instanceof Error ? err.message : 'Gagal hapus transaksi.');
        } finally {
          setConfirmModal(prev => ({ ...prev, open: false }));
        }
      }
    });
  };

  const handleWalletSubmit = async (values: FundingSourceFormValues) => {
    setWalletSaving(true);
    setWalletError('');

    try {
      const body = {
        name: values.name.trim(),
        initialBalance: Number(values.initialBalance || 0),
      };

      if (walletMode === 'edit' && editingWalletId !== null) {
        await apiRequest(`/resources/${editingWalletId}`, {
          method: 'PUT',
          body: JSON.stringify(body),
        });
        setNotice('Dompet berhasil diperbarui.');
      } else {
        await apiRequest('/resources', {
          method: 'POST',
          body: JSON.stringify(body),
        });
        setNotice('Dompet berhasil ditambahkan.');
      }

      setWalletModalOpen(false);
      await loadDashboard();
    } catch (requestError) {
      setWalletError(requestError instanceof Error ? requestError.message : 'Gagal menyimpan dompet.');
    } finally {
      setWalletSaving(false);
    }
  };

  const handleRemoveWallet = async (source: ResourceRecord) => {
    if ((source as any).isDummy) {
      setNotice(`Dompet ${source.source} sudah kosong.`);
      return;
    }
    const confirmed = window.confirm(`Hapus dompet ${source.source}?`);
    if (!confirmed) {
      return;
    }

    try {
      await apiRequest(`/resources/${source.idResource}`, {
        method: 'DELETE',
      });
      setNotice('Dompet berhasil dihapus.');
      await loadDashboard();
    } catch (requestError) {
      setNotice(requestError instanceof Error ? requestError.message : 'Gagal menghapus dompet.');
    }
  };

  const handleTransactionSubmit = async (values: TransactionFormValues) => {
    setTransactionSaving(true);
    setTransactionError('');

    try {
      if (transactionMode === 'edit' && editingTransactionId) {
        await apiRequest(`/transactions/${editingTransactionId}`, {
          method: 'PUT',
          body: JSON.stringify({
            type: values.type,
            amount: Number(values.amount || 0),
            description: values.description,
            source: values.source,
            date: values.date,
            idCategory: values.idCategory ? Number(values.idCategory) : undefined,
            idResource: values.idResource
          }),
        });
        setNotice('Transaksi berhasil diperbarui.');
      } else {
        await apiRequest('/transactions', {
          method: 'POST',
          body: JSON.stringify({
            type: values.type,
            amount: Number(values.amount || 0),
            description: values.description,
            source: values.source,
            date: values.date,
            idCategory: values.idCategory ? Number(values.idCategory) : undefined,
            idResource: values.idResource
          }),
        });
        setNotice('Transaksi berhasil ditambahkan.');
      }

      setTransactionModalOpen(false);
      await loadDashboard();
    } catch (err) {
      setTransactionError(err instanceof Error ? err.message : 'Gagal menyimpan transaksi.');
    } finally {
      setTransactionSaving(false);
    }
  };

  const handleBudgetSubmit = async (values: any) => {
    setBudgetSaving(true);
    setBudgetError('');
    try {
      if (budgetMode === 'edit' && selectedBudget) {
        await apiRequest(`/budgets/${selectedBudget.idBudget}`, {
          method: 'PATCH',
          body: JSON.stringify(values),
        });
        setNotice('Budget berhasil diperbarui.');
      } else {
        await apiRequest('/budgets', {
          method: 'POST',
          body: JSON.stringify(values),
        });
        setNotice('Budget baru berhasil dibuat.');
      }
      await loadDashboard();
      setBudgetModalOpen(false);
    } catch (err) {
      setBudgetError(err instanceof Error ? err.message : 'Gagal menyimpan budget.');
    } finally {
      setBudgetSaving(false);
    }
  };

  const openCreateBudget = () => {
    setBudgetMode('create');
    setSelectedBudget(null);
    setBudgetModalOpen(true);
  };

  const openEditBudget = (budget: any) => {
    setBudgetMode('edit');
    setSelectedBudget(budget);
    setBudgetModalOpen(true);
  };

  const handleBudgetDelete = (id: number) => {
    setConfirmModal({
      open: true,
      title: 'Hapus Budget?',
      message: 'Apakah Anda yakin ingin menghapus budget ini? Tindakan ini tidak dapat dibatalkan.',
      type: 'danger',
      onConfirm: async () => {
        try {
          await apiRequest(`/budgets/${id}`, { method: 'DELETE' });
          setNotice('Budget telah dihapus.');
          await loadDashboard();
        } catch (err) {
          alert(err instanceof Error ? err.message : 'Gagal menghapus budget.');
        } finally {
          setConfirmModal(prev => ({ ...prev, open: false }));
        }
      },
      confirmText: 'Hapus'
    });
  };

  const handleOcrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('receiptImage', file);

    setOcrLoading(true);
    setNotice('AI sedang membaca struk belanja Anda...');
    try {
      // Note: apiRequest helper might need adjustment for FormData if it strictly uses JSON
      // Assuming a standard fetch for FormData
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'}/ai/receipt-ocr`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      
      if (data.status === 'success' && data.data) {
        const ocr = data.data;
        setTransactionInitialValues({
          type: 'expense',
          amount: String(ocr.total_amount || ''),
          description: ocr.merchant_name || 'Transaksi dari Struk',
          source: '',
          date: ocr.date || new Date().toISOString().slice(0, 10),
          idCategory: undefined
        });
        setTransactionModalOpen(true);
        setNotice('Struk berhasil dibaca! Silakan periksa detailnya.');
      } else {
        throw new Error(data.message || 'Gagal membaca struk');
      }
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Gagal memproses struk.');
    } finally {
      setOcrLoading(false);
    }
  };

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    const form = e.currentTarget as HTMLFormElement;
    const formData = new FormData(form);
    
    const firstName = formData.get('firstName') as string;
    const lastName = formData.get('lastName') as string;
    const occupation = formData.get('occupation') as string;
    const bio = formData.get('bio') as string;

    try {
      await apiRequest('/users/profile', {
        method: 'PUT',
        body: JSON.stringify({
          name: `${firstName} ${lastName}`.trim(),
          occupation,
          bio
        })
      });
      mutateProfile();
      setNotice('Profile updated successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleDeleteAccount = async (password: string) => {
    setDeleteAccountLoading(true);
    setDeleteAccountError('');
    try {
      await apiRequest('/users/account', {
        method: 'DELETE',
        body: JSON.stringify({ password })
      });
      
      // Cleanup and redirect
      if (typeof window !== 'undefined') {
        window.localStorage.clear(); // Clear all data
        window.location.assign('/');
      }
    } catch (err) {
      setDeleteAccountError(err instanceof Error ? err.message : 'Gagal menghapus akun. Pastikan password Anda benar.');
    } finally {
      setDeleteAccountLoading(false);
    }
  };

  const handlePreferenceUpdate = async (patch: Partial<typeof preferences>) => {
    const newPrefs = { ...preferences, ...patch };
    setPreferences(newPrefs);
    try {
      await apiRequest('/users/preferences', {
        method: 'PUT',
        body: JSON.stringify(patch)
      });
    } catch (err) {
      setNotice('Gagal menyimpan preferensi.');
    }
  };

  const maskBalance = (amount: number | string) => {
    if (preferences.hideBalance) return 'Rp ••••••••';
    return formatCurrency(Number(amount));
  };

  const handleExportPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const monthName = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'][reportMonth];
    
    let html = `
      <html>
      <head>
        <title>Laporan Keuangan Finansialin - ${monthName} ${reportYear}</title>
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background: #fff; color: #333; margin: 0; padding: 40px; }
          .report-container { max-width: 800px; margin: 0 auto; }
          .header { border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 30px; }
          .header h1 { margin: 0; font-size: 24px; color: #000; text-transform: uppercase; letter-spacing: 1px; }
          .header p { margin: 5px 0 0; color: #555; font-size: 14px; }
          
          .summary-table { width: 100%; margin-bottom: 40px; border-collapse: collapse; }
          .summary-table td { padding: 10px; border: 1px solid #ddd; font-size: 14px; }
          .summary-table td.label { font-weight: bold; background: #f9f9f9; width: 40%; }
          .summary-table td.value { text-align: right; }
          
          .section-title { font-size: 16px; font-weight: bold; color: #000; margin-bottom: 15px; text-transform: uppercase; }
          
          .tx-table { width: 100%; border-collapse: collapse; margin-bottom: 40px; font-size: 14px; }
          .tx-table th { padding: 12px; text-align: left; border-bottom: 2px solid #000; font-weight: bold; }
          .tx-table td { padding: 12px; border-bottom: 1px solid #ddd; }
          .tx-table th.right, .tx-table td.right { text-align: right; }
          
          .footer { margin-top: 50px; font-size: 12px; color: #777; text-align: center; border-top: 1px solid #eee; padding-top: 20px; }
        </style>
      </head>
      <body>
        <div class="report-container">
          <div class="header">
            <h1>Laporan Keuangan</h1>
            <p>Periode: ${monthName} ${reportYear}</p>
          </div>
          
          <div class="section-title">Ringkasan</div>
          <table class="summary-table">
            <tr>
              <td class="label">Total Pemasukan</td>
              <td class="value">${formatCurrency(reportData.income)}</td>
            </tr>
            <tr>
              <td class="label">Total Pengeluaran</td>
              <td class="value">${formatCurrency(reportData.expense)}</td>
            </tr>
            <tr>
              <td class="label">Net Savings</td>
              <td class="value"><strong>${formatCurrency(reportData.income - reportData.expense)}</strong></td>
            </tr>
          </table>

          <div class="section-title">Detail Transaksi</div>
          <table class="tx-table">
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Deskripsi</th>
                <th>Kategori</th>
                <th class="right">Jumlah</th>
              </tr>
            </thead>
            <tbody>
              ${reportData.transactions.length === 0 ? '<tr><td colspan="4" style="text-align: center; color: #999; padding: 20px;">Tidak ada transaksi</td></tr>' : ''}
              ${reportData.transactions.map(t => `
                <tr>
                  <td>${formatDate(t.date)}</td>
                  <td>${t.description || '-'}</td>
                  <td>${t.category?.name || 'Umum'}</td>
                  <td class="right">${t.type === 'expense' ? '-' : '+'}${formatCurrency(Number(t.amount))}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="footer">
            <p>Dokumen ini dicetak dari aplikasi Finansialin pada ${new Date().toLocaleString('id-ID')}</p>
          </div>
        </div>
        <script>
          window.onload = () => { setTimeout(() => { window.print(); window.close(); }, 500); }
        </script>
      </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handleExportExcel = () => {
    const monthName = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'][reportMonth];
    let csv = `LAPORAN KEUANGAN FINANSIALIN - ${monthName.toUpperCase()} ${reportYear}\n\n`;
    
    // Summary Section
    csv += "RINGKASAN\n";
    csv += `Total Pemasukan,="${reportData.income}"\n`;
    csv += `Total Pengeluaran,="${reportData.expense}"\n`;
    csv += `Net Savings,="${reportData.income - reportData.expense}"\n\n`;

    // Transactions Section
    csv += "DETAIL TRANSAKSI\n";
    csv += "Tanggal,Deskripsi,Kategori,Tipe,Sumber/Dompet,Jumlah\n";
    
    reportData.transactions.forEach(t => {
      // Escape commas in description
      const desc = `"${(t.description || '-').replace(/"/g, '""')}"`;
      const cat = `"${(t.category?.name || 'Umum').replace(/"/g, '""')}"`;
      const source = `"${(t.source || '-').replace(/"/g, '""')}"`;
      csv += `${t.date},${desc},${cat},${t.type},${source},"${t.amount}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Laporan_Finansialin_${monthName}_${reportYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <main className="dashboard-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <BrandLogo />
        </div>

        <nav className="sidebar-nav" aria-label="Dashboard navigation">
          {navigation.map((item) => (
            <button 
              key={item.name} 
              className={activeTab === item.name ? 'sidebar-item active' : 'sidebar-item'} 
              type="button"
              onClick={() => setActiveTab(item.name)}
            >
              {item.icon}
              {item.name}
            </button>
          ))}
        </nav>

        <button className="logout-button" type="button" onClick={() => window.location.assign('/')}>
          <LogoutIcon />
          Logout
        </button>
      </aside>

      <section className="dashboard-main">
        <header className="dashboard-topbar">
          {activeTab === 'Dashboard' ? (
            <div>
              <p className="dashboard-greeting">Hi <span>{userProfile?.name?.split(' ')[0] || 'User'}</span> ,</p>
              <h1>Welcome back!</h1>
            </div>
          ) : activeTab === 'Budgeting' ? (
            <div style={{ flex: 1 }}>
              <h1 style={{ margin: '0 0 2px 0' }}>My Budgets</h1>
              <p style={{ color: '#666', margin: 0, fontWeight: 400 }}>Manage your spending limits by category.</p>
            </div>
          ) : (
            <div>
              <h1>{activeTab}</h1>
            </div>
          )}

          <div className="topbar-tools" style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {activeTab === 'Dashboard' && (
              <button type="button" className="add-wallet-btn" onClick={openCreateWallet}>
                + Wallet
              </button>
            )}
            {activeTab === 'Budgeting' && (
              <button type="button" className="add-wallet-btn" onClick={openCreateBudget}>
                + Create Budget
              </button>
            )}
            <button type="button" className="icon-circle notification-btn" aria-label="Notifications" onClick={toggleNotifications}>
              <BellIcon />
              {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
            </button>
            <button type="button" className="icon-circle profile-btn" aria-label="Profile" onClick={() => { setShowProfileMenu(!showProfileMenu); setShowNotifications(false); }}>
              <UserIcon />
            </button>

            {/* Notification Dropdown */}
            {showNotifications && (
              <div className="dropdown-panel notifications-dropdown">
                <div className="dropdown-header">
                  <h4>Notifications</h4>
                  {unreadCount > 0 && <button className="text-button" onClick={markAllNotificationsRead}>Mark all read</button>}
                </div>
                <div className="dropdown-body">
                  {notifications.length === 0 ? (
                    <p className="empty-text">Belum ada notifikasi.</p>
                  ) : (
                    notifications.map(notif => (
                      <div key={notif.idNotification} className={`notification-item ${!notif.read ? 'unread' : ''}`}>
                        <h5>{notif.title}</h5>
                        <p>{notif.message}</p>
                        <span className="time">{new Date(notif.createdAt).toLocaleDateString()}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Profile Dropdown */}
            {showProfileMenu && (
              <div className="dropdown-panel profile-dropdown" style={{ width: '240px' }}>
                <div className="dropdown-header" style={{ display: 'block' }}>
                  <h4>{userProfile?.name || 'User'}</h4>
                  <p className="user-email">{userProfile?.email || ''}</p>
                </div>
                <div className="dropdown-body">
                  <button className="dropdown-item" onClick={() => { setActiveTab('Settings'); setShowProfileMenu(false); }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1Z"></path></svg>
                    Settings
                  </button>
                  <button className="dropdown-item text-danger" onClick={handleLogout}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>

        {notice ? <div className="global-toast">{notice}</div> : null}
        {error ? <div className="global-toast error-toast">{error}</div> : null}

        {activeTab === 'Dashboard' && (
          <>
            <section className="account-grid">
              {loading
                ? Array.from({ length: 3 }).map((_, index) => (
                <article key={index} className="account-card skeleton-card">
                  <div className="skeleton-line short" />
                  <div className="skeleton-line" />
                  <div className="skeleton-line medium" />
                  <div className="skeleton-line short" />
                </article>
              ))
            : displaySources.map((source, index) => (
                <article key={source.idResource} className="account-card">
                  <div className="account-head">
                    <p className="account-title">{source.source}</p>
                    <div className="account-bank-logo">
                      {(() => {
                        const name = source.source.toLowerCase();
                        
                        // Bank Specific Chips
                        if (name.includes('bri')) {
                          return <div style={{ background: '#0f52ba', color: 'white', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold' }}>BRI</div>;
                        }
                        if (name.includes('bca')) {
                          return <div style={{ background: '#0060ad', color: 'white', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold' }}>BCA</div>;
                        }
                        if (name.includes('mandiri')) {
                          return <div style={{ background: '#003d79', color: '#fdb813', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold' }}>Mandiri</div>;
                        }
                        
                        // Digital / Cards Specific Text
                        if (name.includes('jago')) {
                          return <div style={{ color: '#f3a847', fontSize: '16px', fontWeight: 'bold' }}>Jago</div>;
                        }
                        if (name.includes('flazz')) {
                          return <div style={{ color: '#0060ad', fontSize: '16px', fontWeight: 'bold' }}>Flazz</div>;
                        }

                        // Digital Wallets / Generic E-Money
                        if (name.includes('emoney') || name.includes('e money') || name.includes('gopay') || name.includes('ovo') || name.includes('dana') || name.includes('shopee')) {
                          return (
                            <div style={{ background: '#f1c74a', padding: '4px 8px', borderRadius: '4px' }}>
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
                            </div>
                          );
                        }
                        
                        // Default Cash / Physical Money
                        return (
                          <div style={{ background: '#f1c74a', padding: '4px 8px', borderRadius: '4px' }}>
                            <svg width="20" height="14" viewBox="0 0 24 16" fill="none" stroke="#000" strokeWidth="2"><rect x="1" y="1" width="22" height="14" rx="2"/><circle cx="12" cy="8" r="3"/><line x1="1" y1="8" x2="4" y2="8"/><line x1="20" y1="8" x2="23" y2="8"/></svg>
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  <p className="account-amount-value">{maskBalance(source.balance || 0)}</p>
                  <p className="account-amount-label">Total amount</p>

                  <div className="card-footer">
                    <button type="button" className="remove-link" onClick={() => handleRemoveWallet(source)}>
                      Remove
                    </button>
                    <button type="button" className="edit-link" onClick={() => openEditWallet(source)}>
                      <PencilIcon />
                    </button>
                  </div>
                </article>
              ))}
            </section>

            {!loading && sources.length === 0 ? (
              <article className="empty-state panel" style={{ marginTop: '20px' }}>
                <h2>Belum ada transaksi di dompet</h2>
                <p>Edit dompet di atas atau klik Income untuk menambahkan saldo.</p>
              </article>
            ) : null}

        <section className="content-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <div className="dashboard-left-col" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <article className="panel chart-panel">
            <div className="panel-head">
              <h2>Total Income</h2>
              <button type="button" className="dropdown-chip">
                Last 6 months
              </button>
            </div>

            <div className="chart-wrap">
              <svg viewBox="0 0 100 100" className="income-chart" aria-label="Income chart">
                <defs>
                  <linearGradient id="incomeFill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#f3cb4a" stopOpacity="0.95" />
                    <stop offset="100%" stopColor="#f3cb4a" stopOpacity="0.18" />
                  </linearGradient>
                </defs>
                <path d={`${chartLine} L 100 100 L 0 100 Z`} fill="url(#incomeFill)" />
                <path d={chartLine} fill="none" stroke="#9d8120" strokeWidth="1.5" />
                {incomePoints.map((point, index) => {
                  const x = index * (100 / (incomePoints.length - 1));
                  const yPos = 100 - point;
                  return <circle key={`${x}-${yPos}`} cx={x} cy={yPos} r="1.3" fill="#fff7d4" stroke="#9d8120" strokeWidth="0.8" />;
                })}
              </svg>

              <div className="chart-axis">
                {chartMonths.map((m) => (
                  <span key={`${m.name}-${m.year}`}>{m.name}</span>
                ))}
              </div>
            </div>
          </article>
          </div>

          <div className="dashboard-right-col" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

            <article className="panel activity-panel">
              <div className="panel-head">
                <h2>Activity</h2>
                <button type="button" className="dropdown-chip">
                  This months
                </button>
              </div>

              <div className="donut-wrap">
                <div
                  className="donut-chart"
                  style={{
                    background: donutGradient,
                  }}
                >
                  <div className="donut-center">
                    <strong>{formatCurrency(totalAvailable || totalInitialBalance || 0)}</strong>
                    <span>Total balance</span>
                  </div>
                </div>

                <div className="legend-list" aria-label="Activity legend">
                  {activityBreakdown.map(([label], index) => (
                    <div key={label} className="legend-item">
                      <span 
                        className="legend-dot" 
                        style={{ background: activityColors[index % activityColors.length] }} 
                      />
                      <span>{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </article>
          </div>
        </section>

        <section className="content-grid bottom-grid">
          <article className="panel history-panel">
            <div className="panel-head compact-head">
              <h2>Transaction history</h2>
              <div className="history-tabs">
                <button type="button" className="tab active">
                  Recently
                </button>
                <button type="button" className="tab">
                  Oldest
                </button>
                <button type="button" className="tab" onClick={() => openTopUpTransaction()}>
                  More
                </button>
              </div>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Description</th>
                    <th>Type</th>
                    <th>Date</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {topTransactions.map((row, index) => (
                    <tr key={`${row.idTransaction ?? index}-${row.date ?? index}`}>
                      <td>{row.description || row.source || '-'}</td>
                      <td>{row.type.toUpperCase()}</td>
                      <td>{formatDate(row.date)}</td>
                      <td>{formatCurrency(Number(row.amount || 0))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>

          <article className="panel goals-panel">
            <div className="panel-head compact-head">
              <h2>My Budget</h2>
              <button type="button" className="add-goals-button" onClick={() => setBudgetModalOpen(true)}>
                + Goal
              </button>
            </div>

            <div className="goals-list">
              {budgets.slice(0, 3).map((goal, index) => {
                const percentage = Math.min(100, Math.round(goal.percent || 0));
                return (
                  <div key={goal.idCategory ?? index} className="goal-item">
                    <div className="goal-topline" style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: '12px' }}>
                      <div className="goal-icon" style={{ background: '#f9f9f9', padding: '8px', borderRadius: '8px', color: '#171717' }}>
                        {getCategoryIcon(goal.category?.name || 'General')}
                      </div>
                      <div className="goal-info" style={{ flex: 1 }}>
                        <div className="goal-title" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ fontWeight: 600 }}>{goal.category?.name || 'General'}</span>
                          <span style={{ color: '#f1c74a', fontWeight: 700 }}>{percentage}%</span>
                        </div>
                        <div className="goal-amount">
                          {formatCurrency(goal.spent)} / {formatCurrency(goal.amount)}
                        </div>
                      </div>
                    </div>
                    <div className="goal-track">
                      {Array.from({ length: 10 }).map((_, i) => (
                        <span key={i} className={i < Math.max(1, Math.floor(percentage / 10)) ? 'filled' : ''} />
                      ))}
                    </div>
                  </div>
                );
              })}

              {(!loading && budgets.length === 0) ? <p className="empty-copy">Belum ada target budget yang dibuat.</p> : null}
            </div>
          </article>
        </section>
        </>
      )}

      {activeTab === 'Transactions' && (
        <section className="transactions-view">
          <div className="stat-cards-grid">
            <div className="stat-card dark">
              <div className="stat-icon-wrap">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f1c74a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              </div>
              <p className="stat-label">Total Balance</p>
              <h3 className="stat-value">{maskBalance(totalAvailable)}</h3>
              <div className="stat-trend"><span className="trend-badge">{trendBalance} {trendBalance.startsWith('-') ? '↙' : '↗'}</span> than last month</div>
            </div>
            
            <div className="stat-card yellow">
              <div className="stat-icon-wrap">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#171717" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              </div>
              <p className="stat-label">Total Income</p>
              <h3 className="stat-value">{formatCurrency(transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount || 0), 0))}</h3>
              <div className="stat-trend"><span className="trend-badge dark">{trendIncome} {trendIncome.startsWith('-') ? '↙' : '↗'}</span> than last month</div>
            </div>

            <div className="stat-card dark">
              <div className="stat-icon-wrap">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f1c74a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              </div>
              <p className="stat-label">Total Expenses</p>
              <h3 className="stat-value">{formatCurrency(transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount || 0), 0))}</h3>
              <div className="stat-trend"><span className="trend-badge">{trendExpense} {trendExpense.startsWith('-') ? '↙' : '↗'}</span> than last month</div>
            </div>

            <div className="stat-card yellow">
              <div className="stat-icon-wrap">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#171717" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              </div>
              <p className="stat-label">Total Savings</p>
              <h3 className="stat-value">{formatCurrency(totalAvailable)}</h3>
              <div className="stat-trend"><span className="trend-badge dark">{trendSavings} {trendSavings.startsWith('-') ? '↙' : '↗'}</span> than last month</div>
            </div>
          </div>

          <section className="transactions-table-panel">
            <div className="table-toolbar">
              <div className="toolbar-left">
                <div className="table-search" style={{ width: '300px' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a0a0a0" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                  <input 
                    type="text" 
                    placeholder="Search transaction..." 
                    value={globalSearch}
                    onChange={(e) => setGlobalSearch(e.target.value)}
                  />
                </div>
              </div>
              <div className="toolbar-right">
                <select 
                  className="date-select"
                  value={`${txFilterMonth}-${txFilterYear}`}
                  onChange={(e) => {
                    const [m, y] = e.target.value.split('-').map(Number);
                    setTxFilterMonth(m);
                    setTxFilterYear(y);
                  }}
                >
                  {(() => {
                    const options = [];
                    const now = new Date();
                    for (let i = 0; i < 12; i++) {
                      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                      const m = d.getMonth();
                      const y = d.getFullYear();
                      const label = d.toLocaleString('id-ID', { month: 'long', year: 'numeric' });
                      options.push(<option key={`${m}-${y}`} value={`${m}-${y}`}>{label}</option>);
                    }
                    return options;
                  })()}
                </select>
                <button type="button" className="add-goals-button" onClick={() => openTopUpTransaction()}>
                  + Add Transactions
                </button>
              </div>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr className="yellow-header">
                    <th>Date</th>
                    <th>Description</th>
                    <th>Category</th>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((row, index) => (
                    <tr key={row.idTransaction ?? index} className={index % 2 === 1 ? 'striped-row' : ''}>
                      <td>{formatDate(row.date)}</td>
                      <td>{row.description || row.source || '-'}</td>
                      <td>{row.category?.name || 'Uncategorized'}</td>
                      <td style={{textTransform: 'capitalize'}}>{row.type}</td>
                      <td style={{ color: row.type === 'expense' ? '#d32f2f' : '#171717' }}>
                        {row.type === 'expense' ? '-' : ''}{formatCurrency(Number(row.amount || 0))}
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button 
                            type="button" 
                            className="action-btn"
                            onClick={() => openEditTransaction(row)}
                          >
                            <PencilIcon />
                          </button>
                          <button 
                            type="button" 
                            className="action-btn"
                            onClick={() => row.idTransaction && handleDeleteTransaction(row.idTransaction)}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredTransactions.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', color: '#a0a0a0', padding: '32px' }}>
                        Belum ada transaksi di bulan ini.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </section>
      )}

        {activeTab === 'Budgeting' && (
          <section className="budgeting-view" style={{ padding: '0' }}>
            <div style={{ height: '8px' }} />

            <div className="budget-filters" style={{ 
              display: 'flex', 
              gap: '16px', 
              marginBottom: '32px', 
              flexWrap: 'wrap', 
              alignItems: 'center',
              background: 'rgba(255,255,255,0.4)',
              padding: '12px',
              borderRadius: '20px',
              border: '1px solid var(--premium-border)'
            }}>
               <div className="table-search" style={{ 
                 flex: 1, 
                 minWidth: '240px',
                 background: 'white',
                 borderRadius: '14px',
                 border: '2px solid #f0f0f0',
                 height: '48px',
                 boxShadow: 'none'
               }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: '#a0a0a0' }}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                  <input 
                    type="text" 
                    placeholder="Search category..." 
                    value={budgetSearch}
                    onChange={(e) => setBudgetSearch(e.target.value)}
                    style={{ fontSize: '0.95rem' }}
                  />
               </div>
               
               <select 
                 className="premium-select" 
                 style={{ 
                   width: 'auto', 
                   minWidth: '180px'
                 }}
                 value={budgetFilterPeriod}
                 onChange={(e) => setBudgetFilterPeriod(e.target.value)}
               >
                 <option value="all">All Periods</option>
                 <option value="daily">Daily</option>
                 <option value="weekly">Weekly</option>
                 <option value="monthly">Monthly</option>
                 <option value="yearly">Yearly</option>
                 <option value="custom">Custom Range</option>
               </select>

               <div className="status-toggle-group" style={{ 
                 display: 'flex', 
                 background: '#f0f0f0', 
                 padding: '4px', 
                 borderRadius: '14px',
                 height: '48px',
                 alignItems: 'center'
               }}>
                  {[
                    { id: 'all', label: 'All' },
                    { id: 'safe', label: 'On Track' },
                    { id: 'over', label: 'Over Budget' }
                  ].map(status => (
                    <button
                      key={status.id}
                      type="button"
                      onClick={() => setBudgetFilterStatus(status.id as any)}
                      style={{
                        padding: '0 20px',
                        height: '40px',
                        borderRadius: '10px',
                        border: 'none',
                        fontSize: '0.9rem',
                        fontWeight: 700,
                        background: budgetFilterStatus === status.id ? 'white' : 'transparent',
                        color: budgetFilterStatus === status.id ? '#171717' : '#8c8c8c',
                        boxShadow: budgetFilterStatus === status.id ? '0 4px 12px rgba(0,0,0,0.06)' : 'none',
                        transition: '0.2s'
                      }}
                    >
                      {status.label}
                    </button>
                  ))}
               </div>
            </div>

            <div className="budget-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
              {filteredBudgets.map((budget) => {
                const percent = Math.min(100, budget.percent || 0);
                const isOver = percent >= 100;
                return (
                  <article key={budget.idBudget} className="panel budget-card" style={{ padding: '24px', position: 'relative' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                      <h3 style={{ fontWeight: 600 }}>{budget.category?.name || 'General'}</h3>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.8rem', color: '#888', textTransform: 'capitalize' }}>{budget.period}</span>
                        <div className="action-buttons" style={{ marginLeft: '8px' }}>
                          <button type="button" className="action-btn" onClick={() => openEditBudget(budget)} title="Edit Budget">
                            <PencilIcon />
                          </button>
                          <button type="button" className="action-btn" onClick={() => handleBudgetDelete(budget.idBudget)} title="Delete Budget">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem' }}>
                        <span>{formatCurrency(budget.spent || 0)}</span>
                        <span style={{ fontWeight: 600 }}>{formatCurrency(budget.amount)}</span>
                      </div>
                      <div className="progress-bar-bg" style={{ height: '8px', background: '#f0f0f0', borderRadius: '4px', overflow: 'hidden' }}>
                        <div 
                          className="progress-bar-fill" 
                          style={{ 
                            width: `${percent}%`, 
                            height: '100%', 
                            background: isOver ? '#ef4444' : '#f1c74a',
                            transition: 'width 0.5s ease'
                          }} 
                        />
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.85rem', color: isOver ? '#ef4444' : '#666' }}>
                        {isOver ? 'Over budget!' : `${100 - percent}% remaining`}
                      </span>
                      <div className="budget-dates" style={{ fontSize: '0.75rem', color: '#999' }}>
                         {formatDate(budget.periodStart)} - {formatDate(budget.periodEnd)}
                      </div>
                    </div>
                  </article>
                );
              })}

            {filteredBudgets.length === 0 && (
              <div style={{ 
                gridColumn: '1 / -1', 
                textAlign: 'center', 
                padding: '80px 40px', 
                background: 'white', 
                borderRadius: '32px', 
                boxShadow: 'var(--premium-card-shadow)',
                border: '1px solid var(--premium-border)'
              }}>
                 <div style={{ 
                   width: '80px', 
                   height: '80px', 
                   background: '#fcfbf7', 
                   borderRadius: '24px', 
                   display: 'flex', 
                   alignItems: 'center', 
                   justifyContent: 'center', 
                   margin: '0 auto 24px',
                   color: '#f1c74a'
                 }}>
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/><path d="M11 8v6"/><path d="M8 11h6"/></svg>
                 </div>
                 <h3 style={{ fontWeight: 800, fontSize: '1.5rem', margin: '0 0 12px', color: '#171717' }}>Budget tidak ditemukan</h3>
                 <p style={{ color: '#666', fontSize: '1rem', maxWidth: '400px', margin: '0 auto', lineHeight: 1.6 }}>
                   {budgetSearch || budgetFilterPeriod !== 'all' || budgetFilterStatus !== 'all' 
                     ? 'Sepertinya tidak ada budget yang sesuai dengan filter Anda. Coba atur ulang pencarian atau filter.' 
                     : 'Mulai atur pengeluaran Anda agar lebih terpantau dengan membuat budget pertama Anda sekarang.'}
                 </p>
                 {!budgetSearch && budgetFilterPeriod === 'all' && budgetFilterStatus === 'all' && (
                    <button 
                      className="solid-button" 
                      onClick={() => openCreateBudget()}
                      style={{ marginTop: '32px', padding: '12px 32px' }}
                    >
                      + Buat Budget Pertama
                    </button>
                 )}
              </div>
            )}
            </div>
          </section>
        )}

        {activeTab === 'Statistics' && (
          <section className="statistics-view" style={{ padding: '20px 0' }}>
            <div className="view-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div className="tab-pill-group" style={{ display: 'flex', background: '#eee', borderRadius: '12px', padding: '4px' }}>
                <button 
                  className={statsSubTab === 'Analytics' ? 'active' : ''} 
                  onClick={() => setStatsSubTab('Analytics')}
                  style={{ border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', background: statsSubTab === 'Analytics' ? '#f1c74a' : 'transparent', fontWeight: 600 }}
                >
                  Analytics
                </button>
                <button 
                  className={statsSubTab === 'Laporan' ? 'active' : ''} 
                  onClick={() => setStatsSubTab('Laporan')}
                  style={{ border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', background: statsSubTab === 'Laporan' ? '#f1c74a' : 'transparent', fontWeight: 600 }}
                >
                  Laporan Keuangan
                </button>
              </div>
            </div>

            <div className="stats-content" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              {statsSubTab === 'Analytics' ? (
                <>
                  {/* Slide 4: Cards Grid */}
                  <div className="stats-cards-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
                    <div className="panel" style={{ background: '#fffbeb' }}>
                      <p style={{ fontSize: '0.75rem', color: '#888', marginBottom: '8px' }}>Total Transaksi</p>
                      <h3 style={{ fontSize: '1.5rem', fontWeight: 700 }}>{transactions.length}</h3>
                    </div>
                    <div className="panel" style={{ background: '#fffbeb' }}>
                      <p style={{ fontSize: '0.75rem', color: '#888', marginBottom: '8px' }}>Rata-rata Pemasukan</p>
                      <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#4ab2a6' }}>
                        {formatCurrency(totalIncome / (transactions.filter(t => t.type === 'income').length || 1))}
                      </h3>
                    </div>
                    <div className="panel" style={{ background: '#fffbeb' }}>
                      <p style={{ fontSize: '0.75rem', color: '#888', marginBottom: '8px' }}>Rata-rata Pengeluaran</p>
                      <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#ef4444' }}>
                        {formatCurrency(totalExpense / (transactions.filter(t => t.type === 'expense').length || 1))}
                      </h3>
                    </div>
                    <div className="panel" style={{ background: '#fffbeb' }}>
                      <p style={{ fontSize: '0.75rem', color: '#888', marginBottom: '8px' }}>Pemasukan Tertinggi</p>
                      <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#4ab2a6' }}>
                        {formatCurrency(Math.max(...transactions.filter(t => t.type === 'income').map(t => Number(t.amount || 0)), 0))}
                      </h3>
                    </div>
                    <div className="panel" style={{ background: '#fffbeb' }}>
                      <p style={{ fontSize: '0.75rem', color: '#888', marginBottom: '8px' }}>Pengeluaran Tertinggi</p>
                      <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#ef4444' }}>
                        {formatCurrency(Math.max(...transactions.filter(t => t.type === 'expense').map(t => Number(t.amount || 0)), 0))}
                      </h3>
                    </div>
                    <div className="panel" style={{ background: '#fffbeb' }}>
                      <p style={{ fontSize: '0.75rem', color: '#888', marginBottom: '8px' }}>Tingkat Tabungan</p>
                      <h3 style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                        {totalIncome > 0 ? ((totalSavings / totalIncome) * 100).toFixed(1) : 0}%
                      </h3>
                    </div>
                  </div>

                  {/* Slide 1: Income vs Expenses Comparison */}
                  <div className="panel" style={{ padding: '40px' }}>
                    <h3 style={{ marginBottom: '32px', fontWeight: 700 }}>Income vs Expenses</h3>
                    <div style={{ height: '300px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: '60px', paddingBottom: '30px' }}>
                       <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', height: '100%', justifyContent: 'flex-end' }}>
                          <div style={{ width: '40px', height: `${(totalIncome / Math.max(totalIncome, totalExpense, 1)) * 100}%`, background: '#f1c74a', borderRadius: '8px 8px 0 0', position: 'relative' }}>
                             <span style={{ position: 'absolute', top: '-25px', left: '50%', transform: 'translateX(-50%)', fontSize: '0.75rem', fontWeight: 700 }}>{formatCurrency(totalIncome)}</span>
                          </div>
                          <span style={{ fontWeight: 600 }}>Income</span>
                       </div>
                       <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', height: '100%', justifyContent: 'flex-end' }}>
                          <div style={{ width: '40px', height: `${(totalExpense / Math.max(totalIncome, totalExpense, 1)) * 100}%`, background: '#171717', borderRadius: '8px 8px 0 0', position: 'relative' }}>
                             <span style={{ position: 'absolute', top: '-25px', left: '50%', transform: 'translateX(-50%)', fontSize: '0.75rem', fontWeight: 700 }}>{formatCurrency(totalExpense)}</span>
                          </div>
                          <span style={{ fontWeight: 600 }}>Expenses</span>
                       </div>
                    </div>
                    <div style={{ textAlign: 'center', marginTop: '20px', padding: '16px', background: '#f8f5ee', borderRadius: '12px' }}>
                       <p style={{ margin: 0, fontSize: '0.9rem', color: '#666' }}>Net Savings This Month</p>
                       <h4 style={{ margin: '4px 0 0', fontSize: '1.2rem', fontWeight: 700, color: totalSavings >= 0 ? '#4ab2a6' : '#ef4444' }}>
                          {formatCurrency(totalSavings)} ({totalIncome > 0 ? ((totalSavings / totalIncome) * 100).toFixed(1) : 0}%)
                       </h4>
                    </div>
                  </div>

                  {/* Slide 2: Budget vs Actual Bar Chart */}
                  <div className="panel" style={{ padding: '40px' }}>
                    <h3 style={{ marginBottom: '32px', fontWeight: 700 }}>Budget vs Actual</h3>
                    <div style={{ height: '300px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '20px', paddingBottom: '30px', borderBottom: '1px solid #eee' }}>
                       {budgets.slice(0, 8).map((b, i) => {
                          const maxVal = Math.max(b.amount, b.spent, 1);
                          const budgetH = (b.amount / maxVal) * 100;
                          const actualH = (b.spent / maxVal) * 100;
                          return (
                            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', height: '100%', justifyContent: 'flex-end' }}>
                               <div style={{ display: 'flex', gap: '4px', alignItems: 'flex-end', height: '100%', width: '100%', justifyContent: 'center' }}>
                                  <div style={{ width: '12px', height: `${budgetH}%`, background: '#f1c74a', borderRadius: '4px 4px 0 0' }}></div>
                                  <div style={{ width: '12px', height: `${actualH}%`, background: '#171717', borderRadius: '4px 4px 0 0' }}></div>
                               </div>
                               <span style={{ fontSize: '0.7rem', color: '#888', whiteSpace: 'nowrap' }}>{b.category?.name || 'Cat'}</span>
                            </div>
                          );
                       })}
                       {budgets.length === 0 && <p style={{ width: '100%', textAlign: 'center', color: '#aaa' }}>No budget data available.</p>}
                    </div>
                  </div>

                  {/* Slide 3: Area Chart Monthly */}
                  <div className="panel" style={{ padding: '40px' }}>
                    <h3 style={{ marginBottom: '32px', fontWeight: 700 }}>Pengeluaran Bulanan</h3>
                    <div style={{ height: '300px', width: '100%', position: 'relative' }}>
                      <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                        <defs>
                          <linearGradient id="areaGradient" x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0%" stopColor="#f1c74a" stopOpacity="0.6" />
                            <stop offset="100%" stopColor="#f1c74a" stopOpacity="0" />
                          </linearGradient>
                        </defs>
                        <path d={`${chartLine} L 100 100 L 0 100 Z`} fill="url(#areaGradient)" />
                        <path d={chartLine} fill="none" stroke="#f1c74a" strokeWidth="2" />
                      </svg>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
                         {chartMonths.map((m, i) => <span key={i} style={{ fontSize: '0.7rem', color: '#888' }}>{m.name}</span>)}
                      </div>
                    </div>
                  </div>

                  {/* Slide 4: Top Spending Category */}
                  <div className="panel" style={{ padding: '40px' }}>
                    <h3 style={{ marginBottom: '32px', fontWeight: 700 }}>Kategori Spending Terbesar</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      {categoryStats.slice(0, 5).map((stat, i) => {
                        const maxVal = categoryStats[0].amount;
                        const barW = (stat.amount / maxVal) * 100;
                        return (
                          <div key={i}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem' }}>
                              <span style={{ fontWeight: 600 }}>{stat.name}</span>
                              <span style={{ color: '#888' }}>{formatCurrency(stat.amount)}</span>
                            </div>
                            <div style={{ height: '12px', background: '#eee', borderRadius: '6px', overflow: 'hidden' }}>
                              <div style={{ width: `${barW}%`, height: '100%', background: stat.color, borderRadius: '6px' }}></div>
                            </div>
                          </div>
                        );
                      })}
                      {categoryStats.length === 0 && <p style={{ textAlign: 'center', color: '#aaa' }}>Belum ada data pengeluaran.</p>}
                    </div>
                  </div>

                </>
              ) : (
                /* Laporan Keuangan View */
                <div className="report-view" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                   <div className="panel" style={{ padding: '32px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                        <div>
                          <h3 style={{ fontWeight: 700, margin: 0 }}>Laporan Bulanan</h3>
                          <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                             <select 
                               className="premium-select"
                               value={reportMonth} 
                               onChange={(e) => setReportMonth(Number(e.target.value))}
                               style={{ width: '160px' }}
                             >
                                {['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'].map((m, i) => (
                                   <option key={i} value={i}>{m}</option>
                                ))}
                             </select>
                             <select 
                               className="premium-select"
                               value={reportYear} 
                               onChange={(e) => setReportYear(Number(e.target.value))}
                               style={{ padding: '8px 12px', borderRadius: '12px', border: '1px solid #ddd', background: 'white' }}
                             >
                                {[2024, 2025, 2026].map(y => (
                                   <option key={y} value={y}>{y}</option>
                                ))}
                             </select>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '12px' }}>
                           <button 
                             onClick={handleExportPDF}
                             style={{ background: '#171717', color: '#f1c74a', border: 'none', padding: '10px 20px', borderRadius: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                           >
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                              Export PDF
                           </button>
                           <button 
                             onClick={handleExportExcel}
                             style={{ background: '#f1c74a', color: '#171717', border: 'none', padding: '10px 20px', borderRadius: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                           >
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M8 13h2v4H8z"/><path d="M12 13h2v4h-2z"/></svg>
                              Export Excel
                           </button>
                        </div>
                      </div>

                      <div className="report-summary-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '32px' }}>
                         <div style={{ padding: '20px', borderRadius: '16px', background: '#e8f5e9' }}>
                            <p style={{ fontSize: '0.8rem', color: '#666', marginBottom: '4px' }}>Total Pemasukan</p>
                            <h4 style={{ color: '#2e7d32', fontWeight: 700 }}>{formatCurrency(reportData.income)}</h4>
                         </div>
                         <div style={{ padding: '20px', borderRadius: '16px', background: '#ffebee' }}>
                            <p style={{ fontSize: '0.8rem', color: '#666', marginBottom: '4px' }}>Total Pengeluaran</p>
                            <h4 style={{ color: '#c62828', fontWeight: 700 }}>{formatCurrency(reportData.expense)}</h4>
                         </div>
                         <div style={{ padding: '20px', borderRadius: '16px', background: '#fffbeb' }}>
                            <p style={{ fontSize: '0.8rem', color: '#666', marginBottom: '4px' }}>Net Savings</p>
                            <h4 style={{ color: '#171717', fontWeight: 700 }}>{formatCurrency(reportData.income - reportData.expense)}</h4>
                         </div>
                      </div>

                      <div className="report-sections" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
                         <div>
                            <h4 style={{ fontWeight: 700, marginBottom: '16px' }}>Penggunaan Budget</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                               {reportData.budgets.map((b, i) => (
                                  <div key={i}>
                                     <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                                        <span>{b.category?.name || 'General'}</span>
                                        <span>{b.percent.toFixed(0)}%</span>
                                     </div>
                                     <div style={{ height: '6px', background: '#eee', borderRadius: '3px', overflow: 'hidden' }}>
                                        <div style={{ width: `${Math.min(100, b.percent)}%`, height: '100%', background: b.percent > 100 ? '#ef4444' : '#f1c74a' }}></div>
                                     </div>
                                  </div>
                               ))}
                               {reportData.budgets.length === 0 && <p style={{ fontSize: '0.85rem', color: '#999' }}>Tidak ada data budget untuk bulan ini.</p>}
                            </div>
                         </div>
                         <div>
                            <h4 style={{ fontWeight: 700, marginBottom: '16px' }}>Status Keuangan</h4>
                            <div style={{ padding: '20px', borderRadius: '16px', border: '1px dashed #ddd', textAlign: 'center' }}>
                               <p style={{ fontSize: '0.9rem', color: '#555' }}>
                                  {reportData.budgets.some(b => b.percent >= 100) 
                                     ? "Wah, ada kategori yang over-budget! Mari coba tekan pengeluaran di kategori tersebut." 
                                     : reportData.income > reportData.expense 
                                       ? "Anda berhasil menabung bulan ini! Semua budget terkendali. Pertahankan performa ini." 
                                       : "Pengeluaran Anda lebih besar dari pemasukan. Coba cek kembali daftar belanja Anda."}
                               </p>
                            </div>
                         </div>
                      </div>
                   </div>

                   <div className="panel" style={{ padding: '32px' }}>
                      <h4 style={{ fontWeight: 700, marginBottom: '20px' }}>Detail Transaksi</h4>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                         <thead>
                            <tr style={{ borderBottom: '1px solid #eee', fontSize: '0.9rem', color: '#888' }}>
                               <th style={{ padding: '12px', textAlign: 'left' }}>Tanggal</th>
                               <th style={{ padding: '12px', textAlign: 'left' }}>Deskripsi</th>
                               <th style={{ padding: '12px', textAlign: 'left' }}>Kategori</th>
                               <th style={{ padding: '12px', textAlign: 'right' }}>Jumlah</th>
                            </tr>
                         </thead>
                         <tbody>
                            {reportData.transactions.map((t, i) => (
                               <tr key={i} style={{ borderBottom: '1px solid #f9f9f9', fontSize: '0.9rem' }}>
                                  <td style={{ padding: '12px' }}>{new Date(t.date || '').getDate()}</td>
                                  <td style={{ padding: '12px' }}>{t.description}</td>
                                  <td style={{ padding: '12px' }}>{t.category?.name || '-'}</td>
                                  <td style={{ padding: '12px', textAlign: 'right', color: t.type === 'income' ? '#2e7d32' : '#171717', fontWeight: 600 }}>
                                     {t.type === 'expense' ? '-' : '+'}{formatCurrency(Number(t.amount))}
                                  </td>
                               </tr>
                            ))}
                            {reportData.transactions.length === 0 && (
                               <tr><td colSpan={4} style={{ padding: '40px', textAlign: 'center', color: '#999' }}>Tidak ada transaksi di periode ini.</td></tr>
                            )}
                         </tbody>
                      </table>
                   </div>
                </div>
              )}
            </div>
          </section>
        )}

      {activeTab === 'Settings' && (
        <section className="settings-view" style={{ padding: '20px 0' }}>
          <div className="tab-pill-group" style={{ display: 'flex', justifyContent: 'flex-start', background: '#eee', borderRadius: '12px', padding: '4px', width: 'fit-content', marginBottom: '32px' }}>
            <button 
              onClick={() => setSettingsSubTab('Profile')}
              style={{ border: 'none', padding: '8px 24px', borderRadius: '8px', cursor: 'pointer', background: settingsSubTab === 'Profile' ? '#f1c74a' : 'transparent', color: '#171717', fontWeight: 600, transition: '0.3s' }}
            >
              Edit Profile
            </button>
            <button 
              onClick={() => setSettingsSubTab('Preferences')}
              style={{ border: 'none', padding: '8px 24px', borderRadius: '8px', cursor: 'pointer', background: settingsSubTab === 'Preferences' ? '#f1c74a' : 'transparent', color: '#171717', fontWeight: 600, transition: '0.3s' }}
            >
              Preferences
            </button>
            <button 
              onClick={() => setSettingsSubTab('Account')}
              style={{ border: 'none', padding: '8px 24px', borderRadius: '8px', cursor: 'pointer', background: settingsSubTab === 'Account' ? '#f1c74a' : 'transparent', color: '#171717', fontWeight: 600, transition: '0.3s' }}
            >
              Account
            </button>
          </div>

          <article className="panel" style={{ background: 'white', padding: '40px', borderRadius: '24px', border: '1px solid rgba(23, 23, 23, 0.06)', boxShadow: '0 14px 40px rgba(18, 17, 12, 0.06)' }}>
            {settingsSubTab === 'Profile' && (
              <form onSubmit={handleProfileSave} className="profile-settings-layout" style={{ display: 'flex', gap: '60px', alignItems: 'flex-start' }}>
                {/* Avatar Section */}
                <div style={{ position: 'relative' }}>
                  <div style={{ width: '180px', height: '180px', borderRadius: '50%', overflow: 'hidden', border: '4px solid #f1c74a', background: '#f5f5f5', display: 'grid', placeItems: 'center' }}>
                    <div style={{ fontSize: '3rem', fontWeight: 800, color: '#ccc' }}>
                      {userProfile?.name?.charAt(0) || 'U'}
                    </div>
                  </div>
                </div>

                {/* Form Section */}
                <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                  <div className="form-group">
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: '#666', fontWeight: 500 }}>First Name</label>
                    <input 
                      type="text" 
                      name="firstName"
                      defaultValue={userProfile?.name?.split(' ')[0] || ''} 
                      placeholder="John"
                      style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #ddd', fontSize: '1rem', background: 'white' }} 
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: '#666', fontWeight: 500 }}>Last Name</label>
                    <input 
                      type="text" 
                      name="lastName"
                      defaultValue={userProfile?.name?.split(' ').slice(1).join(' ') || ''} 
                      placeholder="Doe"
                      style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #ddd', fontSize: '1rem', background: 'white' }} 
                    />
                  </div>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: '#666', fontWeight: 500 }}>Email</label>
                    <div style={{ position: 'relative' }}>
                      <input 
                        type="email" 
                        value={userProfile?.email || ''} 
                        readOnly
                        style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #ddd', fontSize: '1rem', background: '#f9f9f9', color: '#999' }} 
                      />
                      <span style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)' }}>🔒</span>
                    </div>
                  </div>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: '#666', fontWeight: 500 }}>Occupation</label>
                    <input 
                      type="text" 
                      name="occupation"
                      defaultValue={(userProfile as any)?.occupation || ''}
                      placeholder="Software Engineer"
                      style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #ddd', fontSize: '1rem', background: 'white' }} 
                    />
                  </div>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: '#666', fontWeight: 500 }}>Bio</label>
                    <textarea 
                      name="bio"
                      defaultValue={(userProfile as any)?.bio || ''}
                      placeholder="Write something about yourself..."
                      style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #ddd', fontSize: '1rem', background: 'white', minHeight: '100px', resize: 'vertical', fontFamily: 'inherit' }} 
                    />
                  </div>

                  <div className="form-actions" style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                    <button 
                      type="submit"
                      disabled={profileSaving}
                      style={{ background: '#f1c74a', color: '#171717', border: 'none', padding: '12px 32px', borderRadius: '12px', fontWeight: 700, cursor: 'pointer', transition: '0.3s', boxShadow: '0 4px 12px rgba(241, 199, 74, 0.2)' }}
                    >
                      {profileSaving ? 'Saving...' : 'Save Change'}
                    </button>
                  </div>
                </div>
              </form>
            )}

            {settingsSubTab === 'Preferences' && (
              <div className="preferences-settings">
                <div className="pref-section" style={{ marginBottom: '40px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0' }}>
                    <div>
                      <p style={{ fontWeight: 600 }}>Hide Balance</p>
                      <p style={{ fontSize: '0.85rem', color: '#666' }}>Hide your balance automatically when the app opens</p>
                    </div>
                    <div 
                      onClick={() => handlePreferenceUpdate({ hideBalance: !preferences.hideBalance })}
                      className={`toggle-switch ${preferences.hideBalance ? 'active' : ''}`} 
                      style={{ 
                        width: '48px', 
                        height: '24px', 
                        background: preferences.hideBalance ? '#f1c74a' : '#ddd', 
                        borderRadius: '12px', 
                        position: 'relative', 
                        cursor: 'pointer',
                        transition: '0.3s'
                      }}
                    >
                      <div style={{ 
                        width: '20px', 
                        height: '20px', 
                        background: 'white', 
                        borderRadius: '50%', 
                        position: 'absolute', 
                        top: '2px', 
                        left: preferences.hideBalance ? '26px' : '2px',
                        transition: '0.3s'
                      }}></div>
                    </div>
                  </div>
                </div>

                <div className="pref-section">
                  <h4 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '24px' }}>Notifications</h4>
                  {[
                    { key: 'dailyReminder', title: 'Daily Reminder', desc: 'Receive a gentle nudge to record your daily expenses every evening' },
                    { key: 'budgetLimitAlert', title: 'Budget Limit', desc: 'Get notified when your spending reaches 80% or exceeds your set budget' },
                    { key: 'weeklySummary', title: 'Weekly Summary', desc: 'Get a weekly recap of your financial health and spending patterns every Sunday' }
                  ].map((item, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', borderTop: '1px solid #eee' }}>
                      <div>
                        <p style={{ fontWeight: 600 }}>{item.title}</p>
                        <p style={{ fontSize: '0.85rem', color: '#666' }}>{item.desc}</p>
                      </div>
                      <div 
                        onClick={() => handlePreferenceUpdate({ [item.key]: !preferences[item.key as keyof typeof preferences] })}
                        className={`toggle-switch ${preferences[item.key as keyof typeof preferences] ? 'active' : ''}`} 
                        style={{ 
                          width: '48px', 
                          height: '24px', 
                          background: preferences[item.key as keyof typeof preferences] ? '#f1c74a' : '#ddd', 
                          borderRadius: '12px', 
                          position: 'relative',
                          cursor: 'pointer',
                          transition: '0.3s'
                        }}
                      >
                        <div style={{ 
                          width: '20px', 
                          height: '20px', 
                          background: 'white', 
                          borderRadius: '50%', 
                          position: 'absolute', 
                          top: '2px', 
                          left: preferences[item.key as keyof typeof preferences] ? '26px' : '2px',
                          transition: '0.3s'
                        }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {settingsSubTab === 'Account' && (
              <div className="account-settings">
                <div style={{ marginBottom: '32px' }}>
                  <h3 style={{ margin: '0 0 12px', fontSize: '1.2rem', fontWeight: 700 }}>Pengaturan Akun</h3>
                  <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '24px' }}>Kelola keamanan dan ketersediaan akun Anda.</p>
                  
                  <div style={{ 
                    padding: '24px', 
                    borderRadius: '16px', 
                    border: '1px solid #fee2e2', 
                    background: '#fffafb' 
                  }}>
                    <h4 style={{ margin: '0 0 8px', color: '#991b1b', fontWeight: 700 }}>Danger Zone</h4>
                    <p style={{ color: '#7f1d1d', fontSize: '0.85rem', marginBottom: '20px', lineHeight: 1.5 }}>
                      Menghapus akun Anda akan menghapus semua data transaksi, budget, dan pengaturan secara permanen. 
                      Tindakan ini tidak dapat dibatalkan.
                    </p>
                    
                    <button 
                      onClick={() => setDeleteAccountModalOpen(true)}
                      style={{ 
                        background: '#ef4444', 
                        color: 'white', 
                        border: 'none', 
                        padding: '12px 24px', 
                        borderRadius: '10px', 
                        fontWeight: 700, 
                        cursor: 'pointer',
                        transition: '0.3s',
                        boxShadow: '0 4px 12px rgba(239, 68, 68, 0.2)'
                      }}
                      onMouseOver={(e) => (e.currentTarget.style.background = '#dc2626')}
                      onMouseOut={(e) => (e.currentTarget.style.background = '#ef4444')}
                    >
                      Hapus Akun Permanen
                    </button>
                  </div>
                </div>
              </div>
            )}
           </article>
        </section>
      )}
      {activeTab === 'FinBot AI' && <AiChatView />}
    </section>

      <FundingSourceModal
        open={walletModalOpen}
        mode={walletMode}
        initialValues={walletInitialValues}
        loading={walletSaving}
        error={walletError}
        onClose={() => setWalletModalOpen(false)}
        onSubmit={handleWalletSubmit}
      />

      <TransactionModal
        open={transactionModalOpen}
        mode={transactionMode}
        sources={sources}
        initialValues={transactionInitialValues}
        loading={transactionSaving}
        error={transactionError}
        onClose={() => setTransactionModalOpen(false)}
        onSubmit={handleTransactionSubmit}
      />

      <BudgetModal
        open={budgetModalOpen}
        mode={budgetMode}
        initialValues={selectedBudget ? {
          idCategory: selectedBudget.idCategory?.toString() || '',
          amount: selectedBudget.amount?.toString() || '',
          period: selectedBudget.period || 'monthly',
          periodStart: selectedBudget.periodStart?.split('T')[0] || '',
          periodEnd: selectedBudget.periodEnd?.split('T')[0] || '',
        } : undefined}
        categories={categories.filter(c => c.type === 'expense')}
        loading={budgetSaving}
        error={budgetError}
        onClose={() => setBudgetModalOpen(false)}
        onSubmit={handleBudgetSubmit}
      />


      <ConfirmDeleteModal
        open={deleteAccountModalOpen}
        title="Hapus Akun Anda?"
        message="Tindakan ini permanen. Semua data transaksi, budget, dan dompet Anda akan dihapus selamanya."
        loading={deleteAccountLoading}
        error={deleteAccountError}
        onClose={() => setDeleteAccountModalOpen(false)}
        onConfirm={handleDeleteAccount}
      />

      {confirmModal.open && (
        <div className="modal-backdrop confirm-backdrop" style={{ zIndex: 1000 }}>
          <div className="confirm-modal-card">
            <div className="confirm-icon" style={{ 
              background: confirmModal.type === 'danger' ? '#fee2e2' : '#fef9c3',
              color: confirmModal.type === 'danger' ? '#ef4444' : '#f1c74a'
            }}>
              {confirmModal.type === 'danger' ? (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
              )}
            </div>
            <h3>{confirmModal.title}</h3>
            <p>{confirmModal.message}</p>
            <div className="confirm-actions">
              <button className="outline-btn" onClick={() => setConfirmModal(prev => ({ ...prev, open: false }))}>Cancel</button>
              <button 
                className={`solid-button ${confirmModal.type === 'danger' ? 'danger-btn' : ''}`} 
                onClick={confirmModal.onConfirm}
              >
                {confirmModal.confirmText || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
      {overBudgetModalOpen && (
        <div className="modal-backdrop confirm-backdrop" style={{ zIndex: 1000 }}>
          <div className="confirm-modal-card" style={{ maxWidth: '400px', textAlign: 'center' }}>
            <div className="confirm-icon" style={{ 
              background: '#fef3c7', 
              color: '#f1c74a', 
              width: '64px', 
              height: '64px', 
              borderRadius: '50%', 
              display: 'grid', 
              placeItems: 'center', 
              margin: '0 auto 20px' 
            }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
            </div>
            <h3>Over Budget!</h3>
            <p>Pengeluaran kamu telah melebihi batas budget untuk kategori:<br/><strong style={{ color: '#ef4444', display: 'block', marginTop: '8px' }}>{overBudgetNames}</strong></p>
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '24px', width: '100%' }}>
              <button className="solid-button" onClick={() => setOverBudgetModalOpen(false)} style={{ padding: '12px 32px' }}>Saya Mengerti</button>
            </div>
          </div>
        </div>
      )}
    </main >
  );
}
