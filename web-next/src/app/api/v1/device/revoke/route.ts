import {NextRequest} from "next/server";
import {context,guarded,reply,ApiError} from "@/lib/api";
import {db} from "@/lib/db";
export async function POST(req:NextRequest){return guarded(async()=>{const c=await context(req);if(c.kind!=="device")throw new ApiError(400,"Endpoint khusus perangkat");await db().prepare("DELETE FROM devices WHERE id=?").bind(c.deviceId).run();return reply({ok:true})})}
