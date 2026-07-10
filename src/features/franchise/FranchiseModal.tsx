import { useEffect, useRef, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { ActionButton } from '@/components/ui/ActionButton';
import { ErrorState } from '@/components/ui/ErrorState';
import { useAnimesQuery, useAddAnime, useUpdateAnime } from '@/hooks/useAnimes';
import { toast } from '@/store/ui';
import { cn } from '@/utils/cn';
import type { AnimeFormat, AnimeStatus, NewAnime } from '@/types/db';
import { useFranchiseStore, type FranchiseSeed } from './franchiseStore';
import { useFranchiseScan } from './useFranchiseScan';
import type { TimelineNode } from './scan';

export function FranchiseModal() {
  const seed = useFranchiseStore((s) => s.seed);
  const close = useFranchiseStore((s) => s.close);
  if (!seed) return null;
  // Key by seed so all wizard state resets cleanly on each open.
  return (
    <Modal open onClose={close} size="lg">
      <FranchiseWizard key={`${seed.malId}-${seed.existingId ?? 'new'}`} seed={seed} onDone={close} />
    </Modal>
  );
}

function FranchiseWizard({ seed, onDone }: { seed: FranchiseSeed; onDone: () => void }) {
  const hasMal = seed.malId !== null;
  const scan = useFranchiseScan(seed.malId, hasMal);

  const { data: animes } = useAnimesQuery();
  const addAnime = useAddAnime();
  const update = useUpdateAnime();

  const [step, setStep] = useState<'timeline' | 'unknown'>(hasMal ? 'timeline' : 'unknown');
  const [selectedId, setSelectedId] = useState<number | null>(seed.malId);
  const [cutIndex, setCutIndex] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  // Tracks the "finished" watched row so we never insert it twice across steps.
  const finishedId = useRef<string | null>(seed.existingId ?? null);

  const nodes = scan.data ?? [];

  // A node you can actually mark as "last finished": it must already be out
  // (or currently airing). Not-yet-released entries are never selectable.
  const isSelectable = (n: TimelineNode) => n.released || n.airing;

  // Default the selection to the seed node when it's selectable, else the last
  // released/airing node (never a future one).
  useEffect(() => {
    if (nodes.length === 0) return;
    const seedNode = nodes.find((n) => n.malId === seed.malId);
    if (seedNode && isSelectable(seedNode)) {
      setSelectedId(seed.malId);
      return;
    }
    const lastSelectable = [...nodes].reverse().find(isSelectable);
    setSelectedId(lastSelectable?.malId ?? nodes[nodes.length - 1]?.malId ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scan.data]);

  function pickFinishedNode(): TimelineNode | null {
    return nodes.find((n) => n.malId === selectedId) ?? null;
  }

  /** Ensure the finished series exists as a watched row with the given status. */
  async function finalizeWatched(status: AnimeStatus): Promise<string> {
    const node = pickFinishedNode();
    const nodePatch = node ? { title: node.title, cover_url: node.cover, mal_id: node.malId } : {};

    if (finishedId.current) {
      await update.mutateAsync({
        id: finishedId.current,
        patch: { category: 'watched', status, is_released: false, is_placeholder: false, ...nodePatch },
      });
      return finishedId.current;
    }

    const malId = node?.malId ?? seed.malId;
    const existing = malId != null ? animes?.find((a) => a.mal_id === malId) : undefined;
    if (existing) {
      finishedId.current = existing.id;
      await update.mutateAsync({ id: existing.id, patch: { category: 'watched', status } });
      return existing.id;
    }

    const row = await addAnime.mutateAsync({
      title: node?.title ?? seed.title,
      category: 'watched',
      status,
      mal_id: malId ?? null,
      cover_url: node?.cover ?? seed.coverUrl,
      sort_order: Date.now(),
    });
    finishedId.current = row.id;
    return row.id;
  }

  /** Mark already-watched-through entries (earlier tracked seasons) as superseded. */
  async function supersedeThrough(malIds: number[]) {
    const set = new Set(malIds);
    const targets = (animes ?? []).filter(
      (a) =>
        a.mal_id != null &&
        set.has(a.mal_id) &&
        a.id !== finishedId.current &&
        (a.category === 'next_season' || a.category === 'current'),
    );
    for (const t of targets) {
      await update.mutateAsync({ id: t.id, patch: { category: 'watched', status: 'superseded' } });
    }
  }

  /** Create/update the next canonical entry as a tracked continuation. */
  async function ensureNextSeason(node: TimelineNode) {
    const format: AnimeFormat = node.type === 'Movie' ? 'movie' : 'season';
    const base: NewAnime = {
      title: node.title,
      category: 'next_season',
      status: 'active',
      mal_id: node.malId,
      cover_url: node.cover,
      format,
      release_label: node.label ?? 'Datum unbekannt',
      is_released: node.released,
      is_placeholder: false,
    };
    const existing = animes?.find((a) => a.mal_id === node.malId);
    if (existing) {
      await update.mutateAsync({ id: existing.id, patch: base });
    } else {
      await addAnime.mutateAsync({ ...base, sort_order: Date.now() });
    }
  }

  function setCut(i: number) {
    const next = cutIndex === i ? null : i;
    setCutIndex(next);
    // If the current selection falls into the ignored region, pull it back to the cut.
    if (next !== null) {
      const selIdx = nodes.findIndex((n) => n.malId === selectedId);
      if (selIdx > next) setSelectedId(nodes[next]?.malId ?? null);
    }
  }

  async function confirmTimeline() {
    const effective = cutIndex === null ? nodes : nodes.slice(0, cutIndex + 1);
    const selIdx = effective.findIndex((n) => n.malId === selectedId);
    if (selIdx < 0) return;
    const nextNode = effective[selIdx + 1] ?? null;

    setBusy(true);
    try {
      await finalizeWatched('active');
      await supersedeThrough(effective.slice(0, selIdx + 1).map((n) => n.malId));

      if (nextNode) {
        await ensureNextSeason(nextNode);
        toast.success(
          nextNode.released
            ? `Fortsetzung „${nextNode.title}" ist schon verfügbar!`
            : `Fortsetzung „${nextNode.title}" wird beobachtet`,
          nextNode.released ? '🔥' : '🔮',
        );
        onDone();
      } else {
        setStep('unknown');
      }
    } catch {
      /* mutation hooks already surface a toast + rollback */
    } finally {
      setBusy(false);
    }
  }

  // ---- Render -------------------------------------------------------------

  return (
    <div className="animate-stagger">
      <SeedHeader seed={seed} />

      {step === 'unknown' ? (
        <UnknownStep
          canGoBack={hasMal}
          busy={busy}
          onBack={() => setStep('timeline')}
          onFinished={async () => {
            setBusy(true);
            try {
              await finalizeWatched('dead');
              toast.success('Als abgeschlossen markiert', '🏁');
              onDone();
            } catch {
              /* handled by hook */
            } finally {
              setBusy(false);
            }
          }}
          onUncertain={async () => {
            setBusy(true);
            try {
              await finalizeWatched('limbo');
              toast.success('Wir halten automatisch nach Neuigkeiten Ausschau', '🔎');
              onDone();
            } catch {
              /* handled by hook */
            } finally {
              setBusy(false);
            }
          }}
          onPlaceholder={async (label, format) => {
            setBusy(true);
            try {
              await finalizeWatched('active');
              const finished = pickFinishedNode();
              await addAnime.mutateAsync({
                title: `${finished?.title ?? seed.title} – Fortsetzung`,
                category: 'next_season',
                status: 'active',
                mal_id: null,
                // Remember which season we're waiting on a sequel for, so the
                // daily sync can auto-upgrade this placeholder once MAL lists one.
                source_mal_id: finished?.malId ?? seed.malId,
                cover_url: finished?.cover ?? seed.coverUrl,
                format,
                release_label: label.trim() || 'Datum unbekannt',
                is_released: false,
                is_placeholder: true,
                sort_order: Date.now(),
              });
              toast.success('Platzhalter für die Fortsetzung angelegt', '🔮');
              onDone();
            } catch {
              /* handled by hook */
            } finally {
              setBusy(false);
            }
          }}
        />
      ) : scan.isLoading ? (
        <TimelineSkeleton />
      ) : scan.isError ? (
        <div className="mt-4">
          <ErrorState onRetry={() => scan.refetch()} />
          <Button variant="ghost" fullWidth className="mt-3" onClick={() => setStep('unknown')}>
            Ohne Scan fortfahren
          </Button>
        </div>
      ) : (
        <>
          <h3 className="mb-1 mt-4 text-center text-lg font-extrabold">
            Welche Staffel hast du zuletzt beendet?
          </h3>
          <p className="mb-4 text-center text-xs text-muted">
            Wähle die letzte gesehene aus. Mit der Schere ✂ blendest du Nicht-Kanon aus.
          </p>

          <div className="space-y-1">
            {nodes.map((node, i) => {
              const ignored = cutIndex !== null && i > cutIndex;
              const locked = !isSelectable(node);
              const disabled = ignored || locked;
              const selected = node.malId === selectedId && !disabled;
              return (
                <div
                  key={node.malId}
                  className="timeline-pop"
                  style={{ animationDelay: `${Math.min(i, 14) * 80}ms` }}
                >
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => setSelectedId(node.malId)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-xl2 border p-2.5 text-left transition-all duration-300',
                      ignored
                        ? 'border-white/5 opacity-40'
                        : locked
                          ? 'cursor-not-allowed border-white/5 bg-white/[0.02] opacity-60'
                          : selected
                            ? 'border-accent-neon bg-accent-neon/[0.12] shadow-[0_0_30px_-8px_rgba(0,245,212,0.85)]'
                            : 'border-accent-purple/25 bg-accent-purple/[0.06] hover:border-accent-purple/50 hover:bg-accent-purple/[0.12]',
                    )}
                  >
                    <span
                      className={cn(
                        'grid h-8 w-8 flex-shrink-0 place-items-center rounded-full border text-sm font-bold transition-all duration-300',
                        selected
                          ? 'border-accent-neon bg-accent-neon/25 text-accent-neon shadow-[0_0_14px_rgba(0,245,212,0.85)]'
                          : locked
                            ? 'border-white/15 bg-card text-muted'
                            : 'border-accent-purple/40 bg-accent-purple/15 text-[#c18eff]',
                      )}
                    >
                      {i + 1}
                    </span>
                    {node.cover ? (
                      <img
                        src={node.cover}
                        alt=""
                        loading="lazy"
                        className="h-20 w-14 flex-shrink-0 rounded-lg object-cover shadow-card"
                      />
                    ) : (
                      <div className="grid h-20 w-14 flex-shrink-0 place-items-center rounded-lg border border-accent-purple/25 bg-accent-purple/10 text-2xl">
                        🎬
                      </div>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[0.95rem] font-bold">{node.title}</span>
                      <span className="block text-xs text-muted">
                        {node.type ?? 'Anime'}
                        {node.label ? ` · ${node.label}` : ''}
                      </span>
                      {node.airing ? (
                        <span className="flex items-center gap-1.5 text-[0.7rem] font-bold text-accent-neon">
                          <span className="h-1.5 w-1.5 rounded-full bg-accent-neon" aria-hidden />
                          Läuft aktuell
                        </span>
                      ) : !node.released ? (
                        <span className="text-[0.7rem] font-bold text-orange">
                          🔒 Noch nicht erschienen
                        </span>
                      ) : null}
                    </span>
                    {selected ? (
                      <span className="text-lg text-accent-neon">✓</span>
                    ) : locked ? (
                      <span aria-hidden>🔒</span>
                    ) : null}
                  </button>

                  {i < nodes.length - 1 && (
                    <div className="flex items-center gap-2 py-0.5 pl-[22px]">
                      <span
                        className="h-5 w-[2px] rounded-full bg-gradient-to-b from-accent-purple to-accent-neon opacity-60"
                        aria-hidden
                      />
                      <button
                        type="button"
                        onClick={() => setCut(i)}
                        className={cn(
                          'rounded-full border px-2 py-0.5 text-[0.65rem] font-semibold transition',
                          cutIndex === i
                            ? 'border-danger bg-danger/15 text-danger'
                            : 'border-white/10 text-muted hover:text-white',
                        )}
                      >
                        {cutIndex === i ? '✂ Schnitt aufheben' : '✂ Ab hier ignorieren'}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <ActionButton
            variant="purple"
            className="mt-6 w-full"
            loading={busy}
            onClick={confirmTimeline}
          >
            Auswahl bestätigen
          </ActionButton>
        </>
      )}
    </div>
  );
}

function SeedHeader({ seed }: { seed: FranchiseSeed }) {
  return (
    <div className="flex items-center gap-3 rounded-xl2 border border-white/10 bg-white/5 p-3">
      {seed.coverUrl && (
        <img src={seed.coverUrl} alt="" className="h-14 w-10 flex-shrink-0 rounded-md object-cover" />
      )}
      <div className="min-w-0">
        <p className="text-[0.65rem] font-bold uppercase tracking-wide text-muted">Franchise-Scanner</p>
        <p className="truncate font-bold">{seed.title}</p>
      </div>
    </div>
  );
}

function TimelineSkeleton() {
  return (
    <div className="mt-4 space-y-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-xl border border-white/10 p-2">
          <div className="skeleton h-16 w-11 rounded-md" />
          <div className="flex-1 space-y-2">
            <div className="skeleton h-3 w-2/3 rounded" />
            <div className="skeleton h-3 w-1/3 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

function UnknownStep({
  canGoBack,
  busy,
  onBack,
  onFinished,
  onUncertain,
  onPlaceholder,
}: {
  canGoBack: boolean;
  busy: boolean;
  onBack: () => void;
  onFinished: () => void;
  onUncertain: () => void;
  onPlaceholder: (label: string, format: AnimeFormat) => void;
}) {
  const [expand, setExpand] = useState(false);
  const [label, setLabel] = useState('');
  const [format, setFormat] = useState<AnimeFormat>('season');

  return (
    <div className="mt-4">
      <h3 className="mb-1 text-center text-lg font-extrabold">Unbekannte Fortsetzung</h3>
      <p className="mb-5 text-center text-xs text-muted">
        Wir konnten keine nächste Staffel finden. Was gilt für diese Serie?
      </p>

      <div className="flex flex-col gap-2">
        <OptionButton
          icon="🏁"
          title="Serie ist beendet"
          desc="Keine weiteren Staffeln — ab ins Archiv."
          disabled={busy}
          onClick={onFinished}
        />

        <div className="rounded-xl border border-accent-purple/25 bg-accent-purple/[0.06]">
          <OptionButton
            icon="🔮"
            title="Bekommt eine Fortsetzung"
            desc="Als Platzhalter beobachten, bis mehr bekannt ist."
            disabled={busy}
            onClick={() => setExpand((v) => !v)}
            bare
          />
          {expand && (
            <div className="space-y-3 border-t border-white/10 p-3">
              <div className="flex gap-2">
                {(['season', 'movie'] as AnimeFormat[]).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFormat(f)}
                    className={cn(
                      'flex-1 rounded-lg border py-2 text-sm font-semibold transition',
                      format === f
                        ? 'border-accent-purple bg-accent-purple/20 text-white'
                        : 'border-white/10 bg-white/5 text-muted',
                    )}
                  >
                    {f === 'season' ? '📺 Staffel' : '🎬 Film'}
                  </button>
                ))}
              </div>
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Release, z. B. Frühling 2027 (optional)"
                className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none focus:border-accent-purple"
              />
              <Button
                variant="primary"
                fullWidth
                loading={busy}
                onClick={() => onPlaceholder(label, format)}
              >
                Platzhalter anlegen
              </Button>
            </div>
          )}
        </div>

        <OptionButton
          icon="🔎"
          title="Nicht sicher — automatisch suchen"
          desc="Wir prüfen täglich, ob eine Fortsetzung auftaucht."
          disabled={busy}
          onClick={onUncertain}
        />
      </div>

      {canGoBack && (
        <Button variant="ghost" fullWidth className="mt-4" onClick={onBack} disabled={busy}>
          ‹ Zurück zum Zeitstrahl
        </Button>
      )}
    </div>
  );
}

function OptionButton({
  icon,
  title,
  desc,
  onClick,
  disabled,
  bare,
}: {
  icon: string;
  title: string;
  desc: string;
  onClick: () => void;
  disabled?: boolean;
  bare?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex w-full items-center gap-3 p-3 text-left transition disabled:opacity-50',
        bare
          ? 'rounded-t-xl hover:bg-white/5'
          : 'rounded-xl border border-white/10 bg-white/5 hover:bg-white/10',
      )}
    >
      <span className="text-2xl" aria-hidden>
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block font-bold">{title}</span>
        <span className="block text-xs text-muted">{desc}</span>
      </span>
    </button>
  );
}
