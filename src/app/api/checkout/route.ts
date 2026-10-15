import { createClient } from "@supabase/supabase-js";
import { getUsdRates } from "@/lib/exchange-rates";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

type CartLine = { slug: string; size: string; quantity: number };
type CheckoutBody = {
  items: CartLine[];
  buyerCurrency?: string;
  customer: { name: string; email: string; phone: string; address: string };
};

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function POST(request: Request) {
  const accessToken = process.env.SQUARE_ACCESS_TOKEN;
  const locationId = process.env.SQUARE_LOCATION_ID;
  const environment = process.env.SQUARE_ENVIRONMENT || "sandbox";
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!accessToken || !locationId || !supabaseUrl || !serviceRoleKey) {
    const missingConfiguration: string[] = [];
    if (!accessToken) missingConfiguration.push("SQUARE_ACCESS_TOKEN");
    if (!locationId) missingConfiguration.push("SQUARE_LOCATION_ID");
    if (!supabaseUrl) missingConfiguration.push("NEXT_PUBLIC_SUPABASE_URL");
    if (!serviceRoleKey) missingConfiguration.push("SUPABASE_SERVICE_ROLE_KEY");
    return jsonError(
      "Checkout is not configured yet. Missing: " + missingConfiguration.join(", ") + ".",
      503,
    );
  }
  if (environment !== "sandbox" && environment !== "production") {
    return jsonError("Square environment is invalid.", 503);
  }

  const sb = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const limit = await checkRateLimit(sb, request, "checkout", 10, 600);
  if (limit === "limited") return jsonError("Too many checkout attempts. Please try again in 10 minutes.", 429);
  if (limit === "unavailable") return jsonError("Checkout is temporarily unavailable. Please try again shortly.", 503);

  let body: CheckoutBody;
  try {
    body = (await request.json()) as CheckoutBody;
  } catch {
    return jsonError("Checkout details are invalid.", 400);
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return jsonError("Checkout details are invalid.", 400);
  }

  const name = body.customer?.name?.trim();
  const email = body.customer?.email?.trim().toLowerCase();
  const phone = body.customer?.phone?.trim();
  const address = body.customer?.address?.trim();
  const items = Array.isArray(body.items) ? body.items : [];
  if (!name || !email || !phone || !address || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return jsonError("Enter your name, email, phone, and delivery address.", 400);
  }
  if (!items.length || items.length > 20) return jsonError("Your cart is invalid.", 400);

  const quantities = new Map<string, { slug: string; size: string; quantity: number }>();
  for (const item of items) {
    if (
      typeof item.slug !== "string" ||
      typeof item.size !== "string" ||
      !Number.isInteger(item.quantity) ||
      item.quantity < 1 ||
      item.quantity > 10
    ) return jsonError("One or more cart items are invalid.", 400);
    const key = item.slug + "::" + item.size;
    const current = quantities.get(key);
    quantities.set(key, {
      slug: item.slug,
      size: item.size,
      quantity: (current?.quantity || 0) + item.quantity,
    });
  }

  const slugs = Array.from(new Set(Array.from(quantities.values(), (item) => item.slug)));
  const { data: products, error: productError } = await sb
    .from("products")
    .select("id,slug,name,sku,price,status,stock_quantity,sizes")
    .in("slug", slugs)
    .in("status", ["active", "sold_out"])
    .gt("stock_quantity", 0);
  if (productError || !products || products.length !== slugs.length) {
    return jsonError("A product in your cart is no longer available.", 409);
  }

  const bySlug = new Map(products.map((product) => [product.slug, product]));
  const requestedPerProduct = new Map<string, number>();
  for (const line of quantities.values()) {
    requestedPerProduct.set(
      line.slug,
      (requestedPerProduct.get(line.slug) || 0) + line.quantity,
    );
  }
  for (const line of quantities.values()) {
    const product = bySlug.get(line.slug);
    if (!product || !product.sizes.includes(line.size)) {
      return jsonError("A selected item or size is no longer available.", 409);
    }
    if ((requestedPerProduct.get(line.slug) || 0) > product.stock_quantity) {
      return jsonError("There is not enough stock for one of your items.", 409);
    }
  }

  let subtotalUsdCents = 0;
  const orderLines: Array<Record<string, unknown>> = [];
  for (const line of quantities.values()) {
    const product = bySlug.get(line.slug);
    if (!product) return jsonError("A product in your cart is no longer available.", 409);
    const unitPriceCents = Math.round(Number(product.price) * 100);
    subtotalUsdCents += unitPriceCents * line.quantity;
    orderLines.push({
      product_id: product.id,
      ownership: "own_stock",
      product_name: product.name,
      sku: product.sku,
      quantity: line.quantity,
      unit_price: unitPriceCents / 100,
      selected_size: line.size,
    });
  }
  if (subtotalUsdCents <= 0 || subtotalUsdCents > 500000) {
    return jsonError("The order total is outside the allowed range.", 400);
  }

  let rates: Record<string, number>;
  try {
    rates = await getUsdRates();
  } catch {
    return jsonError("We could not confirm the current exchange rate. Please try again.", 503);
  }
  const buyerCurrency = /^[A-Z]{3}$/.test(body.buyerCurrency || "")
    ? (body.buyerCurrency as string)
    : "USD";
  const usdToBuyer = rates[buyerCurrency] || 1;
  const amountAud = Math.round((subtotalUsdCents / 100) * rates.AUD * 100);
  const subtotalUsd = subtotalUsdCents / 100;
  const siteUrl = new URL(request.url).origin;

  const { data: order, error: orderError } = await sb
    .from("orders")
    .insert({
      customer_name: name,
      customer_email: email,
      customer_phone: phone,
      delivery_address: address,
      subtotal: subtotalUsd,
      delivery_fee: 0,
      status: "new",
      payment_status: "unpaid",
      sales_channel: "website",
      buyer_currency: buyerCurrency,
      fx_rate_usd_to_buyer: usdToBuyer,
      fx_rate_usd_to_aud: rates.AUD,
      payment_amount_aud: amountAud / 100,
    })
    .select("id,order_number")
    .single();
  if (orderError || !order) return jsonError("We could not create your order. Please try again.", 500);

  const { error: itemError } = await sb
    .from("order_items")
    .insert(Array.from(quantities.values()).map((line, index) => ({
      ...orderLines[index],
      order_id: order.id,
    })));
  if (itemError) {
    await sb.from("orders").update({ status: "cancelled" }).eq("id", order.id);
    return jsonError("We could not save your order items. Please try again.", 500);
  }

  const squareBase = environment === "production"
    ? "https://connect.squareup.com"
    : "https://connect.squareupsandbox.com";
  const squareResponse = await fetch(squareBase + "/v2/online-checkout/payment-links", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + accessToken,
      "Content-Type": "application/json",
      "Square-Version": "2026-09-16",
    },
    body: JSON.stringify({
      idempotency_key: crypto.randomUUID(),
      quick_pay: {
        name: "OVERSTOCK Order " + order.order_number,
        price_money: { amount: amountAud, currency: "AUD" },
        location_id: locationId,
      },
      checkout_options: {
        redirect_url: siteUrl + "/checkout/return?order=" + encodeURIComponent(String(order.order_number)),
      },
      pre_populated_data: { buyer_email: email },
      payment_note: "OVERSTOCK order " + order.order_number,
    }),
  });

  const squareResult = (await squareResponse.json()) as {
    errors?: Array<{ detail?: string }>;
    payment_link?: { id?: string; order_id?: string; url?: string };
  };
  const link = squareResult.payment_link;
  if (!squareResponse.ok || !link?.id || !link.order_id || !link.url) {
    await sb.from("orders").update({
      internal_notes: "Square checkout creation failed. Retry after configuration review.",
    }).eq("id", order.id);
    return jsonError(squareResult.errors?.[0]?.detail || "Square could not start checkout.", 502);
  }
  const { error: updateError } = await sb.from("orders").update({
    square_order_id: link.order_id,
    square_payment_link_id: link.id,
  }).eq("id", order.id);
  if (updateError) return jsonError("Square checkout started but order tracking failed. Contact support.", 500);

  return Response.json({
    checkoutUrl: link.url,
    amountAud: amountAud / 100,
    localAmount: (subtotalUsd * usdToBuyer).toFixed(2),
    buyerCurrency,
    orderNumber: order.order_number,
  });
}
