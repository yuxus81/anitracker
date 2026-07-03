# Geschaut-Hub, Farbsystem, Daten-Reparatur & Animations-Politur — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Die Geschaut-Seite wird ein farbcodierter „Serien-Bibliothek"-Hub, das Farbsystem app-weit vereinheitlicht, fehlende Cover/Duplikate reparierbar gemacht und alle Animationen weicher.

**Architecture:** Ein zentrales Theme-Modul (`categoryTheme`) liefert pro Kategorie-Identität statische Tailwind-Klassen + Akzent-Hex als Single Source of Truth. `PageHeader` und eine neue `HubCard` konsumieren es. Die Geschaut-Seite zieht aus zwei Query-Gruppen (`watched` + `nextSeason`) und rendert drei farbige Sektionen. Ein Wartungs-Modul scannt die echten Daten und repariert nach Bestätigung.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind 3, TanStack Query, Zustand, Supabase, Jikan API.

## Global Constraints

- Keine Hex-Werte in Komponenten streuen — Farben kommen aus `src/theme/categoryTheme.ts` (Ausnahme: das Theme-Modul selbst + `--theme-glow`).
- Alle Tailwind-Klassen als **statische Strings** (kein dynamischer Klassenaufbau), damit der JIT-Compiler sie sieht.
- App ist durchgängig **dunkel** (`bg #0d0f18`); Text auf getönten Flächen nutzt die farbige Variante (colored-on-dark), nicht Schwarz/Grau.
- `prefers-reduced-motion` respektieren (globaler Guard existiert bereits in `index.css` — neue Keyframes müssen darunter fallen; keine Motion außerhalb von CSS-Animationen/Transitions, die der Guard abdeckt).
- **Kein Unit-Test-Runner im Projekt.** Verifikation pro Task: `npm run typecheck` (`tsc -b --noEmit`) **und** `npm run lint` müssen sauber sein, plus visuelle Preview-Prüfung. Kein Test-Framework installieren.
- Bestehende Muster folgen: `cn()` aus `@/utils/cn`, `Button`/`Modal` aus `@/components/ui`, `toast` aus `@/store/ui`, Jikan über `jikanApi` (serielle Queue), Mutationen über `useAnimes`-Hooks.
- Arbeitsbranch ist `feat/geschaut-hub-redesign` (bereits angelegt). Commits pro Task auf diesem Branch.
- Alle Befehle laufen im Projektordner `anitracker/`.

---

## File Structure

Neu:
- `src/theme/categoryTheme.ts` — Farb-/Klassen-Tokens pro Identität.
- `src/theme/useThemeGlow.ts` — setzt `--theme-glow` pro Seite.
- `src/features/watched/HubCard.tsx` — eine Zeilen-Karte mit Farbbalken/Tönung/Chip.
- `src/features/maintenance/repair.ts` — reine Scan-/Auswahl-Logik (kein React).
- `src/features/maintenance/RepairModal.tsx` — Report-/Bereinigungs-UI.

Geändert:
- `src/components/ui/PageHeader.tsx` — optionale `accent`-Prop.
- `src/features/watched/WatchedPage.tsx` — Neuaufbau als Hub.
- `src/App.tsx` — `/continuation` → Redirect auf `/watched`.
- `src/components/layout/BottomNav.tsx` — Preset-Konsistenz (Route bleibt gemappt).
- `src/features/watchlist/WatchlistPage.tsx`, `src/features/current/CurrentPage.tsx` — Farb-Identität via `accent` + Glow.
- `tailwind.config.ts` — weichere Animationstoken + neue Keyframes.
- `src/index.css` — weicheres `hover-lift`, neue Motion-Utilities.

Abgelöst:
- `src/features/continuation/ContinuationPage.tsx` — nicht mehr geroutet (bleibt im Repo, ungenutzt; Route zeigt auf Hub).

---

## Task 1: Farbsystem-Fundament (categoryTheme + useThemeGlow)

**Files:**
- Create: `src/theme/categoryTheme.ts`
- Create: `src/theme/useThemeGlow.ts`

**Interfaces:**
- Produces: `categoryTheme: Record<CategoryKey, CategoryTheme>`, `type CategoryKey = 'gesehen' | 'suchtNeuigkeiten' | 'fortsetzung' | 'neuerscheinung' | 'watchlist' | 'aktuell'`, `interface CategoryTheme { key; label; accentHex; text; bar; dot; chip; tint; }`, and `useThemeGlow(hex: string, alpha?: number): void`.

- [ ] **Step 1: Create `src/theme/categoryTheme.ts`**

