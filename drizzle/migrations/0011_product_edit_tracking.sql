ALTER TABLE public.products ADD COLUMN updated_at timestamptz;
ALTER TABLE public.products ADD COLUMN updated_by text;
COMMENT ON COLUMN public.products.updated_at IS 'Last edit timestamp — edit actor/timestamp tracking (demonstration mode)';
COMMENT ON COLUMN public.products.updated_by IS 'Label of the last editor (demonstration mode; production should store the acting user id)';
UPDATE public.products SET updated_at = created_at WHERE updated_at IS NULL;