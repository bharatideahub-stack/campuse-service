import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SectionList, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useNotificationStore } from '@/store/notificationStore';
import { timeAgo } from '@/lib/utils';
import { Notification } from '@/types';

const NOTIF_ICON: Record<string, string> = {
  new_order: 'cube-outline',
  new_bid: 'cash-outline',
  bid_accepted: 'checkmark-circle-outline',
  order_accepted: 'checkmark-circle-outline',
  status_update: 'refresh-circle-outline',
  new_message: 'chatbubble-outline',
};

const NOTIF_COLOR: Record<string, string> = {
  new_order: '#3b82f6',
  new_bid: '#0c8a57',
  bid_accepted: '#f59e0b',
  order_accepted: '#16a34a',
  status_update: '#f97316',
  new_message: '#209e82',
};

function groupByDate(notifications: Notification[]) {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const groups: Record<string, Notification[]> = {};
  for (const n of notifications) {
    const d = new Date(n.createdAt);
    let label: string;
    if (d.toDateString() === today.toDateString()) label = 'Today';
    else if (d.toDateString() === yesterday.toDateString()) label = 'Yesterday';
    else label = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

    if (!groups[label]) groups[label] = [];
    groups[label].push(n);
  }
  return Object.entries(groups).map(([title, data]) => ({ title, data }));
}

export default function NotificationsScreen() {
  const router = useRouter();
  const { notifications, unreadCount, isLoading, fetchNotifications, markAllRead, markRead, clearAll } = useNotificationStore();
  const sections = groupByDate(notifications);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handlePress = (item: Notification) => {
    markRead(item._id);
    if (item.orderId) router.push(`/orders/${item.orderId}` as any);
  };

  const renderItem = ({ item }: { item: Notification }) => (
    <TouchableOpacity
      onPress={() => handlePress(item)}
      style={[styles.notifItem, !item.read && styles.notifUnread]}
    >
      <View
        style={[
          styles.iconWrap,
          { backgroundColor: item.read ? '#e6f4ec' : `${NOTIF_COLOR[item.type] || '#0c8a57'}18` },
        ]}
      >
        <Ionicons
          name={(NOTIF_ICON[item.type] || 'notifications-outline') as any}
          size={20}
          color={item.read ? '#73897a' : (NOTIF_COLOR[item.type] || '#0c8a57')}
        />
      </View>
      <View style={styles.notifContent}>
        <Text style={[styles.notifTitle, !item.read && styles.notifTitleUnread]}>
          {item.title}
        </Text>
        <Text style={styles.notifMessage} numberOfLines={2}>{item.message}</Text>
        <View style={styles.notifBottom}>
          <Text style={styles.notifTime}>{timeAgo(item.createdAt)}</Text>
          {item.orderId && (
            <Text style={styles.viewLink}>View →</Text>
          )}
        </View>
      </View>
      {!item.read && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.actions}>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={markAllRead}>
            <Text style={styles.actionBtn}>Mark all read</Text>
          </TouchableOpacity>
        )}
        {notifications.length > 0 && (
          <TouchableOpacity onPress={clearAll}>
            <Text style={[styles.actionBtn, { color: '#f87171' }]}>Clear all</Text>
          </TouchableOpacity>
        )}
      </View>

      {isLoading && notifications.length === 0 ? (
        <View style={styles.empty}>
          <ActivityIndicator color="#0c8a57" size="large" />
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🔔</Text>
          <Text style={styles.emptyTitle}>No notifications</Text>
          <Text style={styles.emptyText}>You're all caught up!</Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionHeaderText}>{section.title}</Text>
            </View>
          )}
          ItemSeparatorComponent={() => (
            <View style={{ height: 1, backgroundColor: '#d4e8da' }} />
          )}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={fetchNotifications} tintColor="#0c8a57" />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f0faf4' },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#d4e8da',
  },
  actionBtn: { fontSize: 12, color: '#0c8a57', fontWeight: '600' },
  empty: { alignItems: 'center', paddingTop: 80, gap: 8 },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#182a1e' },
  emptyText: { fontSize: 13, color: '#73897a' },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f0faf4',
    borderBottomWidth: 1,
    borderBottomColor: '#d4e8da',
  },
  sectionHeaderText: { fontSize: 11, fontWeight: '700', color: '#73897a', textTransform: 'uppercase', letterSpacing: 0.5 },
  notifItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    gap: 12,
    backgroundColor: '#ffffff',
  },
  notifUnread: { backgroundColor: 'rgba(12,138,87,0.05)' },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#e6f4ec',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifContent: { flex: 1 },
  notifTitle: { fontSize: 13, fontWeight: '600', color: '#73897a' },
  notifTitleUnread: { color: '#182a1e' },
  notifMessage: { fontSize: 12, color: '#73897a', marginTop: 2 },
  notifBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  notifTime: { fontSize: 11, color: '#73897a' },
  viewLink: { fontSize: 11, color: '#0c8a57', fontWeight: '700' },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0c8a57',
    marginTop: 4,
  },
});