```ts
export type CategoryKey =
  | 'gesehen'
  | 'suchtNeuigkeiten'
  | 'fortsetzung'
  | 'neuerscheinung'
  | 'watchlist'
  | 'aktuell';

export interface CategoryTheme {
  key: CategoryKey;
  label: string;
  /** Raw accent used for the body glow and inline needs. */
  accentHex: string;
  /** Tailwind text-color class for headings/labels. */
  text: string;
  /** Tailwind bg-color class for the solid accent bar. */
  bar: string;
  /** Tailwind bg-color class for the small header dot. */
  dot: string;
  /** Chip classes: text + border + faint fill. */
  chip: string;
  /** Card tint: faint fill + colored hairline. */
  tint: string;
}

export const categoryTheme: Record<CategoryKey, CategoryTheme> = {
  gesehen: {
    key: 'gesehen',
    label: 'Gesehen',
    accentHex: '#2ecc71',
    text: 'text-green',
    bar: 'bg-green',
    dot: 'bg-green',
    chip: 'text-green border-green/40 bg-green/10',
    tint: 'bg-green/[0.06] border-green/25',
  },
  suchtNeuigkeiten: {
    key: 'suchtNeuigkeiten',
    label: 'Sucht Neuigkeiten',
    accentHex: '#00f5d4',
    text: 'text-accent-neon',
    bar: 'bg-accent-neon',
    dot: 'bg-accent-neon',
    chip: 'text-accent-neon border-accent-neon/40 bg-accent-neon/10',
    tint: 'bg-accent-neon/[0.06] border-accent-neon/25',
  },
  fortsetzung: {
    key: 'fortsetzung',
    label: 'Fortsetzung folgt',
    accentHex: '#8a2be2',
    text: 'text-[#b388ff]',
    bar: 'bg-accent-purple',
    dot: 'bg-accent-purple',
    chip: 'text-[#c18eff] border-accent-purple/40 bg-accent-purple/10',
    tint: 'bg-accent-purple/[0.07] border-accent-purple/25',
  },
  neuerscheinung: {
    key: 'neuerscheinung',
    label: 'Neuerscheinungen',
    accentHex: '#ff0055',
    text: 'text-[#ff5c8a]',
    bar: 'bg-orange',
    dot: 'bg-orange',
    chip: 'text-[#ff5c8a] border-orange/40 bg-orange/10',
    tint: 'bg-orange/[0.07] border-orange/25',
  },
  watchlist: {
    key: 'watchlist',
    label: 'Watchlist',
    accentHex: '#3a86ff',
    text: 'text-blue',
    bar: 'bg-blue',
    dot: 'bg-blue',
    chip: 'text-blue border-blue/40 bg-blue/10',
    tint: 'bg-blue/[0.06] border-blue/25',
  },
  aktuell: {
    key: 'aktuell',
    label: 'Am Schauen',
    accentHex: '#00f5d4',
    text: 'text-accent-neon',
    bar: 'bg-accent-neon',
    dot: 'bg-accent-neon',
    chip: 'text-accent-neon border-accent-neon/40 bg-accent-neon/10',
    tint: 'bg-accent-neon/[0.06] border-accent-neon/25',
  },
};
```

- [ ] **Step 2: Create `src/theme/useThemeGlow.ts`**

```ts
import { useEffect } from 'react';

/** Convert `#rrggbb` + alpha into an `rgba()` string. */
function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Sets the app's `--theme-glow` CSS variable (the soft radial background glow)
 * to the given accent while the calling page is mounted, then resets it.
 */
export function useThemeGlow(hex: string, alpha = 0.13): void {
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--theme-glow', hexToRgba(hex, alpha));
    return () => {
      root.style.setProperty('--theme-glow', 'transparent');
    };
  }, [hex, alpha]);
}
```

- [ ] **Step 3: Typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: PASS, no errors. (No visual change yet — this module is consumed by later tasks.)

- [ ] **Step 4: Commit**

```bash
git add src/theme/categoryTheme.ts src/theme/useThemeGlow.ts
git commit -m "feat(theme): add category color system + theme-glow hook"
```

---

## Task 2: PageHeader accent-Prop + grüner Geschaut-Zähler

**Files:**
- Modify: `src/components/ui/PageHeader.tsx`
- Modify: `src/features/watched/WatchedPage.tsx:39-47` (only the `<PageHeader>` call)

**Interfaces:**
- Consumes: `categoryTheme`, `CategoryKey` (Task 1).
- Produces: `PageHeader` now accepts `accent?: CategoryKey`.

- [ ] **Step 1: Replace `src/components/ui/PageHeader.tsx` with:**

```tsx
import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';
import { categoryTheme, type CategoryKey } from '@/theme/categoryTheme';

interface PageHeaderProps {
  title: string;
  count?: number;
  /** Colors the count badge with a category identity. Defaults to purple. */
  accent?: CategoryKey;
  action?: ReactNode;
}

export function PageHeader({ title, count, accent, action }: PageHeaderProps) {
  const badge = accent
    ? categoryTheme[accent].chip
    : 'text-accent-purple border-accent-purple/30 bg-accent-purple/15';

  return (
    <div className="mb-6 flex items-center justify-between gap-4 border-b border-white/10 pb-4 pt-2">
      <h2 className="flex items-center gap-3 text-2xl font-extrabold tracking-tight md:text-3xl">
        {title}
        {count !== undefined && (
          <span className={cn('rounded-full border px-2.5 py-0.5 text-sm font-bold', badge)}>
            {count}
          </span>
        )}
      </h2>
      {action}
    </div>
  );
}
```

- [ ] **Step 2: In `src/features/watched/WatchedPage.tsx`, add `accent="gesehen"` to the existing `<PageHeader>`** (the full page is rewritten in Task 4, but this proves the header change in isolation):

Change the `<PageHeader ... />` call to include `accent="gesehen"`:

```tsx
      <PageHeader
        title="Geschaut"
        count={grouped.counts.watched}
        accent="gesehen"
        action={
          <Button size="sm" variant="ghost" onClick={() => openAddModal('watched')}>
            + Hinzufügen
          </Button>
        }
      />
