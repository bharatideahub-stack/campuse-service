'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { adminAPI } from '@/lib/api';
import { connectSocket } from '@/lib/socket';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import { formatCurrency, timeAgo } from '@/lib/utils';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import {
  Activity, Server, Users, DollarSign, Package, Wifi, WifiOff,
  Cpu, HardDrive, Clock, LogOut, ShieldCheck, RefreshCw,
  TrendingUp, Ban, UserX, UserCheck, Search, ChevronLeft, ChevronRight,
  X, CheckCircle2, AlertTriangle, CreditCard, ShieldAlert,
} from 'lucide-react';
import Image from 'next/image';
import { generateAvatarUrl, formatDate } from '@/lib/utils';

// ─── Types ──────────────────────────────────────────────
interface ServerHealth {
  uptime: number;
  memory: {
    heapUsed: number;
    heapTotal: number;
    rss: number;
    systemTotal: number;
    systemFree: number;
    systemUsedPercent: number;
  };
  cpu: {
    loadAvg1: number;
    loadAvg5: number;
    cores: number;
  };
  process: {
    version: string;
    pid: number;
    env: string;
  };
  requests: number;
  connections: number;
}

interface DashboardStats {
  users: {
    total: number;
    online: number;
    offline: number;
    banned: number;
    recentSignups: number;
  };
  orders: {
    total: number;
    active: number;
    completed: number;
    cancelled: number;
    statusBreakdown: Record<string, number>;
  };
  revenue: { total: number };
  charts: {
    dailySignups: { _id: string; count: number }[];
    dailyRevenue: { _id: string; revenue: number; count: number }[];
  };
}

interface Transaction {
  _id: string;
  userId: { _id: string; name: string; email: string; avatar?: string } | null;
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  orderId?: { _id: string; category: string; description: string } | null;
  balanceAfter: number;
  status: 'pending' | 'completed' | 'failed';
  createdAt: string;
}

interface TransactionSummary {
  totalCredits: number;
  totalDebits: number;
  pendingCount: number;
  failedCount: number;
}

interface UserRecord {
  _id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
  rating: number;
  completedOrders: number;
  walletBalance: number;
  isBanned: boolean;
  createdAt: string;
}

interface LiveEvent {
  id: string;
  type: 'user_join' | 'user_leave' | 'system';
  message: string;
  timestamp: Date;
}

type TabType = 'monitor' | 'users' | 'payments' | 'orders';

// ─── Helpers ────────────────────────────────────────────
function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  return `${m}m ${s}s`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

// ─── Spark Bar (CSS) ────────────────────────────────────
function SparkBar({ values, colorClass }: { values: number[]; colorClass: string }) {
  const max = Math.max(...values, 1);
  return (
    <div className="flex items-end gap-[2px] h-14">
      {values.map((v, i) => (
        <div
          key={i}
          style={{ height: `${Math.max((v / max) * 100, 4)}%` }}
          className={`flex-1 rounded-t-sm transition-all duration-300 ${colorClass} ${i < values.length - 3 ? 'opacity-40' : 'opacity-90'}`}
        />
      ))}
    </div>
  );
}

