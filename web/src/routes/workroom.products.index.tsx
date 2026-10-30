/**
 * /workroom/products — Products list & Listing Validation Queue
 *
 * Scoped under .kw-app.
 * Flow 1: Listing validation queue:
 * - Tabbed view: Catalog / Validation Queue
 * - Coordinator/Admin can approve or reject with a reason
 * - Publication gating: Products can only be published once approved
 * - RLS enforcement: Artisans have view-only access with clear restriction notice
 */

import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  useProductList,
  usePublishProduct,
  useValidationQueue,
  useValidateProduct,
  type ApiProduct,
} from "@/features/products/hooks";
import { useAuth } from "@/features/auth";
import { KwLoadingState, KwErrorState, KwEmptyState } from "@/components/kw-primitives";
import {
  Plus,
  Package,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Send,
  Clock,
  ShieldCheck,
  ShieldAlert,
  X,
} from "lucide-react";

export const Route = createFileRoute("/workroom/products/")({
  head: () => ({
    meta: [{ title: "Products & Validation — Kalaswar Workroom" }],
  }),
  component: WorkroomProductsList,
});

function WorkroomProductsList() {
  const { user } = useAuth();
  const isArtisan = user?.role === "artisan";

  const [activeTab, setActiveTab] = useState<"catalog" | "queue">("catalog");
  const [rejectModalItem, setRejectModalItem] = useState<ApiProduct | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    data: catalogData,
    isLoading: isCatalogLoading,
    isError: isCatalogError,
    error: catalogError,
    refetch: refetchCatalog,
  } = useProductList();

  const {
    data: queueData,
    isLoading: isQueueLoading,
    isError: isQueueError,
    error: queueError,
    refetch: refetchQueue,
  } = useValidationQueue();

  const publish = usePublishProduct();
  const validateProduct = useValidateProduct();

  const handleApprove = async (id: string) => {
    setErrorMessage(null);
    try {
      await validateProduct.mutateAsync({ id, action: "approve" });
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message || "Failed to approve listing.";
      setErrorMessage(msg);
    }
  };

  const handleOpenReject = (product: ApiProduct) => {
    setErrorMessage(null);
    setRejectModalItem(product);
    setRejectReason("");
  };

  const handleConfirmReject = async () => {
    if (!rejectModalItem) return;
    if (!rejectReason.trim()) {
      setErrorMessage("Please specify a reason for rejection.");
      return;
    }
    try {
      await validateProduct.mutateAsync({
        id: rejectModalItem.id,
        action: "reject",
        reason: rejectReason.trim(),
      });
      setRejectModalItem(null);
      setRejectReason("");
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message || "Failed to reject listing.";
      setErrorMessage(msg);
    }
  };

  const handlePublish = async (id: string) => {
    setErrorMessage(null);
    try {
      await publish.mutateAsync(id);
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message || "Publication failed: Listing must be validated first.";
      setErrorMessage(msg);
    }
  };

  const pendingCount = queueData?.filter((p) => p.status === "pending_validation").length ?? 0;

  return (
    <div className="space-y-[var(--kw-space-lg)]">
      {/* ── Top Header Row ────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="kw-headline-lg text-[var(--kw-on-surface)]">Products</h1>
            <span className="kw-badge kw-badge-primary">Workroom Catalog</span>
          </div>
          <p className="kw-body-sm text-[var(--kw-on-surface-variant)] mt-0.5">
            Verified artisan catalog, WhatsApp voice drafts, and quality validation queue.
          </p>
        </div>
        <Link
          to="/workroom/products/new"
          className="kw-btn kw-btn-primary h-10 text-xs inline-flex items-center gap-1.5 shadow-sm"
        >
          <Plus className="size-4" />
          <span>New Product</span>
        </Link>
      </div>

      {/* Global Error Banner if action fails */}
      {errorMessage && (
        <div
          role="alert"
          className="flex items-center justify-between p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-4 shrink-0 text-red-600" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-red-600 hover:text-red-900 font-bold"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* ── Tabs: Published Catalog vs Validation Queue ───────────────────── */}
      <div className="flex items-center gap-6 border-b border-[var(--kw-outline-variant)] pb-3 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setActiveTab("catalog")}
          className={`relative pb-2 transition-colors flex items-center gap-2 ${
            activeTab === "catalog"
              ? "text-[var(--kw-primary)] font-bold border-b-2 border-[var(--kw-primary)]"
              : "text-[var(--kw-on-surface-variant)] hover:text-[var(--kw-on-surface)]"
          }`}
        >
          <Package className="size-4" />
          <span>Catalog & Drafts</span>
          {catalogData?.items && (
            <span className="px-2 py-0.5 rounded-full bg-[var(--kw-surface-container)] text-[11px]">
              {catalogData.items.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("queue")}
          className={`relative pb-2 transition-colors flex items-center gap-2 ${
            activeTab === "queue"
              ? "text-[var(--kw-primary)] font-bold border-b-2 border-[var(--kw-primary)]"
              : "text-[var(--kw-on-surface-variant)] hover:text-[var(--kw-on-surface)]"
          }`}
        >
          <ShieldCheck className="size-4" />
          <span>Listing Validation Queue</span>
          {pendingCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-bold">
              {pendingCount} Pending
            </span>
          )}
        </button>
      </div>

      {/* ── Tab Content: Validation Queue ─────────────────────────────────── */}
      {activeTab === "queue" && (
        <div className="space-y-4">
          {isArtisan && (
            <div
              role="status"
              className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs"
            >
              <ShieldAlert className="size-4 shrink-0 text-amber-600" />
              <span>
                <strong>Artisan Read-Only Mode:</strong> Listings submitted via WhatsApp or workroom require SHG
                Coordinator or Admin validation before publishing.
              </span>
            </div>
          )}

          {isQueueLoading ? (
            <KwLoadingState label="Loading validation queue…" retry={() => void refetchQueue()} />
          ) : isQueueError ? (
            <KwErrorState
              title="Could not load validation queue"
              detail={(queueError as Error)?.message}
              retry={() => void refetchQueue()}
            />
          ) : !queueData || queueData.length === 0 ? (
            <KwEmptyState
              title="Validation queue is clear"
              description="All submitted artisan craft listings have been validated."
            />
          ) : (
            <div className="kw-card p-0 overflow-x-auto">
              <table className="kw-table">
                <thead>
                  <tr>
                    <th>Item / Title</th>
                    <th>Category</th>
                    <th>Status</th>
                    <th>Price (₹)</th>
                    <th>Validation Actions</th>
                    <th>Publication Gating</th>
                  </tr>
                </thead>
                <tbody>
                  {queueData.map((product) => {
                    const name = product.title || product.name || "Handcrafted Craft";
                    const price = product.price ?? product.price_inr;
                    const isPending = product.status === "pending_validation";
                    const isApproved = product.status === "approved";
                    const isRejected = product.status === "rejected";

                    return (
                      <tr key={product.id} className="hover:bg-[var(--kw-surface-container-low)] transition-colors">
                        <td>
                          <div>
                            <span className="kw-body-md font-semibold text-[var(--kw-primary)] block">
                              {name}
                            </span>
                            {product.rejection_reason && (
                              <p className="text-[11px] text-red-600 mt-0.5 font-medium">
                                Rejection: {product.rejection_reason}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="kw-body-sm text-[var(--kw-on-surface-variant)]">
                          {product.category || "Textiles"}
                        </td>
                        <td>
                          <span
                            className={`kw-badge ${
                              isApproved
                                ? "kw-badge-success"
                                : isPending
                                ? "kw-badge-warning"
                                : isRejected
                                ? "kw-badge-danger"
                                : "kw-badge-neutral"
                            }`}
                          >
                            {product.status.replace("_", " ")}
                          </span>
                        </td>
                        <td className="kw-body-md font-medium tabular-nums">
                          {price != null ? `₹${price.toLocaleString("en-IN")}` : "–"}
                        </td>
                        <td>
                          {/* Validation actions for Coordinator/Admin */}
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              disabled={isArtisan || validateProduct.isPending || isApproved}
                              onClick={() => void handleApprove(product.id)}
                              className={`h-8 px-2.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition-colors ${
                                isApproved
                                  ? "bg-emerald-100 text-emerald-800 cursor-default"
                                  : isArtisan
                                  ? "opacity-50 cursor-not-allowed bg-[var(--kw-surface-container)] text-[var(--kw-on-surface-variant)]"
                                  : "bg-emerald-600 hover:bg-emerald-700 text-white"
                              }`}
                              title={isArtisan ? "Requires Coordinator or Admin role" : "Approve listing"}
                            >
                              <CheckCircle2 className="size-3.5" />
                              <span>{isApproved ? "Approved ✓" : "Approve"}</span>
                            </button>

                            <button
                              type="button"
                              disabled={isArtisan || validateProduct.isPending || isRejected}
                              onClick={() => handleOpenReject(product)}
                              className={`h-8 px-2.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition-colors ${
                                isRejected
                                  ? "bg-red-100 text-red-800 cursor-default"
                                  : isArtisan
                                  ? "opacity-50 cursor-not-allowed bg-[var(--kw-surface-container)] text-[var(--kw-on-surface-variant)]"
                                  : "bg-red-100 hover:bg-red-200 text-red-700"
                              }`}
                              title={isArtisan ? "Requires Coordinator or Admin role" : "Reject listing with reason"}
                            >
                              <XCircle className="size-3.5" />
                              <span>{isRejected ? "Rejected" : "Reject"}</span>
                            </button>
                          </div>
                        </td>
                        <td>
                          {/* Publication Gating: Only approved items can be published */}
                          {product.status === "published" ? (
                            <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                              <CheckCircle2 className="size-3.5" /> Published
                            </span>
                          ) : (
                            <button
                              type="button"
                              disabled={!isApproved || publish.isPending || isArtisan}
                              onClick={() => void handlePublish(product.id)}
                              className={`h-8 px-3 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition-colors ${
                                isApproved && !isArtisan
                                  ? "kw-btn kw-btn-primary"
                                  : "bg-[var(--kw-surface-container)] text-[var(--kw-on-surface-variant)] opacity-60 cursor-not-allowed"
                              }`}
                              title={
                                !isApproved
                                  ? "Approval required before publication"
                                  : isArtisan
                                  ? "Requires Coordinator or Admin role"
                                  : "Publish to storefront"
                              }
                            >
                              <Send className="size-3.5" />
                              <span>Publish</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Tab Content: Catalog & Drafts ─────────────────────────────────── */}
      {activeTab === "catalog" && (
        <>
          {isCatalogLoading ? (
            <KwLoadingState label="Loading products…" retry={() => void refetchCatalog()} />
          ) : isCatalogError ? (
            <KwErrorState
              title="Could not load products"
              detail={(catalogError as Error)?.message}
              retry={() => void refetchCatalog()}
            />
          ) : !catalogData?.items?.length ? (
            <KwEmptyState
              title="No products yet"
              description="Products drafted via WhatsApp or the workroom will appear here."
              action={
                <Link to="/workroom/products/new" className="kw-btn kw-btn-primary h-10 text-xs mt-2">
                  Create First Product
                </Link>
              }
            />
          ) : (
            <div className="kw-card p-0 overflow-x-auto">
              <table className="kw-table">
                <thead>
                  <tr>
                    <th>Name / Title</th>
                    <th>Category</th>
                    <th>Status</th>
                    <th>Price (₹)</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {catalogData.items.map((product) => {
                    const name = product.title || product.name || "Handcrafted Item";
                    const price = product.price ?? product.price_inr;
                    const canPublish = product.status === "approved";

                    return (
                      <tr key={product.id} className="hover:bg-[var(--kw-surface-container-low)] transition-colors">
                        <td className="kw-body-md font-semibold text-[var(--kw-primary)]">
                          {name}
                        </td>
                        <td className="kw-body-sm text-[var(--kw-on-surface-variant)]">
                          {product.category || "Textiles"}
                        </td>
                        <td>
                          <span
                            className={`kw-badge ${
                              product.status === "published"
                                ? "kw-badge-success"
                                : product.status === "approved"
                                ? "kw-badge-primary"
                                : product.status === "pending_validation"
                                ? "kw-badge-warning"
                                : product.status === "rejected"
                                ? "kw-badge-danger"
                                : "kw-badge-neutral"
                            }`}
                          >
                            {product.status.replace("_", " ")}
                          </span>
                        </td>
                        <td className="kw-body-md font-medium tabular-nums">
                          {price != null ? `₹${price.toLocaleString("en-IN")}` : "–"}
                        </td>
                        <td>
                          {product.status === "published" ? (
                            <span className="text-xs text-[var(--kw-primary)] font-medium">Published</span>
                          ) : (
                            <button
                              type="button"
                              className={`h-8 px-3 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition-colors ${
                                canPublish && !isArtisan
                                  ? "kw-btn kw-btn-primary"
                                  : "bg-[var(--kw-surface-container)] text-[var(--kw-on-surface-variant)] opacity-60 cursor-not-allowed"
                              }`}
                              disabled={!canPublish || publish.isPending || isArtisan}
                              onClick={() => void handlePublish(product.id)}
                              title={
                                !canPublish
                                  ? "Product must be approved in validation queue first"
                                  : isArtisan
                                  ? "Requires Coordinator or Admin role"
                                  : "Publish to storefront"
                              }
                            >
                              Publish
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ── Rejection Reason Modal ────────────────────────────────────────── */}
      {rejectModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-4">
          <div className="w-full max-w-md bg-[var(--kw-surface-container-lowest)] rounded-2xl p-6 shadow-xl flex flex-col gap-5 border border-[var(--kw-outline-variant)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <XCircle className="size-5 text-red-600" />
                <h3 className="kw-headline-sm text-[var(--kw-primary)]">Reject Craft Listing</h3>
              </div>
              <button
                type="button"
                onClick={() => setRejectModalItem(null)}
                className="text-[var(--kw-on-surface-variant)] hover:text-[var(--kw-on-surface)]"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-[var(--kw-on-surface-variant)]">
                Please provide actionable feedback for the artisan explaining why{" "}
                <strong>{rejectModalItem.title || rejectModalItem.name}</strong> was rejected (e.g. image clarity, pricing mismatch, missing GI details).
              </p>

              <div className="space-y-1">
                <label className="kw-label-sm uppercase tracking-wider text-[11px] text-[var(--kw-on-surface-variant)]">
                  Rejection Reason (Required)
                </label>
                <textarea
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. Dimensions not specified in description. Photograph lacks GI watermark evidence."
                  className="w-full p-2.5 rounded-lg border border-[var(--kw-outline-variant)] bg-[var(--kw-surface-container-lowest)] text-xs text-[var(--kw-on-surface)] focus:outline-none focus:border-[var(--kw-primary-container)]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                className="kw-btn kw-btn-secondary h-10 text-xs"
                onClick={() => setRejectModalItem(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={validateProduct.isPending || !rejectReason.trim()}
                className="h-10 px-4 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold text-xs disabled:opacity-50"
                onClick={() => void handleConfirmReject()}
              >
                {validateProduct.isPending ? "Submitting…" : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
