/**
 * Kalaswar Workroom — Order Operational Action Modals
 *
 * Scoped under .kw-app.
 * Modals for:
 * 1. Record Progress (pieces finished, artisan picker, evidence photo, batch note)
 * 2. Log Delay (delay reason, impact days, ways to recover, notify buyer toggle)
 * 3. Assign Artisan (skills-aware suggestions, match score, craft techniques, piece quota)
 * 4. Put On Hold (reason, freeze milestones)
 * 5. Record Quality Check (inspection verdict, criteria, defect notes, dispatch gating)
 */

import { useState } from "react";
import {
  X,
  Camera,
  AlertTriangle,
  UserCheck,
  PauseCircle,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  XCircle,
} from "lucide-react";
import { useAssignmentSuggestions } from "@/features/orders/hooks";

interface RecordProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { piecesFinished: number; artisanName: string; note: string }) => void;
  currentCompleted?: number;
  totalPieces?: number;
}

export function RecordProgressModal({
  isOpen,
  onClose,
  onSubmit,
  currentCompleted = 22,
  totalPieces = 40,
}: RecordProgressModalProps) {
  const [pieces, setPieces] = useState(4);
  const [artisan, setArtisan] = useState("Radha Devi");
  const [note, setNote] = useState("");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-4">
      <div className="w-full max-w-md bg-[var(--kw-surface-container-lowest)] rounded-2xl p-6 shadow-xl flex flex-col gap-5 border border-[var(--kw-outline-variant)]">
        <div className="flex items-center justify-between">
          <h3 className="kw-headline-sm text-[var(--kw-primary)]">Record progress</h3>
          <button
            type="button"
            className="text-[var(--kw-on-surface-variant)] hover:text-[var(--kw-on-surface)]"
            onClick={onClose}
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="kw-body-md text-[var(--kw-on-surface)]">Pieces finished today</span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="size-9 rounded-lg bg-[var(--kw-surface-container)] flex items-center justify-center font-bold hover:bg-[var(--kw-surface-container-high)] text-[var(--kw-on-surface)]"
                onClick={() => setPieces(Math.max(1, pieces - 1))}
              >
                -
              </button>
              <span className="kw-headline-sm text-[var(--kw-primary)] w-8 text-center">{pieces}</span>
              <button
                type="button"
                className="size-9 rounded-lg bg-[var(--kw-surface-container)] flex items-center justify-center font-bold hover:bg-[var(--kw-surface-container-high)] text-[var(--kw-on-surface)]"
                onClick={() => setPieces(Math.min(totalPieces - currentCompleted, pieces + 1))}
              >
                +
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-[var(--kw-on-surface-variant)] py-2 border-y border-[var(--kw-outline-variant)]">
            <span>Status after recording:</span>
            <span className="font-semibold text-[var(--kw-primary)]">
              {currentCompleted + pieces} of {totalPieces} pieces total
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="kw-label-sm text-[var(--kw-on-surface-variant)] uppercase tracking-wider text-[11px]">
              Done by
            </label>
            <select
              value={artisan}
              onChange={(e) => setArtisan(e.target.value)}
              className="h-11 px-3 rounded-lg bg-[var(--kw-surface-container-lowest)] border border-[var(--kw-outline-variant)] kw-body-md text-[var(--kw-on-surface)] focus:outline-none focus:border-[var(--kw-primary-container)]"
            >
              <option value="Radha Devi">Radha Devi (Kantha)</option>
              <option value="Suresh Warli">Suresh Warli (Folk Art)</option>
              <option value="Pushpa Mahato">Pushpa Mahato (Finishing)</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="kw-label-sm text-[var(--kw-on-surface-variant)] uppercase tracking-wider text-[11px]">
              Evidence photo (Optional)
            </label>
            <div className="h-16 rounded-xl bg-[var(--kw-surface-container-low)] border border-dashed border-[var(--kw-outline-variant)] flex items-center justify-center gap-2 cursor-pointer hover:bg-[var(--kw-surface-container)] transition-colors text-[var(--kw-on-surface-variant)]">
              <Camera className="size-5 text-[var(--kw-primary)]" />
              <span className="kw-body-sm">Click to capture or attach photo</span>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="kw-label-sm text-[var(--kw-on-surface-variant)] uppercase tracking-wider text-[11px]">
              Batch note
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g., Running stitch completed on 4 sleeves, passed to finishing"
              className="p-2.5 rounded-lg border border-[var(--kw-outline-variant)] kw-body-sm focus:outline-none focus:border-[var(--kw-primary-container)] resize-none"
              rows={2}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            className="kw-btn kw-btn-secondary h-10 text-xs"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="kw-btn kw-btn-primary h-10 text-xs"
            onClick={() => {
              onSubmit({ piecesFinished: pieces, artisanName: artisan, note });
              onClose();
            }}
          >
            Confirm & Save
          </button>
        </div>
      </div>
    </div>
  );
}

