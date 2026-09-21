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
  cost_of_goods: number;
  inbound_delivery_fee: number;
  fulfillment_service_fee: number;
  gpo_fee_per_500g: number;
  weight_grams: number;
  overstock_profit_target: number;
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
  item_cost: number | null;
  seller_profit_amount: number | null;
  inbound_delivery_fee: number | null;
  fulfillment_service_fee: number | null;
  gpo_fee: number | null;
  seller_payout_total: number | null;
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
  refund_status: string;
  refund_amount: number;
  seller_refund_recovery_amount: number;
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
          "id,sku,name,ownership,seller_id,price,stock_quantity,status,sizes,image_url,description,audience,category,brand,color,condition,cost_of_goods,inbound_delivery_fee,fulfillment_service_fee,gpo_fee_per_500g,weight_grams,overstock_profit_target",
        )
        .order("created_at", { ascending: false }),
      supabase
        .from("orders")
        .select(
          "id,order_number,customer_name,customer_email,customer_phone,delivery_address,subtotal,delivery_fee,total,sales_channel,status,placed_at,journey_status,journey_timestamps,cancellation_requested_at,cancellation_requested_by_role,cancellation_request_reason,refund_status,refund_amount,seller_refund_recovery_amount",
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
        .select("order_id,seller_id,ownership,gross_amount,platform_fee,seller_due,payout_status,fulfillment_fee,fulfillment_payment_status,item_cost,seller_profit_amount,inbound_delivery_fee,fulfillment_service_fee,gpo_fee,seller_payout_total"),
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
          price: 0,
          cost_of_goods: Number(f.get("cost_of_goods")),
          inbound_delivery_fee: Number(f.get("inbound_delivery_fee") || 0),
          fulfillment_service_fee: Number(f.get("fulfillment_service_fee")),
          gpo_fee_per_500g: Number(f.get("gpo_fee_per_500g")),
          weight_grams: Number(f.get("weight_grams")),
          overstock_profit_target: Number(f.get("overstock_profit_target")),
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
        price: 0,
        cost_of_goods: Number(f.get("cost_of_goods")),
        inbound_delivery_fee: Number(f.get("inbound_delivery_fee") || 0),
        fulfillment_service_fee: Number(f.get("fulfillment_service_fee")),
        gpo_fee_per_500g: Number(f.get("gpo_fee_per_500g")),
        weight_grams: Number(f.get("weight_grams")),
        overstock_profit_target: Number(f.get("overstock_profit_target")),
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
      qty = Number(f.get("quantity"));
    if (!product) {
      setNotice("Choose a product.");
      return;
    }
    if (!Number.isInteger(qty) || qty < 1) {
      setNotice("Quantity must be a whole number of 1 or more.");
      return;
    }
    const { error } = await supabase.rpc("admin_create_manual_order", { payload: {
      customer_name: String(f.get("customer")), customer_phone: String(f.get("phone") || ""),
      customer_email: String(f.get("email") || ""), delivery_address: String(f.get("address") || ""),
      product_id: product.id, selected_size: String(f.get("size") || ""), quantity: qty,
      delivery_fee: 0, internal_notes: ""
    }});
    if (error) {
      setNotice(error?.message || "Could not create order.");
      return;
    }
    setNotice("Order created. Customer total was calculated from product costs, seller share, fulfilment, GPO, and OVERSTOCK profit target.");
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
  async function deleteOrder(order: Order) {
    if (!window.confirm(`Delete order #${order.order_number}? This removes its order record permanently.`)) return;
    const { error } = await supabase.from("orders").delete().eq("id", order.id);
    setNotice(error?.message || `Order #${order.order_number} deleted.`);
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
  async function requestRefund(orderId: string) {
    const { error } = await supabase.rpc("admin_request_order_refund", { target_order_id: orderId });
    setNotice(error?.message || "Refund requested from seller.");
    if (!error) await load();
  }
  async function completeRefund(orderId: string) {
    const { error } = await supabase.rpc("admin_complete_order_refund", { target_order_id: orderId });
    setNotice(error?.message || "Refund received and marked complete.");
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
  const refundableOrders = orders.filter((order) => order.journey_status === "cancelled");
  const refundsDue = refundableOrders.filter((order) => order.refund_status === "due_from_seller").reduce((n, order) => n + Number(order.refund_amount || 0), 0);
  const refundsSent = refundableOrders.filter((order) => order.refund_status === "sent_by_seller").reduce((n, order) => n + Number(order.refund_amount || 0), 0);
  const completedRefunds = refundableOrders.filter((order) => order.refund_status === "completed").reduce((n, order) => n + Number(order.refund_amount || 0), 0);
  const refundLiability = refundsDue + refundsSent;
  const pendingSellerRecovery = refundableOrders.filter((order) => ["due_from_seller", "sent_by_seller"].includes(order.refund_status)).reduce((n, order) => n + Number(order.seller_refund_recovery_amount || 0), 0);
  const completedSellerRecovery = refundableOrders.filter((order) => order.refund_status === "completed").reduce((n, order) => n + Number(order.seller_refund_recovery_amount || 0), 0);
  const activeOrderIds = new Set(orders.filter((order) => order.journey_status !== "cancelled").map((order) => order.id));
  const activeFinance = finance.filter((line) => activeOrderIds.has(line.order_id));
  const grossSales = orders.reduce((n, order) => n + Number(order.total || 0), 0);
  const totalSales = orders.filter((order) => order.journey_status !== "cancelled").reduce((n, order) => n + Number(order.total || 0), 0);
  const sellerSales = activeFinance.filter((x) => x.ownership === "seller").reduce((n, x) => n + Number(x.gross_amount || 0), 0);
  const sellerCost = activeFinance.reduce((n, x) => n + Number(x.item_cost || 0) + Number(x.inbound_delivery_fee || 0), 0);
  const sellerShare = activeFinance.reduce((n, x) => n + Number(x.seller_profit_amount || 0), 0);
  const fulfillmentService = activeFinance.reduce((n, x) => n + Number(x.fulfillment_service_fee || 0), 0);
  const gpoFees = activeFinance.reduce((n, x) => n + Number(x.gpo_fee || 0), 0);
  const fulfillmentCost = fulfillmentService + gpoFees;
  const sellerDue = activeFinance.filter((x) => x.ownership === "seller" && x.payout_status === "due").reduce((n, x) => n + Number(x.seller_payout_total || 0), 0);
  const sellerPaid = activeFinance.filter((x) => x.ownership === "seller" && x.payout_status === "paid").reduce((n, x) => n + Number(x.seller_payout_total || 0), 0);
  const cashSellerPaid = finance.filter((x) => x.ownership === "seller" && x.payout_status === "paid").reduce((n, x) => n + Number(x.seller_payout_total || 0), 0);
  const fulfillmentDue = activeFinance.filter((x) => x.fulfillment_payment_status === "due").reduce((n, x) => n + Number(x.fulfillment_service_fee || 0) + Number(x.gpo_fee || 0), 0);
  const fulfillmentPaid = activeFinance.filter((x) => x.fulfillment_payment_status === "paid").reduce((n, x) => n + Number(x.fulfillment_service_fee || 0) + Number(x.gpo_fee || 0), 0);
  const cashFulfillmentPaid = finance.filter((x) => x.fulfillment_payment_status === "paid").reduce((n, x) => n + Number(x.fulfillment_service_fee || 0) + Number(x.gpo_fee || 0), 0);
  const overstockProfit = totalSales - sellerCost - sellerShare - fulfillmentService - gpoFees;
  const cashIn = grossSales + completedSellerRecovery;
  const cashOut = cashSellerPaid + cashFulfillmentPaid + completedRefunds;
  const cashOnHand = cashIn - cashOut;
  const outstandingPayables = sellerDue + fulfillmentDue + refundLiability - pendingSellerRecovery;
  const projectedCash = cashOnHand - outstandingPayables;
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
        {tab === "overview" && (<>
          <section className="finance-ledger">
            <header><p className="eyebrow">FINANCIAL OVERVIEW</p><h2>CASH FLOW & PROFITABILITY</h2><p>Live order accounting across sales, supplier payments, fulfilment, and refunds.</p></header>
            <div className="cash-flow-summary">
              <article className="cash-in"><span>CASH RECEIVED</span><b>{money(cashIn)}</b><small>All customer payments</small></article>
              <article className="cash-out"><span>CASH PAID OUT</span><b>−{money(cashOut)}</b><small>Seller, fulfilment, and completed refunds</small></article>
              <article className="cash-balance"><span>CASH ON HAND</span><b>{money(cashOnHand)}</b><small>Received less payments already made</small></article>
              <article className="cash-pending"><span>OUTSTANDING PAYABLES</span><b>−{money(outstandingPayables)}</b><small>Seller, fulfilment, and pending refunds</small></article>
              <article className="cash-projected"><span>PROJECTED CASH POSITION</span><b>{money(projectedCash)}</b><small>After all open obligations are settled</small></article>
            </div>
            <div className="finance-ledger-grid">
              <article><span>NET SALES</span><b>{money(totalSales)}</b><small>Completed and active customer orders</small></article>
              <article><span>SELLER PRODUCT SALES</span><b>{money(sellerSales)}</b><small>Sales from seller-owned inventory</small></article>
              <article className="negative-ledger"><span>ITEM COST & INBOUND DELIVERY</span><b>−{money(sellerCost)}</b><small>Seller item cost and delivery to fulfilment</small></article>
              <article className="negative-ledger"><span>SELLER PROFIT SHARE</span><b>−{money(sellerShare)}</b><small>Seller percentage of profit after all costs</small></article>
              <article className="negative-ledger"><span>FULFILMENT SERVICE FEES</span><b>−{money(fulfillmentService)}</b><small>Team handling and service costs</small></article>
              <article className="negative-ledger"><span>GPO SHIPPING FEES</span><b>−{money(gpoFees)}</b><small>Weight-based courier charges</small></article>
              <article><span>SELLER PAYMENT DUE</span><b>{money(sellerDue)}</b><small>Unpaid seller amount</small></article>
              <article><span>SELLER PAYMENT PAID</span><b>{money(sellerPaid)}</b><small>Seller amount already paid</small></article>
              <article><span>FULFILMENT PAYMENT DUE</span><b>{money(fulfillmentDue)}</b><small>Unpaid fulfilment amount</small></article>
              <article className="ledger-result"><span>OVERSTOCK PROFIT</span><b>{money(overstockProfit)}</b><small>Profit after cost of goods and fulfilment</small></article>
            </div>
            <div className="ledger-bar" aria-label="Profit allocation"><span className="ledger-bar-cost" style={{width: `${totalSales ? ((sellerCost + sellerShare) / totalSales) * 100 : 0}%`}} /><span className="ledger-bar-fulfillment" style={{width: `${totalSales ? (fulfillmentCost / totalSales) * 100 : 0}%`}} /><span className="ledger-bar-overstock" style={{width: `${totalSales ? (Math.max(overstockProfit, 0) / totalSales) * 100 : 0}%`}} /></div>
            <div className="ledger-key"><span><i className="ledger-bar-cost" />Seller cost + profit share</span><span><i className="ledger-bar-fulfillment" />Fulfilment & GPO</span><span><i className="ledger-bar-overstock" />OVERSTOCK profit</span></div>
          </section>
          <section className="refund-ledger"><header><p className="eyebrow">REFUND POSITION</p><h2>CUSTOMER REFUNDS</h2></header><div><article><span>CUSTOMER REFUND DUE</span><b>−{money(refundsDue)}</b></article><article><span>CUSTOMER REFUND IN TRANSIT</span><b>−{money(refundsSent)}</b></article><article><span>SELLER REFUND RECOVERY</span><b>{money(pendingSellerRecovery + completedSellerRecovery)}</b></article><article><span>REFUNDS COMPLETED</span><b>−{money(completedRefunds)}</b></article></div></section>
        </>)}
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
            <section className="order-entry-panel seller-entry-panel">
              <header><div><p className="eyebrow">ADD A NEW SELLER</p><h2>SELLER DETAILS</h2></div></header>
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
                    max="50"
                    step="0.01"
                    defaultValue="20"
                    placeholder="20%"
                    aria-label="Seller share of profit (maximum 50 percent)"
                    required
                  />
                </span>
              </label>
              <button>ADD SELLER</button>
              </form>
            </section>
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
                    <label className="edit-field"><span>SELLER SHARE</span><span className="percent-input"><input name="commission" type="number" min="0" max="50" step="0.01" placeholder="EXAMPLE: 20" defaultValue={editingSeller.commission_percent} required /></span></label>
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
            <section className="order-entry-panel product-entry-panel">
              <header><div><p className="eyebrow">ADD A NEW PRODUCT</p><h2>PRODUCT DETAILS</h2></div></header>
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
              <input name="cost_of_goods" type="number" min="0" step="0.01" placeholder="ITEM COST (USD)" required />
              <input name="inbound_delivery_fee" type="number" min="0" step="0.01" placeholder="SELLER DELIVERY TO FULFILMENT (USD)" />
              <input name="fulfillment_service_fee" type="number" min="0" step="0.01" placeholder="FULFILMENT SERVICE FEE (USD)" required />
              <input name="gpo_fee_per_500g" type="number" min="0" step="0.01" placeholder="GPO FEE PER 500G (USD)" required />
              <input name="weight_grams" type="number" min="1" step="1" placeholder="ITEM WEIGHT (GRAMS)" required />
              <input name="overstock_profit_target" type="number" min="0" step="0.01" placeholder="OVERSTOCK PROFIT TARGET (USD)" required />
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
            </section>
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
                    <label className="edit-field"><span>ITEM COST (USD)</span><input name="cost_of_goods" type="number" step=".01" min="0" defaultValue={editing.cost_of_goods} required /></label>
                    <label className="edit-field"><span>SELLER DELIVERY (USD)</span><input name="inbound_delivery_fee" type="number" step=".01" min="0" defaultValue={editing.inbound_delivery_fee} /></label>
                    <label className="edit-field"><span>FULFILMENT SERVICE (USD)</span><input name="fulfillment_service_fee" type="number" step=".01" min="0" defaultValue={editing.fulfillment_service_fee} required /></label>
                    <label className="edit-field"><span>GPO FEE / 500G (USD)</span><input name="gpo_fee_per_500g" type="number" step=".01" min="0" defaultValue={editing.gpo_fee_per_500g} required /></label>
                    <label className="edit-field"><span>ITEM WEIGHT (GRAMS)</span><input name="weight_grams" type="number" step="1" min="1" defaultValue={editing.weight_grams} required /></label>
                    <label className="edit-field"><span>OVERSTOCK PROFIT TARGET</span><input name="overstock_profit_target" type="number" step=".01" min="0" defaultValue={editing.overstock_profit_target} required /></label>
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
                <div className="calculated-order-note"><span>CUSTOMER TOTAL</span><b>CALCULATED FROM PRODUCT COSTS</b><small>Item cost, seller delivery and share, fulfilment service, GPO, and OVERSTOCK profit target.</small></div>
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
                    <div className="order-admin-actions">{o.journey_status === "order_placed" ? <button className="admin-action" onClick={() => void advanceOrder(o.id, "admin_confirmed")}>CONFIRM ORDER</button> : <span className="status-badge" data-status="admin_confirmed">ORDER CONFIRMED</span>}<button className="danger-action" type="button" onClick={() => void deleteOrder(o)}>DELETE ORDER</button></div>
                  </section>
                  {o.journey_status === "cancelled" && <section className="refund-order-control"><div><span>REFUND STATUS</span><b>{o.refund_status.replaceAll("_", " ").toUpperCase()}</b><small>{money(Number(o.refund_amount || 0))}</small></div><div>{o.refund_status === "not_requested" && <button className="admin-action" onClick={() => void requestRefund(o.id)}>REQUEST REFUND</button>}{o.refund_status === "due_from_seller" && <b>WAITING FOR SELLER</b>}{o.refund_status === "sent_by_seller" && <button className="admin-action" onClick={() => void completeRefund(o.id)}>CONFIRM REFUND RECEIVED</button>}{o.refund_status === "completed" && <b>REFUND COMPLETE</b>}</div></section>}
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
            <section className="order-entry-panel team-member-panel">
              <header><div><p className="eyebrow">TEAM SETUP</p><h2>FULFILMENT TEAM MEMBER</h2></div></header>
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
