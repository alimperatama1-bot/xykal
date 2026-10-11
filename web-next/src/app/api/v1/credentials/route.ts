import {NextRequest} from "next/server";
import {context,guarded,reply,origin,gh,ApiError} from "@/lib/api";
import {db,rateLimit} from "@/lib/db";
import {openPassword} from "@/lib/vault";
export async function POST(req:NextRequest){return guarded(async()=>{const c=await context(req,true);origin(req);if(!await rateLimit("reveal:"+c.subject,20,300))throw new ApiError(429,"Terlalu banyak permintaan tampilkan password");
 const repo=await gh<{permissions?:{push?:boolean}}>(c,"");if(!c.installationId&&!repo.permissions?.push)throw new ApiError(403,"Akses repository tidak diizinkan");
 const row=await db().prepare("SELECT payload,remote_updated FROM credentials WHERE repo=?").bind(c.repo).first<{payload:string;remote_updated:string}>();
 if(!row)throw new ApiError(404,"Tidak ada salinan password di dashboard. GitHub tidak dapat menampilkan kembali secret lama. Isi password baru melalui Setup.");
 const remote=await gh<{updated_at:string}>(c,"/actions/secrets/RDP_PASSWORD");if(remote.updated_at!==row.remote_updated)throw new ApiError(409,"Password di GitHub sudah berubah. Perbarui melalui Setup agar salinan dashboard sinkron.");return reply({password:openPassword(c.repo,row.payload)});
})}
export async function DELETE(req:NextRequest){return guarded(async()=>{const c=await context(req,true);origin(req);await db().prepare("DELETE FROM credentials WHERE repo=?").bind(c.repo).run();return reply({ok:true})})}
