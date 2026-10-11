import {NextRequest} from "next/server";
import {encode} from "next-auth/jwt";
import {randomBytes,randomUUID} from "node:crypto";
import {context,guarded,reply,origin,body,hash,ApiError} from "@/lib/api";
import {inspect} from "@/lib/setup";
import {db,rateLimit} from "@/lib/db";
export async function GET(req:NextRequest){return guarded(async()=>{const c=await context(req,true);const rows=await db().prepare("SELECT id,name,expires,created FROM devices WHERE subject=? AND expires>? ORDER BY created DESC").bind(c.subject,Date.now()).all();return reply({devices:rows.results})})}
export async function POST(req:NextRequest){return guarded(async()=>{const c=await context(req,true);origin(req);if(!(await inspect(c)).ready)throw new ApiError(409,"Selesaikan Setup repository dan secrets sebelum membuat token XyDesk");if(!await rateLimit("device:"+c.subject,5,3600))throw new ApiError(429,"Terlalu banyak token dibuat");const b=await body(req);const name=typeof b.name==="string"?b.name.trim():"";if(!name||name.length>60)throw new ApiError(400,"Nama perangkat 1–60 karakter");const token="rdf_"+randomBytes(32).toString("base64url"),id=randomUUID(),expires=Date.now()+30*86400000;
 const payload=await encode({secret:process.env.NEXTAUTH_SECRET!,token:c.installationId?{binding:"github_app",repo:c.repo}:{accessToken:c.token,repo:c.repo},maxAge:30*86400});
 await db().prepare("INSERT INTO devices(id,token_hash,subject,name,payload,expires,created) VALUES(?,?,?,?,?,?,?)").bind(id,hash(token),c.subject,name,payload,expires,Date.now()).run();return reply({id,name,token,expires,base_url:"https://rdpfree.projectkal.my.id/api/v1",scope:["repository:read","settings:read","settings:write","runs:read","runs:start","runs:cancel"]},201)})}
export async function DELETE(req:NextRequest){return guarded(async()=>{const c=await context(req,true);origin(req);const b=await body(req);if(typeof b.id!=="string")throw new ApiError(400,"ID diperlukan");await db().prepare("DELETE FROM devices WHERE id=? AND subject=?").bind(b.id,c.subject).run();return reply({ok:true})})}
