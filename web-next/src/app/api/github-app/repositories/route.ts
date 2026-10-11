import {NextRequest} from "next/server";
import {identity} from "@/lib/identity";
import {installationToken} from "@/lib/github-app";
import {guarded,reply,github,ApiError} from "@/lib/api";
export async function GET(req:NextRequest){return guarded(async()=>{const who=await identity(req);if(who.kind!=="user")throw new ApiError(400,"Khusus pengguna GitHub App");const page=Math.max(1,Math.min(100,Number(req.nextUrl.searchParams.get("page"))||1));const grant=await installationToken(who.subject);const data=await github<{total_count:number;repositories:{id:number;full_name:string;private:boolean}[]}>(grant.token,"/installation/repositories?per_page=100&page="+page);return reply({repos:data.repositories.map(r=>({id:r.id,full_name:r.full_name,private:r.private})),has_more:page*100<data.total_count,page})})}
