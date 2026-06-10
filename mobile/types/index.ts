export type OrderCategory = 'food' | 'print' | 'notes' | 'ride' | 'assessment' | 'project' | 'coaching' | 'design' | 'event' | 'marketplace' | 'others';
export type OrderStatus =
  | 'CREATED'
  | 'BROADCASTED'
  | 'ACCEPTED'
  | 'BID_SELECTED'
  | 'IN_PROGRESS'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'CANCELLED';
export type OrderMode = 'fixed' | 'bidding';
export type OrderUrgency = 'normal' | 'asap';

export interface Location {
  type: 'Point';
  coordinates: [number, number];
  address?: string;
}

export interface User {
  _id: string;
  name: string;
  email: string;
  avatar?: string | null;
  hostel?: string;
  phone?: string;
  role: 'student' | 'admin';
  isAvailable: boolean;
  isBanned?: boolean;
  rating: number;
  totalRatings: number;
  completedOrders: number;
  reliabilityScore: number;
  walletBalance: number;
  location?: Location;
  createdAt: string;
}

export interface Order {
  _id: string;
  userId: User;
  category: OrderCategory;
  description: string;
  budget?: number;
  mode: OrderMode;
  status: OrderStatus;
  urgency: OrderUrgency;
  location: Location;
  assignedTo?: User | null;
  bids?: Bid[];
  finalPrice?: number;
  isPriorityBoosted: boolean;
  statusHistory: { status: string; timestamp: string; note?: string }[];
  completedAt?: string;
  cancelReason?: string;
  isReviewedByCustomer: boolean;
  isReviewedByProvider: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Bid {
  _id: string;
  orderId: string;
  userId: User;
  price: number;
  message?: string;
  estimatedTime?: number;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
}

export interface Review {
  _id: string;
  fromUser: User;
  toUser: User | string;
  orderId: string;
  rating: number;
  comment?: string;
  createdAt: string;
}

export interface Message {
  _id: string;
  orderId: string;
  senderId: User;
  content: string;
  type: 'text' | 'system';
  readBy: string[];
  createdAt: string;
}

export interface WalletTransaction {
  _id: string;
  userId: string;
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  orderId?: string;
  balanceAfter: number;
  status: 'pending' | 'completed' | 'failed';
  createdAt: string;
}

export interface Notification {
  _id: string;
  type: 'new_order' | 'new_bid' | 'order_accepted' | 'bid_accepted' | 'status_update' | 'new_message';
  title: string;
  message: string;
  orderId?: string;
  read: boolean;
  createdAt: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export const CATEGORY_META: Record<
  OrderCategory,
  { label: string; icon: string; color: string; bg: string }
> = {
  food: { label: 'Food & Tiffin', icon: '🍱', color: '#fb923c', bg: 'rgba(249,115,22,0.1)' },
  print: { label: 'Printouts', icon: '🖨️', color: '#60a5fa', bg: 'rgba(59,130,246,0.1)' },
  notes: { label: 'Notes', icon: '📝', color: '#4ade80', bg: 'rgba(34,197,94,0.1)' },
  ride: { label: 'Ride Share', icon: '🛵', color: '#c084fc', bg: 'rgba(168,85,247,0.1)' },
  assessment: { label: 'Assessment', icon: '📋', color: '#f87171', bg: 'rgba(239,68,68,0.1)' },
  project: { label: 'Project', icon: '💻', color: '#818cf8', bg: 'rgba(99,102,241,0.1)' },
  coaching: { label: 'Coaching', icon: '🎓', color: '#fbbf24', bg: 'rgba(245,158,11,0.1)' },
  design: { label: 'Design', icon: '🎨', color: '#e879f9', bg: 'rgba(217,70,239,0.1)' },
  event: { label: 'Event', icon: '🎉', color: '#2dd4bf', bg: 'rgba(20,184,166,0.1)' },
  marketplace: { label: 'Marketplace', icon: '🛒', color: '#0c8a57', bg: 'rgba(12,138,87,0.1)' },
  others: { label: 'Others', icon: '📦', color: '#9ca3af', bg: 'rgba(107,114,128,0.1)' },
};

export const STATUS_META: Record<
  OrderStatus,
  { label: string; color: string; bg: string }
> = {
  CREATED: { label: 'Created', color: '#9ca3af', bg: 'rgba(107,114,128,0.1)' },
  BROADCASTED: { label: 'Looking for provider', color: '#fbbf24', bg: 'rgba(245,158,11,0.1)' },
  ACCEPTED: { label: 'Accepted', color: '#60a5fa', bg: 'rgba(59,130,246,0.1)' },
  BID_SELECTED: { label: 'Provider selected', color: '#818cf8', bg: 'rgba(99,102,241,0.1)' },
  IN_PROGRESS: { label: 'In Progress', color: '#fb923c', bg: 'rgba(249,115,22,0.1)' },
  DELIVERED: { label: 'Delivered', color: '#2dd4bf', bg: 'rgba(20,184,166,0.1)' },
  COMPLETED: { label: 'Completed', color: '#4ade80', bg: 'rgba(34,197,94,0.1)' },
  CANCELLED: { label: 'Cancelled', color: '#f87171', bg: 'rgba(239,68,68,0.1)' },
};
