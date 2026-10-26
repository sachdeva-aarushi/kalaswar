import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import type {
  CollectiveSnapshot,
  MaterialRecord,
  SkillRecord,
} from "./makepossible";
import {
  ExpenseLike,
  summarizeArtisanMoney,
  type ArtisanMoney,
} from "./earnings";
import type {
  Artisan,
  CraftGuide,
  CustomRequest,
  Expense,
  Order,
  OrderAssignment,
  OrderEvent,
  OrderEventWithRef,
  OrderStatus,
  OrderWithDetails,
  Payment,
  PaymentDirection,
  PaymentWithDetails,
  Product,
  ProductWithArtisan,
  Proposal,
  ProposalApproval,
  ProposalSpec,
  QualityCheck,
  Shipment,
  Shg,
  Tip,
} from "./types";

/* ---------- raw fetchers ---------- */

export interface ProductFilter {
  category?: string;
  search?: string;
  sort?: "price_asc" | "price_desc";
}

export async function fetchProducts(filter: ProductFilter = {}): Promise<ProductWithArtisan[]> {
  let q = supabase.from("products").select("*, artisans(*, shgs(*))");


  if (filter.category && filter.category !== "all") {
    q = q.eq("category", filter.category);
  }
  if (filter.search) {
    const term = `%${filter.search}%`;
    q = q.or(`name.ilike.${term},description.ilike.${term},artisans.name.ilike.${term}`);
  }
  if (filter.sort === "price_asc") q = q.order("price", { ascending: true });
  else if (filter.sort === "price_desc") q = q.order("price", { ascending: false });
  else q = q.order("created_at", { ascending: true });

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapProduct);
}

type RawProduct = Product & { artisans: (Artisan & { shgs: Shg }) | null };

function mapProduct(raw: RawProduct): ProductWithArtisan {
  const artisan = raw.artisans ?? null;
  return {
    ...raw,
    artisan,
    shg: artisan?.shgs ?? null,
    artisans: undefined,
  } as unknown as ProductWithArtisan;
}

export async function fetchProduct(id: string): Promise<ProductWithArtisan | null> {
  const { data, error } = await supabase
    .from("products")
    .select("*, artisans(*, shgs(*))")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapProduct(data as RawProduct) : null;
}

export async function fetchArtisans(): Promise<(Artisan & { shg?: Shg | null })[]> {
  const { data, error } = await supabase
    .from("artisans")
    .select("*, shgs(*)")
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((a: Artisan & { shgs: Shg | null }) => ({
    ...a,
    shg: a.shgs ?? null,
  }));
}

export async function fetchArtisan(id: string): Promise<(Artisan & { shg?: Shg | null }) | null> {
  const { data, error } = await supabase
    .from("artisans")
    .select("*, shgs(*)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const a = data as Artisan & { shgs: Shg | null };
  return { ...a, shg: a.shgs ?? null };
}

export async function fetchArtisanProducts(artisanId: string): Promise<ProductWithArtisan[]> {
  const { data, error } = await supabase
    .from("products")
    .select("*, artisans(*, shgs(*))")
    .eq("artisan_id", artisanId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapProduct);
}

export async function fetchOrders(): Promise<OrderWithDetails[]> {
  const { data, error } = await supabase
    .from("orders")
    .select("*, products(*), order_assignments(*, artisans(*))")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as RawOrder[]).map(mapOrder);
}

type RawOrder = Order & {
  products: Product | null;
  order_assignments: (OrderAssignment & { artisans: Artisan | null })[];
};

function mapOrder(raw: RawOrder): OrderWithDetails {
  const assignments = (raw.order_assignments ?? []).slice().sort(
    (a, b) => new Date(b.assigned_at).getTime() - new Date(a.assigned_at).getTime(),
  );
  const current = assignments[0]?.artisans ?? null;
  return {
    ...raw,
    product: raw.products ?? null,
    artisan: current,
    assignments,
    products: undefined,
    order_assignments: undefined,
  } as unknown as OrderWithDetails;
}

/** Orders assigned to a specific artisan (via assignment history). */
export async function fetchArtisanOrders(artisanId: string): Promise<OrderWithDetails[]> {
  const { data, error } = await supabase
    .from("order_assignments")
    .select("*, orders(*, products(*))")
    .eq("artisan_id", artisanId)
    .order("assigned_at", { ascending: false });
  if (error) throw new Error(error.message);
  const seen = new Map<string, OrderWithDetails>();
  for (const row of (data ?? []) as unknown as {
    orders: RawOrder | null;
  }[]) {
    if (!row.orders) continue;
    if (!seen.has(row.orders.id)) seen.set(row.orders.id, mapOrder(row.orders));
  }
  return [...seen.values()];
}

export interface ArtisanSummary {
  counts: Record<OrderStatus, number>;
  tipsTotal: number;
  deliveredValue: number;
  earnings: number;
  tips: Tip[];
  /** Honest-money breakdown from recorded payments and expenses. */
  money: ArtisanMoney;
}

