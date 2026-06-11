import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useAuthStore } from '@/store/authStore';
import { ordersAPI, messagesAPI } from '@/lib/api';
import { Order, Message } from '@/types';
import { timeAgo } from '@/lib/utils';
import { Avatar } from '@/components/ui/Avatar';
import { ChatListSkeleton } from '@/components/ui/Skeleton';
import { getSocket, joinOrderRoom, leaveOrderRoom, emitTypingStart, emitTypingStop } from '@/lib/socket';

type ChatView = 'list' | 'thread';
const CHAT_ACTIVE_STATUSES = ['ACCEPTED', 'BID_SELECTED', 'IN_PROGRESS', 'DELIVERED'];

export default function ChatScreen() {
  const { user } = useAuthStore();
  const [view, setView] = useState<ChatView>('list');
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [typing, setTyping] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    loadActiveOrders();
  }, []);

  const loadActiveOrders = async () => {
    setIsLoading(true);
    try {
      const [asCustomer, asProvider] = await Promise.all([
        ordersAPI.getMy({ role: 'customer' }),
        ordersAPI.getMy({ role: 'provider' }),
      ]);
      const allOrders: Order[] = [
        ...(asCustomer.data.orders || []),
        ...(asProvider.data.orders || []),
      ];
      const uniqueOrders = allOrders.filter(
        (o, i, arr) => arr.findIndex((x) => x._id === o._id) === i
      );
      setActiveOrders(
        uniqueOrders.filter(
          (o) => o.assignedTo && CHAT_ACTIVE_STATUSES.includes(o.status)
        )
      );
    } catch {}
    setIsLoading(false);
  };

  const openThread = async (order: Order) => {
    if (!CHAT_ACTIVE_STATUSES.includes(order.status)) return;
    setSelectedOrder(order);
    setView('thread');
    setIsLoading(true);
    try {
      const { data } = await messagesAPI.getMessages(order._id);
      setMessages(data.messages || []);
      joinOrderRoom(order._id);

      const socket = getSocket();
      socket?.on('new_message', ({ message }: { message: Message }) => {
        setMessages((prev) => [...prev, message]);
      });
      socket?.on('typing_start', () => setTyping(true));
      socket?.on('typing_stop', () => setTyping(false));
    } catch {}
    setIsLoading(false);
  };

  const closeThread = () => {
    if (selectedOrder) {
      leaveOrderRoom(selectedOrder._id);
      const socket = getSocket();
      socket?.off('new_message');
      socket?.off('typing_start');
      socket?.off('typing_stop');
    }
    setSelectedOrder(null);
    setMessages([]);
    setView('list');
  };

  const sendMessage = async () => {
    if (!input.trim() || !selectedOrder) return;
    const content = input.trim();
    setInput('');
    emitTypingStop(selectedOrder._id);
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await messagesAPI.send(selectedOrder._id, content);
    } catch {}
  };

  const pickAndSendImage = async () => {
    if (!selectedOrder) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.5,
      base64: true,
      allowsEditing: true,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const ext = asset.uri.split('.').pop()?.toLowerCase() || 'jpeg';
    const mime = ext === 'png' ? 'image/png' : 'image/jpeg';
    const content = `data:${mime};base64,${asset.base64}`;
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      await messagesAPI.sendMessage(selectedOrder._id, { content, type: 'image' });
    } catch {}
  };

  if (view === 'thread' && selectedOrder) {
    const otherUser =
      selectedOrder.userId._id === user?._id
        ? selectedOrder.assignedTo
        : selectedOrder.userId;

    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={0}
        >
          {/* Thread header */}
          <View style={styles.threadHeader}>
            <TouchableOpacity onPress={closeThread} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={22} color="#fff" />
            </TouchableOpacity>
            <Avatar name={otherUser?.name || '?'} size={36} />
            <View style={styles.threadInfo}>
              <Text style={styles.threadName}>{otherUser?.name || 'Unknown'}</Text>
              <Text style={styles.threadOrder} numberOfLines={1}>
                {selectedOrder.description.slice(0, 40)}
              </Text>
            </View>
          </View>

          {/* Messages */}
          <FlatList
            data={messages}
            keyExtractor={(m) => m._id}
            contentContainerStyle={styles.messageList}
            inverted={false}
            renderItem={({ item: msg }) => {
              const isMe = msg.senderId._id === user?._id;
              if (msg.type === 'system') {
                return (
                  <Text style={styles.systemMsg}>{msg.content}</Text>
                );
              }
              if (msg.type === ('image' as any)) {
                return (
                  <View style={[styles.msgRow, isMe && styles.msgRowMe]}>
                    {!isMe && <Avatar name={msg.senderId.name} size={28} />}
                    <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem, { padding: 4 }]}>
                      <Image
                        source={{ uri: msg.content }}
                        style={styles.msgImage}
                        resizeMode="cover"
                      />
                      <Text style={[styles.bubbleTime, !isMe && styles.bubbleTimeThem]}>
                        {timeAgo(msg.createdAt)}
                      </Text>
                    </View>
                  </View>
                );
              }
              return (
                <View style={[styles.msgRow, isMe && styles.msgRowMe]}>
                  {!isMe && (
                    <Avatar name={msg.senderId.name} size={28} />
                  )}
                  <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
                    <Text style={[styles.bubbleText, !isMe && styles.bubbleTextThem]}>{msg.content}</Text>
                    <Text style={[styles.bubbleTime, !isMe && styles.bubbleTimeThem]}>{timeAgo(msg.createdAt)}</Text>
                  </View>
                </View>
              );
            }}
            ListFooterComponent={
              typing ? (
                <View style={styles.typingRow}>
                  <Text style={styles.typingDot}>•••</Text>
                  <Text style={styles.typingText}>typing</Text>
                </View>
              ) : null
            }
          />

          {/* Input */}
          <View style={styles.inputRow}>
            <TouchableOpacity onPress={pickAndSendImage} style={styles.imageBtn}>
              <Ionicons name="image-outline" size={22} color="#73897a" />
            </TouchableOpacity>
            <TextInput
              value={input}
              onChangeText={(v) => {
                setInput(v);
                if (selectedOrder) {
                  v.length > 0
                    ? emitTypingStart(selectedOrder._id)
                    : emitTypingStop(selectedOrder._id);
                }
              }}
              placeholder="Type a message…"
              placeholderTextColor="#73897a"
              style={styles.chatInput}
            />
            <TouchableOpacity onPress={sendMessage} style={styles.sendBtn}>
              <Ionicons name="send" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.listHeader}>
        <Text style={styles.listTitle}>Messages</Text>
      </View>
      {isLoading ? (
        <ChatListSkeleton />
      ) : activeOrders.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="chatbubbles-outline" size={40} color="#d4e8da" />
          </View>
          <Text style={styles.emptyTitle}>No conversations yet</Text>
          <Text style={styles.emptyText}>Accept or post an order to start chatting</Text>
        </View>
      ) : (
        <FlatList
          data={activeOrders}
          keyExtractor={(item) => item._id}
          renderItem={({ item: order }) => {
            const other =
              order.userId._id === user?._id ? order.assignedTo : order.userId;
            return (
              <TouchableOpacity
                onPress={() => openThread(order)}
                style={styles.convItem}
                activeOpacity={0.85}
              >
                <Avatar name={other?.name || '?'} size={46} />
                <View style={styles.convInfo}>
                  <Text style={styles.convName}>{other?.name || 'Unknown'}</Text>
                  <Text style={styles.convOrder} numberOfLines={1}>{order.description}</Text>
                </View>
                  <Ionicons name="chevron-forward" size={18} color="#73897a" />
              </TouchableOpacity>
            );
          }}
          ItemSeparatorComponent={() => (
            <View style={{ height: 1, backgroundColor: '#d4e8da' }} />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f0faf4' },
  flex: { flex: 1 },
  listHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#d4e8da',
  },
  listTitle: { fontSize: 20, fontWeight: '800', color: '#182a1e' },
  empty: { alignItems: 'center', paddingTop: 80, gap: 8 },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#e6f4ec',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#182a1e' },
  emptyText: { fontSize: 13, color: '#73897a', textAlign: 'center' },
  convItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  convInfo: { flex: 1 },
  convName: { fontSize: 14, fontWeight: '700', color: '#182a1e' },
  convOrder: { fontSize: 12, color: '#73897a', marginTop: 2 },
  // Thread
  threadHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#d4e8da',
    gap: 10,
  },
  backBtn: { padding: 4 },
  threadInfo: { flex: 1 },
  threadName: { fontSize: 14, fontWeight: '700', color: '#182a1e' },
  threadOrder: { fontSize: 11, color: '#73897a' },
  messageList: { padding: 14, gap: 10, flexGrow: 1 },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 6 },
  msgRowMe: { flexDirection: 'row-reverse' },
  bubble: {
    maxWidth: '75%',
    borderRadius: 16,
    padding: 10,
    gap: 2,
  },
  bubbleMe: {
    backgroundColor: '#0c8a57',
    borderBottomRightRadius: 4,
  },
  bubbleThem: {
    backgroundColor: '#e6f4ec',
    borderBottomLeftRadius: 4,
  },
  bubbleText: { fontSize: 14, color: '#fff' },
  bubbleTextThem: { color: '#182a1e' },
  bubbleTime: { fontSize: 10, color: 'rgba(255,255,255,0.7)', textAlign: 'right' },
  bubbleTimeThem: { color: '#73897a' },
  systemMsg: {
    textAlign: 'center',
    fontSize: 11,
    color: '#73897a',
    paddingVertical: 6,
  },
  typingRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 14 },
  typingDot: { fontSize: 20, color: '#73897a', letterSpacing: 2 },
  typingText: { fontSize: 11, color: '#73897a' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#d4e8da',
    backgroundColor: '#ffffff',
  },
  chatInput: {
    flex: 1,
    backgroundColor: '#f0faf4',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#d4e8da',
    color: '#182a1e',
    fontSize: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
  },
  imageBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e6f4ec',
    alignItems: 'center',
    justifyContent: 'center',
  },
  msgImage: {
    width: 180,
    height: 180,
    borderRadius: 12,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0c8a57',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