interface LogDelayModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { reason: string; days: number; notifyBuyer: boolean }) => void;
}

export function LogDelayModal({ isOpen, onClose, onSubmit }: LogDelayModalProps) {
  const [reason, setReason] = useState("Dye lot drying delayed due to humidity");
  const [days, setDays] = useState(2);
  const [notifyBuyer, setNotifyBuyer] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-4">
      <div className="w-full max-w-md bg-[var(--kw-surface-container-lowest)] rounded-2xl p-6 shadow-xl flex flex-col gap-5 border border-[var(--kw-outline-variant)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-full bg-[rgba(152,70,46,0.12)] flex items-center justify-center text-[var(--kw-secondary)]">
              <AlertTriangle className="size-4" />
            </div>
            <h3 className="kw-headline-sm text-[var(--kw-primary)]">Log a delay</h3>
          </div>
          <button
            type="button"
            className="text-[var(--kw-on-surface-variant)] hover:text-[var(--kw-on-surface)]"
            onClick={onClose}
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="kw-label-sm text-[var(--kw-on-surface-variant)] uppercase tracking-wider text-[11px]">
              Reason for delay
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="h-11 px-3 rounded-lg bg-[var(--kw-surface-container-lowest)] border border-[var(--kw-outline-variant)] kw-body-md text-[var(--kw-on-surface)] focus:outline-none focus:border-[var(--kw-primary-container)]"
            >
              <option value="Dye lot drying delayed due to humidity">Dye lot drying delayed due to humidity</option>
              <option value="Raw silk fabric delivery delayed from mill">Raw silk fabric delivery delayed from mill</option>
              <option value="Artisan illness in family">Artisan illness in family</option>
              <option value="Loom adjustment required">Loom adjustment required</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <span className="kw-body-md text-[var(--kw-on-surface)]">Estimated delay (days)</span>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 5].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDays(d)}
                  className={`size-9 rounded-lg font-semibold text-xs transition-colors ${
                    days === d
                      ? "bg-[var(--kw-secondary)] text-white"
                      : "bg-[var(--kw-surface-container)] text-[var(--kw-on-surface)] hover:bg-[var(--kw-surface-container-high)]"
                  }`}
                >
                  +{d}d
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-3 p-3 rounded-xl bg-[var(--kw-surface-container-low)] cursor-pointer">
            <input
              type="checkbox"
              checked={notifyBuyer}
              onChange={(e) => setNotifyBuyer(e.target.checked)}
              className="size-4 rounded accent-[var(--kw-primary-container)]"
            />
            <div className="flex flex-col text-xs">
              <span className="font-semibold text-[var(--kw-on-surface)]">Notify customer / buyer via WhatsApp</span>
              <span className="text-[var(--kw-on-surface-variant)]">Includes revised estimated dispatch timestamp</span>
            </div>
          </label>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            className="kw-btn kw-btn-secondary h-10 text-xs"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="kw-btn kw-btn-accent h-10 text-xs"
            onClick={() => {
              onSubmit({ reason, days, notifyBuyer });
              onClose();
            }}
          >
            Save Delay Record
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Flow 2: Assign Artisan Modal with Skills-Aware Suggestions ───────────────

