/**
 * Kalaswar Workroom — Inventory Stock Shelf Table & Visual Stock Gauges
 *
 * Scoped under .kw-app.
 * Flow 3: Inventory with freshness flags:
 * - Freshness badges: Fresh (< 14d), Audit Due (15-60d), Stale (> 60d)
 * - Quick 'Audit / Verify Stock' action calling useVerifyMaterialFreshness
 * - RLS enforcement: Verification restricted for artisan role
 */

import { useState } from "react";
import {
  AlertTriangle,
  Clock,
  CheckCircle2,
  PackageCheck,
  AlertCircle,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import type { MaterialInventory } from "@/features/inventory/hooks";

interface StockTableProps {
  materials: MaterialInventory[];
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onSelectAll: () => void;
  activeFilter: "all" | "low_stock" | "stale" | "healthy";
  onFilterChange: (filter: "all" | "low_stock" | "stale" | "healthy") => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onVerifyFreshness?: (id: string) => void;
  verifyingId?: string | null;
  isArtisan?: boolean;
}

export function StockTable({
  materials,
  selectedIds,
  onToggleSelect,
  activeFilter,
  onFilterChange,
  searchQuery,
  onSearchChange,
  onVerifyFreshness,
  verifyingId,
  isArtisan = false,
}: StockTableProps) {
  const lowStockCount = materials.filter((m) => m.is_low_stock).length;
  const staleCount = materials.filter((m) => m.is_stale || (m.age_in_days ?? 0) > 60).length;
  const healthyCount = materials.filter((m) => !m.is_low_stock && !m.is_stale && (m.age_in_days ?? 0) <= 60).length;

  const filteredMaterials = materials.filter((m) => {
    const isStaleItem = m.is_stale || (m.age_in_days ?? 0) > 60;
    if (activeFilter === "low_stock" && !m.is_low_stock) return false;
    if (activeFilter === "stale" && !isStaleItem) return false;
    if (activeFilter === "healthy" && (m.is_low_stock || isStaleItem)) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        m.name.toLowerCase().includes(q) ||
        (m.shg_name && m.shg_name.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* ── Filter Tabs & Search Row ──────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[var(--kw-outline-variant)] pb-3">
        {/* Filter Tabs */}
        <div className="flex items-center gap-4 text-xs font-semibold">
          <button
            type="button"
            onClick={() => onFilterChange("all")}
            className={`relative pb-2 transition-colors flex items-center gap-1.5 ${
              activeFilter === "all"
                ? "text-[var(--kw-primary)] font-bold border-b-2 border-[var(--kw-primary)]"
                : "text-[var(--kw-on-surface-variant)] hover:text-[var(--kw-on-surface)]"
            }`}
          >
            <span>All</span>
            <span className="px-1.5 py-0.5 rounded-full bg-[var(--kw-surface-container)] text-[11px]">
              {materials.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onFilterChange("low_stock")}
            className={`relative pb-2 transition-colors flex items-center gap-1.5 ${
              activeFilter === "low_stock"
                ? "text-[var(--kw-secondary)] font-bold border-b-2 border-[var(--kw-secondary)]"
                : "text-[var(--kw-on-surface-variant)] hover:text-[var(--kw-secondary)]"
            }`}
          >
            <span className="size-2 rounded-full bg-[var(--kw-secondary)]" />
            <span>Needs restock</span>
            <span className="px-1.5 py-0.5 rounded-full bg-[rgba(152,70,46,0.12)] text-[var(--kw-secondary)] text-[11px]">
              {lowStockCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onFilterChange("stale")}
            className={`relative pb-2 transition-colors flex items-center gap-1.5 ${
              activeFilter === "stale"
                ? "text-[var(--kw-tertiary-container)] font-bold border-b-2 border-[var(--kw-tertiary-container)]"
                : "text-[var(--kw-on-surface-variant)] hover:text-[var(--kw-tertiary-container)]"
            }`}
          >
            <Clock className="size-3 text-[var(--kw-tertiary-container)]" />
            <span>Stale audit</span>
            <span className="px-1.5 py-0.5 rounded-full bg-[var(--kw-surface-container)] text-[11px]">
              {staleCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onFilterChange("healthy")}
            className={`relative pb-2 transition-colors flex items-center gap-1.5 ${
              activeFilter === "healthy"
                ? "text-[var(--kw-primary)] font-bold border-b-2 border-[var(--kw-primary)]"
                : "text-[var(--kw-on-surface-variant)] hover:text-[var(--kw-primary)]"
            }`}
          >
            <span>Healthy</span>
            <span className="px-1.5 py-0.5 rounded-full bg-[var(--kw-surface-container)] text-[11px]">
              {healthyCount}
            </span>
          </button>
        </div>

        {/* Search input */}
        <div className="w-full sm:w-64">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search materials or cluster…"
            className="w-full h-9 px-3 rounded-lg border border-[var(--kw-outline-variant)] bg-[var(--kw-surface-container-lowest)] text-xs text-[var(--kw-on-surface)] placeholder:text-[var(--kw-on-surface-variant)] focus:outline-none focus:border-[var(--kw-primary-container)]"
          />
        </div>
      </div>

      {/* ── Materials Card Grid ───────────────────────────────────────────── */}
      <div className="space-y-4">
        {filteredMaterials.map((mat) => {
          const isSelected = selectedIds.includes(mat.id);
          const threshold = mat.low_stock_threshold ?? 20;
          const maxScale = Math.max(mat.quantity, threshold * 1.5, 1);
          const fillPercent = Math.min(100, Math.round((mat.quantity / maxScale) * 100));
          const minMarkerPercent = Math.min(100, Math.round((threshold / maxScale) * 100));

          const age = mat.age_in_days ?? 0;
          const isFresh = age <= 14 && !mat.is_stale;
          const isAuditDue = age > 14 && age <= 60;
          const isStale = age > 60 || mat.is_stale;

          return (
            <article
              key={mat.id}
              className={`kw-card p-4 transition-all flex flex-col gap-3 group relative ${
                mat.is_low_stock
                  ? "border-l-4 border-l-[var(--kw-secondary)] bg-[var(--kw-surface-container-lowest)]"
                  : ""
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleSelect(mat.id)}
                    aria-label={`Select ${mat.name} for restock`}
                    className="mt-1 size-4 rounded accent-[var(--kw-primary-container)] cursor-pointer"
                  />
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <h4 className="kw-headline-sm text-[var(--kw-primary)] font-bold">{mat.name}</h4>
                      <span className="px-2 py-0.5 rounded-full bg-[var(--kw-surface-container)] text-[var(--kw-on-surface-variant)] text-[10px] uppercase font-semibold">
                        {mat.unit}
                      </span>
                    </div>
                    <p className="kw-body-sm text-[var(--kw-on-surface-variant)]">
                      {mat.shg_name || "Federation Central Cluster"}
                    </p>
                  </div>
                </div>

                {/* Freshness Status Badges & Quick Audit Action */}
                <div className="flex items-center gap-2">
                  {isFresh && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      <CheckCircle2 className="size-3 text-emerald-700" />
                      <span>Fresh (&lt; 14d)</span>
                    </span>
                  )}
                  {isAuditDue && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                      <Clock className="size-3 text-amber-700" />
                      <span>Audit Due (15-60d) · {age}d</span>
                    </span>
                  )}
                  {isStale && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-red-100 text-red-800 border border-red-200">
                      <AlertTriangle className="size-3 text-red-700" />
                      <span>Stale (&gt; 60d) · {age}d</span>
                    </span>
                  )}

                  {/* Audit / Verify Stock Button */}
                  {onVerifyFreshness && (
                    <button
                      type="button"
                      disabled={isArtisan || verifyingId === mat.id}
                      onClick={() => onVerifyFreshness(mat.id)}
                      className={`h-7 px-2.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition-colors ${
                        isArtisan
                          ? "opacity-50 cursor-not-allowed bg-[var(--kw-surface-container)] text-[var(--kw-on-surface-variant)]"
                          : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                      }`}
                      title={
                        isArtisan
                          ? "Restricted to Coordinators/Admins"
                          : "Audit physical count and refresh freshness timestamp"
                      }
                    >
                      <RefreshCw className={`size-3 ${verifyingId === mat.id ? "animate-spin" : ""}`} />
                      <span>{verifyingId === mat.id ? "Auditing…" : "Audit / Verify Stock"}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Stock Gauge Progress Bar */}
              <div className="space-y-1.5 pl-7">
                <div className="flex items-center justify-between text-xs font-medium">
                  <div className="flex items-center gap-1.5">
                    <span className={`font-bold ${mat.is_low_stock ? "text-[var(--kw-secondary)]" : "text-[var(--kw-primary)]"}`}>
                      {mat.quantity} {mat.unit}
                    </span>
                    <span className="text-[var(--kw-on-surface-variant)]">available</span>
                  </div>
                  <div className="text-[var(--kw-on-surface-variant)]">
                    Minimum threshold: <span className="font-semibold text-[var(--kw-on-surface)]">{threshold} {mat.unit}</span>
                  </div>
                </div>

                {/* Bar with vertical tick for MIN */}
                <div className="relative w-full h-2 rounded-full bg-[var(--kw-surface-container)] overflow-visible">
                  <div
                    className={`h-full rounded-full transition-all ${
                      mat.is_low_stock ? "bg-[var(--kw-secondary)]" : "bg-[var(--kw-primary-container)]"
                    }`}
                    style={{ width: `${fillPercent}%` }}
                  />
                  {/* Min marker */}
                  <div
                    className="absolute top-[-3px] bottom-[-3px] w-0.5 bg-[var(--kw-primary)] z-10"
                    style={{ left: `${minMarkerPercent}%` }}
                    title={`Min threshold: ${threshold}`}
                  >
                    <span className="absolute -top-3.5 -translate-x-1/2 text-[9px] uppercase font-bold text-[var(--kw-primary)]">
                      min
                    </span>
                  </div>
                </div>
              </div>

              {/* Consequence Alert */}
              {mat.is_low_stock && (
                <div className="pl-7 flex items-center gap-1.5 text-xs text-[var(--kw-secondary)] font-medium">
                  <AlertTriangle className="size-3.5 shrink-0" />
                  <span>Below threshold · order restock to avoid production freeze on bespoke requests.</span>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
