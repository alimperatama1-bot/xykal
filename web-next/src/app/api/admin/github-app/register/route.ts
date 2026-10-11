import {NextRequest,NextResponse} from "next/server";
import {adminIdentity} from "@/lib/identity";
import {appConfig,makeState,manifest} from "@/lib/github-app";
import {guarded,origin,ApiError} from "@/lib/api";
export async function POST(req:NextRequest){return guarded(async()=>{origin(req);const who=await adminIdentity(req);if(await appConfig())throw new ApiError(409,"GitHub App sudah terdaftar");const state=await makeState(who.subject,"register");const response=NextResponse.json({url:"https://github.com/settings/apps/new?state="+state,manifest:manifest()},{headers:{"Cache-Control":"no-store"}});response.cookies.set("rdpfree-register-state",state,{httpOnly:true,secure:true,sameSite:"lax",path:"/",maxAge:3600});return response})}
