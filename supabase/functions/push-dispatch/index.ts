// =====================================================================
// Supabase Edge Function: push-dispatch  (Deno runtime)
//
// SKELETON — provided for later activation. It is NOT deployed automatically.
// Deploy with:  supabase functions deploy push-dispatch
//
// What it does (server-side mirror of the client daily-sync):
//   1. Reads every user's unreleased `next_season` and `limbo` animes.
//   2. Checks each against the Jikan API.
//   3. When a continuation has now started/finished airing, it updates the row
//      (is_released / last_updated_at) and sends a Web Push notification to all
//      of that user's stored push_subscriptions.
//
// Secrets required (set via `supabase secrets set ...`, never in the client):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  (provided automatically in prod)
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (e.g. mailto:you@example.com)
//
// Scheduling (run daily): use pg_cron + pg_net to POST this function's URL, e.g.
//   select cron.schedule('push-dispatch-daily', '0 9 * * *', $$
//     select net.http_post(
//       url := 'https://<project>.functions.supabase.co/push-dispatch',
//       headers := jsonb_build_object('Authorization', 'Bearer <anon-or-cron-secret>')
//     );
//   $$);
// =====================================================================

import { createClient } from 'jsr:@supabase/supabase-js@2';
// A Deno-compatible web-push implementation, e.g.:
// import webpush from 'npm:web-push';

const JIKAN = 'https://api.jikan.moe/v4';
const AIRED = ['Currently Airing', 'Finished Airing'];

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // NOTE: configure web-push with the VAPID secrets here, e.g.
  // webpush.setVapidDetails(
  //   Deno.env.get('VAPID_SUBJECT')!,
  //   Deno.env.get('VAPID_PUBLIC_KEY')!,
  //   Deno.env.get('VAPID_PRIVATE_KEY')!,
  // );

  // 1) Candidate rows across ALL users (service role bypasses RLS on purpose).
  const { data: rows, error } = await supabase
    .from('animes')
    .select('id, user_id, title, mal_id, category, status, is_released')
    .or('and(category.eq.next_season,is_released.eq.false),status.eq.limbo')
    .not('mal_id', 'is', null);

  if (error) return new Response(`db error: ${error.message}`, { status: 500 });

  let released = 0;
  for (const row of rows ?? []) {
    try {
      const res = await fetch(`${JIKAN}/anime/${row.mal_id}`);
      if (res.status === 429) {
        await new Promise((r) => setTimeout(r, 1500));
        continue;
      }
      const json = await res.json();
      const status = json?.data?.status as string | undefined;
      if (status && AIRED.includes(status)) {
        await supabase
          .from('animes')
          .update({ is_released: true, last_updated_at: new Date().toISOString() })
          .eq('id', row.id);
        released++;
        await notifyUser(supabase, row.user_id, row.title);
      }
      // gentle throttle to respect Jikan rate limits
      await new Promise((r) => setTimeout(r, 400));
    } catch (_err) {
      // keep going; a single failing item must not abort the whole run
    }
  }

  return new Response(JSON.stringify({ checked: rows?.length ?? 0, released }), {
    headers: { 'content-type': 'application/json' },
  });
});

async function notifyUser(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  title: string,
) {
  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('subscription')
    .eq('user_id', userId);

  const payload = JSON.stringify({
    title: 'Deine Fortsetzung ist da! 🔥',
    body: `${title} ist jetzt verfügbar.`,
  });

  for (const _s of subs ?? []) {
    // await webpush.sendNotification(_s.subscription, payload);
    void payload;
  }
}