interface AssignArtisanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { artisanId: string; pieces: number }) => void;
  orderId?: string;
  craft?: string;
  isArtisan?: boolean;
}

export function AssignArtisanModal({
  isOpen,
  onClose,
  onSubmit,
  orderId,
  craft,
  isArtisan = false,
}: AssignArtisanModalProps) {
  const [artisanId, setArtisanId] = useState("cccccccc-0001-0000-0000-000000000001");
  const [pieces, setPieces] = useState(16);

  const { data: suggestions, isLoading: isSuggestionsLoading } = useAssignmentSuggestions(orderId, craft);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-4">
      <div className="w-full max-w-lg bg-[var(--kw-surface-container-lowest)] rounded-2xl p-6 shadow-xl flex flex-col gap-5 border border-[var(--kw-outline-variant)] max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-full bg-[rgba(35,76,61,0.12)] flex items-center justify-center text-[var(--kw-primary)]">
              <UserCheck className="size-4" />
            </div>
            <div>
              <h3 className="kw-headline-sm text-[var(--kw-primary)]">Skills-Aware Artisan Assignment</h3>
              <p className="text-xs text-[var(--kw-on-surface-variant)]">
                Ranked by technique proficiency, past QA score & capacity
              </p>
            </div>
          </div>
          <button
            type="button"
            className="text-[var(--kw-on-surface-variant)] hover:text-[var(--kw-on-surface)]"
            onClick={onClose}
          >
            <X className="size-5" />
          </button>
        </div>

        {isArtisan && (
          <div
            role="status"
            className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs"
          >
            <ShieldAlert className="size-4 shrink-0 text-amber-600" />
            <span>
              <strong>Restricted Action:</strong> Artisans cannot assign production quotas to other members. Coordinator or Admin permissions are required.
            </span>
          </div>
        )}

        {/* Suggestions List */}
        <div className="space-y-3">
          <label className="kw-label-sm text-[var(--kw-on-surface-variant)] uppercase tracking-wider text-[11px] flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Sparkles className="size-3.5 text-amber-500" />
              <span>Recommended Cluster Artisans</span>
            </span>
            {isSuggestionsLoading && <span className="text-[10px] text-muted-foreground animate-pulse">Calculating matches…</span>}
          </label>

          {suggestions && suggestions.length > 0 ? (
            <div className="space-y-2">
              {suggestions.map((sugg) => {
                const isSelected = artisanId === sugg.artisan_id;
                return (
                  <div
                    key={sugg.artisan_id}
                    onClick={() => !isArtisan && setArtisanId(sugg.artisan_id)}
                    className={`p-3 rounded-xl border text-xs transition-all cursor-pointer ${
                      isSelected
                        ? "border-[var(--kw-primary)] bg-[var(--kw-primary-container)]/10 shadow-sm"
                        : "border-[var(--kw-outline-variant)] bg-[var(--kw-surface)] hover:bg-[var(--kw-surface-container-low)]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-[var(--kw-on-surface)]">
                          {sugg.artisan_name}
                        </span>
                        {sugg.recommended && (
                          <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                            ★ Top Match
                          </span>
                        )}
                      </div>
                      <span className="font-bold text-[var(--kw-primary)] bg-white px-2 py-0.5 rounded-md border border-[var(--kw-outline-variant)]">
                        {sugg.match_score}% Match
                      </span>
                    </div>

                    <div className="text-[11px] text-[var(--kw-on-surface-variant)] mt-1">
                      Cluster: {sugg.cluster} · Active Orders: {sugg.active_orders}
                    </div>

                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {sugg.craft_skills.map((skill) => (
                        <span
                          key={skill}
                          className="px-1.5 py-0.2 rounded bg-[var(--kw-surface-container)] text-[10px] text-[var(--kw-on-surface)]"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>

                    {sugg.reasons?.length > 0 && (
                      <div className="mt-2 text-[11px] text-emerald-800 bg-emerald-50/70 p-1.5 rounded">
                        ✓ {sugg.reasons.join(" • ")}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-3 rounded-lg bg-[var(--kw-surface-container-low)] text-xs text-[var(--kw-on-surface-variant)]">
              No automated suggestions available. Select an artisan manually below.
            </div>
          )}

          {/* Manual Select Fallback */}
          <div className="flex flex-col gap-1.5 pt-2">
            <label className="kw-label-sm text-[var(--kw-on-surface-variant)] uppercase tracking-wider text-[11px]">
              Or choose specific artisan
            </label>
            <select
              value={artisanId}
              onChange={(e) => setArtisanId(e.target.value)}
              disabled={isArtisan}
              className="h-10 px-3 rounded-lg bg-[var(--kw-surface-container-lowest)] border border-[var(--kw-outline-variant)] kw-body-md text-xs text-[var(--kw-on-surface)] focus:outline-none focus:border-[var(--kw-primary-container)]"
            >
              <option value="cccccccc-0001-0000-0000-000000000001">Radha Devi (Santiniketan · Kantha Master)</option>
              <option value="cccccccc-0002-0000-0000-000000000002">Suresh Warli (Dahanu · Warli Motif)</option>
              <option value="cccccccc-0003-0000-0000-000000000003">Salma Begum (Bolpur · Finishing & QA)</option>
            </select>
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="kw-body-md text-[var(--kw-on-surface)] text-xs font-semibold">Assigned piece quota</span>
            <input
              type="number"
              min={1}
              value={pieces}
              disabled={isArtisan}
              onChange={(e) => setPieces(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-24 h-9 px-3 text-right rounded-lg border border-[var(--kw-outline-variant)] kw-headline-sm text-sm text-[var(--kw-primary)]"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            className="kw-btn kw-btn-secondary h-10 text-xs"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isArtisan}
            className="kw-btn kw-btn-primary h-10 text-xs disabled:opacity-50"
            onClick={() => {
              onSubmit({ artisanId, pieces });
              onClose();
            }}
          >
            Assign Quota
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Put On Hold Modal ─────────────────────────────────────────────────────────

interface PutOnHoldModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => void;
}

export function PutOnHoldModal({ isOpen, onClose, onSubmit }: PutOnHoldModalProps) {
  const [reason, setReason] = useState("Awaiting buyer spec approval for logo patch");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-4">
      <div className="w-full max-w-md bg-[var(--kw-surface-container-lowest)] rounded-2xl p-6 shadow-xl flex flex-col gap-5 border border-[var(--kw-outline-variant)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-full bg-[rgba(0,0,0,0.06)] flex items-center justify-center text-[var(--kw-on-surface)]">
              <PauseCircle className="size-4" />
            </div>
            <h3 className="kw-headline-sm text-[var(--kw-on-surface)]">Put order on hold</h3>
          </div>
          <button
            type="button"
            className="text-[var(--kw-on-surface-variant)] hover:text-[var(--kw-on-surface)]"
            onClick={onClose}
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <p className="kw-body-sm text-[var(--kw-on-surface-variant)]">
            Putting an order on hold pauses active deadlines and milestone countdowns.
          </p>
          <div className="flex flex-col gap-1.5">
            <label className="kw-label-sm text-[var(--kw-on-surface-variant)] uppercase tracking-wider text-[11px]">
              Hold Reason
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="p-3 rounded-lg border border-[var(--kw-outline-variant)] kw-body-sm focus:outline-none focus:border-[var(--kw-primary-container)] resize-none"
              rows={3}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            className="kw-btn kw-btn-secondary h-10 text-xs"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="kw-btn kw-btn-primary h-10 text-xs"
            onClick={() => {
              onSubmit(reason);
              onClose();
            }}
          >
            Confirm Hold
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Flow 5: Quality Check Modal & Dispatch Gating Inspection ──────────────────

interface RecordQualityCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { result: "pass" | "fail" | "conditional"; notes: string }) => void;
  isArtisan?: boolean;
}

export function RecordQualityCheckModal({
  isOpen,
  onClose,
  onSubmit,
  isArtisan = false,
}: RecordQualityCheckModalProps) {
  const [result, setResult] = useState<"pass" | "fail" | "conditional">("pass");
  const [notes, setNotes] = useState("Weft tension verified, GI motif consistent with Santiniketan standard.");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-4">
      <div className="w-full max-w-md bg-[var(--kw-surface-container-lowest)] rounded-2xl p-6 shadow-xl flex flex-col gap-5 border border-[var(--kw-outline-variant)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700">
              <ShieldCheck className="size-5" />
            </div>
            <div>
              <h3 className="kw-headline-sm text-[var(--kw-primary)]">Record Quality Inspection</h3>
              <p className="text-xs text-[var(--kw-on-surface-variant)]">Dispatch Gating Gatekeeper</p>
            </div>
          </div>
          <button
            type="button"
            className="text-[var(--kw-on-surface-variant)] hover:text-[var(--kw-on-surface)]"
            onClick={onClose}
          >
            <X className="size-5" />
          </button>
        </div>

        {isArtisan && (
          <div
            role="status"
            className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs"
          >
            <ShieldAlert className="size-4 shrink-0 text-amber-600" />
            <span>
              <strong>Restricted Action:</strong> Quality Check sign-offs require an SHG Coordinator or Admin role.
            </span>
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="kw-label-sm text-[var(--kw-on-surface-variant)] uppercase tracking-wider text-[11px]">
              Inspection Verdict
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setResult("pass")}
                className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center gap-1 ${
                  result === "pass"
                    ? "border-emerald-600 bg-emerald-50 text-emerald-900 font-bold"
                    : "border-[var(--kw-outline-variant)] text-[var(--kw-on-surface)] hover:bg-[var(--kw-surface-container)]"
                }`}
              >
                <CheckCircle2 className="size-4 text-emerald-600" />
                <span className="text-xs">Pass</span>
              </button>
              <button
                type="button"
                onClick={() => setResult("conditional")}
                className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center gap-1 ${
                  result === "conditional"
                    ? "border-amber-600 bg-amber-50 text-amber-900 font-bold"
                    : "border-[var(--kw-outline-variant)] text-[var(--kw-on-surface)] hover:bg-[var(--kw-surface-container)]"
                }`}
              >
                <AlertTriangle className="size-4 text-amber-600" />
                <span className="text-xs">Conditional</span>
              </button>
              <button
                type="button"
                onClick={() => setResult("fail")}
                className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center gap-1 ${
                  result === "fail"
                    ? "border-red-600 bg-red-50 text-red-900 font-bold"
                    : "border-[var(--kw-outline-variant)] text-[var(--kw-on-surface)] hover:bg-[var(--kw-surface-container)]"
                }`}
              >
                <XCircle className="size-4 text-red-600" />
                <span className="text-xs">Fail</span>
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="kw-label-sm text-[var(--kw-on-surface-variant)] uppercase tracking-wider text-[11px]">
              Audit Inspection Notes (Required)
            </label>
            <textarea
              rows={3}
              value={notes}
              disabled={isArtisan}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Dimensions check: 16x16 inches matching spec. Minor loose threads trimmed."
              className="w-full p-2.5 rounded-lg border border-[var(--kw-outline-variant)] bg-[var(--kw-surface-container-lowest)] text-xs text-[var(--kw-on-surface)] focus:outline-none focus:border-[var(--kw-primary-container)]"
            />
          </div>

          <div className="p-3 rounded-xl bg-[var(--kw-surface-container-low)] text-[11px] text-[var(--kw-on-surface-variant)] space-y-1 border border-[var(--kw-outline-variant)]">
            <span className="font-semibold text-[var(--kw-primary)] block">Dispatch Gating Notice:</span>
            <span>A passing QC inspection authorizes courier pickup and unlocks waybill generation. Failing QC keeps courier booking locked.</span>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            className="kw-btn kw-btn-secondary h-10 text-xs"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isArtisan || !notes.trim()}
            className="kw-btn kw-btn-primary h-10 text-xs disabled:opacity-50"
            onClick={() => {
              onSubmit({ result, notes: notes.trim() });
              onClose();
            }}
          >
            Save QC Verdict
          </button>
        </div>
      </div>
    </div>
  );
}
