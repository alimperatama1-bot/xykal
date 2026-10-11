"use client";
import {T} from "@/app/locale-provider";

import {useEffect,useRef,useState} from "react";
import SecretField from "@/app/dashboard/secret-field";
import Script from "next/script";
import {signIn} from "next-auth/react";
declare global {interface Window {turnstile?:{render:(el:HTMLElement,options:Record<string,unknown>)=>string;reset:(id:string)=>void;remove:(id:string)=>void}}}
export default function Form({siteKey}:{siteKey:string}){const box=useRef<HTMLDivElement>(null),widget=useRef("");const [password,setPassword]=useState("");const [token,setToken]=useState("");const [error,setError]=useState("");const [busy,setBusy]=useState(false);
 function render(){if(box.current&&window.turnstile&&!widget.current)widget.current=window.turnstile.render(box.current,{sitekey:siteKey,action:"admin_login",theme:"dark",callback:(t:string)=>setToken(t),"expired-callback":()=>setToken(""),"error-callback":()=>{setToken("");setError("Verifikasi gagal dimuat. Coba muat ulang.")}})}
 useEffect(()=>()=>{if(widget.current)window.turnstile?.remove(widget.current);widget.current=""},[]);
 return <><Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" onReady={render}/><form onSubmit={async e=>{e.preventDefault();setBusy(true);setError("");const f=new FormData(e.currentTarget);try{const r=await signIn("credentials",{email:f.get("email"),password:f.get("password"),turnstile:token,redirect:false,callbackUrl:"/admin"});if(r?.ok){window.location.assign("/admin");return}setError("Login gagal. Periksa kredensial dan verifikasi, atau tunggu jika terlalu sering mencoba.")}catch{setError("Koneksi gagal. Coba lagi.")}finally{setBusy(false);setToken("");if(widget.current)window.turnstile?.reset(widget.current)}}}><label><T text={"Email admin"}/><input name="email" type="email" autoComplete="username" required maxLength={254}/></label><SecretField label="Password admin" name="password" value={password} onChange={setPassword} autoComplete="current-password" required/><div ref={box}/><p className="error" role="alert"><T text={error}/></p><button disabled={busy||!token}><T text={busy?"Memverifikasi…":"Masuk"}/></button></form></>}
