"use client";
import {T} from "@/app/locale-provider";

import {useState} from "react";
export default function RepositoryDanger({repo}:{repo:string}){
 const [challenge,setChallenge]=useState(""),[typed,setTyped]=useState(""),[ack,setAck]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState("");
 async function request(action:"prepare"|"delete"){
  setBusy(true);setMessage("");try{const r=await fetch("/api/github-app/delete-repository",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action,challenge,confirmation:typed,acknowledge:ack})});const d=await r.json();if(!r.ok)throw Error(d.error);
   if(action==="prepare"){if(d.repo!==repo)throw Error("Repo aktif berubah. Muat ulang halaman sebelum menghapus.");setChallenge(d.challenge);setTyped("");setAck(false)}
   else {setMessage(d.message);setChallenge("");if(!d.cleanup_pending)window.location.assign("/dashboard/connection?deleted=1")}
  }catch(e){setMessage(e instanceof Error?e.message:"Gagal menghapus repo")}finally{setBusy(false)}
 }
 return <section className="repo-danger"><span className="eyebrow"><T text={"Pengelolaan repository"}/></span><h2><T text={"Hapus repository"}/></h2><p><T text={"Ini menghapus "}/><b>{repo}</b><T text={" dari GitHub, bukan sekadar memutus koneksi dashboard. Source, branches, issues, dan pengaturan repo ikut terhapus. Backup dahulu. Token XyDesk akun ini ikut dicabut; akun GitHub dan login dashboard tetap ada."}/></p><p className="muted"><T text={"Membutuhkan izin Administration: Read and write yang disetujui pemilik repo. Semua workflow harus berhenti sebelum penghapusan."}/></p>{!challenge?<button className="danger-button" disabled={busy} onClick={()=>request("prepare")}><T text={"Saya ingin menghapus repo ini"}/></button>:<form onSubmit={e=>{e.preventDefault();request("delete")}}><label htmlFor="delete-repo-name"><T text={"Ketik tepat: "}/>{repo}</label><input id="delete-repo-name" autoComplete="off" value={typed} onChange={e=>setTyped(e.target.value)} disabled={busy}/><label className="check-row"><input type="checkbox" checked={ack} onChange={e=>setAck(e.target.checked)} disabled={busy}/><T text={"Saya sudah backup dan memahami bahwa repository akan dihapus dari GitHub."}/></label><div className="actions"><button className="danger-button" disabled={busy||typed!==repo||!ack}><T text={busy?"Memproses…":"Hapus repository dari GitHub"}/></button><button type="button" className="secondary" disabled={busy} onClick={()=>{setChallenge("");setTyped("");setAck(false)}}><T text={"Batal"}/></button></div><p className="muted"><T text={"Konfirmasi berlaku 5 menit. Jika koneksi terputus saat menghapus, periksa GitHub sebelum mencoba kembali."}/></p></form>}<p role="status"><T text={message}/></p></section>
}
