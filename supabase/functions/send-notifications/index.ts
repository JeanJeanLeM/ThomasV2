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
 * Cron Supabase (pg_cron): toutes les 5 minutes
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

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
  const currentMinute = now.getUTCMinutes();
  // Jour de la semaine JS: 0=Dimanche, 1=Lundi ... 6=Samedi (même convention que selected_days)
  const currentDayOfWeek = now.getUTCDay();
  const todayUtc = now.toISOString().slice(0, 10);

  // Fenêtre de ±2 minutes pour éviter les ratés de cron
  const windowDates = [-2, -1, 0, 1, 2].map(offset => {
    const d = new Date(now);
    d.setUTCMinutes(currentMinute + offset, 0, 0);
    return d;
  });

  // Construire les time strings à chercher (format "HH:MM:SS")
  const targetTimes = windowDates.map(d =>
    `${d.getUTCHours().toString().padStart(2, '0')}:${d.getUTCMinutes().toString().padStart(2, '0')}:00`
  );

  console.log(`🕐 Heure courante UTC: ${now.getUTCHours()}:${currentMinute} | Jour: ${currentDayOfWeek}`);
  console.log(`🔍 Fenêtre horaire: ${targetTimes.join(', ')}`);

  const vacationCache = new Map<string, boolean>();
  const isVacationPaused = async (userId: string, farmId: number) => {
    const key = `${userId}:${farmId}`;
    if (vacationCache.has(key)) return vacationCache.get(key)!;

    const { data, error } = await supabase
      .from('activity_streak_config')
      .select('vacation_enabled, vacation_start, vacation_end')
      .eq('user_id', userId)
      .eq('farm_id', farmId)
      .maybeSingle();

    if (error || !data) {
      vacationCache.set(key, false);
      return false;
    }

    const paused = Boolean(
      data.vacation_enabled &&
      data.vacation_start &&
      data.vacation_end &&
      todayUtc >= data.vacation_start &&
      todayUtc <= data.vacation_end
    );

    vacationCache.set(key, paused);
    return paused;
  };

  const getActiveTokens = async (userId: string): Promise<string[]> => {
    const { data, error } = await supabase
      .from('push_tokens')
      .select('token')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (error || !data) return [];
    return (data as any[])
      .map(t => t.token as string)
      .filter(token => token?.startsWith('ExponentPushToken['));
  };

  const sendExpoMessages = async (messages: PushMessage[]) => {
    const BATCH_SIZE = 100;
    let sent = 0;
    let errors = 0;
    const tickets: ExpoPushTicket[] = [];

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
        const batchTickets: ExpoPushTicket[] = responseData.data || [];
        tickets.push(...batchTickets);
        sent += batchTickets.filter(ticket => ticket.status === 'ok').length;
        errors += batchTickets.filter(ticket => ticket.status === 'error').length;
      } catch (error) {
        console.error('❌ Erreur Expo Push:', error);
        errors += batch.length;
      }
    }

    return { sent, errors, tickets };
  };

  const results: { sent: number; errors: number; tickets: any[] } = {
    sent: 0,
    errors: 0,
    tickets: [],
  };

  // Partie legacy: notifications personnalisées encore présentes en DB.
  const { data: notifications, error: notifError } = await supabase
    .from('notifications')
    .select('id, user_id, farm_id, title, message, reminder_time, selected_days, notification_type')
    .eq('is_active', true)
    .in('reminder_time', targetTimes);

  if (notifError) {
    console.error('❌ Erreur récupération notifications:', notifError);
  } else {
    const dueNotifications = (notifications || []).filter((n: any) => {
      const days: number[] = n.selected_days || [];
      return days.includes(currentDayOfWeek);
    });

    const legacyMessages: PushMessage[] = [];
    const legacyMap: Record<string, any> = {};

    for (const notification of dueNotifications as any[]) {
      const tokens = await getActiveTokens(notification.user_id);
      for (const token of tokens) {
        legacyMessages.push({
          to: token,
          title: notification.title,
          body: notification.message,
          sound: 'default',
          channelId: 'thomas-reminders',
          data: { notificationId: notification.id, farmId: notification.farm_id },
        });
        legacyMap[token] = notification;
      }
    }

    if (legacyMessages.length > 0) {
      const legacyResult = await sendExpoMessages(legacyMessages);
      results.sent += legacyResult.sent;
      results.errors += legacyResult.errors;
      results.tickets.push(...legacyResult.tickets);

      const logInserts = legacyResult.tickets.map((ticket, idx) => {
        const message = legacyMessages[idx];
        if (!message) return null;
        const token = message.to;
        const notification = legacyMap[token];
        return {
          notification_id: notification?.id,
          user_id: notification?.user_id,
          status: ticket.status === 'ok' ? 'sent' : 'failed',
          sent_at: new Date().toISOString(),
          error_message: ticket.status === 'error' ? ticket.message : null,
          metadata: { ticketId: ticket.id, expoPushDetails: ticket.details },
        };
      }).filter((row): row is NonNullable<typeof row> => Boolean(row?.notification_id && row.user_id));

      if (logInserts.length > 0) {
        const { error: logError } = await supabase.from('notification_logs').insert(logInserts);
        if (logError) console.error('⚠️ Erreur insertion logs:', logError);
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PARTIE 2 : Notifications d'inactivité
  // Vérifie si des utilisateurs n'ont pas renseigné de tâches/observations
  // la veille (sur un jour "attendu"), et envoie un rappel si c'est le cas.
  // ─────────────────────────────────────────────────────────────────────────

  const inactivityResults = { sent: 0, skipped: 0 };

  // Récupérer les configs actives dont l'heure correspond à la plage courante
  const { data: inactivityConfigs, error: inactivErr } = await supabase
    .from('inactivity_notification_config')
    .select('id, user_id, farm_id, active_days, send_time')
    .eq('is_active', true)
    .in('send_time', targetTimes);

  if (inactivErr) {
    console.error('❌ Erreur récupération inactivity configs:', inactivErr);
  } else if (inactivityConfigs && inactivityConfigs.length > 0) {
    console.log(`🔔 ${inactivityConfigs.length} config(s) inactivité à évaluer`);

    // Hier en UTC
    const yesterday = new Date(now);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    const yesterdayDow = yesterday.getUTCDay(); // 0=Dim … 6=Sam
    const yesterdayStart = new Date(yesterday);
    yesterdayStart.setUTCHours(0, 0, 0, 0);
    const yesterdayEnd = new Date(yesterday);
    yesterdayEnd.setUTCHours(23, 59, 59, 999);

    for (const cfg of inactivityConfigs as any[]) {
      if (await isVacationPaused(cfg.user_id, cfg.farm_id)) {
        inactivityResults.skipped++;
        console.log(`⏸️ Farm ${cfg.farm_id}: rappel inactivité suspendu (vacances)`);
        continue;
      }

      // Hier était-il un jour "attendu" ?
      if (!cfg.active_days.includes(yesterdayDow)) {
        inactivityResults.skipped++;
        console.log(`⏭️  Farm ${cfg.farm_id}: hier (${yesterdayDow}) n'est pas un jour attendu`);
        continue;
      }

      // Y a-t-il eu des tâches ou observations hier ?
      const [{ count: taskCount }, { count: obsCount }] = await Promise.all([
        supabase
          .from('tasks')
          .select('id', { count: 'exact', head: true })
          .eq('farm_id', cfg.farm_id)
          .gte('created_at', yesterdayStart.toISOString())
          .lte('created_at', yesterdayEnd.toISOString())
          .then((r: { count: number | null }) => ({ count: r.count ?? 0 })),
        supabase
          .from('observations')
          .select('id', { count: 'exact', head: true })
          .eq('farm_id', cfg.farm_id)
          .gte('created_at', yesterdayStart.toISOString())
          .lte('created_at', yesterdayEnd.toISOString())
          .then((r: { count: number | null }) => ({ count: r.count ?? 0 })),
      ]);

      const total = (taskCount as number) + (obsCount as number);
      console.log(`📊 Farm ${cfg.farm_id}: ${total} action(s) hier`);

      if (total > 0) {
        inactivityResults.skipped++;
        continue;
      }

      const tokens = await getActiveTokens(cfg.user_id);

      if (tokens.length === 0) {
        inactivityResults.skipped++;
        continue;
      }

      const inactivityMessages: PushMessage[] = tokens
        .map((token: string) => ({
          to: token,
          title: '📋 Aucune tâche hier',
          body: "Vous n'avez renseigné aucune tâche ni observation hier. Pensez à mettre à jour votre exploitation !",
          sound: 'default' as const,
          channelId: 'thomas-reminders',
          data: { type: 'inactivity', farmId: cfg.farm_id },
        }));

      if (inactivityMessages.length === 0) {
        inactivityResults.skipped++;
        continue;
      }

      const sent = await sendExpoMessages(inactivityMessages);
      inactivityResults.sent += sent.sent;
      console.log(`✅ Inactivité Farm ${cfg.farm_id}: ${sent.sent} push envoyé(s)`);
    }
  }

  console.log(`✅ Terminé: ${results.sent} rappels + ${inactivityResults.sent} inactivité envoyés`);

  // ─────────────────────────────────────────────────────────────────────────
  // PARTIE 3 : Rappel tâches quotidiennes
  // Envoie un push simple à l'heure configurée, sur les jours choisis.
  // ─────────────────────────────────────────────────────────────────────────

  const dailyResults = { sent: 0, skipped: 0 };

  const { data: dailyConfigs, error: dailyErr } = await supabase
    .from('daily_reminder_config')
    .select('id, user_id, farm_id, active_days, send_time')
    .eq('is_active', true)
    .in('send_time', targetTimes);

  if (dailyErr) {
    console.error('❌ Erreur récupération daily reminder configs:', dailyErr);
  } else if (dailyConfigs && dailyConfigs.length > 0) {
    console.log(`🔔 ${dailyConfigs.length} rappel(s) quotidien(s) à envoyer`);

    for (const cfg of dailyConfigs as any[]) {
      if (await isVacationPaused(cfg.user_id, cfg.farm_id)) {
        dailyResults.skipped++;
        console.log(`⏸️ Farm ${cfg.farm_id}: rappel quotidien suspendu (vacances)`);
        continue;
      }

      if (!cfg.active_days.includes(currentDayOfWeek)) {
        dailyResults.skipped++;
        continue;
      }

      const tokens = await getActiveTokens(cfg.user_id);

      if (tokens.length === 0) {
        dailyResults.skipped++;
        continue;
      }

      const dailyMessages: PushMessage[] = tokens
        .map((token: string) => ({
          to: token,
          title: '📝 Rappel du jour',
          body: "Pensez à renseigner vos tâches et observations d'aujourd'hui dans Thomas !",
          sound: 'default' as const,
          channelId: 'thomas-reminders',
          data: { type: 'daily_reminder', farmId: cfg.farm_id },
        }));

      if (dailyMessages.length === 0) { dailyResults.skipped++; continue; }

      const sent = await sendExpoMessages(dailyMessages);
      dailyResults.sent += sent.sent;
      console.log(`✅ Daily reminder farm ${cfg.farm_id}: ${sent.sent} push envoyé(s)`);
    }
  }

  console.log(`✅ Bilan: rappels=${results.sent}, inactivité=${inactivityResults.sent}, quotidien=${dailyResults.sent}`);

  return new Response(
    JSON.stringify({
      reminders: { sent: results.sent, errors: results.errors, total: results.tickets.length },
      inactivity: inactivityResults,
      daily: dailyResults,
      timestamp: now.toISOString(),
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );
});
