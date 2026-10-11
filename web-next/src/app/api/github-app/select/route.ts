import {NextRequest} from "next/server";
import {identity} from "@/lib/identity";
import {installationToken} from "@/lib/github-app";
import {guarded,reply,origin,body,github,ApiError} from "@/lib/api";
import {db,rateLimit} from "@/lib/db";
import {defaults} from "@/lib/workflow";
export async function POST(req:NextRequest){return guarded(async()=>{origin(req);const who=await identity(req);if(who.kind!=="user")throw new ApiError(403,"Khusus pengguna GitHub App");if(!await rateLimit("repo-select:"+who.subject,20,60))throw new ApiError(429,"Terlalu banyak perubahan repository. Tunggu satu menit.");const data=await body(req);const repo=typeof data.repo==="string"?data.repo:"";if(!/^[A-Za-z0-9-]+\/[A-Za-z0-9._-]+$/.test(repo))throw new ApiError(400,"Repository tidak valid");const grant=await installationToken(who.subject,repo);await github(grant.token,"/repos/"+repo+"/contents/.github/workflows/rdp-6h.yml");await db().prepare("INSERT INTO repositories(subject,repo,state,updated) VALUES(?,?,'ready',?) ON CONFLICT(subject) DO UPDATE SET repo=excluded.repo,state='ready',updated=excluded.updated").bind(who.subject,repo,Date.now()).run();await db().prepare("INSERT INTO settings(repo,inputs,updated) VALUES(?,?,?) ON CONFLICT(repo) DO NOTHING").bind(repo,JSON.stringify({...defaults,akses:"tailscale"}),Date.now()).run();return reply({ok:true,repo})})}
