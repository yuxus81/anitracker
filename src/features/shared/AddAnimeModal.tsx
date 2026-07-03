import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { useUIStore, toast } from '@/store/ui';
import { useAddAnime } from '@/hooks/useAnimes';
import { useAnimeSearch } from '@/hooks/useSearch';
import { useFranchiseStore } from '@/features/franchise/franchiseStore';
import { getBestTitle, getCover } from '@/utils/titles';
import { cn } from '@/utils/cn';
import type { AnimeCategory } from '@/types/db';
import type { JikanAnime } from '@/types/jikan';

const TARGETS: Array<{ key: AnimeCategory; label: string; icon: string }> = [
  { key: 'watchlist', label: 'Watchlist', icon: '🔖' },
  { key: 'current', label: 'Am Schauen', icon: '▶️' },
  { key: 'watched', label: 'Geschaut', icon: '✅' },
  { key: 'next_season', label: 'Fortsetzung', icon: '🔮' },
];

const TARGET_LABEL: Record<AnimeCategory, string> = {
  watchlist: 'Watchlist',
  current: 'Am Schauen',
  watched: 'Geschaut',
  next_season: 'Fortsetzung folgt',
};

export function AddAnimeModal() {
  const open = useUIStore((s) => s.addModalOpen);
  const preset = useUIStore((s) => s.addModalPreset);
  const close = useUIStore((s) => s.closeAddModal);

  const [target, setTarget] = useState<AnimeCategory>(preset ?? 'watchlist');
  const [query, setQuery] = useState('');
  const search = useAnimeSearch(query);
  const addAnime = useAddAnime();
  const openFranchise = useFranchiseStore((s) => s.open);

  // Keep the target in sync with the preset each time the modal opens.
  const [lastPreset, setLastPreset] = useState(preset);
  if (open && preset !== lastPreset) {
    setLastPreset(preset);
    setTarget(preset ?? 'watchlist');
  }

  // On a specific category page the target is already clear from context, so we
  // skip the chooser and add straight into that list. The chooser only appears
  // from Home / the global "+", where no preset is given.
  const showChooser = preset == null;
  const modalTitle =
    preset == null ? 'Anime hinzufügen' : `Zu „${TARGET_LABEL[preset]}" hinzufügen`;

  function handleClose() {
    setQuery('');
    close();
  }

  async function handlePick(anime: JikanAnime) {
    const title = getBestTitle(anime);
    const coverUrl = getCover(anime);

    // "Geschaut" routes through the franchise timeline scanner instead of a plain insert.
    if (target === 'watched') {
      handleClose();
      openFranchise({ malId: anime.mal_id, title, coverUrl });
      return;
    }

    await addAnime.mutateAsync({
      title,
      category: target,
      status: 'active',
      mal_id: anime.mal_id,
      cover_url: coverUrl,
      is_released: false,
      is_placeholder: false,
      sort_order: Date.now(),
      ...(target === 'next_season'
        ? { format: 'season', release_label: 'Datum unbekannt' }
        : {}),
    });
    toast.success(`„${title}" hinzugefügt`);
    handleClose();
  }

  return (
    <Modal open={open} onClose={handleClose} title={modalTitle} size="md">
      {/* Target chooser — only from Home / the global "+", where the list is
          not implied by the current page. */}
      {showChooser && (
        <div className="mb-4 grid grid-cols-4 gap-2">
          {TARGETS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTarget(t.key)}
              className={cn(
                'flex flex-col items-center gap-1 rounded-xl border px-2 py-3 text-xs font-semibold transition',
                target === t.key
                  ? 'border-accent-purple bg-accent-purple/20 text-white'
                  : 'border-white/10 bg-white/5 text-muted hover:text-white',
              )}
            >
              <span className="text-lg" aria-hidden>
                {t.icon}
              </span>
              {t.label}
            </button>
          ))}
        </div>
      )}

      <div className="relative mb-4">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted">
          🔍
        </span>
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Anime suchen…"
          className="w-full rounded-xl border border-white/10 bg-black/30 py-3 pl-11 pr-4 text-base text-white outline-none focus:border-accent-purple"
        />
      </div>

      <div className="min-h-[120px]">
        {query.trim().length < 2 ? (
          <EmptyState title="Suche nach einem Titel" hint="Mindestens 2 Zeichen eingeben." />
        ) : search.isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-2">
                <Skeleton className="h-16 w-11 rounded-lg" />
                <Skeleton className="h-4 w-2/3 rounded" />
              </div>
            ))}
          </div>
        ) : search.isError ? (
          <ErrorState onRetry={() => search.refetch()} />
        ) : (search.data?.length ?? 0) === 0 ? (
          <EmptyState title="Nichts gefunden" hint="Versuch einen anderen Titel." />
        ) : (
          <ul className="space-y-1">
            {search.data!.map((a) => (
              <li key={a.mal_id}>
                <button
                  type="button"
                  onClick={() => handlePick(a)}
                  disabled={addAnime.isPending}
                  className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition hover:bg-white/5 disabled:opacity-50"
                >
                  <img
                    src={getCover(a) ?? ''}
                    alt=""
                    loading="lazy"
                    className="h-16 w-11 flex-shrink-0 rounded-lg object-cover"
                  />
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{getBestTitle(a)}</span>
                    <span className="text-xs text-muted">
                      {a.type ?? 'Anime'}
                      {a.year ? ` · ${a.year}` : ''}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}
