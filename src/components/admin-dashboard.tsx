"use client";

import { FormEvent, ReactNode, useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { StatusConnectionGuide } from "./status-connection-guide";
import { JOURNEY, JourneyStatus, OrderTimeline, TrackingGuide } from "./order-timeline";

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
  ownership: string;
  gross_amount: number | null;
  platform_fee: number | null;
  seller_due: number | null;
  payout_status: string;
};
type Order = {
  id: string;
  order_number: number;
  customer_name: string;
  total: number;
  status: string;
  payment_status: string;
  placed_at: string;
  journey_status: JourneyStatus;
  journey_timestamps: Record<string, string>;
};
type Fulfillment = {
  id: string;
  order_id: string;
  assigned_to: string | null;
  status: string;
  courier: string | null;
  tracking_reference: string | null;
  due_at: string | null;
  orders: { order_number: number; customer_name: string } | null;
};
type Partner = { id: string; name: string; warehouse_address: string | null };
type Package = {
  id: string;
  package_number: number;
  status: string;
  seller_id: string;
  fulfillment_partner_id: string | null;
  inbound_tracking: string | null;
};
type Shipment = {
  id: string;
  shipment_number: number;
  status: string;
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
    [fulfillments, setFulfillments] = useState<Fulfillment[]>([]),
    [partners, setPartners] = useState<Partner[]>([]),
    [packages, setPackages] = useState<Package[]>([]),
    [shipments, setShipments] = useState<Shipment[]>([]),
    [finance, setFinance] = useState<FinanceLine[]>([]),
    [imagePreview, setImagePreview] = useState<string | null>(null),
    [imageFileName, setImageFileName] = useState(""),
    [editing, setEditing] = useState<Product | null>(null),
    [deleting, setDeleting] = useState<Product | null>(null),
    [notice, setNotice] = useState("");
  const [supabase] = useState(createClient);
  const router = useRouter();
  const load = useCallback(async () => {
    const [s, p, o, f, fp, ip, os, fin] = await Promise.all([
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
          "id,order_number,customer_name,total,status,payment_status,placed_at,journey_status,journey_timestamps",
        )
        .order("placed_at", { ascending: false }),
      supabase
        .from("fulfillments")
        .select(
          "id,order_id,assigned_to,status,courier,tracking_reference,due_at,orders(order_number,customer_name)",
        )
        .order("created_at", { ascending: false }),
      supabase
        .from("fulfillment_partners")
        .select("id,name,warehouse_address")
        .order("created_at", { ascending: false }),
      supabase
        .from("inbound_packages")
        .select(
          "id,package_number,status,seller_id,fulfillment_partner_id,inbound_tracking",
        )
        .order("created_at", { ascending: false }),
      supabase
        .from("outbound_shipments")
        .select(
          "id,shipment_number,status,recipient_name,courier,tracking_number",
        )
        .order("created_at", { ascending: false }),
      supabase
        .from("order_items")
        .select("ownership,gross_amount,platform_fee,seller_due,payout_status"),
    ]);
    if (s.error || p.error || o.error || f.error)
      setNotice(
        s.error?.message ||
          p.error?.message ||
          o.error?.message ||
          f.error?.message ||
          "Could not load data",
      );
    setSellers(s.data ?? []);
    setProducts(p.data ?? []);
    setOrders(o.data ?? []);
    setFulfillments((f.data ?? []) as unknown as Fulfillment[]);
    setPartners(fp.data ?? []);
    setPackages(ip.data ?? []);
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
      !["image/jpeg", "image/png", "image/webp", "image/avif"].includes(
        file.type,
      )
    )
      throw new Error("Use JPG, PNG, WebP or AVIF.");
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
  async function updateOrder(
    id: string,
    field: "status" | "payment_status",
    value: string,
  ) {
    const { error } = await supabase
      .from("orders")
      .update({ [field]: value })
      .eq("id", id);
    setNotice(error?.message || "Order updated.");
    if (!error) await load();
  }
  async function addOrder(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget,
      f = new FormData(form),
      product = products.find((p) => p.id === String(f.get("product"))),
      qty = Number(f.get("quantity")),
      deliveryFee = Number(
        String(f.get("delivery") || "0")
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
    if (!Number.isFinite(deliveryFee) || deliveryFee < 0) {
      setNotice("Enter a valid delivery fee, such as 12.50.");
      return;
    }
    const { error } = await supabase.rpc("admin_create_manual_order", { payload: {
      customer_name: String(f.get("customer")), customer_phone: String(f.get("phone") || ""),
      customer_email: String(f.get("email") || ""), delivery_address: String(f.get("address") || ""),
      product_id: product.id, selected_size: String(f.get("size") || ""), quantity: qty,
      unit_price: product.price, delivery_fee: deliveryFee, internal_notes: ""
    }});
    if (error) {
      setNotice(error?.message || "Could not create order.");
      return;
    }
    setNotice("Manual order created atomically and assigned automatically.");
    form.reset();
    await load();
  }
  async function advanceOrder(id: string, status: JourneyStatus) {
    const { error } = await supabase.rpc("advance_order_journey", {
      target_order_id: id, target_status: status, note: "Admin update",
    });
    setNotice(error?.message || "Shared journey updated for every role.");
    if (!error) await load();
  }
  async function updateFulfillment(id: string, status: string) {
    const values: Record<string, string> = { status };
    if (status === "shipped") values.shipped_at = new Date().toISOString();
    if (status === "delivered") values.delivered_at = new Date().toISOString();
    const { error } = await supabase
      .from("fulfillments")
      .update(values)
      .eq("id", id);
    setNotice(error?.message || "Fulfilment updated.");
    if (!error) await load();
  }
  async function updateAdminPackage(id: string, status: string) {
    const values: Record<string, string> = { status };
    if (status === "received") values.received_at = new Date().toISOString();
    const { error } = await supabase
      .from("inbound_packages")
      .update(values)
      .eq("id", id);
    setNotice(error?.message || "Shared package status updated.");
    if (!error) await load();
  }
  async function updateAdminShipment(id: string, status: string) {
    const values: Record<string, string> = { status };
    if (status === "outbound_shipped")
      values.shipped_at = new Date().toISOString();
    if (status === "delivered") values.delivered_at = new Date().toISOString();
    const { error } = await supabase
      .from("outbound_shipments")
      .update(values)
      .eq("id", id);
    setNotice(error?.message || "Shared shipment status updated.");
    if (!error) await load();
  }
  async function addPartner(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget,
      f = new FormData(form);
    const { data: partner, error } = await supabase
      .from("fulfillment_partners")
      .insert({
        name: String(f.get("name")),
        warehouse_address: String(f.get("address")),
      })
      .select("id")
      .single();
    if (error || !partner) {
      setNotice(error?.message || "Could not add partner.");
      return;
    }
    const invite = await supabase.from("fulfillment_invites").insert({
      email: String(f.get("email")).toLowerCase(),
      partner_id: partner.id,
    });
    if (!invite.error) {
      await Promise.all([
        supabase
          .from("inbound_packages")
          .update({ fulfillment_partner_id: partner.id })
          .is("fulfillment_partner_id", null),
        supabase
          .from("outbound_shipments")
          .update({ fulfillment_partner_id: partner.id })
          .is("fulfillment_partner_id", null),
      ]);
    }
    setNotice(invite.error?.message || "Internal fulfilment team login added.");
    if (!invite.error) {
      form.reset();
      await load();
    }
  }
  async function assignPackage(id: string, partnerId: string) {
    const { error } = await supabase
      .from("inbound_packages")
      .update({ fulfillment_partner_id: partnerId || null })
      .eq("id", id);
    setNotice(error?.message || "Package assigned.");
    if (!error) await load();
  }
  async function signOut() {
    await supabase.auth.signOut();
    router.push("/portal/login");
    router.refresh();
  }
  const money = (n: number) =>
    new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
    }).format(n);
  const gross = finance.reduce((n, x) => n + Number(x.gross_amount || 0), 0);
  const sellerDue = finance.reduce((n, x) => n + Number(x.seller_due || 0), 0);
  const platformFees = finance.reduce(
    (n, x) => n + Number(x.platform_fee || 0),
    0,
  );
  const ownSales = finance
    .filter((x) => x.ownership === "own_stock")
    .reduce((n, x) => n + Number(x.gross_amount || 0), 0);
  const overstockBalance = ownSales + platformFees;
  const sellerPercent = gross ? Math.round((sellerDue / gross) * 100) : 0;
  return (
    <main className="admin-shell">
      <aside className="admin-sidebar">
        <div>
          <strong>OVERSTOCK</strong>
          <small>INTERNAL OPERATIONS</small>
        </div>
        <nav>
          {(
            ["overview", "sellers", "products", "orders", "fulfilment"] as Tab[]
          ).map((x) => (
            <button
              key={x}
              className={tab === x ? "active" : ""}
              onClick={() => setTab(x)}
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
                  background: `conic-gradient(#050505 0 ${sellerPercent}%, #777 ${sellerPercent}% 100%)`,
                }}
                aria-label={`${sellerPercent}% seller balance`}
              >
                <span>
                  {money(gross)}
                  <small>RECORDED SALES</small>
                </span>
              </div>
              <div className="balance-list">
                <article>
                  <span>SELLER BALANCE</span>
                  <b>{money(sellerDue)}</b>
                </article>
                <article>
                  <span>OVERSTOCK BALANCE</span>
                  <b>{money(overstockBalance)}</b>
                </article>
                <article>
                  <span>PLATFORM COMMISSION</span>
                  <b>{money(platformFees)}</b>
                </article>
              </div>
            </div>
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
            <details className="status-guide collapsible-guide">
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
                <p><b>PAYOUT DUE</b> — An amount is waiting to be settled with the seller.</p>
                <p><b>PAID</b> — The seller payment has been completed.</p>
              </div>
            </details>
            <form className="admin-form" onSubmit={addSeller}>
              <input
                name="code"
                placeholder="SELLER CODE"
                pattern="[A-Za-z0-9_-]{3,32}"
                required
              />
              <input name="name" placeholder="SELLER NAME" required />
              <input
                name="email"
                type="email"
                placeholder="LOGIN EMAIL"
                required
              />
              <label className="percent-field">
                <span>COMMISSION</span>
                <span className="percent-input">
                  <input
                    name="commission"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    defaultValue="20"
                    aria-label="Seller commission percentage"
                    required
                  />
                  <b>%</b>
                </span>
              </label>
              <button>ADD SELLER</button>
            </form>
            <DataTable
              headings={["CODE", "SELLER", "EMAIL", "COMMISSION", "STATUS"]}
              rows={sellers.map((s) => [
                s.seller_code,
                s.display_name,
                s.email || "—",
                `${s.commission_percent}%`,
                s.status,
              ])}
            />
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
              <input name="sku" placeholder="SKU" required />
              <input name="name" placeholder="PRODUCT NAME" required />
              <input name="brand" placeholder="BRAND" />
              <input name="color" placeholder="COLOR" />
              <input name="condition" placeholder="CONDITION" />
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
                placeholder="PRICE"
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
                  accept="image/png,image/jpeg,image/webp,image/avif"
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
              Images must be 4:5, JPG/PNG/WebP/AVIF, and no larger than 10 MB.
              Recommended: 1600 × 2000 px.
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
                      <span>PRICE (AUD)</span>
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
            <TrackingGuide role="admin" />
            <form className="admin-form product-form" onSubmit={addOrder}>
              <input name="customer" placeholder="CUSTOMER NAME" required />
              <input name="phone" placeholder="PHONE" />
              <input name="email" type="email" placeholder="EMAIL" />
              <input name="address" placeholder="DELIVERY ADDRESS" />
              <select name="product" required>
                <option value="">CHOOSE PRODUCT</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} / {p.sku}
                  </option>
                ))}
              </select>
              <input name="size" placeholder="SELECTED SIZE" required />
              <input
                name="quantity"
                type="number"
                min="1"
                defaultValue="1"
                required
              />
              <input
                name="delivery"
                type="text"
                inputMode="decimal"
                pattern="[0-9]+([.,][0-9]{1,2})?"
                placeholder="DELIVERY FEE (AUD)"
                aria-label="Delivery fee"
              />
              <input
                name="channel"
                placeholder="CHANNEL"
                defaultValue="manual"
              />
              <button>CREATE ORDER</button>
            </form>
            <div className="order-card-list admin-orders">
              {orders.map((o) => (
                <article className="order-card" key={o.id}>
                  <header>
                    <div><p className="eyebrow">ORDER #{o.order_number}</p><h2>{o.customer_name}</h2><small>{money(o.total)} / {new Date(o.placed_at).toLocaleDateString("en-AU")}</small></div>
                    <select className="table-select" data-status={o.payment_status} value={o.payment_status} onChange={(e) => void updateOrder(o.id, "payment_status", e.target.value)}>
                      <option value="unpaid">UNPAID</option><option value="paid">PAID</option>
                    </select>
                  </header>
                  <OrderTimeline status={o.journey_status} timestamps={o.journey_timestamps} />
                  <label className="journey-override">ADMIN JOURNEY CONTROL
                    <select value={o.journey_status} data-status={o.journey_status} onChange={(e) => void advanceOrder(o.id, e.target.value as JourneyStatus)}>
                      {JOURNEY.map(([value, label]) => <option key={value} value={value}>{label.toUpperCase()}</option>)}
                      <option value="cancelled">CANCELLED</option>
                    </select>
                  </label>
                </article>
              ))}
            </div>
          </>
        )}
        {tab === "fulfilment" && (
          <>
            <StatusConnectionGuide
              role="admin-fulfilment"
              title="PACKAGE AND SHIPMENT CONNECTIONS"
            />
            <section className="portal-setup-guide">
              <p className="eyebrow">INTERNAL ACCESS</p>
              <h2>ADD A FULFILMENT TEAM ACCOUNT</h2>
              <ol>
                <li>
                  <b>1</b>
                  <span>
                    Add the team member or warehouse below using their exact
                    work email.
                  </span>
                </li>
                <li>
                  <b>2</b>
                  <span>
                    In Supabase open Authentication → Users → Add user → Create
                    new user.
                  </span>
                </li>
                <li>
                  <b>3</b>
                  <span>
                    Use the same email, choose a temporary password and enable
                    Auto Confirm User.
                  </span>
                </li>
                <li>
                  <b>4</b>
                  <span>
                    Give the login privately. They use /portal/login and are
                    routed to the internal Package Desk.
                  </span>
                </li>
              </ol>
              <p>
                Use one account per worker. Never share your admin password.
              </p>
            </section>
            <form className="admin-form" onSubmit={addPartner}>
              <input
                name="name"
                placeholder="INTERNAL TEAM OR LOCATION"
                required
              />
              <input name="address" placeholder="WAREHOUSE ADDRESS" required />
              <input
                name="email"
                type="email"
                placeholder="WORKER LOGIN EMAIL"
                required
              />
              <button>ADD TEAM</button>
            </form>
            <div className="fulfilment-list">
              {packages.map((p) => (
                <article key={p.id}>
                  <div>
                    <b>PKG-{p.package_number}</b>
                    <span>
                      {sellers.find((s) => s.id === p.seller_id)
                        ?.display_name || "SELLER"}
                    </span>
                    <small>
                      {p.status} / {p.inbound_tracking || "NO TRACKING"}
                    </small>
                  </div>
                  <select
                    data-status={p.status}
                    value={p.fulfillment_partner_id || ""}
                    onChange={(e) => void assignPackage(p.id, e.target.value)}
                  >
                    <option value="">UNASSIGNED</option>
                    {partners.map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={p.status}
                    aria-label={`Override status for package ${p.package_number}`}
                    onChange={(e) =>
                      void updateAdminPackage(p.id, e.target.value)
                    }
                  >
                    {[
                      "awaiting_seller",
                      "seller_confirmed",
                      "inbound_transit",
                      "received",
                      "qc_hold",
                      "qc_passed",
                      "ready_to_pack",
                      "packed",
                      "outbound_shipped",
                      "delivered",
                      "cancelled",
                    ].map((status) => (
                      <option key={status} value={status}>
                        {status.replaceAll("_", " ").toUpperCase()}
                      </option>
                    ))}
                  </select>
                </article>
              ))}
            </div>
            <h2>OUTBOUND CUSTOMER TRACKING</h2>
            <div className="fulfilment-list">
              {shipments.map((shipment) => (
                <article key={shipment.id}>
                  <div>
                    <b>SHIP-{shipment.shipment_number}</b>
                    <span>{shipment.recipient_name}</span>
                    <small>
                      {shipment.status} / {shipment.courier || "NO COURIER"} /{" "}
                      {shipment.tracking_number || "NO CUSTOMER TRACKING"}
                    </small>
                  </div>
                  <select
                    data-status={shipment.status}
                    value={shipment.status}
                    aria-label={`Override status for shipment ${shipment.shipment_number}`}
                    onChange={(e) =>
                      void updateAdminShipment(shipment.id, e.target.value)
                    }
                  >
                    {[
                      "ready_to_pack",
                      "packed",
                      "outbound_shipped",
                      "delivered",
                      "cancelled",
                    ].map((status) => (
                      <option key={status} value={status}>
                        {status.replaceAll("_", " ").toUpperCase()}
                      </option>
                    ))}
                  </select>
                </article>
              ))}
            </div>
            <h2>LEGACY ORDER QUEUE</h2>
            <div className="fulfilment-list">
              {fulfillments.map((f) => (
                <article key={f.id}>
                  <div>
                    <b>#{f.orders?.order_number}</b>
                    <span>{f.orders?.customer_name}</span>
                    <small>
                      {f.courier || "COURIER NOT SET"} /{" "}
                      {f.tracking_reference || "NO TRACKING"}
                    </small>
                  </div>
                  <select
                    data-status={f.status}
                    value={f.status}
                    onChange={(e) =>
                      void updateFulfillment(f.id, e.target.value)
                    }
                  >
                    {[
                      "unassigned",
                      "assigned",
                      "packing",
                      "shipped",
                      "delivered",
                      "cancelled",
                    ].map((s) => (
                      <option key={s} value={s}>
                        {s.toUpperCase()}
                      </option>
                    ))}
                  </select>
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
