import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  if (error) throw error;
  const isAdmin = (data ?? []).some((r: { role: string }) => r.role === "admin");
  if (!isAdmin) throw new Error("Forbidden");
}

export const getMyRole = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    if (error) throw error;
    const roles = (data ?? []).map((r) => r.role);
    return { userId: context.userId, roles, isAdmin: roles.includes("admin") };
  });

export const getAdminOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("orders")
      .select("id, status, total_lei, subtotal_lei, shipping_method, payment_method, address_snapshot, notes, created_at, user_id")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw error;
    return { orders: data ?? [] };
  });

export const getAdminProducts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("products")
      .select("id, name, slug, price_lei, category, section, active, images, sort_order, updated_at")
      .order("sort_order", { ascending: true });
    if (error) throw error;
    return { products: data ?? [] };
  });

export const getAdminDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [ordersRes, productsRes, usersRes] = await Promise.all([
      supabaseAdmin.from("orders").select("id, status, total_lei, created_at").order("created_at", { ascending: false }),
      supabaseAdmin.from("products").select("id, active"),
      supabaseAdmin.from("profiles").select("id"),
    ]);
    if (ordersRes.error) throw ordersRes.error;
    if (productsRes.error) throw productsRes.error;

    const orders = ordersRes.data ?? [];
    const now = Date.now();
    const MS_30D = 30 * 24 * 3600 * 1000;
    const recent = orders.filter((o) => now - new Date(o.created_at).getTime() < MS_30D);
    const revenue30d = recent.reduce((s, o) => s + Number(o.total_lei ?? 0), 0);

    return {
      stats: {
        ordersTotal: orders.length,
        ordersOpen: orders.filter((o) => ["new", "processing", "paid", "Nouă", "Procesare"].includes(String(o.status))).length,
        revenue30d,
        ordersCount30d: recent.length,
        productsTotal: productsRes.data?.length ?? 0,
        productsActive: (productsRes.data ?? []).filter((p) => p.active).length,
        usersTotal: usersRes.data?.length ?? 0,
      },
      recentOrders: orders.slice(0, 10),
    };
  });