export async function fetchArtisanSummary(artisanId: string): Promise<ArtisanSummary> {
  const orders = await fetchArtisanOrders(artisanId);
  const counts: Record<OrderStatus, number> = {
    pending: 0,
    in_production: 0,
    ready_for_dispatch: 0,
    delivered: 0,
    delayed: 0,
  };
  for (const o of orders) counts[o.status] += 1;

  const [tipsRes, paysRes, expRes] = await Promise.all([
    supabase.from("tips").select("*").eq("artisan_id", artisanId).order("created_at", { ascending: false }),
    supabase.from("payments").select("direction, amount, status").eq("artisan_id", artisanId),
    supabase.from("expenses").select("amount").eq("artisan_id", artisanId),
  ]);
  if (tipsRes.error) throw new Error(tipsRes.error.message);
  if (paysRes.error) throw new Error(paysRes.error.message);
  if (expRes.error) throw new Error(expRes.error.message);
  const tips = (tipsRes.data ?? []) as Tip[];
  const tipsTotal = tips.reduce((s, t) => s + Number(t.amount), 0);

  // Value of delivered orders assigned to this artisan, read from product prices.
  const assignments = orders.filter((o) => o.status === "delivered");
  const deliveredValue = assignments.reduce(
    (s, o) => s + Number(o.product?.price ?? 0) * (o.quantity || 1),
    0,
  );

  const money = summarizeArtisanMoney({
    deliveredValue,
    tips: tipsTotal,
    payments: (paysRes.data ?? []) as { direction: string; amount: number; status: string }[],
    expenses: (expRes.data ?? []) as { amount: number }[],
  });

  return {
    counts,
    tipsTotal,
    deliveredValue,
    earnings: money.earnedTotal,
    tips,
    money,
  };
}

/* ---------- writes ---------- */

/** Best-effort event log append — never blocks the order write itself. */
async function recordOrderEvent(orderId: string, eventType: string, note?: string): Promise<void> {
  try {
    await supabase
      .from("order_events")
      .insert({ order_id: orderId, event_type: eventType, note: note ?? null });
  } catch {
    /* the event log is best-effort in demonstration mode */
  }
}

/** The artisan speaks or types a progress note — recorded verbatim, never paraphrased. */
export async function recordArtisanNote(orderId: string, note: string): Promise<void> {
  const { error } = await supabase
    .from("order_events")
    .insert({ order_id: orderId, event_type: "artisan_note", note });
  if (error) throw new Error(error.message);
}

export async function assignOrder(
  orderId: string,
  artisanId: string,
  assignedBy = "Coordinator — demonstration",
): Promise<void> {
  const { error: insErr } = await supabase
    .from("order_assignments")
    .insert({ order_id: orderId, artisan_id: artisanId, assigned_by: assignedBy });
  if (insErr) throw new Error(insErr.message);

  // Pending orders move into production once someone picks them up.
  const { error: updErr } = await supabase
    .from("orders")
    .update({ status: "in_production" })
    .eq("id", orderId)
    .eq("status", "pending");
  if (updErr) throw new Error(updErr.message);

  await recordOrderEvent(orderId, "assigned");
  if (!updErr) await recordOrderEvent(orderId, "in_production");
}

export async function updateOrderStatus(orderId: string, status: OrderStatus): Promise<void> {
  const { error } = await supabase.from("orders").update({ status }).eq("id", orderId);
  if (error) throw new Error(error.message);
  await recordOrderEvent(orderId, status);
}

export interface ProductInput {
  id?: string;
  artisan_id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  image_url?: string | null;
  image_public_id?: string | null;
  availability: boolean;
}

