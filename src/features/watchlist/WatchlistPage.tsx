import { useEffect, useRef, useState } from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useGroupedAnimes, useReorder, useUpdateAnime } from '@/hooks/useAnimes';
import { useDetailStore } from '@/features/shared/detailStore';
import { useUIStore, toast } from '@/store/ui';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { cn } from '@/utils/cn';
import type { AnimeRow } from '@/types/db';

export function WatchlistPage() {
  const { grouped, isLoading, isError, refetch } = useGroupedAnimes();
  const reorder = useReorder();
  const openAddModal = useUIStore((s) => s.openAddModal);

  const [items, setItems] = useState<AnimeRow[]>([]);
  const [rouletteOpen, setRouletteOpen] = useState(false);

  // Mirror the server order locally so drag-and-drop feels instant.
  useEffect(() => setItems(grouped.watchlist), [grouped.watchlist]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(items, oldIndex, newIndex);
    setItems(next);
    reorder.mutate(next.map((it, idx) => ({ id: it.id, sort_order: idx })));
  }

  return (
    <div className="animate-stagger">
      <PageHeader
        title="Watchlist"
        count={grouped.counts.watchlist}
        accent="watchlist"
        action={
          <div className="flex gap-2">
            {items.length > 1 && (
              <Button size="sm" variant="neon" onClick={() => setRouletteOpen(true)}>
                🎲 Roulette
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => openAddModal('watchlist')}>
              + Hinzufügen
            </Button>
          </div>
        }
      />

      {isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="skeleton aspect-[2/3] w-full rounded-xl2" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title="Deine Watchlist ist leer"
          hint="Sammle hier alles, was du noch schauen willst — per Drag & Drop sortierbar."
          action={
            <button className="link" onClick={() => openAddModal('watchlist')}>
              + Anime hinzufügen
            </button>
          }
        />
      ) : (
        <>
          <p className="mb-4 text-xs text-muted">↕ Zum Sortieren am Griff ziehen</p>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={items.map((i) => i.id)} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {items.map((a) => (
                  <SortableCard key={a.id} anime={a} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </>
      )}

      {rouletteOpen && items.length > 0 && (
        <RouletteModal items={items} onClose={() => setRouletteOpen(false)} />
      )}
    </div>
  );
}

function SortableCard({ anime }: { anime: AnimeRow }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: anime.id,
  });
  const openRow = useDetailStore((s) => s.openRow);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'relative overflow-hidden rounded-xl2 border border-white/5 bg-card shadow-card',
        isDragging && 'ring-2 ring-accent-purple',
      )}
    >
      <button
        {...attributes}
        {...listeners}
        aria-label="Verschieben"
        className="absolute left-1.5 top-1.5 z-10 grid h-8 w-8 cursor-grab touch-none place-items-center rounded-lg bg-black/60 text-white/80 active:cursor-grabbing"
      >
        ⠿
      </button>

      <button
        type="button"
        onClick={() => openRow(anime)}
        aria-label={`Details zu ${anime.title}`}
        className="hover-lift block w-full text-left"
      >
        <span className="block aspect-[2/3] w-full bg-black/30">
          {anime.cover_url && (
            <img
              src={anime.cover_url}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover"
            />
          )}
        </span>
        <span className="block p-2">
          <span className="block truncate text-xs font-bold">{anime.title}</span>
        </span>
      </button>
    </div>
  );
}

/** Random pick with a slot-machine-style spin, then a winner. */
function RouletteModal({ items, onClose }: { items: AnimeRow[]; onClose: () => void }) {
  const [current, setCurrent] = useState<AnimeRow | null>(null);
  const [winner, setWinner] = useState<AnimeRow | null>(null);
  const update = useUpdateAnime();
  const timer = useRef<number | null>(null);

  function spin() {
    if (timer.current) window.clearInterval(timer.current);
    setWinner(null);
    let ticks = 0;
    const total = 18 + Math.floor(Math.random() * 6);
    timer.current = window.setInterval(() => {
      ticks += 1;
      const pick = items[Math.floor(Math.random() * items.length)] ?? null;
      setCurrent(pick);
      if (ticks >= total) {
        if (timer.current) window.clearInterval(timer.current);
        setWinner(pick);
      }
    }, 90);
  }

  useEffect(() => {
    spin();
    return () => {
      if (timer.current) window.clearInterval(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function watchWinner() {
    if (!winner) return;
    update.mutate({
      id: winner.id,
      patch: { category: 'current', status: 'active', sort_order: Date.now() },
    });
    toast.success(`Los geht's mit „${winner.title}"`, '▶️');
    onClose();
  }

  return (
    <Modal open onClose={onClose} title="🎲 Anime-Roulette" size="sm">
      <div className="text-center">
        {current && (
          <div className={winner ? 'animate-winner-pop' : ''}>
            {current.cover_url && (
              <img
                src={current.cover_url}
                alt=""
                className="mx-auto h-56 rounded-2xl object-contain shadow-glow-purple"
              />
            )}
            <p className="mt-3 text-lg font-extrabold leading-tight">{current.title}</p>
          </div>
        )}

        {winner ? (
          <div className="mt-5 flex flex-col gap-2">
            <Button variant="neon" fullWidth onClick={watchWinner}>
              ▶ Das schaue ich
            </Button>
            <Button variant="ghost" fullWidth onClick={spin}>
              🎲 Nochmal drehen
            </Button>
          </div>
        ) : (
          <p className="mt-3 text-sm font-semibold text-muted">Wird ausgelost…</p>
        )}
      </div>
    </Modal>
  );
}
