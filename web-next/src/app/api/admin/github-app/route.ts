import {NextRequest} from "next/server";
import {adminIdentity} from "@/lib/identity";
import {appConfig} from "@/lib/github-app";
import {guarded,reply} from "@/lib/api";
export async function GET(req:NextRequest){return guarded(async()=>{await adminIdentity(req);const config=await appConfig();return reply({configured:!!config,slug:config?.slug||null,id:config?.id||null})})}
