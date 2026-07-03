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
  const dupeRows = report.duplicates.reduce((n, g) => n + g.remove.length, 0);

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
              /* skip this item, keep going */
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
        <p className="text-sm text-muted">
          Alles sauber — keine fehlenden Cover, keine Duplikate.
        </p>
      ) : (
        <div className="space-y-4">
          <label className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
            <input
              type="checkbox"
              checked={fixCovers}
              onChange={(e) => setFixCovers(e.target.checked)}
              className="mt-0.5 accent-green"
            />
            <span className="min-w-0 text-sm">
              <span className="font-semibold text-ink">
                {report.missingCovers.length} Cover fehlen
              </span>
              <span className="block text-xs text-muted">Werden aus MyAnimeList nachgeladen.</span>
            </span>
          </label>

          <label className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
            <input
              type="checkbox"
              checked={fixDupes}
              onChange={(e) => setFixDupes(e.target.checked)}
              className="mt-0.5 accent-green"
            />
            <span className="min-w-0 text-sm">
              <span className="font-semibold text-ink">
                {report.duplicates.length} Duplikat-Gruppen ({dupeRows} Einträge)
              </span>
              <span className="block text-xs text-muted">
                Das vollständigste Exemplar bleibt, die Dubletten werden entfernt.
              </span>
            </span>
          </label>

          <Button
            variant="primary"
            fullWidth
            loading={busy}
            disabled={!fixCovers && !fixDupes}
            onClick={apply}
          >
            Ausgewählte bereinigen
          </Button>
        </div>
      )}
    </Modal>
  );
}
