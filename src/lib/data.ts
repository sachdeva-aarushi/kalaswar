import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type {
  Artisan,
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

  const { data: tipsData, error: tipsError } = await supabase
    .from("tips")
    .select("*")
    .eq("artisan_id", artisanId)
    .order("created_at", { ascending: false });
  if (tipsError) throw new Error(tipsError.message);
  const tips = (tipsData ?? []) as Tip[];
  const tipsTotal = tips.reduce((s, t) => s + Number(t.amount), 0);

  // Value of delivered orders assigned to this artisan, read from product prices.
  const assignments = orders.filter((o) => o.status === "delivered");
  const deliveredValue = assignments.reduce(
    (s, o) => s + Number(o.product?.price ?? 0) * (o.quantity || 1),
    0,
  );

  return {
    counts,
    tipsTotal,
    deliveredValue,
    earnings: tipsTotal + deliveredValue,
    tips,
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