```

- [ ] **Step 3: Typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: PASS.

- [ ] **Step 4: Preview verify**

Start the dev server (`launch.json` config `anitracker` → `npm run dev`, port 5173). Navigate to `/watched`. Confirm the count badge next to „Geschaut" is now **green**, not purple. Screenshot.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/PageHeader.tsx src/features/watched/WatchedPage.tsx
git commit -m "feat(header): per-page accent color, green Geschaut counter"
```

---

## Task 3: HubCard-Komponente

**Files:**
- Create: `src/features/watched/HubCard.tsx`

**Interfaces:**
- Consumes: `CategoryTheme` (Task 1), `AnimeRow`, `FilmIcon` from `@/components/icons/CategoryIcons`.
- Produces: `HubCard` component and `HubIconBtn` helper.

```tsx
export interface HubCardProps {
  anime: AnimeRow;
  theme: CategoryTheme;
  chip: ReactNode;
  actions: ReactNode;
  /** Position in its section, drives the staggered entrance delay. */
  index?: number;
  onOpen?: () => void;
}
```

- [ ] **Step 1: Create `src/features/watched/HubCard.tsx`**

```tsx
import type { ReactNode } from 'react';
import type { AnimeRow } from '@/types/db';
import type { CategoryTheme } from '@/theme/categoryTheme';
import { FilmIcon } from '@/components/icons/CategoryIcons';
import { cn } from '@/utils/cn';

export interface HubCardProps {
  anime: AnimeRow;
  theme: CategoryTheme;
  chip: ReactNode;
  actions: ReactNode;
  index?: number;
  onOpen?: () => void;
}

export function HubCard({ anime, theme, chip, actions, index = 0, onOpen }: HubCardProps) {
  return (
    <div
      className={cn(
        'hub-card hover-lift flex items-center gap-3 rounded-xl2 border p-2.5 shadow-card',
        theme.tint,
      )}
      style={{ animationDelay: `${Math.min(index, 12) * 45}ms` }}
    >
      <span className={cn('h-14 w-[3px] flex-shrink-0 rounded-full', theme.bar)} aria-hidden />

      <button
        type="button"
        onClick={onOpen}
        disabled={!onOpen}
        aria-label={`Details zu ${anime.title}`}
        className="flex-shrink-0"
      >
        {anime.cover_url ? (
          <img
            src={anime.cover_url}
            alt=""
            loading="lazy"
            className="h-[72px] w-[50px] rounded-lg object-cover"
          />
        ) : (
          <span
            className={cn(
              'grid h-[72px] w-[50px] place-items-center rounded-lg border',
              theme.tint,
              theme.text,
            )}
          >
            <FilmIcon className="h-6 w-6" />
          </span>
        )}
      </button>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{anime.title}</p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">{chip}</div>
      </div>

      <div className="flex flex-shrink-0 items-center gap-1">{actions}</div>
    </div>
  );
}

export function HubIconBtn({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="hover-press grid h-9 w-9 place-items-center rounded-lg bg-white/5 text-base transition hover:bg-white/10"
    >
      {children}
    </button>
  );
}
```

Note: `.hub-card` and the staggered `animation-delay` are activated in Task 8; until then the card renders statically (no error — the class simply has no rules yet).

- [ ] **Step 2: Typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: PASS. (Component is unused until Task 4 — that is expected; do not add a throwaway import.)

- [ ] **Step 3: Commit**

```bash
git add src/features/watched/HubCard.tsx
git commit -m "feat(watched): add HubCard row component"
```

---

## Task 4: WatchedPage → Hub mit drei Sektionen

**Files:**
- Modify (full rewrite): `src/features/watched/WatchedPage.tsx`

**Interfaces:**
- Consumes: `useGroupedAnimes`, `useDeleteAnime`, `useUpdateAnime` (`@/hooks/useAnimes`), `useDetailStore`, `useFranchiseStore`, `useUIStore`/`toast`, `categoryTheme`, `useThemeGlow`, `HubCard`, `HubIconBtn`.
- Produces: default Geschaut hub page.

- [ ] **Step 1: Replace `src/features/watched/WatchedPage.tsx` with:**