export async function saveProduct(input: ProductInput): Promise<Product> {
  if (input.id) {
    const { data, error } = await supabase
      .from("products")
      .update({
        artisan_id: input.artisan_id,
        name: input.name,
        description: input.description,
        category: input.category,
        price: input.price,
        availability: input.availability,
        ...(input.image_url !== undefined && { image_url: input.image_url }),
        ...(input.image_public_id !== undefined && { image_public_id: input.image_public_id }),
      })
      .eq("id", input.id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as Product;
  }
  const { data, error } = await supabase
    .from("products")
    .insert({
      artisan_id: input.artisan_id,
      name: input.name,
      description: input.description,
      category: input.category,
      price: input.price,
      availability: input.availability,
      image_url: input.image_url ?? null,
      image_public_id: input.image_public_id ?? null,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Product;
}

export async function createTip(artisanId: string, amount: number): Promise<void> {
  const { error } = await supabase
    .from("tips")
    .insert({ artisan_id: artisanId, amount, payment_status: "demo" });
  if (error) throw new Error(error.message);
}

/* ---------- payments, events, UPI ---------- */

export async function fetchPayments(): Promise<PaymentWithDetails[]> {
  const { data, error } = await supabase
    .from("payments")
    .select("*, orders(customer_reference), artisans(name), shgs(name)")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as (Payment & {
    orders: { customer_reference: string } | null;
    artisans: { name: string } | null;
    shgs: { name: string } | null;
  })[]).map((p) => ({
    ...p,
    order_reference: p.orders?.customer_reference ?? null,
    artisan_name: p.artisans?.name ?? null,
    shg_name: p.shgs?.name ?? null,
  }));
}

export async function fetchArtisanPayments(artisanId: string): Promise<PaymentWithDetails[]> {
  const { data, error } = await supabase
    .from("payments")
    .select("*, orders(customer_reference), artisans(name), shgs(name)")
    .eq("artisan_id", artisanId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as (Payment & {
    orders: { customer_reference: string } | null;
    artisans: { name: string } | null;
    shgs: { name: string } | null;
  })[]).map((p) => ({
    ...p,
    order_reference: p.orders?.customer_reference ?? null,
    artisan_name: p.artisans?.name ?? null,
    shg_name: p.shgs?.name ?? null,
  }));
}

export async function fetchOrderEvents(orderId: string): Promise<OrderEvent[]> {
  const { data, error } = await supabase
    .from("order_events")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as OrderEvent[];
}

export async function fetchAllOrderEvents(): Promise<OrderEventWithRef[]> {
  const { data, error } = await supabase
    .from("order_events")
    .select("*, orders(customer_reference)")
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as (OrderEvent & {
    orders: { customer_reference: string } | null;
  })[]).map((e) => ({ ...e, order_reference: e.orders?.customer_reference ?? null }));
}

export async function fetchShgs(): Promise<Shg[]> {
  const { data, error } = await supabase.from("shgs").select("*").order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as Shg[];
}

export interface PaymentInput {
  order_id?: string | null;
  shg_id?: string | null;
  artisan_id?: string | null;
  direction: PaymentDirection;
  amount: number;
  status?: string;
  note?: string | null;
}

export async function recordPayment(input: PaymentInput): Promise<void> {
  const { error } = await supabase.from("payments").insert({
    order_id: input.order_id ?? null,
    shg_id: input.shg_id ?? null,
    artisan_id: input.artisan_id ?? null,
    direction: input.direction,
    amount: input.amount,
    status: input.status ?? "recorded",
    note: input.note ?? null,
  });
  if (error) throw new Error(error.message);
  if (input.order_id) await recordOrderEvent(input.order_id, "payment");
}

export async function saveUpiId(shgId: string, upiId: string): Promise<void> {
  const { error } = await supabase.from("shgs").update({ upi_id: upiId.trim() }).eq("id", shgId);
  if (error) throw new Error(error.message);
}

/* ---------- query options ---------- */

export const productsQuery = (filter: ProductFilter = {}) =>
  queryOptions({
    queryKey: ["products", filter.category ?? "all", filter.search ?? "", filter.sort ?? ""],
    queryFn: () => fetchProducts(filter),
  });

export const productQuery = (id: string) =>
  queryOptions({ queryKey: ["product", id], queryFn: () => fetchProduct(id) });

export const artisansQuery = () =>
  queryOptions({ queryKey: ["artisans"], queryFn: fetchArtisans });

export const artisanQuery = (id: string) =>
  queryOptions({ queryKey: ["artisan", id], queryFn: () => fetchArtisan(id) });

export const artisanProductsQuery = (id: string) =>
  queryOptions({ queryKey: ["artisanProducts", id], queryFn: () => fetchArtisanProducts(id) });

export const ordersQuery = () =>
  queryOptions({ queryKey: ["orders"], queryFn: fetchOrders });

export const artisanOrdersQuery = (id: string) =>
  queryOptions({ queryKey: ["artisanOrders", id], queryFn: () => fetchArtisanOrders(id) });

export const artisanSummaryQuery = (id: string) =>
  queryOptions({ queryKey: ["artisanSummary", id], queryFn: () => fetchArtisanSummary(id) });

export const paymentsQuery = () =>
  queryOptions({ queryKey: ["payments"], queryFn: fetchPayments });

export const artisanPaymentsQuery = (id: string) =>
  queryOptions({ queryKey: ["artisanPayments", id], queryFn: () => fetchArtisanPayments(id) });

export const orderEventsQuery = (orderId: string) =>
  queryOptions({ queryKey: ["orderEvents", orderId], queryFn: () => fetchOrderEvents(orderId) });

export const allOrderEventsQuery = () =>
  queryOptions({ queryKey: ["orderEventsAll"], queryFn: fetchAllOrderEvents });

export const shgsQuery = () =>
  queryOptions({ queryKey: ["shgs"], queryFn: fetchShgs });

/* ---------- Workroom: skills, inventory, craft guides ---------- */

export async function fetchCraftGuides(): Promise<CraftGuide[]> {
  const { data, error } = await supabase
    .from("craft_guides")
    .select("*")
    .order("title", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as CraftGuide[];
}

export const craftGuidesQuery = () =>
  queryOptions({ queryKey: ["craftGuides"], queryFn: fetchCraftGuides });

/* ---------- MakePossible: collective snapshots ---------- */

async function fetchActiveWorkloadUnits(): Promise<Map<string, number>> {
  const { data, error } = await supabase
    .from("orders")
    .select("quantity, status, products(artisans(shg_id))")
    .in("status", ["pending", "in_production"]);
  if (error) throw new Error(error.message);
  const map = new Map<string, number>();
  for (const row of (data ?? []) as unknown as {
    quantity: number;
    products: { artisans: { shg_id: string } | null } | null;
  }[]) {
    const shgId = row.products?.artisans?.shg_id;
    if (shgId) map.set(shgId, (map.get(shgId) ?? 0) + (row.quantity || 0));
  }
  return map;
}

export async function fetchCollectiveSnapshots(): Promise<CollectiveSnapshot[]> {
  const [shgsRes, artisansRes, skillsRes, materialsRes, workload, productsRes] =
    await Promise.all([
      supabase.from("shgs").select("id, name, monthly_capacity"),

      supabase.from("artisans").select("id, shg_id"),
      supabase.from("artisan_skills").select("artisan_id, skill, level, notes"),
      supabase
        .from("materials_inventory")
        .select("shg_id, name, unit, quantity, low_stock_threshold, updated_at"),
      fetchActiveWorkloadUnits(),
      supabase.from("products").select("price, category"),
    ]);
  for (const [label, err] of [
    ["shgs", shgsRes.error],
    ["artisans", artisansRes.error],
    ["artisan_skills", skillsRes.error],
    ["materials_inventory", materialsRes.error],
    ["products", productsRes.error],
  ] as const) {
    if (err) throw new Error(`${label}: ${err.message}`);
  }
  const artisanShg = new Map<string, string>();
  for (const a of (artisansRes.data ?? []) as { id: string; shg_id: string }[]) {
    artisanShg.set(a.id, a.shg_id);
  }
  const skillsByShg = new Map<string, SkillRecord[]>();
  for (const s of (skillsRes.data ?? []) as unknown as (SkillRecord & { artisan_id: string })[]) {
    const shgId = artisanShg.get(s.artisan_id);
    if (!shgId) continue;
    const list = skillsByShg.get(shgId) ?? [];
    list.push({ skill: s.skill, level: s.level, notes: s.notes ?? null });
    skillsByShg.set(shgId, list);
  }
  const materialsByShg = new Map<string, MaterialRecord[]>();
  for (const m of (materialsRes.data ?? []) as unknown as (MaterialRecord & { shg_id: string })[]) {
    const list = materialsByShg.get(m.shg_id) ?? [];
    list.push(m);
    materialsByShg.set(m.shg_id, list);
  }
  return ((shgsRes.data ?? []) as Pick<Shg, "id" | "name" | "monthly_capacity">[]).map(
    (shg) => ({
      shg,
      skills: skillsByShg.get(shg.id) ?? [],
      materials: (materialsByShg.get(shg.id) ?? []) as MaterialRecord[],
      activeWorkloadUnits: workload.get(shg.id) ?? 0,
      comparablePrices: { min: 0, avg: 0, max: 0, count: 0 },
    }),
  );
}

/* ---------- Collective capacity recording ---------- */

export interface ShgCapacity {
  id: string;
  name: string;
  monthly_capacity: number | null;
}

export async function fetchShgCapacity(): Promise<ShgCapacity[]> {
  const { data, error } = await supabase
    .from("shgs")
    .select("id, name, monthly_capacity")
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as ShgCapacity[];
}

export const shgCapacityQuery = () =>
  queryOptions({ queryKey: ["shgCapacity"], queryFn: fetchShgCapacity });

export async function updateShgCapacity(
  shgId: string,
  monthlyCapacity: number | null,
): Promise<void> {
  const { error } = await supabase
    .from("shgs")
    .update({ monthly_capacity: monthlyCapacity })
    .eq("id", shgId);
  if (error) throw new Error(error.message);
  await auditAction("update_shg_capacity", "shgs", shgId, { monthly_capacity: monthlyCapacity });
}

/** Recorded comparable prices for a category, attached to a snapshot for the engine. */
export function attachComparables(
  snapshots: CollectiveSnapshot[],
  products: { price: number; category: string }[],
  categoryTokens: string[],
): CollectiveSnapshot[] {
  const matched = products.filter((p) =>
    categoryTokens.some((t) => p.category.toLowerCase().includes(t)),
  );
  const prices = matched.map((p) => Number(p.price)).filter((n) => Number.isFinite(n) && n > 0);
  const stats =
    prices.length === 0
      ? { min: 0, avg: 0, max: 0, count: 0 }
      : {
          min: Math.min(...prices),
          avg: prices.reduce((s, p) => s + p, 0) / prices.length,
          max: Math.max(...prices),
          count: prices.length,
        };
  return snapshots.map((snap) => ({ ...snap, comparablePrices: stats }));
}

/* ---------- Gift Concierge: requests, proposals, approvals ---------- */

export interface CustomRequestInput {
  title: string;
  brief: string;
  structured: Record<string, unknown>;
  customer_reference?: string;
  language?: string;
}

/** Best-effort audit trail append — never blocks the caller's action. */
async function auditAction(
  action: string,
  entity: string,
  entityId: string | null,
  payload: Record<string, unknown>,
): Promise<void> {
  try {
    await supabase.from("action_audit_logs").insert({
      actor: "Kalaswar app — demonstration",
      action,
      entity,
      entity_id: entityId,
      payload: payload as Json,
    });
  } catch {
    /* the audit log is best-effort in demonstration mode */
  }
}

export async function nextRequestCode(): Promise<string> {
  const { data, error } = await supabase.from("custom_requests").select("request_code");
  if (error) throw new Error(error.message);
  let max = 1000;
  for (const row of (data ?? []) as { request_code: string }[]) {
    const m = /^KCR-(\d+)$/.exec(row.request_code);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `KCR-${max + 1}`;
}

export async function createCustomRequest(input: CustomRequestInput): Promise<CustomRequest> {
  const request_code = await nextRequestCode();
  const { data, error } = await supabase
    .from("custom_requests")
    .insert({
      request_code,
      customer_reference: input.customer_reference ?? "Concierge customer — demonstration",
      title: input.title,
      brief: input.brief,
      structured: input.structured as Json,
      status: "submitted",
      language: input.language ?? "en",
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  await auditAction("create_custom_request", "custom_requests", (data as CustomRequest).id, {
    request_code,
  });
  return data as unknown as CustomRequest;
}

export async function sendRequestToShg(requestId: string, shgId: string): Promise<void> {
  const { error } = await supabase
    .from("custom_requests")
    .update({ shg_id: shgId, status: "under_review", updated_at: new Date().toISOString() })
    .eq("id", requestId);
  if (error) throw new Error(error.message);
  await auditAction("send_request_to_shg", "custom_requests", requestId, { shg_id: shgId });
}

export async function declineRequest(requestId: string, reason: string): Promise<void> {
  const existing = await supabase
    .from("custom_requests")
    .select("structured")
    .eq("id", requestId)
    .maybeSingle();
  if (existing.error) throw new Error(existing.error.message);
  const structured = {
    ...(((existing.data as { structured: Record<string, unknown> | null } | null)?.structured) ?? {}),
    decline_reason: reason,
  } as Json;
  const { error } = await supabase
    .from("custom_requests")
    .update({
      status: "declined",
      structured,
      updated_at: new Date().toISOString(),
    })
    .eq("id", requestId);
  if (error) throw new Error(error.message);
  await auditAction("decline_request", "custom_requests", requestId, { reason });
}


export interface ProposalInput {
  request_id: string;
  spec: ProposalSpec;
  created_by?: string;
}

export async function createProposal(input: ProposalInput): Promise<Proposal> {
  const { data: existing, error: listErr } = await supabase
    .from("proposals")
    .select("version")
    .eq("request_id", input.request_id);
  if (listErr) throw new Error(listErr.message);
  const version =
    ((existing ?? []) as { version: number }[]).reduce((m, p) => Math.max(m, p.version), 0) + 1;
  const { data, error } = await supabase
    .from("proposals")
    .insert({
      request_id: input.request_id,
      version,
      spec: input.spec as unknown as Json,
      status: "sent",
      created_by: input.created_by ?? "Coordinator — demonstration",
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  await supabase
    .from("custom_requests")
    .update({ status: "proposed", updated_at: new Date().toISOString() })
    .eq("id", input.request_id);
  await auditAction("create_proposal", "proposals", (data as Proposal).id, {
    request_id: input.request_id,
    version,
  });
  return data as unknown as Proposal;
}

export async function approveProposal(
  proposalId: string,
  approverRole: "customer" | "coordinator",
): Promise<void> {
  const { data: existing, error: checkErr } = await supabase
    .from("proposal_approvals")
    .select("approver_role")
    .eq("proposal_id", proposalId);
  if (checkErr) throw new Error(checkErr.message);
  if ((existing ?? []).some((a) => a.approver_role === approverRole)) return; // already approved
  const { error } = await supabase
    .from("proposal_approvals")
    .insert({ proposal_id: proposalId, approver_role: approverRole });
  if (error) throw new Error(error.message);
  await auditAction("approve_proposal", "proposal_approvals", proposalId, { approver_role: approverRole });
}

export async function requestRevision(requestId: string, note: string): Promise<void> {
  const { data, error } = await supabase
    .from("custom_requests")
    .select("structured")
    .eq("id", requestId)
    .single();
  if (error) throw new Error(error.message);
  const structured = {
    ...((data as { structured: Record<string, unknown> }).structured ?? {}),
    revision_note: note,
  } as Json;
  const { error: updErr } = await supabase
    .from("custom_requests")
    .update({ status: "under_review", structured, updated_at: new Date().toISOString() })
    .eq("id", requestId);
  if (updErr) throw new Error(updErr.message);
  await auditAction("request_proposal_revision", "custom_requests", requestId, { note });
}

/**
 * Confirm a custom order — ONLY after the same proposal version carries both
 * the customer's and the coordinator's approvals. Creates the agreed product
 * line and a demonstration order bound to the approved proposal.
 */
export async function confirmCustomOrder(requestId: string): Promise<{ orderId: string }> {
  const { data: request, error: reqErr } = await supabase
    .from("custom_requests")
    .select("*")
    .eq("id", requestId)
    .single();
  if (reqErr || !request) throw new Error(reqErr?.message ?? "Request not found");
  const req = request as unknown as CustomRequest;
  if (req.status === "confirmed") throw new Error("This request is already confirmed.");
  const { data: props, error: propErr } = await supabase
    .from("proposals")
    .select("*")
    .eq("request_id", requestId)
    .order("version", { ascending: false })
    .limit(1);
  if (propErr || !props?.length) throw new Error(propErr?.message ?? "No proposal exists for this request.");
  const proposal = props[0] as unknown as Proposal;
  const { data: approvals, error: apprErr } = await supabase
    .from("proposal_approvals")
    .select("approver_role")
    .eq("proposal_id", proposal.id);
  if (apprErr) throw new Error(apprErr.message);
  const roles = new Set(((approvals ?? []) as { approver_role: string }[]).map((a) => a.approver_role));
  if (!roles.has("customer") || !roles.has("coordinator")) {
    throw new Error("Both the customer and the coordinator must approve the same proposal version first.");
  }
  const spec = proposal.spec;
  const shgId = req.shg_id;
  if (!shgId) throw new Error("The request has no collective assigned.");
  const { data: leadArtisan, error: artErr } = await supabase
    .from("artisans")
    .select("id")
    .eq("shg_id", shgId)
    .order("name", { ascending: true })
    .limit(1);
  if (artErr || !leadArtisan?.length) throw new Error("No artisan is recorded for this collective.");
  const price = Number(spec.price_per_unit_inr ?? 0);
  const { data: product, error: prodErr } = await supabase
    .from("products")
    .insert({
      artisan_id: (leadArtisan[0] as { id: string }).id,
      name: spec.name ?? req.title,
      description: `${spec.description ?? ""}\n\nCustom order agreed under ${req.request_code}, proposal v${proposal.version}.`,
      category: "Custom",
      price,
      availability: true,
    })
    .select()
    .single();
  if (prodErr) throw new Error(prodErr.message);
  const { data: orderCount, error: cntErr } = await supabase
    .from("orders")
    .select("customer_reference");
  if (cntErr) throw new Error(cntErr.message);
  let maxRef = 1049;
  for (const o of (orderCount ?? []) as { customer_reference: string }[]) {
    const m = /^KSW-(\d+)$/.exec(o.customer_reference);
    if (m) maxRef = Math.max(maxRef, Number(m[1]));
  }
  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .insert({
      product_id: (product as { id: string }).id,
      customer_reference: `KSW-${maxRef + 1}`,
      quantity: Number(spec.quantity ?? 1),
      status: "in_production",
      is_custom: true,
      proposal_id: proposal.id,
      expected_dispatch_at: spec.production_days
        ? new Date(Date.now() + Number(spec.production_days) * 86400000).toISOString()
        : null,
    })
    .select()
    .single();
  if (orderErr) throw new Error(orderErr.message);
  await supabase
    .from("custom_requests")
    .update({ status: "confirmed", updated_at: new Date().toISOString() })
    .eq("id", requestId);
  const orderId = (order as { id: string }).id;
  await recordOrderEvent(orderId, "in_production", `Confirmed from ${req.request_code} (proposal v${proposal.version})`);
  // Persist the confirmed order on the request so the customer can track it.
  try {
    await supabase
      .from("custom_requests")
      .update({
        structured: { ...((req.structured ?? {}) as object), confirmed_order_id: orderId } as Json,
        updated_at: new Date().toISOString(),
      })
      .eq("id", requestId);
  } catch {
    /* tracking link is best-effort in demonstration mode */
  }
  await auditAction("confirm_custom_order", "orders", orderId, { request_id: requestId });
  return { orderId };
}

/* ---------- Coordinator records: quality checks, shipments, expenses ---------- */

export async function recordQualityCheck(input: {
  order_id: string;
  artisan_id?: string | null;
  result: string;
  notes?: string | null;
}): Promise<void> {
  const { error } = await supabase.from("quality_checks").insert({
    order_id: input.order_id,
    artisan_id: input.artisan_id ?? null,
    result: input.result,
    notes: input.notes ?? null,
    checked_by: "Coordinator — demonstration",
  });
  if (error) throw new Error(error.message);
  await recordOrderEvent(input.order_id, `quality_${input.result}`);
  await auditAction("record_quality_check", "quality_checks", input.order_id, { result: input.result });
}

export async function recordExpense(input: {
  shg_id: string;
  artisan_id?: string | null;
  order_id?: string | null;
  category: string;
  amount: number;
  note?: string | null;
}): Promise<void> {
  const { error } = await supabase.from("expenses").insert({
    shg_id: input.shg_id,
    artisan_id: input.artisan_id ?? null,
    order_id: input.order_id ?? null,
    category: input.category,
    amount: input.amount,
    note: input.note ?? null,
    recorded_by: "Coordinator — demonstration",
  });
  if (error) throw new Error(error.message);
  await auditAction("record_expense", "expenses", input.order_id ?? input.shg_id, {
    category: input.category,
    amount: input.amount,
  });
}

export async function fetchShgExpenses(shgId: string): Promise<Expense[]> {
  const { data, error } = await supabase
    .from("expenses")
    .select("*")
    .eq("shg_id", shgId)
    .order("recorded_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as Expense[];
}

/* ---------- Reads for requests and proposals ---------- */

export async function fetchCustomRequests(): Promise<CustomRequestWithShg[]> {
  const { data, error } = await supabase
    .from("custom_requests")
    .select("*, shgs(name, region)")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as (CustomRequest & { shgs: { name: string; region: string } | null })[]).map(
    (r) => ({ ...r, shg_name: r.shgs?.name ?? null, shgs: undefined }),
  );
}

export interface CustomRequestWithShg extends CustomRequest {
  shg_name?: string | null;
  /** joined column, unused after mapping */
  shgs?: unknown;
}

export async function fetchCustomRequest(id: string): Promise<CustomRequestWithShg | null> {
  const { data, error } = await supabase
    .from("custom_requests")
    .select("*, shgs(name, region)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const row = data as unknown as CustomRequest & { shgs: { name: string; region: string } | null };
  return { ...row, shg_name: row.shgs?.name ?? null, shgs: undefined };
}

export async function fetchProposalsForRequest(requestId: string): Promise<Proposal[]> {
  const { data, error } = await supabase
    .from("proposals")
    .select("*")
    .eq("request_id", requestId)
    .order("version", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as Proposal[];
}

export async function fetchApprovalsForProposals(proposalIds: string[]): Promise<ProposalApproval[]> {
  if (proposalIds.length === 0) return [];
  const { data, error } = await supabase
    .from("proposal_approvals")
    .select("*")
    .in("proposal_id", proposalIds);
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as ProposalApproval[];
}

export const customRequestsQuery = () =>
  queryOptions({ queryKey: ["customRequests"], queryFn: fetchCustomRequests });

export const customRequestQuery = (id: string) =>
  queryOptions({
    queryKey: ["customRequest", id],
    queryFn: async () => {
      const request = await fetchCustomRequest(id);
      if (!request) return null;
      const proposals = await fetchProposalsForRequest(id);
      const approvals = await fetchApprovalsForProposals(proposals.map((p) => p.id));
      return { request, proposals, approvals };
    },
  });

export const collectiveSnapshotsQuery = () =>
  queryOptions({ queryKey: ["collectiveSnapshots"], queryFn: fetchCollectiveSnapshots });

export const shgExpensesQuery = (shgId: string) =>
  queryOptions({ queryKey: ["shgExpenses", shgId], queryFn: () => fetchShgExpenses(shgId) });

export interface ExpenseWithShg extends Expense {
  shg_name?: string | null;
}

export async function fetchExpenses(): Promise<ExpenseWithShg[]> {
  const { data, error } = await supabase
    .from("expenses")
    .select("*, shgs(name)")
    .order("recorded_at", { ascending: false });
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as (Expense & { shgs: { name: string } | null })[]).map((e) => ({
    ...e,
    shg_name: e.shgs?.name ?? null,
    shgs: undefined,
  }));
}

export const expensesAllQuery = () =>
  queryOptions({ queryKey: ["expensesAll"], queryFn: fetchExpenses });

/* ---------- Coordinator inventory management ---------- */

export interface MaterialWithShg {
  id: string;
  shg_id: string;
  name: string;
  unit: string;
  quantity: number;
  low_stock_threshold: number | null;
  updated_at: string;
  updated_by: string | null;
  shg_name?: string | null;
}

export async function fetchMaterials(): Promise<MaterialWithShg[]> {
  const { data, error } = await supabase
    .from("materials_inventory")
    .select("*, shgs(name)")
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as (MaterialWithShg & { shgs: { name: string } | null })[]).map(
    (m) => ({ ...m, shg_name: m.shgs?.name ?? null, shgs: undefined }),
  );
}

export const materialsAllQuery = () =>
  queryOptions({ queryKey: ["materialsAll"], queryFn: fetchMaterials });

export async function createMaterial(input: {
  shg_id: string;
  name: string;
  unit: string;
  quantity: number;
  low_stock_threshold?: number | null;
}): Promise<void> {
  const { error } = await supabase.from("materials_inventory").insert({
    shg_id: input.shg_id,
    name: input.name.trim(),
    unit: input.unit.trim() || "unit",
    quantity: input.quantity,
    low_stock_threshold: input.low_stock_threshold ?? null,
    updated_by: "Coordinator — demonstration",
  });
  if (error) throw new Error(error.message);
}

export async function updateMaterial(
  id: string,
  patch: { quantity?: number; low_stock_threshold?: number | null },
): Promise<void> {
  const { error } = await supabase
    .from("materials_inventory")
    .update({
      ...(patch.quantity !== undefined && { quantity: patch.quantity }),
      ...(patch.low_stock_threshold !== undefined && { low_stock_threshold: patch.low_stock_threshold }),
      updated_at: new Date().toISOString(),
      updated_by: "Coordinator — demonstration",
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

/* ---------- Dispatch records ---------- */

export async function recordShipment(input: {
  order_id: string;
  status: string;
  carrier?: string | null;
  tracking_ref?: string | null;
  note?: string | null;
}): Promise<void> {
  const { data, error } = await supabase
    .from("shipments")
    .insert({
      order_id: input.order_id,
      status: input.status,
      carrier: input.carrier ?? null,
      tracking_ref: input.tracking_ref ?? null,
      provider: null,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  try {
    await supabase.from("shipment_events").insert({
      shipment_id: (data as { id: string }).id,
      event_type: input.status,
      note: input.note ?? null,
    });
  } catch {
    /* shipment events are best-effort in demonstration mode */
  }
  await recordOrderEvent(
    input.order_id,
    input.status === "dispatched" ? "dispatched" : `shipment_${input.status}`,
    [input.carrier, input.tracking_ref].filter(Boolean).join(" · ") || input.note || undefined,
  );
  await auditAction("record_shipment", "shipments", input.order_id, { status: input.status });
}

export async function fetchOrderQualityChecks(orderId: string): Promise<QualityCheck[]> {
  const { data, error } = await supabase
    .from("quality_checks")
    .select("*")
    .eq("order_id", orderId)
    .order("checked_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as QualityCheck[];
}

export async function fetchOrderShipments(orderId: string): Promise<Shipment[]> {
  const { data, error } = await supabase
    .from("shipments")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as Shipment[];
}

export const orderQualityChecksQuery = (orderId: string) =>
  queryOptions({
    queryKey: ["orderQualityChecks", orderId],
    queryFn: () => fetchOrderQualityChecks(orderId),
  });

export const orderShipmentsQuery = (orderId: string) =>
  queryOptions({
    queryKey: ["orderShipments", orderId],
    queryFn: () => fetchOrderShipments(orderId),
  });

/* ---------- Demand signals (views / saves / enquiries) ---------- */

export type ProductSignalType = "view" | "save" | "enquiry";

/** Best-effort demand signal — the page works even if recording fails. */
export async function recordProductSignal(productId: string, signalType: ProductSignalType): Promise<void> {
  try {
    await supabase.from("product_signals").insert({
      product_id: productId,
      signal_type: signalType,
      recorded_by: "Customer — demonstration",
    });
  } catch {
    /* demand signals are best-effort in demonstration mode */
  }
}

export interface ProductSignalWithProduct {
  product_id: string;
  signal_type: string;
  created_at: string;
  product_name?: string | null;
}

export async function fetchProductSignals(): Promise<ProductSignalWithProduct[]> {
  const { data, error } = await supabase
    .from("product_signals")
    .select("product_id, signal_type, created_at, products(name)")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as (ProductSignalWithProduct & {
    products: { name: string } | null;
  })[]).map((s) => ({ ...s, product_name: s.products?.name ?? null, products: undefined }));
}

export const productSignalsAllQuery = () =>
  queryOptions({ queryKey: ["productSignalsAll"], queryFn: fetchProductSignals });

/* ---------- Craft passport: checks and shipments behind a product ---------- */

export async function fetchProductQualityChecks(productId: string): Promise<QualityCheck[]> {
  const { data, error } = await supabase
    .from("quality_checks")
    .select("*, orders!inner(product_id)")
    .eq("orders.product_id", productId)
    .order("checked_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as QualityCheck[];
}

export async function fetchProductShipments(productId: string): Promise<Shipment[]> {
  const { data, error } = await supabase
    .from("shipments")
    .select("*, orders!inner(product_id)")
    .eq("orders.product_id", productId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as Shipment[];
}
