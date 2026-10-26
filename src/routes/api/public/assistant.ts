import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { createOpenAI } from "@ai-sdk/openai";
import { streamText, tool, stepCountIs, type ModelMessage } from "ai";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import {
  createLovableAiGatewayRunIdFetch,
  getLovableAiGatewayRunId,
} from "@/lib/ai/gateway.server";

/**
 * POST /api/public/assistant — the artisan's voice/text agent.
 * Reads her live demonstration data, answers in her language, carries out
 * multi-turn tasks (adding a product: asks for each detail, fills it in,
 * publishes it, then opens it for the photo), and can move her to another
 * screen by itself. The model, prompt and tools stay server-side; the browser
 * streams the spoken audio separately through /api/public/tts.
 */

const GATEWAY = "https://ai.gateway.lovable.dev";
const MODEL = "openai/gpt-6-astra";

const MAX_HISTORY = 12; // clamp in code; not a schema bound
const MAX_TEXT_CHARS = 1000;

const LANG_NAME: Record<string, string> = {
  en: "English",
  hi: "Hindi (Devanagari script)",
  mr: "Marathi (मराठी, Devanagari script)",
};

const CATEGORIES = [
  "Baskets & Bags",
  "Home & Storage",
  "Textiles & Table",
  "Paintings & Wall Art",
  "Clay & Terracotta",
  "Toys & Little Things",
];

const DRAFT_FIELDS = ["name", "description", "price", "category"] as const;

interface OrderRow {
  id: string;
  customer_reference: string;
  quantity: number | null;
  status: string;
  expected_dispatch_at: string | null;
  created_at: string;
  products: { name: string; price: number | null; category: string } | null;
}

interface EventRow {
  order_id: string;
  event_type: string;
  note: string | null;
  created_at: string;
}

interface PaymentRow {
  id: string;
  order_id: string | null;
  direction: string;
  amount: string | number | null;
  status: string;
  created_at: string;
  note: string | null;
}

interface ProductRow {
  id: string;
  name: string;
  price: number | null;
  category: string;
  availability: boolean;
  created_at: string;
}

interface DraftRow {
  name: string | null;
  description: string | null;
  price: number | string | null;
  category: string | null;
}

interface ArtisanContext {
  artisanId: string;
  artisan: {
    name: string;
    craft: string;
    shg: { name: string; region: string; upi_id: string | null } | null;
  };
  orders: OrderRow[];
  products: ProductRow[];
  events: EventRow[];
  payments: PaymentRow[];
  tipsTotal: number;
}

function publishableClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      // Opaque sb_ keys are not JWTs; send only apikey.
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

async function loadArtisanContext(artisanId: string): Promise<ArtisanContext | null> {
  const sb = publishableClient();

  const { data: artisanRow } = await sb
    .from("artisans")
    .select("id, name, craft, shgs(name, region, upi_id)")
    .eq("id", artisanId)
    .maybeSingle();
  if (!artisanRow) return null;

  const { data: assignmentRows } = await sb
    .from("order_assignments")
    .select("order_id")
    .eq("artisan_id", artisanId);
  const orderIds = [...new Set((assignmentRows ?? []).map((a) => a.order_id))];

  const [ordersRes, productsRes, eventsRes, payRes, payoutRes, tipRes] = await Promise.all([
    orderIds.length
      ? sb
          .from("orders")
          .select(
            "id, customer_reference, quantity, status, expected_dispatch_at, created_at, products(name, price, category)",
          )
          .in("id", orderIds)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] as unknown[] }),
    sb
      .from("products")
      .select("id, name, price, category, availability, created_at")
      .eq("artisan_id", artisanId)
      .order("created_at", { ascending: false }),
    orderIds.length
      ? sb
          .from("order_events")
          .select("order_id, event_type, note, created_at")
          .in("order_id", orderIds)
          .order("created_at", { ascending: true })
      : Promise.resolve({ data: [] as unknown[] }),
    orderIds.length
      ? sb
          .from("payments")
          .select("id, order_id, direction, amount, status, created_at, note")
          .in("order_id", orderIds)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] as unknown[] }),
    sb
      .from("payments")
      .select("id, order_id, direction, amount, status, created_at, note")
      .eq("artisan_id", artisanId)
      .order("created_at", { ascending: false }),
    sb.from("tips").select("amount").eq("artisan_id", artisanId),
  ]);

  const shgRaw = (
    artisanRow as unknown as { shgs: { name: string; region: string; upi_id: string | null } | null }
  ).shgs;
  return {
    artisanId,
    artisan: { name: artisanRow.name, craft: artisanRow.craft, shg: shgRaw ?? null },
    orders: (ordersRes.data ?? []) as unknown as OrderRow[],
    products: (productsRes.data ?? []) as unknown as ProductRow[],
    events: (eventsRes.data ?? []) as unknown as EventRow[],
    payments: [
      ...((payRes.data ?? []) as unknown as PaymentRow[]),
      ...((payoutRes.data ?? []) as unknown as PaymentRow[]),
    ],
    tipsTotal: (tipRes.data ?? []).reduce((s, t) => s + Number(t.amount), 0),
  };
}

