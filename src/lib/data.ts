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
import { CONSENT_TYPES } from "./types";
import type {
  Artisan,
  Buyer,
  BuyerRequest,
  BuyerRequestStatus,
  BuyerRequestWithBuyer,
  CraftGuide,
  ConsentType,
  CraftStory,
  CraftStoryStatus,
  CraftStoryWithConsents,
  CraftStoryWithRefs,
  StoryConsent,
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
  Quotation,
  QuotationSpec,
  QuotationStatus,
  QuotationVersion,
  QuotationWithRefs,
  SampleEvent,
  SampleRequest,
  SampleRequestWithRefs,
  SampleStatus,
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

/* ---------- FairPrice Engine: material prices, cost inputs, versioned snapshots ---------- */

export interface MaterialPriceEntry {
  id: string;
  shg_id: string;
  material_id: string | null;
  material_name: string;
  unit: string | null;
  unit_price_inr: number;
  source: string | null;
  note: string | null;
  recorded_by: string | null;
  recorded_at: string;
}

export interface CostSnapshotRecord {
  id: string;
  product_id: string;
  version: number;
  currency: string;
  breakdown: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
}

export async function fetchMaterialPrices(): Promise<MaterialPriceEntry[]> {
  const { data, error } = await supabase
    .from("material_price_history")
    .select("*")
    .order("recorded_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as MaterialPriceEntry[];
}

export const materialPricesQuery = () =>
  queryOptions({ queryKey: ["materialPrices"], queryFn: fetchMaterialPrices });

export async function recordMaterialPrice(input: {
  shg_id: string;
  material_id?: string | null;
  material_name: string;
  unit?: string | null;
  unit_price_inr: number;
  source?: string | null;
  note?: string | null;
}): Promise<void> {
  const { error } = await supabase.from("material_price_history").insert({
    shg_id: input.shg_id,
    material_id: input.material_id ?? null,
    material_name: input.material_name.trim(),
    unit: input.unit ?? null,
    unit_price_inr: input.unit_price_inr,
    source: input.source ?? null,
    note: input.note ?? null,
    recorded_by: "Coordinator — demonstration",
  });
  if (error) throw new Error(error.message);
  await auditAction("record_material_price", "material_price_history", input.shg_id, {
    material: input.material_name,
    price: input.unit_price_inr,
  });
}

export async function fetchProductCostInputs(productId: string) {
  const { data, error } = await supabase
    .from("product_cost_inputs")
    .select("*")
    .eq("product_id", productId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as {
    id: string;
    product_id: string;
    shg_id: string | null;
    material_name: string;
    quantity_per_unit: number;
    unit: string | null;
    unit_cost_inr: number;
    wastage_percent: number;
  }[];
}

export async function fetchProductLabourInputs(productId: string) {
  const { data, error } = await supabase
    .from("product_labour_inputs")
    .select("*")
    .eq("product_id", productId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as {
    id: string;
    product_id: string;
    stage_name: string;
    hours_per_unit: number;
    rate_inr_per_hour: number | null;
    rate_source: string | null;
  }[];
}

/** Replace a product's material cost lines (demonstration-mode write). */
export async function saveProductCostInputs(
  productId: string,
  shgId: string | null,
  lines: { material_name: string; quantity_per_unit: number; unit: string | null; unit_cost_inr: number; wastage_percent: number }[],
): Promise<void> {
  const del = await supabase.from("product_cost_inputs").delete().eq("product_id", productId);
  if (del.error) throw new Error(del.error.message);
  if (lines.length === 0) return;
  const ins = await supabase.from("product_cost_inputs").insert(
    lines.map((l) => ({
      product_id: productId,
      shg_id: shgId,
      material_name: l.material_name.trim(),
      quantity_per_unit: l.quantity_per_unit,
      unit: l.unit,
      unit_cost_inr: l.unit_cost_inr,
      wastage_percent: l.wastage_percent,
    })),
  );
  if (ins.error) throw new Error(ins.error.message);
}

/** Replace a product's labour stages (demonstration-mode write). */
export async function saveProductLabourInputs(
  productId: string,
  stages: { stage_name: string; hours_per_unit: number; rate_inr_per_hour: number | null; rate_source: string | null }[],
): Promise<void> {
  const del = await supabase.from("product_labour_inputs").delete().eq("product_id", productId);
  if (del.error) throw new Error(del.error.message);
  if (stages.length === 0) return;
  const ins = await supabase.from("product_labour_inputs").insert(
    stages.map((s) => ({
      product_id: productId,
      stage_name: s.stage_name.trim(),
      hours_per_unit: s.hours_per_unit,
      rate_inr_per_hour: s.rate_inr_per_hour,
      rate_source: s.rate_source ?? null,
    })),
  );
  if (ins.error) throw new Error(ins.error.message);
}

export async function fetchProductCostSnapshots(productId: string): Promise<CostSnapshotRecord[]> {
  const { data, error } = await supabase
    .from("product_cost_snapshots")
    .select("*")
    .eq("product_id", productId)
    .order("version", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as CostSnapshotRecord[];
}

export const productCostSnapshotsQuery = (productId: string) =>
  queryOptions({
    queryKey: ["productCostSnapshots", productId],
    queryFn: () => fetchProductCostSnapshots(productId),
  });

/** Store an immutable cost snapshot at the next version number. */
export async function saveCostSnapshot(
  productId: string,
  breakdown: Record<string, unknown>,
): Promise<void> {
  const existing = await fetchProductCostSnapshots(productId);
  const nextVersion = existing.reduce((max, s) => Math.max(max, s.version), 0) + 1;
  const { error } = await supabase.from("product_cost_snapshots").insert({
    product_id: productId,
    version: nextVersion,
    currency: "INR",
    breakdown: breakdown as unknown as Json,
    created_by: "Coordinator — demonstration",
  });
  if (error) throw new Error(error.message);
  await auditAction("save_cost_snapshot", "product_cost_snapshots", productId, { version: nextVersion });
}

/* ---------- Living Craft Stories (Pillar 2) ---------- */

export interface StorySaveInput {
  id?: string;
  artisan_id: string;
  shg_id: string | null;
  product_id: string | null;
  title: string;
  body: string;
  language: string;
  status: CraftStoryStatus;
  original_notes: string | null;
  ai_assisted: boolean;
  /** Recorded only when the story is published — the maker's approval. */
  approved_by: string | null;
}

export async function fetchStoriesForArtisan(artisanId: string): Promise<CraftStoryWithConsents[]> {
  const { data, error } = await supabase
    .from("craft_stories")
    .select("*, story_consents(*)")
    .eq("artisan_id", artisanId)
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return ((data ?? []) as Array<CraftStory & { story_consents?: StoryConsent[] }>).map((s) => ({
    ...s,
    consents: s.story_consents ?? [],
  }));
}

export const storiesForArtisanQuery = (artisanId: string) =>
  queryOptions({
    queryKey: ["craftStories", artisanId],
    queryFn: () => fetchStoriesForArtisan(artisanId),
  });

export async function fetchPublishedStories(): Promise<CraftStoryWithRefs[]> {
  const { data, error } = await supabase
    .from("craft_stories")
    .select("*, story_consents(*), artisans(name), products(name, image_url)")
    .eq("status", "published")
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return ((data ?? []) as Array<CraftStoryWithRefs & {
    story_consents?: StoryConsent[];
    artisans?: { name: string } | null;
    products?: { name: string; image_url: string | null } | null;
  }>).map((s) => ({
    ...s,
    consents: s.story_consents ?? [],
    artisan_name: s.artisans?.name ?? null,
    product_name: s.products?.name ?? null,
    product_image: s.products?.image_url ?? null,
  }));
}

export const publishedStoriesQuery = () =>
  queryOptions({
    queryKey: ["craftStoriesPublished"],
    queryFn: () => fetchPublishedStories(),
  });

export async function fetchStoryById(id: string): Promise<CraftStoryWithRefs | undefined> {
  const { data, error } = await supabase
    .from("craft_stories")
    .select("*, story_consents(*), artisans(name), products(name, image_url)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  const s = data as (CraftStoryWithRefs & {
    story_consents?: StoryConsent[];
    artisans?: { name: string } | null;
    products?: { name: string; image_url: string | null } | null;
  }) | null;
  if (!s) return undefined;
  return {
    ...s,
    consents: s.story_consents ?? [],
    artisan_name: s.artisans?.name ?? null,
    product_name: s.products?.name ?? null,
    product_image: s.products?.image_url ?? null,
  };
}

export const storyByIdQuery = (id: string) =>
  queryOptions({
    queryKey: ["craftStory", id],
    queryFn: () => fetchStoryById(id),
  });

export async function fetchPublishedStoryForProduct(productId: string): Promise<CraftStoryWithRefs | undefined> {
  const { data, error } = await supabase
    .from("craft_stories")
    .select("*, story_consents(*), artisans(name), products(name, image_url)")
    .eq("product_id", productId)
    .eq("status", "published")
    .order("updated_at", { ascending: false })
    .limit(1);
  if (error) throw new Error(error.message);
  const rows = ((data ?? []) as Array<CraftStoryWithRefs & {
    story_consents?: StoryConsent[];
    artisans?: { name: string } | null;
    products?: { name: string; image_url: string | null } | null;
  }>).map((s) => ({
    ...s,
    consents: s.story_consents ?? [],
    artisan_name: s.artisans?.name ?? null,
    product_name: s.products?.name ?? null,
    product_image: s.products?.image_url ?? null,
  }));
  return rows[0];
}

export const publishedStoryForProductQuery = (productId: string) =>
  queryOptions({
    queryKey: ["craftStoryForProduct", productId],
    queryFn: () => fetchPublishedStoryForProduct(productId),
  });

/**
 * Create or update a maker's story. Publishing records the maker's approval;
 * unpublishing (draft/retired) clears it — an unapproved story is never live.
 */
export async function saveCraftStory(input: StorySaveInput): Promise<CraftStory> {
  const publishing = input.status === "published";
  const payload = {
    product_id: input.product_id,
    shg_id: input.shg_id,
    artisan_id: input.artisan_id,
    title: input.title.trim(),
    body: input.body.trim(),
    language: input.language,
    status: input.status,
    original_notes: input.original_notes,
    ai_assisted: input.ai_assisted,
    approved_by: publishing ? input.approved_by : null,
    approved_at: publishing ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  };
  const res = input.id
    ? await supabase.from("craft_stories").update(payload).eq("id", input.id).select().single()
    : await supabase.from("craft_stories").insert(payload).select().single();
  if (res.error) throw new Error(res.error.message);
  const story = res.data as CraftStory;
  // Every consent starts present-but-not-granted, so the maker can grant —
  // and later withdraw — each one individually.
  await supabase
    .from("story_consents")
    .upsert(
      CONSENT_TYPES.map((t) => ({ story_id: story.id, consent_type: t, granted: false, updated_by: input.approved_by })),
      { onConflict: "story_id,consent_type", ignoreDuplicates: true },
    );
  await auditAction("save_craft_story", "craft_stories", story.id, {
    status: input.status,
    ai_assisted: input.ai_assisted,
  });
  return story;
}

/** Grant or withdraw one consent. Withdrawal takes effect immediately. */
export async function setStoryConsent(
  storyId: string,
  consentType: ConsentType,
  granted: boolean,
  updatedBy: string | null,
): Promise<void> {
  const { error } = await supabase.from("story_consents").upsert(
    { story_id: storyId, consent_type: consentType, granted, updated_by: updatedBy, updated_at: new Date().toISOString() },
    { onConflict: "story_id,consent_type" },
  );
  if (error) throw new Error(error.message);
  await auditAction("set_story_consent", "story_consents", storyId, { consent_type: consentType, granted });
}

/* ---------- B2B Studio ---------- */

export async function nextBuyerRequestCode(): Promise<string> {
  const { data, error } = await supabase.from("buyer_requests").select("request_code");
  if (error) throw new Error(error.message);
  let max = 1000;
  for (const row of (data ?? []) as { request_code: string }[]) {
    const m = /^KBR-(\d+)$/.exec(row.request_code);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `KBR-${max + 1}`;
}

export async function fetchBuyers(): Promise<Buyer[]> {
  const { data, error } = await supabase.from("buyers").select("*").order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as Buyer[];
}

export const buyersQuery = () =>
  queryOptions({ queryKey: ["buyers"], queryFn: fetchBuyers });

export interface BuyerInput {
  id?: string;
  user_id?: string | null;
  org_name: string;
  category?: string | null;
  contact_name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  region?: string | null;
  intended_use?: string | null;
}

export async function upsertBuyer(input: BuyerInput): Promise<Buyer> {
  const payload = {
    ...(input.id ? { id: input.id } : {}),
    ...(input.user_id ? { user_id: input.user_id } : {}),
    org_name: input.org_name.trim(),
    category: input.category?.trim() || null,
    contact_name: input.contact_name?.trim() || null,
    contact_email: input.contact_email?.trim() || null,
    contact_phone: input.contact_phone?.trim() || null,
    region: input.region?.trim() || null,
    intended_use: input.intended_use?.trim() || null,
  };
  const { data, error } = await supabase.from("buyers").upsert(payload).select().single();
  if (error) throw new Error(error.message);
  await auditAction("upsert_buyer", "buyers", (data as Buyer).id, { org_name: payload.org_name });
  return data as unknown as Buyer;
}

export async function fetchBuyerRequests(): Promise<BuyerRequestWithBuyer[]> {
  const { data, error } = await supabase
    .from("buyer_requests")
    .select("*, buyers(org_name, contact_name, contact_email)")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return ((data ?? []) as Record<string, unknown>[]).map((r) => {
    const buyer = (r["buyers"] ?? null) as { org_name: string; contact_name: string; contact_email: string } | null;
    const { buyers: _b, ...rest } = r;
    return { ...rest, buyer_org_name: buyer?.org_name ?? null, buyer_contact_name: buyer?.contact_name ?? null, buyer_contact_email: buyer?.contact_email ?? null } as unknown as BuyerRequestWithBuyer;
  });
}

export const buyerRequestsQuery = () =>
  queryOptions({ queryKey: ["buyerRequests"], queryFn: fetchBuyerRequests });

export async function fetchBuyerRequest(id: string): Promise<BuyerRequestWithBuyer | null> {
  const { data, error } = await supabase
    .from("buyer_requests")
    .select("*, buyers(org_name, contact_name, contact_email)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const row = data as Record<string, unknown>;
  const buyer = (row["buyers"] ?? null) as { org_name: string; contact_name: string; contact_email: string } | null;
  const { buyers: _b, ...rest } = row;
  return { ...rest, buyer_org_name: buyer?.org_name ?? null, buyer_contact_name: buyer?.contact_name ?? null, buyer_contact_email: buyer?.contact_email ?? null } as unknown as BuyerRequestWithBuyer;
}

export const buyerRequestQuery = (id: string) =>
  queryOptions({ queryKey: ["buyerRequest", id], queryFn: () => fetchBuyerRequest(id) });

export async function createBuyerRequest(input: {
  buyer_id: string;
  title: string;
  structured: Record<string, unknown>;
  status?: BuyerRequestStatus;
}): Promise<BuyerRequest> {
  const request_code = await nextBuyerRequestCode();
  const { data, error } = await supabase
    .from("buyer_requests")
    .insert({
      request_code,
      buyer_id: input.buyer_id,
      title: input.title.trim(),
      structured: input.structured as Json,
      status: input.status ?? "draft",
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  await auditAction("create_buyer_request", "buyer_requests", (data as BuyerRequest).id, { request_code });
  return data as unknown as BuyerRequest;
}

export async function updateBuyerRequest(
  id: string,
  input: { title?: string; structured?: Record<string, unknown>; status?: BuyerRequestStatus },
): Promise<void> {
  const { error } = await supabase
    .from("buyer_requests")
    .update({
      ...(input.title != null ? { title: input.title.trim() } : {}),
      ...(input.structured != null ? { structured: input.structured as Json } : {}),
      ...(input.status != null ? { status: input.status } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
  await auditAction("update_buyer_request", "buyer_requests", id, { status: input.status });
}

export async function setBuyerRequestStatus(
  id: string,
  status: BuyerRequestStatus,
  structuredExtra?: Record<string, unknown>,
): Promise<void> {
  if (structuredExtra) {
    const { data, error: readErr } = await supabase.from("buyer_requests").select("structured").eq("id", id).single();
    if (readErr) throw new Error(readErr.message);
    const merged = {
      ...(((data as { structured: Record<string, unknown> } | null)?.structured) ?? {}),
      ...structuredExtra,
    } as Json;
    const { error } = await supabase
      .from("buyer_requests")
      .update({ status, structured: merged, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from("buyer_requests")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw new Error(error.message);
  }
  await auditAction("set_buyer_request_status", "buyer_requests", id, { status });
}

/** shg_id columns in the B2B tables are plain UUIDs, so collective names are
 *  resolved with a separate lookup instead of an embedded relationship. */
async function shgNameMap(): Promise<Record<string, string>> {
  const { data, error } = await supabase.from("shgs").select("id, name");
  if (error) throw new Error(error.message);
  const map: Record<string, string> = {};
  for (const row of (data ?? []) as { id: string; name: string }[]) map[row.id] = row.name;
  return map;
}

export async function fetchQuotations(): Promise<QuotationWithRefs[]> {
  const { data, error } = await supabase
    .from("quotations")
    .select("*, buyer_requests(request_code, title, buyers(org_name)), quotation_versions(*)")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  const shgNames = await shgNameMap();
  return ((data ?? []) as Record<string, unknown>[]).map((q) => {
    const req = (q["buyer_requests"] ?? null) as
      | { request_code: string; title: string; buyers: { org_name: string } | null }
      | null;
    const versions = ((q["quotation_versions"] ?? []) as unknown as QuotationVersion[]).sort((a, b) => b.version - a.version);
    const { buyer_requests: _r, quotation_versions: _v, ...rest } = q;
    const shgId = (rest as { shg_id: string | null }).shg_id;
    return {
      ...rest,
      request_code: req?.request_code ?? null,
      request_title: req?.title ?? null,
      buyer_org_name: req?.buyers?.org_name ?? null,
      shg_name: shgId ? shgNames[shgId] ?? null : null,
      versions,
    } as unknown as QuotationWithRefs;
  });
}

export const quotationsQuery = () =>
  queryOptions({ queryKey: ["quotations"], queryFn: fetchQuotations });

export async function fetchQuotation(id: string): Promise<QuotationWithRefs | null> {
  const all = await fetchQuotations();
  return all.find((q) => q.id === id) ?? null;
}

export const quotationQuery = (id: string) =>
  queryOptions({ queryKey: ["quotations"], queryFn: fetchQuotations, select: (qs: QuotationWithRefs[]) => qs.find((q) => q.id === id) ?? null });

export async function fetchQuotationsForRequest(requestId: string): Promise<QuotationWithRefs[]> {
  const all = await fetchQuotations();
  return all.filter((q) => q.buyer_request_id === requestId);
}

export const quotationsForRequestQuery = (requestId: string) =>
  queryOptions({ queryKey: ["quotations"], queryFn: fetchQuotations, select: (qs: QuotationWithRefs[]) => qs.filter((q) => q.buyer_request_id === requestId) });

export interface QuotationVersionInput {
  quotation_id: string;
  spec: QuotationSpec;
  created_by?: string;
}

async function nextQuotationVersion(quotationId: string): Promise<number> {
  const { data, error } = await supabase
    .from("quotation_versions")
    .select("version")
    .eq("quotation_id", quotationId);
  if (error) throw new Error(error.message);
  return ((data ?? []) as { version: number }[]).reduce((m, v) => Math.max(m, v.version), 0) + 1;
}

export async function createQuotation(input: { buyer_request_id: string; shg_id: string; spec: QuotationSpec; created_by?: string }): Promise<Quotation> {
  const { data, error } = await supabase
    .from("quotations")
    .insert({ buyer_request_id: input.buyer_request_id, shg_id: input.shg_id, status: "draft" })
    .select()
    .single();
  if (error) throw new Error(error.message);
  const quotation = data as unknown as Quotation;
  await addQuotationVersion({ quotation_id: quotation.id, spec: input.spec, ...(input.created_by != null ? { created_by: input.created_by } : {}) });
  await auditAction("create_quotation", "quotations", quotation.id, { buyer_request_id: input.buyer_request_id });
  return quotation;
}

export async function addQuotationVersion(input: QuotationVersionInput): Promise<QuotationVersion> {
  const version = await nextQuotationVersion(input.quotation_id);
  // Previous versions become superseded once a new one is drafted.
  const { error: supErr } = await supabase
    .from("quotation_versions")
    .update({ status: "superseded" })
    .eq("quotation_id", input.quotation_id)
    .in("status", ["draft"]);
  if (supErr) throw new Error(supErr.message);
  const { data, error } = await supabase
    .from("quotation_versions")
    .insert({
      quotation_id: input.quotation_id,
      version,
      spec: input.spec as unknown as Json,
      status: "draft",
      created_by: input.created_by ?? "Coordinator — demonstration",
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  const { error: qErr } = await supabase
    .from("quotations")
    .update({ status: "revised", updated_at: new Date().toISOString() })
    .eq("id", input.quotation_id)
    .in("status", ["revision_requested", "revised"]);
  if (qErr) throw new Error(qErr.message);
  await auditAction("add_quotation_version", "quotation_versions", (data as QuotationVersion).id, { version });
  return data as unknown as QuotationVersion;
}

export async function submitQuotationVersion(quotationId: string, versionId: string): Promise<void> {
  const { error } = await supabase
    .from("quotation_versions")
    .update({ status: "submitted" })
    .eq("id", versionId)
    .eq("quotation_id", quotationId);
  if (error) throw new Error(error.message);
  const { error: qErr } = await supabase
    .from("quotations")
    .update({ status: "submitted", updated_at: new Date().toISOString() })
    .eq("id", quotationId);
  if (qErr) throw new Error(qErr.message);
  const { data: quote, error: readErr } = await supabase
    .from("quotations")
    .select("buyer_request_id")
    .eq("id", quotationId)
    .single();
  if (readErr) throw new Error(readErr.message);
  const requestId = (quote as { buyer_request_id: string } | null)?.buyer_request_id;
  if (requestId) await setBuyerRequestStatus(requestId, "quoted");
  await auditAction("submit_quotation_version", "quotation_versions", versionId, { quotation_id: quotationId });
}

export async function acceptQuotationVersion(quotationId: string, versionId: string): Promise<void> {
  const { data: versions, error: vErr } = await supabase
    .from("quotation_versions")
    .select("id, version, status")
    .eq("quotation_id", quotationId);
  if (vErr) throw new Error(vErr.message);
  const target = (versions ?? []).find((v) => v.id === versionId);
  if (!target || target.status !== "submitted") {
    throw new Error("Only a submitted quotation version can be accepted.");
  }
  // Preserve the accepted version; retire other submitted/superseded ones.
  const { error: supErr } = await supabase
    .from("quotation_versions")
    .update({ status: "superseded" })
    .eq("quotation_id", quotationId)
    .in("status", ["submitted"])
    .neq("id", versionId);
  if (supErr) throw new Error(supErr.message);
  const { error } = await supabase
    .from("quotation_versions")
    .update({ status: "accepted", accepted_at: new Date().toISOString() })
    .eq("id", versionId);
  if (error) throw new Error(error.message);
  const { error: qErr } = await supabase
    .from("quotations")
    .update({ status: "accepted", updated_at: new Date().toISOString() })
    .eq("id", quotationId);
  if (qErr) throw new Error(qErr.message);
  await auditAction("accept_quotation_version", "quotation_versions", versionId, { quotation_id: quotationId });
}

export async function declineQuotation(quotationId: string, reason: string): Promise<void> {
  const { error } = await supabase
    .from("quotations")
    .update({ status: "declined", updated_at: new Date().toISOString() })
    .eq("id", quotationId);
  if (error) throw new Error(error.message);
  await auditAction("decline_quotation", "quotations", quotationId, { reason });
}

export async function requestQuotationRevision(quotationId: string, note: string): Promise<void> {
  const { error } = await supabase
    .from("quotations")
    .update({ status: "revision_requested", updated_at: new Date().toISOString() })
    .eq("id", quotationId);
  if (error) throw new Error(error.message);
  await auditAction("request_quotation_revision", "quotations", quotationId, { note });
}

export async function cancelQuotation(quotationId: string): Promise<void> {
  const { error } = await supabase
    .from("quotations")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", quotationId);
  if (error) throw new Error(error.message);
  await auditAction("cancel_quotation", "quotations", quotationId, {});
}

export async function fetchSampleRequests(): Promise<SampleRequestWithRefs[]> {
  const { data, error } = await supabase
    .from("sample_requests")
    .select(
      "*, buyers(org_name), buyer_requests(request_code), sample_events(*)",
    )
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  const shgNames = await shgNameMap();
  return ((data ?? []) as Record<string, unknown>[]).map((s) => {
    const buyer = (s["buyers"] ?? null) as { org_name: string } | null;
    const req = (s["buyer_requests"] ?? null) as { request_code: string } | null;
    const events = ((s["sample_events"] ?? []) as unknown as SampleEvent[]).sort(
      (a, b) => Date.parse(b.occurred_at) - Date.parse(a.occurred_at),
    );
    const { buyers: _b, buyer_requests: _r, sample_events: _e, ...rest } = s;
    const shgId = (rest as { shg_id: string | null }).shg_id;
    return {
      ...rest,
      shg_name: shgId ? shgNames[shgId] ?? null : null,
      buyer_org_name: buyer?.org_name ?? null,
      quotation_request_code: req?.request_code ?? null,
      events,
    } as unknown as SampleRequestWithRefs;
  });
}

export const samplesQuery = () =>
  queryOptions({ queryKey: ["samples"], queryFn: fetchSampleRequests });

export interface SampleInput {
  quotation_id?: string | null;
  buyer_request_id?: string | null;
  shg_id?: string | null;
  buyer_id?: string | null;
  spec: Record<string, unknown>;
  spec_version?: number;
  fee_inr?: number;
}

export async function createSampleRequest(input: SampleInput): Promise<SampleRequest> {
  const { data, error } = await supabase
    .from("sample_requests")
    .insert({
      quotation_id: input.quotation_id ?? null,
      buyer_request_id: input.buyer_request_id ?? null,
      shg_id: input.shg_id ?? null,
      buyer_id: input.buyer_id ?? null,
      spec: input.spec as Json,
      spec_version: input.spec_version ?? 1,
      fee_inr: input.fee_inr ?? 0,
      status: "requested",
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  const sample = data as unknown as SampleRequest;
  await supabase.from("sample_events").insert({ sample_id: sample.id, event_type: "requested", note: "Sample requested" });
  await auditAction("create_sample_request", "sample_requests", sample.id, {});
  return sample;
}

export async function updateSampleStatus(sampleId: string, status: SampleStatus, note?: string): Promise<void> {
  const { error } = await supabase
    .from("sample_requests")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", sampleId);
  if (error) throw new Error(error.message);
  await supabase
    .from("sample_events")
    .insert({ sample_id: sampleId, event_type: status, note: note ?? null });
  await auditAction("update_sample_status", "sample_requests", sampleId, { status });
}

export async function setSampleFeedback(
  sampleId: string,
  feedback: string,
  decision: "approved" | "revision_requested",
): Promise<void> {
  const { error } = await supabase
    .from("sample_requests")
    .update({ feedback, status: decision, updated_at: new Date().toISOString() })
    .eq("id", sampleId);
  if (error) throw new Error(error.message);
  await supabase
    .from("sample_events")
    .insert({ sample_id: sampleId, event_type: decision, note: feedback });
  await auditAction("set_sample_feedback", "sample_requests", sampleId, { decision });
}

/**
 * Confirm a B2B order — ONLY when the buyer has accepted a submitted
 * quotation version. Creates the agreed product line and an order marked
 * as B2B, linked back to the buyer request.
 */
export async function confirmB2bOrder(quotationId: string): Promise<{ orderId: string }> {
  const { data: quote, error: qErr } = await supabase
    .from("quotations")
    .select("*, buyer_requests(id, request_code, title, structured, status), quotation_versions(*)")
    .eq("id", quotationId)
    .single();
  if (qErr || !quote) throw new Error(qErr?.message ?? "Quotation not found");
  const q = quote as unknown as QuotationWithRefs & {
    buyer_requests: { id: string; request_code: string; title: string; structured: Record<string, unknown>; status: string };
  };
  if (q.status === "accepted" && q.buyer_requests.status === "accepted") {
    throw new Error("This quotation is already confirmed as an order.");
  }
  const versions = (((q as unknown as Record<string, unknown>)["quotation_versions"] ?? []) as unknown as QuotationVersion[]);
  const accepted = versions.filter((v) => v.status === "accepted").sort((a, b) => b.version - a.version)[0];
  if (!accepted) throw new Error("The buyer must accept a quotation version before an order can be confirmed.");
  const spec = accepted.spec;
  const shgId = q.shg_id;
  if (!shgId) throw new Error("The quotation has no collective assigned.");
  const { data: leadArtisan, error: artErr } = await supabase
    .from("artisans")
    .select("id")
    .eq("shg_id", shgId)
    .order("name", { ascending: true })
    .limit(1);
  if (artErr || !leadArtisan?.length) throw new Error("No artisan is recorded for this collective.");
  const totals = spec.quantity != null ? Number(spec.quantity) : 1;
  const { data: product, error: prodErr } = await supabase
    .from("products")
    .insert({
      artisan_id: (leadArtisan[0] as { id: string }).id,
      name: q.buyer_requests.title,
      description: `B2B order under ${q.buyer_requests.request_code}, quotation v${accepted.version}.\n${spec.product_spec ?? ""}`.trim(),
      category: "B2B",
      price: Number(spec.unit_price_inr ?? 0),
      availability: true,
    })
    .select()
    .single();
  if (prodErr) throw new Error(prodErr.message);
  const { data: orderCount, error: cntErr } = await supabase.from("orders").select("customer_reference");
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
      quantity: totals || 1,
      status: "in_production",
      is_custom: true,
      source: "b2b",
      buyer_request_id: q.buyer_requests.id,
      expected_dispatch_at: spec.lead_time_days
        ? new Date(Date.now() + Number(spec.lead_time_days) * 86400000).toISOString()
        : null,
    })
    .select()
    .single();
  if (orderErr) throw new Error(orderErr.message);
  const orderId = (order as { id: string }).id;
  await supabase
    .from("quotations")
    .update({ status: "accepted", updated_at: new Date().toISOString() })
    .eq("id", quotationId);
  const structuredExtra = { confirmed_order_id: orderId, confirmed_quotation_version: accepted.version };
  await setBuyerRequestStatus(q.buyer_requests.id, "accepted", structuredExtra);
  await recordOrderEvent(orderId, "in_production", `Confirmed B2B order from ${q.buyer_requests.request_code} (quotation v${accepted.version})`);
  await auditAction("confirm_b2b_order", "orders", orderId, { quotation_id: quotationId, version: accepted.version });
  return { orderId };
}

export async function fetchB2bOrders(): Promise<(Order & { request_code?: string | null; request_title?: string | null; buyer_org_name?: string | null })[]> {
  const { data, error } = await supabase
    .from("orders")
    .select("*, buyer_requests(request_code, title, buyers(org_name))")
    .eq("source", "b2b")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return ((data ?? []) as Record<string, unknown>[]).map((o) => {
    const req = (o["buyer_requests"] ?? null) as
      | { request_code: string; title: string; buyers: { org_name: string } | null }
      | null;
    const { buyer_requests: _r, ...rest } = o;
    return {
      ...rest,
      request_code: req?.request_code ?? null,
      request_title: req?.title ?? null,
      buyer_org_name: req?.buyers?.org_name ?? null,
    } as unknown as Order & { request_code?: string | null; request_title?: string | null; buyer_org_name?: string | null };
  });
}

export const b2bOrdersQuery = () =>
  queryOptions({ queryKey: ["b2bOrders"], queryFn: fetchB2bOrders });

/** Record a B2B production-stage event on an order's timeline. */
export async function recordB2bStage(orderId: string, stage: string, note?: string): Promise<void> {
  await recordOrderEvent(orderId, stage, note ?? undefined);
  await auditAction("record_b2b_stage", "order_events", orderId, { stage });
}