// ─── Progress Bar ────────────────────────────────────────
function GaugeBar({ pct, colorClass }: { pct: number; colorClass: string }) {
  return (
    <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-700 ${colorClass}`}
        style={{ width: `${Math.min(pct, 100)}%` }}
      />
    </div>
  );
}

// ─── KPI Card ────────────────────────────────────────────
function KpiCard({
  label, value, sub, icon, borderClass, pulse,
}: {
  label: string; value: string | number; sub?: string;
  icon: React.ReactNode; borderClass: string; pulse?: boolean;
}) {
  return (
    <div className={`rounded-xl border bg-[#080c14] p-4 flex flex-col gap-3 transition-all hover:bg-[#0a1020] ${borderClass}`}>
      <div className="flex items-center justify-between">
        <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center">
          {icon}
        </div>
        {pulse && (
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-cyan-500" />
          </span>
        )}
      </div>
      <div>
        <p className="text-xl font-bold font-mono tracking-tight text-white/90">{value}</p>
        <p className="text-xs text-white/40 mt-0.5">{label}</p>
        {sub && <p className="text-[10px] text-white/25 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Panel ───────────────────────────────────────────────
function Panel({ title, badge, children, className }: {
  title: string; badge?: string; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={`rounded-xl border border-white/[0.07] bg-[#060910] p-4 ${className ?? ''}`}>
      <div className="flex items-center gap-2 mb-4">
        <div className="w-0.5 h-3.5 bg-cyan-500 rounded-full" />
        <span className="text-[11px] font-semibold text-white/50 uppercase tracking-widest">{title}</span>
        {badge && (
          <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-mono">
            {badge}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

// ─── Status colors ────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  CREATED: 'text-sky-400', BROADCASTED: 'text-blue-400', ACCEPTED: 'text-violet-400',
  BID_SELECTED: 'text-indigo-400', IN_PROGRESS: 'text-amber-400', DELIVERED: 'text-lime-400',
  COMPLETED: 'text-emerald-400', CANCELLED: 'text-red-400',
};
const STATUS_BAR_COLORS: Record<string, string> = {
  CREATED: 'bg-sky-500', BROADCASTED: 'bg-blue-500', ACCEPTED: 'bg-violet-500',
  BID_SELECTED: 'bg-indigo-500', IN_PROGRESS: 'bg-amber-500', DELIVERED: 'bg-lime-500',
  COMPLETED: 'bg-emerald-500', CANCELLED: 'bg-red-500',
};

// ─── Pagination ───────────────────────────────────────────
function Pagination({ page, pages, onPageChange }: { page: number; pages: number; onPageChange: (p: number) => void }) {
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-between px-3 py-2.5 border-t border-white/[0.06]">
      <span className="text-xs text-white/30 font-mono">Page {page} / {pages}</span>
      <div className="flex gap-1.5">
        <button disabled={page <= 1} onClick={() => onPageChange(page - 1)}
          className="p-1.5 rounded-lg border border-white/10 disabled:opacity-25 hover:bg-white/5 transition-colors">
          <ChevronLeft className="w-3.5 h-3.5 text-white/60" />
        </button>
        <button disabled={page >= pages} onClick={() => onPageChange(page + 1)}
          className="p-1.5 rounded-lg border border-white/10 disabled:opacity-25 hover:bg-white/5 transition-colors">
          <ChevronRight className="w-3.5 h-3.5 text-white/60" />
        </button>
      </div>
    </div>
  );
}

// ─── Confirm Dialog ──────────────────────────────────────
function ConfirmDialog({ open, title, message, confirmLabel, danger, onConfirm, onCancel }: {
  open: boolean; title: string; message: string; confirmLabel: string;
  danger?: boolean; onConfirm: () => void; onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative rounded-2xl border border-white/10 bg-[#0a0c14] p-6 max-w-sm w-full shadow-2xl">
        <button onClick={onCancel} className="absolute top-4 right-4 text-white/30 hover:text-white transition-colors">
          <X className="w-4 h-4" />
        </button>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${danger ? 'bg-red-500/10' : 'bg-emerald-500/10'}`}>
          {danger ? <ShieldAlert className="w-5 h-5 text-red-400" /> : <UserCheck className="w-5 h-5 text-emerald-400" />}
        </div>
        <h3 className="text-sm font-semibold text-white/90 mb-2">{title}</h3>
        <p className="text-xs text-white/40 mb-5">{message}</p>
        <div className="flex gap-2">
          <button onClick={onCancel}
            className="flex-1 px-3 py-2 rounded-lg border border-white/10 text-xs text-white/50 hover:text-white hover:bg-white/5 transition-all">
            Cancel
          </button>
          <button onClick={onConfirm}
            className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium text-white transition-all ${danger ? 'bg-red-500/80 hover:bg-red-500' : 'bg-emerald-500/80 hover:bg-emerald-500'}`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
//  ADMIN OPS CENTER DASHBOARD
// ═══════════════════════════════════════════════════════
export default function AdminOpsDashboard() {
  const { user, token, logout } = useAuthStore();
  const router = useRouter();

  const [tab, setTab] = useState<TabType>('monitor');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [health, setHealth] = useState<ServerHealth | null>(null);
  const [recentTxns, setRecentTxns] = useState<Transaction[]>([]);
  const [liveEvents, setLiveEvents] = useState<LiveEvent[]>([]);
  const [onlineCount, setOnlineCount] = useState(0);
  const [socketConnected, setSocketConnected] = useState(false);
  const [clock, setClock] = useState(new Date());
  const eventsRef = useRef<LiveEvent[]>([]);

  const [users, setUsers] = useState<UserRecord[]>([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersPage, setUsersPage] = useState(1);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [userFilter, setUserFilter] = useState<'all' | 'active' | 'banned'>('all');
  const [banDialog, setBanDialog] = useState<{ open: boolean; user: UserRecord | null; ban: boolean }>({ open: false, user: null, ban: true });
  const [banLoading, setBanLoading] = useState(false);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [txnSummary, setTxnSummary] = useState<TransactionSummary | null>(null);
  const [txnPage, setTxnPage] = useState(1);
  const [txnPages, setTxnPages] = useState(1);
  const [loadingTxn, setLoadingTxn] = useState(false);
  const [txnStatusFilter, setTxnStatusFilter] = useState('');
  const [txnTypeFilter, setTxnTypeFilter] = useState('');

  const [orders, setOrders] = useState<Array<Record<string, unknown>>>([]);
  const [ordersTotal, setOrdersTotal] = useState(0);
  const [ordersPage, setOrdersPage] = useState(1);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [orderStatusFilter, setOrderStatusFilter] = useState('');

  useEffect(() => {
    if (user && user.role !== 'admin') router.push('/feed');
  }, [user, router]);

  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const pushEvent = useCallback((evt: Omit<LiveEvent, 'id' | 'timestamp'>) => {
    const item: LiveEvent = { ...evt, id: Math.random().toString(36).slice(2), timestamp: new Date() };
    eventsRef.current = [item, ...eventsRef.current].slice(0, 40);
    setLiveEvents([...eventsRef.current]);
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const { data } = await adminAPI.getStats();
      setStats(data.stats);
      setOnlineCount(data.stats.users.online ?? 0);
    } catch { /* silent */ }
  }, []);

  const fetchHealth = useCallback(async () => {
    try {
      const { data } = await adminAPI.getHealth();
      setHealth(data.health);
    } catch { /* silent */ }
  }, []);

  const fetchRecentTxns = useCallback(async () => {
    try {
      const { data } = await adminAPI.getTransactions({ page: 1, limit: 8 });
      setRecentTxns(data.transactions || []);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    fetchStats();
    fetchHealth();
    fetchRecentTxns();
    const statsTimer = setInterval(fetchStats, 30_000);
    const healthTimer = setInterval(fetchHealth, 5_000);
    return () => { clearInterval(statsTimer); clearInterval(healthTimer); };
  }, [fetchStats, fetchHealth, fetchRecentTxns]);

  useEffect(() => {
    if (!token) return;
    const socket = connectSocket(token);
    socket.on('connect', () => {
      setSocketConnected(true);
      pushEvent({ type: 'system', message: 'Connected to live event stream' });
    });
    socket.on('disconnect', () => {
      setSocketConnected(false);
      pushEvent({ type: 'system', message: 'Stream disconnected — reconnecting…' });
    });
    socket.on('user_online', ({ userId }: { userId: string }) => {
      setOnlineCount(c => c + 1);
      pushEvent({ type: 'user_join', message: `User …${userId.slice(-6)} came online` });
    });
    socket.on('user_offline', ({ userId }: { userId: string }) => {
      setOnlineCount(c => Math.max(0, c - 1));
      pushEvent({ type: 'user_leave', message: `User …${userId.slice(-6)} went offline` });
    });
    return () => {
      socket.off('user_online');
      socket.off('user_offline');
      socket.off('connect');
      socket.off('disconnect');
    };
  }, [token, pushEvent]);

  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const apiModule = await import('@/lib/api');
      const { data } = await apiModule.usersAPI.getAllUsers({
        page: usersPage, limit: 20,
        ...(userSearch ? { search: userSearch } : {}),
      });
      let filtered: UserRecord[] = data.users || [];
      if (userFilter === 'banned') filtered = filtered.filter((u) => u.isBanned);
      else if (userFilter === 'active') filtered = filtered.filter((u) => !u.isBanned);
      setUsers(filtered);
      setUsersTotal(data.total || 0);
    } catch { toast.error('Failed to load users'); }
    finally { setLoadingUsers(false); }
  }, [usersPage, userSearch, userFilter]);

  useEffect(() => { if (tab === 'users') fetchUsers(); }, [tab, fetchUsers]);

  const fetchTransactions = useCallback(async () => {
    setLoadingTxn(true);
    try {
      const params: Record<string, string | number> = { page: txnPage, limit: 20 };
      if (txnStatusFilter) params.status = txnStatusFilter;
      if (txnTypeFilter) params.type = txnTypeFilter;
      const { data } = await adminAPI.getTransactions(params);
      setTransactions(data.transactions || []);
      setTxnSummary(data.summary || null);
      setTxnPages(data.pagination?.pages || 1);
    } catch { toast.error('Failed to load transactions'); }
    finally { setLoadingTxn(false); }
  }, [txnPage, txnStatusFilter, txnTypeFilter]);

  useEffect(() => { if (tab === 'payments') fetchTransactions(); }, [tab, fetchTransactions]);

  const fetchOrders = useCallback(async () => {
    setLoadingOrders(true);
    try {
      const apiModule = await import('@/lib/api');
      const params: Record<string, string | number> = { page: ordersPage, limit: 20 };
      if (orderStatusFilter) params.status = orderStatusFilter;
      const { data } = await apiModule.ordersAPI.getAll(params);
      setOrders(data.orders || []);
      setOrdersTotal(data.pagination?.total || 0);
    } catch { toast.error('Failed to load orders'); }
    finally { setLoadingOrders(false); }
  }, [ordersPage, orderStatusFilter]);

  useEffect(() => { if (tab === 'orders') fetchOrders(); }, [tab, fetchOrders]);

  const handleBanConfirm = async () => {
    if (!banDialog.user) return;
    setBanLoading(true);
    try {
      await adminAPI.toggleBanUser(banDialog.user._id, banDialog.ban);
      toast.success(banDialog.ban ? `${banDialog.user.name} banned` : `${banDialog.user.name} unbanned`);
      setBanDialog({ open: false, user: null, ban: true });
      fetchUsers();
      fetchStats();
    } catch { toast.error('Failed to update ban status'); }
    finally { setBanLoading(false); }
  };

  const revenueValues = (stats?.charts.dailyRevenue || []).slice(-14).map(d => d.revenue);
  const signupValues = (stats?.charts.dailySignups || []).slice(-14).map(d => d.count);
  const statusBreakdown = stats?.orders.statusBreakdown || {};
  const memPct = health?.memory.systemUsedPercent ?? 0;
  const heapPct = health ? Math.round((health.memory.heapUsed / health.memory.heapTotal) * 100) : 0;
  const cpuLoad = health?.cpu.loadAvg1 ?? 0;
  const cpuPct = health ? Math.min(Math.round((cpuLoad / health.cpu.cores) * 100), 100) : 0;

  const EVENT_ICON: Record<LiveEvent['type'], string> = { user_join: 'UP', user_leave: 'DN', system: '--' };
  const EVENT_COLOR: Record<LiveEvent['type'], string> = {
    user_join: 'text-emerald-400', user_leave: 'text-red-400', system: 'text-cyan-400',
  };

  const TABS: { key: TabType; label: string }[] = [
    { key: 'monitor', label: 'Monitor' },
    { key: 'users', label: 'Users' },
    { key: 'payments', label: 'Payments' },
    { key: 'orders', label: 'Orders' },
  ];

  return (
    <div className="min-h-screen text-white" style={{ background: 'radial-gradient(ellipse at 15% 0%, #001222 0%, #020406 65%)' }}>
      <header className="sticky top-0 z-40 border-b border-cyan-500/10 backdrop-blur-xl bg-black/40">
        <div className="max-w-[1600px] mx-auto px-5 py-2.5 flex items-center gap-3">
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <div className="leading-none">
              <span className="text-[11px] font-bold tracking-[0.2em] text-white/80 uppercase block">Admin</span>
              <span className="text-[9px] text-cyan-400/60 tracking-[0.25em] uppercase">Ops Center</span>
            </div>
          </div>
          <div className="h-5 w-px bg-white/10 mx-1" />
          <div className="flex gap-0.5">
            {TABS.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`px-3.5 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                  tab === t.key
                    ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/25'
                    : 'text-white/40 hover:text-white/70 hover:bg-white/5'
                }`}>
                {t.label}
              </button>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-2.5">
            <span className="font-mono text-[11px] text-white/30 tabular-nums hidden md:block">
              {clock.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
            </span>
            <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-medium border ${
              socketConnected
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                : 'bg-red-500/10 border-red-500/20 text-red-400'
            }`}>
              {socketConnected
                ? <><span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  </span>LIVE</>
                : <><WifiOff className="w-3 h-3" />OFFLINE</>}
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-mono font-medium bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Users className="w-3 h-3" />{onlineCount} online
            </div>
            <span className="text-[11px] text-white/30 hidden lg:block">{user?.name}</span>
            <button onClick={() => { logout(); router.push('/login'); }}
              className="p-1.5 rounded-lg border border-white/10 text-white/30 hover:text-red-400 hover:border-red-500/30 transition-all" title="Logout">
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-[1600px] mx-auto px-5 py-5">

        {tab === 'monitor' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <KpiCard label="Total Users" value={stats?.users.total ?? '--'} sub={`+${stats?.users.recentSignups ?? 0} this week`} icon={<Users className="w-4 h-4 text-cyan-400" />} borderClass="border-cyan-500/15" />
              <KpiCard label="Online Now" value={onlineCount} sub={`${stats?.users.banned ?? 0} banned`} icon={<Wifi className="w-4 h-4 text-emerald-400" />} borderClass="border-emerald-500/15" pulse />
              <KpiCard label="Platform Revenue" value={formatCurrency(stats?.revenue.total ?? 0)} icon={<DollarSign className="w-4 h-4 text-amber-400" />} borderClass="border-amber-500/15" />
              <KpiCard label="Active Orders" value={stats?.orders.active ?? '--'} sub={`${stats?.orders.completed ?? 0} completed`} icon={<Package className="w-4 h-4 text-violet-400" />} borderClass="border-violet-500/15" />
              <KpiCard label="Server Uptime" value={health ? formatUptime(health.uptime) : '--'} sub={health ? `Node ${health.process.version}` : undefined} icon={<Server className="w-4 h-4 text-rose-400" />} borderClass="border-rose-500/15" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Panel title="Activity Charts" badge="14-day">
                <div className="space-y-4">
                  <div>
                    <p className="text-[10px] text-white/30 mb-2 uppercase tracking-widest">Revenue</p>
                    {revenueValues.length > 0
                      ? <SparkBar values={revenueValues} colorClass="bg-amber-500" />
                      : <div className="h-14 flex items-center justify-center text-xs text-white/15">No revenue data yet</div>}
                  </div>
                  <div className="pt-3 border-t border-white/[0.05]">
                    <p className="text-[10px] text-white/30 mb-2 uppercase tracking-widest">User Signups</p>
                    {signupValues.length > 0
                      ? <SparkBar values={signupValues} colorClass="bg-cyan-500" />
                      : <div className="h-14 flex items-center justify-center text-xs text-white/15">No signup data yet</div>}
                  </div>
                  <div className="pt-3 border-t border-white/[0.05] grid grid-cols-3 gap-3 text-center">
                    <div><p className="text-base font-bold font-mono text-amber-400">{stats?.orders.total ?? '--'}</p><p className="text-[10px] text-white/30">Total Orders</p></div>
                    <div><p className="text-base font-bold font-mono text-emerald-400">{stats?.orders.completed ?? '--'}</p><p className="text-[10px] text-white/30">Completed</p></div>
                    <div><p className="text-base font-bold font-mono text-red-400">{stats?.orders.cancelled ?? '--'}</p><p className="text-[10px] text-white/30">Cancelled</p></div>
                  </div>
                </div>
              </Panel>

              <Panel title="Live Event Stream" badge="REALTIME">
                <div className="space-y-0.5 max-h-72 overflow-hidden">
                  {liveEvents.length === 0
                    ? <p className="text-xs text-white/20 text-center py-8">Waiting for events…</p>
                    : liveEvents.slice(0, 14).map(evt => (
                      <div key={evt.id} className="flex items-start gap-2 py-1.5 border-b border-white/[0.04] last:border-0">
                        <span className={`font-mono text-[10px] leading-none mt-0.5 px-1 py-0.5 rounded shrink-0 ${EVENT_COLOR[evt.type]} bg-white/5`}>
                          {EVENT_ICON[evt.type]}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] text-white/60 truncate">{evt.message}</p>
                          <p className="text-[9px] text-white/25 font-mono">
                            {evt.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              </Panel>

              <Panel title="Server Health" badge={health ? 'LIVE' : undefined}>
                {!health
                  ? <div className="h-48 flex items-center justify-center"><RefreshCw className="w-5 h-5 animate-spin text-white/20" /></div>
                  : <div className="space-y-4">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 text-white/40"><Clock className="w-3 h-3" />Uptime</span>
                      <span className="font-mono text-emerald-400">{formatUptime(health.uptime)}</span>
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="flex items-center gap-1.5 text-white/40"><Cpu className="w-3 h-3" />CPU Load (1m)</span>
                        <span className={`font-mono ${cpuPct > 80 ? 'text-red-400' : cpuPct > 50 ? 'text-amber-400' : 'text-lime-400'}`}>
                          {health.cpu.loadAvg1.toFixed(2)} / {health.cpu.cores}c
                        </span>
                      </div>
                      <GaugeBar pct={cpuPct} colorClass={cpuPct > 80 ? 'bg-red-500' : cpuPct > 50 ? 'bg-amber-500' : 'bg-lime-500'} />
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="flex items-center gap-1.5 text-white/40"><HardDrive className="w-3 h-3" />Sys Memory</span>
                        <span className={`font-mono ${memPct > 85 ? 'text-red-400' : memPct > 70 ? 'text-amber-400' : 'text-cyan-400'}`}>{memPct}%</span>
                      </div>
                      <GaugeBar pct={memPct} colorClass={memPct > 85 ? 'bg-red-500' : memPct > 70 ? 'bg-amber-500' : 'bg-cyan-500'} />
                      <p className="text-[10px] text-white/20 mt-1 font-mono">{formatBytes(health.memory.systemTotal - health.memory.systemFree)} / {formatBytes(health.memory.systemTotal)}</p>
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="flex items-center gap-1.5 text-white/40"><Activity className="w-3 h-3" />Node Heap</span>
                        <span className={`font-mono ${heapPct > 80 ? 'text-red-400' : 'text-violet-400'}`}>{heapPct}%</span>
                      </div>
                      <GaugeBar pct={heapPct} colorClass={heapPct > 80 ? 'bg-red-500' : 'bg-violet-500'} />
                      <p className="text-[10px] text-white/20 mt-1 font-mono">{formatBytes(health.memory.heapUsed)} / {formatBytes(health.memory.heapTotal)}</p>
                    </div>
                    <div className="grid grid-cols-3 gap-2 pt-3 border-t border-white/[0.05]">
                      <div className="text-center"><p className="text-sm font-bold font-mono text-white/70">{health.requests.toLocaleString()}</p><p className="text-[9px] text-white/25">HTTP Req</p></div>
                      <div className="text-center"><p className="text-sm font-bold font-mono text-cyan-400">{health.connections}</p><p className="text-[9px] text-white/25">WebSockets</p></div>
                      <div className="text-center"><p className="text-sm font-bold font-mono text-white/50">{health.process.pid}</p><p className="text-[9px] text-white/25">PID</p></div>
                    </div>
                  </div>}
              </Panel>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Panel title="Recent Transactions" badge="latest 8">
                {recentTxns.length === 0
                  ? <p className="text-xs text-white/20 text-center py-8">No transactions yet</p>
                  : <div className="divide-y divide-white/[0.04]">
                    {recentTxns.map(txn => (
                      <div key={txn._id} className="flex items-center gap-3 py-2.5">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${txn.type === 'credit' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                          {txn.type === 'credit' ? '+' : '-'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-white/60 truncate">{txn.description}</p>
                          <p className="text-[10px] text-white/25">{txn.userId?.name ?? 'Unknown'} · {timeAgo(txn.createdAt)}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className={`text-sm font-mono font-bold ${txn.type === 'credit' ? 'text-emerald-400' : 'text-red-400'}`}>
                            {txn.type === 'credit' ? '+' : '-'}{formatCurrency(txn.amount)}
                          </p>
                          <p className={`text-[10px] capitalize ${{ completed: 'text-emerald-400/60', pending: 'text-amber-400/60', failed: 'text-red-400/60' }[txn.status]}`}>{txn.status}</p>
                        </div>
                      </div>
                    ))}
                  </div>}
              </Panel>

              <Panel title="Order Status Breakdown" badge={`${stats?.orders.total ?? 0} total`}>
                {Object.keys(statusBreakdown).length === 0
                  ? <p className="text-xs text-white/20 text-center py-8">No orders yet</p>
                  : <div className="space-y-3">
                    {Object.entries(statusBreakdown).sort(([, a], [, b]) => b - a).map(([status, count]) => {
                      const total = stats?.orders.total || 1;
                      const pct = Math.round((count / total) * 100);
                      return (
                        <div key={status}>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className={`font-mono font-medium ${STATUS_COLORS[status] ?? 'text-white/50'}`}>{status}</span>
                            <span className="text-white/30 font-mono">{count} <span className="text-white/20">({pct}%)</span></span>
                          </div>
                          <div className="w-full bg-white/5 rounded-full h-1 overflow-hidden">
                            <div className={`h-full rounded-full transition-all duration-700 ${STATUS_BAR_COLORS[status] ?? 'bg-white/20'}`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>}
              </Panel>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-white/[0.04]">
              <p className="text-[10px] text-white/20 font-mono">Stats: 30s · Health: 5s · Events: realtime</p>
              <p className="text-[10px] text-white/20 font-mono">{clock.toLocaleDateString([], { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</p>
            </div>
          </div>
        )}

        {tab === 'users' && (
          <div>
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <div className="relative flex-1 min-w-[220px] max-w-sm">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                <input type="text" value={userSearch} onChange={(e) => { setUserSearch(e.target.value); setUsersPage(1); }}
                  placeholder="Search name or email…"
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white/80 placeholder:text-white/25 outline-none focus:border-cyan-500/40 transition-colors" />
              </div>
              <div className="flex gap-0.5 p-1 bg-white/5 rounded-xl border border-white/[0.07]">
                {(['all', 'active', 'banned'] as const).map(f => (
                  <button key={f} onClick={() => { setUserFilter(f); setUsersPage(1); }}
                    className={`px-3 py-1 rounded-lg text-xs font-medium capitalize transition-all ${userFilter === f ? 'bg-cyan-500/20 text-cyan-300' : 'text-white/40 hover:text-white/70'}`}>
                    {f}
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-white/[0.07] bg-[#060910] overflow-hidden">
              {loadingUsers
                ? <div className="flex justify-center py-16"><RefreshCw className="w-5 h-5 animate-spin text-white/20" /></div>
                : users.length === 0
                  ? <div className="flex flex-col items-center py-16 text-white/20"><Users className="w-8 h-8 mb-3 opacity-50" /><p className="text-sm">No users found</p></div>
                  : <>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-white/[0.07]">
                            {['User', 'Role', 'Rating', 'Orders', 'Balance', 'Joined', 'Status', ''].map(h => (
                              <th key={h} className="px-4 py-3 text-left text-white/30 uppercase tracking-wider font-medium">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {users.map(u => (
                            <tr key={u._id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2.5">
                                  <Image src={u.avatar || generateAvatarUrl(u.name)} alt={u.name} width={32} height={32} className="rounded-lg" />
                                  <div><p className="font-medium text-white/80">{u.name}</p><p className="text-white/30">{u.email}</p></div>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-medium capitalize ${u.role === 'admin' ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/20' : 'bg-white/5 text-white/40'}`}>{u.role}</span>
                              </td>
                              <td className="px-4 py-3"><span className="text-amber-400">★</span> <span className="text-white/60">{u.rating.toFixed(1)}</span></td>
                              <td className="px-4 py-3 text-white/40 font-mono">{u.completedOrders}</td>
                              <td className="px-4 py-3 text-white/60 font-mono">{formatCurrency(u.walletBalance)}</td>
                              <td className="px-4 py-3 text-white/30">{formatDate(u.createdAt)}</td>
                              <td className="px-4 py-3">
                                {u.isBanned
                                  ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] bg-red-500/10 text-red-400 border border-red-500/20"><Ban className="w-2.5 h-2.5" />Banned</span>
                                  : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"><CheckCircle2 className="w-2.5 h-2.5" />Active</span>}
                              </td>
                              <td className="px-4 py-3 text-right">
                                {u.role !== 'admin' && (
                                  <button onClick={() => setBanDialog({ open: true, user: u, ban: !u.isBanned })}
                                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all border ${u.isBanned ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20'}`}>
                                    {u.isBanned ? <><UserCheck className="w-3 h-3" />Unban</> : <><UserX className="w-3 h-3" />Ban</>}
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <Pagination page={usersPage} pages={Math.ceil(usersTotal / 20)} onPageChange={setUsersPage} />
                  </>}
            </div>
          </div>
        )}

        {tab === 'payments' && (
          <div>
            {txnSummary && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                {[
                  { label: 'Total Credits', value: formatCurrency(txnSummary.totalCredits), icon: <TrendingUp className="w-4 h-4 text-emerald-400" />, border: 'border-emerald-500/15' },
                  { label: 'Total Debits', value: formatCurrency(txnSummary.totalDebits), icon: <CreditCard className="w-4 h-4 text-blue-400" />, border: 'border-blue-500/15' },
                  { label: 'Pending', value: txnSummary.pendingCount, icon: <Clock className="w-4 h-4 text-amber-400" />, border: 'border-amber-500/15' },
                  { label: 'Failed', value: txnSummary.failedCount, icon: <AlertTriangle className="w-4 h-4 text-red-400" />, border: 'border-red-500/15' },
                ].map(c => (
                  <div key={c.label} className={`rounded-xl border bg-[#080c14] p-4 flex items-center gap-3 ${c.border}`}>
                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0">{c.icon}</div>
                    <div><p className="text-lg font-bold font-mono text-white/80">{c.value}</p><p className="text-[10px] text-white/35">{c.label}</p></div>
                  </div>
                ))}
              </div>
            )}
            <div className="flex flex-wrap gap-3 mb-4">
              <select value={txnStatusFilter} onChange={e => { setTxnStatusFilter(e.target.value); setTxnPage(1); }}
                className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white/60 outline-none focus:border-cyan-500/40 cursor-pointer">
                <option value="" className="bg-[#060910]">All Status</option>
                <option value="completed" className="bg-[#060910]">Completed</option>
                <option value="pending" className="bg-[#060910]">Pending</option>
                <option value="failed" className="bg-[#060910]">Failed</option>
              </select>
              <select value={txnTypeFilter} onChange={e => { setTxnTypeFilter(e.target.value); setTxnPage(1); }}
                className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white/60 outline-none focus:border-cyan-500/40 cursor-pointer">
                <option value="" className="bg-[#060910]">All Types</option>
                <option value="credit" className="bg-[#060910]">Credit</option>
                <option value="debit" className="bg-[#060910]">Debit</option>
              </select>
            </div>
            <div className="rounded-xl border border-white/[0.07] bg-[#060910] overflow-hidden">
              {loadingTxn
                ? <div className="flex justify-center py-16"><RefreshCw className="w-5 h-5 animate-spin text-white/20" /></div>
                : transactions.length === 0
                  ? <p className="text-xs text-white/20 text-center py-16">No transactions found</p>
                  : <>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-white/[0.07]">
                            {['User', 'Type', 'Amount', 'Bal. After', 'Description', 'Status', 'Time'].map(h => (
                              <th key={h} className="px-4 py-3 text-left text-white/30 uppercase tracking-wider font-medium">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {transactions.map(txn => (
                            <tr key={txn._id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                              <td className="px-4 py-3"><p className="font-medium text-white/70">{txn.userId?.name ?? '--'}</p><p className="text-white/25">{txn.userId?.email ?? ''}</p></td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-medium capitalize border ${txn.type === 'credit' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>{txn.type}</span>
                              </td>
                              <td className={`px-4 py-3 font-mono font-bold ${txn.type === 'credit' ? 'text-emerald-400' : 'text-red-400'}`}>
                                {txn.type === 'credit' ? '+' : '-'}{formatCurrency(txn.amount)}
                              </td>
                              <td className="px-4 py-3 font-mono text-white/50">{formatCurrency(txn.balanceAfter)}</td>
                              <td className="px-4 py-3 text-white/40 max-w-[180px] truncate">{txn.description}</td>
                              <td className="px-4 py-3">
                                <span className={`text-[10px] capitalize ${{ completed: 'text-emerald-400', pending: 'text-amber-400', failed: 'text-red-400' }[txn.status]}`}>{txn.status}</span>
                              </td>
                              <td className="px-4 py-3 text-white/30">{timeAgo(txn.createdAt)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <Pagination page={txnPage} pages={txnPages} onPageChange={setTxnPage} />
                  </>}
            </div>
          </div>
        )}

        {tab === 'orders' && (
          <div>
            <div className="flex flex-wrap gap-3 mb-4">
              <select value={orderStatusFilter} onChange={e => { setOrderStatusFilter(e.target.value); setOrdersPage(1); }}
                className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white/60 outline-none focus:border-cyan-500/40 cursor-pointer">
                <option value="" className="bg-[#060910]">All Statuses</option>
                {['CREATED','BROADCASTED','ACCEPTED','BID_SELECTED','IN_PROGRESS','DELIVERED','COMPLETED','CANCELLED'].map(s => (
                  <option key={s} value={s} className="bg-[#060910]">{s}</option>
                ))}
              </select>
              <span className="ml-auto text-xs text-white/30 font-mono self-center">{ordersTotal} total</span>
            </div>
            <div className="rounded-xl border border-white/[0.07] bg-[#060910] overflow-hidden">
              {loadingOrders
                ? <div className="flex justify-center py-16"><RefreshCw className="w-5 h-5 animate-spin text-white/20" /></div>
                : orders.length === 0
                  ? <p className="text-xs text-white/20 text-center py-16">No orders found</p>
                  : <>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-white/[0.07]">
                            {['Order', 'Category', 'Budget', 'Mode', 'Status', 'Posted'].map(h => (
                              <th key={h} className="px-4 py-3 text-left text-white/30 uppercase tracking-wider font-medium">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {orders.map((o) => (
                            <tr key={String(o._id)} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                              <td className="px-4 py-3 max-w-[200px]">
                                <p className="text-white/60 truncate">{String(o.description)}</p>
                                <p className="text-white/25 font-mono text-[10px]">{String(o._id).slice(-8)}</p>
                              </td>
                              <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-md bg-white/5 text-white/50 capitalize">{String(o.category)}</span></td>
                              <td className="px-4 py-3 font-mono text-white/60">{formatCurrency(Number(o.budget))}</td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-0.5 rounded-md text-[10px] capitalize border ${o.mode === 'bidding' ? 'bg-violet-500/10 text-violet-400 border-violet-500/20' : 'bg-sky-500/10 text-sky-400 border-sky-500/20'}`}>{String(o.mode)}</span>
                              </td>
                              <td className="px-4 py-3"><span className={`font-mono font-medium text-[10px] ${STATUS_COLORS[String(o.status)] ?? 'text-white/40'}`}>{String(o.status)}</span></td>
                              <td className="px-4 py-3 text-white/30">{timeAgo(String(o.createdAt))}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <Pagination page={ordersPage} pages={Math.ceil(ordersTotal / 20)} onPageChange={setOrdersPage} />
                  </>}
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={banDialog.open}
        title={banDialog.ban ? `Ban ${banDialog.user?.name}?` : `Unban ${banDialog.user?.name}?`}
        message={banDialog.ban
          ? 'This will prevent the user from logging in and disconnect their active session.'
          : 'The user will regain full access to the platform.'}
        confirmLabel={banLoading ? 'Processing…' : banDialog.ban ? 'Ban User' : 'Unban User'}
        danger={banDialog.ban}
        onConfirm={handleBanConfirm}
        onCancel={() => setBanDialog({ open: false, user: null, ban: true })}
      />
    </div>
  );
}
