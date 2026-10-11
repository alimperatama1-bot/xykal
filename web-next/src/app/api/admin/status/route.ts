import {NextRequest} from "next/server";
import {context,guarded,reply,ApiError} from "@/lib/api";
export async function GET(req:NextRequest){return guarded(async()=>{const c=await context(req,true);if(c.kind!=="admin")throw new ApiError(403,"Akses admin ditolak");return reply({role:"admin",repo:c.repo})})}
