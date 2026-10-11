import {NextRequest} from "next/server";
import {context,guarded,reply,gh,ApiError} from "@/lib/api";
export async function GET(req:NextRequest,{params}:{params:Promise<{id:string}>}){return guarded(async()=>{const c=await context(req);const {id}=await params;if(!/^\d+$/.test(id))throw new ApiError(400,"Run ID tidak valid");return reply(await gh(c,"/actions/runs/"+id+"/jobs?per_page=100"))})}
