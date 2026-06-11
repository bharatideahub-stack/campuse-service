'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ordersAPI } from '@/lib/api';
import { Order, CATEGORY_META } from '@/types';
import { Package, Clock, CheckCircle2, XCircle, ChevronRight, IndianRupee, Plus } from 'lucide-react';
import { cn, timeAgo, formatCurrency } from '@/lib/utils';
import Link from 'next/link';

function groupOrdersByDate(orders: Order[]): { label: string; orders: Order[] }[] {
  const today = new Date();
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  const weekAgo = new Date(today); weekAgo.setDate(today.getDate() - 7);
  const groups: Record<string, Order[]> = {};
  orders.forEach((o) => {
    const d = new Date(o.createdAt);
    let label: string;
    if (d.toDateString() === today.toDateString()) label = 'Today';
    else if (d.toDateString() === yesterday.toDateString()) label = 'Yesterday';
    else if (d >= weekAgo) label = 'This Week';
    else label = d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    if (!groups[label]) groups[label] = [];
    groups[label].push(o);
  });
  return Object.entries(groups).map(([label, orders]) => ({ label, orders }));
}

const TABS = [
  { label: 'Active', value: 'active' },
  { label: 'Completed', value: 'done' },
];

const ROLE_TABS = [
  { label: 'As Customer', value: 'customer' },
  { label: 'As Provider', value: 'provider' },
];

const ACTIVE_STATUSES = ['CREATED', 'BROADCASTED', 'ACCEPTED', 'BID_SELECTED', 'IN_PROGRESS'];
const DONE_STATUSES   = ['COMPLETED', 'CANCELLED', 'DELIVERED'];

const STATUS_INFO: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  CREATED:     { label: 'Posted',      color: 'text-blue-600 bg-blue-500/12',     icon: Clock },
  BROADCASTED: { label: 'Live',        color: 'text-emerald-700 bg-emerald-500/12', icon: Clock },
  ACCEPTED:    { label: 'Accepted',    color: 'text-yellow-700 bg-yellow-500/12', icon: Clock },
  BID_SELECTED:{ label: 'Bid Accepted',color: 'text-orange-600 bg-orange-500/12', icon: Clock },
  IN_PROGRESS: { label: 'In Progress', color: 'text-orange-600 bg-orange-500/12', icon: Clock },
  DELIVERED:   { label: 'Delivered',   color: 'text-green-700 bg-green-500/12',   icon: CheckCircle2 },
  COMPLETED:   { label: 'Completed',   color: 'text-green-700 bg-green-500/12',   icon: CheckCircle2 },
  CANCELLED:   { label: 'Cancelled',   color: 'text-red-600 bg-red-500/12',       icon: XCircle },
};


