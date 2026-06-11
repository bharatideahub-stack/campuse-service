import { useEffect } from 'react';
import { getSocket, connectSocket, disconnectSocket } from '@/lib/socket';
import { useAuthStore } from '@/store/authStore';
import { useOrderStore } from '@/store/orderStore';
import { useNotificationStore } from '@/store/notificationStore';
import { Order, Bid, Message, Notification } from '@/types';
import Toast from 'react-native-toast-message';
import { scheduleLocalNotification } from '@/hooks/usePushNotifications';

export function useSocket() {
  const { token, user } = useAuthStore();
  const { addNewOrder, updateOrderInList, addBidToOrder } = useOrderStore();
  const { addNotification, fetchNotifications } = useNotificationStore();

  useEffect(() => {
    if (!token) {
      disconnectSocket();
      return;
    }

    const socket = connectSocket(token);

    // Fetch persisted notifications on connect
    fetchNotifications();

    // Backend-persisted notification (new_bid, bid_accepted, order_accepted, status_update)
    socket.on('notification', (notif: Notification) => {
      addNotification(notif);
      Toast.show({ type: 'info', text1: notif.title, text2: notif.message });
    });

    // New order broadcasted (for providers — local only, not persisted per-user in DB)
    socket.on('new_order', ({ order }: { order: Order }) => {
      if (order.userId._id !== user?._id) {
        addNewOrder(order);
        addNotification({
          _id: `local_${Date.now()}`,
          type: 'new_order',
          title: `New ${order.category} request`,
          message: order.description.slice(0, 80),
          orderId: order._id,
          read: false,
          createdAt: new Date().toISOString(),
        });
        Toast.show({
          type: 'info',
          text1: '📦 New Request',
          text2: order.description.slice(0, 60),
        });
        scheduleLocalNotification(
          `New ${order.category} request`,
          order.description.slice(0, 80),
          { orderId: order._id }
        );
      }
    });

    // New bid placed — update order in store (toast handled by notification event)
    socket.on('new_bid', ({ bid, orderId }: { bid: Bid; orderId: string }) => {
      addBidToOrder(orderId, bid);
    });

    // Bid accepted — update order in store (toast handled by notification event)
    socket.on('bid_accepted', ({ order }: { bid: Bid; order: Order }) => {
      updateOrderInList(order);
    });

    // Order status update — update order in store (toast handled by notification event)
    socket.on('order_status_update', ({ order }: { order: Order }) => {
      updateOrderInList(order);
    });

    // Remove cancelled/accepted orders from feed
    socket.on('feed_order_removed', ({ orderId }: { orderId: string }) => {
      updateOrderInList({ _id: orderId } as Order);
    });

    return () => {
      socket.off('notification');
      socket.off('new_order');
      socket.off('new_bid');
      socket.off('bid_accepted');
      socket.off('order_status_update');
      socket.off('feed_order_removed');
    };
  }, [token, user, addNewOrder, updateOrderInList, addBidToOrder, addNotification, fetchNotifications]);

  return getSocket();
}

export function useOrderSocket(_orderId: string) {
  const socket = getSocket();

  const onNewMessage = (handler: (msg: Message) => void) => {
    socket?.on('new_message', ({ message }: { message: Message }) => handler(message));
    return () => socket?.off('new_message');
  };

  const onStatusUpdate = (handler: (data: { order: Order; status: string }) => void) => {
    socket?.on('order_status_update', handler);
    return () => socket?.off('order_status_update');
  };

  return { socket, onNewMessage, onStatusUpdate };
}
