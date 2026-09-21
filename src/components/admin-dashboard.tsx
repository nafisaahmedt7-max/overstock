"use client";

import { FormEvent, ReactNode, useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { StatusConnectionGuide } from "./status-connection-guide";
import { JOURNEY, journeyLabel, JourneyStatus, OrderTimeline } from "./order-timeline";

type Seller = {
  id: string;
  seller_code: string;
  display_name: string;
  email: string | null;
  commission_percent: number;
  status: string;
};
type Product = {
  id: string;
  sku: string;
  name: string;
  ownership: string;
  seller_id: string | null;
  price: number;
  stock_quantity: number;
  status: string;
  sizes: string[];
  image_url: string | null;
  description: string | null;
  audience: string | null;
  category: string | null;
  brand: string | null;
  color: string | null;
  condition: string | null;
};
type FinanceLine = {
  order_id: string;
  seller_id: string | null;
  ownership: string;
  gross_amount: number | null;
  platform_fee: number | null;
  seller_due: number | null;
  payout_status: string;
  fulfillment_fee: number | null;
  fulfillment_payment_status: string;
};
type Order = {
  id: string;
  order_number: number;
  customer_name: string;
  total: number;
  subtotal: number;
  delivery_fee: number;
  customer_email: string | null;
  customer_phone: string | null;
  delivery_address: string | null;
  sales_channel: string;
  status: string;
  placed_at: string;
  journey_status: JourneyStatus;
  journey_timestamps: Record<string, string>;
  cancellation_requested_at: string | null;
  cancellation_requested_by_role: string | null;
  cancellation_request_reason: string | null;
};
type Partner = { id: string; name: string; warehouse_address: string | null };
type Shipment = {
  id: string;
  order_id: string;
  shipment_number: number;
  status: string;
  fulfillment_partner_id: string | null;
  recipient_name: string;
  courier: string | null;
  tracking_number: string | null;
};
type Tab = "overview" | "sellers" | "products" | "orders" | "fulfilment";

export function AdminDashboard({ email }: { email: string }) {
  const [tab, setTab] = useState<Tab>("overview"),
    [sellers, setSellers] = useState<Seller[]>([]),
    [products, setProducts] = useState<Product[]>([]),
    [orders, setOrders] = useState<Order[]>([]),
    [partners, setPartners] = useState<Partner[]>([]),
    [shipments, setShipments] = useState<Shipment[]>([]),
    [finance, setFinance] = useState<FinanceLine[]>([]),
    [imagePreview, setImagePreview] = useState<string | null>(null),
    [imageFileName, setImageFileName] = useState(""),
    [mobileNavOpen, setMobileNavOpen] = useState(false),
    [orderProductId, setOrderProductId] = useState(""),
    [editingSeller, setEditingSeller] = useState<Seller | null>(null),
    [deletingSeller, setDeletingSeller] = useState<Seller | null>(null),
    [editing, setEditing] = useState<Product | null>(null),
    [deleting, setDeleting] = useState<Product | null>(null),
    [notice, setNotice] = useState("");
  const [supabase] = useState(createClient);
  const router = useRouter();
  const load = useCallback(async () => {
    const [s, p, o, fp, os, fin] = await Promise.all([
      supabase
        .from("sellers")
        .select("id,seller_code,display_name,email,commission_percent,status")
        .order("created_at", { ascending: false }),
      supabase
        .from("products")
        .select(
          "id,sku,name,ownership,seller_id,price,stock_quantity,status,sizes,image_url,description,audience,category,brand,color,condition",
        )
        .order("created_at", { ascending: false }),
      supabase
        .from("orders")
        .select(
          "id,order_number,customer_name,customer_email,customer_phone,delivery_address,subtotal,delivery_fee,total,sales_channel,status,placed_at,journey_status,journey_timestamps,cancellation_requested_at,cancellation_requested_by_role,cancellation_request_reason",
        )
        .order("placed_at", { ascending: false }),
      supabase
        .from("fulfillment_partners")
        .select("id,name,warehouse_address")
        .order("created_at", { ascending: false }),
      supabase
        .from("outbound_shipments")
        .select(
          "id,order_id,shipment_number,status,fulfillment_partner_id,recipient_name,courier,tracking_number",
        )
        .order("created_at", { ascending: false }),
      supabase
        .from("order_items")
        .select("order_id,seller_id,ownership,gross_amount,platform_fee,seller_due,payout_status,fulfillment_fee,fulfillment_payment_status"),
    ]);
    if (s.error || p.error || o.error)
      setNotice(
        s.error?.message ||
          p.error?.message ||
          o.error?.message ||
          "Could not load data",
      );
    setSellers(s.data ?? []);
    setProducts(p.data ?? []);
    setOrders(o.data ?? []);
    setPartners(fp.data ?? []);
    setShipments(os.data ?? []);
    setFinance(fin.data ?? []);
  }, [supabase]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function validateImage(file: File) {
    if (file.size > 10 * 1024 * 1024)
      throw new Error("Image must be under 10 MB.");
    if (
      file.type !== "image/webp"
    )
      throw new Error("Use a WebP image only. Convert the file first, then upload it.");
    const dimensions = await new Promise<{ width: number; height: number }>(
      (resolve, reject) => {
        const img = new window.Image();
        img.onload = () => resolve({ width: img.width, height: img.height });
        img.onerror = () => reject(new Error("Image could not be read."));
        img.src = URL.createObjectURL(file);
      },
    );
    const ratio = dimensions.width / dimensions.height;
    if (Math.abs(ratio - 0.8) > 0.08)
      throw new Error("Use a 4:5 image. Recommended size: 1600 × 2000 px.");
  }
  async function chooseImage(file?: File) {
    if (!file) {
      setImagePreview(null);
      setImageFileName("");
      return;
    }
    try {
      await validateImage(file);
      setImagePreview(URL.createObjectURL(file));
      setImageFileName(file.name);
      setNotice("Image approved: 4:5 ratio and under 10 MB.");
    } catch (error) {
      setImagePreview(null);
      setImageFileName("");
      setNotice(error instanceof Error ? error.message : "Invalid image.");
    }
  }

  async function addSeller(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const { error } = await supabase.from("sellers").insert({
      seller_code: String(f.get("code")).toUpperCase(),
      display_name: String(f.get("name")),
      email: String(f.get("email")).toLowerCase(),
      commission_percent: Number(f.get("commission")),
    });
    setNotice(
      error?.message ||
        "Seller added. They can now use the partner login with this email.",
    );
    if (!error) {
      e.currentTarget.reset();
      await load();
    }
  }
  async function addPartner(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const { data: partner, error } = await supabase
      .from("fulfillment_partners")
      .insert({
        name: String(f.get("name")).trim(),
        warehouse_address: String(f.get("address")).trim(),
      })
      .select("id")
      .single();
    if (error || !partner) {
      setNotice(error?.message || "Could not add team member.");
      return;
    }
    const invite = await supabase.from("fulfillment_invites").insert({
      email: String(f.get("email")).trim().toLowerCase(),
      partner_id: partner.id,
    });
    setNotice(invite.error?.message || "Fulfilment team member added. No orders were assigned automatically.");
    if (!invite.error) {
      form.reset();
      await load();
    }
  }
  async function saveSeller(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editingSeller) return;
    const f = new FormData(e.currentTarget);
    const { error } = await supabase
      .from("sellers")
      .update({
        seller_code: String(f.get("code")).toUpperCase(),
        display_name: String(f.get("name")),
        email: String(f.get("email")).toLowerCase(),
        commission_percent: Number(f.get("commission")),
        status: String(f.get("status")),
      })
      .eq("id", editingSeller.id);
    setNotice(error?.message || "Seller updated.");
    if (!error) {
      setEditingSeller(null);
      await load();
    }
  }
  async function removeSeller() {
    if (!deletingSeller) return;
    const { error } = await supabase
      .from("sellers")
      .delete()
      .eq("id", deletingSeller.id);
    setNotice(
      error
        ? "This seller has connected products or orders. Edit the seller and set them to ARCHIVED instead."
        : "Seller deleted.",
    );
    if (!error) {
      setDeletingSeller(null);
      await load();
    }
  }
  async function addProduct(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget,
      f = new FormData(form),
      seller = String(f.get("seller")),
      name = String(f.get("name")),
      sku = String(f.get("sku")).toUpperCase(),
      sizes = String(f.get("sizes") || "")
        .split(",")
        .map((x) => x.trim().toUpperCase())
        .filter(Boolean);
    if (sizes.includes("X")) {
      setNotice(
        "X is not a valid size. Use XS, S, M, L, XL, a number, or ONE SIZE.",
      );
      return;
    }
    const image = f.get("image");
    if (image instanceof File && image.size) {
      try {
        await validateImage(image);
      } catch (error) {
        setNotice(error instanceof Error ? error.message : "Invalid image.");
        return;
      }
    }
    const { data: productId, error } = await supabase.rpc(
      "admin_create_product",
      {
        payload: {
          sku,
          slug: `${name
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, "")}-${Date.now().toString(36)}`,
          name,
          description: String(f.get("description") || ""),
          audience: String(f.get("audience")),
          category: String(f.get("category")),
          brand: String(f.get("brand") || ""),
          color: String(f.get("color") || ""),
          condition: String(f.get("condition") || ""),
          sizes,
          price: Number(f.get("price")),
          stock_quantity: 1,
          ownership: seller ? "seller" : "own_stock",
          seller_id: seller || null,
        },
      },
    );
    if (error || !productId) {
      setNotice(error?.message || "Could not add product.");
      return;
    }
    if (image instanceof File && image.size) {
      const ext = image.name.split(".").pop()?.toLowerCase() || "jpg",
        path = `${productId}/${crypto.randomUUID()}.${ext}`;
      const upload = await supabase.storage
        .from("product-images")
        .upload(path, image, { upsert: false });
      if (upload.error) {
        setNotice(`Product saved, image failed: ${upload.error.message}`);
      } else {
        const url = supabase.storage.from("product-images").getPublicUrl(path)
          .data.publicUrl;
        await Promise.all([
          supabase.from("product_images").insert({
            product_id: productId,
            storage_path: path,
            alt_text: name,
          }),
          supabase.rpc("admin_update_product_image", {
            target_product_id: productId,
            target_image_url: url,
          }),
        ]);
        setNotice("Product and image added as draft.");
      }
    } else setNotice("Product added as draft.");
    form.reset();
    setImagePreview(null);
    setImageFileName("");
    await load();
  }

  async function saveProduct(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editing) return;
    const f = new FormData(e.currentTarget);
    const seller = String(f.get("seller"));
    const sizes = String(f.get("sizes"))
      .split(",")
      .map((x) => x.trim().toUpperCase())
      .filter(Boolean);
    if (sizes.includes("X")) {
      setNotice(
        "X is not a valid size. Use XS, S, M, L, XL, a number, or ONE SIZE.",
      );
      return;
    }
    const replacementImage = f.get("image");
    if (replacementImage instanceof File && replacementImage.size) {
      try { await validateImage(replacementImage); }
      catch (error) { setNotice(error instanceof Error ? error.message : "Invalid image."); return; }
    }
    const { error } = await supabase.rpc("admin_update_product", {
      target_product_id: editing.id,
      payload: {
        name: String(f.get("name")),
        description: String(f.get("description")),
        audience: String(f.get("audience")),
        category: String(f.get("category")),
        brand: String(f.get("brand")),
        color: String(f.get("color")),
        condition: String(f.get("condition")),
        sizes,
        price: Number(f.get("price")),
        stock_quantity: 1,
        ownership: seller ? "seller" : "own_stock",
        seller_id: seller || null,
        status: String(f.get("status")),
      },
    });
    setNotice(error?.message || "Product updated.");
    if (!error) {
      if (replacementImage instanceof File && replacementImage.size) {
        const ext = replacementImage.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `${editing.id}/${crypto.randomUUID()}.${ext}`;
        const upload = await supabase.storage.from("product-images").upload(path, replacementImage);
        if (upload.error) { setNotice(`Product updated, image failed: ${upload.error.message}`); return; }
        const url = supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl;
        await supabase.rpc("admin_update_product_image", { target_product_id: editing.id, target_image_url: url });
      }
      setEditing(null);
      await load();
    }
  }
  async function removeProduct() {
    if (!deleting) return;
    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", deleting.id);
    setNotice(error?.message || "Product removed.");
    if (!error) {
      setDeleting(null);
      await load();
    }
  }
  async function addOrder(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget,
      f = new FormData(form),
      product = products.find((p) => p.id === String(f.get("product"))),
      qty = Number(f.get("quantity")),
      totalPaid = Number(
        String(f.get("total_paid") || "0")
          .trim()
          .replace(",", "."),
      );
    if (!product) {
      setNotice("Choose a product.");
      return;
    }
    if (!Number.isInteger(qty) || qty < 1) {
      setNotice("Quantity must be a whole number of 1 or more.");
      return;
    }
    if (!Number.isFinite(totalPaid) || totalPaid <= 0) {
      setNotice("Enter the total amount paid by the customer, such as 120.00.");
      return;
    }
    const { error } = await supabase.rpc("admin_create_manual_order", { payload: {
      customer_name: String(f.get("customer")), customer_phone: String(f.get("phone") || ""),
      customer_email: String(f.get("email") || ""), delivery_address: String(f.get("address") || ""),
      product_id: product.id, selected_size: String(f.get("size") || ""), quantity: qty,
      unit_price: totalPaid / qty, delivery_fee: 0, internal_notes: ""
    }});
    if (error) {
      setNotice(error?.message || "Could not create order.");
      return;
    }
    setNotice("Order created and assigned to the correct seller automatically.");
    form.reset();
    setOrderProductId("");
    await load();
  }
  async function clearAllOrders() {
    if (!orders.length) {
      setNotice("There are no orders to remove.");
      return;
    }
    if (!window.confirm("Remove every existing order and its order items? This cannot be undone.")) return;
    const { error } = await supabase.from("orders").delete().in("id", orders.map((order) => order.id));
    setNotice(error?.message || "All previous orders were removed. Create the two sample completed orders next.");
    if (!error) await load();
  }
  async function advanceOrder(id: string, status: JourneyStatus) {
    const { error } = await supabase.rpc("advance_order_journey", {
      target_order_id: id, target_status: status, note: "Admin update",
    });
    setNotice(error?.message || "Shared journey updated for every role.");
    if (!error) await load();
  }
  async function updateSellerPayment(orderId: string, payoutStatus: string) {
    const { error } = await supabase
      .from("order_items")
      .update({ payout_status: payoutStatus })
      .eq("order_id", orderId)
      .not("seller_id", "is", null);
    setNotice(error?.message || "Seller payment record updated.");
    if (!error) await load();
  }
  async function updateFulfillmentPayment(orderId: string, paymentStatus: string) {
    const { error } = await supabase
      .from("order_items")
      .update({ fulfillment_payment_status: paymentStatus })
      .eq("order_id", orderId);
    setNotice(error?.message || "Fulfilment payment record updated.");
    if (!error) await load();
  }
  async function clearCancellationRequest(orderId: string) {
    const { error } = await supabase.rpc("resolve_cancellation_request", {
      target_order_id: orderId,
      approve_cancellation: false,
    });
    setNotice(error?.message || "Cancellation request dismissed.");
    if (!error) await load();
  }
  async function approveCancellation(orderId: string) {
    if (!window.confirm("Confirm cancellation of this order? This is the final admin approval.")) return;
    const { error } = await supabase.rpc("resolve_cancellation_request", {
      target_order_id: orderId,
      approve_cancellation: true,
    });
    setNotice(error?.message || "Order cancelled by admin confirmation.");
    if (!error) await load();
  }
  async function assignOrder(orderId: string, partnerId: string) {
    if (!partnerId) return;
    const { error } = await supabase.rpc("assign_fulfillment_team", {
      target_order_id: orderId,
      target_partner_id: partnerId,
    });
    setNotice(error?.message || "Team assigned. Status changed to Awaiting Package.");
    if (!error) await load();
  }
  async function signOut() {
    await supabase.auth.signOut();
    router.push("/portal/login");
    router.refresh();
  }
  const money = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(n);
  const totalSales = orders
    .filter((order) => order.journey_status !== "cancelled")
    .reduce((n, order) => n + Number(order.total || 0), 0);
  const activeFinance = finance.filter((line) => {
    const order = orders.find((item) => item.id === line.order_id);
    return order?.journey_status !== "cancelled";
  });
  const sellerSales = activeFinance
    .filter((x) => x.ownership === "seller")
    .reduce((n, x) => n + Number(x.gross_amount || 0), 0);
  const sellerDue = activeFinance
    .filter((x) => x.ownership === "seller" && x.payout_status === "due")
    .reduce((n, x) => n + Number(x.seller_due || 0), 0);
  const sellerPaid = activeFinance
    .filter((x) => x.ownership === "seller" && x.payout_status === "paid")
    .reduce((n, x) => n + Number(x.seller_due || 0), 0);
  const fulfillmentDue = activeFinance
    .filter((x) => x.fulfillment_payment_status === "due")
    .reduce((n, x) => n + Number(x.fulfillment_fee || 0), 0);
  const fulfillmentPaid = activeFinance
    .filter((x) => x.fulfillment_payment_status === "paid")
    .reduce((n, x) => n + Number(x.fulfillment_fee || 0), 0);
  const sellerShare = sellerDue + sellerPaid;
  const fulfilmentCost = fulfillmentDue + fulfillmentPaid;
  // Every customer dollar lives in exactly one overview segment. "Due" and
  // "Paid" only show whether that seller/fulfilment segment is settled yet.
  const overstockSales = Math.max(0, totalSales - sellerShare - fulfilmentCost);
  const chartTotal = totalSales || 1;
  const overstockEnd = (overstockSales / chartTotal) * 100;
  const sellerDueEnd = overstockEnd + (sellerDue / chartTotal) * 100;
  const sellerPaidEnd = sellerDueEnd + (sellerPaid / chartTotal) * 100;
  const fulfillmentDueEnd = sellerPaidEnd + (fulfillmentDue / chartTotal) * 100;
  return (
    <main className="admin-shell">
      <aside className={`admin-sidebar${mobileNavOpen ? " mobile-open" : ""}`}>
        <div>
          <span><strong>OVERSTOCK</strong><small>INTERNAL OPERATIONS</small></span>
          <button className="admin-sidebar-toggle" type="button" aria-expanded={mobileNavOpen} onClick={() => setMobileNavOpen((open) => !open)}>{mobileNavOpen ? "CLOSE" : "MENU"}</button>
        </div>
        <nav>
          {(
            ["overview", "sellers", "products", "orders", "fulfilment"] as Tab[]
          ).map((x) => (
            <button
              key={x}
              className={tab === x ? "active" : ""}
              onClick={() => { setTab(x); setMobileNavOpen(false); }}
            >
              {x.toUpperCase()}
            </button>
          ))}
        </nav>
        <button onClick={signOut}>SIGN OUT</button>
      </aside>
      <section className="admin-content">
        <header>
          <div>
            <p className="eyebrow">PRIVATE OPERATIONS</p>
            <h1>{tab.toUpperCase()}</h1>
          </div>
          <small>{email}</small>
        </header>
        {notice && (
          <button className="admin-notice" onClick={() => setNotice("")}>
            {notice} ×
          </button>
        )}
        {tab === "overview" && (
          <>
            <div className="finance-overview">
              <div
                className="balance-chart"
                style={{
                  background: `conic-gradient(#1d73d2 0 ${overstockEnd}%, #7651a8 ${overstockEnd}% ${sellerDueEnd}%, #a98bd2 ${sellerDueEnd}% ${sellerPaidEnd}%, #d49b4a ${sellerPaidEnd}% ${fulfillmentDueEnd}%, #2f7d42 ${fulfillmentDueEnd}% 100%)`,
                }}
                aria-label="Customer payments split between OVERSTOCK, seller share, and fixed fulfilment costs"
              >
                <span>
                  {money(totalSales)}
                  <small>TOTAL SALES</small>
                </span>
              </div>
              <div className="balance-list">
                <article>
                  <span data-balance="total">TOTAL SALES</span>
                  <b>{money(totalSales)}</b>
                </article>
                <article>
                  <span data-balance="own">SELLER ORDER SALES</span>
                  <b>{money(sellerSales)}</b>
                </article>
                <article>
                  <span data-balance="seller">SELLER SHARE TOTAL</span>
                  <b>{money(sellerShare)}</b>
                </article>
                <article>
                  <span data-balance="due">SELLER DUE</span>
                  <b>{money(sellerDue)}</b>
                </article>
                <article>
                  <span data-balance="paid">SELLER PAID</span>
                  <b>{money(sellerPaid)}</b>
                </article>
                <article>
                  <span data-balance="fulfillment-due">FULFILMENT DUE</span>
                  <b>{money(fulfillmentDue)}</b>
                </article>
                <article>
                  <span data-balance="fulfillment-paid">FULFILMENT PAID</span>
                  <b>{money(fulfillmentPaid)}</b>
                </article>
                <article>
                  <span data-balance="overstock">OVERSTOCK SALES</span>
                  <b>{money(overstockSales)}</b>
                </article>
              </div>
            </div>
            <details className="admin-help-dropdown money-guide">
              <summary>HOW THE OVERVIEW IS CALCULATED</summary>
              <div>
                <p><b>TOTAL SALES</b> — the entire amount paid by customers.</p>
                <p><b>SELLER SHARE TOTAL</b> — the amount owed to sellers from seller-stock orders. It moves from Seller Due to Seller Paid, but is never counted twice.</p>
                <p><b>FULFILMENT COST</b> — the fixed per-item fulfilment fee. It moves from Fulfilment Due to Fulfilment Paid, but is never counted twice.</p>
                <p><b>OVERSTOCK SALES</b> — Total Sales minus the seller share and fulfilment cost. The pie always adds back up to Total Sales.</p>
              </div>
            </details>
            <div className="admin-stats">
              <article>
                <span>SELLERS</span>
                <b>{sellers.length}</b>
              </article>
              <article>
                <span>PRODUCTS</span>
                <b>{products.length}</b>
              </article>
              <article>
                <span>ORDERS</span>
                <b>{orders.length}</b>
              </article>
              <article>
                <span>SELLER STOCK</span>
                <b>{products.filter((p) => p.ownership === "seller").length}</b>
              </article>
            </div>
            <StatusConnectionGuide role="admin-orders" title="ORDER STATUS DICTIONARY" />
            <details className="status-guide collapsible-guide legacy-status-guide">
              <summary>ALL STATUS EXPLANATIONS</summary>
              <p className="eyebrow">SHARED WORKFLOW</p>
              <h2>STATUS DICTIONARY</h2>
              <p className="guide-intro">
                Everyone reads the same live status. Each role can only update
                the stages assigned to them; admin can verify and correct all
                records.
              </p>
              <div className="status-table-wrap">
                <table className="status-table">
                  <thead>
                    <tr>
                      <th>STATUS</th>
                      <th>WHAT IT MEANS</th>
                      <th>ADMIN VIEW</th>
                      <th>SELLER VIEW</th>
                      <th>FULFILMENT VIEW</th>
                      <th>CONTROLLED BY</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>DRAFT</td>
                      <td>
                        Product is being prepared and is hidden from customers.
                      </td>
                      <td>Review or edit</td>
                      <td>Not published</td>
                      <td>Not relevant</td>
                      <td>Admin</td>
                    </tr>
                    <tr>
                      <td>ACTIVE</td>
                      <td>Product is approved and visible in the shop.</td>
                      <td>Live product</td>
                      <td>Approved product</td>
                      <td>Not relevant</td>
                      <td>Admin</td>
                    </tr>
                    <tr>
                      <td>AWAITING SELLER</td>
                      <td>
                        An order exists and the seller must confirm the item.
                      </td>
                      <td>Waiting for seller</td>
                      <td>Action required</td>
                      <td>Waiting; read only</td>
                      <td>Seller</td>
                    </tr>
                    <tr>
                      <td>SELLER CONFIRMED</td>
                      <td>The seller confirms the item can be supplied.</td>
                      <td>Confirmed</td>
                      <td>Prepare parcel</td>
                      <td>Expected inbound</td>
                      <td>Seller</td>
                    </tr>
                    <tr>
                      <td>INBOUND TRANSIT</td>
                      <td>The seller parcel is travelling to OVERSTOCK.</td>
                      <td>See inbound tracking</td>
                      <td>See own tracking</td>
                      <td>Track incoming parcel</td>
                      <td>Seller</td>
                    </tr>
                    <tr>
                      <td>RECEIVED</td>
                      <td>
                        Your internal team physically received the seller
                        parcel.
                      </td>
                      <td>Verified received</td>
                      <td>Received by OVERSTOCK</td>
                      <td>Begin inspection</td>
                      <td>Fulfilment</td>
                    </tr>
                    <tr>
                      <td>QC HOLD</td>
                      <td>
                        The item has a quality issue that needs a decision.
                      </td>
                      <td>Review issue</td>
                      <td>Quality issue visible</td>
                      <td>Record and hold</td>
                      <td>Fulfilment + Admin</td>
                    </tr>
                    <tr>
                      <td>QC PASSED</td>
                      <td>The item passed inspection.</td>
                      <td>Ready for dispatch flow</td>
                      <td>Inspection passed</td>
                      <td>Prepare customer parcel</td>
                      <td>Fulfilment</td>
                    </tr>
                    <tr>
                      <td>READY TO PACK</td>
                      <td>The customer shipment can be packed.</td>
                      <td>Awaiting packing</td>
                      <td>Order progressing</td>
                      <td>Action required</td>
                      <td>Fulfilment</td>
                    </tr>
                    <tr>
                      <td>PACKED</td>
                      <td>
                        The customer parcel is sealed and ready for courier
                        pickup.
                      </td>
                      <td>Packed</td>
                      <td>Order progressing</td>
                      <td>Add outbound courier</td>
                      <td>Fulfilment</td>
                    </tr>
                    <tr>
                      <td>SHIPPED</td>
                      <td>
                        The parcel is travelling from OVERSTOCK to the customer.
                      </td>
                      <td>See customer tracking</td>
                      <td>Order dispatched</td>
                      <td>Monitor delivery</td>
                      <td>Fulfilment</td>
                    </tr>
                    <tr>
                      <td>DELIVERED</td>
                      <td>The customer received the parcel.</td>
                      <td>Complete order</td>
                      <td>Sale delivered</td>
                      <td>Delivery complete</td>
                      <td>Fulfilment</td>
                    </tr>
                    <tr>
                      <td>CANCELLED</td>
                      <td>The order was stopped before completion.</td>
                      <td>Resolve stock and money</td>
                      <td>Outcome visible</td>
                      <td>Stop shipment</td>
                      <td>Admin</td>
                    </tr>
                    <tr>
                      <td>UNPAID / PAID / REFUNDED</td>
                      <td>
                        Customer payment record. Stripe will automate this
                        later.
                      </td>
                      <td>Manage payment</td>
                      <td>Relevant outcome only</td>
                      <td>Not editable</td>
                      <td>Admin</td>
                    </tr>
                    <tr>
                      <td>PAYOUT DUE / PAID</td>
                      <td>Money owed or already settled with the seller.</td>
                      <td>Approve settlement</td>
                      <td>See own balance</td>
                      <td>Not visible</td>
                      <td>Admin</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </details>
          </>
        )}
        {tab === "sellers" && (
          <>
            <details className="admin-help-dropdown">
              <summary>SELLER STATUS EXPLANATIONS</summary>
              <div>
                <p><b>ACTIVE</b> — Seller can sign in and view their assigned orders.</p>
                <p><b>INACTIVE</b> — Seller access is paused but their records remain saved.</p>
                <p><b>ARCHIVED</b> — Seller is retained for order history and no longer used for new products.</p>
                <p><b>SELLER SHARE</b> — The agreed percentage of each connected product sale paid to that seller. OVERSTOCK retains the remainder for platform and fulfilment fees.</p>
                <p><b>PAYMENT DUE</b> — The seller share has been created and has not been paid yet.</p>
                <p><b>PAID</b> — The seller share has been settled.</p>
                <p><b>REFUND REQUESTED</b> — A paid seller order was cancelled and admin must recover that seller payment.</p>
              </div>
            </details>
            <form className="admin-form seller-entry-form" onSubmit={addSeller}>
              <label><span>SELLER CODE</span><input name="code" placeholder="EXAMPLE: SEL-001" pattern="[A-Za-z0-9_-]{3,32}" required /></label>
              <label><span>SELLER NAME</span><input name="name" placeholder="EXAMPLE: VANTA" required /></label>
              <label><span>LOGIN EMAIL</span><input name="email" type="email" placeholder="seller@example.com" required /></label>
              <label className="percent-field">
                <span>SELLER SHARE</span>
                <span className="percent-input">
                  <input
                    name="commission"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    defaultValue="20"
                    placeholder="20%"
                    aria-label="Seller payout share percentage"
                    required
                  />
                </span>
              </label>
              <button>ADD SELLER</button>
            </form>
            <DataTable
              headings={["CODE", "SELLER", "EMAIL", "SELLER SHARE", "PAYMENT DUE", "PAID", "STATUS", "ACTIONS"]}
              rows={sellers.map((s) => [
                s.seller_code,
                s.display_name,
                s.email || "—",
                `${s.commission_percent}%`,
                money(finance.filter((line) => line.seller_id === s.id && line.payout_status !== "paid").reduce((sum, line) => sum + Number(line.seller_due || 0), 0)),
                money(finance.filter((line) => line.seller_id === s.id && line.payout_status === "paid").reduce((sum, line) => sum + Number(line.seller_due || 0), 0)),
                <span className="status-badge" data-status={s.status} key={`${s.id}-status`}>{s.status.toUpperCase()}</span>,
                <span className="table-actions" key={`${s.id}-actions`}>
                  <button onClick={() => setEditingSeller(s)}>EDIT</button>
                  <button onClick={() => setDeletingSeller(s)}>REMOVE</button>
                </span>,
              ])}
            />
            {editingSeller && (
              <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Edit seller">
                <form className="edit-panel seller-edit-panel" onSubmit={saveSeller}>
                  <header><h2>EDIT SELLER</h2><button type="button" onClick={() => setEditingSeller(null)}>CLOSE</button></header>
                  <label className="edit-field edit-field-wide"><span>SELLER NAME</span><input name="name" placeholder="EXAMPLE: VANTA" defaultValue={editingSeller.display_name} required /></label>
                  <label className="edit-field edit-field-wide"><span>LOGIN EMAIL</span><input name="email" type="email" placeholder="seller@example.com" defaultValue={editingSeller.email || ""} required /></label>
                  <div className="edit-grid">
                    <label className="edit-field"><span>SELLER CODE</span><input name="code" placeholder="EXAMPLE: SEL-001" defaultValue={editingSeller.seller_code} required /></label>
                    <label className="edit-field"><span>SELLER SHARE</span><span className="percent-input"><input name="commission" type="number" min="0" max="100" step="0.01" placeholder="EXAMPLE: 20" defaultValue={editingSeller.commission_percent} required /></span></label>
                    <label className="edit-field edit-field-wide"><span>ACCOUNT STATUS</span><select name="status" defaultValue={editingSeller.status}><option value="active">ACTIVE — CAN SIGN IN</option><option value="inactive">INACTIVE — ACCESS PAUSED</option><option value="archived">ARCHIVED — HISTORY ONLY</option></select></label>
                  </div>
                  <button className="admin-primary">SAVE SELLER</button>
                </form>
              </div>
            )}
            {deletingSeller && (
              <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Delete seller">
                <section className="confirm-panel">
                  <p className="eyebrow">CONFIRM REMOVAL</p><h2>REMOVE {deletingSeller.display_name}</h2>
                  <p>This permanently removes a seller only when they have no connected products or orders. Otherwise, edit the seller and set their status to archived.</p>
                  <div><button onClick={() => setDeletingSeller(null)}>CANCEL</button><button className="danger-button" onClick={() => void removeSeller()}>REMOVE SELLER</button></div>
                </section>
              </div>
            )}
          </>
        )}
        {tab === "products" && (
          <>
            <details className="admin-help-dropdown">
              <summary>PRODUCT STATUS EXPLANATIONS</summary>
              <div>
                <p><b>DRAFT</b> — Product is saved but hidden from the shop.</p>
                <p><b>ACTIVE</b> — Product is approved and visible to customers.</p>
                <p><b>SOLD OUT</b> — Product remains recorded but cannot be purchased.</p>
                <p><b>ARCHIVED</b> — Product is removed from the catalogue without deleting its history.</p>
              </div>
            </details>
            <form className="admin-form product-form" onSubmit={addProduct}>
              <input name="sku" placeholder="SKU (3–24 LETTERS / NUMBERS / -)" pattern="[A-Za-z0-9-]{3,24}" title="Use 3 to 24 letters, numbers, or hyphens." required />
              <input name="name" placeholder="PRODUCT NAME (3–80 CHARACTERS)" minLength={3} maxLength={80} required />
              <input name="brand" placeholder="BRAND" maxLength={40} />
              <input name="color" placeholder="COLOR" maxLength={40} />
              <input name="condition" placeholder="CONDITION: NEW / LIKE NEW / PRE-OWNED" minLength={3} maxLength={40} required />
              <select name="audience" required>
                <option value="">MEN / WOMEN</option>
                <option value="men">MEN</option>
                <option value="women">WOMEN</option>
                <option value="unisex">UNISEX</option>
              </select>
              <select name="category" required>
                <option value="">APPAREL TYPE</option>
                <option value="tops">TOPS</option>
                <option value="bottoms">BOTTOMS</option>
                <option value="accessories">ACCESSORIES</option>
              </select>
              <textarea
                name="description"
                placeholder="PRODUCT DESCRIPTION"
                required
              />
              <input
                name="sizes"
                placeholder="SIZES: XS, S, M, L, XL"
                required
              />
              <input
                name="price"
                type="number"
                min="0"
                step="0.01"
                placeholder="PRICE (USD)"
                required
              />
              <select name="seller">
                <option value="">OWN STOCK</option>
                {sellers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.display_name}
                  </option>
                ))}
              </select>
              <label className="image-upload-field" htmlFor="product-image">
                <span>PRODUCT IMAGE</span>
                <input
                  id="product-image"
                  name="image"
                  type="file"
                  accept="image/webp"
                  onChange={(e) => void chooseImage(e.target.files?.[0])}
                />
                <span className="image-file-name">
                  {imageFileName || "NO IMAGE SELECTED"}
                </span>
                <b>CHOOSE FILE</b>
              </label>
              <button>ADD DRAFT</button>
            </form>
            <p className="form-help">
              Images must be 4:5 WebP files and no larger than 10 MB. Recommended: 1600 × 2000 px. Need to remove a background or convert? Use <a href="https://www.remove.bg/" target="_blank" rel="noreferrer">remove.bg</a> first.
            </p>
            {imagePreview && (
              <div className="image-preview">
                <Image
                  src={imagePreview}
                  alt="Product upload preview"
                  fill
                  unoptimized
                />
              </div>
            )}
            <DataTable
              headings={[
                "IMAGE",
                "SKU",
                "PRODUCT",
                "SIZES",
                "TAG",
                "OWNER",
                "PRICE",
                "STATUS",
                "ACTIONS",
              ]}
              rows={products.map((p) => [
                p.image_url ? "UPLOADED" : "—",
                p.sku,
                p.name,
                p.sizes.join(", "),
                `${(p.audience || "—").toUpperCase()} / ${(p.category || "—").toUpperCase()}`,
                p.ownership === "seller"
                  ? sellers.find((s) => s.id === p.seller_id)?.display_name ||
                    "Seller"
                  : "OVERSTOCK",
                money(p.price),
                <span
                  className="status-badge"
                  data-status={p.status}
                  key={p.id}
                >
                  {p.status.replaceAll("_", " ").toUpperCase()}
                </span>,
                <div className="table-actions" key={p.id}>
                  <button onClick={() => setEditing(p)}>EDIT</button>
                  <button onClick={() => setDeleting(p)}>REMOVE</button>
                </div>,
              ])}
            />
            {editing && (
              <div className="modal-backdrop">
                <form className="edit-panel" onSubmit={saveProduct}>
                  <header>
                    <h2>EDIT PRODUCT</h2>
                    <button type="button" onClick={() => setEditing(null)}>
                      CLOSE
                    </button>
                  </header>
                  <label className="edit-field edit-field-wide">
                    <span>PRODUCT NAME</span>
                    <input name="name" defaultValue={editing.name} required />
                  </label>
                  <label className="edit-field edit-field-wide">
                    <span>PRODUCT DESCRIPTION</span>
                    <textarea
                      name="description"
                      defaultValue={editing.description || ""}
                      required
                    />
                  </label>
                  <label className="image-upload-field edit-field-wide">
                    <span>REPLACE PRODUCT IMAGE (OPTIONAL)</span>
                    <input name="image" type="file" accept="image/png,image/jpeg,image/webp,image/avif" />
                    <b>CHOOSE IMAGE</b>
                  </label>
                  <div className="edit-grid">
                    <label className="edit-field">
                      <span>BRAND</span>
                      <input name="brand" defaultValue={editing.brand || ""} />
                    </label>
                    <label className="edit-field">
                      <span>COLOUR</span>
                      <input name="color" defaultValue={editing.color || ""} />
                    </label>
                    <label className="edit-field">
                      <span>CONDITION</span>
                      <input
                        name="condition"
                        defaultValue={editing.condition || ""}
                      />
                    </label>
                    <label className="edit-field">
                      <span>AUDIENCE</span>
                      <select
                        name="audience"
                        defaultValue={editing.audience || "unisex"}
                      >
                        <option value="men">MEN</option>
                        <option value="women">WOMEN</option>
                        <option value="unisex">UNISEX</option>
                      </select>
                    </label>
                    <label className="edit-field">
                      <span>APPAREL TYPE</span>
                      <select
                        name="category"
                        defaultValue={editing.category || "tops"}
                      >
                        <option value="tops">TOPS</option>
                        <option value="bottoms">BOTTOMS</option>
                        <option value="accessories">ACCESSORIES</option>
                      </select>
                    </label>
                    <label className="edit-field">
                      <span>SIZES</span>
                      <input
                        name="sizes"
                        defaultValue={editing.sizes.join(", ")}
                        required
                      />
                    </label>
                    <label className="edit-field">
                      <span>PRICE (USD)</span>
                      <input
                        name="price"
                        type="number"
                        step=".01"
                        min="0"
                        defaultValue={editing.price}
                        required
                      />
                    </label>
                    <label className="edit-field">
                      <span>PRODUCT OWNER</span>
                      <select
                        name="seller"
                        defaultValue={editing.seller_id || ""}
                      >
                        <option value="">OWN STOCK</option>
                        {sellers.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.display_name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="edit-field">
                      <span>PUBLICATION STATUS</span>
                      <select name="status" defaultValue={editing.status}>
                        <option value="draft">DRAFT</option>
                        <option value="active">ACTIVE / APPROVED</option>
                        <option value="sold_out">SOLD OUT</option>
                        <option value="archived">ARCHIVED</option>
                      </select>
                    </label>
                  </div>
                  <div className="edit-actions">
                    <button type="button" onClick={() => setEditing(null)}>
                      CANCEL
                    </button>
                    <button className="admin-primary">SAVE CHANGES</button>
                  </div>
                </form>
              </div>
            )}
            {deleting && (
              <div className="modal-backdrop">
                <section className="confirm-panel">
                  <h2>REMOVE {deleting.name}?</h2>
                  <p>
                    This is only allowed when the product has no protected order
                    history.
                  </p>
                  <div>
                    <button onClick={() => setDeleting(null)}>CANCEL</button>
                    <button
                      className="danger-button"
                      onClick={() => void removeProduct()}
                    >
                      REMOVE PRODUCT
                    </button>
                  </div>
                </section>
              </div>
            )}
          </>
        )}
        {tab === "orders" && (
          <>
            <section className="order-reset-panel">
              <div><p className="eyebrow">SAMPLE DATA</p><h2>START THE ORDER LIST FRESH</h2><p>Remove old test orders before adding the one or two completed examples you want to keep in the overview.</p></div>
              <button className="danger-action" type="button" onClick={() => void clearAllOrders()}>REMOVE ALL ORDERS</button>
            </section>
            <StatusConnectionGuide role="admin-orders" title="FULL ORDER STATUS DICTIONARY" />
            <section className="order-entry-panel">
              <header>
                <div><p className="eyebrow">NEW ORDER</p><h2>RECORD A CUSTOMER SALE</h2></div>
              </header>
              <form className="order-entry-form" onSubmit={addOrder}>
                <label><span>CUSTOMER NAME</span><input name="customer" placeholder="EXAMPLE: JANE SMITH" required /></label>
                <label><span>EMAIL</span><input name="email" type="email" placeholder="jane@example.com" /></label>
                <label><span>PHONE</span><input name="phone" placeholder="EXAMPLE: +1 415 555 0123" /></label>
                <label className="order-field-wide"><span>DELIVERY ADDRESS</span><input name="address" placeholder="EXAMPLE: 100 MARKET ST, SAN FRANCISCO, CA 94105" /></label>
                <label className="order-field-wide"><span>PRODUCT</span><select name="product" value={orderProductId} onChange={(e) => setOrderProductId(e.target.value)} required>
                  <option value="">CHOOSE PRODUCT</option>
                  {products.map((p) => <option key={p.id} value={p.id}>{p.name} / {p.sku} / {money(p.price)}</option>)}
                </select></label>
                <label><span>SIZE</span><select name="size" required disabled={!orderProductId}>
                  <option value="">CHOOSE SIZE</option>
                  {(products.find((p) => p.id === orderProductId)?.sizes || []).map((size) => <option key={size} value={size}>{size}</option>)}
                </select></label>
                <label><span>QUANTITY</span><select name="quantity" required defaultValue="">
                  <option value="" disabled>CHOOSE</option>
                  {Array.from({ length: 10 }, (_, index) => index + 1).map((quantity) => <option key={quantity} value={quantity}>{quantity}</option>)}
                </select></label>
                <label><span>TOTAL PAID (USD)</span><input name="total_paid" type="text" inputMode="decimal" pattern="[0-9]+([.,][0-9]{1,2})?" placeholder="EXAMPLE: 120.00" required /></label>
                <button>CREATE ORDER</button>
              </form>
            </section>
            <div className="order-card-list admin-orders">
              {orders.map((o) => {
                const sellerFinance = finance.find((line) => line.order_id === o.id && line.seller_id);
                const orderFinance = finance.find((line) => line.order_id === o.id);
                const sellerPayment = sellerFinance?.payout_status === "paid" ? "paid" : sellerFinance?.payout_status === "held" ? "held" : "due";
                return <details className="order-card order-receipt-details" key={o.id}>
                  <summary>
                    <span><small>ORDER</small><b>#{o.order_number}</b></span>
                    <label className="order-summary-status"><small>CURRENT STATUS</small><select className="order-summary-status-select" value={o.journey_status} data-status={o.journey_status} aria-label={`Order ${o.order_number} status`} onClick={(event) => event.stopPropagation()} onChange={(e) => { const next = e.target.value as JourneyStatus; if (next !== "cancelled" || window.confirm("Cancel this order? Only admin can perform this action.")) void advanceOrder(o.id, next); }}>{JOURNEY.map(([value, label]) => <option key={value} value={value}>{label.toUpperCase()}</option>)}<option value="cancelled">CANCELLED</option></select></label>
                  </summary>
                  <div className="order-receipt-body">
                  <header>
                    <div><p className="eyebrow">ORDER #{o.order_number}</p><h2>{o.customer_name}</h2><small>{new Date(o.placed_at).toLocaleDateString("en-US")} / {(o.sales_channel || "website").toUpperCase()}</small></div>
                    <div className="order-payment-controls">
                      {sellerFinance ? <label className="payment-control"><span>SELLER PAYMENT</span><select data-status={sellerPayment} value={sellerPayment} onChange={(e) => void updateSellerPayment(o.id, e.target.value)}><option value="due">PAYMENT DUE</option><option value="paid">PAID</option><option value="held">REFUND REQUESTED</option></select></label> : <div className="payment-control"><span>SELLER PAYMENT</span><b>OWN INVENTORY — NOT APPLICABLE</b></div>}
                      {orderFinance && <label className="payment-control"><span>FULFILMENT PAYMENT</span><select data-status={orderFinance.fulfillment_payment_status} value={orderFinance.fulfillment_payment_status} onChange={(e) => void updateFulfillmentPayment(o.id, e.target.value)}><option value="due">PAYMENT DUE</option><option value="paid">PAID</option></select></label>}
                    </div>
                  </header>
                  {o.cancellation_requested_at && o.journey_status !== "cancelled" && <section className="cancellation-request">
                    <div><span>CANCELLATION REQUEST</span><b>{(o.cancellation_requested_by_role || "TEAM").toUpperCase()} REQUESTED ADMIN REVIEW</b><small>{o.cancellation_request_reason || "No reason added."}</small></div>
                    <div><button onClick={() => void clearCancellationRequest(o.id)}>KEEP ORDER</button><button className="danger-action" onClick={() => void approveCancellation(o.id)}>CONFIRM CANCELLATION</button></div>
                  </section>}
                  <div className="order-summary-grid order-receipt">
                    <div><span>ORDER VALUE</span><b>{money(o.subtotal)}</b></div>
                    <div><span>CUSTOMER TOTAL</span><b>{money(o.total)}</b></div>
                    <div><span>EMAIL</span><b>{o.customer_email || "NOT ADDED"}</b></div>
                    <div><span>PHONE</span><b>{o.customer_phone || "NOT ADDED"}</b></div>
                    <div className="order-summary-wide"><span>DELIVERY ADDRESS</span><b>{o.delivery_address || "NOT ADDED"}</b></div>
                  </div>
                  <section className="order-confirmation-control">
                    <div><span>ADMIN CONFIRMATION</span><b>{o.journey_status === "order_placed" ? "NEW ORDER — REVIEW REQUIRED" : journeyLabel(o.journey_status)}</b></div>
                    {o.journey_status === "order_placed" ? <button className="admin-action" onClick={() => void advanceOrder(o.id, "admin_confirmed")}>CONFIRM ORDER</button> : <span className="status-badge" data-status="admin_confirmed">ORDER CONFIRMED</span>}
                  </section>
                  <OrderTimeline status={o.journey_status} timestamps={o.journey_timestamps} />
                  </div>
                </details>;
              })}
            </div>
          </>
        )}
        {tab === "fulfilment" && (
          <>
            <StatusConnectionGuide
              role="admin-fulfilment"
              title="PACKAGE AND SHIPMENT CONNECTIONS"
            />
            <section className="team-member-panel">
              <header><p className="eyebrow">TEAM SETUP</p><h2>FULFILMENT TEAM MEMBER</h2><p>Add the person first; the assignment queue below is where you connect them to an order.</p></header>
              <form className="admin-form fulfilment-account-form" onSubmit={addPartner}>
                <label><span>TEAM MEMBER NAME</span><input name="name" placeholder="EXAMPLE: RAHIM" required /></label>
                <label><span>LOGIN EMAIL</span><input name="email" type="email" placeholder="rahim@example.com" required /></label>
                <label><span>ADDRESS</span><input name="address" placeholder="EXAMPLE: WAREHOUSE OR WORK ADDRESS" required /></label>
                <div className="fulfilment-form-action"><button>ADD TEAM MEMBER</button></div>
              </form>
            </section>
            <section className="assignment-queue">
              <header>
                <p className="eyebrow">ADMIN ACTION</p>
                <h2>ASSIGN ORDERS TO FULFILMENT</h2>
                <p>Orders appear here after the seller marks Package Sent to Fulfilment.</p>
              </header>
              {orders.filter((order) => ["sent_to_fulfillment", "awaiting_package"].includes(order.journey_status)).length === 0 ? (
                <div className="empty-state">NO ORDERS ARE READY TO ASSIGN</div>
              ) : orders.filter((order) => ["sent_to_fulfillment", "awaiting_package"].includes(order.journey_status)).map((order) => {
                const shipment = shipments.find((item) => item.order_id === order.id);
                const assignedPartnerId = order.journey_status === "awaiting_package" ? shipment?.fulfillment_partner_id || "" : "";
                return <article key={order.id}>
                  <div>
                    <span>ORDER #{order.order_number}</span>
                    <b>{order.customer_name}</b>
                    <small className="status-badge" data-status={order.journey_status}>{journeyLabel(order.journey_status)}</small>
                  </div>
                  <label className="package-assignment-control">
                    <span>{assignedPartnerId ? "ASSIGNED TEAM MEMBER" : "SELECT ONE TEAM MEMBER — ADMIN ACTION REQUIRED"}</span>
                    <select value={assignedPartnerId} onChange={(e) => void assignOrder(order.id, e.target.value)}>
                      <option value="">SELECT TEAM MEMBER</option>
                      {partners.map((partner) => <option key={partner.id} value={partner.id}>{partner.name}</option>)}
                    </select>
                  </label>
                </article>;
              })}
            </section>
            <h2>FULFILMENT ORDER TIMELINES</h2>
            <div className="fulfilment-timeline-list">
              {shipments.map((shipment) => (
                <article className="order-card" key={shipment.id}>
                  {(() => { const order = orders.find((item) => item.id === shipment.order_id); return order ? <>
                    <header><div><p className="eyebrow">ORDER #{order.order_number}</p><h2>{shipment.recipient_name}</h2><small>{shipment.courier || "COURIER NOT SET"} / {shipment.tracking_number || "TRACKING NOT SET"}</small></div><span className="status-badge" data-status={order.journey_status}>{journeyLabel(order.journey_status)}</span></header>
                    <OrderTimeline status={order.journey_status} timestamps={order.journey_timestamps} />
                  </> : null; })()}
                </article>
              ))}
            </div>
          </>
        )}{" "}
      </section>
    </main>
  );
}

function DataTable({
  headings,
  rows,
}: {
  headings: string[];
  rows: ReactNode[][];
}) {
  return (
    <div className="admin-table-wrap">
      <table>
        <thead>
          <tr>
            {headings.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((r, i) => (
              <tr key={i}>
                {r.map((v, j) => (
                  <td key={j}>{v}</td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={headings.length}>NO RECORDS YET</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
