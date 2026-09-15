"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Seller = { id:string; seller_code:string; display_name:string; commission_percent:number; status:string };
type Product = { id:string; sku:string; name:string; ownership:string; seller_id:string|null; price:number; stock_quantity:number; status:string };
type Order = { id:string; order_number:number; customer_name:string; total:number; status:string; payment_status:string; placed_at:string };
type Tab = "overview"|"sellers"|"products"|"orders";

export function AdminDashboard({ email }: { email:string }) {
  const [tab,setTab]=useState<Tab>("overview"), [sellers,setSellers]=useState<Seller[]>([]), [products,setProducts]=useState<Product[]>([]), [orders,setOrders]=useState<Order[]>([]), [notice,setNotice]=useState("");
  const [supabase]=useState(createClient);
  const router=useRouter();
  const load=useCallback(async()=>{
    const [s,p,o]=await Promise.all([
      supabase.from("sellers").select("id,seller_code,display_name,commission_percent,status").order("created_at",{ascending:false}),
      supabase.from("products").select("id,sku,name,ownership,seller_id,price,stock_quantity,status").order("created_at",{ascending:false}),
      supabase.from("orders").select("id,order_number,customer_name,total,status,payment_status,placed_at").order("placed_at",{ascending:false}),
    ]);
    if(s.error||p.error||o.error) setNotice(s.error?.message||p.error?.message||o.error?.message||"Could not load data");
    setSellers(s.data??[]); setProducts(p.data??[]); setOrders(o.data??[]);
  },[supabase]);
  useEffect(()=>{
    const timer=window.setTimeout(()=>{void load()},0);
    return ()=>window.clearTimeout(timer);
  },[load]);

  async function addSeller(e:FormEvent<HTMLFormElement>){e.preventDefault();const f=new FormData(e.currentTarget);const {error}=await supabase.from("sellers").insert({seller_code:String(f.get("code")).toUpperCase(),display_name:String(f.get("name")),commission_percent:Number(f.get("commission"))});setNotice(error?.message||"Seller added.");if(!error){e.currentTarget.reset();await load()}}
  async function addProduct(e:FormEvent<HTMLFormElement>){e.preventDefault();const f=new FormData(e.currentTarget),seller=String(f.get("seller"));const name=String(f.get("name"));const {error}=await supabase.from("products").insert({sku:String(f.get("sku")).toUpperCase(),slug:name.toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,""),name,price:Number(f.get("price")),stock_quantity:Number(f.get("stock")),ownership:seller?"seller":"own_stock",seller_id:seller||null,status:"draft"});setNotice(error?.message||"Product added as draft.");if(!error){e.currentTarget.reset();await load()}}
  async function signOut(){await supabase.auth.signOut();router.push("/admin/login");router.refresh()}
  const money=(n:number)=>new Intl.NumberFormat("en-AU",{style:"currency",currency:"AUD"}).format(n);
  return <main className="admin-shell"><aside className="admin-sidebar"><div><strong>OVERSTOCK</strong><small>COLLECTIVE / OPS</small></div><nav>{(["overview","sellers","products","orders"] as Tab[]).map(x=><button key={x} className={tab===x?"active":""} onClick={()=>setTab(x)}>{x.toUpperCase()}</button>)}</nav><button onClick={signOut}>SIGN OUT</button></aside>
    <section className="admin-content"><header><div><p className="eyebrow">PRIVATE OPERATIONS</p><h1>{tab.toUpperCase()}</h1></div><small>{email}</small></header>{notice&&<button className="admin-notice" onClick={()=>setNotice("")}>{notice} ×</button>}
    {tab==="overview"&&<div className="admin-stats"><article><span>SELLERS</span><b>{sellers.length}</b></article><article><span>PRODUCTS</span><b>{products.length}</b></article><article><span>ORDERS</span><b>{orders.length}</b></article><article><span>SELLER STOCK</span><b>{products.filter(p=>p.ownership==="seller").length}</b></article></div>}
    {tab==="sellers"&&<><form className="admin-form" onSubmit={addSeller}><input name="code" placeholder="SELLER CODE" pattern="[A-Za-z0-9_-]{3,32}" required/><input name="name" placeholder="SELLER NAME" required/><input name="commission" type="number" min="0" max="100" defaultValue="20" required/><button>ADD SELLER</button></form><DataTable headings={["CODE","SELLER","COMMISSION","STATUS"]} rows={sellers.map(s=>[s.seller_code,s.display_name,`${s.commission_percent}%`,s.status])}/></>}
    {tab==="products"&&<><form className="admin-form product-form" onSubmit={addProduct}><input name="sku" placeholder="SKU" required/><input name="name" placeholder="PRODUCT NAME" required/><input name="price" type="number" min="0" step="0.01" placeholder="PRICE" required/><input name="stock" type="number" min="0" placeholder="STOCK" required/><select name="seller"><option value="">OWN STOCK</option>{sellers.map(s=><option key={s.id} value={s.id}>{s.display_name}</option>)}</select><button>ADD DRAFT</button></form><DataTable headings={["SKU","PRODUCT","OWNER","PRICE","STOCK","STATUS"]} rows={products.map(p=>[p.sku,p.name,p.ownership==="seller"?(sellers.find(s=>s.id===p.seller_id)?.display_name||"Seller"):"OVERSTOCK",money(p.price),p.stock_quantity,p.status])}/></>}
    {tab==="orders"&&<DataTable headings={["ORDER","CUSTOMER","TOTAL","ORDER STATUS","PAYMENT","PLACED"]} rows={orders.map(o=>[`#${o.order_number}`,o.customer_name,money(o.total),o.status,o.payment_status,new Date(o.placed_at).toLocaleDateString("en-AU")])}/>} </section></main>;
}

function DataTable({headings,rows}:{headings:string[];rows:(string|number)[][]}){return <div className="admin-table-wrap"><table><thead><tr>{headings.map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{rows.length?rows.map((r,i)=><tr key={i}>{r.map((v,j)=><td key={j}>{v}</td>)}</tr>):<tr><td colSpan={headings.length}>NO RECORDS YET</td></tr>}</tbody></table></div>}
