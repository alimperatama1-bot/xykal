import {NextRequest,NextResponse} from "next/server";
import {identity} from "@/lib/identity";
import {rateLimit} from "@/lib/db";
import {appConfig,makeState} from "@/lib/github-app";
import {guarded,origin,reply,ApiError} from "@/lib/api";
export async function POST(req:NextRequest){return guarded(async()=>{origin(req);const who=await identity(req);if(who.kind!=="user")throw new ApiError(400,"Gunakan login identitas GitHub untuk instalasi repo pengguna");if(!await rateLimit("app-install:"+who.subject,10,600))throw new ApiError(429,"Terlalu banyak permintaan izin. Tunggu beberapa menit.");const config=await appConfig();if(!config)return reply({error:"Admin belum mendaftarkan GitHub App"},409);const state=await makeState(who.subject,"install");const res=NextResponse.json({url:"https://github.com/apps/"+config.slug+"/installations/new?state="+state},{headers:{"Cache-Control":"no-store"}});res.cookies.set("rdpfree-install-state",state,{httpOnly:true,secure:true,sameSite:"lax",path:"/",maxAge:3600});return res})}
