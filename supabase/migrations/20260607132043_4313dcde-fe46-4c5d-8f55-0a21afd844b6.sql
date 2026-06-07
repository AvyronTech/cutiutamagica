
-- 1) has_role: ignore caller-supplied user_id, always use auth.uid()
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = _role
  )
$$;

-- 2) orders: enforce NOT NULL user_id and tighten INSERT policy
ALTER TABLE public.orders ALTER COLUMN user_id SET NOT NULL;

DROP POLICY IF EXISTS "Users create own orders" ON public.orders;
CREATE POLICY "Users create own orders"
ON public.orders
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- 3) promotions: remove public read; expose validation via SECURITY DEFINER function
DROP POLICY IF EXISTS "Public reads active promos" ON public.promotions;

CREATE OR REPLACE FUNCTION public.validate_promo_code(_code text)
RETURNS TABLE (
  valid boolean,
  type promo_type,
  value numeric,
  min_order_lei numeric,
  description text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    TRUE AS valid,
    p.type,
    p.value,
    p.min_order_lei,
    p.description
  FROM public.promotions p
  WHERE lower(p.code) = lower(_code)
    AND p.active = TRUE
    AND (p.starts_at IS NULL OR p.starts_at <= now())
    AND (p.ends_at IS NULL OR p.ends_at > now())
    AND (p.usage_limit IS NULL OR p.used_count < p.usage_limit)
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.validate_promo_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_promo_code(text) TO anon, authenticated;
