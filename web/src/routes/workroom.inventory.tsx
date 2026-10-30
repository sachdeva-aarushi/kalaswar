/**
 * /workroom/inventory — Kalaswar Workroom Raw Materials & Stock Management
 *
 * Stitch Screen ID: 6ca647c822f242f895ea97d516ca5c6f
 * Scoped under .kw-app.
 */

import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Clock,
  Edit3,
  Plus,
  RefreshCw,
  X,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import {
  useMaterialsList,
  useInventorySummary,
  useUpdateMaterial,
  useAddMaterial,
  type MaterialInventory,
} from "@/features/inventory/hooks";
import { KwLoadingState, KwErrorState } from "@/components/kw-primitives";
import { StockTable } from "@/components/workroom/stock-table";
import { RestockDrawer } from "@/components/workroom/restock-drawer";

export const Route = createFileRoute("/workroom/inventory")({
  head: () => ({
    meta: [{ title: "Inventory — Kalaswar Workroom" }],
  }),
  component: WorkroomInventoryPage,
});

function WorkroomInventoryPage() {
  const { data: materials, isLoading, isError, error, refetch } = useMaterialsList();
  const { data: summary } = useInventorySummary();
  const updateMaterial = useUpdateMaterial();
  const addMaterial = useAddMaterial();

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeFilter, setActiveFilter] = useState<"all" | "low_stock" | "stale" | "healthy">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [countModalOpen, setCountModalOpen] = useState(false);
  const [selectedMaterialForCount, setSelectedMaterialForCount] = useState<MaterialInventory | null>(null);
  const [newCountVal, setNewCountVal] = useState<number>(0);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const selectAll = () => {
    if (!materials) return;
    if (selectedIds.length === materials.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(materials.map((m) => m.id));
    }
  };

  if (isLoading) {
    return <KwLoadingState label="Loading materials & stock records…" retry={() => void refetch()} />;
  }

  if (isError || !materials) {
    return (
      <KwErrorState
        title="Could not load inventory"
        detail={(error as Error)?.message || "Failed to retrieve materials database."}
        retry={() => void refetch()}
      />
    );
  }

  const lowStockCount = summary?.low_stock_count ?? materials.filter((m) => m.is_low_stock).length;
  const staleCount = summary?.stale_materials_count ?? materials.filter((m) => m.is_stale).length;
  const totalCount = summary?.total_materials ?? materials.length;

  const selectedMaterials = materials.filter((m) => selectedIds.includes(m.id));

  const openCountModal = (mat: MaterialInventory) => {
    setSelectedMaterialForCount(mat);
    setNewCountVal(mat.quantity);
    setCountModalOpen(true);
  };

  const handleSaveCount = async () => {
    if (!selectedMaterialForCount) return;
    await updateMaterial.mutateAsync({
      id: selectedMaterialForCount.id,
      payload: { quantity: newCountVal },
    });
    setCountModalOpen(false);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* ── Top Bar / Header ──────────────────────────────────────────────── */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--kw-outline-variant)] pb-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-baseline gap-4">
            <h1 className="kw-headline-xl text-[var(--kw-primary)]">Inventory</h1>
            <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--kw-on-surface-variant)]">
              <span className="size-2 rounded-full bg-[var(--kw-secondary)] inline-block" />
              <span className="font-semibold text-[var(--kw-secondary)]">
                {lowStockCount} need restock
              </span>
              <span>·</span>
              <span>1 on the way</span>
              <span>·</span>
              <span className="font-medium text-[var(--kw-primary)]">
                {totalCount - lowStockCount} healthy
              </span>
            </div>
          </div>
          <p className="kw-body-sm text-[var(--kw-on-surface-variant)]">
            Federation cluster raw material stocks, thread counts, and freshness audits.
          </p>
        </div>

        {/* Actions & Status Info */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[rgba(152,70,46,0.12)] text-[var(--kw-secondary)] text-xs font-semibold">
            <Clock className="size-3.5" />
            <span>Audit cycle: 60d threshold</span>
          </div>

          <button
            type="button"
            onClick={() => {
              if (materials.length > 0) openCountModal(materials[0]);
            }}
            className="kw-btn kw-btn-secondary h-10 text-xs inline-flex items-center gap-1.5"
          >
            <Edit3 className="size-3.5" />
            <span>Update counts</span>
          </button>

          <button
            type="button"
            className="size-10 rounded-lg bg-[var(--kw-surface-container)] text-[var(--kw-primary)] font-semibold text-xs flex items-center justify-center"
          >
            हि
          </button>
        </div>
      </header>

      {/* ── Workspace Main Canvas (Dual Column) ────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left 7 Columns: The Shelf List */}
        <div className="lg:col-span-7 space-y-4">
          <StockTable
            materials={materials}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            onSelectAll={selectAll}
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />
        </div>

        {/* Right 5 Columns: Restock Planning Drawer */}
        <div className="lg:col-span-5 space-y-6">
          <RestockDrawer
            selectedMaterials={selectedMaterials}
            onClearSelection={() => setSelectedIds([])}
            onSubmitRestock={(orders) => {
              // Batch submitted
            }}
          />

          {/* Quick Count Verification Helper Card */}
          <div className="kw-card p-5 space-y-3">
            <h4 className="kw-headline-sm text-[var(--kw-primary)]">Cluster Audit Instructions</h4>
            <p className="kw-body-sm text-[var(--kw-on-surface-variant)] text-xs">
              Physical inventory must be verified at least once every 60 days. Stale counts are automatically flagged as uncertain in MakePossible evaluations to prevent overpromising collective capacity.
            </p>
            <div className="pt-2 border-t border-[var(--kw-outline-variant)] flex items-center justify-between text-xs text-[var(--kw-on-surface-variant)]">
              <span>Freshness Threshold: 60 Days</span>
              <span className="font-semibold text-[var(--kw-primary)]">Auto-synced</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Update Count Modal ────────────────────────────────────────────── */}
      {countModalOpen && selectedMaterialForCount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-4">
          <div className="w-full max-w-md bg-[var(--kw-surface-container-lowest)] rounded-2xl p-6 shadow-xl flex flex-col gap-5 border border-[var(--kw-outline-variant)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit3 className="size-5 text-[var(--kw-primary)]" />
                <h3 className="kw-headline-sm text-[var(--kw-primary)]">Update Material Count</h3>
              </div>
              <button
                type="button"
                onClick={() => setCountModalOpen(false)}
                className="text-[var(--kw-on-surface-variant)] hover:text-[var(--kw-on-surface)]"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-[var(--kw-surface-container-low)]">
                <span className="kw-headline-sm text-[var(--kw-primary)] block font-bold">
                  {selectedMaterialForCount.name}
                </span>
                <span className="text-xs text-[var(--kw-on-surface-variant)]">
                  {selectedMaterialForCount.shg_name || "Federation Cluster"}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="kw-body-md text-[var(--kw-on-surface)]">Physical Count Verified</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    value={newCountVal}
                    onChange={(e) => setNewCountVal(parseFloat(e.target.value) || 0)}
                    className="w-24 h-10 px-3 text-right rounded-lg border border-[var(--kw-outline-variant)] kw-headline-sm text-[var(--kw-primary)]"
                  />
                  <span className="text-xs text-[var(--kw-on-surface-variant)] font-semibold">
                    {selectedMaterialForCount.unit}
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-[var(--kw-on-surface-variant)]">
                Updating count refreshes the audit timestamp and clears any stale warning flags.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                className="kw-btn kw-btn-secondary h-10 text-xs"
                onClick={() => setCountModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={updateMaterial.isPending}
                className="kw-btn kw-btn-primary h-10 text-xs"
                onClick={() => void handleSaveCount()}
              >
                {updateMaterial.isPending ? "Saving…" : "Save & Verify"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