function OrderCard({ order }: { order: Order }) {
  const info = STATUS_INFO[order.status] || { label: order.status, color: 'text-gray-500 bg-gray-100', icon: Clock };
  const StatusIcon = info.icon;
  const CategoryIcon = CATEGORY_META[order.category]?.icon;
  const catMeta = CATEGORY_META[order.category];

  return (
    <Link href={`/orders/${order._id}`}>
      <motion.div whileTap={{ scale: 0.98 }} className="card card-shadow p-4 transition-opacity active:opacity-80">
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${catMeta?.bg ?? 'bg-[hsl(var(--surface-2))]'}`}>
            {CategoryIcon ? <CategoryIcon className={`w-5 h-5 ${catMeta?.color ?? ''}`} /> : null}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[hsl(var(--foreground))] line-clamp-2 leading-snug mb-2">{order.description}</p>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn('inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full', info.color)}>
                <StatusIcon className="w-3 h-3" />
                {info.label}
              </span>
              {order.finalPrice || order.budget ? (
                <span className="inline-flex items-center gap-0.5 text-[11px] text-violet-400 font-semibold">
                  <IndianRupee className="w-3 h-3" />
                  {formatCurrency(order.finalPrice || order.budget || 0)}
                </span>
              ) : null}
              <span className="text-[11px] text-[hsl(var(--foreground-muted))] ml-auto">{timeAgo(order.createdAt)}</span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[hsl(var(--foreground-muted))] shrink-0 mt-1" />
        </div>

        {/* Progress bar for active orders */}
        {ACTIVE_STATUSES.includes(order.status) && (
          <div className="mt-3 pt-3 border-t border-[hsl(var(--border))]">
            <div className="flex items-center justify-between text-[10px] text-[hsl(var(--foreground-muted))] mb-1.5">
              <span>Posted</span><span>In Progress</span><span>Done</span>
            </div>
            <div className="h-1 bg-[hsl(var(--surface-2))] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full gradient-bg transition-all duration-700"
                style={{
                  width: ({
                    CREATED: '10%', BROADCASTED: '25%', ACCEPTED: '50%',
                    BID_SELECTED: '60%', IN_PROGRESS: '80%', DELIVERED: '90%', COMPLETED: '100%', CANCELLED: '0%',
                  }[order.status] || '0%'),
                }}
              />
            </div>
          </div>
        )}
      </motion.div>
    </Link>
  );
}

export default function MyOrdersPage() {
  const [activeTab, setActiveTab] = useState('active');
  const [role, setRole] = useState<'customer' | 'provider'>('customer');
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const { data } = await ordersAPI.getMy({ role });
      setOrders(data.orders || []);
    } catch { /* ignore */ }
    finally { setIsLoading(false); }
  };

  useEffect(() => { fetchOrders(); }, [role]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = orders.filter((o) =>
    activeTab === 'active' ? ACTIVE_STATUSES.includes(o.status) : DONE_STATUSES.includes(o.status),
  );
  const grouped = groupOrdersByDate(filtered);
  const activeCount = orders.filter((o) => ACTIVE_STATUSES.includes(o.status)).length;
  const doneCount = orders.filter((o) => DONE_STATUSES.includes(o.status)).length;

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-[hsl(var(--background))]/95 backdrop-blur-xl px-4 pt-5 pb-3 border-b border-[hsl(var(--border))]">
        <h1 className="text-xl font-bold mb-3">My Orders</h1>

        {/* Role toggle */}
        <div className="flex gap-1.5 p-1 bg-[hsl(var(--surface))] rounded-2xl mb-3">
          {ROLE_TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => setRole(t.value as 'customer' | 'provider')}
              className={cn(
                'flex-1 py-2 rounded-xl text-xs font-semibold transition-all',
                role === t.value
                  ? 'bg-[hsl(var(--primary))] text-white shadow-md shadow-emerald-600/20'
                  : 'text-[hsl(var(--foreground-muted))]',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Active/Done tabs */}
        <div className="flex gap-4">
          {TABS.map((t) => {
            const count = orders.filter((o) =>
              t.value === 'active' ? ACTIVE_STATUSES.includes(o.status) : DONE_STATUSES.includes(o.status),
            ).length;
            return (
              <button
                key={t.value}
                onClick={() => setActiveTab(t.value)}
                className={cn(
                  'flex items-center gap-2 pb-2 text-sm font-semibold border-b-2 transition-all',
                  activeTab === t.value
                    ? 'text-[hsl(var(--primary))] border-[hsl(var(--primary))]'
                    : 'text-[hsl(var(--foreground-muted))] border-transparent',
                )}
              >
                {t.label}
                {count > 0 && (
                  <span className={cn(
                    'text-[10px] px-1.5 py-0.5 rounded-full font-bold',
                    activeTab === t.value ? 'bg-[hsl(var(--primary))] text-white' : 'bg-[hsl(var(--surface-2))] text-[hsl(var(--foreground-muted))]',
                  )}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Summary strip */}
      {orders.length > 0 && !isLoading && (
        <div className="px-4 py-2 flex gap-3">
          <div className="flex-1 card p-3 flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-emerald-500/15 flex items-center justify-center">
              <Clock className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div>
              <p className="text-base font-bold text-[hsl(var(--foreground))]">{activeCount}</p>
              <p className="text-[10px] text-[hsl(var(--foreground-muted))]">Active</p>
            </div>
          </div>
          <div className="flex-1 card p-3 flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-blue-500/15 flex items-center justify-center">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />
            </div>
            <div>
              <p className="text-base font-bold text-[hsl(var(--foreground))]">{doneCount}</p>
              <p className="text-[10px] text-[hsl(var(--foreground-muted))]">Completed</p>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 px-4 py-4">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="card card-shadow p-4 animate-pulse">
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[hsl(var(--surface-2))] shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-[hsl(var(--surface-2))] rounded-lg w-5/6" />
                    <div className="h-3 bg-[hsl(var(--surface-2))] rounded-lg w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-60 gap-3">
            <div className="w-16 h-16 rounded-3xl bg-[hsl(var(--surface))] flex items-center justify-center">
              <Package className="w-7 h-7 text-[hsl(var(--foreground-muted))]" />
            </div>
            <p className="text-base font-semibold">No {activeTab === 'active' ? 'active' : 'past'} orders</p>
            <p className="text-sm text-[hsl(var(--foreground-muted))] text-center">
              {activeTab === 'active' ? 'Post a request to get started' : 'Your completed orders will appear here'}
            </p>
            {activeTab === 'active' && (
              <Link href="/create" className="mt-1 flex items-center gap-2 px-5 py-2.5 rounded-2xl gradient-bg text-white text-sm font-semibold shadow-lg shadow-emerald-600/20">
                <Plus className="w-4 h-4" /> Post a Request
              </Link>
            )}
          </div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            {grouped.map(({ label, orders: groupOrders }) => (
              <div key={label}>
                <p className="text-xs font-semibold text-[hsl(var(--foreground-muted))] uppercase tracking-wide mb-2">{label}</p>
                <div className="space-y-3">
                  {groupOrders.map((order, i) => (
                    <motion.div
                      key={order._id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                    >
                      <OrderCard order={order} />
                    </motion.div>
                  ))}
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