function compactContext(ctx: ArtisanContext): string {
  return JSON.stringify({
    artisan: ctx.artisan,
    tips_total_rupees: ctx.tipsTotal,
    orders: ctx.orders.map((o) => ({
      ref: o.customer_reference,
      product: o.products?.name ?? "",
      price_rupees: o.products?.price ?? null,
      quantity: o.quantity,
      status: o.status,
      expected_dispatch: o.expected_dispatch_at,
      placed: o.created_at,
    })),
    her_products: ctx.products.map((p) => ({
      id: p.id,
      name: p.name,
      price_rupees: p.price,
      category: p.category,
      available: p.availability,
      launched: p.created_at,
    })),
    order_events: ctx.events.map((e) => ({
      order: ctx.orders.find((o) => o.id === e.order_id)?.customer_reference ?? e.order_id,
      type: e.event_type,
      note: e.note,
      at: e.created_at,
    })),
    payments: ctx.payments.map((p) => ({
      order: p.order_id ? (ctx.orders.find((o) => o.id === p.order_id)?.customer_reference ?? null) : null,
      direction: p.direction,
      amount_rupees: Number(p.amount ?? 0),
      status: p.status,
      at: p.created_at,
    })),
  });
}

function systemPrompt(ctx: ArtisanContext, lang: string): string {
  const language = LANG_NAME[lang] ?? "English";
  return [
    "You are Kalaswar Sahayak — the voice agent inside the Kalaswar app, speaking with a woman artisan.",
    `Her name is ${ctx.artisan.name}. She makes ${ctx.artisan.craft}.`,
    ctx.artisan.shg
      ? `Her self-help group is ${ctx.artisan.shg.name} (${ctx.artisan.shg.region}).`
      : "",
    "",
    "ALWAYS answer in this language: " + language + ". Use only very simple words and short sentences,",
    "as if speaking to someone holding a phone, possibly for the first time. Be warm and encouraging.",
    "Money is in Indian rupees (₹).",
    "",
    "RULES:",
    "- Use the tools to read her live data. Never invent order numbers, dates or amounts.",
    "- If something shows zero, say it plainly and gently.",
    "- When she asks about anything on another screen, call navigate_to first, then tell her what she",
    "  will now see and what to do next.",
    "- Keep normal answers under four short sentences unless she asks for detail.",
    "- This is a demonstration environment with sample records. Never claim a real payment was made.",
    "",
    "TASK — ADDING A PRODUCT (she may say 'I want to add this', 'list a new piece', etc.):",
    "1. THIS IS A CONVERSATION FIRST. Do NOT call navigate_to or upload_product until the piece is",
    "   published — she is talking to you here, not looking at forms. Ask for ONE detail at a time,",
    "   and after each answer call save_product_field, then confirm aloud what you wrote, then ask",
    "   the next question.",
    "2. Collect in this order: name → price (in rupees, just the number) → category (offer this list:",
    "   " + CATEGORIES.join(", ") + ") → a one-line description.",
    "3. Check progress any time with get_product_draft.",
    "4. As soon as name, price and category are known, call submit_product. Tell her the piece is now",
    "   visible in the marketplace. ONLY THEN call navigate_to with screen edit_product and the",
    "   product_id you received, and guide her: 'Now tap the picture button, take a photo of your",
    "   work, and press save.' Photographs are the one thing she must do herself.",
    "5. If she corrects a detail, save_product_field again with the same field.",
    "",
    "She may also ask about her earlier shipments (use get_order_timeline with the reference) or her",
    "products (get_my_products).",
    "",
    "HER LIVE DATA (source of truth):",
    compactContext(ctx),
  ]
    .filter(Boolean)
    .join("\n");
}

interface NavigateAction {
  screen: string;
  productId: string | null;
}

