# Geschaut-Hub, App-Farbsystem, Daten-Reparatur & Animations-Politur

Status: approved (Design), 2026-07-03
Scope: AniTracker PWA (React 18 / TS / Vite / Tailwind / Supabase)

## Ziel & Kontext

Die „Geschaut"-Seite wird als konfuse, durchgehend graue Liste empfunden: drei
`status`-Gruppen (`active` = „Gesehen", `limbo` = „Sucht Neuigkeiten", `dead` =
„Abgeschlossen"), deren Unterschied fürs Auge nicht ablesbar ist. Farbe wird nur
als Text-Badge kommuniziert, nicht visuell. Der Zähler oben ist lila statt grün.
Zusätzlich fehlen bei manchen Einträgen die Cover, und es existieren Duplikate.
Die App-Animationen wirken „zu hart".

Nach Rücksprache (Mockup bestätigt) wird die Geschaut-Seite zu einem **Hub**: eine
zentrale „Serien-Bibliothek" mit drei farbcodierten Gruppen. Das Farb-System wird
app-weit vereinheitlicht.

## Vier Bausteine

### 1. App-weites Farb-System (Single Source of Truth)

Neue Datei `src/theme/categoryTheme.ts`. Exportiert pro **Identität** ein Objekt
mit allen Darstellungswerten, damit keine Komponente mehr Hex-Werte oder ad-hoc
Tailwind-Klassen streut.

Identitäten und Leitfarben (alle bereits als Tailwind-Token vorhanden):

| Identität           | Token / Hex            | Einsatzort                         |
| ------------------- | ---------------------- | ---------------------------------- |
| `gesehen`           | green `#2ecc71`        | Geschaut-Hub, Gruppe „Gesehen"     |
| `suchtNeuigkeiten`  | accent.neon `#00f5d4`  | Cyan-Untergruppe in „Gesehen"      |
| `fortsetzung`       | accent.purple `#8a2be2`| Hub-Gruppe „Fortsetzung folgt"     |
| `neuerscheinung`    | orange `#ff0055`       | Hub-Gruppe „Neuerscheinungen"      |
| `watchlist`         | blue `#3a86ff`         | Watchlist-Seite                    |
| `aktuell`           | accent.neon `#00f5d4`  | Aktuell-Seite                      |

Jede Identität liefert (als statische Tailwind-Klassennamen, damit der JIT sie
sieht — keine dynamisch zusammengebauten Klassen):
- `accentHex` – für inline `--theme-glow` und SVG/Balken
- `text` – Textfarbe (z. B. `text-green`)
- `chip` – Chip-Klassen (`text-… border-…/40 bg-…/10`)
- `tint` – zarte Kartentönung (`bg-…/[0.06] border-…/25`)
- `bar` – Balkenfarbe (`bg-green`)
- `label` – Anzeigename der Gruppe

`PageHeader` bekommt eine optionale Prop `accent?: keyof typeof categoryTheme`
(oder direkt die Klassen). Wirkung: Zähler-Chip und untere Trennlinie tragen die
Seitenfarbe. Default bleibt lila (rückwärtskompatibel für Seiten ohne Angabe).
Geschaut übergibt `gesehen` → grüner Zähler.

`--theme-glow`: bisher tot (immer `transparent`). Pro Seite wird der weiche
Radial-Glow im Body-Hintergrund auf die Seitenfarbe gesetzt (sehr dezent, niedrige
Deckkraft). Umsetzung: kleiner Hook/Effekt `useThemeGlow(hex)` der eine CSS-Var am
`document.documentElement` setzt und beim Unmount zurücksetzt; jede Seite ruft ihn
mit ihrer Identitätsfarbe auf.

Optional (niedrige Prio, kein Muss): aktiver BottomNav-Tab übernimmt die
jeweilige Identitätsfarbe statt pauschal Neon.

### 2. Geschaut wird zum Hub

Datei `src/features/watched/WatchedPage.tsx` wird neu aufgebaut.

Datenquellen (aus `useGroupedAnimes`):
- **Gesehen** (grün): `grouped.watched` mit `status ∈ {active, dead}`
  (`active` und `dead` werden zu *einer* Gruppe verschmolzen).
- **Sucht Neuigkeiten** (cyan): `grouped.watched` mit `status === 'limbo'` —
  als visuell hervorgehobene Einträge *innerhalb* der Gesehen-Sektion.
- **Fortsetzung folgt** (lila): `grouped.nextSeason.filter(!is_released)`.
- **Neuerscheinungen** (rot): `grouped.nextSeason.filter(is_released)`.

Sektions-Reihenfolge (wie im bestätigten Mockup): **Gesehen → Fortsetzung folgt
→ Neuerscheinungen**. Leere Gruppen werden ausgeblendet.

Karten-Redesign (`WatchedCard` + eine gemeinsame Hub-Card):
- Linker **farbiger Balken** (3 px, gerundet) in Gruppenfarbe.
- Zarte **Tönung** des Kartenhintergrunds in Gruppenfarbe + farbige Hairline.
- Farbiger **Mini-Chip** statt grauem Text-Label; Status wird durch Farbe erzählt.
- **Cover** bleibt Thumbnail (echte Poster). Fallback: farbig getöntes Icon in
  Gruppenfarbe statt nacktem grauen 🎬.
- Aktionen (Detail öffnen, Franchise-Check, Entfernen) bleiben, dezenter gestylt.
- Karten behalten volle Rundung; der Balken ist ein **inneres Element**, kein
  `border-left` (damit Rundung erhalten bleibt).

Kopf & Filter:
- `PageHeader title="Geschaut"` mit grünem Zähler = Anzahl „Gesehen"
  (`active + dead`, ohne `superseded`).
- Filter-Chip „Nur Sucht Neuigkeiten" bleibt erhalten, in Cyan neu gestylt.
  Bei aktivem Filter werden nur die Cyan-Einträge gezeigt.

Navigation/Routing:
- `/continuation` (aktuell nicht in der BottomNav verlinkt) wird durch den Hub
  abgelöst: Route leitet auf `/watched` um. `ContinuationPage.tsx` wird entfernt
  oder als Redirect stummgeschaltet, damit es keine zweite Quelle der Wahrheit
  gibt. `ROUTE_PRESET`/FAB-Logik bleibt konsistent (Add-Preset je Sektion).

### 3. Daten-Reparatur (erst analysieren, dann entscheiden)

Neuer Bereich in `SettingsPage.tsx`: **„Bibliothek prüfen"** mit Button
*Scan starten*. Kein Auto-Fix ohne Bestätigung.

Scan-Logik (neues Modul `src/features/maintenance/repair.ts`):
- **Fehlende Cover:** Zeilen mit `cover_url == null/leer` **und** vorhandener
  `mal_id`. Diese sind aus Jikan (`getAnime` → `getCover`) nachladbar.
- **Duplikate:** Gruppen von Zeilen mit identischer, nicht-leerer `mal_id`
  (innerhalb `watched`/`next_season`). Sekundär optional: identischer normalisierter
  Titel bei fehlender `mal_id` (nur melden, nicht automatisch mergen).

Report-Modal:
- Zusammenfassung „X Cover nachladbar · Y Duplikat-Gruppen".
- Pro Fund eine Zeile mit Checkbox; Vorauswahl sinnvoll (Cover: an; Duplikate:
  an, Behalten = datenreichstes Exemplar).
- Aktion „Ausgewählte bereinigen": Cover per Jikan nachladen und `updateAnime`;
  bei Duplikaten das beste Exemplar behalten (Cover vorhanden > mehr
  `franchise_meta` > älteres `created_at`), die übrigen `deleteAnime`.
- Alle Jikan-Aufrufe über die vorhandene serielle Queue/Backoff; Fehler pro Item
  schlucken, nie den ganzen Lauf abbrechen. Danach `invalidateQueries`.

Ursachen-Notiz (für den Fix-Kontext, nicht Teil der UI): Duplikate entstehen u. a.
im Franchise-Wizard, weil gegen den *veralteten* React-Query-Snapshot
(`useAnimesQuery().data`) dedupliziert wird, während mehrstufige Schritte bereits
Zeilen eingefügt haben. Langfristige Härtung (optional, separater Schritt):
Dedup-Prüfung im Wizard gegen den frisch invalidierten Cache statt gegen den
Wizard-lokalen Snapshot.

### 4. Animationen weicher + mehr Leben

Zentral in `tailwind.config.ts` und `src/index.css`.

Weicher (Overshoot/Sprünge reduzieren):
- `iconBounce` Scale `1.4` → `~1.15`.
- `winnerPop` Scale `1.1` → `1.05`.
- `.hover-lift` `translateY(-4px) scale(1.03)` → `translateY(-2px) scale(1.01)`,
  Dauer leicht länger; durchgehend ruhiges ease-out.
- `staggerFadeIn` `translateY(20px)` → `~12px`, Dauer minimal länger.

Neu, wo es passt (dezent, mit `prefers-reduced-motion`-Guard – bereits global
vorhanden):
- Gestaffelte Karten-Einblendung pro Hub-Gruppe (inkrementelle Delays via
  CSS-Variable/`nth-child`, nicht pro Karte JS).
- Sanftes „Radar"-Pulsen am Cyan-Chip der „Sucht Neuigkeiten"-Einträge.
- Dezenter einmaliger Glanz/Fade-Up bei „Neuerscheinungen"-Karten beim Mount.
- Weiches Fade beim Seitenwechsel (Page-Container).

## Betroffene Dateien (Überblick)

Neu:
- `src/theme/categoryTheme.ts`
- `src/theme/useThemeGlow.ts` (oder in bestehenden Hook-Ordner)
- `src/features/maintenance/repair.ts`
- `src/features/maintenance/RepairModal.tsx`

Geändert:
- `src/features/watched/WatchedPage.tsx` (Neuaufbau als Hub)
- `src/components/ui/PageHeader.tsx` (accent-Prop)
- `src/App.tsx` (`/continuation` → Redirect)
- `src/components/layout/BottomNav.tsx` (optional: Tab-Farben; Preset-Konsistenz)
- `src/features/settings/SettingsPage.tsx` (Bibliothek-prüfen-Bereich)
- `src/api/animes.ts` (ggf. Helper fürs Merge/Backfill)
- `tailwind.config.ts` (weichere Animationstoken, neue Keyframes)
- `src/index.css` (hover-lift/glow, neue Motion-Utilities, theme-glow)
- Andere Listen-Seiten (`WatchlistPage`, `CurrentPage`) für Farb-Identität via
  `PageHeader accent` + `useThemeGlow`.

Entfernt/abgelöst:
- `src/features/continuation/ContinuationPage.tsx` (durch Hub ersetzt) — ggf. als
  Redirect belassen.

## Nicht im Scope (YAGNI)

- Kein Umbau des Franchise-Wizards selbst (nur optionale Dedup-Härtung als
  Folgeschritt notiert).
- Keine neuen Datenfelder/Migrationen in Supabase.
- Keine Änderung der Discover-/Dashboard-Inhalte über das Farb-System hinaus.

## Verifikation

- `npm run typecheck` und `npm run lint` müssen sauber sein.
- Dev-Server via Preview-Tools starten; Geschaut-Hub, Farben, Cover-Fallback und
  Animationen visuell prüfen (Screenshots), inkl. `prefers-reduced-motion` und
  Dark-Mode (App ist durchgängig dunkel).
- Repair-Flow gegen echte Daten: Scan zeigt Funde → Auswahl → Bereinigung; danach
  Cover sichtbar, keine Duplikate mehr.
```
