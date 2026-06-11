'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Order, OrderStatus } from '@/types';
import { useOrderStore } from '@/store/orderStore';
import { ordersAPI } from '@/lib/api';
import { Loader2, Play, CheckSquare, XCircle, Star, AlertTriangle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import { reviewsAPI } from '@/lib/api';

interface Props {
  order: Order;
  isOwner: boolean;
  isProvider: boolean;
}

const OWNER_TRANSITIONS: Partial<Record<OrderStatus, { to: OrderStatus; label: string; icon: React.ReactNode; danger?: boolean }>> = {
  DELIVERED: { to: 'COMPLETED', label: 'Confirm Received', icon: <CheckSquare className="w-4 h-4" /> },
};

const PROVIDER_TRANSITIONS: Partial<Record<OrderStatus, { to: OrderStatus; label: string; icon: React.ReactNode; danger?: boolean }>> = {
  ACCEPTED: { to: 'IN_PROGRESS', label: 'Start Order', icon: <Play className="w-4 h-4" /> },
  BID_SELECTED: { to: 'IN_PROGRESS', label: 'Start Order', icon: <Play className="w-4 h-4" /> },
  IN_PROGRESS: { to: 'DELIVERED', label: 'Mark Delivered', icon: <CheckSquare className="w-4 h-4" /> },
};

const CANCEL_REASONS = [
  'Changed my mind',
  'Found another way',
  'No providers available',
  'Taking too long',
  'Entered wrong details',
  'Other',
];

export default function StatusActions({ order, isOwner, isProvider }: Props) {
  const { updateOrderStatus, fetchOrderById } = useOrderStore();
  const [isLoading, setIsLoading] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const router = useRouter();

  const canCancel = isOwner && ['CREATED', 'BROADCASTED'].includes(order.status);
  const canAccept =
    !isOwner &&
    !isProvider &&
    order.mode === 'fixed' &&
    ['CREATED', 'BROADCASTED'].includes(order.status);
  const transition = isOwner
    ? OWNER_TRANSITIONS[order.status]
    : isProvider
    ? PROVIDER_TRANSITIONS[order.status]
    : null;

  const handleAction = async () => {
    if (!transition) return;
    setIsLoading(true);
    try {
      await updateOrderStatus(order._id, transition.to);
      toast.success(transition.to === 'COMPLETED' ? 'Order completed! 🎉' : 'Status updated!');
      if (transition.to === 'COMPLETED') setShowReview(true);
    } catch {
      toast.error('Failed to update order status');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccept = async () => {
    setIsAccepting(true);
    try {
      await ordersAPI.accept(order._id);
      await fetchOrderById(order._id);
      toast.success('Order accepted! Get started.');
    } catch {
      toast.error('Failed to accept order');
    } finally {
      setIsAccepting(false);
    }
  };

  const handleCancel = async () => {
    const reason = cancelReason === 'Other' ? customReason.trim() : cancelReason;
    if (!reason) return toast.error('Please select a reason');
    setIsLoading(true);
    try {
      await ordersAPI.updateStatus(order._id, 'CANCELLED');
      await fetchOrderById(order._id);
      toast.success('Order cancelled');
      setShowCancelModal(false);
    } catch {
      toast.error('Failed to cancel order');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReview = async () => {
    try {
      const toUserId = isOwner
        ? (typeof order.assignedTo === 'string' ? order.assignedTo : order.assignedTo?._id)
        : (typeof order.userId === 'string' ? order.userId : (order.userId as { _id: string })?._id);
      if (!toUserId) return;
      await reviewsAPI.createReview({ orderId: order._id, toUser: toUserId, rating, comment });
      toast.success('Review submitted! 🌟');
      setShowReview(false);
      router.refresh();
    } catch {
      toast.error('Failed to submit review');
    }
  };

  if (!transition && !canCancel && !canAccept && order.status !== 'COMPLETED') return null;

  return (
    <div className="space-y-3">
      {/* Accept button — visible to providers on fixed-price open orders */}
      {canAccept && (
        <button
          onClick={handleAccept}
          disabled={isAccepting}
          className="w-full py-3.5 rounded-2xl gradient-bg text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 disabled:opacity-60 active:scale-[0.98] transition-all"
        >
          {isAccepting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
          Accept This Order
        </button>
      )}

      {/* Status progression button */}
      {transition && (
        <button
          onClick={handleAction}
          disabled={isLoading}
          className="w-full py-3.5 rounded-2xl gradient-bg text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 disabled:opacity-60 active:scale-[0.98] transition-all"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : transition.icon}
          {transition.label}
        </button>
      )}

      {/* Cancel button */}
      {canCancel && (
        <button
          onClick={() => setShowCancelModal(true)}
          className="w-full py-3 rounded-2xl border border-red-300 text-red-500 text-sm font-semibold flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 transition-all"
        >
          <XCircle className="w-4 h-4" />
          Cancel Request
        </button>
      )}

      {/* Cancel reason modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/20 backdrop-blur-sm px-4 pb-6">
          <div className="w-full max-w-sm card card-shadow p-5 space-y-4 rounded-3xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="font-semibold text-[hsl(var(--foreground))]">Cancel this request?</p>
                <p className="text-xs text-[hsl(var(--foreground-muted))]">Please tell us why</p>
              </div>
            </div>
            <div className="space-y-2">
              {CANCEL_REASONS.map((r) => (
                <button
                  key={r}
                  onClick={() => setCancelReason(r)}
                  className={cn(
                    'w-full text-left px-4 py-2.5 rounded-xl text-sm border transition-all',
                    cancelReason === r
                      ? 'border-red-400 bg-red-50 text-red-600 font-medium'
                      : 'border-[hsl(var(--border))] text-[hsl(var(--foreground))] bg-white'
                  )}
                >
                  {r}
                </button>
              ))}
              {cancelReason === 'Other' && (
                <input
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="Describe your reason..."
                  className="input-base text-sm mt-1"
                />
              )}
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={handleCancel}
                disabled={isLoading || !cancelReason}
                className="flex-1 py-3 rounded-2xl bg-red-500 text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Yes, Cancel
              </button>
              <button
                onClick={() => { setShowCancelModal(false); setCancelReason(''); }}
                className="flex-1 py-3 rounded-2xl border border-[hsl(var(--border))] text-sm text-[hsl(var(--foreground-muted))]"
              >
                Keep it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Review form after completion */}
      {showReview && (
        <div className="card card-shadow p-5 rounded-2xl space-y-4 border border-yellow-200">
          <div className="text-center">
            <p className="text-2xl mb-1">⭐</p>
            <p className="font-semibold text-[hsl(var(--foreground))]">Rate your experience</p>
            <p className="text-xs text-[hsl(var(--foreground-muted))] mt-0.5">
              {isOwner ? 'How was the service?' : 'How was this customer?'}
            </p>
          </div>
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} onClick={() => setRating(n)} className="transition-transform active:scale-90">
                <Star className={cn('w-8 h-8 transition-colors', n <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-[hsl(var(--border))]')} />
              </button>
            ))}
          </div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Leave a comment (optional)..."
            rows={2}
            className="input-base resize-none text-sm"
          />
          <div className="flex gap-2">
            <button
              onClick={handleReview}
              className="flex-1 py-3 rounded-2xl gradient-bg text-white text-sm font-semibold shadow-md shadow-emerald-600/15"
            >
              Submit Review
            </button>
            <button
              onClick={() => setShowReview(false)}
              className="px-5 py-3 rounded-2xl border border-[hsl(var(--border))] text-sm text-[hsl(var(--foreground-muted))]"
            >
              Skip
            </button>
          </div>
        </div>
      )}

      {/* Completed state */}
      {order.status === 'COMPLETED' && !showReview && (
        <div className="text-center py-4 text-sm text-[hsl(var(--foreground-muted))]">
          <span className="text-xl block mb-1">✅</span>
          This order is completed
        </div>
      )}
    </div>
  );
}
