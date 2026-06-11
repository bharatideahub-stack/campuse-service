import {
  LucideIcon, Utensils, Printer, BookOpen, Bike,
  ClipboardList, Code2, GraduationCap, Palette,
  CalendarDays, ShoppingBag, Package,
} from 'lucide-react';

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
  blockedUsers?: string[];
  isBanned?: boolean;
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
  id: string;
  type: 'new_order' | 'new_bid' | 'order_accepted' | 'bid_accepted' | 'status_update' | 'new_message';
  title: string;
  message: string;
  orderId?: string;
  read: boolean;
  createdAt: string;
}

export type ServicePriceType = 'fixed' | 'hourly' | 'negotiable';

export interface Service {
  _id: string;
  userId: User | string;
  title: string;
  description: string;
  category: OrderCategory;
  priceType: ServicePriceType;
  price: number;
  tags: string[];
  portfolio: string[];
  rating: number;
  reviewCount: number;
  orderCount: number;
  isActive: boolean;
  createdAt: string;
}

export interface PublicProfile {
  user: Pick<User, '_id' | 'name' | 'avatar' | 'hostel' | 'rating' | 'totalRatings' | 'completedOrders' | 'reliabilityScore'> & { createdAt: string };
  services: Service[];
  reviews: Review[];
  completedOrders: number;
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
  { label: string; icon: LucideIcon; color: string; bg: string }
> = {
  food:        { label: 'Food & Tiffin',  icon: Utensils,      color: 'text-orange-600',  bg: 'bg-orange-500/10' },
  print:       { label: 'Printouts',      icon: Printer,       color: 'text-blue-600',    bg: 'bg-blue-500/10' },
  notes:       { label: 'Notes',          icon: BookOpen,      color: 'text-green-600',   bg: 'bg-green-500/10' },
  ride:        { label: 'Ride Share',     icon: Bike,          color: 'text-purple-600',  bg: 'bg-purple-500/10' },
  assessment:  { label: 'Assessment',     icon: ClipboardList, color: 'text-red-600',     bg: 'bg-red-500/10' },
  project:     { label: 'Project Help',   icon: Code2,         color: 'text-indigo-600',  bg: 'bg-indigo-500/10' },
  coaching:    { label: 'Coaching',       icon: GraduationCap, color: 'text-teal-600',    bg: 'bg-teal-500/10' },
  design:      { label: 'Design',         icon: Palette,       color: 'text-pink-600',    bg: 'bg-pink-500/10' },
  event:       { label: 'Event Support',  icon: CalendarDays,  color: 'text-yellow-600',  bg: 'bg-yellow-500/10' },
  marketplace: { label: 'Marketplace',    icon: ShoppingBag,   color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
  others:      { label: 'Others',         icon: Package,       color: 'text-gray-600',    bg: 'bg-gray-500/10' },
};

export const STATUS_META: Record<
  OrderStatus,
  { label: string; color: string; bg: string }
> = {
  CREATED: { label: 'Created', color: 'text-gray-400', bg: 'bg-gray-500/10' },
  BROADCASTED: { label: 'Looking for provider', color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  ACCEPTED: { label: 'Accepted', color: 'text-blue-400', bg: 'bg-blue-500/10' },
  BID_SELECTED: { label: 'Provider selected', color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
  IN_PROGRESS: { label: 'In Progress', color: 'text-orange-400', bg: 'bg-orange-500/10' },
  DELIVERED: { label: 'Delivered', color: 'text-teal-400', bg: 'bg-teal-500/10' },
  COMPLETED: { label: 'Completed', color: 'text-green-400', bg: 'bg-green-500/10' },
  CANCELLED: { label: 'Cancelled', color: 'text-red-400', bg: 'bg-red-500/10' },
};
