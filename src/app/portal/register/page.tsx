"use client";
import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";
export default function Register() {
  const [message,setMessage]=useState("");
  async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();const f=new FormData(e.currentTarget);const password=String(f.get("password"));if(password!==String(f.get("confirm"))){setMessage("Passwords do not match.");return;}const {error}=await createClient().auth.signUp({email:String(f.get("email")).toLowerCase(),password});setMessage(error?.message||"Account created. You can now sign in.");}
  return <main className="admin-login"><form className="admin-panel" onSubmit={submit}><p className="eyebrow">OVERSTOCK / INVITED ACCOUNTS</p><h1>CREATE PASSWORD</h1><p>Use the exact email your OVERSTOCK admin approved.</p><label>Approved email<input name="email" type="email" required /></label><label>Password<input name="password" type="password" minLength={8} required /></label><label>Confirm password<input name="confirm" type="password" minLength={8} required /></label><button className="admin-primary">CREATE ACCOUNT</button>{message&&<p className="admin-error">{message}</p>}</form></main>;
}
