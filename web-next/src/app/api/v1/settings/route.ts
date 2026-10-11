import {NextRequest} from "next/server";
import {context,guarded,reply,origin,body,ApiError} from "@/lib/api";
import {choices,loadSettings,validate} from "@/lib/workflow";
import {db,rateLimit} from "@/lib/db";
export async function GET(req:NextRequest){return guarded(async()=>{const c=await context(req);return reply({repo:c.repo,inputs:await loadSettings(c.repo),choices,workflow:"rdp-6h.yml"})})}
export async function PUT(req:NextRequest){return guarded(async()=>{const c=await context(req);if(c.kind!=="device")origin(req);if(!await rateLimit("settings:"+c.subject,30,60))throw new ApiError(429,"Terlalu banyak perubahan pengaturan. Tunggu satu menit.");const data=await body(req);if(!data.inputs||typeof data.inputs!=="object"||Array.isArray(data.inputs))throw new ApiError(400,"inputs wajib object");const inputs=validate(data.inputs as Record<string,unknown>);await db().prepare("INSERT INTO settings(repo,inputs,updated) VALUES(?,?,?) ON CONFLICT(repo) DO UPDATE SET inputs=excluded.inputs,updated=excluded.updated").bind(c.repo,JSON.stringify(inputs),Date.now()).run();return reply({ok:true,inputs})})}
