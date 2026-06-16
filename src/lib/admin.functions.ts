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

const STATUS_MAP_RO: Record<string, string> = {
  pending: "Nouă",
  processing: "Procesare",
  shipped: "Expediată",
  delivered: "Livrată",
  returned: "Returnată",
  cancelled: "Anulată",
  paid: "Procesare",
  new: "Nouă",
};

const SHIPPING_MAP: Record<string, string> = {
  easybox: "EasyBox",
  sameday: "Curier SameDay",
  fancourier: "Curier FanCourier",
  cargus: "Curier Cargus",
  dpd: "Curier DPD",
  pickup: "Ridicare personală",
  courier: "Curier SameDay",
};

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
      .select("id, status, total_lei, shipping_method, payment_method, address_snapshot, notes, created_at, user_id, order_items(product_name, qty)")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw error;

    const orders = (data ?? []).map((o: any, i: number) => {
      const addr = (o.address_snapshot ?? {}) as Record<string, any>;
      const items = (o.order_items ?? []) as { product_name: string; qty: number }[];
      const productsStr = items.length
        ? items.map((it) => `${it.product_name} x${it.qty}`).join(", ")
        : "—";
      const shortId = String(o.id).slice(0, 8).toUpperCase();
      const date = new Date(o.created_at).toISOString().slice(0, 10);
      return {
        id: o.id,
        orderNumber: `CM-${date.slice(0, 4)}-${String(i + 1).padStart(3, "0")} · ${shortId}`,
        platform: "Cutiuța Magică" as const,
        customer: addr.full_name || addr.name || addr.email || "Client",
        products: productsStr,
        total: Number(o.total_lei ?? 0),
        status: (STATUS_MAP_RO[String(o.status)] ?? "Nouă") as
          | "Nouă" | "Procesare" | "Expediată" | "Livrată" | "Returnată" | "Anulată",
        date,
        deliveryMethod: (SHIPPING_MAP[String(o.shipping_method)] ?? "Curier SameDay") as any,
        awb: undefined,
        phone: addr.phone ?? "",
        address: [addr.address_line1, addr.address_line2].filter(Boolean).join(", ") || addr.address || "",
        city: addr.city ?? "",
      };
    });

    return { orders };
  });

export const getAdminProducts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("products")
      .select("id, name, slug, price_lei, category, section, active, images, sort_order, description, updated_at")
      .order("sort_order", { ascending: true });
    if (error) throw error;

    const products = (data ?? []).map((p: any) => {
      const imgs = Array.isArray(p.images) ? p.images : [];
      const first = imgs[0];
      const imageUrl = typeof first === "string" ? first : first?.url ?? "";
      // Map DB category -> admin UI category bucket
      const sec = String(p.section ?? "").toLowerCase();
      let uiCat: "cutiute-muzicale" | "accesorii" | "servicii" = "accesorii";
      if (sec.includes("cutiu") || sec.includes("music")) uiCat = "cutiute-muzicale";
      else if (sec.includes("serv") || sec.includes("gravu")) uiCat = "servicii";

      return {
        id: String(p.id),
        slug: p.slug,
        name: p.name,
        description: p.description ?? "",
        price: Number(p.price_lei ?? 0),
        category: uiCat,
        status: (p.active ? "activ" : "inactiv") as "activ" | "inactiv" | "promovare",
        stock: 0,
        sales: 0,
        rating: 0,
        image: "📦",
        imageUrl,
        url: `https://cutiutamagica.eu/produs/${p.slug}`,
      };
    });

    return { products };
  });

export const getAdminDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [ordersRes, productsRes, usersRes] = await Promise.all([
      supabaseAdmin
        .from("orders")
        .select("id, status, total_lei, created_at, address_snapshot, order_items(product_name, qty)")
        .order("created_at", { ascending: false }),
      supabaseAdmin.from("products").select("id, active"),
      supabaseAdmin.from("profiles").select("id"),
    ]);
    if (ordersRes.error) throw ordersRes.error;
    if (productsRes.error) throw productsRes.error;

    const orders = ordersRes.data ?? [];
    const now = Date.now();
    const MS_30D = 30 * 24 * 3600 * 1000;
    const recent = orders.filter((o: any) => now - new Date(o.created_at).getTime() < MS_30D);
    const revenue30d = recent.reduce((s: number, o: any) => s + Number(o.total_lei ?? 0), 0);

    const recentOrders = orders.slice(0, 7).map((o: any) => {
      const addr = (o.address_snapshot ?? {}) as Record<string, any>;
      const items = (o.order_items ?? []) as { product_name: string; qty: number }[];
      return {
        id: o.id,
        customer: addr.full_name || addr.name || "Client",
        platform: "Cutiuța Magică",
        products: items.map((it) => `${it.product_name} x${it.qty}`).join(", ") || "—",
        total: Number(o.total_lei ?? 0),
        status: STATUS_MAP_RO[String(o.status)] ?? "Nouă",
      };
    });

    return {
      stats: {
        ordersTotal: orders.length,
        ordersOpen: orders.filter((o: any) =>
          ["pending", "processing", "paid", "new"].includes(String(o.status))
        ).length,
        revenue30d,
        ordersCount30d: recent.length,
        productsTotal: productsRes.data?.length ?? 0,
        productsActive: (productsRes.data ?? []).filter((p: any) => p.active).length,
        usersTotal: usersRes.data?.length ?? 0,
      },
      recentOrders,
    };
  });
