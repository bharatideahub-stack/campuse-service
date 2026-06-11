import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { authAPI } from '@/lib/api';
import Constants from 'expo-constants';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export function usePushNotifications() {
  const router = useRouter();
  const notifResponseListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    registerForPushNotificationsAsync();

    notifResponseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const orderId = response.notification.request.content.data?.orderId as string | undefined;
        if (orderId) {
          router.push(`/orders/${orderId}` as any);
        }
      }
    );

    return () => {
      notifResponseListener.current?.remove();
    };
  }, []);
}

async function registerForPushNotificationsAsync() {
  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') return;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'CampusHub',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#0c8a57',
    });
  }

  try {
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;
    if (projectId) {
      const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
      await authAPI.updateFcmToken(tokenData.data).catch(() => {});
    }
  } catch {
    // Push token not available in this environment
  }
}

/** Call this from socket listeners to schedule a local notification */
export async function scheduleLocalNotification(
  title: string,
  body: string,
  data?: Record<string, unknown>
) {
  if (Platform.OS === 'web') return;
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title, body, data: data ?? {}, sound: 'default' },
      trigger: null,
    });
  } catch {}
}