```tsx
import { useState } from 'react';
import type { ReactNode } from 'react';
import { useGroupedAnimes, useDeleteAnime, useUpdateAnime } from '@/hooks/useAnimes';
import { useDetailStore } from '@/features/shared/detailStore';
import { useFranchiseStore } from '@/features/franchise/franchiseStore';
import { useUIStore, toast } from '@/store/ui';
import { PageHeader } from '@/components/ui/PageHeader';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Button } from '@/components/ui/Button';
import { categoryTheme, type CategoryTheme } from '@/theme/categoryTheme';
import { useThemeGlow } from '@/theme/useThemeGlow';
import { cn } from '@/utils/cn';
import type { AnimeRow } from '@/types/db';
import { HubCard, HubIconBtn } from './HubCard';

function Chip({ theme, children }: { theme: CategoryTheme; children: ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[0.65rem] font-bold',
        theme.chip,
      )}
    >
      {children}
    </span>
  );
}

function SectionHead({ theme, count }: { theme: CategoryTheme; count: number }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <span className={cn('h-2 w-2 rounded-full', theme.dot)} aria-hidden />
      <h3 className={cn('text-xs font-bold uppercase tracking-wide', theme.text)}>{theme.label}</h3>
      <span className="text-[0.7rem] text-muted">{count}</span>
    </div>
  );
}

export function WatchedPage() {
  const { grouped, isLoading, isError, refetch } = useGroupedAnimes();
  const openAddModal = useUIStore((s) => s.openAddModal);
  const openDetail = useDetailStore((s) => s.open);
  const openFranchise = useFranchiseStore((s) => s.open);
  const del = useDeleteAnime();
  const update = useUpdateAnime();
  const [onlyLimbo, setOnlyLimbo] = useState(false);

  useThemeGlow(categoryTheme.gesehen.accentHex);

  const watched = grouped.watched; // active | dead | limbo (superseded excluded)
  const limboCount = watched.filter((a) => a.status === 'limbo').length;
  const seen = onlyLimbo ? watched.filter((a) => a.status === 'limbo') : watched;
  const waiting = onlyLimbo ? [] : grouped.nextSeason.filter((a) => !a.is_released);
  const releases = onlyLimbo ? [] : grouped.nextSeason.filter((a) => a.is_released);

  const isEmpty = watched.length === 0 && grouped.nextSeason.length === 0;

  function themeFor(a: AnimeRow): CategoryTheme {
    return a.status === 'limbo' ? categoryTheme.suchtNeuigkeiten : categoryTheme.gesehen;
  }

  function markReleased(a: AnimeRow) {
    update.mutate({
      id: a.id,
      patch: { is_released: true, last_updated_at: new Date().toISOString(), release_label: 'Verfügbar' },
    });
    toast.success(`„${a.title}" als erschienen markiert`, '🔥');
  }

  function startWatching(a: AnimeRow) {
    update.mutate({
      id: a.id,
      patch: { category: 'current', status: 'active', is_released: false, is_placeholder: false, sort_order: Date.now() },
    });
    toast.success(`„${a.title}" ist jetzt in „Am Schauen"`, '▶️');
  }

  return (
    <div className="page-fade">
      <PageHeader
        title="Geschaut"
        count={grouped.counts.watched}
        accent="gesehen"
        action={
          <Button size="sm" variant="ghost" onClick={() => openAddModal('watched')}>
            + Hinzufügen
          </Button>
        }
      />

      {limboCount > 0 && (
        <button
          type="button"
          onClick={() => setOnlyLimbo((v) => !v)}
          className={cn(
            'hover-press mb-5 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-semibold transition',
            onlyLimbo
              ? 'border-accent-neon bg-accent-neon/15 text-accent-neon'
              : 'border-white/10 bg-white/5 text-muted hover:text-white',
          )}
        >
          🔎 Nur „Sucht Neuigkeiten" ({limboCount})
        </button>
      )}

      {isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : isLoading ? (
        <ListSkeleton count={5} />
      ) : isEmpty ? (
        <EmptyState
          title="Deine Bibliothek ist leer"
          hint="Schließe eine Serie ab oder füge sie direkt hier hinzu."
          action={
            <button className="link" onClick={() => openAddModal('watched')}>
              + Anime hinzufügen
            </button>
          }
        />
      ) : (
        <>
          {seen.length > 0 && (
            <section className="mb-7 stagger-group">
              <SectionHead theme={categoryTheme.gesehen} count={watched.length} />
              <div className="flex flex-col gap-3">
                {seen.map((a, i) => {
                  const t = themeFor(a);
                  return (
                    <HubCard
                      key={a.id}
                      anime={a}
                      theme={t}
                      index={i}
                      onOpen={a.mal_id ? () => openDetail(a.mal_id!) : undefined}
                      chip={
                        <Chip theme={t}>
                          {a.status === 'limbo' ? '🔎 Sucht Neuigkeiten' : '✅ Gesehen'}
                        </Chip>
                      }
                      actions={
                        <>
                          <HubIconBtn
                            label="Fortsetzung prüfen"
                            onClick={() =>
                              openFranchise({
                                malId: a.mal_id,
                                title: a.title,
                                coverUrl: a.cover_url,
                                existingId: a.id,
                              })
                            }
                          >
                            🔮
                          </HubIconBtn>
                          <HubIconBtn label="Entfernen" onClick={() => del.mutate(a.id)}>
                            🗑️
                          </HubIconBtn>
                        </>
                      }
                    />
                  );
                })}
              </div>
            </section>
          )}

          {waiting.length > 0 && (
            <section className="mb-7 stagger-group">
              <SectionHead theme={categoryTheme.fortsetzung} count={waiting.length} />
              <div className="flex flex-col gap-3">
                {waiting.map((a, i) => (
                  <HubCard
                    key={a.id}
                    anime={a}
                    theme={categoryTheme.fortsetzung}
                    index={i}
                    onOpen={a.mal_id ? () => openDetail(a.mal_id!) : undefined}
                    chip={
                      <>
                        <Chip theme={categoryTheme.fortsetzung}>
                          {a.release_label ?? 'Datum unbekannt'}
                        </Chip>
                        {a.is_placeholder && (
                          <Chip theme={categoryTheme.neuerscheinung}>⏳ Platzhalter</Chip>
                        )}
                      </>
                    }
                    actions={
                      <>
                        <HubIconBtn label="Als erschienen markieren" onClick={() => markReleased(a)}>
                          ✅
                        </HubIconBtn>
                        <HubIconBtn label="Entfernen" onClick={() => del.mutate(a.id)}>
                          🗑️
                        </HubIconBtn>
                      </>
                    }
                  />
                ))}
              </div>
            </section>
          )}

          {releases.length > 0 && (
            <section className="stagger-group">
              <SectionHead theme={categoryTheme.neuerscheinung} count={releases.length} />
              <div className="flex flex-col gap-3">
                {releases.map((a, i) => (
                  <HubCard
                    key={a.id}
                    anime={a}
                    theme={categoryTheme.neuerscheinung}
                    index={i}
                    onOpen={a.mal_id ? () => openDetail(a.mal_id!) : undefined}
                    chip={<Chip theme={categoryTheme.neuerscheinung}>✨ Jetzt verfügbar</Chip>}
                    actions={
                      <>
                        <HubIconBtn label="Jetzt schauen" onClick={() => startWatching(a)}>
                          ▶️
                        </HubIconBtn>
                        <HubIconBtn label="Entfernen" onClick={() => del.mutate(a.id)}>
                          🗑️
                        </HubIconBtn>
                      </>
                    }
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: PASS.

- [ ] **Step 3: Preview verify**

On `/watched`: confirm three colored sections appear when data exists — **Gesehen** (green, with cyan „Sucht Neuigkeiten" rows), **Fortsetzung folgt** (purple), **Neuerscheinungen** (red). Each card shows a colored left bar, tint, and colored chip. Toggle the „Nur Sucht Neuigkeiten" chip → only cyan rows remain. Screenshot.

- [ ] **Step 4: Commit**

```bash
git add src/features/watched/WatchedPage.tsx
git commit -m "feat(watched): rebuild Geschaut as a three-group color hub"
```

---

## Task 5: Route-Konsolidierung (/continuation → Hub)

**Files:**
- Modify: `src/App.tsx:11` (import) and `src/App.tsx:33` (route)

**Interfaces:**
- Consumes: `Navigate` from `react-router-dom` (already imported in `App.tsx`).

- [ ] **Step 1: Remove the ContinuationPage import in `src/App.tsx`**

Delete this line:

```tsx
import { ContinuationPage } from '@/features/continuation/ContinuationPage';
```

- [ ] **Step 2: Replace the `/continuation` route element with a redirect to the hub**

Change:

```tsx
            <Route path="/continuation" element={<ContinuationPage />} />
```

to:

```tsx
            <Route path="/continuation" element={<Navigate to="/watched" replace />} />
```

- [ ] **Step 3: Typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: PASS (no unused-import error for ContinuationPage). Note: `BottomNav.tsx`'s `ROUTE_PRESET` keeps its `/continuation` key harmlessly; leave it — it only affects the FAB preset if that path were active, and it now redirects.

- [ ] **Step 4: Preview verify**

Manually navigate to `/continuation` in the preview address/eval (`window.location.assign('/continuation')` or router) → it lands on `/watched`. Screenshot the resulting hub.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx
git commit -m "feat(routing): redirect /continuation to the Geschaut hub"
```

---

## Task 6: Farb-Identität für Watchlist & Aktuell

**Files:**
- Modify: `src/features/watchlist/WatchlistPage.tsx` (PageHeader call + add glow)
- Modify: `src/features/current/CurrentPage.tsx` (PageHeader call + add glow)

**Interfaces:**
- Consumes: `useThemeGlow`, `categoryTheme` (Task 1); `PageHeader accent` (Task 2).

- [ ] **Step 1: In `src/features/watchlist/WatchlistPage.tsx`**, add the imports and glow, and pass `accent="watchlist"` to its `<PageHeader>`.

Add near the other imports:

```tsx
import { categoryTheme } from '@/theme/categoryTheme';
import { useThemeGlow } from '@/theme/useThemeGlow';
```

Inside the component body, before the return, add:

```tsx
  useThemeGlow(categoryTheme.watchlist.accentHex);
```

And add `accent="watchlist"` to the existing `<PageHeader ... />` props.

- [ ] **Step 2: In `src/features/current/CurrentPage.tsx`**, do the same with the `aktuell` identity.

Add imports:

```tsx
import { categoryTheme } from '@/theme/categoryTheme';
import { useThemeGlow } from '@/theme/useThemeGlow';
```

Add before return:

```tsx
  useThemeGlow(categoryTheme.aktuell.accentHex);
```

And add `accent="aktuell"` to its `<PageHeader ... />`.

Note: If either file does not currently render a `<PageHeader>` with a `count`, only add the `useThemeGlow` call and skip the `accent` prop. Do not invent a count.

- [ ] **Step 3: Typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: PASS.

- [ ] **Step 4: Preview verify**

Navigate to `/watchlist` and `/current`. Confirm the soft background glow tints blue (watchlist) and teal (current), and the count badge (if present) matches. Switch back to `/watched` → glow returns to green. Screenshot each.

- [ ] **Step 5: Commit**

```bash
git add src/features/watchlist/WatchlistPage.tsx src/features/current/CurrentPage.tsx
git commit -m "feat(theme): per-page glow + accent for Watchlist and Current"
```

---

## Task 7: Globale Animationen weicher

**Files:**
- Modify: `tailwind.config.ts:44-84` (keyframes + animation blocks)
- Modify: `src/index.css:82-97` (hover-lift / hover-press)

**Interfaces:** none (token-only change).

- [ ] **Step 1: Soften the keyframe overshoots in `tailwind.config.ts`.**

In `keyframes.staggerFadeIn`, change `translateY(20px)` → `translateY(12px)`.
In `keyframes.winnerPop`, change the `50%` `scale(1.1)` → `scale(1.05)`.
In `keyframes.iconBounce`, change the `50%` `scale(1.4)` → `scale(1.15)`.

Resulting blocks:

```ts
        staggerFadeIn: {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        winnerPop: {
          '0%': { transform: 'scale(0.9)' },
          '50%': { transform: 'scale(1.05)' },
          '100%': { transform: 'scale(1)' },
        },
```

```ts
        iconBounce: {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.15)' },
          '100%': { transform: 'scale(1)' },
        },
```

- [ ] **Step 2: Lengthen the stagger slightly** in the `animation` block of `tailwind.config.ts`:

Change:

```ts
        stagger: 'staggerFadeIn 0.4s cubic-bezier(0.16,1,0.3,1) forwards',
```

to:

```ts
        stagger: 'staggerFadeIn 0.5s cubic-bezier(0.16,1,0.3,1) forwards',
```

- [ ] **Step 3: Soften `hover-lift` and `hover-press` in `src/index.css`.**

Replace the `.hover-lift` transition durations and the hover transform, and soften the press scale:

```css
  .hover-lift {
    transition:
      transform 0.28s cubic-bezier(0.16, 1, 0.3, 1),
      box-shadow 0.28s ease,
      border-color 0.28s ease;
  }
  @media (hover: hover) and (pointer: fine) {
    .hover-lift:hover {
      transform: translateY(-2px) scale(1.01);
    }
  }
  .hover-press {
    @apply transition active:scale-[0.98];
  }
```

- [ ] **Step 4: Typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: PASS.

- [ ] **Step 5: Preview verify**

On `/watched`, hover a card (desktop pointer) → the lift is gentle (~2px), no snappy jump. Tap feedback is subtle. Screenshot/observe. Confirm nothing feels „hart".

- [ ] **Step 6: Commit**

```bash
git add tailwind.config.ts src/index.css
git commit -m "refactor(motion): soften overshoot and hover/press animations"
```

---

## Task 8: Hub-Motion (Stagger, Radar-Puls, Neuerscheinungs-Glanz, Page-Fade)

**Files:**
- Modify: `tailwind.config.ts` (add keyframes `radar`, `sheen`, `pageFade` + animation names)
- Modify: `src/index.css` (add `.page-fade`, `.stagger-group > *`, `.hub-card`, radar/sheen helpers under the reduced-motion guard)

**Interfaces:** provides the CSS classes referenced by `HubCard`/`WatchedPage` (`.page-fade`, `.stagger-group`, `.hub-card`).

- [ ] **Step 1: Add keyframes to `tailwind.config.ts` `keyframes` block:**

```ts
        radar: {
          '0%': { boxShadow: '0 0 0 0 rgba(0,245,212,0.45)' },
          '70%': { boxShadow: '0 0 0 6px rgba(0,245,212,0)' },
          '100%': { boxShadow: '0 0 0 0 rgba(0,245,212,0)' },
        },
        sheen: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '60%': { boxShadow: '0 0 22px rgba(255,0,85,0.28)' },
          '100%': { opacity: '1', transform: 'translateY(0)', boxShadow: '0 8px 20px rgba(0,0,0,0.2)' },
        },
        pageFade: {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
```

And to the `animation` block:

```ts
        radar: 'radar 2.4s ease-out infinite',
        sheen: 'sheen 0.6s cubic-bezier(0.16,1,0.3,1) backwards',
        'page-fade': 'pageFade 0.4s cubic-bezier(0.16,1,0.3,1) both',
```

- [ ] **Step 2: Add motion utilities to `src/index.css`** (inside `@layer components`, alongside the existing hover rules):

```css
  .page-fade {
    @apply animate-page-fade;
  }

  .hub-card {
    animation: staggerFadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) backwards;
  }
```

Note: fill-mode `backwards` (not `forwards`/`both`) is deliberate — it applies the hidden start frame during the per-card `animation-delay`, then reverts to the resting state so `hover-lift`'s transform is not locked. The `.stagger-group` class on the sections is now just a harmless marker (no rule); leave it or drop it.

- [ ] **Step 3: Add a radar pulse to the cyan „Sucht Neuigkeiten" chip.**

In `src/features/watched/WatchedPage.tsx`, give the limbo chip the radar animation. Change the limbo branch of the Gesehen chip so the cyan chip pulses:

```tsx
                      chip={
                        a.status === 'limbo' ? (
                          <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[0.65rem] font-bold animate-radar', t.chip)}>
                            🔎 Sucht Neuigkeiten
                          </span>
                        ) : (
                          <Chip theme={t}>✅ Gesehen</Chip>
                        )
                      }
```

- [ ] **Step 4: Give Neuerscheinungen cards the one-time sheen.**

In the `releases.map(...)` `HubCard`, add `className` support is not needed — instead wrap via the `sheen` on the card. Simplest: add a `sheen` prop to `HubCard`. In `HubCard.tsx`, extend props with `sheen?: boolean` and apply `animate-sheen` when set, replacing the default `.hub-card` stagger:

In `HubCard.tsx`, update the props interface and the root `div` className:

```tsx
export interface HubCardProps {
  anime: AnimeRow;
  theme: CategoryTheme;
  chip: ReactNode;
  actions: ReactNode;
  index?: number;
  sheen?: boolean;
  onOpen?: () => void;
}
```

Root div className becomes:

```tsx
      className={cn(
        'hover-lift flex items-center gap-3 rounded-xl2 border p-2.5 shadow-card',
        sheen ? 'animate-sheen' : 'hub-card',
        theme.tint,
      )}
```

Then in `WatchedPage.tsx` pass `sheen` to release cards:

```tsx
                  <HubCard
                    key={a.id}
                    anime={a}
                    theme={categoryTheme.neuerscheinung}
                    index={i}
                    sheen
                    ...
```

- [ ] **Step 5: Typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: PASS.

- [ ] **Step 6: Preview verify**

On `/watched`: cards fade+rise in a gentle cascade per group; the cyan „Sucht Neuigkeiten" chip pulses like a soft radar; Neuerscheinungen cards fade up with a brief red glow on mount; switching tabs fades the page in. Then set the preview to reduced motion (`preview_resize` won't do this — use `preview_eval` to add a style or check via DevTools emulation) and confirm motion is suppressed by the existing guard. Screenshot.

- [ ] **Step 7: Commit**

```bash
git add tailwind.config.ts src/index.css src/features/watched/WatchedPage.tsx src/features/watched/HubCard.tsx
git commit -m "feat(motion): staggered hub reveal, radar pulse, release sheen, page fade"
```

---

## Task 9: Reparatur-Logik (reines Modul)

**Files:**
- Create: `src/features/maintenance/repair.ts`

**Interfaces:**
- Consumes: `AnimeRow` (`@/types/db`).
- Produces:
  - `interface DuplicateGroup { malId: number; keep: AnimeRow; remove: AnimeRow[] }`
  - `interface RepairReport { missingCovers: AnimeRow[]; duplicates: DuplicateGroup[] }`
  - `function scanLibrary(rows: AnimeRow[]): RepairReport`
  - `function pickKeeper(rows: AnimeRow[]): AnimeRow`

- [ ] **Step 1: Create `src/features/maintenance/repair.ts`**

```ts
import type { AnimeRow } from '@/types/db';

export interface DuplicateGroup {
  malId: number;
  keep: AnimeRow;
  remove: AnimeRow[];
}

export interface RepairReport {
  /** Rows with a mal_id but no cover — a poster can be fetched from Jikan. */
  missingCovers: AnimeRow[];
  /** Groups sharing the same non-null mal_id, with a chosen keeper. */
  duplicates: DuplicateGroup[];
}

function hasCover(r: AnimeRow): boolean {
  return typeof r.cover_url === 'string' && r.cover_url.trim().length > 0;
}

/**
 * Choose which row to keep from a duplicate set. Preference order:
 * has a cover > richer franchise_meta > older (earliest created_at).
 */
export function pickKeeper(rows: AnimeRow[]): AnimeRow {
  return [...rows].sort((a, b) => {
    const cover = Number(hasCover(b)) - Number(hasCover(a));
    if (cover !== 0) return cover;
    const meta = metaScore(b) - metaScore(a);
    if (meta !== 0) return meta;
    return a.created_at.localeCompare(b.created_at);
  })[0]!;
}

function metaScore(r: AnimeRow): number {
  const m = r.franchise_meta;
  if (!m) return 0;
  return Object.values(m).filter((v) => v != null).length;
}

/** Analyse the library for imageless rows and true duplicates (same mal_id). */
export function scanLibrary(rows: AnimeRow[]): RepairReport {
  const missingCovers = rows.filter((r) => r.mal_id != null && !hasCover(r));

  const byMal = new Map<number, AnimeRow[]>();
  for (const r of rows) {
    if (r.mal_id == null) continue;
    const list = byMal.get(r.mal_id) ?? [];
    list.push(r);
    byMal.set(r.mal_id, list);
  }

  const duplicates: DuplicateGroup[] = [];
  for (const [malId, list] of byMal) {
    if (list.length < 2) continue;
    const keep = pickKeeper(list);
    duplicates.push({ malId, keep, remove: list.filter((r) => r.id !== keep.id) });
  }

  return { missingCovers, duplicates };
}
```

- [ ] **Step 2: Typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: PASS.

- [ ] **Step 3: Sanity-check the pure logic in the browser console.**

Since there is no test runner, verify logic manually in the preview once Task 10 is wired — or temporarily, in DevTools console after importing is not available. Instead, confirm by reading: `scanLibrary` groups by `mal_id`, keeps the cover-bearing/oldest row, and lists imageless rows with a `mal_id`. No command to run in this step.

- [ ] **Step 4: Commit**

```bash
git add src/features/maintenance/repair.ts
git commit -m "feat(maintenance): library scan logic (missing covers + duplicates)"
```

---

## Task 10: Reparatur-UI (Modal + Einstellungen)

**Files:**
- Create: `src/features/maintenance/RepairModal.tsx`
- Modify: `src/features/settings/SettingsPage.tsx` (add a „Bibliothek" card that opens the modal)

**Interfaces:**
- Consumes: `scanLibrary`, `RepairReport`, `DuplicateGroup` (Task 9); `useAnimesQuery`, `useQueryClient`+`qk`, `updateAnime`, `deleteAnime` (`@/api/animes`), `jikanApi` + `getCover`, `Modal`, `Button`, `toast`.

- [ ] **Step 1: Create `src/features/maintenance/RepairModal.tsx`**

```tsx
import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { qk } from '@/lib/queryClient';
import { useAnimesQuery } from '@/hooks/useAnimes';
import { updateAnime, deleteAnime } from '@/api/animes';
import { jikanApi } from '@/api/jikan';
import { getCover } from '@/utils/titles';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { toast } from '@/store/ui';
import { scanLibrary, type RepairReport } from './repair';

export function RepairModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: rows } = useAnimesQuery();
  const qc = useQueryClient();
  const report: RepairReport = useMemo(() => scanLibrary(rows ?? []), [rows]);

  const [fixCovers, setFixCovers] = useState(true);
  const [fixDupes, setFixDupes] = useState(true);
  const [busy, setBusy] = useState(false);

  const nothing = report.missingCovers.length === 0 && report.duplicates.length === 0;

  async function apply() {
    setBusy(true);
    let covers = 0;
    let removed = 0;
    try {
      if (fixCovers) {
        for (const r of report.missingCovers) {
          try {
            const cover = getCover((await jikanApi.getAnime(r.mal_id!)).data);
            if (cover) {
              await updateAnime(r.id, { cover_url: cover });
              covers += 1;
            }
          } catch {
            /* skip this item, keep going */
          }
        }
      }
      if (fixDupes) {
        for (const group of report.duplicates) {
          for (const dup of group.remove) {
            try {
              await deleteAnime(dup.id);
              removed += 1;
            } catch {
              /* skip */
            }
          }
        }
      }
      await qc.invalidateQueries({ queryKey: qk.animes });
      toast.success(`Bereinigt: ${covers} Cover · ${removed} Duplikate entfernt`, '🧹');
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Bibliothek prüfen" size="sm">
      {nothing ? (
        <p className="text-sm text-muted">Alles sauber — keine fehlenden Cover, keine Duplikate.</p>
      ) : (
        <div className="space-y-4">
          <label className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
            <input
              type="checkbox"
              checked={fixCovers}
              onChange={(e) => setFixCovers(e.target.checked)}
              className="mt-0.5"
            />
            <span className="min-w-0 text-sm">
              <span className="font-semibold text-ink">{report.missingCovers.length} Cover fehlen</span>
              <span className="block text-xs text-muted">Werden aus MyAnimeList nachgeladen.</span>
            </span>
          </label>

          <label className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
            <input
              type="checkbox"
              checked={fixDupes}
              onChange={(e) => setFixDupes(e.target.checked)}
              className="mt-0.5"
            />
            <span className="min-w-0 text-sm">
              <span className="font-semibold text-ink">{report.duplicates.length} Duplikat-Gruppen</span>
              <span className="block text-xs text-muted">
                Das vollständigste Exemplar bleibt, die Dubletten werden entfernt.
              </span>
            </span>
          </label>

          <Button variant="primary" fullWidth loading={busy} onClick={apply}>
            Ausgewählte bereinigen
          </Button>
        </div>
      )}
    </Modal>
  );
}
```

- [ ] **Step 2: Add a „Bibliothek" card to `src/features/settings/SettingsPage.tsx`.**

Add the import at the top:

```tsx
import { RepairModal } from '@/features/maintenance/RepairModal';
```

Add a new card component in the file:

```tsx
function LibraryCard() {
  const [open, setOpen] = useState(false);
  return (
    <Card title="Bibliothek">
      <p className="mb-4 text-sm text-muted">
        Prüft deine Sammlung auf fehlende Cover und doppelte Einträge. Du entscheidest,
        was bereinigt wird.
      </p>
      <Button variant="ghost" fullWidth onClick={() => setOpen(true)}>
        Scan starten
      </Button>
      <RepairModal open={open} onClose={() => setOpen(false)} />
    </Card>
  );
}
```

Render it in the `SettingsPage` return, after `<NotificationsCard />`:

```tsx
      <NotificationsCard />
      <LibraryCard />
      <AccountCard userId={user?.id ?? null} email={user?.email ?? ''} qc={qc} />
```

(`useState` is already imported in this file.)

- [ ] **Step 3: Typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: PASS.

- [ ] **Step 4: Preview verify (against real data)**

Log in, open `/settings` → „Bibliothek" → „Scan starten". Confirm the report shows real counts. Choose fixes → „Ausgewählte bereinigen". After the toast, open `/watched`: previously imageless rows now show covers, duplicates are gone. Screenshot before/after.

- [ ] **Step 5: Commit**

```bash
git add src/features/maintenance/RepairModal.tsx src/features/settings/SettingsPage.tsx
git commit -m "feat(maintenance): library repair modal in settings (analyze-first)"
```

---

## Self-Review (Spec-Abdeckung)

- Farb-System app-weit → Task 1, 2, 6 (Geschaut/Watchlist/Current); Discover/Dashboard bewusst außen vor (Spec: nicht im Scope).
- Geschaut-Hub (3 Gruppen, Karten-Redesign, grüner Zähler, Cyan-Limbo, Filter) → Task 2, 3, 4.
- Cover-Fallback verbessert → Task 3 (`FilmIcon` in Gruppenfarbe).
- `/continuation` abgelöst → Task 5.
- Daten-Reparatur (analyze-first: fehlende Cover + Duplikate, Bestätigung) → Task 9, 10.
- Animationen weicher → Task 7; neue passende Animationen → Task 8; reduced-motion respektiert (globaler Guard).
- Verifikation: typecheck+lint+Preview pro Task (angepasst, da kein Test-Runner).

Offene, bewusst nicht eingeplante Punkte (YAGNI / Folgeschritt): Härtung der Dedup-Prüfung im Franchise-Wizard (Spec als optional markiert); optionale BottomNav-Tab-Farben (Spec: „optional, niedrige Prio").
