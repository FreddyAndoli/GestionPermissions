import { Router } from 'express';
import axios from 'axios';
import { db } from '../config/db';
import { userPreferences, leaveRequests, users, auditLogs } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { approveLeave, rejectLeave } from '../services/leaves.service';
import { sendNotification } from '../services/notifications.service';
import { logger } from '../utils/logger';

const router = Router();

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

// Bot info endpoint for QR code generation
router.get('/bot-info', async (_req, res) => {
  try {
    if (!BOT_TOKEN) {
      res.status(503).json({ error: 'Telegram bot not configured' });
      return;
    }
    const { data } = await axios.get(`https://api.telegram.org/bot${BOT_TOKEN}/getMe`);
    if (!data.ok) {
      res.status(502).json({ error: 'Failed to fetch bot info' });
      return;
    }
    res.json({ username: data.result.username });
  } catch (err) {
    logger.error('Telegram bot info error', { error: err });
    res.status(502).json({ error: 'Failed to fetch bot info' });
  }
});

// Telegram webhook endpoint
router.post('/webhook', async (req, res) => {
  try {
    const { message, callback_query } = req.body;

    // Handle /start command to link account
    if (message?.text?.startsWith('/start')) {
      const userId = message.text.split(' ')[1];
      if (userId) {
        await db.update(userPreferences)
          .set({ telegramChatId: String(message.chat.id) })
          .where(eq(userPreferences.userId, parseInt(userId)));

        await sendNotification(parseInt(userId), 'telegram.linked', {
          title: 'Telegram lie',
          message: 'Votre compte Telegram est maintenant lie.'
        });
      }
      res.json({ ok: true });
      return;
    }

    // Handle inline button callbacks
    if (callback_query) {
      const data = callback_query.data;
      if (!data) { res.json({ ok: true }); return; }

      const [action, leaveIdStr] = data.split(':');
      const leaveId = parseInt(leaveIdStr);

      if (action === 'approve_leave') {
        // Find user by telegram chat id
        const [prefs] = await db
          .select()
          .from(userPreferences)
          .where(eq(userPreferences.telegramChatId, String(callback_query.from.id)))
          .limit(1);

        if (!prefs) {
          res.json({ ok: true });
          return;
        }

        await approveLeave(leaveId, prefs.userId, 'Approuve via Telegram');

        // Answer callback to remove loading state
        res.json({
          method: 'answerCallbackQuery',
          callback_query_id: callback_query.id,
          text: 'Demande approuvee !'
        });
        return;
      }

      if (action === 'reject_leave') {
        const [prefs] = await db
          .select()
          .from(userPreferences)
          .where(eq(userPreferences.telegramChatId, String(callback_query.from.id)))
          .limit(1);

        if (!prefs) {
          res.json({ ok: true });
          return;
        }

        await rejectLeave(leaveId, prefs.userId, 'Rejete via Telegram');

        res.json({
          method: 'answerCallbackQuery',
          callback_query_id: callback_query.id,
          text: 'Demande rejetee.'
        });
        return;
      }
    }

    res.json({ ok: true });
  } catch (err) {
    logger.error('Telegram webhook error', { error: err });
    res.json({ ok: true }); // Always return 200 to Telegram
  }
});

export default router;
