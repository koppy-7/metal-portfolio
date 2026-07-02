'use client';

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  calculateEstimatedValue,
  calculateProfitLoss,
  calculatePureWeight,
  formatCurrency,
  formatNumber,
  initialMetalPrices,
  initialPortfolioHistory,
  type MetalItem,
  type MetalPrices,
  type MetalType,
  type PortfolioHistoryEntry,
  type PurityType,
} from '@/lib/metal';

// Runtime validators for data loaded from localStorage
function isValidMetalType(v: any): v is MetalType {
  return v === 'gold' || v === 'silver' || v === 'platinum';
}

function isValidPurityType(v: any): v is PurityType {
  return typeof v === 'string' && (
    ['K24','K18','K14','SV1000','SV925','SV950','Pt1000','Pt950','Pt900','custom'] as string[]
  ).includes(v);
}

function isValidItem(obj: any): obj is MetalItem {
  return (
    obj && typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    isValidMetalType(obj.metalType) &&
    isValidPurityType(obj.purityType) &&
    typeof obj.purity === 'number' &&
    typeof obj.weightGram === 'number' &&
    typeof obj.purchasePrice === 'number' &&
    typeof obj.createdAt === 'string' && typeof obj.updatedAt === 'string'
  );
}

function isValidPrices(obj: any): obj is MetalPrices {
  return (
    obj && typeof obj === 'object' &&
    typeof obj.gold === 'number' &&
    typeof obj.silver === 'number' &&
    typeof obj.platinum === 'number' &&
    typeof obj.updatedAt === 'string'
  );
}

const purityOptions: Array<{ value: PurityType; label: string; purity: number }> = [
  { value: 'K24', label: 'K24', purity: 1 },
  { value: 'K18', label: 'K18', purity: 0.75 },
  { value: 'K14', label: 'K14', purity: 0.585 },
  { value: 'SV1000', label: 'SV1000', purity: 1 },
  { value: 'SV925', label: 'SV925', purity: 0.925 },
  { value: 'SV950', label: 'SV950', purity: 0.95 },
  { value: 'Pt1000', label: 'Pt1000', purity: 1 },
  { value: 'Pt950', label: 'Pt950', purity: 0.95 },
  { value: 'Pt900', label: 'Pt900', purity: 0.9 },
  { value: 'custom', label: 'custom', purity: 0 },
];

const metalTypeLabels: Record<MetalType, string> = {
  gold: '金',
  silver: '銀',
  platinum: 'プラチナ',
};

type ItemFormState = {
  name: string;
  metalType: MetalType;
  purityType: PurityType;
  purity: number;
  weightGram: string;
  purchasePrice: string;
  memo: string;
};

const createEmptyForm = (): ItemFormState => ({
  name: '',
  metalType: 'gold',
  purityType: 'K24',
  purity: 1,
  weightGram: '',
  purchasePrice: '',
  memo: '',
});

