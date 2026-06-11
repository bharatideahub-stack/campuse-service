import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
<<<<<<< HEAD
  FlatList,
  Platform,
=======
>>>>>>> origin/main
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import * as Haptics from 'expo-haptics';
import { useAuthStore } from '@/store/authStore';
import { walletAPI } from '@/lib/api';
import { WalletTransaction } from '@/types';
import { formatCurrency, timeAgo } from '@/lib/utils';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import Toast from 'react-native-toast-message';

const QUICK_AMOUNTS = [50, 100, 200, 500];

export default function WalletScreen() {
  const { user } = useAuthStore();
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [balance, setBalance] = useState(user?.walletBalance ?? 0);
  const [amount, setAmount] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    loadWallet();
  }, []);

  const loadWallet = async () => {
    try {
      const { data } = await walletAPI.get();
      setBalance(data.wallet.balance);
      setTransactions(data.wallet.transactions || []);
    } catch {}
  };

  const handleAddFunds = async () => {
    const parsed = parseFloat(amount);
    if (!parsed || parsed < 10) {
      Toast.show({ type: 'error', text1: 'Minimum top-up is ₹10' });
      return;
    }
    setIsAdding(true);
    try {
      const { data } = await walletAPI.addFunds(parsed);
      setBalance(data.balance);
      setAmount('');
      await loadWallet();
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Toast.show({ type: 'success', text1: `₹${parsed} added to wallet!` });
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to add funds' });
    }
    setIsAdding(false);
  };

  const openUPI = (app: 'phonepe' | 'gpay' | 'paytm' | 'generic') => {
    const parsed = parseFloat(amount);
    if (!parsed || parsed < 10) {
      Toast.show({ type: 'error', text1: 'Enter an amount first (min ₹10)' });
      return;
    }
    const upiId = 'campushub@upi';
    const name = encodeURIComponent('CampusHub Wallet');
    const note = encodeURIComponent('CampusHub wallet top-up');
    const baseUPI = `upi://pay?pa=${upiId}&pn=${name}&am=${parsed}&cu=INR&tn=${note}`;

    const urls: Record<string, string> = {
      phonepe: `phonepe://${baseUPI.slice(6)}`,
      gpay: `tez://upi/pay?pa=${upiId}&pn=${name}&am=${parsed}&cu=INR`,
      paytm: `paytmmp://${baseUPI.slice(6)}`,
      generic: baseUPI,
    };

    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Linking.openURL(urls[app]).catch(() => {
      Linking.openURL(baseUPI).catch(() =>
        Toast.show({ type: 'error', text1: 'No UPI app installed' })
      );
    });
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      {/* Balance card */}
      <Card shadow style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Total Balance</Text>
        <Text style={styles.balanceValue}>{formatCurrency(balance)}</Text>
        <View style={styles.walletIcon}>
          <Ionicons name="wallet" size={32} color="#0c8a57" />
        </View>
      </Card>

      {/* Add funds */}
      <Card shadow>
        <Text style={styles.sectionTitle}>Add Funds</Text>
        <View style={styles.quickAmounts}>
          {QUICK_AMOUNTS.map((q) => (
            <TouchableOpacity
              key={q}
              onPress={() => setAmount(q.toString())}
              style={[styles.quickBtn, amount === q.toString() && styles.quickBtnActive]}
            >
              <Text style={[styles.quickText, amount === q.toString() && styles.quickTextActive]}>
                ₹{q}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <TextInput
          value={amount}
          onChangeText={setAmount}
          placeholder="Or enter custom amount"
          placeholderTextColor="#73897a"
          keyboardType="numeric"
          style={styles.amountInput}
        />
        <Button
          title={isAdding ? 'Adding…' : 'Add via CampusHub →'}
          onPress={handleAddFunds}
          loading={isAdding}
          fullWidth
          style={{ marginTop: 12 }}
        />
        {/* UPI Pay buttons */}
        <Text style={styles.upiLabel}>Pay directly via UPI</Text>
        <View style={styles.upiRow}>
          {[
            { key: 'phonepe', label: 'PhonePe', icon: 'phone-portrait-outline', color: '#7c3aed' },
            { key: 'gpay',    label: 'GPay',    icon: 'logo-google',            color: '#4285f4' },
            { key: 'paytm',   label: 'Paytm',   icon: 'wallet-outline',         color: '#00baf2' },
            { key: 'generic', label: 'Any UPI', icon: 'qr-code-outline',        color: '#0c8a57' },
          ].map((app) => (
            <TouchableOpacity
              key={app.key}
              onPress={() => openUPI(app.key as any)}
              style={styles.upiBtn}
            >
              <View style={[styles.upiIconWrap, { backgroundColor: app.color + '18' }]}>
                <Ionicons name={app.icon as any} size={20} color={app.color} />
              </View>
              <Text style={styles.upiAppLabel}>{app.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Card>

      {/* Transactions */}
      <Card shadow>
        <Text style={styles.sectionTitle}>Transactions</Text>
        {transactions.length === 0 ? (
          <Text style={styles.empty}>No transactions yet</Text>
        ) : (
          transactions.map((tx) => (
            <View key={tx._id} style={styles.txItem}>
              <View
                style={[
                  styles.txIcon,
                  { backgroundColor: tx.type === 'credit' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)' },
                ]}
              >
                <Ionicons
                  name={tx.type === 'credit' ? 'arrow-down' : 'arrow-up'}
                  size={16}
                  color={tx.type === 'credit' ? '#4ade80' : '#f87171'}
                />
              </View>
              <View style={styles.txInfo}>
                <Text style={styles.txDesc}>{tx.description}</Text>
                <Text style={styles.txTime}>{timeAgo(tx.createdAt)}</Text>
              </View>
              <Text
                style={[
                  styles.txAmount,
                  { color: tx.type === 'credit' ? '#4ade80' : '#f87171' },
                ]}
              >
                {tx.type === 'credit' ? '+' : '-'}{formatCurrency(tx.amount)}
              </Text>
            </View>
          ))
        )}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#f0faf4' },
  container: { padding: 16, gap: 14, paddingBottom: 40 },
  balanceCard: {
    alignItems: 'center',
    padding: 24,
    gap: 6,
    position: 'relative',
  },
  balanceLabel: { fontSize: 12, color: '#73897a', fontWeight: '600' },
  balanceValue: { fontSize: 36, fontWeight: '800', color: '#182a1e' },
  walletIcon: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#182a1e', marginBottom: 12 },
  quickAmounts: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  quickBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d4e8da',
    alignItems: 'center',
  },
  quickBtnActive: { backgroundColor: '#e0f5ec', borderColor: '#0c8a57' },
  quickText: { fontSize: 13, fontWeight: '700', color: '#73897a' },
  quickTextActive: { color: '#0c8a57' },
  upiLabel: { fontSize: 12, color: '#73897a', fontWeight: '600', marginTop: 16, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  upiRow: { flexDirection: 'row', gap: 10 },
  upiBtn: { flex: 1, alignItems: 'center', gap: 6 },
  upiIconWrap: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  upiAppLabel: { fontSize: 11, color: '#182a1e', fontWeight: '600' },
  amountInput: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#d4e8da',
    color: '#182a1e',
    fontSize: 14,
    padding: 12,
  },
  empty: { fontSize: 13, color: '#73897a', textAlign: 'center', padding: 20 },
  txItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#d4e8da',
  },
  txIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txInfo: { flex: 1 },
  txDesc: { fontSize: 13, fontWeight: '600', color: '#182a1e' },
  txTime: { fontSize: 11, color: '#73897a', marginTop: 2 },
  txAmount: { fontSize: 14, fontWeight: '800' },
});
