# Supabase-Migration & Setup

Diese Schritte führst **du** selbst im Supabase-Dashboard aus. Claude führt sie
**nicht** automatisch aus, weil es um deine echten Live-Daten geht.

Projekt: `https://anyvdbweojvaztyiacwb.supabase.co`

---

## 0. Backup zuerst (Pflicht)

Bevor irgendetwas läuft:

1. Supabase Dashboard → **Database → Backups** (oder Project Settings → Database).
   Lege einen manuellen Restore-Punkt an bzw. notiere den letzten automatischen.
2. Zusätzlich als Sicherheitsnetz: **Table Editor → `animes` → Export → CSV**.

So kannst du im Zweifel alles wiederherstellen.

---

## 1. Migrationen ausführen (SQL Editor)

Öffne **SQL Editor** und führe die Dateien **in dieser Reihenfolge** aus
(jeweils komplett einfügen und „Run"):

1. `migrations/0001_schema.sql` – legt Enums + neue Spalten an (rein additiv).
2. `migrations/0002_migrate_meta.sql` – überführt das alte `meta`-Format in die
   neuen Spalten.
   - **Vorher prüfen:** In Schritt 1 der Datei steht die E-Mail
     `privatyunus@gmail.com`. Ist das dein Account? Wenn nicht, anpassen.
     Deine User-ID findest du mit: `select id, email from auth.users;`
   - Der **Cleanup-Block ganz unten** (löscht `meta`/`franchise_*`) ist
     auskommentiert. **Noch nicht** ausführen – erst nach der Verifikation (Schritt 2).
3. `migrations/0003_rls.sql` – aktiviert Row Level Security + Policies.

---

## 2. Verifikation

Führe diese Queries aus und prüfe die Ergebnisse:

```sql
-- a) Jede Zeile hat jetzt einen Besitzer:
select count(*) as ohne_besitzer from public.animes where user_id is null;   -- erwartet: 0

-- b) Verteilung nach Kategorie/Status plausibel?
select category, status, count(*) from public.animes group by 1, 2 order by 1, 2;

-- c) Stichprobe: altes meta vs. neue Felder (solange meta noch existiert):
select title, category, status, format, release_label, is_released, is_placeholder, meta
from public.animes
order by created_at desc
limit 30;

-- d) next_season-Einträge haben ein Format + Label:
select count(*) filter (where format is null) as ohne_format,
       count(*) filter (where release_label is null) as ohne_label
from public.animes where category = 'next_season';
```

Erwartung:
- `watched` + altes `meta='DEAD'/'LIMBO'/'SUPERSEDED'` → `status` `dead/limbo/superseded`.
- `next_season` mit `FILM|…` → `format='movie'`, mit `STAFFEL|…` → `format='season'`.
- `…|PLACEHOLDER` → `is_placeholder=true`.
- `UPDATED|<ms>` → `is_released=true`, `last_updated_at` gesetzt.

Stimmt alles: **Cleanup-Block** in `0002_migrate_meta.sql` einkommentieren und
ausführen (löscht `meta` und die vier `franchise_*`-Spalten).

---

## 3. RLS gegenprüfen

- Lege einen zweiten Test-Account in der App an, logge dich damit ein: Du darfst
  **keine** fremden Animes sehen.
- Im SQL Editor (läuft als service_role, umgeht RLS) siehst du weiterhin alles –
  das ist erwartet.

---

## 4. Web Push aktivieren (später, optional)

Erst nötig, wenn du echte Push-Benachrichtigungen willst. Die App funktioniert
ohne das komplett (In-App-Sync + Toasts).

1. **VAPID-Keys erzeugen** (einmalig), z. B. mit `npx web-push generate-vapid-keys`.
2. **Public Key** → in `.env` als `VITE_VAPID_PUBLIC_KEY` eintragen (bzw. als
   GitHub-Actions-Variable).
3. **Private Key + Subject** → als Supabase **Secrets** setzen (nicht in den Client!):
   ```bash
   supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... VAPID_SUBJECT=mailto:du@example.com
   ```
4. **Edge Function deployen:**
   ```bash
   supabase functions deploy push-dispatch
   ```
5. **Cron einrichten** (täglich), z. B. über `pg_cron` + `pg_net` oder den
   Supabase-Scheduler, damit `push-dispatch` regelmäßig läuft. Beispiel siehe
   Kommentar in `functions/push-dispatch/index.ts`.

---

## Spaltenüberblick (neues Schema)

| Spalte | Typ | Bedeutung |
|---|---|---|
| `user_id` | uuid NOT NULL, default `auth.uid()` | Besitzer (RLS) |
| `category` | enum `watched \| next_season \| watchlist \| current` | Seite/Bucket |
| `status` | enum `active \| dead \| limbo \| superseded` | Feinzustand |
| `format` | enum `season \| movie \| finished` (nullable) | für Fortsetzungen |
| `release_label` | text | menschlicher Termin |
| `is_released` | bool | Fortsetzung erschienen? |
| `is_placeholder` | bool | Platzhalter ohne echten Titel |
| `last_updated_at` | timestamptz | Sync erkannte „neu erschienen" |
| `sort_order` | float | manuelle Reihenfolge |
| `franchise_meta` | jsonb | gecachte Franchise-Infos |
