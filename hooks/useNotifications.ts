import { useState, useEffect } from 'react';
import { toast } from 'sonner';

interface NotificationPermission {
  granted: boolean;
  denied: boolean;
  prompt: boolean;
}

export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>({
    granted: false,
    denied: false,
    prompt: true
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if ('Notification' in window) {
      const currentPermission = Notification.permission;
      setPermission({
        granted: currentPermission === 'granted',
        denied: currentPermission === 'denied',
        prompt: currentPermission === 'default'
      });
    }
  }, []);

  const requestPermission = async () => {
    if (!('Notification' in window)) {
      toast.error('Seu navegador não suporta notificações');
      return false;
    }

    if (!('serviceWorker' in navigator)) {
      toast.error('Seu navegador não suporta Service Workers');
      return false;
    }

    setIsLoading(true);

    try {
      const result = await Notification.requestPermission();

      setPermission({
        granted: result === 'granted',
        denied: result === 'denied',
        prompt: result === 'default'
      });

      if (result === 'granted') {
        toast.success('Notificações ativadas!');
        await subscribeUserToPush();
        return true;
      } else if (result === 'denied') {
        toast.error('Você negou as notificações. Ative nas configurações do navegador.');
        return false;
      }

      return false;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      toast.error('Erro ao solicitar permissão para notificações');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const subscribeUserToPush = async () => {
    try {
      // Register service worker if not already registered
      let registration = await navigator.serviceWorker.getRegistration();

      if (!registration) {
        registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/'
        });
        console.log('Service Worker registered:', registration);
      }

      // Wait for service worker to be ready
      await navigator.serviceWorker.ready;

      // Check if we already have a subscription
      const existingSubscription = await registration.pushManager.getSubscription();

      if (existingSubscription) {
        console.log('Already subscribed to push notifications');
        // Send existing subscription to server
        await sendSubscriptionToServer(existingSubscription);
        return;
      }

      // Get VAPID public key from environment
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

      if (!vapidPublicKey) {
        console.warn('VAPID public key not configured. Push notifications will not work.');
        toast.error('Notificações push não configuradas');
        return;
      }

      // Subscribe to push notifications
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      });

      console.log('Push subscription created:', subscription);

      // Send subscription to server
      await sendSubscriptionToServer(subscription);

      toast.success('Você está inscrito para receber notificações!');
    } catch (error) {
      console.error('Error subscribing to push:', error);
      toast.error('Erro ao se inscrever para notificações');
    }
  };

  const sendSubscriptionToServer = async (subscription: PushSubscription) => {
    try {
      const response = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send subscription to server');
      }

      console.log('Subscription sent to server successfully');
    } catch (error) {
      console.error('Error sending subscription to server:', error);
    }
  };

  const unsubscribe = async () => {
    try {
      const registration = await navigator.serviceWorker.getRegistration();

      if (!registration) {
        return;
      }

      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();
        toast.success('Você cancelou as notificações push');

        setPermission({
          granted: false,
          denied: false,
          prompt: true
        });
      }
    } catch (error) {
      console.error('Error unsubscribing:', error);
      toast.error('Erro ao cancelar notificações');
    }
  };

  return {
    permission,
    isLoading,
    requestPermission,
    unsubscribe,
    isSupported: 'Notification' in window && 'serviceWorker' in navigator
  };
}

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}
