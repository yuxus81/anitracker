import { useState, type CSSProperties, type ReactNode } from 'react';
import { ErrorState } from '@/components/ui/ErrorState';
import { cn } from '@/utils/cn';
import { useFranchiseAggregate } from '@/features/franchise/useFranchiseAggregate';
import type { FranchiseAggregate, FranchiseEntry } from '@/features/franchise/aggregate';
import {
  AiringBanner,
  EntryStats,
  LinkTile,
  ScoreValue,
  StatTile,
  TileSkeletons,
  typeLabel,
  type TileTone,
} from './detailParts';

type GroupKey = 'seasons' | 'movies' | 'specials' | 'announced';

const GROUP_LABEL: Record<GroupKey, string> = {
  seasons: 'Staffeln',
  movies: 'Filme',
  specials: 'Specials',
  announced: 'Angekündigt',
};

type View =
  | { level: 'overview' }
  | { level: 'group'; group: GroupKey }
  | { level: 'entry'; group: GroupKey; entry: FranchiseEntry };

/**
 * The "Version 1" whole-franchise popup. The overview shows stat tiles; the
 * collection tiles (Staffeln/Filme/Specials/Angekündigt) drill into a list of
 * their members, and each member drills into its own Version 2 detail. All data
 * comes from a single aggregate query, so navigation between levels is instant.
 *
 * `header` (cover, title, airing banner) and `actions` render around the tiles
 * on the overview level and step aside while browsing a sub-level.
 */
export function FranchiseExplorer({
  malId,
  header,
  actions,
}: {
  malId: number;
  header: ReactNode;
  actions: ReactNode;
}) {
  const { data, isLoading, isPartial, isError, refetch } = useFranchiseAggregate(malId, true);
  const [view, setView] = useState<View>({ level: 'overview' });
  const [dir, setDir] = useState<'none' | 'in' | 'back'>('none');

  const go = (next: View) => {
    setDir('in');
    setView(next);
  };
  const back = (next: View) => {
    setDir('back');
    setView(next);
  };

  const anim = dir === 'in' ? 'animate-drill-in' : dir === 'back' ? 'animate-drill-back' : '';
  const key =
    view.level === 'overview'
      ? 'ov'
      : view.level === 'group'
        ? `g:${view.group}`
        : `e:${view.entry.malId}`;

  let body: ReactNode;
  if (view.level === 'group' && data) {
    body = (
      <GroupList
        group={view.group}
        entries={data[view.group]}
        onBack={() => back({ level: 'overview' })}
        onOpen={(entry) => go({ level: 'entry', group: view.group, entry })}
      />
    );
  } else if (view.level === 'entry') {
    const g = view.group;
    body = (
      <EntryDetail
        entry={view.entry}
        backLabel={GROUP_LABEL[g]}
        onBack={() => back({ level: 'group', group: g })}
      />
    );
  } else {
    body = (
      <div className="text-center">
        {header}
        {isLoading ? (
          <TileSkeletons count={4} />
        ) : isError || !data ? (
          <div className="my-4">
            <ErrorState onRetry={() => refetch()} />
          </div>
        ) : (
          <>
            <TilesGrid data={data} onOpen={(group) => go({ level: 'group', group })} />
            {isPartial && <PartialHint />}
          </>
        )}
        {actions}
      </div>
    );
  }

  return (
    <div key={key} className={anim}>
      {body}
    </div>
  );
}

/** Subtle "still loading more of the franchise" cue shown under partial tiles. */
function PartialHint() {
  return (
    <div className="mb-1 flex items-center justify-center gap-2 text-xs font-medium text-muted">
      <span
        aria-hidden
        className="h-3.5 w-3.5 animate-spin-slow rounded-full border-2 border-accent-neon/30 border-t-accent-neon"
      />
      Weitere Einträge werden geladen…
    </div>
  );
}

// ---- Overview tiles ---------------------------------------------------------

interface TileDesc {
  kind: 'link' | 'stat';
  label: string;
  value: ReactNode;
  tone?: TileTone;
  group?: GroupKey;
}

