"use client";

import { useEffect, useMemo, useState } from 'react';
import {
  apiRequest,
  type FundingSourceRecord,
  type TransactionRecord,
} from '@/lib/api';
import { BrandLogo } from '@/components/BrandLogo';
import { FundingSourceModal, type FundingSourceFormValues } from './FundingSourceModal';
import { TransactionModal, type TransactionFormValues } from './TransactionModal';
import { BudgetModal } from './BudgetModal';
import { Chatbot } from './Chatbot';
import { DashboardIcon, TransactionsIcon, BudgetingIcon, StatisticsIcon, SettingsIcon, LogoutIcon, BellIcon, UserIcon, PencilIcon } from '@/components/icons';
import './dashboard.css';

const navigation = [
  { name: 'Dashboard', icon: <DashboardIcon /> },
  { name: 'Transactions', icon: <TransactionsIcon /> },
  { name: 'Budgeting', icon: <BudgetingIcon /> },
  { name: 'Statistics', icon: <StatisticsIcon /> },
  { name: 'Settings', icon: <SettingsIcon /> },
];

const initialTransactionValues = (): TransactionFormValues => ({
  type: 'income',
  amount: '',
  description: '',
  source: '',
  date: new Date().toISOString().slice(0, 10),
});

function formatCurrency(value: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value);
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
  const [sources, setSources] = useState<FundingSourceRecord[]>([]);
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  type UserProfile = {
    idUser?: number;
    name?: string;
    email?: string;
  };
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  type NotificationRecord = {
    idNotification: number;
    title: string;
    message: string;
    type: string;
    read: boolean;
    createdAt: string;
  };
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  type CategoryRecord = {
    idCategory: number;
    name: string;
    type: string;
  };
  const [categories, setCategories] = useState<CategoryRecord[]>([]);

  type GoalRecord = {
    idCategory: number | null;
    name: string;
    budgetAmount: number;
    spent: number;
    percent: number;
    remaining: number;
    overBudget: boolean;
  };
  const [goals, setGoals] = useState<GoalRecord[]>([]);

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
  const [budgets, setBudgets] = useState<BudgetRecord[]>([]);
  const [budgetModalOpen, setBudgetModalOpen] = useState(false);
  const [budgetSaving, setBudgetSaving] = useState(false);
  const [budgetError, setBudgetError] = useState('');

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
  const [transactionSaving, setTransactionSaving] = useState(false);
  const [transactionError, setTransactionError] = useState('');

  const loadDashboard = async () => {
    setLoading(true);
    setError('');

    try {
      const [sourceData, transactionData, profileData, unreadData, goalsData, budgetsData, categoriesData] = await Promise.all([
        apiRequest<FundingSourceRecord[]>('/funding-sources'),
        apiRequest<{ data?: TransactionRecord[] }>('/transactions?per_page=50'),
        apiRequest<{ data?: UserProfile } | UserProfile>('/auth/profile').catch(() => null),
        apiRequest<{ count: number }>('/notifications/unread/count').catch(() => ({ count: 0 })),
        apiRequest<{ data: GoalRecord[] }>('/budgets/goals').catch(() => ({ data: [] })),
        apiRequest<BudgetRecord[]>('/budgets'),
        apiRequest<CategoryRecord[]>('/categories').catch(() => []),
      ]);

      setSources(sourceData);
      setTransactions(transactionData.data ?? []);
      setUnreadCount(unreadData?.count ?? 0);
      setGoals(goalsData.data || []);
      setBudgets(budgetsData || []);
      setCategories(categoriesData || []);
      
      if (profileData) {
        setUserProfile('data' in profileData && profileData.data ? profileData.data : (profileData as UserProfile));
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Gagal memuat dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDashboard();

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
    window.localStorage.removeItem('finansialin_auth_tokens');
    window.location.assign('/');
  };

  const fixedWalletNames = ['MBanking', 'Emoney', 'Cash'];
  const displaySources = useMemo(() => {
    const fixed = fixedWalletNames.map(name => {
      const existing = sources.find(s => s.name.toLowerCase() === name.toLowerCase());
      if (existing) return existing;
      return { idFundingSource: Math.floor(Math.random() * -10000), idUser: 0, name, initialBalance: 0, availableBalance: 0, isDummy: true } as FundingSourceRecord & { isDummy?: boolean };
    });
    const others = sources.filter(s => !fixedWalletNames.some(name => s.name.toLowerCase() === name.toLowerCase()));
    return [...fixed, ...others];
  }, [sources]);

  const totalAvailable = useMemo(
    () => sources.reduce((sum, source) => sum + Number(source.availableBalance || 0), 0),
    [sources],
  );

  const totalInitialBalance = useMemo(
    () => sources.reduce((sum, source) => sum + Number(source.initialBalance || 0), 0),
    [sources],
  );

  const chartMonths = useMemo(() => getChartMonths(), []);
  const incomePoints = useMemo(() => monthlyIncomeChart(transactions), [transactions]);
  const chartLine = useMemo(() => chartPath(incomePoints), [incomePoints]);

  const topTransactions = useMemo(
    () =>
      [...transactions]
        .sort((left, right) => Number(new Date(right.date ?? 0)) - Number(new Date(left.date ?? 0)))
        .slice(0, 4),
    [transactions],
  );

  const activityBreakdown = useMemo(() => {
    const expenseItems = transactions.filter((transaction) => transaction.type === 'expense');
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
      : [
          ['Rumah', 42],
          ['Makan', 25],
          ['Investasi', 16],
          ['Belanja', 10],
          ['Kecantikan', 7],
        ];
  }, [transactions]);

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

  const openEditWallet = (source: FundingSourceRecord) => {
    if ((source as any).isDummy) {
      setWalletMode('create');
      setEditingWalletId(null);
    } else {
      setWalletMode('edit');
      setEditingWalletId(source.idFundingSource);
    }
    setWalletInitialValues({
      name: source.name,
      initialBalance: String(source.initialBalance),
    });
    setWalletError('');
    setWalletModalOpen(true);
  };

  const openTopUpTransaction = (source?: FundingSourceRecord) => {
    setTransactionInitialValues({
      type: 'income',
      amount: '',
      description: source ? `Top up ${source.name}` : 'Top up dompet',
      source: source?.name ?? '',
      date: new Date().toISOString().slice(0, 10),
    });
    setTransactionError('');
    setTransactionModalOpen(true);
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
        await apiRequest(`/funding-sources/${editingWalletId}`, {
          method: 'PUT',
          body: JSON.stringify(body),
        });
        setNotice('Dompet berhasil diperbarui.');
      } else {
        await apiRequest('/funding-sources', {
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

  const handleRemoveWallet = async (source: FundingSourceRecord) => {
    if ((source as any).isDummy) {
      setNotice(`Dompet ${source.name} sudah kosong.`);
      return;
    }
    const confirmed = window.confirm(`Hapus dompet ${source.name}?`);
    if (!confirmed) {
      return;
    }

    try {
      await apiRequest(`/funding-sources/${source.idFundingSource}`, {
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
      await apiRequest('/transactions', {
        method: 'POST',
        body: JSON.stringify({
          type: values.type,
          amount: Number(values.amount || 0),
          description: values.description,
          source: values.source,
          date: values.date,
          idCategory: values.idCategory ? Number(values.idCategory) : undefined,
        }),
      });

      setTransactionModalOpen(false);
      setNotice('Transaksi berhasil disimpan.');
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
      await apiRequest('/budgets', {
        method: 'POST',
        body: JSON.stringify(values),
      });
      await loadDashboard();
      setBudgetModalOpen(false);
    } catch (err) {
      setBudgetError(err instanceof Error ? err.message : 'Gagal menyimpan budget.');
    } finally {
      setBudgetSaving(false);
    }
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
          ) : (
            <div>
              <h1>{activeTab}</h1>
            </div>
          )}

          <div className="topbar-tools" style={{ position: 'relative' }}>
            <label className="searchbar">
              <span className="search-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              </span>
              <input type="search" placeholder="Type to search" aria-label="Search" />
            </label>
            <button type="button" className="add-wallet-btn" onClick={openCreateWallet}>
              + Wallet
            </button>
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
                <article key={source.idFundingSource} className="account-card">
                  <div className="account-head">
                    <p className="account-title">{source.name}</p>
                    <div className="account-bank-logo">
                      {source.name.toLowerCase().includes('mbanking') || source.name.toLowerCase().includes('bri') ? (
                        <div style={{ background: '#0f52ba', color: 'white', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold' }}>BRI</div>
                      ) : source.name.toLowerCase().includes('emoney') || source.name.toLowerCase().includes('jago') ? (
                        <div style={{ color: '#f3a847', fontSize: '16px', fontWeight: 'bold' }}>Jago</div>
                      ) : (
                        <div style={{ background: '#f1c74a', padding: '4px 8px', borderRadius: '4px' }}>
                          <svg width="20" height="14" viewBox="0 0 24 16" fill="none" stroke="#000" strokeWidth="2"><rect x="1" y="1" width="22" height="14" rx="2"/><circle cx="12" cy="8" r="3"/><line x1="1" y1="8" x2="4" y2="8"/><line x1="20" y1="8" x2="23" y2="8"/></svg>
                        </div>
                      )}
                    </div>
                  </div>

                  <p className="account-amount-value">{formatCurrency(Number(source.availableBalance || 0))}</p>
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

        <section className="content-grid">
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
              <h2>My Goals</h2>
              <button type="button" className="add-goals-button" onClick={() => openTopUpTransaction()}>
                Add Goals
              </button>
            </div>

            <div className="goals-list">
              {goals.slice(0, 3).map((goal, index) => {
                const percentage = Math.min(100, Math.round(goal.percent));
                return (
                  <div key={goal.idCategory ?? index} className="goal-item">
                    <div className="goal-topline">
                      <div className="goal-icon">
                        {index % 2 === 0 ? (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21.5 4c0 0-2 .5-3.5 2L14.5 9.5 6.3 7.7 5 9l6 4-3.5 3.5L5 15.5 3 17l1.5 2 2-1.5L8 19l4.5-3.5 4 6 1.3-1.3z"></path></svg>
                        ) : (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="m16 10-4 4-4-4"/></svg>
                        )}
                      </div>
                      <div className="goal-info">
                        <div className="goal-title">
                          <span>{goal.name}</span>
                          <span>{percentage}%</span>
                        </div>
                        <div className="goal-amount">
                          {formatCurrency(goal.spent)} / {formatCurrency(goal.budgetAmount)}
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

              {!loading && goals.length === 0 ? <p className="empty-copy">Belum ada target budget yang dibuat.</p> : null}
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
              <h3 className="stat-value">{formatCurrency(totalAvailable)}</h3>
              <div className="stat-trend"><span className="trend-badge">+15% ↗</span> than last month</div>
            </div>
            
            <div className="stat-card yellow">
              <div className="stat-icon-wrap">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#171717" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              </div>
              <p className="stat-label">Total Income</p>
              <h3 className="stat-value">{formatCurrency(transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount || 0), 0))}</h3>
              <div className="stat-trend"><span className="trend-badge dark">+30% ↗</span> than last month</div>
            </div>

            <div className="stat-card dark">
              <div className="stat-icon-wrap">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f1c74a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              </div>
              <p className="stat-label">Total Expenses</p>
              <h3 className="stat-value">{formatCurrency(transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount || 0), 0))}</h3>
              <div className="stat-trend"><span className="trend-badge">-11% ↙</span> than last month</div>
            </div>

            <div className="stat-card yellow">
              <div className="stat-icon-wrap">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#171717" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              </div>
              <p className="stat-label">Total Savings</p>
              <h3 className="stat-value">{formatCurrency(totalAvailable)}</h3>
              <div className="stat-trend"><span className="trend-badge dark">+15% ↗</span> than last month</div>
            </div>
          </div>

          <section className="transactions-table-panel">
            <div className="table-toolbar">
              <div className="toolbar-left">
                <label className="table-search">
                  <span className="search-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg></span>
                  <input type="search" placeholder="Search for description" />
                </label>
              </div>
              <div className="toolbar-right">
                <button type="button" className="icon-button outline-btn"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg></button>
                <select className="date-select">
                  <option>January 2026</option>
                  <option>February 2026</option>
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
                  {transactions.map((row, index) => (
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
                          <button type="button" className="action-btn"><PencilIcon /></button>
                          <button type="button" className="action-btn"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {transactions.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', color: '#a0a0a0', padding: '32px' }}>
                        Belum ada transaksi.
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
          <section className="budgeting-view" style={{ padding: '20px 0' }}>
            <div className="view-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div>
                <h1 style={{ fontSize: '1.8rem', fontWeight: 700 }}>My Budgets</h1>
                <p style={{ color: '#666' }}>Manage your spending limits by category.</p>
              </div>
              <button className="add-goals-button" onClick={() => setBudgetModalOpen(true)}>
                + Create Budget
              </button>
            </div>

            <div className="budget-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
              {budgets.map((budget) => {
                const percent = Math.min(100, budget.percent || 0);
                const isOver = percent >= 100;
                return (
                  <article key={budget.idBudget} className="panel budget-card" style={{ padding: '24px', position: 'relative' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                      <h3 style={{ fontWeight: 600 }}>{budget.category?.name || 'General'}</h3>
                      <span style={{ fontSize: '0.8rem', color: '#888', textTransform: 'capitalize' }}>{budget.period}</span>
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

              {budgets.length === 0 && (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px', color: '#a0a0a0' }}>
                  <p>No budgets set yet. Start by creating one for your categories!</p>
                </div>
              )}
            </div>
          </section>
        )}

      {['Statistics', 'Settings'].includes(activeTab) && (
        <div style={{ display: 'grid', placeItems: 'center', height: '60vh', color: '#a0a0a0' }}>
          <h2>{activeTab} feature is coming soon!</h2>
        </div>
      )}
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
        sources={sources}
        initialValues={transactionInitialValues}
        loading={transactionSaving}
        error={transactionError}
        onClose={() => setTransactionModalOpen(false)}
        onSubmit={handleTransactionSubmit}
      />

      <BudgetModal
        open={budgetModalOpen}
        categories={categories.filter(c => c.type === 'expense')}
        loading={budgetSaving}
        error={budgetError}
        onClose={() => setBudgetModalOpen(false)}
        onSubmit={handleBudgetSubmit}
      />

      <Chatbot />
    </main>
  );
}
