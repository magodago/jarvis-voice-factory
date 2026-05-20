import { useState, useEffect, useCallback } from 'react';

const VAPID_PUBLIC_KEY = 'BIF__PV42c5OXrB62dD9F8zyKd9xlmtIA6WqfqKWpEvl8CIEnB9txqmYycEGnU_QvXkm7Zj0wl15eY4WNvjpkjY';

export default function usePushNotifications() {
  const [pushSupported, setPushSupported] = useState(false);
  const [pushSubscribed, setPushSubscribed] = useState(false);

  useEffect(() => {
    setPushSupported('serviceWorker' in navigator && 'PushManager' in window);
  }, []);

  const subscribe = useCallback(async () => {
    if (!pushSupported) return false;
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlB64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }
      await fetch('/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription }),
      });
      setPushSubscribed(true);
      return true;
    } catch (err) {
      console.error('[Push] Subscription failed:', err);
      return false;
    }
  }, [pushSupported]);

  // Auto-subscribe on mount
  useEffect(() => {
    if (pushSupported) subscribe();
  }, [pushSupported, subscribe]);

  return { pushSupported, pushSubscribed, subscribe };
}

function urlB64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return new Uint8Array([...rawData].map(char => char.charCodeAt(0)));
}