function TilesGrid({ data, onOpen }: { data: FranchiseAggregate; onOpen: (g: GroupKey) => void }) {
  const tiles: TileDesc[] = [];
  if (data.seasons.length > 0) {
    tiles.push({ kind: 'link', group: 'seasons', label: 'Staffeln', value: String(data.seasons.length) });
    tiles.push({ kind: 'stat', label: 'Folgen', value: data.episodes > 0 ? String(data.episodes) : '—' });
  }
  if (data.movies.length > 0)
    tiles.push({ kind: 'link', group: 'movies', label: 'Filme', value: String(data.movies.length) });
  if (data.specials.length > 0)
    tiles.push({ kind: 'link', group: 'specials', label: 'Specials', value: String(data.specials.length) });
  if (data.announced.length > 0)
    tiles.push({ kind: 'link', group: 'announced', label: 'Angekündigt', value: String(data.announced.length) });
  tiles.push({ kind: 'stat', label: 'Ø Bewertung', tone: 'gold', value: <ScoreValue score={data.score} /> });

  return (
    <div className="my-4 grid grid-cols-2 gap-2.5">
      {tiles.map((t, i) => {
        const lastOdd = i === tiles.length - 1 && tiles.length % 2 === 1;
        const cls = cn('stagger-item', lastOdd && 'col-span-2');
        const style: CSSProperties = { animationDelay: `${i * 55}ms` };
        return t.kind === 'link' ? (
          <LinkTile
            key={t.label}
            label={t.label}
            value={t.value}
            className={cls}
            style={style}
            onClick={() => onOpen(t.group!)}
          />
        ) : (
          <StatTile
            key={t.label}
            label={t.label}
            value={t.value}
            tone={t.tone}
            className={cls}
            style={style}
          />
        );
      })}
    </div>
  );
}

// ---- Sub-levels -------------------------------------------------------------

function BackBar({ label, count, onBack }: { label: string; count?: number; onBack: () => void }) {
  return (
    <div className="sticky top-0 z-10 -mx-3.5 mb-3 flex items-center gap-2 border-b border-white/5 bg-card/95 px-3.5 py-2 text-left backdrop-blur-sm">
      <button
        type="button"
        onClick={onBack}
        aria-label="Zurück"
        className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-full border border-accent-purple/35 bg-accent-purple/10 text-accent-purple transition hover:bg-accent-purple hover:text-white"
      >
        <span aria-hidden className="-mt-0.5 text-lg leading-none">
          ‹
        </span>
      </button>
      <span className="text-sm font-bold text-ink">{label}</span>
      {count !== undefined && (
        <span className="rounded-full border border-accent-neon/30 bg-accent-neon/10 px-2 py-0.5 text-xs font-bold text-accent-neon">
          {count}
        </span>
      )}
    </div>
  );
}

function GroupList({
  group,
  entries,
  onBack,
  onOpen,
}: {
  group: GroupKey;
  entries: FranchiseEntry[];
  onBack: () => void;
  onOpen: (entry: FranchiseEntry) => void;
}) {
  return (
    <div className="text-left">
      <BackBar label={GROUP_LABEL[group]} count={entries.length} onBack={onBack} />
      <div className="flex flex-col gap-2">
        {entries.map((e, i) => (
          <button
            key={e.malId}
            type="button"
            onClick={() => onOpen(e)}
            style={{ animationDelay: `${i * 45}ms` }}
            className="stagger-item hover-lift hover-press group flex items-center gap-3 rounded-xl2 border border-white/[0.08] bg-white/[0.03] p-2.5 text-left transition-colors hover:border-accent-neon/40"
          >
            {e.cover ? (
              <img
                src={e.cover}
                alt=""
                loading="lazy"
                className="h-16 w-11 flex-shrink-0 rounded-lg object-cover shadow-card"
              />
            ) : (
              <span className="grid h-16 w-11 flex-shrink-0 place-items-center rounded-lg bg-accent-purple/10 text-lg">
                🎬
              </span>
            )}
            <span className="min-w-0 flex-1">
              <span className="line-clamp-1 block text-sm font-bold text-ink">{e.title}</span>
              <span className="mt-0.5 block text-xs text-muted">
                {[typeLabel(e.type, null), e.year].filter(Boolean).join(' · ')}
              </span>
              {e.airing && (
                <span className="mt-1 inline-flex items-center gap-1.5 text-[0.65rem] font-bold text-accent-neon">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent-neon" aria-hidden />
                  Läuft
                </span>
              )}
            </span>
            {e.score != null && (
              <span className="flex-shrink-0 rounded-md bg-black/40 px-1.5 py-0.5 text-xs font-bold text-accent-neon">
                ★ {e.score}
              </span>
            )}
            <span
              aria-hidden
              className="flex-shrink-0 text-accent-neon/50 transition-transform group-hover:translate-x-0.5"
            >
              ›
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function EntryDetail({
  entry,
  backLabel,
  onBack,
}: {
  entry: FranchiseEntry;
  backLabel: string;
  onBack: () => void;
}) {
  return (
    <div>
      <BackBar label={backLabel} onBack={onBack} />
      <div className="text-center">
        {entry.cover && (
          <img
            src={entry.cover}
            alt=""
            className="mx-auto max-h-72 rounded-2xl object-contain shadow-glow-purple"
          />
        )}
        <h3 className="mt-3 text-lg font-extrabold leading-tight">{entry.title}</h3>
        {entry.airing && <AiringBanner broadcast={entry.broadcast} />}
        <EntryStats
          score={entry.score}
          episodes={entry.episodes}
          duration={entry.duration}
          type={entry.type}
        />
      </div>
    </div>
  );
}
