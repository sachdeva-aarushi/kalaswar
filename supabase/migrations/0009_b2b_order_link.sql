-- B2B Studio: mark order origin and link confirmed orders back to buyer requests.
-- Additive only; existing rows keep working with the defaults.
alter table public.orders add column source text not null default 'retail';
alter table public.orders add column buyer_request_id uuid references public.buyer_requests(id) on delete set null;

-- Backfill: custom concierge orders are identifiable by their proposal link.
update public.orders set source = 'concierge' where proposal_id is not null and source = 'retail';

comment on column public.orders.source is 'Order origin: retail (default), concierge custom orders, b2b confirmed quotations';
comment on column public.orders.buyer_request_id is 'For B2B orders: the buyer request the accepted quotation came from';

create index idx_orders_buyer_request on public.orders (buyer_request_id);
