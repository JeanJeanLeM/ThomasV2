/**
 * Edge Function: send-notifications
 * 
 * Appelée par un cron toutes les 5 minutes (ou via HTTP).
 * - Récupère les notifications actives dont l'heure correspond à l'heure courante (±2 min)
 * - Vérifie que le jour de la semaine est dans selected_days
 * - Récupère les push tokens actifs des utilisateurs concernés
 * - Envoie les push notifications via l'API Expo Push
 * - Logue les envois dans notification_logs
 * 
 * Cron Supabase (pg_cron): '*/5 * * * *'
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const EXPO_PUSH_RECEIPT_URL = 'https://exp.host/--/api/v2/push/getReceipts';

interface PushMessage {
  to: string;
  title: string;
  body: string;
  sound?: 'default' | null;
  badge?: number;
  channelId?: string;
  data?: Record<string, unknown>;
}

interface ExpoPushTicket {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: { error?: string };
}

Deno.serve(async (req: Request) => {
  // Allow manual trigger via POST or cron via GET
  if (req.method !== 'POST' && req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Heure courante en UTC
  const now = new Date();
  const currentHour = now.getUTCHours();
  const currentMinute = now.getUTCMinutes();
  // Jour de la semaine JS: 0=Dimanche, 1=Lundi ... 6=Samedi (même convention que selected_days)
  const currentDayOfWeek = now.getUTCDay();

  // Fenêtre de ±2 minutes pour éviter les ratés de cron
  const windowMinutes = [
    (currentMinute - 2 + 60) % 60,
    (currentMinute - 1 + 60) % 60,
    currentMinute,
    (currentMinute + 1) % 60,
    (currentMinute + 2) % 60,
  ];

  // Construire les time strings à chercher (format "HH:MM:SS")
  const targetTimes = windowMinutes.map(min =>
    `${currentHour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}:00`
  );

  console.log(`🕐 Heure courante UTC: ${currentHour}:${currentMinute} | Jour: ${currentDayOfWeek}`);
  console.log(`🔍 Fenêtre horaire: ${targetTimes.join(', ')}`);

  // Récupérer les notifications actives qui correspondent à cette plage horaire
  const { data: notifications, error: notifError } = await supabase
    .from('notifications')
    .select(`
      id,
      user_id,
      farm_id,
      title,
      message,
      reminder_time,
      selected_days,
      notification_type
    `)
    .eq('is_active', true)
    .in('reminder_time', targetTimes);

  if (notifError) {
    console.error('❌ Erreur récupération notifications:', notifError);
    return new Response(JSON.stringify({ error: notifError.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!notifications || notifications.length === 0) {
    console.log('ℹ️ Aucune notification à envoyer pour cette plage horaire');
    return new Response(JSON.stringify({ sent: 0, message: 'Aucune notification à envoyer' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Filtrer par jour de la semaine
  const dueNotifications = notifications.filter((n: any) => {
    const days: number[] = n.selected_days || [];
    return days.includes(currentDayOfWeek);
  });

  console.log(`📋 ${dueNotifications.length} notification(s) à envoyer après filtre jour`);

  if (dueNotifications.length === 0) {
    return new Response(JSON.stringify({ sent: 0, message: 'Aucune notification pour ce jour' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Récupérer les push tokens actifs pour les utilisateurs concernés
  const userIds = [...new Set(dueNotifications.map((n: any) => n.user_id))];

  const { data: pushTokens, error: tokenError } = await supabase
    .from('push_tokens')
    .select('user_id, token, platform')
    .in('user_id', userIds)
    .eq('is_active', true);

  if (tokenError) {
    console.error('❌ Erreur récupération push tokens:', tokenError);
    return new Response(JSON.stringify({ error: tokenError.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!pushTokens || pushTokens.length === 0) {
    console.log('ℹ️ Aucun push token actif trouvé pour ces utilisateurs');
    return new Response(JSON.stringify({ sent: 0, message: 'Aucun token actif' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Construire la map user_id → tokens
  const tokensByUser: Record<string, string[]> = {};
  for (const pt of pushTokens as any[]) {
    if (!tokensByUser[pt.user_id]) tokensByUser[pt.user_id] = [];
    tokensByUser[pt.user_id].push(pt.token);
  }

  // Construire les messages à envoyer
  const messages: PushMessage[] = [];
  const notificationMap: Record<string, string> = {}; // token → notification_id

  for (const notification of dueNotifications as any[]) {
    const tokens = tokensByUser[notification.user_id] || [];
    for (const token of tokens) {
      // Vérifier que le token est un Expo push token valide
      if (!token.startsWith('ExponentPushToken[')) continue;

      messages.push({
        to: token,
        title: notification.title,
        body: notification.message,
        sound: 'default',
        channelId: 'thomas-reminders',
        data: {
          notificationId: notification.id,
          farmId: notification.farm_id,
        },
      });
      notificationMap[token] = notification.id;
    }
  }

  if (messages.length === 0) {
    console.log('ℹ️ Aucun message valide à envoyer (tokens invalides?)');
    return new Response(JSON.stringify({ sent: 0, message: 'Aucun token Expo valide' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  console.log(`📤 Envoi de ${messages.length} message(s) push...`);

  // Envoyer par batch de 100 (limite Expo)
  const BATCH_SIZE = 100;
  const results: { sent: number; errors: number; tickets: any[] } = {
    sent: 0,
    errors: 0,
    tickets: [],
  };

  for (let i = 0; i < messages.length; i += BATCH_SIZE) {
    const batch = messages.slice(i, i + BATCH_SIZE);

    try {
      const response = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(batch),
      });

      const responseData = await response.json();
      const tickets: ExpoPushTicket[] = responseData.data || [];

      // Loguer les résultats par notification
      const logInserts = tickets.map((ticket, idx) => {
        const token = batch[idx].to;
        const notificationId = notificationMap[token];
        const status = ticket.status === 'ok' ? 'sent' : 'error';

        if (ticket.status === 'ok') {
          results.sent++;
        } else {
          results.errors++;
          console.error(`❌ Erreur push pour token ${token.substring(0, 20)}...:`, ticket.message);
        }

        results.tickets.push({ token: token.substring(0, 30), status, ticketId: ticket.id });

        return {
          notification_id: notificationId,
          status,
          sent_at: new Date().toISOString(),
          error_message: ticket.status === 'error' ? ticket.message : null,
          metadata: { ticketId: ticket.id, expoPushDetails: ticket.details },
        };
      });

      // Insérer les logs
      if (logInserts.length > 0) {
        const { error: logError } = await supabase
          .from('notification_logs')
          .insert(logInserts);

        if (logError) {
          console.error('⚠️ Erreur insertion logs:', logError);
        }
      }

    } catch (error) {
      console.error('❌ Erreur lors de l\'envoi du batch push:', error);
      results.errors += batch.length;
    }
  }

  console.log(`✅ Terminé: ${results.sent} envoyées, ${results.errors} erreurs`);

  return new Response(
    JSON.stringify({
      sent: results.sent,
      errors: results.errors,
      total: messages.length,
      timestamp: now.toISOString(),
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );
});
