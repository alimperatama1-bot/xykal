import {NextRequest} from "next/server";
import {context,guarded,reply,gh} from "@/lib/api";
import {runs} from "@/lib/workflow";
export async function GET(req:NextRequest){return guarded(async()=>{const c=await context(req);const view=req.nextUrl.searchParams.get("view");if(view==="logs")return reply({repo:c.repo,runs:await runs(c)});if(view==="folder")return reply({repo:c.repo,items:await gh(c,"/contents")});await gh(c,"");return reply({repo:c.repo,exists:true})})}
