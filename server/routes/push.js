import { Router } from 'express';
import webpush from 'web-push';

const router = Router();

// Configure web-push
webpush.setVapidDetails(
  'mailto:dortizs76@gmail.com',
  process.env.VAPID_PUBLIC_KEY || '',
  process.env.VAPID_PRIVATE_KEY || ''
);

// In-memory subscription store (use DB in production)
const subscriptions = new Map();

/**
 * POST /push/subscribe
 * Save browser push subscription
 */
router.post('/subscribe', (req, res) => {
  const { subscription, deviceId } = req.body;
  if (!subscription?.endpoint) {
    return res.status(400).json({ error: 'Invalid subscription' });
  }
  const id = deviceId || subscription.endpoint;
  subscriptions.set(id, { subscription, createdAt: new Date().toISOString() });
  console.log(`[Push] Subscription added: ${id.slice(0, 30)}...`);
  res.json({ status: 'subscribed', id });
});

/**
 * POST /push/send
 * Send push notification to all subscribed devices
 */
router.post('/send', async (req, res) => {
  const { title, body, url, tag } = req.body;
  const payload = JSON.stringify({ title: title || 'JARVIS', body: body || '', url: url || '/', tag });

  const results = [];
  for (const [id, sub] of subscriptions) {
    try {
      await webpush.sendNotification(sub.subscription, payload);
      results.push({ id, status: 'sent' });
    } catch (err) {
      if (err.statusCode === 410 || err.statusCode === 404) {
        subscriptions.delete(id);
        results.push({ id, status: 'removed' });
      } else {
        results.push({ id, status: 'error', message: err.message });
      }
    }
  }

  res.json({ sent: results.filter(r => r.status === 'sent').length, results });
});

export function sendPushNotification(title, body, url) {
  const payload = JSON.stringify({ title, body, url });
  for (const [id, sub] of subscriptions) {
    webpush.sendNotification(sub.subscription, payload).catch(() => {
      subscriptions.delete(id);
    });
  }
}

export default router;