export default function HomePage() {
  const [items, setItems] = useState<MetalItem[]>([]);
  const [prices, setPrices] = useState<MetalPrices>({ ...initialMetalPrices, updatedAt: '' });
  const [portfolioHistory, setPortfolioHistory] = useState<PortfolioHistoryEntry[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ItemFormState>(createEmptyForm);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [priceFetchError, setPriceFetchError] = useState<string | null>(null);
  const [isFetchingPrices, setIsFetchingPrices] = useState(false);
  const [historySaveMessage, setHistorySaveMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'portfolio' | 'history' | 'items' | 'settings'>('history');
  const [timeRange, setTimeRange] = useState<'month' | 'year'>('month');
  const [isHydrated, setIsHydrated] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [showResetHistoryConfirm, setShowResetHistoryConfirm] = useState(false);

  const STORAGE_KEYS = {
    items: 'metal-portfolio-items',
    prices: 'metal-portfolio-prices',
    history: 'metal-portfolio-history',
  } as const;

  const LEGACY_STORAGE_KEYS = {
    items: 'metal-items',
    prices: 'metal-prices',
    priceHistory: 'price-history',
  } as const;

  const safeSave = (key: string, value: any) => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn('localStorage save failed', key, e);
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const migrateStorage = () => {
      const currentItems = window.localStorage.getItem(STORAGE_KEYS.items);
      const legacyItems = window.localStorage.getItem(LEGACY_STORAGE_KEYS.items);
      if ((!currentItems || currentItems === '[]') && legacyItems) {
        window.localStorage.setItem(STORAGE_KEYS.items, legacyItems);
      }

      const currentPrices = window.localStorage.getItem(STORAGE_KEYS.prices);
      const legacyPrices = window.localStorage.getItem(LEGACY_STORAGE_KEYS.prices);
      if (!currentPrices && legacyPrices) {
        window.localStorage.setItem(STORAGE_KEYS.prices, legacyPrices);
      }

      const migrationResult = {
        items: window.localStorage.getItem(STORAGE_KEYS.items),
        prices: window.localStorage.getItem(STORAGE_KEYS.prices),
        history: window.localStorage.getItem(STORAGE_KEYS.history),
        legacyItems: window.localStorage.getItem(LEGACY_STORAGE_KEYS.items),
        legacyPrices: window.localStorage.getItem(LEGACY_STORAGE_KEYS.prices),
        legacyPriceHistory: window.localStorage.getItem(LEGACY_STORAGE_KEYS.priceHistory),
      };
      console.log('localStorage migration result', migrationResult);

      window.localStorage.removeItem(LEGACY_STORAGE_KEYS.items);
      window.localStorage.removeItem(LEGACY_STORAGE_KEYS.prices);
      window.localStorage.removeItem(LEGACY_STORAGE_KEYS.priceHistory);
    };

    try {
      migrateStorage();

      const savedItems = window.localStorage.getItem(STORAGE_KEYS.items);
      const savedPrices = window.localStorage.getItem(STORAGE_KEYS.prices);
      const savedHistory = window.localStorage.getItem(STORAGE_KEYS.history);

      if (savedItems) {
        try {
          const parsed = JSON.parse(savedItems);
          if (Array.isArray(parsed) && parsed.every(isValidItem)) {
            setItems(parsed);
          } else {
            setItems([]);
          }
        } catch {
          setItems([]);
        }
      } else {
        setItems([]);
      }

      if (savedPrices) {
        try {
          const parsed = JSON.parse(savedPrices);
          if (isValidPrices(parsed)) setPrices(parsed);
          else setPrices(initialMetalPrices);
        } catch {
          setPrices(initialMetalPrices);
        }
      } else {
        setPrices(initialMetalPrices);
      }

      if (savedHistory) {
        try {
          const parsed = JSON.parse(savedHistory) as unknown;
          if (Array.isArray(parsed)) {
            const valid = parsed.filter((entry): entry is PortfolioHistoryEntry =>
              typeof entry === 'object' && entry !== null &&
              typeof (entry as any).id === 'string' &&
              typeof (entry as any).recordedAt === 'string' &&
              typeof (entry as any).goldValue === 'number' &&
              typeof (entry as any).silverValue === 'number' &&
              typeof (entry as any).platinumValue === 'number' &&
              typeof (entry as any).totalValue === 'number' &&
              typeof (entry as any).totalPurchasePrice === 'number' &&
              typeof (entry as any).totalProfitLoss === 'number'
            );
            setPortfolioHistory(valid);
          } else {
            setPortfolioHistory([]);
          }
        } catch {
          setPortfolioHistory([]);
        }
      } else {
        setPortfolioHistory([]);
      }
    } catch (error) {
      console.error('Failed to load from localStorage', error);
      setItems([]);
      setPrices(initialMetalPrices);
      setPortfolioHistory([]);
    } finally {
      setIsHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!isHydrated || typeof window === 'undefined') return;
    safeSave(STORAGE_KEYS.items, items);
  }, [items, isHydrated]);

  useEffect(() => {
    if (!isHydrated || typeof window === 'undefined') return;
    safeSave(STORAGE_KEYS.prices, prices);
  }, [prices, isHydrated]);

  useEffect(() => {
    if (!isHydrated || typeof window === 'undefined') return;
    safeSave(STORAGE_KEYS.history, portfolioHistory);
  }, [portfolioHistory, isHydrated]);

  useEffect(() => {
    if (!isHydrated || typeof window === 'undefined') return;

    if (navigator.onLine) {
      fetchPricesFromApi();
    } else {
      setPriceFetchError('オフラインです。前回保存された価格を使用しています。');
    }
  }, [isHydrated]);

  const totals = useMemo(() => {
    const totalEstimated = items.reduce((sum, item) => sum + calculateEstimatedValue(item.weightGram, item.purity, prices[item.metalType]), 0);
    const totalPurchase = items.reduce((sum, item) => sum + item.purchasePrice, 0);
    const totalProfit = totalEstimated - totalPurchase;
    const byMetal = items.reduce(
      (acc, item) => {
        acc[item.metalType] += calculateEstimatedValue(item.weightGram, item.purity, prices[item.metalType]);
        return acc;
      },
      { gold: 0, silver: 0, platinum: 0 }
    );
    return { totalEstimated, totalPurchase, totalProfit, byMetal };
  }, [items, prices]);

  const sortedHistory = useMemo(
    () => [...portfolioHistory].sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()),
    [portfolioHistory]
  );

  const groupedHistory = useMemo(() => {
    const groups = new Map<string, PortfolioHistoryEntry>();
    sortedHistory.forEach((entry) => {
      const date = new Date(entry.recordedAt);
      if (!isFinite(date.getTime())) return;
      const key = timeRange === 'year' ? date.getFullYear().toString() : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const existing = groups.get(key);
      if (!existing || new Date(existing.recordedAt).getTime() < date.getTime()) {
        groups.set(key, entry);
      }
    });
    return Array.from(groups.entries()).map(([label, entry]) => ({ label, entry }));
  }, [sortedHistory, timeRange]);

  const chartEntries = useMemo(() => sortedHistory.slice(-10), [sortedHistory]);

  type ChartData = {
    dateLabel: string;
    gold: number;
    silver: number;
    platinum: number;
    total: number;
    profitLoss: number;
    raw: PortfolioHistoryEntry;
  };

  const chartData: ChartData[] = useMemo(() => {
    const lastEntries = sortedHistory.slice(-10);
    return lastEntries.map((h) => {
      const d = new Date(h.recordedAt);
      const dateLabel = d.toLocaleString('ja-JP', {
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }).replace(/\u200E/g, '');
      return {
        dateLabel,
        gold: h.goldValue / 10000,
        silver: h.silverValue / 10000,
        platinum: h.platinumValue / 10000,
        total: h.totalValue / 10000,
        profitLoss: h.totalProfitLoss,
        raw: h,
      };
    });
  }, [sortedHistory]);

  const maxChartValue = useMemo(() => {
    if (chartData.length === 0) return 1;
    return Math.max(...chartData.map((d) => d.total));
  }, [chartData]);

  const fetchPricesFromApi = async () => {
    setPriceFetchError(null);
    setIsFetchingPrices(true);

    try {
      const response = await fetch('/api/metal-prices');
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      if (
        typeof data.gold !== 'number' ||
        typeof data.silver !== 'number' ||
        typeof data.platinum !== 'number' ||
        typeof data.updatedAt !== 'string'
      ) {
        throw new Error('Invalid API response');
      }

      const nextPrices: MetalPrices = {
        gold: data.gold,
        silver: data.silver,
        platinum: data.platinum,
        updatedAt: data.updatedAt,
        source: 'gold-api',
      };

      setPrices(nextPrices);
      if (typeof window !== 'undefined') {
        safeSave(STORAGE_KEYS.prices, nextPrices);
      }
    } catch (error) {
      setPriceFetchError('価格取得に失敗しました。手動入力価格を引き続き使用します。');
    } finally {
      setIsFetchingPrices(false);
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      if (isHydrated) {
        fetchPricesFromApi();
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setPriceFetchError('オフラインです。前回保存された価格を使用しています。');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isHydrated]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator) || process.env.NODE_ENV !== 'production') return;

    navigator.serviceWorker.register('/sw.js')
      .then(() => {
        console.log('Service Worker registered');
      })
      .catch((error) => {
        console.error('Service Worker registration failed', error);
      });
  }, []);

  const openNew = () => {
    setEditingId(null);
    setForm(createEmptyForm());
    setShowForm(true);
  };

  const formatTimelineLabel = (entry: PortfolioHistoryEntry) => {
    const date = new Date(entry.recordedAt);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  const portfolioPieData = useMemo(() => {
    const total = totals.totalEstimated;
    const rawData = ([
      { type: 'gold' as const, name: '金', value: totals.byMetal.gold, color: '#d97706' },
      { type: 'silver' as const, name: '銀', value: totals.byMetal.silver, color: '#94a3b8' },
      { type: 'platinum' as const, name: 'プラチナ', value: totals.byMetal.platinum, color: '#818cf8' },
    ]);

    return rawData.map((item) => ({
      ...item,
      percent: total > 0 ? (item.value / total) * 100 : 0,
    })).filter((item) => item.value > 0);
  }, [totals.byMetal, totals.totalEstimated]);

  const generateId = () => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  };

  const hasHistoryChanged = (entry: PortfolioHistoryEntry | null) => {
    if (!entry) return true;
    return (
      entry.goldValue !== totals.byMetal.gold ||
      entry.silverValue !== totals.byMetal.silver ||
      entry.platinumValue !== totals.byMetal.platinum ||
      entry.totalValue !== totals.totalEstimated ||
      entry.totalPurchasePrice !== totals.totalPurchase ||
      entry.totalProfitLoss !== totals.totalProfit
    );
  };

  const handleSaveCurrentHistory = () => {
    const latestEntry = sortedHistory.at(-1) ?? null;

    if (!hasHistoryChanged(latestEntry)) {
      setHistorySaveMessage('前回記録時から評価額に変化がないため、履歴は追加しませんでした。');
      return;
    }

    const next: PortfolioHistoryEntry = {
      id: generateId(),
      recordedAt: new Date().toISOString(),
      goldValue: totals.byMetal.gold,
      silverValue: totals.byMetal.silver,
      platinumValue: totals.byMetal.platinum,
      totalValue: totals.totalEstimated,
      totalPurchasePrice: totals.totalPurchase,
      totalProfitLoss: totals.totalProfit,
    };

    setPortfolioHistory((prev) => {
      const nextArr = [next, ...prev];
      safeSave(STORAGE_KEYS.history, nextArr);
      return nextArr;
    });
    setHistorySaveMessage('最新の評価額を履歴に保存しました。');
  };

  const handleResetHistory = () => {
    setPortfolioHistory([]);
    safeSave(STORAGE_KEYS.history, []);
    setShowResetHistoryConfirm(false);
    setHistorySaveMessage('評価額履歴をリセットしました。');
  };

  const openEdit = (item: MetalItem) => {
    setEditingId(item.id);
    setForm({
      name: item.name,
      metalType: item.metalType,
      purityType: item.purityType,
      purity: item.purity,
      weightGram: String(item.weightGram),
      purchasePrice: String(item.purchasePrice),
      memo: item.memo || '',
    });
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: MetalItem = {
      id: editingId || generateId(),
      name: form.name,
      metalType: form.metalType,
      purityType: form.purityType,
      purity: form.purityType === 'custom' ? form.purity : (purityOptions.find((option) => option.value === form.purityType)?.purity ?? 0),
      weightGram: Number(form.weightGram),
      purchasePrice: Number(form.purchasePrice),
      memo: form.memo,
      createdAt: editingId ? items.find((item) => item.id === editingId)?.createdAt ?? new Date().toISOString() : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (editingId) {
      setItems((prev) => {
        const next = prev.map((item) => (item.id === editingId ? payload : item));
        try { safeSave(STORAGE_KEYS.items, next); } catch {}
        return next;
      });
    } else {
      setItems((prev) => {
        const next = [payload, ...prev];
        try { safeSave(STORAGE_KEYS.items, next); } catch {}
        return next;
      });
    }

    setShowForm(false);
    setEditingId(null);
    setForm(createEmptyForm());
  };

  const handleDelete = () => {
    if (!deleteTargetId) return;
    setItems((prev) => {
      const next = prev.filter((item) => item.id !== deleteTargetId);
      try { safeSave(STORAGE_KEYS.items, next); } catch {}
      return next;
    });
    setDeleteTargetId(null);
  };

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="rounded-2xl bg-gradient-to-r from-amber-600 to-orange-500 p-6 text-white shadow-lg">
          <p className="text-sm uppercase tracking-[0.3em] text-amber-100">Metal Portfolio</p>
          <h1 className="mt-2 text-3xl font-semibold">現物貴金属ポートフォリオ管理</h1>
          <p className="mt-3 max-w-2xl text-sm text-amber-50">
            所持している金・銀・プラチナの概算評価額を管理できる、シンプルな資産管理アプリです。
          </p>
        </header>

        <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          {isOnline ? null : (
            <div className="mb-4 rounded-2xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
              オフラインです。前回保存された価格と保有データを表示しています。
            </div>
          )}
          <div className="mb-4">
            <div>
              <h2 className="text-lg font-semibold">メニュー</h2>
              <p className="text-sm text-slate-500">タブでスマホ向けダッシュボードを切り替えます。</p>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-4">
            {[
              { id: 'history', label: '推移' },
              { id: 'portfolio', label: '保有資産' },
              { id: 'items', label: 'アイテム' },
              { id: 'settings', label: '時価' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`rounded-2xl px-3 py-3 text-sm font-semibold transition ${activeTab === tab.id ? 'bg-amber-600 text-white shadow' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {activeTab === 'history' && (
          <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold">評価額推移</h2>
                <p className="text-sm text-slate-500">記録した履歴をスマホ向けカードで確認します。</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button className="rounded-2xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white" onClick={handleSaveCurrentHistory}>今の評価額を保存</button>
                <button className="rounded-2xl border border-rose-300 bg-white px-4 py-2 text-sm font-semibold text-rose-700" onClick={() => setShowResetHistoryConfirm(true)}>履歴をリセット</button>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-3xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">最新評価額</p>
                <p className="mt-3 text-3xl font-semibold">{formatCurrency(sortedHistory.at(-1)?.totalValue ?? totals.totalEstimated)}</p>
              </div>
              <div className="rounded-3xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">最新損益</p>
                <p className={`mt-3 text-3xl font-semibold ${((sortedHistory.at(-1)?.totalProfitLoss ?? totals.totalProfit) ?? 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{formatCurrency(sortedHistory.at(-1)?.totalProfitLoss ?? totals.totalProfit)}</p>
              </div>
              <div className="rounded-3xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">履歴件数</p>
                <p className="mt-3 text-3xl font-semibold">{portfolioHistory.length}</p>
              </div>
            </div>
            {historySaveMessage ? (
              <div className="mt-4 rounded-3xl bg-slate-100 p-4 text-sm text-slate-700">
                {historySaveMessage}
              </div>
            ) : null}
            <div className="mt-4 rounded-3xl bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-slate-700">表示切替</p>
                  <p className="text-sm text-slate-500">{timeRange === 'month' ? '月ごと表示' : '年ごと表示'}</p>
                </div>
                <div className="flex gap-2">
                  <button className={`rounded-2xl px-3 py-2 text-sm font-semibold ${timeRange === 'month' ? 'bg-amber-600 text-white' : 'bg-white text-slate-700 ring-1 ring-slate-200'}`} onClick={() => setTimeRange('month')}>月</button>
                  <button className={`rounded-2xl px-3 py-2 text-sm font-semibold ${timeRange === 'year' ? 'bg-amber-600 text-white' : 'bg-white text-slate-700 ring-1 ring-slate-200'}`} onClick={() => setTimeRange('year')}>年</button>
                </div>
              </div>
            </div>
            <div className="mt-4 rounded-3xl bg-white p-4 shadow-inner ring-1 ring-slate-200">
              {chartData.length === 0 ? (
                <p className="text-sm text-slate-500">まだ評価額履歴がありません。「今の評価額を保存」を押すと、推移グラフを作成できます。</p>
              ) : (
                <div>
                  <div className="grid gap-3 sm:grid-cols-3 mb-3">
                    {(['gold', 'silver', 'platinum'] as MetalType[]).map((type) => (
                      <div key={type} className="rounded-3xl bg-slate-50 p-3 text-sm">
                        <p className="font-semibold text-slate-800">{metalTypeLabels[type]}</p>
                        <p className="mt-2 text-slate-500">最新 {formatCurrency(sortedHistory.at(-1)?.[`${type}Value` as keyof PortfolioHistoryEntry] as number)}</p>
                      </div>
                    ))}
                  </div>
                  <div style={{ width: '100%', height: 260 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="dateLabel" tick={{ fontSize: 12 }} />
                        <YAxis
                          tickFormatter={(v) => `${v}万`}
                          ticks={(() => {
                            const max = Math.max(5, Math.ceil(maxChartValue / 5) * 5);
                            const step = 5;
                            const arr: number[] = [];
                            for (let i = 0; i <= max; i += step) arr.push(i);
                            return arr;
                          })()}
                        />
                        <Tooltip
                          formatter={(value: any, name: any) => {
                            if (typeof value === 'number') return [formatCurrency(Math.round(value * 10000)), name];
                            return [value, name];
                          }}
                          labelFormatter={(label) => `日付: ${label}`}
                        />
                        <Legend />
                        <Bar dataKey="gold" stackId="a" name="金" fill="#d97706" />
                        <Bar dataKey="silver" stackId="a" name="銀" fill="#94a3b8" />
                        <Bar dataKey="platinum" stackId="a" name="プラチナ" fill="#c7d2fe" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
            <div className="mt-4 grid gap-3">
              {sortedHistory.slice(-5).reverse().map((entry) => (
                <div key={entry.id} className="rounded-3xl bg-slate-50 p-4">
                  <div className="flex items-center justify-between text-sm text-slate-500">
                    <span>{new Date(entry.recordedAt).toLocaleString('ja-JP')}</span>
                    <span>{formatCurrency(entry.totalValue)}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm text-slate-700">
                    <span>損益 {formatCurrency(entry.totalProfitLoss)}</span>
                    <span>購入 {formatCurrency(entry.totalPurchasePrice)}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {activeTab === 'portfolio' && (
          <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <div className="mb-4">
              <h2 className="text-lg font-semibold">保有資産</h2>
              <p className="text-sm text-slate-500">現在の保有評価と金属別内訳を確認します。</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-3xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">総評価額</p>
                <p className="mt-3 text-3xl font-semibold">{formatCurrency(totals.totalEstimated)}</p>
              </div>
              <div className="rounded-3xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">総購入価格</p>
                <p className="mt-3 text-3xl font-semibold">{formatCurrency(totals.totalPurchase)}</p>
              </div>
              <div className="rounded-3xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">総評価損益</p>
                <p className={`mt-3 text-3xl font-semibold ${totals.totalProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{formatCurrency(totals.totalProfit)}</p>
              </div>
              <div className="rounded-3xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">所持アイテム数</p>
                <p className="mt-3 text-3xl font-semibold">{items.length}</p>
              </div>
            </div>
            <div className="mt-4 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <div className="mb-4">
                <h3 className="text-base font-bold text-slate-900">保有資産の内訳</h3>
                <p className="text-sm text-slate-500">金属別の評価額割合を表示しています。</p>
              </div>
              {totals.totalEstimated > 0 ? (
                <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={portfolioPieData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={90}
                          paddingAngle={3}
                          label={({ percent }) => `${percent != null ? `${percent.toFixed(1)}%` : ''}`}
                        >
                          {portfolioPieData.map((entry) => (
                            <Cell key={entry.name} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => (typeof value === 'number' ? formatCurrency(value) : String(value))} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="grid gap-3">
                    {([
                      { name: '金', value: totals.byMetal.gold, color: '#d97706' },
                      { name: '銀', value: totals.byMetal.silver, color: '#94a3b8' },
                      { name: 'プラチナ', value: totals.byMetal.platinum, color: '#818cf8' },
                    ]).map((item) => {
                      const percent = totals.totalEstimated > 0 ? (item.value / totals.totalEstimated) * 100 : 0;
                      return (
                        <div key={item.name} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                          <div className="flex items-center gap-3">
                            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                            <span className="font-medium text-slate-800">{item.name}</span>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-slate-900">{formatCurrency(item.value)}</p>
                            <p className="text-xs text-slate-500">{percent.toFixed(1)}%</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="text-base font-bold text-slate-900">保有資産の内訳</h3>
                  <p className="mt-2 text-sm text-slate-500">保有資産がありません。アイテムを追加すると内訳が表示されます。</p>
                </div>
              )}
            </div>
          </section>
        )}

        {activeTab === 'items' && (
          <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">所有アイテム</h2>
                <p className="text-sm text-slate-500">登録済みの貴金属を一覧で確認・編集します。</p>
              </div>
              <button className="rounded-2xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white" onClick={openNew}>アイテム追加</button>
            </div>
            <div className="space-y-3">
              {items.length > 0 ? items.map((item) => {
                const pureWeight = calculatePureWeight(item.weightGram, item.purity);
                const estimated = calculateEstimatedValue(item.weightGram, item.purity, prices[item.metalType]);
                const profit = calculateProfitLoss(estimated, item.purchasePrice);
                return (
                  <div key={item.id} className="rounded-3xl border border-slate-200 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-base font-semibold text-slate-800">{item.name}</p>
                        <p className="mt-1 text-sm text-slate-500">{metalTypeLabels[item.metalType]} / {item.purityType} / {formatNumber(item.weightGram)}g</p>
                        <p className="mt-2 text-sm text-slate-500">メモ: {item.memo || 'なし'}</p>
                      </div>
                      <div className="space-y-2 text-right">
                        <p className="text-sm text-slate-500">評価額 {formatCurrency(estimated)}</p>
                        <p className={`text-sm font-semibold ${profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>損益 {formatCurrency(profit)}</p>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button className="rounded-2xl bg-slate-100 px-3 py-2 text-sm" onClick={() => openEdit(item)}>編集</button>
                      <button className="rounded-2xl bg-rose-100 px-3 py-2 text-sm text-rose-700" onClick={() => setDeleteTargetId(item.id)}>削除</button>
                    </div>
                  </div>
                );
              }) : (
                <p className="text-sm text-slate-500">保有商品がありません。追加から登録してください。</p>
              )}
            </div>
          </section>
        )}

        {activeTab === 'settings' && (
          <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold">時価</h2>
                <p className="text-sm text-slate-500">価格・履歴管理の基本設定です。</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  className="rounded-2xl bg-slate-800 px-4 py-2 text-sm font-semibold text-white"
                  onClick={() => {
                    const next = { ...prices, updatedAt: new Date().toISOString() };
                    setPrices(next);
                    try { safeSave(STORAGE_KEYS.prices, next); } catch {}
                  }}
                >
                  価格を保存
                </button>
                <button
                  className="rounded-2xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white"
                  onClick={fetchPricesFromApi}
                  disabled={isFetchingPrices}
                >
                  {isFetchingPrices ? '価格を取得中...' : 'APIから価格取得'}
                </button>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {(['gold', 'silver', 'platinum'] as MetalType[]).map((type) => (
                <label key={type} className="rounded-3xl bg-slate-50 p-4">
                  <p className="mb-2 text-sm font-medium text-slate-700">{metalTypeLabels[type]}価格</p>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={prices[type]}
                    onChange={(e) => setPrices((prev) => ({ ...prev, [type]: Number(e.target.value) }))}
                    className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2"
                  />
                </label>
              ))}
            </div>
            {priceFetchError ? (
              <div className="rounded-3xl bg-rose-50 p-4 text-sm text-rose-700">
                {priceFetchError}
              </div>
            ) : null}
            <div className="mt-4 rounded-3xl bg-slate-50 p-4 text-sm text-slate-600">
              APIで取得する価格は国際スポット価格をもとにした参考価格です。国内の店頭買取価格、手数料、査定結果とは異なる場合があります。
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-3xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">データソース</p>
                <p className="mt-2 text-sm font-semibold text-slate-800">{prices.source ?? '手動入力'}</p>
              </div>
              <div className="rounded-3xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">最終更新</p>
                <p className="mt-2 text-sm font-semibold text-slate-800">{prices.updatedAt ? new Date(prices.updatedAt).toLocaleString('ja-JP') : '未設定'}</p>
              </div>
            </div>
          </section>
        )}

      </div>

      {showForm && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold">{editingId ? 'アイテム編集' : 'アイテム追加'}</h3>
              <button onClick={() => setShowForm(false)} className="text-sm text-slate-500">閉じる</button>
            </div>
            <form className="mt-4 grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
              <label className="md:col-span-2">
                <span className="mb-1 block text-sm font-medium">アイテム名</span>
                <input required value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2" />
              </label>
              <label>
                <span className="mb-1 block text-sm font-medium">金属種類</span>
                <select value={form.metalType} onChange={(e) => setForm((prev) => ({ ...prev, metalType: e.target.value as MetalType, purityType: 'K24' } ))} className="w-full rounded-lg border border-slate-300 px-3 py-2">
                  <option value="gold">金</option>
                  <option value="silver">銀</option>
                  <option value="platinum">プラチナ</option>
                </select>
              </label>
              <label>
                <span className="mb-1 block text-sm font-medium">品位</span>
                <select value={form.purityType} onChange={(e) => {
                  const next = e.target.value as PurityType;
                  const option = purityOptions.find((item) => item.value === next);
                  setForm((prev) => ({ ...prev, purityType: next, purity: option?.purity ?? 0 }));
                }} className="w-full rounded-lg border border-slate-300 px-3 py-2">
                  {purityOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
              <label>
                <span className="mb-1 block text-sm font-medium">純度</span>
                <input type="number" min="0" max="1" step="0.001" value={form.purity} onChange={(e) => setForm((prev) => ({ ...prev, purity: Number(e.target.value) }))} className="w-full rounded-lg border border-slate-300 px-3 py-2" disabled={form.purityType !== 'custom'} />
              </label>
              <label>
                <span className="mb-1 block text-sm font-medium">重量g</span>
                <input type="number" min="0" step="0.01" required value={form.weightGram} onChange={(e) => setForm((prev) => ({ ...prev, weightGram: e.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2" />
              </label>
              <label>
                <span className="mb-1 block text-sm font-medium">購入価格</span>
                <input type="number" min="0" step="0.01" required value={form.purchasePrice} onChange={(e) => setForm((prev) => ({ ...prev, purchasePrice: e.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2" />
              </label>
              <label className="md:col-span-2">
                <span className="mb-1 block text-sm font-medium">メモ</span>
                <textarea value={form.memo} onChange={(e) => setForm((prev) => ({ ...prev, memo: e.target.value }))} className="min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2" />
              </label>
              <div className="md:col-span-2 flex justify-end gap-3">
                <button type="button" className="rounded-lg border border-slate-300 px-4 py-2 text-sm" onClick={() => setShowForm(false)}>キャンセル</button>
                <button type="submit" className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white">保存</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTargetId && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold">削除確認</h3>
            <p className="mt-2 text-sm text-slate-600">このアイテムを削除しますか？</p>
            <div className="mt-6 flex justify-end gap-3">
              <button className="rounded-lg border border-slate-300 px-4 py-2 text-sm" onClick={() => setDeleteTargetId(null)}>キャンセル</button>
              <button className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white" onClick={handleDelete}>削除</button>
            </div>
          </div>
        </div>
      )}

      {showResetHistoryConfirm && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold">履歴のリセット</h3>
            <p className="mt-2 text-sm text-slate-600">本当に評価額履歴をリセットしますか？この操作は取り消せません。</p>
            <div className="mt-6 flex justify-end gap-3">
              <button className="rounded-lg border border-slate-300 px-4 py-2 text-sm" onClick={() => setShowResetHistoryConfirm(false)}>キャンセル</button>
              <button className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white" onClick={handleResetHistory}>リセットする</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
