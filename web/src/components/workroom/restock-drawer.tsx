/**
 * Kalaswar Workroom — Batch Restock Drawer
 *
 * Scoped under .kw-app.
 * Allows coordinators to select short inventory items, choose verified suppliers,
 * preview cost-plus materials replenishment, and submit purchase orders.
 */

import { useState } from "react";
import { Package, Truck, Check, AlertCircle } from "lucide-react";
import type { MaterialInventory } from "@/features/inventory/hooks";

interface RestockDrawerProps {
  selectedMaterials: MaterialInventory[];
  onClearSelection: () => void;
  onSubmitRestock: (orders: Array<{ materialId: string; quantity: number; supplier: string }>) => void;
}

export function RestockDrawer({
  selectedMaterials,
  onClearSelection,
  onSubmitRestock,
}: RestockDrawerProps) {
  const [supplier, setSupplier] = useState("Murshidabad Weavers Co-op");
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);

  const getQty = (mat: MaterialInventory) => {
    return quantities[mat.id] ?? Math.max(10, (mat.low_stock_threshold ?? 20) * 2 - mat.quantity);
  };

  const handleQtyChange = (id: string, val: number) => {
    setQuantities((prev) => ({ ...prev, [id]: Math.max(1, val) }));
  };

  const estimatedTotalInr = selectedMaterials.reduce((acc, mat) => {
    const unitRate = mat.unit === "meters" ? 350 : mat.unit === "kg" ? 180 : 45;
    return acc + getQty(mat) * unitRate;
  }, 0);

  if (selectedMaterials.length === 0) {
    return (
      <div className="kw-card flex flex-col items-center justify-center text-center p-8 space-y-3">
        <Package className="size-8 text-[var(--kw-outline)]" />
        <h4 className="kw-headline-sm text-[var(--kw-on-surface)]">Restock Planning</h4>
        <p className="kw-body-sm text-[var(--kw-on-surface-variant)] max-w-xs">
          Select items with low stock or stale audit counts to prepare a supplier replenishment order.
        </p>
      </div>
    );
  }

  return (
    <div className="kw-card space-y-5">
      <div className="flex items-center justify-between border-b border-[var(--kw-outline-variant)] pb-3">
        <div>
          <span className="kw-label-sm text-[var(--kw-on-surface-variant)] uppercase tracking-wider text-[11px] block">
            Batch Restock Requisition
          </span>
          <h3 className="kw-headline-sm text-[var(--kw-primary)]">
            {selectedMaterials.length} item{selectedMaterials.length > 1 ? "s" : ""} selected
          </h3>
        </div>
        <button
          type="button"
          onClick={onClearSelection}
          className="text-xs text-[var(--kw-on-surface-variant)] hover:text-[var(--kw-on-surface)]"
        >
          Clear
        </button>
      </div>

      {/* Supplier selection */}
      <div className="space-y-1.5">
        <label className="kw-label-sm text-[var(--kw-on-surface-variant)] uppercase tracking-wider text-[11px]">
          Preferred Verified Supplier
        </label>
        <select
          value={supplier}
          onChange={(e) => setSupplier(e.target.value)}
          className="w-full h-10 px-3 rounded-lg border border-[var(--kw-outline-variant)] bg-[var(--kw-surface-container-lowest)] text-xs text-[var(--kw-on-surface)] focus:outline-none focus:border-[var(--kw-primary-container)]"
        >
          <option value="Murshidabad Weavers Co-op">Murshidabad Weavers Co-op (Raw Silks)</option>
          <option value="Coimbatore Organic Cotton Mills">Coimbatore Organic Cotton Mills (Canvas & Linings)</option>
          <option value="Kutch Dyes & Natural Extracts">Kutch Dyes & Natural Extracts (Madder, Indigo, Ochre)</option>
        </select>
      </div>

      {/* Selected items list with quantity steppers */}
      <div className="space-y-3">
        {selectedMaterials.map((mat) => {
          const qty = getQty(mat);
          return (
            <div
              key={mat.id}
              className="p-3 rounded-xl bg-[var(--kw-surface-container-low)] border border-[var(--kw-outline-variant)] flex items-center justify-between gap-3 text-xs"
            >
              <div className="space-y-0.5">
                <span className="font-semibold text-[var(--kw-on-surface)] block">{mat.name}</span>
                <span className="text-[var(--kw-on-surface-variant)]">
                  Available: {mat.quantity} {mat.unit}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[var(--kw-on-surface-variant)]">Order:</span>
                <input
                  type="number"
                  min={1}
                  value={qty}
                  onChange={(e) => handleQtyChange(mat.id, parseInt(e.target.value) || 1)}
                  className="w-16 h-8 px-2 text-right rounded-md border border-[var(--kw-outline-variant)] bg-white text-xs font-semibold text-[var(--kw-primary)]"
                />
                <span className="text-[var(--kw-on-surface-variant)]">{mat.unit}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary total */}
      <div className="rounded-xl bg-[var(--kw-surface-container-low)] p-3.5 flex items-baseline justify-between border border-[var(--kw-outline-variant)]">
        <div>
          <span className="kw-label-sm text-[var(--kw-on-surface-variant)] text-[11px] block">
            Estimated Requisition Cost
          </span>
          <span className="kw-headline-md text-[var(--kw-primary)] font-bold tabular-nums">
            ₹{estimatedTotalInr.toLocaleString("en-IN")}
          </span>
        </div>
        <span className="text-xs text-[var(--kw-on-surface-variant)]">Excl. freight</span>
      </div>

      {/* Action button */}
      {submitted ? (
        <div className="rounded-lg bg-[rgba(35,76,61,0.12)] p-3 flex items-center gap-2 text-xs text-[var(--kw-primary-container)] font-semibold">
          <Check className="size-4" />
          <span>Restock order submitted to {supplier}!</span>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            setSubmitted(true);
            onSubmitRestock(
              selectedMaterials.map((m) => ({
                materialId: m.id,
                quantity: getQty(m),
                supplier,
              })),
            );
            setTimeout(() => {
              setSubmitted(false);
              onClearSelection();
            }, 2500);
          }}
          className="w-full kw-btn kw-btn-primary h-11 text-xs shadow-sm"
        >
          <Truck className="size-4" />
          <span>Place Restock Order with Supplier</span>
        </button>
      )}
    </div>
  );
}