interface AssistantBody {
  artisanId?: string;
  lang?: string;
  text?: string;
  history?: { role: string; content: string }[] | null;
}

export const Route = createFileRoute("/api/public/assistant")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: AssistantBody;
        try {
          body = (await request.json()) as AssistantBody;
        } catch {
          return Response.json({ error: "Invalid request." }, { status: 400 });
        }

        const artisanId = (body.artisanId ?? "").trim();
        const userText = (body.text ?? "").slice(0, MAX_TEXT_CHARS).trim();
        const lang = LANG_NAME[body.lang ?? ""] ? (body.lang as string) : "en";
        if (!artisanId || !userText) {
          return Response.json({ error: "Missing artisan or question." }, { status: 400 });
        }

        const ctx = await loadArtisanContext(artisanId);
        if (!ctx) return Response.json({ error: "Artisan not found." }, { status: 404 });

        const history: ModelMessage[] = (body.history ?? [])
          .slice(-MAX_HISTORY)
          .filter((m) => m.role === "user" || m.role === "assistant")
          .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

        let navigate: NavigateAction | null = null;
        let lastToolError: string | null = null;
        const sb = publishableClient();

        const runIdFetch = createLovableAiGatewayRunIdFetch(getLovableAiGatewayRunId(request));
        const apiKey = process.env["LOVABLE_API_KEY"]!;
        const provider = createOpenAI({
          baseURL: `${GATEWAY}/v1`,
          apiKey,
          headers: {
            "Lovable-API-Key": apiKey,
            "X-Lovable-AIG-SDK": "vercel-ai-sdk",
          },
          fetch: runIdFetch.fetch,
        });

        try {
          const result = streamText({
            model: provider.responses(MODEL) as unknown as Parameters<typeof streamText>[0]["model"],
            system: systemPrompt(ctx, lang),
            messages: [...history, { role: "user", content: userText }],
            abortSignal: request.signal,
            stopWhen: stepCountIs(12),
            providerOptions: {
              openai: {
                store: false,
                forceReasoning: true,
                reasoningEffort: "low",
                reasoningSummary: "auto",
                include: ["reasoning.encrypted_content"],
              },
            },
            tools: {
              get_my_orders: tool({
                description: "Read this artisan's orders with product, quantity, status and expected dispatch date.",
                inputSchema: z.object({}).strict(),
                execute: async () => ({
                  orders: ctx.orders.map((o) => ({
                    ref: o.customer_reference,
                    product: o.products?.name ?? "",
                    quantity: o.quantity ?? 1,
                    status: o.status,
                    expected_dispatch: o.expected_dispatch_at,
                  })),
                }),
              }),
              get_my_products: tool({
                description: "Read the products this artisan has published, with price, category and launch date.",
                inputSchema: z.object({}).strict(),
                execute: async () => ({
                  products: ctx.products.map((p) => ({
                    id: p.id,
                    name: p.name,
                    price_rupees: p.price,
                    category: p.category,
                    available: p.availability,
                    launched: p.created_at,
                  })),
                }),
              }),
              get_my_earnings: tool({
                description: "Read this artisan's recorded earnings: tips and the value of delivered orders.",
                inputSchema: z.object({}).strict(),
                execute: async () => {
                  const deliveredValue = ctx.orders
                    .filter((o) => o.status === "delivered")
                    .reduce((s, o) => s + Number(o.products?.price ?? 0) * (o.quantity || 1), 0);
                  return { tips_rupees: ctx.tipsTotal, delivered_value_rupees: deliveredValue };
                },
              }),
              get_my_payments: tool({
                description:
                  "Read payments connected to this artisan: customer payments for her orders and payouts to her.",
                inputSchema: z.object({}).strict(),
                execute: async () => ({
                  payments: ctx.payments.map((p) => ({
                    direction: p.direction,
                    amount_rupees: Number(p.amount ?? 0),
                    status: p.status,
                    at: p.created_at,
                    note: p.note,
                  })),
                }),
              }),
              get_order_timeline: tool({
                description: "Read every recorded step of one order, by its reference (for example KSW-1042).",
                inputSchema: z.object({ order_ref: z.string() }),
                execute: async ({ order_ref }) => {
                  const ref = order_ref.trim().toLowerCase();
                  const order = ctx.orders.find((o) => o.customer_reference.toLowerCase() === ref);
                  if (!order) return { found: false, events: [] };
                  return {
                    found: true,
                    events: ctx.events
                      .filter((e) => e.order_id === order.id)
                      .map((e) => ({ type: e.event_type, note: e.note, at: e.created_at })),
                  };
                },
              }),
              get_product_draft: tool({
                description: "Read the product details collected so far for the add-a-product task.",
                inputSchema: z.object({}).strict(),
                execute: async () => {
                  const { data } = await sb
                    .from("product_drafts")
                    .select("name, description, price, category")
                    .eq("artisan_id", ctx.artisanId)
                    .maybeSingle();
                  const draft = (data ?? {}) as DraftRow;
                  return {
                    name: draft.name ?? null,
                    description: draft.description ?? null,
                    price_rupees: draft.price == null ? null : Number(draft.price),
                    category: draft.category ?? null,
                  };
                },
              }),
              save_product_field: tool({
                description:
                  "Write one product detail she just spoke. field is one of: name, description, price, category.",
                inputSchema: z.object({ field: z.string(), value: z.string() }),
                execute: async ({ field, value }) => {
                  if (!(DRAFT_FIELDS as readonly string[]).includes(field)) {
                    lastToolError = `Unknown product field ${field}`;
                    return { ok: false };
                  }
                  let clean = value.trim();
                  if (field === "price") {
                    const num = Number(clean.replace(/[^0-9.]/g, ""));
                    if (!Number.isFinite(num) || num <= 0) {
                      return { ok: false, error: "price must be a number" };
                    }
                    clean = String(num);
                  }
                  const patch: Record<string, string> = { [field]: clean };
                  const { error } = await sb.from("product_drafts").upsert(
                    { artisan_id: ctx.artisanId, ...patch },
                    { onConflict: "artisan_id" },
                  );
                  if (error) {
                    lastToolError = error.message;
                    return { ok: false };
                  }
                  return { ok: true, field, value: clean };
                },
              }),
              submit_product: tool({
                description:
                  "Publish the product from the collected details. Needs name, price and category saved first.",
                inputSchema: z.object({}).strict(),
                execute: async () => {
                  const { data: draftData } = await sb
                    .from("product_drafts")
                    .select("name, description, price, category")
                    .eq("artisan_id", ctx.artisanId)
                    .maybeSingle();
                  const draft = (draftData ?? {}) as DraftRow;
                  if (!draft.name || draft.price == null || !draft.category) {
                    return {
                      ok: false,
                      missing: [
                        !draft.name ? "name" : null,
                        draft.price == null ? "price" : null,
                        !draft.category ? "category" : null,
                      ].filter(Boolean),
                    };
                  }
                  const { data: created, error } = await sb
                    .from("products")
                    .insert({
                      artisan_id: ctx.artisanId,
                      name: draft.name,
                      description: draft.description ?? "",
                      category: draft.category,
                      price: Number(draft.price),
                      availability: true,
                      image_url: null,
                      image_public_id: null,
                    })
                    .select("id")
                    .single();
                  if (error || !created) {
                    lastToolError = error?.message ?? "could not publish";
                    return { ok: false };
                  }
                  await sb.from("product_drafts").delete().eq("artisan_id", ctx.artisanId);
                  return { ok: true, product_id: created.id, name: draft.name };
                },
              }),
              navigate_to: tool({
                description:
                  "Move the artisan to another screen. Screens: orders, earnings, payments, upload_product, edit_product (send product_id), help, marketplace, profile.",
                inputSchema: z.object({ screen: z.string(), product_id: z.string().nullable() }),
                execute: async ({ screen, product_id }) => {
                  const allowed = [
                    "orders",
                    "earnings",
                    "payments",
                    "upload_product",
                    "edit_product",
                    "help",
                    "marketplace",
                    "profile",
                  ];
                  if (!allowed.includes(screen)) {
                    lastToolError = `Unknown screen ${screen}`;
                    return { ok: false };
                  }
                  navigate = { screen, productId: product_id ?? null };
                  return { ok: true, screen };
                },
              }),
            },
          });

          const reply = (await result.text).trim();
          if (!reply) return Response.json({ error: "The assistant gave no answer." }, { status: 502 });
          return Response.json({ reply, navigate });
        } catch (error) {
          if (lastToolError) return Response.json({ error: lastToolError }, { status: 400 });
          const message = error instanceof Error ? error.message : "Assistant failed.";
          const status = /abort/i.test(message) ? 499 : 502;
          return Response.json({ error: message }, { status });
        }
      },
    },
  },
});
