import { useEffect, useState } from 'react';
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
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useGroupedAnimes, useReorder } from '@/hooks/useAnimes';
import { useUIStore } from '@/store/ui';
import { PageHeader } from '@/components/ui/PageHeader';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Button } from '@/components/ui/Button';
import { cn } from '@/utils/cn';
import type { AnimeRow } from '@/types/db';
import { NeonTicket } from './NeonTicket';

export function CurrentPage() {
  const { grouped, isLoading, isError, refetch } = useGroupedAnimes();
  const reorder = useReorder();
  const openAddModal = useUIStore((s) => s.openAddModal);
  const [items, setItems] = useState<AnimeRow[]>([]);

  useEffect(() => setItems(grouped.current), [grouped.current]);

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
        title="Am Schauen"
        count={grouped.counts.current}
        action={
          <Button size="sm" variant="ghost" onClick={() => openAddModal('current')}>
            + Hinzufügen
          </Button>
        }
      />

      {isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : isLoading ? (
        <ListSkeleton count={4} />
      ) : items.length === 0 ? (
        <EmptyState
          title="Du schaust gerade nichts"
          hint="Trag ein, was gerade läuft — beim Abschließen findet der Franchise-Scanner die nächste Staffel."
          action={
            <button className="link" onClick={() => openAddModal('current')}>
              + Serie hinzufügen
            </button>
          }
        />
      ) : (
        <>
          <p className="mb-4 text-xs text-muted">↕ Zum Sortieren am Griff ziehen</p>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
              <div className="flex flex-col gap-3">
                {items.map((a) => (
                  <SortableTicket key={a.id} anime={a} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </>
      )}
    </div>
  );
}

function SortableTicket({ anime }: { anime: AnimeRow }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: anime.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  };
  return (
    <div ref={setNodeRef} style={style} className={cn('flex items-stretch gap-2', isDragging && 'opacity-90')}>
      <button
        {...attributes}
        {...listeners}
        aria-label="Verschieben"
        className="grid w-8 flex-shrink-0 cursor-grab touch-none place-items-center rounded-xl bg-white/5 text-white/60 active:cursor-grabbing"
      >
        ⠿
      </button>
      <div className="min-w-0 flex-1">
        <NeonTicket anime={anime} />
      </div>
    </div>
  );
}
